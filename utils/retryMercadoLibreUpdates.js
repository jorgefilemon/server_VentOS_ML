// server/utils/retryMercadoLibre.js
const db = require("../database");
const updateMLRoute = require("./updateMLRoute");

async function retryMercadoLibreUpdates() {

    	if (!process.env.ACCESS_TOKEN) {
		console.log("ML retry skipped: no access token");
		return;
	}
	const conn = await db.getConnection();

	try {
		const [pendingRows] = await conn.query(
			`SELECT ml_id, seller_sku
			 FROM mercadolibre
			 WHERE status = 1
			   AND updated = 0
			 LIMIT 10`
		);

        if (pendingRows.length > 0) {
	console.log("ML pending rows:", pendingRows.length);
}

		for (const row of pendingRows) {
			const result = await updateMLRoute(row.seller_sku);

			if (result?.ok === true) {
				await conn.query(
					`UPDATE mercadolibre
					 SET updated = 1
					 WHERE ml_id = ?`,
					[row.ml_id]
				);

				console.log(
					`Mercado Libre retry success for ${row.seller_sku}`
				);
			} else {
				console.log(
					`Mercado Libre retry pending for ${row.seller_sku}:`,
					result?.message || result?.error || result?.details
				);
			}
		}
	} catch (error) {
		console.error("Mercado Libre retry job error:", error);
	} finally {
		conn.release();
	}
}

function startMercadoLibreRetryJob() {
	const thirtyMinutes = 30 * 60 * 1000;

    

	setInterval(() => {
		retryMercadoLibreUpdates();
	}, thirtyMinutes);

	// Optional: run once when server starts
	retryMercadoLibreUpdates();
}

module.exports = startMercadoLibreRetryJob;
