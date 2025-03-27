require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");

async function renewAccessToken() {
	let retries = 0;
	const maxRetries = 3;

	console.log("triggering refresh token");
	const data = {
		grant_type: "refresh_token",
		client_id: process.env.CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
		refresh_token: process.env.REFRESH_TOKEN,
	};

	while (retries < maxRetries) {
		try {
			const response = await axios.post(
				"https://api.mercadolibre.com/oauth/token",
				data
			);

			// Update access token and refresh token if renewal is successful
			process.env.ACCESS_TOKEN = response.data.access_token;
			process.env.REFRESH_TOKEN = response.data.refresh_token;

			console.log(
				"Access token renewed successfully!",
				{ "access token": process.env.ACCESS_TOKEN },
				{
					"refresh token": (process.env.REFRESH_TOKEN =
						response.data.refresh_token),
				}
			);

			break;
		} catch (error) {
			console.error("Error renewing access token:", error);

			if (retries < maxRetries) {
				const delay = Math.pow(2, retries) * 1000;
				console.log(
					console.log(
						`Retrying (attempt ${retries + 1}) in ${
							delay / 1000
						} seconds...`
					)
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				retries++;
			} else {
				console.log("Unable to connect after 3 tries.");
			}
		}
	}
}

router.get("/", async (req, res) => {
	console.log("callback working");
	try {
		let code = req.query.code;

		const data = {
			grant_type: "authorization_code",
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			code: code,
			redirect_uri: process.env.REDIRECT_URI,
		};

		const response = await axios.post(
			"https://api.mercadolibre.com/oauth/token",
			data
		);
		console.log("this is response", response);

		process.env.ACCESS_TOKEN = response.data.access_token;
		process.env.REFRESH_TOKEN = response.data.refresh_token;

		console.log({
			access_token: process.env.ACCESS_TOKEN,
			refresh_token: process.env.REFRESH_TOKEN,
		});

		setInterval(renewAccessToken, 5 * 60 * 60 * 1000); // Run every 5 hours
	} catch (error) {
		console.error(error.message);
	}

	res.redirect("http://localhost:3000/");
});

module.exports = router;
