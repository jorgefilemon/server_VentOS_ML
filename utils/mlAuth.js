const db = require("../database");

function createMercadoAuth({ db }) {
    const url = "https://api.mercadolibre.com/oauth/token";
    let timer;
    let queue = Promise.resolve();

    function run(task) {
        const result = queue.then(task);
        queue = result.catch(() => {});
        return result;
    }

    async function getTokens() {
        const [rows] = await db.query(
            "SELECT access_token, refresh_token, expires_at FROM mercadotokens WHERE id = ?",
            [1],
        );
        return rows[0] || null;
    }

    async function requestTokens(grant) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                ...grant,
            }),
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            const error = new Error(
                `Mercado Libre token request failed: HTTP ${response.status}`,
            );
            error.response = { status: response.status };
            throw error;
        }

        const data = await response.json();

        if (!data.access_token || !data.refresh_token) {
            throw new Error("Missing Mercado Libre tokens");
        }

        // Prevent the expiration time from becoming zero or negative.
        const expires = new Date(
            Date.now() +
                Math.max(1, (Number(data.expires_in) || 21600) - 300) * 1000,
        );

        await db.query(
            `
            INSERT INTO mercadotokens
                (id, access_token, refresh_token, expires_at)
            VALUES (1, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                access_token = VALUES(access_token),
                refresh_token = VALUES(refresh_token),
                expires_at = VALUES(expires_at)
        `,
            [data.access_token, data.refresh_token, expires],
        );

        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: expires,
        };
    }

    async function renew() {
        const queryResult = await db.query(
            "SELECT refresh_token, expires_at FROM mercadotokens WHERE id = 1",
        );
        const rows = queryResult[0];
        const token = rows[0];

        if (!token?.refresh_token) return;
        if (new Date(token.expires_at) > new Date()) return;

        await requestTokens({
            grant_type: "refresh_token",
            refresh_token: token.refresh_token,
        });

        console.log("Mercado Libre token renewed.");
    }

    function start() {
        if (timer) return;

        const check = () =>
            run(renew).catch((error) => {
                console.error("Mercado Libre renewal failed:", error.message);
            });

        check();
        timer = setInterval(check, 60000);
        timer.unref();
    }

    function login(code, redirectUri) {
        return run(() =>
            requestTokens({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        );
    }

    return { start, login, getTokens };
}

// Share one queue and renewal timer across all callers in this process.
module.exports = createMercadoAuth({ db });
