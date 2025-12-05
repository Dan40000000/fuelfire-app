import { callClaude } from './_lib/anthropic.js';
import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

const SYSTEM_PROMPT = `You are FuelFire's AI workout logging assistant. You analyze treadmill console photos and return precise training metrics.

Rules:
- Look for numbers on the console that represent duration (time), distance (miles), calories, speed, pace, and incline.
- Interpret labels like TIME, DIST, CAL, SPEED, PACE, INCL, GRADE.
- If a value is unclear or missing, output null.
- ALWAYS return valid JSON only. No prose, no markdown.
- Normalize pace to the format "MM:SS". Return null if you cannot determine it.
- Include a short "summary" string (max 120 characters) recapping what you found.
- Include a "confidence" number from 0-1 where 1 is very confident.
- If you see additional insights (like heart rate), mention in "notes".
- Prefer the final workout totals that consoles display along the bottom/center. Ignore split-interval data.
- If a metric is presented in hours:minutes:seconds convert it to minutes (durationMinutes) before returning JSON.
- Be explicit—if something is unreadable, say so in "notes" but leave the JSON field null.
`;

function stripBase64Prefix(data) {
    if (!data) return data;
    const commaIndex = data.indexOf(',');
    if (commaIndex !== -1) {
        return data.slice(commaIndex + 1);
    }
    return data;
}

function parseNumber(value) {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function parseTimeToMinutes(value) {
    if (!value || typeof value !== 'string') return null;
    const clean = value.trim();
    const parts = clean.split(':').map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return null;
    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 60 + minutes + seconds / 60;
    }
    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes + seconds / 60;
    }
    return null;
}

function inferMetricsFromText(...sources) {
    const text = sources.filter(Boolean).join(' | ').toLowerCase();
    if (!text) return {};

    const result = {};

    const durationMatch = text.match(/(?:time|duration)[^0-9]*(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (durationMatch) {
        result.durationMinutes = parseTimeToMinutes(durationMatch[1]);
    }

    const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s?(?:mi|miles)/);
    if (distanceMatch) {
        result.distanceMiles = parseFloat(distanceMatch[1]);
    }

    const caloriesMatch = text.match(/(\d{2,4})\s?(?:cal|calories|kcals?)/);
    if (caloriesMatch) {
        result.calories = parseInt(caloriesMatch[1], 10);
    }

    const paceMatch = text.match(/pace[^0-9]*(\d{1,2}:\d{2})/);
    if (paceMatch) {
        result.averagePace = paceMatch[1];
    }

    const speedMatch = text.match(/(\d+(?:\.\d+)?)\s?(?:mph|speed)/);
    if (speedMatch) {
        result.speedMph = parseFloat(speedMatch[1]);
    }

    const inclineMatch = text.match(/(\-?\d+(?:\.\d+)?)\s?(?:%|grade|incline)/);
    if (inclineMatch) {
        result.inclinePercent = parseFloat(inclineMatch[1]);
    }

    return result;
}

function mergeInferredMetrics(responseData, inference) {
    const merged = { ...responseData };
    for (const [key, value] of Object.entries(inference)) {
        if ((merged[key] === null || merged[key] === undefined) && value !== undefined) {
            merged[key] = value;
        }
    }
    return merged;
}

function normalizePace(paceString) {
    if (!paceString || typeof paceString !== 'string') return null;
    const parts = paceString.trim().split(':').map(Number);
    if (parts.some((p) => Number.isNaN(p))) return null;
    if (parts.length === 2) {
        const [m, s] = parts;
        const sec = Math.min(Math.max(Math.round(s), 0), 59);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    if (parts.length === 3) {
        const [h, m, s] = parts;
        const totalMin = h * 60 + m + s / 60;
        const paceMin = Math.floor(totalMin);
        const paceSec = Math.round((totalMin - paceMin) * 60);
        return `${String(paceMin).padStart(2, '0')}:${String(Math.min(paceSec, 59)).padStart(2, '0')}`;
    }
    return null;
}

function paceFromSpeed(speedMph) {
    if (!speedMph || speedMph <= 0) return null;
    const minutesPerMile = 60 / speedMph;
    const whole = Math.floor(minutesPerMile);
    const seconds = Math.round((minutesPerMile - whole) * 60);
    return `${String(whole).padStart(2, '0')}:${String(Math.min(seconds, 59)).padStart(2, '0')}`;
}

function derivedFromDistanceDuration(distanceMiles, durationMinutes) {
    if (!distanceMiles || !durationMinutes || distanceMiles <= 0 || durationMinutes <= 0) return {};
    const speed = distanceMiles / (durationMinutes / 60);
    const pace = paceFromSpeed(speed);
    return { speedMph: speed, averagePace: pace };
}

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) {
        return;
    }
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['POST'])) {
        return;
    }

    try {
        const body = req.body || {};
        let { imageBase64, mimeType } = body;

        if (!imageBase64 || typeof imageBase64 !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Image data is required',
            });
        }

        if (!process.env.CLAUDE_API_KEY) {
            return res.status(200).json({
                success: false,
                error: 'Claude API key missing. Configure CLAUDE_API_KEY to enable treadmill photo logging.',
            });
        }

        imageBase64 = stripBase64Prefix(imageBase64.trim());
        mimeType = (mimeType && typeof mimeType === 'string' && mimeType.includes('/'))
            ? mimeType
            : 'image/jpeg';

        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `Analyze this treadmill console photo and extract workout metrics.

Return JSON with the following keys:
- durationMinutes (number|null)
- distanceMiles (number|null)
- calories (number|null)
- averagePace (string|null) // format MM:SS
- speedMph (number|null)
- inclinePercent (number|null)
- summary (string) // short sentence
- confidence (number between 0 and 1)
- notes (string|null)

Do not invent numbers—return null when unsure. JSON only.`,
                    },
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType,
                            data: imageBase64,
                        },
                    },
                ],
            },
        ];

        const { text } = await callClaude({
            messages,
            system: SYSTEM_PROMPT,
            maxTokens: 800,
            temperature: 0,
            tags: ['treadmill-vision'],
        });

        let parsed;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        } catch (parseError) {
            console.error('Failed to parse Claude response:', parseError, text);
            return res.status(200).json({
                success: false,
                error: 'AI could not interpret the console. Try retaking the photo with clearer lighting.',
            });
        }

        let responseData = {
            durationMinutes: parseNumber(parsed.durationMinutes),
            distanceMiles: parseNumber(parsed.distanceMiles),
            calories: parseNumber(parsed.calories),
            averagePace: typeof parsed.averagePace === 'string' ? normalizePace(parsed.averagePace) : null,
            speedMph: parseNumber(parsed.speedMph),
            inclinePercent: parseNumber(parsed.inclinePercent),
            summary: typeof parsed.summary === 'string'
                ? parsed.summary.trim().slice(0, 200)
                : 'Console metrics captured.',
            confidence: Math.min(Math.max(parseNumber(parsed.confidence) ?? 0.4, 0), 1),
            notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : null,
        };

        const inferred = inferMetricsFromText(parsed.summary, parsed.notes, text);
        responseData = mergeInferredMetrics(responseData, inferred);
        const derived = derivedFromDistanceDuration(responseData.distanceMiles, responseData.durationMinutes);
        responseData = mergeInferredMetrics(responseData, derived);
        if (!responseData.averagePace && responseData.speedMph) {
            responseData.averagePace = paceFromSpeed(responseData.speedMph);
        }

        res.status(200).json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        console.error('Treadmill vision handler error:', error);
        res.status(500).json({
            success: false,
            error: 'Unexpected error analyzing treadmill photo.',
        });
    }
}
