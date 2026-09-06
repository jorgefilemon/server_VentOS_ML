const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const PRINTER = "\\\\Optiplex990\\TM88";
const QUEUE = path.join(os.tmpdir(), "ticket_queue");

let printChain = Promise.resolve();

if (!fs.existsSync(QUEUE)) {
	fs.mkdirSync(QUEUE, { recursive: true });
}

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

function enqueuePrint(task) {
	printChain = printChain.then(task, task);
	return printChain;
}

async function sendToPrinterInternal(data) {
	const timestamp = Date.now();
	const tmpFile = path.join(os.tmpdir(), `ticket_${timestamp}.bin`);
	fs.writeFileSync(tmpFile, data);

	try {
		await runCopy(tmpFile);
		console.log("Printed.");
		return "ok";
	} catch (error) {
		console.warn("First print attempt failed:", error.message);

		try {
			await delay(1200);
			await runCopy(tmpFile);
			console.log("Printed after retry.");
			return "ok";
		} catch (retryError) {
			const queued = path.join(QUEUE, `ticket_${Date.now()}.bin`);
			fs.writeFileSync(queued, data);
			console.warn(
				"Printer offline. Ticket queued:",
				path.basename(queued),
				retryError.message
			);
			return "queued";
		}
	} finally {
		if (fs.existsSync(tmpFile)) {
			fs.unlinkSync(tmpFile);
		}
	}
}

function sendToPrinter(data) {
	return enqueuePrint(() => sendToPrinterInternal(data));
}

module.exports = {
	sendToPrinter,
	delay,
};
