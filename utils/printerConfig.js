const os = require("os");
const printers = require("../printers.json");

function getPrinterInterface() {
	const computer = os.hostname();
	const printer = printers[computer.toLowerCase()];
	if (!printer) {
		throw new Error(`No ticket printer configured for ${computer} in printers.json`);
	}
	return printer;
}

module.exports = { getPrinterInterface };
