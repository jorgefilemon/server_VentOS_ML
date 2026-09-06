const { printer: thermalPrinter, types: Types } = require("node-thermal-printer");
const moment = require("moment");
// const { sendToPrinter } = require("./utils/networkPrinter");

function ultimoTicket(invoice, detallev, mov) {
	console.log("this is invoice", invoice);
	const venta = invoice[0];

	const onlyDate = moment(venta.fecha).locale("es").format("/DD/YYYY");
	const month = moment(venta.fecha).locale("es").format("MMM");
	const mesSinPunto = month.replace(".", "").toUpperCase();
	console.log("la hora antes de moment", invoice[0].fecha);
	const onlyTime = moment(venta.fecha).utc().format("h:mm:ss A");

	console.log("time from ticket js", onlyTime);

	const detalleven = detallev;
	const movDescripcion = mov;

	let efectivo = "0.00";
	const [hayEfectivo] = movDescripcion.filter(
		(paymentType) => paymentType.tpa_id === 1
	);
	if (hayEfectivo) {
		efectivo = parseFloat(hayEfectivo.total) + parseFloat(venta.cambio);
	}

	let tarjeta = "0.00";
	const [hayTarjeta] = movDescripcion.filter(
		(paymentType) => paymentType.tpa_id === 6
	);
	if (hayTarjeta) tarjeta = hayTarjeta.total;

	const print = new thermalPrinter({
		type: Types.EPSON,
		width: 39,
		interface: "\\\\Optiplex990\\TM88",
	});

	print.print("\x1b\x33\x30");
	print.alignCenter();
	print.println("Zapateria Lolita");
	print.println("CSL190711J93");
	print.println("Julian de los Reyes 226");
	print.println("San Luis Potosi");
	print.println("CP 78000");
	print.println("ventas@zapaterialolita.com");
	print.println("Tel 444 812 3404");
	print.println("WhatsApp: 444 775 0015");
	print.println("facebook: zapaterialolita.mx");

	print.drawLine();

	print.alignLeft();
	print.println(`TICKET:${venta.tic_id}`);
	print.println(`FECHA: ${mesSinPunto}${onlyDate}`);
	print.println(`HORA:  ${onlyTime}`);

	print.drawLine();

	print.tableCustom([
		{ text: "CANT", align: "CENTER", width: 0.2, cols: 1 },
		{ text: "PCIO U.", align: "RIGHT", width: 0.3, cols: 1 },
		{ text: "%DESC", align: "RIGHT", width: 0.2, cols: 1 },
		{ text: "IMPORTE", align: "RIGHT", width: 0.3, cols: 1 },
	]);
	print.drawLine();
	print.newLine();

	for (const item of detalleven) {
		print.alignLeft();
		print.println(item.descripcion);
		print.alignCenter();
		print.tableCustom([
			{
				text: parseInt(item.cantidad).toFixed(0),
				align: "RIGHT",
				width: 0.1,
				cols: 1,
			},
			{
				text: parseInt(item.precioCon).toFixed(2),
				align: "RIGHT",
				width: 0.3,
				cols: 1,
			},
			{
				text: item.descPorcentaje + "%",
				align: "RIGHT",
				width: 0.2,
				cols: 1,
			},
			{
				text: parseInt(item.importeCon).toFixed(2),
				align: "RIGHT",
				width: 0.35,
				cols: 1,
			},
		]);
		print.drawLine();
	}

	print.alignCenter();
	print.newLine();
	print.tableCustom([
		{ text: "TOTAL:", align: "RIGHT", width: 0.5, cols: 1 },
		{ text: venta.total, align: "RIGHT", width: 0.5, cols: 1 },
	]);
	print.println("<<<<<<<<< FORMAS DE PAGO >>>>>>>>>");
	print.tableCustom([
		{ text: "EFECTIVO:", align: "RIGHT", width: 0.5, cols: 1 },
		{
			text: parseFloat(efectivo).toFixed(2),
			align: "RIGHT",
			width: 0.5,
			cols: 1,
		},
	]);
	print.tableCustom([
		{ text: "TARJETA:", align: "RIGHT", width: 0.5, cols: 1 },
		{ text: tarjeta, align: "RIGHT", width: 0.5, cols: 1 },
	]);
	print.tableCustom([
		{ text: "CAMBIO:", align: "RIGHT", width: 0.5, cols: 1 },
		{ text: venta.cambio, align: "RIGHT", width: 0.5, cols: 1 },
	]);
	print.newLine();
	print.alignCenter();
	print.println("CLIENTE");
	print.println("Publico en General");
	print.newLine();
	print.println("�GRACIAS POR SU COMPRA!");
	print.newLine();
	print.println("GARANTIA DEL CALZADO:");
	print.println(`
El calzado tiene una garantia de 30 
dias a partir de la fecha de compra 
y entrega del producto. 
La garantia se hara efectiva 
unicamente sobre defectos de 
fabricaci�n y/o manufactura, y no 
por el mal uso del calzado.`);

	print.println(`
Los cambios se efectuaran
dentro de los 7 dias
naturales a partir de la fecha de 
compra presentando la nota
correspondiente siempre y cuando
el calzado no presente marcas
de uso y este se regrese en su
empaque original.
`);
	print.newLine();

	print.cut();
	print.openCashDrawer();

	print.execute();

// Promise.resolve(print.getBuffer())
//   .then(sendToPrinter)
//   .catch((err) => console.error("print pipeline error:", err));
}

module.exports = ultimoTicket;
