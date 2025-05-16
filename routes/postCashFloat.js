const express = require("express");
const router = express.Router();
const db = require("../database");

// shared function
const insertCashMovement = async (tableName, data) => {
	const { c1_2, c5, c10, c20, c50, c100, c200, c500, c1000, usu_id } = data;

	const getLocalSQLDateTime = () => {
		const now = new Date();
		return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 19)
			.replace("T", " ");
	};

	const sql = `
		INSERT INTO ${tableName} (
			fecha, c1_2, c5, c10, c20, c50, c100, c200, c500, c1000, usu_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`;

	const values = [
		getLocalSQLDateTime(),
		c1_2 === "" ? 0 : c1_2,
		c5 === "" ? 0 : c5,
		c10 === "" ? 0 : c10,
		c20 === "" ? 0 : c20,
		c50 === "" ? 0 : c50,
		c100 === "" ? 0 : c100,
		c200 === "" ? 0 : c200,
		c500 === "" ? 0 : c500,
		c1000 === "" ? 0 : c1000,
		usu_id,
	];

	await db.execute(sql, values);
};

// POST /cashFloat/cashFloat
router.post("/cashFloat", async (req, res) => {
	try {
		await insertCashMovement("cashfloat", req.body);
		res.status(200).json({ message: "cashFloat inserted successfully" });
	} catch (err) {
		console.error("Error inserting into cashFloat:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// POST /cashFloat/pullCash
router.post("/pullCash", async (req, res) => {
	try {
		await insertCashMovement("cashpull", req.body);
		res.status(200).json({ message: "pullCash inserted successfully" });
	} catch (err) {
		console.error("Error inserting into pullCash:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;
