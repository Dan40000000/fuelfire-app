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

// A vision model can call a rib "beef" based on appearance alone. Treat the
// cut and the animal as separate facts: the cut can come from visual evidence,
// but the species must come from the user's context or readable label text.
const RIB_PATTERN = /\b(?:ribs?|short\s+ribs?|spare\s+ribs?|baby\s+back(?:\s+ribs?)?|back\s+ribs?)\b/i;
const RIB_COUNT_PATTERN = new RegExp(
    '(?:' +
        '\\b(?:[1-9]\\d*|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\\s+' +
        '(?:(?:small|medium|large|short|spare|baby\\s+back|back|cooked|bone[- ]?in)\\s+)*' +
        '(?:pork|pig|swine|beef|cow|lamb|mutton|goat)\\s+' +
        '(?:(?:small|medium|large|short|spare|baby\\s+back|back|cooked|bone[- ]?in)\\s+)*ribs?\\b' +
        '|' +
        '\\b(?:pork|pig|swine|beef|cow|lamb|mutton|goat)\\s+' +
        '(?:(?:small|medium|large|short|spare|baby\\s+back|back|cooked|bone[- ]?in)\\s+)*ribs?\\b\\s*(?:[,;:]\\s*)?' +
        '(?:(?:about|around|approximately)\\s+)?' +
        '(?:[1-9]\\d*|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\\b' +
    ')',
    'i'
);

function ribDetailsQuestion() {
    return {
        id: 'rib_details',
        question: 'What kind of ribs are these, and about how many?',
        examples: ['4 pork ribs', '6 pork ribs', '8 pork ribs', '2 beef ribs', 'Not sure'],
        reason: 'Say or type a complete answer such as “six pork ribs.” Count individual ribs, not a bone-in slab; appearance alone cannot establish species or exact edible meat grams.',
        answerType: 'single-choice-or-voice',
        acceptsVoice: true,
        affectedFood: 'Ribs',
        estimatedCalorieImpact: 700
    };
}

function hasExplicitRibDetails(value) {
    return RIB_COUNT_PATTERN.test(normalizeText(value));
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

// Photo estimates already describe the visible plated portion. Questions about
// whether the user finished that portion add friction and, when copied into a
// follow-up lookup query, can be misread as another food or serving.
const PHOTO_COMPLETENESS_QUESTION_PATTERN = /\b(?:did\s+you|have\s+you|has\s+the\s+user|were\s+you\s+able\s+to|are\s+you\s+going\s+to|do\s+you)\s+(?:eat|eaten|consume|consumed|finish|finished)\b[\s\S]*\b(?:all|everything|entire|whole|full|fully|complete(?:ly)?)\b/i;
const PHOTO_COMPLETENESS_STATEMENT_PATTERN = /\b(?:ate|eaten|consumed|finished|finish(?:ed)?|fully\s+eaten|all\s+eaten)\s+(?:all|everything|the\s+whole|the\s+entire|the\s+full|fully|completely)\b|\b(?:all|everything|the\s+whole|the\s+entire|the\s+full|fully|completely|full)\s+(?:was\s+)?(?:eaten|consumed|finished)\b/i;
const PHOTO_FRACTION_PORTION_PATTERN = /\b(?:what|which|how\s+much)\s+(?:fraction|portion|percentage|percent|amount)\b[\s\S]*\b(?:eat|eaten|consume|consumed|finish|finished)\b|\b(?:fraction|portion|percentage|percent)\b[\s\S]*\b(?:did\s+you|was\s+eaten|was\s+consumed)\b/i;

function photoQuestionText(question) {
    return normalizeText([
        question?.id,
        question?.question,
        question?.affectedFood,
        question?.reason
    ].filter(Boolean).join(' '));
}

function photoCompletenessQuestion(question) {
    const text = photoQuestionText(question);
    return PHOTO_COMPLETENESS_QUESTION_PATTERN.test(text)
        || PHOTO_COMPLETENESS_STATEMENT_PATTERN.test(text)
        || PHOTO_FRACTION_PORTION_PATTERN.test(text)
        || /\b(?:ate|eaten|consume|consumed|finish|finished)\s+(?:all|everything)\b/i.test(text)
        || /\b(?:all|everything|the\s+full|the\s+whole)\s+(?:of\s+it|of\s+the\s+food|of\s+both)\b/i.test(text)
        || /\bhow\s+much\b[\s\S]*\b(?:of\s+(?:it|the)|did\s+you)\b[\s\S]*\b(?:eat|eaten|consume|consumed)\b/i.test(text);
}

function questionFoodMatch(question, foods) {
    const questionTokens = foodIdentityTokens([
        question?.affectedFood,
        question?.question
    ].filter(Boolean).join(' '));
    if (!questionTokens.size) return null;

    let best = null;
    let bestScore = 0;
    (Array.isArray(foods) ? foods : []).forEach((food) => {
        const foodTokens = foodIdentityTokens([food?.name, food?.serving, food?.matchedItem].filter(Boolean).join(' '));
        if (!foodTokens.size) return;
        const overlap = [...questionTokens].filter((token) => foodTokens.has(token)).length;
        const score = overlap / Math.max(1, Math.min(questionTokens.size, foodTokens.size));
        if (score > bestScore) {
            best = food;
            bestScore = score;
        }
    });
    return bestScore >= 0.34 ? best : null;
}

function foodIdentityTokens(value) {
    const ignored = new Set([
        'what', 'which', 'how', 'many', 'much', 'did', 'you', 'eat', 'eaten', 'consume', 'consumed',
        'packed', 'packing', 'liquid', 'used', 'use', 'was', 'were', 'the', 'this', 'that', 'food',
        'item', 'serving', 'portion', 'count', 'quantity', 'number', 'size', 'large', 'small', 'about'
    ]);
    return new Set(normalizeText(value)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 2 && !ignored.has(token))
        .map((token) => token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token));
}

function hasExplicitFoodCount(food) {
    if (!food || typeof food !== 'object') return false;
    const directCount = Number(food.visualCount ?? food.count ?? food.visualQuantity);
    if (Number.isFinite(directCount) && directCount > 0) return true;

    const quantity = Number(food.quantity);
    if (Number.isFinite(quantity) && quantity > 1) return true;

    const text = normalizeText([
        food.name,
        food.serving,
        food.visualAmount
    ].filter(Boolean).join(' '));
    // A singular default quantity (for example, "1 cracker") is not proof
    // that the count is known; only an explicit multi-item amount is.
    return /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(?:counted\s+)?[a-z][a-z-]*s\b/.test(text)
        || /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(?:[- ]?count|pieces?|pcs?|items?)\b/.test(text);
}

function photoQuestionKind(question, foods = []) {
    const text = photoQuestionText(question);
    const id = normalizeText(question?.id || '');
    if (id === 'rib_details' || id === 'rib_species'
        || /\b(?:protein[- ]?type|species|animal|kind|type)\b/.test(text) && RIB_PATTERN.test(text)
        || /\b(?:pork|pig|swine|beef|cow|lamb|mutton|goat)\b/.test(text) && RIB_PATTERN.test(text)) return 'protein-type';
    if (/\b(?:packed|packing|liquid|water)\b/.test(text)
        && /\b(?:water|oil|liquid|packed|packing)\b/.test(text)) return 'packing-liquid';
    if (/\b(?:ounce|ounces|oz|pound|pounds|lb|lbs|gram|grams|weight|weighed|size|small|medium|large|jumbo|diameter|quarter[- ]?lb|half[- ]?lb|patty|patties|burger)\b/.test(text)
        || /(?:^|_)(?:weight|size|diameter|patty|pattie)(?:_|$)/.test(id)) return 'weight-size';
    if (/\b(?:how many|count|quantity|number of|pieces?|pcs?|counted)\b/.test(text)
        || /(?:^|_)(?:count|quantity|number)(?:_|$)/.test(id)) {
        const matchedFood = questionFoodMatch(question, foods);
        return matchedFood && hasExplicitFoodCount(matchedFood) ? '' : 'count';
    }
    if (/\b(?:oil|butter|spray|grease|fat|mayo(?:nnaise)?|dressing|sauce|gravy|marinade)\b/.test(text)
        || /(?:^|_)(?:oil|fat|sauce|dressing|butter)(?:_|$)/.test(id)) return 'added-fat-sauce';
    return '';
}

function estimatedQuestionImpact(question, kind) {
    const explicit = Number(question?.estimatedCalorieImpact);
    if (kind === 'protein-type') {
        // Species is the one permitted identity question for ribs. Keep it
        // ahead of size/oil/count noise even if a model supplies a tiny or
        // missing impact estimate.
        return Math.max(1000, Number.isFinite(explicit) ? Math.min(5000, explicit) : 0);
    }
    if (Number.isFinite(explicit) && explicit > 0) return Math.min(5000, explicit);
    return {
        'protein-type': 1000,
        'weight-size': 250,
        'packing-liquid': 90,
        count: 80,
        'added-fat-sauce': 100
    }[kind] || 0;
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

/**
 * Select the single useful follow-up for a photographed meal.
 *
 * The model is allowed to suggest several possibilities, but photo logging
 * treats the visible plated portion as the consumed portion. This helper is
 * deliberately deterministic so the same response cannot alternate between
 * opening a clarification dialog and silently asking the parser to resolve
 * prose such as "ate everything".
 */
export function selectPhotoClarifyingQuestions(value, context = {}) {
    const questions = Array.isArray(value)
        ? value
        : (Array.isArray(value?.questions) ? value.questions : []);
    const foods = Array.isArray(context?.foods)
        ? context.foods
        : (Array.isArray(value?.foods) ? value.foods : []);
    const contextText = normalizeText(`${context?.query || ''} ${context?.evidenceText || ''}`);
    const ribDetailsAlreadyKnown = hasExplicitRibDetails(contextText);
    const sanitized = sanitizeClarifyingQuestions(questions, 8);
    const candidates = sanitized
        .filter((question) => !photoCompletenessQuestion(question))
        .map((question, index) => {
            const kind = photoQuestionKind(question, foods);
            if (!kind) return null;
            if (kind === 'protein-type' && ribDetailsAlreadyKnown) return null;

            const impact = estimatedQuestionImpact(question, kind);
            // A generic "was any spray/oil used?" question is not useful when
            // its stated effect is negligible. Keep an explicit amount or a
            // materially different preparation, while dropping low-impact UX
            // noise from photo results.
            if (kind === 'added-fat-sauce' && impact < 40) return null;

            return {
                question,
                kind,
                impact,
                index
            };
        })
        .filter(Boolean)
        .sort((left, right) => right.impact - left.impact || left.index - right.index);

    return candidates.length ? [candidates[0].question] : [];
}

// Exporting the predicate is useful to server and deterministic unit tests,
// while keeping the public selector as the normal integration point.
export function isPhotoCompletenessQuestion(value) {
    return photoCompletenessQuestion(value);
}

export function mergeClarifyingQuestions(...questionSets) {
    return sanitizeClarifyingQuestions(questionSets.flat(), 3);
}

export function buildHighImpactClarifyingQuestions({ query = '', foods = [], evidenceText = '', photo = false } = {}) {
    const context = normalizeText(`${query} ${evidenceText}`);
    const foodsText = normalizeText(combinedFoodText(foods));
    const questions = [];

    if (photo && RIB_PATTERN.test(`${foodsText} ${context}`)
        && !hasExplicitRibDetails(context)) {
        questions.push(ribDetailsQuestion());
    }

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

    const popcornCups = (Array.isArray(foods) ? foods : []).reduce((sum, food) => {
        const text = normalizeText(`${food?.name || ''} ${food?.serving || ''}`);
        if (!/\bpop\s?corn\b/.test(text) || !/\bcups?\b/.test(text)) return sum;
        const quantity = Number(food?.quantity);
        return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
    }, 0);
    const popcornPreparationKnown = /\b(?:plain|air[-\s]?popped|oil[-\s]?popped|cooked\s+in\s+oil|buttered|movie[-\s]?theater|microwave)\b/.test(context);
    if (photo && popcornCups >= 3 && !popcornPreparationKnown) {
        questions.push({
            id: 'popcorn_preparation',
            question: 'Was the popcorn plain/air-popped, oil-popped, or buttered?',
            examples: ['Plain or air-popped', 'Oil-popped', 'Buttered', 'Not sure'],
            reason: 'For a plate this size, oil or butter can materially change the calorie total.',
            answerType: 'single-choice-or-voice',
            acceptsVoice: true,
            affectedFood: 'Popcorn',
            estimatedCalorieImpact: Math.max(100, Math.round(popcornCups * 30))
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
