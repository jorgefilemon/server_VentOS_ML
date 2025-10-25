const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

// Configuration
const PRINTER = "\\\\jorge-PC\\TM88";
const QUEUE = path.join(os.tmpdir(), "ticket_queue");

// Ensure queue exists
fs.existsSync(QUEUE) || fs.mkdirSync(QUEUE, { recursive: true });

// Core functions
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCopy = (file) =>
	new Promise((resolve, reject) => {
		execFile(
			"cmd.exe",
			["/c", "copy", "/b", file, PRINTER],
			{ windowsHide: true },
			(err) => (err ? reject(err) : resolve())
		);
	});

async function sendToPrinter(data) {
	const tmpFile = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);
	fs.writeFileSync(tmpFile, data);

	try {
		await runCopy(tmpFile);
		console.log("✅ Printed.");
		return "ok";
	} catch {
		try {
			await delay(1000); // 800ms stabilization period
			await runCopy(tmpFile);
			console.log("✅ Printed after retry.");
			return "ok";
		} catch {
			const queued = path.join(QUEUE, `ticket_${Date.now()}.bin`);
			fs.writeFileSync(queued, data);
			console.warn(
				"⚠️ Printer offline. Ticket queued:",
				path.basename(queued)
			);
			return "queued";
		}
	} finally {
		fs.existsSync(tmpFile) && fs.unlinkSync(tmpFile);
	}
}

module.exports = { sendToPrinter };
