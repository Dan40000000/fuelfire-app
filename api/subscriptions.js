import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isInternalAuthorized, requireAdmin } from './_lib/security.js';
import { requireBodyLimit, getRequestBody } from './_lib/request-security.js';
import {
    normalizeAuthoritativeSubscriptionEvent,
    verifyRevenueCatWebhookSignature,
} from './_lib/subscription-events.js';

let firestore = null;
function initFirestore() {
    if (firestore) return firestore;
    const hasCreds = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
    if (!hasCreds) return null;
    try {
        // Lazy-load to allow local fallback if firebase-admin isn't installed
        // eslint-disable-next-line global-require
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
        }
        firestore = admin.firestore();
        return firestore;
    } catch (err) {
        console.warn('Firebase not available, falling back to local JSON store:', err.message);
        return null;
    }
}

function getDataFile() {
    return process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH
        || path.join(process.cwd(), 'api', 'data', 'subscriptions.json');
}

function getDataDir() {
    return path.dirname(getDataFile());
}

function ensureStore() {
    const dataDir = getDataDir();
    const dataFile = getDataFile();
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]', 'utf-8');
}

function readEvents() {
    const db = initFirestore();
    if (db) return null; // indicates using Firestore
    ensureStore();
    try {
        const raw = fs.readFileSync(getDataFile(), 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Failed to read subscriptions store', e);
        return [];
    }
}

function writeEvents(events) {
    const db = initFirestore();
    if (db) return; // Firestore path handles writes separately
    ensureStore();
    const dataFile = getDataFile();
    const temporaryFile = `${dataFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(events, null, 2), 'utf-8');
    fs.renameSync(temporaryFile, dataFile);
}

async function listEventsFirestore() {
    const db = initFirestore();
    if (!db) return null;
    const snap = await db.collection('subscriptions').orderBy('ts', 'desc').limit(500).get();
    return snap.docs.map((doc) => doc.data());
}

async function addEventFirestore(event) {
    const db = initFirestore();
    if (!db) return false;
    const documentId = crypto.createHash('sha256').update(event.eventId).digest('hex');
    try {
        await db.collection('subscriptions').doc(documentId).create(event);
        return { created: true, duplicate: false };
    } catch (error) {
        if (error?.code === 6 || error?.code === 'already-exists' || /already exists/i.test(error?.message || '')) {
            return { created: false, duplicate: true };
        }
        throw error;
    }
}

export default async function handler(req, res) {
    const method = req.method || req?.httpMethod;

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Fuelfire-Admin-Token, X-Fuelfire-Internal-Token, X-RevenueCat-Webhook-Signature');
        return res.status(200).end();
    }

    if (method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const fsEvents = readEvents();
        let events = fsEvents || [];
        const db = initFirestore();
        if (db) {
            try {
                const cloudEvents = await listEventsFirestore();
                if (cloudEvents) events = cloudEvents;
            } catch (err) {
                console.warn('Failed to load Firestore events, falling back to file:', err.message);
            }
        }
        // Build administrator-only summaries without trusting browser-supplied PII.
        const userMap = {};
        events.forEach(evt => {
            const appUserId = evt.appUserId || 'unknown';
            if (!userMap[appUserId]) {
                userMap[appUserId] = {
                    appUserId,
                    latestEventType: evt.eventType,
                    productId: evt.productId,
                    entitlementIds: evt.entitlementIds || [],
                    expiresAtMs: evt.expirationAtMs || null,
                    updatedAt: evt.receivedAt,
                };
            } else {
                // events are stored newest-first; first seen is latest
            }
        });
        const users = Object.values(userMap);
        return res.status(200).json({ events, users });
    }

    if (method === 'POST') {
        if (!requireBodyLimit(req, res, 128 * 1024)) return;
        const body = getRequestBody(req);
        if (!body) {
            return res.status(400).json({ error: 'A JSON object body is required.', code: 'INVALID_JSON_BODY' });
        }

        const signature = verifyRevenueCatWebhookSignature(req);
        const internal = isInternalAuthorized(req);
        if (!signature.valid && !internal) {
            return res.status(401).json({
                success: false,
                error: 'A verified subscription event is required.',
                code: 'SUBSCRIPTION_EVENT_UNAUTHORIZED',
            });
        }

        const event = normalizeAuthoritativeSubscriptionEvent(body, {
            source: internal && !signature.valid ? 'internal' : signature.source,
        });
        if (!event) {
            return res.status(400).json({
                success: false,
                error: 'Invalid authoritative subscription event.',
                code: 'INVALID_SUBSCRIPTION_EVENT',
            });
        }

        const db = initFirestore();
        if (db) {
            try {
                const result = await addEventFirestore(event);
                return res.status(200).json({ success: true, duplicate: result.duplicate });
            } catch (err) {
                console.error('Firestore subscription event write failed:', err.message);
                return res.status(503).json({ success: false, error: 'Subscription ledger unavailable.', code: 'SUBSCRIPTION_LEDGER_UNAVAILABLE' });
            }
        } else {
            const events = readEvents();
            if (events.some((existing) => existing.eventId === event.eventId)) {
                return res.status(200).json({ success: true, duplicate: true });
            }
            events.unshift(event);
            writeEvents(events.slice(0, 500)); // cap file growth
        }

        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
