require("dotenv").config();
const axios = require("axios");

let renewIntervalId;

const updateTokens = (data) => {
	process.env.ACCESS_TOKEN = data.access_token;
	process.env.REFRESH_TOKEN = data.refresh_token;

	return {
		access_token: process.env.ACCESS_TOKEN,
		refresh_token: process.env.REFRESH_TOKEN,
	};
};

const renewAccessToken = async () => {
	console.log("triggering refresh token");

	const response = await axios.post(
		"https://api.mercadolibre.com/oauth/token",
		{
			grant_type: "refresh_token",
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			refresh_token: process.env.REFRESH_TOKEN,
		}
	);

	const tokens = updateTokens(response.data);
	console.log("Access token renewed successfully!", tokens);

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
	if (renewIntervalId) {
		return renewIntervalId;
	}

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
};
