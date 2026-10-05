require("dotenv").config();
const express = require("express");
const router = express.Router();

const {
	exchangeAuthorizationCode,
	ensureRenewScheduler,
} = require("../utils/mlAuth");

router.get("/", async (req, res) => {
	console.log("callback working");

	try {
		const code = req.query.code;
		await exchangeAuthorizationCode(code);

		console.log("Mercado Libre connected.");
		ensureRenewScheduler();
	} catch (error) {
		console.error(
			"Mercado Libre callback error:",
			error.response ? error.response.data : error.message
		);
	}

	res.redirect("http://localhost:3000/");
});

module.exports = router;
