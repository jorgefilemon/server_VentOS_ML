const express = require("express");
const moment = require("moment");

const db = require("../database");
const realizarTicket = require("../ticket");
const mercadoLibreWarningTicket = require("../mercadoLibreWarningTicket");
const updateMLRoute = require("../utils/updateMLRoute");

const router = express.Router();

router.post("/", async (req, res) => {
	const {
		total,
		resultadoEnLetra,
		cambio,
		descuento,
		efectivo,
		tarjeta,
		usu_id,
		products,
	} = req.body;

	const comentario = "";
	const tipo = 1;
	const caj_id = 1;
	const fecha = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");

	const status = 1;
	const subtotal0 = 0;
	const subtotal = (total / 1.16).toFixed(2);
	const iva = total - subtotal;
	const imp_id = 1;

	const mlItems = [];

	const normalizedProducts = products.map((product) => {
		const originalClave = product.clave;
		const isMercadoLibreItem = /^m[a-zA-Z]{3}/.test(originalClave);

		if (isMercadoLibreItem) {
			const localClave = originalClave.slice(1);
			mlItems.push(originalClave);

			return {
				...product,
				clave: localClave,
			};
		}

		return product;
	});

	const newArray = normalizedProducts.map((product) => Object.values(product));
	const conn = await db.getConnection();

	await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
	await conn.beginTransaction();

	try {
		await conn.query("INSERT INTO ticket (cli_id) VALUES ('1')");

		const [ticket] = await conn.query("SELECT LAST_INSERT_ID();");
		const [tic_id] = Object.values(ticket[0]);

		await conn.query(
			`insert into venta(
			fecha,      subtotal0,  subtotal,
			descuento,  total,      cambio,
			letra,      status,     tic_id
			) values (
			?,  ?,  ?,
				?,  ?,  ?,
				?,  ?,  ?
			);
    `,
			[
				fecha,
				subtotal0,
				subtotal,
				descuento,
				total,
				cambio,
				resultadoEnLetra,
				status,
				tic_id,
			]
		);

		const [id] = await conn.query("SELECT LAST_INSERT_ID();");
		const ven_id = Object.values(id[0]);

		await conn.query(
			`INSERT INTO historial (fecha, id, movimiento, tabla, usu_id) VALUES (?, ?, 0, 'Venta', ?)`,
			[fecha, ven_id, usu_id]
		);

		const valuesWithId = newArray.map((product) => ven_id.concat(product));

		const modifiedArray = valuesWithId.map((product) => {
			if (product[4] < 0) {
				product[4] = 1;
			}
			return product;
		});

		const insertDetallev = `
    INSERT INTO sicar.detallev (
      ven_id,          art_id,          clave,
      descripcion,     cantidad,        unidad,
      precioNorSin,    precioNorCon,    precioSin,
      precioCon,       importeNorSin,   ImporteNorCon,
      importeSin,      importeCon,      descPorcentaje,
      descTotal,       precioCompra,    importeCompra,
      sinGravar,       caracteristicas, orden,
      cuentaPredial,   movVen,          movVenC,
      claveProdServ
     )

    values  ?;`;
		await conn.query(insertDetallev, [modifiedArray]);

		for (const product of products) {
			await conn.query(
				`UPDATE articulo SET existencia = (existencia - ?) WHERE art_id = ?;`,
				[product.cantidad, product.art_id]
			);
		}

		console.log("venta efectivo, tarjeta", efectivo, tarjeta);

		const movimiento = `
      INSERT INTO movimiento (
          total,     comentario,  tipo,
          status,    caj_id,      tpa_id,
          ven_id
       )
       VALUES ?;
    `;

		const efectivoValores = [
			efectivo - cambio,
			comentario,
			tipo,
			status,
			caj_id,
			1,
		].concat(ven_id);
		const tarjetaValores = [
			tarjeta,
			comentario,
			tipo,
			status,
			caj_id,
			6,
		].concat(ven_id);

		const arrayOfPagos = [];
		(efectivo > 0 || tarjeta == 0) && arrayOfPagos.push(efectivoValores);
		tarjeta > 0 && arrayOfPagos.push(tarjetaValores);
		await conn.query(movimiento, [arrayOfPagos]);

		const [movimientos] = await conn.query(
			`select * from movimiento where ven_id = ?`,
			[ven_id]
		);

		for (const mov of movimientos) {
			await conn.query(
				`INSERT INTO historial (
          fecha, id,     movimiento,
          tabla, usu_id
          )
          VALUES
          (?, ?, ?,
           ?, ?
            )`,
				[fecha, mov.mov_id, 0, "Movimiento", usu_id]
			);
		}

		await conn.query(
			"UPDATE caja SET total = (total + ?) WHERE (1 = caj_id)",
			total
		);

		await conn.query(
			`INSERT INTO ventaImp (
        subtotal, total,
        ven_id, imp_id
        )
        VALUES (
          ?,?,
          ?,?
        );`,
			[subtotal, iva, ven_id, imp_id]
		);

		for (const pagos of arrayOfPagos) {
			await conn.query(
				`INSERT INTO ventaTipoPago (monTotal, total, ven_id, tpa_id) VALUES (?, ?, ?, ?)`,
				[pagos[0], pagos[0], ven_id, pagos[5]]
			);
		}

		for (const product of products) {
			await conn.query(
				`INSERT INTO detalleVImpuesto (
            impuesto, nombre, tipofactor,
            total,
            art_id,
            ven_id,
            imp_id)
          VALUES (
            16.00,    'I.V.A.',  'Tasa',
            ?,
            ?,
            ?,
            ?)
          ;`,
				[
					(product.precioCon - product.precioCon / 1.16).toFixed(2),
					product.art_id,
					ven_id,
					imp_id,
				]
			);
		}

		const [invoice] = await conn.query(
			`select tic_id, fecha, subtotal, descuento, total, cambio
        from venta
        where ven_id = ?`,
			[ven_id]
		);

		const [detallev] = await conn.query(
			`select
		descripcion, precioNorCon, precioCon,
		cantidad, descPorcentaje ,importeNorCon,
		importeCon from detallev where ven_id = ?
		`,
			[ven_id]
		);

		const [mov] = await conn.query(
			`select tpa_id, ven_id, total from movimiento where ven_id = ?`,
			[ven_id]
		);

		const pagoEfectivo = efectivo;

		const [[salesperson]] = await conn.query(
			"SELECT nombre FROM usuario WHERE usu_id = ?",
			[usu_id]
		);

		await conn.commit();

		let mlResults = [];

		if (mlItems.length > 0) {
			try {
			const mlProducts = products.filter((product) =>
				/^m[a-zA-Z]{3}/.test(product.clave)
			);

			const mercadolibreValues = mlProducts.map((product) => [
				ven_id,
				usu_id,
				product.art_id,
				product.clave,
				product.cantidad,
				fecha,
				1,
				0,
			]);
// insert values in mercadolibre
			await conn.query(
				`INSERT INTO mercadolibre (
					ven_id,
					usu_id,
					art_id,
					seller_sku,
					cantidad,
					fecha,
					status,
					updated
				) VALUES ?`,
				[mercadolibreValues]
			);
		

		const settledResults = await Promise.allSettled(
			mlItems.map((sellerSku) => updateMLRoute(sellerSku))
		);

		const ventaId = Array.isArray(ven_id) ? ven_id[0] : ven_id;

		for (let index = 0; index < settledResults.length; index++) {
			const result = settledResults[index];

			if (result.status !== "fulfilled" || result.value?.ok !== true) {
				continue;
			}

			const sku = result.value?.seller_sku || mlItems[index];

			const [updateResult] = await conn.query(
				`UPDATE mercadolibre
				SET updated = 1
				WHERE ven_id = ? AND seller_sku = ?`,
				[ventaId, sku]
			);

			console.log("mercadolibre updated rows:", updateResult.affectedRows);
		}


		mlResults = settledResults.map(({ value }, index) => {
			const sku = value?.seller_sku || mlItems[index];

			const outcomes = {
				notFound: `No se encontró el producto con la clave "${sku}" en Mercado Libre`,
				failed: `No se pudo actualizar el producto con la clave "${sku}" en Mercado Libre`,
				zeroStock: `El producto con la clave "${sku}" ya tiene existencia 0 en Mercado Libre`,
				updated: `Se actualizó la existencia en Mercado Libre del producto ${sku}. Existencia anterior: ${value?.old_quantity}, Existencia Actual: ${value?.new_quantity}`,
			};

			const outcome = value?.status === 404 ? "notFound"
				: value?.ok !== true ? "failed"
				: value.old_quantity === 0 && value.new_quantity === 0 ? "zeroStock"
				: "updated";

			return { seller_sku: sku, outcome, message: outcomes[outcome] };		});

		console.log("ML update results", mlResults);
	} catch (error) {
		console.error("Mercado Libre post-commit error:", error);

		mlResults = mlItems.map((sellerSku) => ({
			seller_sku: sellerSku,
			outcome: "failed",
			message: `No se pudo actualizar el producto con la clave "${sellerSku}" en Mercado Libre`,
		}));
	}
} else {
	console.log("this item is not sold in ML");
}
		const mlWarnings = mlResults.filter(({ outcome }) =>
			["notFound", "failed"].includes(outcome)
		);

		const warningProducts = mlWarnings.map(({ seller_sku }) => ({
   			 clave: seller_sku,
    		descripcion: products.find(
        	(product) => product.clave === seller_sku
    		).descripcion,
		}));

		try {
			await realizarTicket(invoice, detallev, mov, pagoEfectivo);
		} catch (error) {
			console.error("Sales ticket printing failed:", error);
		}

		if (warningProducts.length > 0) {
			try {
				await mercadoLibreWarningTicket(warningProducts, salesperson.nombre);
			} catch (error) {
				console.error("Mercado Libre warning ticket printing failed:", error);
			}
		}

		// console.log("venta inserted", invoice);
		// console.log("products", products);
		// console.log("detallev", detallev);
		// console.log("mov", mov);

		res.json({
			venta: invoice,
			detallev,
			movimiento: mov,
			...(mlItems.length > 0 && { mercadoLibre: mlResults }),
		});
	} catch (err) {
		try {
			await conn.rollback();
			console.log("rollback applied");
		} catch (rollbackError) {
			console.log("rollback skipped");
		}
		console.error(err);
		res.status(500).json({ error: "Error processing venta" });
	} finally {
		conn.release();
	}
});

module.exports = router;


