const defaultHeaders = ['Content-Type', 'Authorization'];

export function applyCors(res, { origin = '*', methods = ['POST', 'OPTIONS'], headers = defaultHeaders } = {}) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
}

export function handleCorsPreflight(req, res, options) {
    applyCors(res, options);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}

export function ensureMethod(req, res, allowed) {
    if (!allowed.includes(req.method)) {
        res.status(405).json({ error: `Method ${req.method} not allowed` });
        return false;
    }
    return true;
}
