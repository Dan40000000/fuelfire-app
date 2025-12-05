import fs from 'fs';
import path from 'path';

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

const DATA_DIR = path.join(process.cwd(), 'api', 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');

function ensureStore() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readEvents() {
    const db = initFirestore();
    if (db) return null; // indicates using Firestore
    ensureStore();
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), 'utf-8');
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
    await db.collection('subscriptions').add(event);
    return true;
}

export default async function handler(req, res) {
    const method = req.method || req?.httpMethod;

    if (method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (method === 'GET') {
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
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Build user summaries (latest event per user)
        const userMap = {};
        events.forEach(evt => {
            const email = (evt.user?.email || '').toLowerCase() || 'unknown@example.com';
            if (!userMap[email]) {
                userMap[email] = { ...evt.user, email, latestPlan: evt.plan, latestAction: evt.action, promo: evt.code || null, expiresAt: evt.expiresAt || null, updatedAt: evt.ts };
            } else {
                // events are stored newest-first; first seen is latest
            }
        });
        const users = Object.values(userMap);
        return res.status(200).json({ events, users });
    }

    if (method === 'POST') {
        const body = req.body || {};
        const { action, plan, code, expiresAt, user, ts } = body;

        if (!action || !plan) {
            return res.status(400).json({ error: 'Missing action or plan' });
        }

        const event = {
            action,
            plan,
            code: code || null,
            expiresAt: expiresAt || null,
            user: user || { name: 'Unknown', email: 'unknown@example.com' },
            ts: ts || new Date().toISOString()
        };

        const db = initFirestore();
        if (db) {
            try {
                await addEventFirestore(event);
            } catch (err) {
                console.error('Firestore write failed, falling back to file:', err);
                const events = readEvents();
                events.unshift(event);
                writeEvents(events.slice(0, 500));
            }
        } else {
            const events = readEvents();
            events.unshift(event);
            writeEvents(events.slice(0, 500)); // cap file growth
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
