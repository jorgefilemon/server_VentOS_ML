// const printer = require("@thiagoelg/node-printer");
const thermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;
const moment = require("moment");

function expenseTicket(fecha, usu_name, expenseList) {
	console.log("expenseList at expenseTicket", expenseList);
	console.log("usuname", usu_name);
	//
	const onlyDate = moment(fecha).locale("es").format("/DD/YYYY");
	const month = moment(fecha).locale("es").format("MMM");
	const mesSinPunto = month.replace(".", "").toUpperCase();
	const onlyTime = moment(fecha).format("h:mm:ss A");

	const cantidad = expenseList.reduce((accumulator, current) => {
		return accumulator + current.cantidad;
	}, 0);

	// set thermalPrinter paper width
	const print = new thermalPrinter({
		type: Types.EPSON,
		width: 38,
	});

	print.alignCenter();
	print.setTextSize(1, 1);
	print.println(`${expenseList[0].type}`);

	print.newLine();
	print.alignLeft();

	print.println(`${usu_name}`);

	print.println(`${mesSinPunto}${onlyDate}`);
	print.println(`${onlyTime}`);

	print.newLine();

	print.setTextSize(0, 0);

	print.alignCenter();
	print.drawLine();
	for (let expense of expenseList) {
		print.tableCustom([
			{
				text: expense.expenseName,
				align: "LEFT",
				width: 0.7,
				cols: 1,
			},
			{
				text: parseFloat(expense.cantidad).toFixed(2),
				align: "RIGHT",
				width: 0.3,
				cols: 1,
			},
		]);
		print.drawLine();
	}

	if (expenseList.length > 1) {
		print.tableCustom([
			{ text: "TOTAL:", align: "LEFT", width: 0.7, cols: 1 },
			{ text: cantidad.toFixed(2), align: "RIGHT", width: 0.3, cols: 1 },
		]);
	}

	print.newLine();

	print.cut();
	print.openCashDrawer();

	const data = print.getBuffer();

	printer.printDirect({
		data: data,
		type: "RAW",
		printer: "epson tm-t81 Receipt",
		success: function (jobID) {
			console.log("sent to printer with ID: " + jobID);
		},
		error: function (err) {
			console.log(err);
		},
	});
}

module.exports = expenseTicket;
