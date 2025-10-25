const express = require("express");
const router = express.Router();
const db = require("../database");

// shared function
const insertCashMovement = async (tableName, data) => {
	const {
		c1_2,
		c5,
		c10,
		c20,
		c50,
		c100,
		c200,
		c500,
		c1000,
		usu_id,
		latestColumn,
	} = data;

	const getLocalSQLDateTime = () => {
		const now = new Date();
		return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 19)
			.replace("T", " ");
	};

	// convert blanks to 0
	const vals = {
		c1_2: c1_2 === "" ? 0 : Number(c1_2),
		c5: c5 === "" ? 0 : Number(c5),
		c10: c10 === "" ? 0 : Number(c10),
		c20: c20 === "" ? 0 : Number(c20),
		c50: c50 === "" ? 0 : Number(c50),
		c100: c100 === "" ? 0 : Number(c100),
		c200: c200 === "" ? 0 : Number(c200),
		c500: c500 === "" ? 0 : Number(c500),
		c1000: c1000 === "" ? 0 : Number(c1000),
	};

	if (latestColumn === "1" || latestColumn === 1) {
		// ✅ Update existing row instead of insert
		const updateSQL = `
			UPDATE ${tableName}
			SET 
				c1_2 = c1_2 + ?,
				c5 = c5 + ?,
				c10 = c10 + ?,
				c20 = c20 + ?,
				c50 = c50 + ?,
				c100 = c100 + ?,
				c200 = c200 + ?,
				c500 = c500 + ?,
				c1000 = c1000 + ?
			WHERE startingCashcol = 1
			AND DATE(fecha) = CURDATE()
			AND rcc_id IS NULL
		`;

		const updateValues = [
			vals.c1_2,
			vals.c5,
			vals.c10,
			vals.c20,
			vals.c50,
			vals.c100,
			vals.c200,
			vals.c500,
			vals.c1000,
		];

		await db.execute(updateSQL, updateValues);
	} else {
		// ✅ Insert new row (normal behavior)
		const insertSQL = `
			INSERT INTO ${tableName} (
				fecha, c1_2, c5, c10, c20, c50, c100, c200, c500, c1000, usu_id
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;

		const insertValues = [
			getLocalSQLDateTime(),
			vals.c1_2,
			vals.c5,
			vals.c10,
			vals.c20,
			vals.c50,
			vals.c100,
			vals.c200,
			vals.c500,
			vals.c1000,
			usu_id,
		];

		await db.execute(insertSQL, insertValues);
	}
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
