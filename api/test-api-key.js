import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';
import { requireAdmin } from './_lib/security.js';

const corsOptions = {
    methods: ['GET', 'POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) {
        return;
    }
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['GET', 'POST'])) {
        return;
    }

    if (!requireAdmin(req, res)) return;

    return res.status(200).json({ success: true });
}
