require("dotenv").config();
const axios = require("axios");
const db = require("../database");
let renewIntervalId;

const getTokens = async () => {
	const [rows] = await db.query(
		"SELECT access_token, refresh_token FROM mercadotokens WHERE id = ?",
		[1]
	);

	return rows[0] || null;
};

const updateTokens = async (data) => {
	await db.query(
		`INSERT INTO mercadotokens (id, access_token, refresh_token)
		 VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		 access_token = VALUES(access_token),
		 refresh_token = VALUES(refresh_token)`,
		[1, data.access_token, data.refresh_token]
	);

	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
	};
};

const renewAccessToken = async () => {
	console.log("triggering refresh token");

	const storedTokens = await getTokens();

	if (!storedTokens?.refresh_token) {
	throw new Error("No Mercado Libre refresh token saved");
	}

	const response = await axios.post(
		"https://api.mercadolibre.com/oauth/token",
		{
			grant_type: "refresh_token",
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			refresh_token: storedTokens.refresh_token,
		}
	);

	const tokens = await updateTokens(response.data);
	console.log("Access token renewed successfully!");
	return tokens;
};
const exchangeAuthorizationCode = async (code) => {
	const response = await axios.post(
		"https://api.mercadolibre.com/oauth/token",
		{
			grant_type: "authorization_code",
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			code,
			redirect_uri: process.env.REDIRECT_URI,
		}
	);

	return updateTokens(response.data);
};

const ensureRenewScheduler = () => {
	if (renewIntervalId) return renewIntervalId;

	renewIntervalId = setInterval(() => {
		renewAccessToken().catch((error) => {
			console.error(
				"Scheduled token renewal failed:",
				error.response ? error.response.data : error.message
			);
		});
	}, 5 * 60 * 60 * 1000);

	return renewIntervalId;
};

module.exports = {
	exchangeAuthorizationCode,
	ensureRenewScheduler,
	renewAccessToken,
	getTokens,
};
