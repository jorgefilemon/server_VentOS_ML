// const { sendToPrinter } = require("./utils/networkPrinter");
const thermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;
const moment = require("moment");

function realizarCorte(
	cashTotal,
	cardTotal,
	sumaTotal,
	nombre,
	fecha,
	cambioCliente,
	expenseList,
	values,
	valuesGuardar,
	corteLabel
) {
	//
	const onlyDate = moment(fecha).locale("es").format("/DD/YYYY");
	const month = moment(fecha).locale("es").format("MMM");
	const mesSinPunto = month.replace(".", "").toUpperCase();
	const onlyTime = moment(fecha).utc().format("h:mm:ss A");

	console.log("only time", onlyTime);
	console.log(cambioCliente, "cambio ticket");
	console.log(`expense list`, expenseList);

	const print = new thermalPrinter({
		type: Types.EPSON,
		width: 38,
		interface: "\\\\jorge-PC\\TM88",
	});

	print.alignCenter();
	print.println("-------- CORTE CAJA --------");

	print.newLine();
	print.alignLeft();

	print.println(`USUARIO:${nombre}`);
	print.println("CAJA:   Caja 1");
	print.println(`FECHA:  ${mesSinPunto}${onlyDate}`);
	print.println(`HORA:   ${onlyTime}`);
	print.alignCenter();
	print.newLine();

	print.drawLine();

	print.newLine();

	print.println("<<<<<<<<< FORMAS DE PAGO >>>>>>>>>");
	print.newLine();

	print.tableCustom([
		{ text: "EFECTIVO:", align: "RIGHT", width: 0.4, cols: 1 },
		{
			text: parseFloat(cashTotal).toFixed(2),
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
	]);
	print.tableCustom([
		{ text: "TARJETA:", align: "RIGHT", width: 0.4, cols: 1 },
		{
			text: parseFloat(cardTotal).toFixed(2),
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
	]);
	print.tableCustom([
		{
			text: "DEVOLUCION DE EFECTIVO:",
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
		{
			text: parseFloat(cambioCliente).toFixed(2),
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
	]);
	print.newLine();
	print.drawLine();
	print.tableCustom([
		{ text: "TOTAL:", align: "RIGHT", width: 0.4, cols: 1 },
		{ text: sumaTotal, align: "RIGHT", width: 0.4, cols: 1 },
	]);

	print.newLine();
	print.println("<<<<<<< SALIDA DE EFECTIVO >>>>>>>");

	print.newLine();
	for (let expense of expenseList) {
		print.tableCustom([
			{
				text: expense.type,
				align: "LEFT",
				width: 0.4,
				cols: 1,
			},
			{
				text: " ",
				align: "RIGHT",
				width: 0.4,
				cols: 1,
			},
		]);

		print.tableCustom([
			{
				text: expense.name,
				align: "LEFT",
				width: 0.4,
				cols: 1,
			},
			{
				text: parseFloat(expense.expenseAmount).toFixed(2),
				align: "RIGHT",
				width: 0.4,
				cols: 1,
			},
		]);
		print.drawLine();
	}

	print.newLine();
	print.println("<<<<<<< RELACION CAJA >>>>>>>");
	print.newLine();
	print.tableCustom([
		{ text: "EN CAJA", align: "CENTER", width: 0.4, cols: 1 },
		{ text: "GUARDADO", align: "CENTER", width: 0.4, cols: 1 },
	]);

	const skipIndices = [0, 10, 11];
	const filteredValues = values.filter((_, i) => !skipIndices.includes(i));
	const filteredValuesGuardar = valuesGuardar.filter(
		(_, i) => !skipIndices.includes(i)
	);
	print.newLine();
	filteredValues.forEach((amount, i) => {
		const displayCaja =
			i === 0
				? `$${parseFloat(amount || 0).toFixed(2)}`
				: parseFloat(amount || 0);
		const displayGuardar =
			i === 0
				? `$${parseFloat(filteredValuesGuardar[i] || 0).toFixed(2)}`
				: parseFloat(filteredValuesGuardar[i] || 0);

		print.tableCustom([
			{ text: displayCaja, align: "CENTER", width: 0.4, cols: 1 },
			{ text: displayGuardar, align: "CENTER", width: 0.4, cols: 1 },
		]);

		// Draw line after 3rd and 8th rows
		if (i === 2 || i === 7) {
			print.drawLine();
		}
	});
	print.setTextDoubleWidth();

	const respuesta = {
		sobran: { singular: "sobro", plural: "sobraron" },
		falta: { singular: "falto", plural: "faltaron" },
		"corte exacto": "corte exacto",
	};

	const corteLabelLower = corteLabel.toLowerCase();
	const parts = corteLabelLower.split(" ");
	const lastWord = parts[parts.length - 1]; // e.g. "$1.00"

	let key;
	if (corteLabelLower.includes("sobra")) key = "sobran";
	else if (corteLabelLower.includes("falta")) key = "falta";
	else key = "corte exacto";

	let message;

	if (key === "corte exacto") {
		message = respuesta[key];
	} else {
		const isSingular = lastWord === "$1.00";
		const verb = isSingular
			? respuesta[key].singular
			: respuesta[key].plural;
		message = `${verb} ${lastWord}`;
	}

	print.newLine();
	print.println(message);
	print.newLine();
	print.println(nombre);

	print.cut();
	print.openCashDrawer();

	print.execute();
}

module.exports = realizarCorte;
