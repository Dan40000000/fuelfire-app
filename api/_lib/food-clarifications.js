function cleanText(value, maxLength = 160) {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeText(value) {
    return cleanText(value, 1000).toLowerCase();
}

function combinedFoodText(foods) {
    return (Array.isArray(foods) ? foods : [])
        .map((food) => [food?.name, food?.serving, food?.matchedItem].filter(Boolean).join(' '))
        .join(' ');
}

function querySpecifiesCrackerCount(value) {
    const text = normalizeText(value);
    return /\b\d+(?:\.\d+)?\s+(?:(?:ritz|round|butter)\s+)*crackers?\b/.test(text)
        || /\bcrackers?\s*(?:count|quantity|eaten)?\s*[:=]?\s*\d+(?:\.\d+)?\b/.test(text)
        || /\bcracker\s+count\s*[:=]?\s*\d+(?:\.\d+)?\b/.test(text);
}

function questionKey(question) {
    return cleanText(question?.id || question?.question, 160).toLowerCase();
}

export function sanitizeClarifyingQuestions(value, limit = 3) {
    const questions = Array.isArray(value) ? value : [];
    const seen = new Set();
    const sanitized = [];

    for (const candidate of questions) {
        if (!candidate || typeof candidate !== 'object') continue;
        const question = cleanText(candidate.question, 160);
        if (!question) continue;
        const id = cleanText(candidate.id || question, 48)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || `question_${sanitized.length + 1}`;
        const key = questionKey({ id, question });
        if (seen.has(key)) continue;
        seen.add(key);
        sanitized.push({
            id,
            question,
            examples: (Array.isArray(candidate.examples) ? candidate.examples : [])
                .map((example) => cleanText(String(example), 40))
                .filter(Boolean)
                .slice(0, 5),
            reason: cleanText(candidate.reason, 180),
            answerType: candidate.answerType === 'number' ? 'number' : 'single-choice-or-voice',
            acceptsVoice: candidate.acceptsVoice !== false,
            affectedFood: cleanText(candidate.affectedFood, 80) || null,
            estimatedCalorieImpact: Math.max(0, Math.min(5000, Math.round(Number(candidate.estimatedCalorieImpact) || 0)))
        });
        if (sanitized.length >= Math.max(1, Math.min(5, limit))) break;
    }

    return sanitized;
}

export function mergeClarifyingQuestions(...questionSets) {
    return sanitizeClarifyingQuestions(questionSets.flat(), 3);
}

export function buildHighImpactClarifyingQuestions({ query = '', foods = [], evidenceText = '' } = {}) {
    const context = normalizeText(`${query} ${evidenceText}`);
    const foodsText = normalizeText(combinedFoodText(foods));
    const questions = [];

    if (/\btuna\b/.test(foodsText) && !/\b(?:packed|canned|tuna)?\s*(?:in\s+)?(?:spring\s+)?water\b|\b(?:packed|canned|tuna)?\s*(?:in\s+)?(?:olive\s+|vegetable\s+)?oil\b/.test(context)) {
        questions.push({
            id: 'tuna_packing_liquid',
            question: 'Was the tuna packed in water or oil?',
            examples: ['Water', 'Oil', 'Not sure'],
            reason: 'A five-ounce can can differ by roughly 90 calories depending on the packing liquid.',
            answerType: 'single-choice-or-voice',
            acceptsVoice: true,
            affectedFood: 'Canned tuna',
            estimatedCalorieImpact: 90
        });
    }

    if (/\b(?:ritz|butter\s+crackers?|crackers?)\b/.test(foodsText) && !querySpecifiesCrackerCount(context)) {
        questions.push({
            id: 'cracker_count',
            question: 'How many crackers did you eat?',
            examples: ['5', '10', '15', '20'],
            reason: 'The photo can show the package, but only you know how many crackers you actually ate.',
            answerType: 'number',
            acceptsVoice: true,
            affectedFood: 'Crackers',
            estimatedCalorieImpact: 80
        });
    }

    return sanitizeClarifyingQuestions(questions, 3);
}
