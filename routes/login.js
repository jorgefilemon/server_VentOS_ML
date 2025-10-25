const express = require("express");
const router = express.Router();
const db = require("../database");
//const mysql = require("mysql2/promise");
const { createTokens } = require("../JWT");
const md5 = require("md5");

// login authenticate
router.post("/", async (req, res) => {
	const { userName, password } = req.body;

	const passwordMd5 = md5(password);

	const conn = await db.getConnection();

	try {
		const [result] = await conn.query(
			`select * from sicar.usuario 
        where 
        usuario = ? and
        password = ? `,
			[userName, passwordMd5]
		);

		if (result.length > 0) {
			const myResult = result[0];

			// CREATE TOKEN
			const token = createTokens(myResult);

			// Fetch latest cash total
			const [cashResult] = await conn.query(`
				SELECT (c1_2 + c5 + c10 + c20 + c50 + c100 + c200 + c500 + c1000) AS total
				FROM sicar.cashfloat
				ORDER BY cashMov_id DESC
				LIMIT 1`);

			const latestCashTotal =
				cashResult.length > 0 ? cashResult[0].total : 0;

			// create cookie
			res.cookie("access_token", token, {
				httpOnly: true,
				maxAge: 86400000,
				sameSite: "none",
				secure: true, // Remove this for HTTP frontend
			});
			res.send({
				cookie: "cookie created",
				logged: true,
				cashTotal: latestCashTotal,
			});
		} else {
			res.send({ message: "Usuario o contraseña incorrectos" });
		}
	} catch (error) {
		console.error(error);
	}
});

module.exports = router;
