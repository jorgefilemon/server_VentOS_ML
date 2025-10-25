const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser"); // to parse the cookie
const mysql = require("mysql2/promise");

const jwt = require("jsonwebtoken");
const realizarTicket = require("./ticket");
const moment = require("moment");

const https = require("https");
const path = require("path");
const fs = require("fs");

// R O U T E S //

const lastTicketRoute = require("./routes/lastTicket");
const loginRoute = require("./routes/login");
const corteRoute = require("./routes/corte");
const cashFloatRoute = require("./routes/cashFloat");
const postCashFloatRoute = require("./routes/postCashFloat");
const revisarCorteRoute = require("./routes/revisarCorte");
const expenseRoute = require("./routes/expense");
const shoeSellsInPeriodRoute = require("./routes/shoeSellsInPeriod");
const shoeSellsInTwoMonthsRoute = require("./routes/shoeSellsInTwoMonths");
const callbackRoute = require("./routes/callback.js");

app.use(express.json());
// why?
app.use(cookieParser());
// cors
app.use(
	cors({
		credentials: true, // so axios can work.
		origin: ["http://localhost:3000"],
		methods: ["GET", "POST"],
	})
);

// pool connection
const db = mysql.createPool({
	host: process.env.HOST,
	user: process.env.USER_NAME,
	password: process.env.PASSWORD,
	database: process.env.DATABASE,
	port: process.env.PORT,
	// multipleStatements: false, // optional, i had it on, but change queries so i can have it off.
});

// login authenticate
app.use("/login", loginRoute);

// vefify user with jwt
app.get("/verify", async (req, res, next) => {
	const token = req.cookies.access_token;
	const isConnected = Boolean(process.env.ACCESS_TOKEN); // Check if access token exists
	try {
		const { usu_id, nombre } = jwt.verify(token, "382u397429&$");

		res.json({
			usu_id: usu_id,
			nombre: nombre,
			logged: true,
			connected: isConnected,
		});

		//next(); not neceesary as youre sendin json
	} catch (err) {
		res.send({ logged: false, usu_id: "", nombre: "" });
	}
});

// logout session clear cookie
app.get("/logout", (req, res) => {
	res.clearCookie("access_token", {
		httpOnly: true,
		sameSite: "none",
		secure: true, // Ensure this matches the cookie settings
	}).send("cleared cookie");
});

// get articulos from articulo table.
app.get("/search/:searchInfo", async (req, res) => {
	const { searchInfo } = req.params;
	console.log(moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"));
	try {
		const query = `
      SELECT 
        art_id,
        clave, 
        descripcion, 

        existencia,
        precio1,
        precioCompra,
        
        caracteristicas,
        claveProdServ
        
      FROM articulo

      WHERE status = 1
        and ( descripcion like ?
              OR clave like ?
            )
        limit 1;
      `;

		const [result] = await db.query(query, [
			"%" + searchInfo + "%",
			"%" + searchInfo + "%",
		]);
		res.json(result);
		console.log(result);
	} catch (error) {
		res.json("articulo no encontrado");
		console.log(error);
	}
});
// post request genera venta
app.post("/venta", async (req, res) => {
	// data de venta
	const {
		total,
		resultadoEnLetra,
		cambio,
		descuento,
		efectivo,
		tarjeta,
		usu_id,
	} = req.body;

	const comentario = "";
	const tipo = 1;
	const caj_id = 1;
	// data from venta
	const fecha = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");

	const status = 1;
	const subtotal0 = 0;
	const subtotal = (total / 1.16).toFixed(2);
	const iva = total - subtotal;
	const imp_id = 1;

	// data de detallev ////////////////////////////////////////
	const products = req.body.products;

	// convert products from an array of objects into array of array so then we can use ? in a sql statement.
	// not the greateast idea cause you cant use anymore product.price syntax.
	const newArray = products.map((product) => Object.values(product));
	//console.log("newArray", newArray);
	const conn = await db.getConnection();

	await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
	await conn.beginTransaction();

	try {
		// insert into ticket table.
		await conn.query("INSERT INTO ticket (cli_id) VALUES ('1')");

		// select last tic_id value from ticket table.
		const [ticket] = await conn.query("SELECT LAST_INSERT_ID();");
		const [tic_id] = Object.values(ticket[0]);

		// insert into venta tabla//
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

		// extraer ven_id
		const ven_id = Object.values(id[0]);

		// historia Venta movimiento
		await conn.query(
			`INSERT INTO historial (fecha, id, movimiento, tabla, usu_id) VALUES (?, ?, 0, 'Venta', ?)`,
			[fecha, ven_id, usu_id]
		);

		// adds ven_id to detallev product
		const valuesWithId = await newArray.map((product) =>
			ven_id.concat(product)
		);

		// convert -1 to positive for detallev always have 1
		const modifiedArray = valuesWithId.map((product) => {
			if (product[4] < 0) {
				product[4] = 1;
			}
			return product;
		});

		// detallev tabla
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

		// update articulo table
		for (const product of products) {
			await conn.query(
				`UPDATE articulo SET existencia = (existencia - ?) WHERE art_id = ?;`,
				[product.cantidad, product.art_id]
			);
		}

		console.log("server.js efectivo, tarjeta", efectivo, tarjeta);

		// movimiento //////////////////////////////////////////
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

		const ArrayOfPagos = [];
		(efectivo > 0 || tarjeta == 0) && ArrayOfPagos.push(efectivoValores);
		tarjeta > 0 && ArrayOfPagos.push(tarjetaValores);
		await conn.query(movimiento, [ArrayOfPagos]);

		// historial movimiento ///////////////////////////////
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

		///////// caja ///////////////////
		await conn.query(
			"UPDATE caja SET total = (total + ?) WHERE (1 = caj_id)",
			total
		);

		////// ventaimp - impuesto //////////////
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

		//// ventatipopago  //////////////////////////////////////////
		for (const pagos of ArrayOfPagos) {
			await conn.query(
				`INSERT INTO ventaTipoPago (monTotal, total, ven_id, tpa_id) VALUES (?, ?, ?, ?)`,
				[pagos[0], pagos[0], ven_id, pagos[5]]
			);
		}

		//// detalleVimpuesto /////////////////////////////
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

		///// historia ////////

		/// send invoice/ticket/////////////////////////////////

		const [invoice] = await conn.query(
			`select tic_id, fecha, subtotal, descuento, total, cambio 
        from venta 
        where ven_id = ?`,
			[ven_id]
		);

		console.log("invoice data", invoice);

		const [detallev] = await conn.query(
			`select 
      descripcion, precioNorCon, precioCon, 
      cantidad, descPorcentaje ,importeNorCon, 
      importeCon from detallev where ven_id = ?`,
			[ven_id]
		);

		const [mov] = await conn.query(
			`select tpa_id, ven_id, total from movimiento where ven_id = ?`,
			[ven_id]
		);

		const pagoEfectivo = efectivo;

		await conn.commit();

		console.log("venta from server.js", invoice);

		console.log("values insterted");

		console.log("products", products);

		for (const product of products) {
			if (product.clave.endsWith("m")) {
				console.log(
					`products whose art_id ends with "m"`,
					product.clave
				);
				//... do some other stuff
			}
		}

		realizarTicket(invoice, detallev, mov, pagoEfectivo);

		res.json({ venta: invoice, detallev: detallev, movimiento: mov });

		module.exports = {
			invoice,
			detallev,
			mov,
		};

		console.log("detallev", detallev);
		console.log("mov", mov);

		conn.release();
	} catch (err) {
		conn.rollback();
		console.log("rollback applied");
		console.error(err);
	}
});

// R O U T E S

// gets last ticket
app.use("/lastTicket", lastTicketRoute);
// revisa corte antes de commitearlo
app.use("/revisarCorte", revisarCorteRoute);
// hace el corte
app.use("/corte", corteRoute);
// GET CASH FLOAT
app.use("/cashFloat", cashFloatRoute);
// POST CASH FLOAT
app.use("/postCashFloat", postCashFloatRoute);
// expense
app.use("/expense", expenseRoute);
// calback from mercado libre.
app.use("/callback", callbackRoute);

app.use("/shoeSellsInPeriod", shoeSellsInPeriodRoute);

app.use("/shoeSellsInTwoMonths", shoeSellsInTwoMonthsRoute);

const privateKeyPath = path.join(__dirname, "cert", "server.key");
const certificatePath = path.join(__dirname, "cert", "server.crt");

const sslServer = https.createServer(
	{
		key: fs.readFileSync(privateKeyPath, "utf8"),
		cert: fs.readFileSync(certificatePath, "utf8"),
	},
	app
);

//
sslServer.listen(process.env.NODEPORT, () =>
	console.log(
		`server running on port ${process.env.NODEPORT}, MYSQL port ${process.env.MYSQL_PORT}`
	)
);
