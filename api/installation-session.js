import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';
import { requireBodyLimit, getRequestBody } from './_lib/request-security.js';
import {
    createInstallationSession,
    getInstallationSessionSecretConfigured,
    resumeInstallationSession,
} from './_lib/installation-session.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
};

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) return;
    applyCors(res, corsOptions);
    res.setHeader('Cache-Control', 'no-store');

    if (!ensureMethod(req, res, ['POST'])) return;
    if (!getInstallationSessionSecretConfigured()) {
        return res.status(503).json({
            success: false,
            error: 'Installation session is not configured.',
            code: 'INSTALLATION_SESSION_CONFIG_REQUIRED',
        });
    }
    if (!requireBodyLimit(req, res, 8 * 1024)) return;

    const body = getRequestBody(req);
    if (!body) {
        return res.status(400).json({
            success: false,
            error: 'A JSON object body is required.',
            code: 'INVALID_JSON_BODY',
        });
    }
    const resumeToken = typeof body.installationSessionToken === 'string'
        ? body.installationSessionToken.trim().slice(0, 4096)
        : '';
    const explicitMigration = body.explicitMigration === true;
    const resumedSession = resumeInstallationSession(resumeToken);
    if (resumeToken && !resumedSession && !explicitMigration) {
        return res.status(409).json({
            success: false,
            error: 'The installation session expired or is invalid. Explicit restore/migration is required.',
            code: 'INSTALLATION_SESSION_RENEWAL_REQUIRED',
        });
    }
    const session = resumedSession || createInstallationSession();

    return res.status(200).json({
        success: true,
        rcAppUserId: session.rcAppUserId,
        installationSessionToken: session.token,
        expiresAt: session.expiresAt,
        resumed: Boolean(resumedSession),
        renewed: Boolean(resumedSession),
        migrated: Boolean(explicitMigration && resumeToken && !resumedSession),
    });
}
