const express = require("express");
const router = express.Router();
const db = require("../database");

// Shared function to get today's entries and total cash from a given table
const getCashData = async (tableName) => {
	// Query 1: today's entries
	const entriesQuery = `
		SELECT * FROM ${tableName}
		WHERE DATE(fecha) = CURDATE()
	`;
	const [cash] = await db.execute(entriesQuery);

	// Query 2: total cash sum
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

// GET /cashFloat
router.get("/cashFloat", async (req, res) => {
	try {
		const data = await getCashData("cashfloat");
		res.json(data);
	} catch (err) {
		console.error("Error fetching cashFloat:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// GET /pullCash
router.get("/pullCash", async (req, res) => {
	try {
		const data = await getCashData("cashpull");
		res.json(data);
	} catch (err) {
		console.error("Error fetching pullCash:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;
