require("dotenv").config();
const express = require("express");
const router = express.Router();

const mercadoAuth = require("../utils/mlAuth");

router.get("/", async (req, res) => {
	console.log("callback working");

	try {
		const code = req.query.code;
		if (typeof code !== "string" || !code.trim()) {
			return res.status(400).send("Missing Mercado Libre authorization code");
		}
		await mercadoAuth.login(code, process.env.REDIRECT_URI);

		console.log("Mercado Libre connected.");
	} catch (error) {
		console.error(
			"Mercado Libre callback error:",
			error.response ? error.response.data : error.message
		);
		return res.status(500).send("Unable to connect Mercado Libre. Please try again.");
	}

	res.redirect("http://localhost:3000/");
});

module.exports = router;
