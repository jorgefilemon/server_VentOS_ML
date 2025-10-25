// utils/getCashData.js
const db = require("../database");

const getCashData = async (tableName) => {
	const entriesQuery = `
		SELECT * FROM ${tableName}
		WHERE DATE(fecha) = CURDATE()
	`;
	const [cash] = await db.execute(entriesQuery);

	const totalQuery = `
		SELECT
			DATE(fecha) AS fecha,
			SUM(c1_2) * 1 +
			SUM(c5) * 5 +
			SUM(c10) * 10 +
			SUM(c20) * 20 +
			SUM(c50) * 50 +
			SUM(c100) * 100 +
			SUM(c200) * 200 +
			SUM(c500) * 500 +
			SUM(c1000) * 1000 AS total_cash
		FROM ${tableName}
		WHERE DATE(fecha) = CURDATE()
		  AND rcc_id IS NULL
	`;
	const [totalResult] = await db.execute(totalQuery);
	const totalCash = totalResult[0]?.total_cash ?? 0;

	return { cash, totalCash };
};

module.exports = getCashData;
