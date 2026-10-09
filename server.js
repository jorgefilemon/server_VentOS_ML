const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser"); // to parse the cookie

const jwt = require("jsonwebtoken");
const axios = require("axios");
const https = require("https");
const path = require("path");
const fs = require("fs");
const { getTokens } = require("./utils/mlAuth");

// R O U T E S //

const lastTicketRoute = require("./routes/lastTicket");
const loginRoute = require("./routes/login");
const corteRoute = require("./routes/corte");
const cashFloatRoute = require("./routes/cashFloat");
const postCashFloatRoute = require("./routes/postCashFloat");
const revisarCorteRoute = require("./routes/revisarCorte");
const expenseRoute = require("./routes/expense");
const searchRoute = require("./routes/search");
const shoeSellsInPeriodRoute = require("./routes/shoeSellsInPeriod");
const shoeSellsInTwoMonthsRoute = require("./routes/shoeSellsInTwoMonths");
const ventaRoute = require("./routes/venta");
const callbackRoute = require("./routes/callback.js");
const startMercadoLibreRetryJob = require("./utils/retryMercadoLibreUpdates.js");


app.use(express.json());
// why?
app.use(cookieParser());
// cors
app.use(
	cors({
		credentials: true, // so axios can work.
		origin: ["http://localhost:3000"],
		methods: ["GET", "POST"],
	})
);

// login authenticate
app.use("/login", loginRoute);

// vefify user with jwt
app.get("/verify", async (req, res, next) => {
	const token = req.cookies.access_token;
	try {
		const { usu_id, nombre } = jwt.verify(token, "382u397429&$");

		let connected = false;

		try {
			const tokens = await getTokens();
			if (tokens?.access_token) {
				await axios.get("https://api.mercadolibre.com/users/me", {
					headers: {
						Authorization: `Bearer ${tokens.access_token}`,
					},
					timeout: 5000,
				});
				connected = true;
			}
		} catch (error) {
			console.error(
				axios.isAxiosError(error)
					? "Mercado Libre connection check failed"
					: "Could not read Mercado Libre tokens from database",
				{ code: error.code, status: error.response?.status }
			);
		}

		res.set("Cache-Control", "no-store");

		res.json({
			usu_id: usu_id,
			nombre: nombre,
			logged: true,
			connected,
		});

		//next(); not neceesary as youre sendin json
	} catch (err) {
		res.send({ logged: false, usu_id: "", nombre: "" });
	}
});

// logout session clear cookie
app.get("/logout", (req, res) => {
	res.clearCookie("access_token", {
		httpOnly: true,
		sameSite: "none",
		secure: true, // Ensure this matches the cookie settings
	}).send("cleared cookie");
});

// R O U T E S

// gets last ticket
app.use("/lastTicket", lastTicketRoute);
// revisa corte antes de commitearlo
app.use("/revisarCorte", revisarCorteRoute);
// hace el corte
app.use("/corte", corteRoute);
// GET CASH FLOAT
app.use("/cashFloat", cashFloatRoute);
// POST CASH FLOAT
app.use("/postCashFloat", postCashFloatRoute);
// expense
app.use("/expense", expenseRoute);
// search
app.use("/search", searchRoute);
// venta
app.use("/venta", ventaRoute);
// calback from mercado libre.
app.use("/callback", callbackRoute);

app.use("/shoeSellsInPeriod", shoeSellsInPeriodRoute);

app.use("/shoeSellsInTwoMonths", shoeSellsInTwoMonthsRoute);

// const privateKeyPath = path.join(__dirname, "cert", "server.key");
// const certificatePath = path.join(__dirname, "cert", "server.crt");

// const sslServer = https.createServer(
// 	{
// 		key: fs.readFileSync(privateKeyPath, "utf8"),
// 		cert: fs.readFileSync(certificatePath, "utf8"),
// 	},
// 	app
// );

const privateKeyPath = path.join(__dirname, "localhost+2-key.pem");
const certificatePath = path.join(__dirname, "localhost+2.pem");

const sslServer = https.createServer(
	{
		key: fs.readFileSync(privateKeyPath, "utf8"),
		cert: fs.readFileSync(certificatePath, "utf8"),
	},
	app
);




startMercadoLibreRetryJob();

//
sslServer.listen(process.env.NODEPORT, () =>
	console.log(
		`server running on port ${process.env.NODEPORT}, MYSQL port ${process.env.MYSQL_PORT}`
	)
);
