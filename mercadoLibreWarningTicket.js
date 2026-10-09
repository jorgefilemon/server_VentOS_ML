const { getPrinterInterface } = require("./utils/printerConfig");
const { printer: ThermalPrinter, types: Types } = require("node-thermal-printer");

async function mercadoLibreWarningTicket(products, clerkName) {
	const print = new ThermalPrinter({
		type: Types.EPSON,
		width: 38,
		interface: getPrinterInterface(),
	});

	print.alignCenter();
	print.println("MERCADO LIBRE");
	print.println("ACTUALIZACION MANUAL");
	print.drawLine();

	print.alignLeft();
	print.println(`Vendedor: ${clerkName}`);

	for (const product of products) {
		print.drawLine();
		print.println("No se actualizo producto");
		print.println(`Clave: ${product.clave}`);
		print.println(product.descripcion);
	}

	print.drawLine();
	print.println("Actualizar existencia manualmente");
	print.println("en la app de Mercado Libre.");
	print.cut();

	await print.execute();
}

module.exports = mercadoLibreWarningTicket;
