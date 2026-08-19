import fs from 'fs';
import http from 'http';
import path from 'path';

export function loadEnvFile(filePath = '.env.local') {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        ensureTestAuthEnv();
        return false;
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;

        const key = match[1];
        let value = match[2].trim();
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }

    process.env.FUELFIRE_AI_TEST_TOKEN ||= 'local-ai-smoke-test-token';
    process.env.FUELFIRE_INTERNAL_API_TOKEN ||= 'local-internal-smoke-test-token';
    process.env.AI_ACCESS_TOKEN_SECRET ||= 'local-access-token-secret-for-tests-only';
    return true;
}

export function ensureTestAuthEnv() {
    process.env.FUELFIRE_AI_TEST_TOKEN ||= 'local-ai-smoke-test-token';
    process.env.FUELFIRE_INTERNAL_API_TOKEN ||= 'local-internal-smoke-test-token';
    process.env.AI_ACCESS_TOKEN_SECRET ||= 'local-access-token-secret-for-tests-only';
}

export function getTestAuthHeaders() {
    ensureTestAuthEnv();
    return {
        'x-fuelfire-ai-test-token': process.env.FUELFIRE_AI_TEST_TOKEN,
    };
}

export async function invokeApi(handler, {
    method = 'POST',
    body = {},
    headers = {},
    query = {},
} = {}) {
    let settled = false;
    let response;

    const req = {
        method,
        body,
        headers,
        query,
    };

    const res = {
        statusCode: 200,
        headers: {},
        setHeader(key, value) {
            this.headers[key] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            settled = true;
            response = {
                status: this.statusCode,
                headers: this.headers,
                body: payload,
            };
            return this;
        },
        end(payload = '') {
            settled = true;
            response = {
                status: this.statusCode,
                headers: this.headers,
                body: payload,
            };
            return this;
        },
    };

    await handler(req, res);

    if (!settled) {
        response = {
            status: res.statusCode,
            headers: res.headers,
            body: null,
        };
    }

    return response;
}

async function readRequestBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    const text = Buffer.concat(chunks).toString('utf8');
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export async function startApiTestServer(routes) {
    const server = http.createServer(async (nodeReq, nodeRes) => {
        const url = new URL(nodeReq.url || '/', 'http://127.0.0.1');
        const handler = routes[url.pathname];

        if (!handler) {
            nodeRes.statusCode = 404;
            nodeRes.setHeader('Content-Type', 'application/json');
            nodeRes.end(JSON.stringify({ error: 'Not found' }));
            return;
        }

        try {
            const body = await readRequestBody(nodeReq);
            const response = await invokeApi(handler, {
                method: nodeReq.method,
                body,
                headers: nodeReq.headers,
                query: Object.fromEntries(url.searchParams.entries()),
            });

            nodeRes.statusCode = response.status;
            for (const [key, value] of Object.entries(response.headers || {})) {
                nodeRes.setHeader(key, value);
            }
            nodeRes.setHeader('Content-Type', 'application/json');
            nodeRes.end(JSON.stringify(response.body ?? null));
        } catch (error) {
            nodeRes.statusCode = 500;
            nodeRes.setHeader('Content-Type', 'application/json');
            nodeRes.end(JSON.stringify({ error: error.message }));
        }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    return {
        baseUrl,
        close: () => new Promise((resolve) => server.close(resolve)),
    };
}
