const { getPrinterInterface } = require("./utils/printerConfig");
const {
	printer: ThermalPrinter,
	types: Types,
} = require("node-thermal-printer");
const moment = require("moment");
require("dotenv").config();

function pullCashTicket(nombre, fecha, values) {
	const onlyDate = moment(fecha).locale("es").format("DD/MM/YYYY");
	const mesSinPunto = moment(fecha)
		.locale("es")
		.format("MMM")
		.replace(".", "")
		.toUpperCase();
	const onlyTime = moment(fecha).format("h:mm:ss A");

	const print = new ThermalPrinter({
		type: Types.EPSON,
		width: 38,
		interface: getPrinterInterface(),
	});

	print.alignLeft();
	print.println(`USUARIO: ${nombre}`);
	print.println("CAJA:    Caja 1");
	print.println(`FECHA:   ${mesSinPunto} ${onlyDate}`);
	print.println(`HORA:    ${onlyTime}`);
	print.drawLine();

	print.newLine();
	print.alignCenter();
	print.println("<<<<<< EFECTIVO GUARDADO >>>>>>");
	print.newLine();

	const denominations = [
		["0.50, 1, 2", values.c1_2 || 0],
		["5", values.c5 || 0],
		["10", values.c10 || 0],
		["20", values.c20 || 0],
		["50", values.c50 || 0],
		["100", values.c100 || 0],
		["200", values.c200 || 0],
		["500", values.c500 || 0],
		["1000", values.c1000 || 0],
	];

	const space = " ";

	denominations.forEach(([label, amount], index) => {
		const display = amount && amount !== 0 ? amount.toString() : "\u00A0";

		print.tableCustom([
			{ text: label, align: "RIGHT", width: 0.45 },
			{ text: space, align: "CENTER", width: 0.05 },
			{ text: display, align: "LEFT", width: 0.45 },
		]);

		if (label === "10" || label === "500") {
			print.drawLine();
		}
	});

	print.newLine();

	print.alignCenter();
	print.println(`Realizado por:`);
	print.setTextDoubleWidth();
	print.println(nombre);

	print.cut();
	print.openCashDrawer();
	print.execute();
}

module.exports = pullCashTicket;
