import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';
import { anthropicConstants, getAnthropicApiKey, getFastClaudeModel } from './_lib/anthropic.js';
import { requireAiAccess } from './_lib/security.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

function toFiniteNumber(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/,/g, '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function clampAndRound(value, min = 0, max = 5000) {
    const num = toFiniteNumber(value, 0);
    const clamped = Math.min(Math.max(num, min), max);
    return Math.round(clamped);
}

function cleanText(value, fallback = '', maxLength = 140) {
    if (typeof value !== 'string') return fallback;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function sanitizeFoodMemoryHints(value) {
    const hints = Array.isArray(value) ? value : [];
    return hints.slice(0, 5).map((hint) => {
        if (!hint || typeof hint !== 'object') return null;
        const name = cleanText(hint.name, '', 100);
        const calories = clampAndRound(hint.calories, 0, 5000);
        if (!name || !calories) return null;

        const carbs = clampAndRound(hint.carbs, 0, 1000);
        const fiber = clampAndRound(hint.fiber, 0, 500);
        const netCarbs = hint.netCarbs === undefined || hint.netCarbs === null
            ? Math.max(0, carbs - fiber)
            : clampAndRound(hint.netCarbs, 0, 1000);

        return {
            name,
            restaurant: cleanText(hint.restaurant || '', '', 80) || null,
            serving: cleanText(hint.serving, '1 serving', 100),
            calories,
            protein: clampAndRound(hint.protein, 0, 1000),
            carbs,
            fiber,
            netCarbs,
            fat: clampAndRound(hint.fat, 0, 1000),
            sugar: clampAndRound(hint.sugar, 0, 1000),
            source: cleanText(hint.source, 'Saved user food memory', 120),
            aliases: Array.isArray(hint.aliases)
                ? hint.aliases.map((alias) => cleanText(alias, '', 80)).filter(Boolean).slice(0, 6)
                : []
        };
    }).filter(Boolean);
}

function formatFoodMemoryHints(hints) {
    return hints.map((hint, index) => {
        const title = [hint.restaurant, hint.name].filter(Boolean).join(' ');
        const aliases = hint.aliases.length ? `; aliases ${hint.aliases.join(', ')}` : '';
        return `${index + 1}. ${title}; serving ${hint.serving}; per unit ${hint.calories} cal, P ${hint.protein}g, C ${hint.carbs}g, fiber ${hint.fiber}g, net ${hint.netCarbs}g, F ${hint.fat}g, sugar ${hint.sugar}g; source ${hint.source}${aliases}`;
    }).join('\n');
}

function sanitizeLocationContext(value) {
    if (!value || typeof value !== 'object') return null;
    const latitude = toFiniteNumber(value.latitude, NaN);
    const longitude = toFiniteNumber(value.longitude, NaN);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return {
        latitude: Math.round(latitude * 1000) / 1000,
        longitude: Math.round(longitude * 1000) / 1000,
        accuracyMeters: Math.max(0, Math.min(10000, Math.round(toFiniteNumber(value.accuracyMeters, 0))))
    };
}

function normalizeConfidence(value) {
    const normalized = String(value || '').toLowerCase().trim();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
        return normalized;
    }
    return 'medium';
}

function hasExplicitSmallBreakfastSausageEvidence(text) {
    return /\b(small|mini|little|johnsonville|vermont\s+maple|maple\s+breakfast)\b/.test(cleanText(text || '', '', 320).toLowerCase());
}

function hasLargeSausageEvidence(text) {
    return /\b(large|big|huge|thick|full[-\s]?size|regular|bratwurst|brat|italian|dinner|grilled|charred|browned)\b/.test(cleanText(text || '', '', 320).toLowerCase());
}

function normalizeSmallBreakfastSausageNutrition(food) {
    const text = cleanText(`${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''}`, '', 260).toLowerCase();
    const isSmallBreakfastLinks = /\b(?:small|mini|little)\s+(?:breakfast\s+)?sausage\s+links?\b/.test(text)
        || /\bjohnsonville\b/.test(text) && /\b(vermont\s+maple|breakfast|links?)\b/.test(text)
        || /\bvermont\s+maple\b/.test(text);
    const qty = toFiniteNumber(food?.quantity, 1);

    if (!isSmallBreakfastLinks || qty < 3 || toFiniteNumber(food?.calories, 0) < 100) {
        return food;
    }

    const servingText = /\bjohnsonville\b|\bvermont\s+maple\b/.test(text)
        ? '1 Johnsonville-style small breakfast link'
        : '1 small breakfast sausage link';

    return {
        ...food,
        calories: 57,
        protein: 3,
        carbs: 1,
        fiber: 0,
        netCarbs: 1,
        fat: 4,
        sugar: 0,
        serving: servingText,
        confidence: food.confidence === 'low' ? 'medium' : food.confidence,
        dataSource: 'Small breakfast sausage link normalization; 3 links roughly 150-170 calories'
    };
}

function normalizeLargeSausageNutrition(food) {
    const text = cleanText(`${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''}`, '', 320).toLowerCase();
    if (!/\bsausage\s+links?\b|\bbratwurst\b|\bbrat\b|\bitalian\s+sausage\b/.test(text)) return food;
    if (hasExplicitSmallBreakfastSausageEvidence(text)) return food;

    const qty = toFiniteNumber(food?.quantity, 1);
    const shouldNormalizeLarge = hasLargeSausageEvidence(text)
        || (qty > 0 && qty <= 2 && toFiniteNumber(food?.calories, 0) <= 180);
    if (!shouldNormalizeLarge) return food;

    return {
        ...food,
        name: 'Large Sausage Link',
        calories: 225,
        protein: 10,
        carbs: 2,
        fiber: 0,
        netCarbs: 2,
        fat: 20,
        sugar: 1,
        serving: '1 large link (about 70g)',
        confidence: food.confidence === 'high' ? 'medium' : normalizeConfidence(food.confidence),
        dataSource: 'Large sausage link normalization; USDA bratwurst/large cooked link estimate'
    };
}

function extractPopcornCupCount(text) {
    const normalized = cleanText(text || '', '', 420).toLowerCase();
    const digitMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:cups?|c)\b/);
    if (digitMatch) return Math.max(0.25, Math.min(30, toFiniteNumber(digitMatch[1], 0)));

    const wordNumbers = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
    };
    const wordMatch = normalized.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:cups?|c)\b/);
    if (wordMatch) return wordNumbers[wordMatch[1]] || 0;

    return 0;
}

function normalizePopcornNutrition(food, contextText = '') {
    const combined = cleanText(
        `${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''} ${contextText || ''}`,
        '',
        520
    ).toLowerCase();
    if (!/\bpop\s?corn\b/.test(combined)) return food;

    const cups = extractPopcornCupCount(combined) || 1;
    const currentCalories = toFiniteNumber(food?.calories, 0);
    const minCalories = Math.round(31 * cups * 0.9);
    const maxCalories = Math.round(65 * cups);
    const calories = currentCalories >= minCalories && currentCalories <= maxCalories
        ? Math.round(currentCalories)
        : Math.round(31 * cups);

    const protein = Math.max(1, Math.round(1 * cups));
    const carbs = Math.max(1, Math.round(6.2 * cups));
    const fiber = Math.max(1, Math.round(1.2 * cups));
    const fat = Math.max(0, Math.round((calories - (protein * 4) - (carbs * 4)) / 9));
    const sugar = Math.max(0, Math.min(Math.round(cups), clampAndRound(food?.sugar || 0, 0, 300)));
    const originalName = cleanText(food?.name || '', '', 120);
    const name = /\bpop\s?corn\b/i.test(originalName) ? originalName : 'Mixed Popcorn';

    return {
        ...food,
        name,
        calories,
        protein,
        carbs,
        fiber,
        netCarbs: Math.max(0, carbs - fiber),
        fat,
        sugar,
        serving: cups === 1 ? '1 cup popped' : `${cups} cups popped`,
        quantity: 1,
        confidence: food?.confidence === 'high' ? 'medium' : normalizeConfidence(food?.confidence),
        dataSource: cleanText(
            `${food?.dataSource || 'Photo estimate'}; popcorn normalized using USDA cup-based values`,
            'Photo estimate; popcorn normalized using USDA cup-based values',
            180
        )
    };
}

export function calculateTotals(foods) {
    return foods.reduce((totals, food) => {
        const qty = toFiniteNumber(food.quantity, 1);
        const carbs = toFiniteNumber(food.carbs, 0);
        const fiber = toFiniteNumber(food.fiber, 0);
        const explicitNetCarbs = toFiniteNumber(food.netCarbs, NaN);
        const netCarbs = Number.isFinite(explicitNetCarbs)
            ? explicitNetCarbs
            : Math.max(0, carbs - fiber);

        totals.calories += Math.round(toFiniteNumber(food.calories, 0) * qty);
        totals.protein += Math.round(toFiniteNumber(food.protein, 0) * qty);
        totals.carbs += Math.round(carbs * qty);
        totals.fiber += Math.round(fiber * qty);
        totals.netCarbs += Math.round(netCarbs * qty);
        totals.fat += Math.round(toFiniteNumber(food.fat, 0) * qty);
        totals.sugar += Math.round((food.sugar || 0) * qty);
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0, sugar: 0 });
}

function extractTextFromClaudeResponse(data) {
    const parts = Array.isArray(data?.content) ? data.content : [];
    return parts
        .filter((part) => part?.type === 'text' && typeof part?.text === 'string')
        .map((part) => part.text.trim())
        .filter(Boolean)
        .join('\n');
}

function parseVisionPayload(text) {
    const cleaned = String(text || '')
        .replace(/```json/gi, '```')
        .replace(/```/g, '')
        .trim();

    if (!cleaned) return { foods: [], notes: '' };

    const candidates = [];
    candidates.push(cleaned);

    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
        candidates.push(cleaned.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
        candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
    }

    for (const candidate of [...new Set(candidates)]) {
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) {
                return { foods: parsed, notes: '' };
            }
            if (parsed && Array.isArray(parsed.foods)) {
                return parsed;
            }
            if (parsed && parsed.error) {
                return { error: true, message: parsed.message || 'Could not identify food.' };
            }
            if (parsed && typeof parsed === 'object' && parsed.name) {
                return { foods: [parsed] };
            }
        } catch {
            // Try next candidate
        }
    }

    return { foods: [], notes: '' };
}

export function sanitizeVisionFoods(rawFoods, contextText = '') {
    return (Array.isArray(rawFoods) ? rawFoods : []).map((food, index) => {
        const quantity = Math.max(0.25, Math.min(20, toFiniteNumber(food?.quantity, 1)));
        const dataSource = cleanText(food?.dataSource || food?.source, 'AI estimate', 180);
        const restaurant = cleanText(food?.restaurant, '', 80) || null;

        const carbs = clampAndRound(food?.carbs, 0, 700);
        const fiber = clampAndRound(food?.fiber || 0, 0, 300);
        const explicitNetCarbs = toFiniteNumber(food?.netCarbs, NaN);

        const sanitized = {
            name: cleanText(food?.name, `Food item ${index + 1}`, 120),
            calories: clampAndRound(food?.calories, 0, 5000),
            protein: clampAndRound(food?.protein, 0, 500),
            carbs,
            fiber,
            netCarbs: clampAndRound(Number.isFinite(explicitNetCarbs) ? explicitNetCarbs : Math.max(0, carbs - fiber), 0, 700),
            fat: clampAndRound(food?.fat, 0, 300),
            sugar: clampAndRound(food?.sugar || 0, 0, 300),
            serving: cleanText(food?.serving, '1 serving', 100),
            quantity,
            confidence: normalizeConfidence(food?.confidence),
            restaurant,
            dataSource,
            source: 'photo-ai'
        };
        return normalizePopcornNutrition(
            normalizeLargeSausageNutrition(normalizeSmallBreakfastSausageNutrition(sanitized)),
            contextText
        );
    }).filter((food) => (
        food.name &&
        (food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fiber > 0 || food.fat > 0 || food.sugar > 0)
    ));
}

function sanitizeVisibleNutritionLabel(rawLabel) {
    if (!rawLabel || typeof rawLabel !== 'object') return null;
    const hasNutritionFacts = rawLabel.hasNutritionFacts === true
        || rawLabel.present === true
        || rawLabel.detected === true
        || /true|yes|visible|readable/i.test(String(rawLabel.hasNutritionFacts || rawLabel.present || rawLabel.detected || ''));

    const optionalNumber = (value, max) => (
        value === undefined || value === null || value === '' ? null : clampAndRound(value, 0, max)
    );
    const calories = optionalNumber(rawLabel.calories, 5000);
    const protein = optionalNumber(rawLabel.protein, 500);
    const carbs = optionalNumber(rawLabel.carbs ?? rawLabel.totalCarbs ?? rawLabel.totalCarbohydrate, 700);
    const fiber = optionalNumber(rawLabel.fiber ?? rawLabel.dietaryFiber, 300);
    const explicitNetCarbs = optionalNumber(rawLabel.netCarbs, 700);
    const fat = optionalNumber(rawLabel.fat ?? rawLabel.totalFat, 300);
    const sugar = optionalNumber(rawLabel.sugar ?? rawLabel.totalSugars ?? rawLabel.sugars, 300);
    const usableNutrition = calories !== null && calories > 0;

    if (!hasNutritionFacts || !usableNutrition) return null;

    return {
        hasNutritionFacts: true,
        product: cleanText(rawLabel.product || rawLabel.productName || rawLabel.name, '', 120),
        brand: cleanText(rawLabel.brand || rawLabel.restaurant, '', 80),
        servingSize: cleanText(rawLabel.servingSize || rawLabel.serving, '1 serving', 120),
        servingsPerContainer: toFiniteNumber(rawLabel.servingsPerContainer ?? rawLabel.containerServings, 0),
        calories,
        protein,
        carbs,
        fiber,
        netCarbs: explicitNetCarbs !== null
            ? explicitNetCarbs
            : (carbs !== null && fiber !== null ? Math.max(0, carbs - fiber) : null),
        fat,
        sugar,
        rawText: cleanText(rawLabel.rawText || rawLabel.ocrText || rawLabel.visibleText, '', 320)
    };
}

function visibleLabelImpliesWholePackage(label, imageContext = '', parsedPayload = {}) {
    const context = [
        imageContext,
        parsedPayload?.notes,
        parsedPayload?.lookupQuery
    ].filter(Boolean).join(' ').toLowerCase();
    return /\b(?:whole|full|entire|all)\s+(?:package|container|bag|box|carton|bottle|can|item)\b/.test(context)
        || /\b(?:whole|full|entire|all)\s+(?:thing|food|meal)\b/.test(context);
}

export function applyVisibleNutritionLabel(foods, rawLabel, imageContext = '', parsedPayload = {}) {
    const label = sanitizeVisibleNutritionLabel(rawLabel);
    if (!label) return foods;

    const baseFoods = Array.isArray(foods) && foods.length ? foods : [{
        name: label.product || 'Packaged food',
        serving: label.servingSize,
        quantity: 1,
        confidence: 'medium',
        restaurant: label.brand || null,
        dataSource: 'Visible Nutrition Facts label'
    }];

    const targetIndex = Math.max(0, baseFoods.findIndex((food) => {
        const combined = `${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''}`.toLowerCase();
        return /\b(package|label|nutrition facts|serving size|pizza|muffin|shake|bar|container|cup|cottage|cheese)\b/.test(combined);
    }));

    const servingsPerContainer = Math.max(0, Math.min(100, label.servingsPerContainer || 0));
    const wholePackageQty = servingsPerContainer > 1 && visibleLabelImpliesWholePackage(label, imageContext, parsedPayload)
        ? servingsPerContainer
        : null;

    return baseFoods.map((food, index) => {
        if (index !== targetIndex) return food;
        const productName = cleanText([label.brand, label.product].filter(Boolean).join(' '), '', 140)
            || label.product
            || food.name;

        return {
            ...food,
            name: cleanText(productName, food.name || 'Packaged food', 140),
            calories: label.calories,
            ...(label.protein !== null ? { protein: label.protein } : {}),
            ...(label.carbs !== null ? { carbs: label.carbs } : {}),
            ...(label.fiber !== null ? { fiber: label.fiber } : {}),
            ...(label.netCarbs !== null ? { netCarbs: label.netCarbs } : {}),
            ...(label.fat !== null ? { fat: label.fat } : {}),
            ...(label.sugar !== null ? { sugar: label.sugar } : {}),
            serving: label.servingSize || food.serving || '1 serving',
            quantity: wholePackageQty || toFiniteNumber(food?.quantity, 1),
            confidence: 'high',
            restaurant: label.brand || food.restaurant || null,
            dataSource: cleanText(
                `Visible Nutrition Facts label${label.rawText ? `; OCR: ${label.rawText}` : ''}`,
                'Visible Nutrition Facts label',
                260
            ),
            sourceType: 'label',
            labelExtracted: true,
            visibleLabel: label
        };
    });
}

const preparedFoodComponentRules = [
    {
        parent: /\bpizza\b/i,
        component: /\b(sauce|tomato sauce|mozzarella|cheese|basil|crust|dough|pepperoni|topping|toppings)\b/i,
    },
    {
        parent: /\b(burger|hamburger|cheeseburger|sandwich)\b/i,
        component: /\b(bun|patty|lettuce|tomato|onion|pickle|pickles|cheese|mayo|mayonnaise|ketchup|mustard|sauce)\b/i,
    },
    {
        parent: /\b(taco|burrito|wrap|quesadilla)\b/i,
        component: /\b(tortilla|cheese|salsa|lettuce|beans|rice|guacamole|sour cream|meat filling)\b/i,
    },
];

function removePreparedFoodComponents(foods) {
    if (!Array.isArray(foods) || foods.length < 2) return foods;

    const activeRules = preparedFoodComponentRules.filter((rule) => foods.some((food) => rule.parent.test(food.name)));
    if (!activeRules.length) return foods;

    const filtered = foods.filter((food) => {
        const name = cleanText(food?.name, '', 120);
        if (!name) return false;

        return !activeRules.some((rule) => rule.component.test(name) && !rule.parent.test(name));
    });

    return filtered.length ? filtered : foods;
}

function deriveOverallConfidence(foods, explicitConfidence) {
    if (explicitConfidence) return normalizeConfidence(explicitConfidence);
    if (!foods.length) return 'low';
    if (foods.every((food) => food.confidence === 'high')) return 'high';
    if (foods.some((food) => food.confidence === 'low')) return 'low';
    return 'medium';
}

export function deriveRestaurant(parsedPayload, foods) {
    const explicit = cleanText(parsedPayload?.restaurantIdentified || '', '', 80);
    if (explicit) return explicit;

    for (const food of foods) {
        if (food.restaurant) return food.restaurant;
    }

    return null;
}

function looksChickenPieceFood(name) {
    const text = cleanText(name, '', 120).toLowerCase();
    return /\b(nugget|nuggets|tender|tenders|wing|wings|chicken)\b/.test(text);
}

function looksFriesFood(name) {
    const text = cleanText(name, '', 120).toLowerCase();
    return /\b(fries|french fries|crinkle|waffle fries)\b/.test(text);
}

function looksBreakfastSausageLinks(food) {
    const text = cleanText(`${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''}`, '', 260).toLowerCase();
    return /\b(?:small|mini|little)\s+(?:breakfast\s+)?sausage\s+links?\b/.test(text)
        || /\bjohnsonville\b/.test(text) && /\b(vermont\s+maple|breakfast|links?)\b/.test(text)
        || /\bvermont\s+maple\b/.test(text);
}

function looksSausageLinks(food) {
    const text = cleanText(`${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''}`, '', 260).toLowerCase();
    return /\bsausage\s+links?\b|\bbratwurst\b|\bbrat\b|\bitalian\s+sausage\b/.test(text);
}

function inferFoodCount(food, fallback = 1) {
    const text = cleanText(`${food?.name || ''} ${food?.serving || ''}`, '', 180).toLowerCase();
    const countMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:small\s+)?(?:breakfast\s+)?(?:sausage\s+)?links?\b/)
        || text.match(/^\s*(\d+(?:\.\d+)?)\s*x\b/);
    if (countMatch) return toFiniteNumber(countMatch[1], fallback);

    const quantity = toFiniteNumber(food?.quantity, NaN);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : fallback;
}

function existingHasExplicitNutritionFacts(existing) {
    return /\b\d+(?:\.\d+)?\s*(?:cal|cals|calorie|calories|kcal|g|grams?)\b/i.test(existing)
        || /\b(?:net\s+carbs?|carbs?|fiber|fibre|protein|fat|sugar)\b/i.test(existing);
}

const knownBrandOrRestaurantHintPattern = /\b(?:mcdonald'?s?|chick[-\s]?fil[-\s]?a|taco\s+bell|wendy'?s?|burger\s+king|subway|chipotle|panda\s+express|panera|domino'?s?|pizza\s+hut|papa\s+john'?s?|little\s+caesars?|quest|kirkland|costco|johnsonville|trolli|fairlife|daisy)\b/i;
const visibleNutritionLabelPattern = /\b(?:nutrition\s+facts|serving\s+size|amount\s+per\s+serving|calories\s+per\s+serving|dietary\s+fiber|total\s+carb|total\s+carbohydrate|total\s+fat|saturated\s+fat|added\s+sugars?|sodium)\b/i;
const nutritionLabelSourcePattern = /\b(?:nutrition\s+facts?|nutrition\s+label|package\s+label|visible\s+label|label\s+text|ocr|amount\s+per\s+serving)\b/i;

function servingLooksLikePackageLabel(value) {
    return /\b(?:container|package|packet|pouch|carton|cup|bottle|can|bar|serving\s+size|\d+(?:\.\d+)?\s*(?:g|gram|grams|ml|oz)|1\s*\/\s*\d+)\b/i.test(cleanText(value || '', '', 120));
}

export function shouldUseVisionNutritionWithoutParser(foods, parsedPayload = {}, rawVisionText = '') {
    const payloadText = [
        parsedPayload?.notes,
        parsedPayload?.lookupQuery,
        parsedPayload?.restaurantIdentified,
        rawVisionText
    ].filter(Boolean).join(' ');

    if (visibleNutritionLabelPattern.test(payloadText)) {
        return true;
    }

    return (Array.isArray(foods) ? foods : []).some((food) => {
        const combined = `${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''} ${food?.source || ''}`;
        const hasLabelSignal = nutritionLabelSourcePattern.test(combined) || servingLooksLikePackageLabel(food?.serving);
        const hasUsableNutrition = toFiniteNumber(food?.calories, 0) > 0
            && toFiniteNumber(food?.protein, 0) >= 0
            && toFiniteNumber(food?.carbs, 0) >= 0
            && toFiniteNumber(food?.fat, 0) >= 0;
        return hasLabelSignal && hasUsableNutrition;
    });
}

function contextLooksSpecificEnoughForLookup(value) {
    const text = cleanText(value || '', '', 220);
    if (!text) return false;
    if (existingHasExplicitNutritionFacts(text)) return true;
    return knownBrandOrRestaurantHintPattern.test(text);
}

export function shouldPreferHintLookupBeforeVision(imageContext, imageContextAlternatives = []) {
    const contexts = [
        cleanText(imageContext || '', '', 220),
        ...normalizeContextAlternatives(imageContextAlternatives)
    ].filter(Boolean);

    return contexts.some(contextLooksSpecificEnoughForLookup);
}

function buildStructuredPhotoContext(details) {
    if (!details || typeof details !== 'object') return '';
    const labels = {
        'nutrition-label-visible': 'Nutrition Facts label is visible',
        'front-package-visible': 'front package or product branding is visible',
        'plate-only': 'plate-only photo with no visible package label',
        'restaurant-menu-item': 'restaurant or menu item'
    };
    const portions = {
        'whole-item': 'whole item or full package was eaten',
        'visible-portion': 'only the visible portion was eaten',
        'single-serving': 'one serving was eaten',
        'label-serving': 'use the label serving size',
        'multiple-servings': 'multiple servings were eaten',
        'not-sure': 'portion size is uncertain'
    };

    return [
        details.brand ? `Brand/restaurant/product: ${cleanText(details.brand, '', 90)}` : '',
        details.barcode ? `Barcode/UPC: ${cleanText(details.barcode, '', 24)}` : '',
        details.labelVisibility ? `Photo type: ${labels[details.labelVisibility] || cleanText(details.labelVisibility, '', 80)}` : '',
        details.portionMode ? `Portion eaten: ${portions[details.portionMode] || cleanText(details.portionMode, '', 80)}` : '',
        details.portionDetail ? `Portion detail: ${cleanText(details.portionDetail, '', 120)}` : '',
        details.note ? `User note: ${cleanText(details.note, '', 180)}` : ''
    ].filter(Boolean).join('; ');
}

function extractFractionalPizzaServingDenominator(value) {
    const text = cleanText(value || '', '', 260).toLowerCase();
    const numeric = text.match(/\b1\s*\/\s*(2|3|4|5|6|8)\s*(?:of\s+(?:a|the)\s+)?(?:pizza|pie)\b/);
    if (numeric) return toFiniteNumber(numeric[1], 0);

    if (/\bhalf\s+(?:pizza|pie)\b/.test(text)) return 2;
    if (/\bthird\s+(?:pizza|pie)\b/.test(text)) return 3;
    if (/\bquarter\s+(?:pizza|pie)\b/.test(text)) return 4;

    return 0;
}

function contextImpliesWholePizza(value) {
    return /\b(?:whole|full|entire|all)\s+(?:pizza|pie)\b/i.test(cleanText(value || '', '', 260));
}

export function applyPackagedServingMath(foods, imageContext = '', parsedPayload = {}) {
    if (!Array.isArray(foods) || !foods.length) return [];

    const globalContext = [
        imageContext,
        parsedPayload?.notes,
        parsedPayload?.lookupQuery
    ].filter(Boolean).join(' ');

    return foods.map((food) => {
        const combined = `${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''}`;
        if (!/\bpizza\b/i.test(combined)) return food;

        const denominator = extractFractionalPizzaServingDenominator(combined);
        if (!denominator) return food;

        const quantity = toFiniteNumber(food?.quantity, 1);
        const alreadyWholeQuantity = quantity >= denominator;
        const looksWhole = alreadyWholeQuantity
            || contextImpliesWholePizza(combined)
            || contextImpliesWholePizza(globalContext);

        if (!looksWhole || alreadyWholeQuantity) return food;

        return {
            ...food,
            quantity: denominator,
            serving: cleanText(food.serving, `1/${denominator} pizza`, 100),
            confidence: food.confidence === 'low' ? 'medium' : food.confidence,
            dataSource: cleanText(
                `${food.dataSource || 'Package nutrition label'}; scaled ${denominator} label servings for whole pizza`,
                'Package nutrition label; scaled to whole pizza',
                180
            )
        };
    });
}

function derivePreparedFoodLookupQuery(foods, currentLookupQuery = '') {
    const existing = cleanText(currentLookupQuery || '', '', 160).toLowerCase();
    const combinedFoodText = (Array.isArray(foods) ? foods : [])
        .map((food) => `${food?.name || ''} ${food?.serving || ''} ${food?.dataSource || ''}`)
        .join(' ')
        .toLowerCase();

    if (/\b(trolli|trolley|trolly|troli|sour\s+brite|sour\s+bright)\b/.test(combinedFoodText)) {
        return 'Trolli Sour Brite Eggs';
    }

    const sausageLinkFood = (Array.isArray(foods) ? foods : []).find((food) => looksSausageLinks(food));
    if (sausageLinkFood) {
        const count = Math.max(1, Math.round(inferFoodCount(sausageLinkFood, 1)));
        if (/\bjohnsonville\b/.test(combinedFoodText) || /\bvermont\s+maple\b/.test(combinedFoodText)) {
            return `${count} Johnsonville Vermont Maple Syrup breakfast sausage links`;
        }
        if (looksBreakfastSausageLinks(sausageLinkFood) && (count >= 3 || hasExplicitSmallBreakfastSausageEvidence(combinedFoodText))) {
            return `${count} small breakfast sausage links`;
        }
        if (hasLargeSausageEvidence(combinedFoodText) || count <= 2) {
            return `${count} large sausage links`;
        }
        return `${count} sausage links`;
    }

    const pizza = (Array.isArray(foods) ? foods : []).find((food) => /\bpizza\b/i.test(food?.name));
    if (pizza) {
        const pizzaText = `${pizza.name || ''} ${pizza.serving || ''}`.toLowerCase();
        const pizzaContext = `${pizzaText} ${existing} ${combinedFoodText}`;
        const fractionalPizzaDenominator = extractFractionalPizzaServingDenominator(pizzaContext);
        const isWhole = /\b(whole|entire|full|10\s?-?\s?12|12\s?(inch|in)|personal)\b/.test(pizzaText)
            || (fractionalPizzaDenominator > 0 && toFiniteNumber(pizza.quantity, 1) >= fractionalPizzaDenominator)
            || (fractionalPizzaDenominator === 0 && !/\b(slice|slices)\b/.test(pizzaText) && toFiniteNumber(pizza.quantity, 1) <= 1);

        if (/\bquest\b/.test(pizzaContext) && /\bpizza\b/.test(pizzaContext)) {
            if (/\bsupreme\b/.test(pizzaContext)) {
                return isWhole ? 'Quest Supreme whole pizza' : 'Quest Supreme pizza';
            }
            return isWhole ? 'Quest whole pizza' : 'Quest pizza';
        }
        if (/\b(kirkland|costco)\b/.test(pizzaContext) && /\bcauliflower\b/.test(pizzaContext) && /\bpizza\b/.test(pizzaContext)) {
            return isWhole
                ? 'Kirkland Signature Supreme Cauliflower Crust Pizza whole pizza'
                : 'Kirkland Signature Supreme Cauliflower Crust Pizza';
        }
        if (isWhole && /\b(margherita|neapolitan)\b/.test(pizzaText)) {
            return 'margherita pizza whole';
        }
        if (isWhole) {
            return 'whole pizza';
        }
        if (/\b(slice|slices)\b/.test(pizzaText) || toFiniteNumber(pizza.quantity, 1) >= 1) {
            return existing || 'pizza slice';
        }
    }

    return '';
}

function inferRestaurantFromFileName(fileNameHint) {
    const base = cleanText(fileNameHint || '', '', 140)
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/[_-]+/g, ' ');
    if (!base) return '';

    const words = base
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9]/gi, ''))
        .filter((word) => word.length >= 2)
        .slice(0, 4);

    if (words.length < 2) return '';
    return words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export function deriveHeuristicLookupQuery(foods, restaurantIdentified, currentLookupQuery, fileNameHint = '') {
    const existing = cleanText(currentLookupQuery || '', '', 160);
    const lowerExisting = existing.toLowerCase();
    if (existing && existingHasExplicitNutritionFacts(existing)) return existing;

    const hasExplicitNuggetMeal = /\bnugget\b/.test(lowerExisting) && /\bmeal\b/.test(lowerExisting);
    if (hasExplicitNuggetMeal) return existing;

    const preparedLookup = derivePreparedFoodLookupQuery(foods, existing);
    if (preparedLookup && (!existing || /\bpizza\b/.test(lowerExisting))) {
        return preparedLookup;
    }

    const restaurant = cleanText(restaurantIdentified || '', '', 80) || inferRestaurantFromFileName(fileNameHint);
    if (!restaurant) return existing || '';

    const chickenFood = (Array.isArray(foods) ? foods : []).find((food) => looksChickenPieceFood(food?.name));
    const hasFries = (Array.isArray(foods) ? foods : []).some((food) => looksFriesFood(food?.name));
    if (!chickenFood) return existing || '';

    const qty = Math.max(1, Math.round(toFiniteNumber(chickenFood.quantity, 1)));
    const estimatedMealCalories = (Array.isArray(foods) ? foods : []).reduce((sum, food) => {
        const itemCalories = toFiniteNumber(food?.calories, 0);
        const itemQty = toFiniteNumber(food?.quantity, 1);
        return sum + (itemCalories * itemQty);
    }, 0);
    let bucket = qty;
    if (hasFries && qty >= 6 && estimatedMealCalories >= 1600) bucket = 15;
    else if (qty >= 11) bucket = 15;
    else if (qty >= 8) bucket = 10;
    else if (qty >= 4) bucket = 5;

    const heuristic = `${restaurant} ${bucket} nugget${bucket === 1 ? '' : 's'}${hasFries ? ' meal' : ''}`.trim();
    if (!existing) return heuristic;

    if (/\b(tenders?|wings?)\b/.test(lowerExisting) && hasFries) {
        return heuristic;
    }

    return existing;
}

export function deriveHintLookupQuery(imageContext, fileNameHint = '') {
    const context = cleanText(imageContext || '', '', 160)
        .replace(/\s*\|\s*(?:photo type|portion eaten|portion detail|user note)\s*:.*$/i, '')
        .replace(/\s*[;|]\s*(?:estimate|analy[sz]e|calculate|identify|find|look up|use|treat|do not|don't)\b.*$/i, '')
        .replace(/\s*,\s*(?:not|rather than|instead of)\b.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    const foodWordPattern = /\b(meal|combo|nugget|nuggets|tender|tenders|wing|wings|burger|cheeseburger|sandwich|sub|pizza|taco|burrito|fries|drink|chicken|beef|roast|bowl|rice|beans|soup|salad|pasta|alfredo|donut|blizzard|frappuccino|coffee|popcorn|pop\s+corn|sausage|links?|muffins?|pancakes?|steak|cottage\s+cheese)\b/;

    if (context) {
        const lower = context.toLowerCase();
        const hasFoodWords = foodWordPattern.test(lower);
        const hasSpecificPhrase = lower.split(/\s+/).filter(Boolean).length >= 2;
        if (hasFoodWords || hasSpecificPhrase) return context;
    }

    const fileNameFood = cleanText(fileNameHint || '', '', 160)
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b(official|image|photo|picture|test|case)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (fileNameFood && foodWordPattern.test(fileNameFood.toLowerCase())) {
        return fileNameFood;
    }

    const restaurant = inferRestaurantFromFileName(fileNameHint);
    if (!restaurant) return '';
    return `${restaurant} meal`;
}

function normalizeContextAlternatives(value) {
    const rawValues = Array.isArray(value) ? value : [];
    return Array.from(new Set(rawValues
        .map((item) => cleanText(item, '', 180))
        .filter(Boolean)
    )).slice(0, 8);
}

function extractStructuredContextLookupPieces(value) {
    const text = cleanText(value || '', '', 520);
    if (!text || !/:\s*/.test(text)) return [];

    const fields = {};
    const fieldPattern = /\b(Brand\/restaurant\/product|Brand\/restaurant|Photo type|Portion eaten|Portion detail|User note|note)\s*:\s*([^;|]+)/gi;
    let match;
    while ((match = fieldPattern.exec(text)) !== null) {
        const key = match[1].toLowerCase();
        const fieldValue = cleanText(match[2], '', 180);
        if (fieldValue) fields[key] = fieldValue;
    }

    const brand = fields['brand/restaurant/product'] || fields['brand/restaurant'] || '';
    const portionDetail = fields['portion detail'] || '';
    const note = fields['user note'] || fields.note || '';
    const portionEaten = fields['portion eaten'] || '';

    return Array.from(new Set([
        brand && portionDetail ? `${brand} ${portionDetail}` : '',
        portionDetail,
        brand && note ? `${brand} ${note}` : '',
        note,
        brand && portionEaten && !/not sure|uncertain/i.test(portionEaten) ? `${brand} ${portionEaten}` : ''
    ].filter(Boolean))).slice(0, 6);
}

export function deriveHintLookupQueries(imageContext, fileNameHint = '', imageContextAlternatives = []) {
    const contextCandidates = [
        cleanText(imageContext || '', '', 180),
        ...normalizeContextAlternatives(imageContextAlternatives)
    ].filter(Boolean);

    const queries = [];
    for (const candidate of contextCandidates) {
        for (const structuredPiece of extractStructuredContextLookupPieces(candidate)) {
            const query = deriveHintLookupQuery(structuredPiece, '');
            if (query) queries.push(query);
        }
        const query = deriveHintLookupQuery(candidate, '');
        if (query) queries.push(query);
    }

    const fileQuery = deriveHintLookupQuery('', fileNameHint);
    if (fileQuery) queries.push(fileQuery);

    return Array.from(new Set(queries)).slice(0, 8);
}

export function derivePostVisionLookupQueries({
    foods,
    restaurantIdentified,
    currentLookupQuery,
    fileNameHint = '',
    imageContext = '',
    imageContextAlternatives = []
} = {}) {
    const heuristicLookup = cleanText(
        deriveHeuristicLookupQuery(foods, restaurantIdentified, currentLookupQuery, fileNameHint),
        '',
        160
    );
    const hintLookups = deriveHintLookupQueries(imageContext, fileNameHint, imageContextAlternatives);
    const strongHintLookups = hintLookups.filter(contextLooksSpecificEnoughForLookup);
    const genericHintLookups = hintLookups.filter((query) => !contextLooksSpecificEnoughForLookup(query));

    return Array.from(new Set([
        ...strongHintLookups,
        heuristicLookup,
        ...genericHintLookups
    ].filter(Boolean))).slice(0, 8);
}

function buildParserBackedResponse(parserResult, source, lookupQuery, notes = '') {
    return {
        success: true,
        foods: parserResult.foods,
        totalCalories: toFiniteNumber(parserResult.totalCalories, 0),
        totalProtein: toFiniteNumber(parserResult.totalProtein, 0),
        totalCarbs: toFiniteNumber(parserResult.totalCarbs, 0),
        totalFiber: toFiniteNumber(parserResult.totalFiber, 0),
        totalNetCarbs: toFiniteNumber(parserResult.totalNetCarbs, 0),
        totalFat: toFiniteNumber(parserResult.totalFat, 0),
        totalSugar: toFiniteNumber(parserResult.totalSugar, 0),
        overallConfidence: normalizeConfidence(parserResult.overallConfidence),
        restaurantIdentified: parserResult.foods.find((food) => food?.restaurant)?.restaurant || null,
        notes: cleanText(notes || parserResult.notes || '', '', 280) || null,
        lookupQuery: lookupQuery || null,
        clarifyingQuestions: Array.isArray(parserResult?.clarifyingQuestions) ? parserResult.clarifyingQuestions : [],
        source
    };
}

function deriveBaseUrl(req) {
    const explicit = cleanText(process.env.APP_BASE_URL || '', '', 200);
    if (explicit && /^https?:\/\//i.test(explicit)) return explicit;

    const forwardedProto = cleanText(req?.headers?.['x-forwarded-proto'] || '', '', 10) || 'https';
    const forwardedHost = cleanText(String(req?.headers?.['x-forwarded-host'] || '').split(',')[0], '', 200);
    if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

    const host = cleanText(String(req?.headers?.host || '').split(',')[0], '', 200);
    if (host) return `${forwardedProto}://${host}`;

    const productionUrl = cleanText(process.env.VERCEL_PROJECT_PRODUCTION_URL || '', '', 200);
    if (productionUrl) return `https://${productionUrl}`;

    const vercelUrl = cleanText(process.env.VERCEL_URL || '', '', 200);
    if (vercelUrl) return `https://${vercelUrl}`;

    return 'https://fuelfire-app.vercel.app';
}

async function lookupViaFoodParser(baseUrl, query, memoryHints = [], locationContext = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.FUELFIRE_INTERNAL_API_TOKEN) {
        headers['X-FuelFire-Internal-Token'] = process.env.FUELFIRE_INTERNAL_API_TOKEN;
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/ai-food-parser`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            query,
            forceWebSearch: false,
            source: 'photo',
            foodMemoryHints: sanitizeFoodMemoryHints(memoryHints),
            locationContext: sanitizeLocationContext(locationContext)
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Food parser lookup failed (${response.status}): ${text.slice(0, 200)}`);
    }

    return response.json();
}

function scoreParserMatch(parserResult, lookupQuery) {
    const foods = Array.isArray(parserResult?.foods) ? parserResult.foods : [];
    const query = cleanText(lookupQuery || '', '', 220).toLowerCase();
    const foodText = foods
        .map((food) => `${food?.name || ''} ${food?.matchedItem || ''} ${food?.dataSource || ''} ${food?.source || ''}`)
        .join(' ')
        .toLowerCase();
    const ignoredTokens = new Set([
        'cal', 'cals', 'calorie', 'calories', 'kcal', 'gram', 'grams', 'carb', 'carbs',
        'protein', 'fat', 'fiber', 'fibre', 'sugar', 'net', 'whole', 'full', 'food',
        'meal', 'pizza', 'sandwich', 'burger', 'item', 'photo', 'picture'
    ]);
    const tokens = Array.from(new Set(query
        .replace(/[^a-z0-9'\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4 && !ignoredTokens.has(token))
    ));

    let score = 0;
    if (existingHasExplicitNutritionFacts(query)) score += 50;
    if (/\bnet\s*carbs?\b|\b\d+\s*net\b/.test(query)) score += 15;
    score += Math.min(20, tokens.length * 3);
    score += tokens.filter((token) => foodText.includes(token)).length * 10;
    if (/user-provided|dictated|explicit/i.test(`${parserResult?.source || ''} ${foodText}`)) score += 20;
    if (foods.some((food) => normalizeConfidence(food?.confidence) === 'high')) score += 5;
    return score;
}

async function lookupFirstParserMatch(baseUrl, lookupQueries, memoryHints = [], locationContext = null) {
    let bestMatch = null;

    for (const lookupQuery of lookupQueries) {
        try {
            const parserResult = await lookupViaFoodParser(baseUrl, lookupQuery, memoryHints, locationContext);
            if (parserResult?.success && Array.isArray(parserResult.foods) && parserResult.foods.length > 0) {
                const score = scoreParserMatch(parserResult, lookupQuery);
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { parserResult, lookupQuery, score };
                }
            }
        } catch (error) {
            console.warn(`Photo context lookup failed for "${lookupQuery}": ${error.message}`);
        }
    }
    return bestMatch;
}

async function callClaudeVision({ apiKey, image, mimeType, useWebSearch, contextHint = '', memoryHints = [], locationContext = null }) {
    const contextLine = contextHint
        ? `\nContext hints: ${contextHint}`
        : '\nContext hints: none';
    const sanitizedMemoryHints = sanitizeFoodMemoryHints(memoryHints);
    const memoryLine = sanitizedMemoryHints.length
        ? `\nSaved/product nutrition candidates:\n${formatFoodMemoryHints(sanitizedMemoryHints)}`
        : '\nSaved/product nutrition candidates: none';
    const sanitizedLocation = sanitizeLocationContext(locationContext);
    const locationLine = sanitizedLocation
        ? `\nOptional coarse foreground location: ${sanitizedLocation.latitude}, ${sanitizedLocation.longitude}. Use only to narrow a restaurant candidate, and never assume a restaurant or nutrition from coordinates alone.`
        : '';

    const prompt = `You are FuelFire's food vision nutrition engine.

Analyze the photo and identify every food and drink item visible.
${contextLine}
${memoryLine}
${locationLine}

Return ONLY valid JSON in this exact shape:
{
  "foods": [
    {
      "name": "food name",
      "quantity": 1,
      "serving": "serving description",
      "calories": 0,
	      "protein": 0,
	      "carbs": 0,
	      "fiber": 0,
	      "netCarbs": 0,
	      "fat": 0,
      "sugar": 0,
      "confidence": "high|medium|low",
      "restaurant": "restaurant name or null",
      "dataSource": "label text, official nutrition, USDA, or estimate"
    }
	  ],
	  "visibleLabel": {
	    "hasNutritionFacts": false,
	    "brand": null,
	    "product": null,
	    "servingSize": null,
	    "servingsPerContainer": null,
	    "calories": null,
	    "protein": null,
	    "carbs": null,
	    "fiber": null,
	    "netCarbs": null,
	    "fat": null,
	    "sugar": null,
	    "rawText": "short transcribed label lines when readable"
	  },
	  "lookupQuery": "short branded lookup query for text nutrition parser, or null",
	  "restaurantIdentified": "restaurant name or null",
	  "overallConfidence": "high|medium|low",
  "notes": "short description"
}

Rules:
- Include multiple distinct foods separately.
- For prepared foods such as pizza, burgers, sandwiches, tacos, burritos, and wraps, list the prepared item once. Do not list toppings, cheese, sauce, bun, tortilla, crust, herbs, or fillings as separate foods unless they are separate side items.
- Quantity is count consumed for that item.
- Calories/protein/carbs/fiber/netCarbs/fat/sugar must be PER ONE UNIT, not multiplied by quantity.
- Use carbs for total carbohydrates, fiber for dietary fiber, and netCarbs for carbs minus fiber. If a visible package advertises net carbs, preserve that explicit netCarbs value.
- Work in this order: first inspect any visible Nutrition Facts / package label text and fill visibleLabel, then use the visible food portion to infer how much was eaten, then use context hints for brand/product/restaurant clarification.
- Treat context hints as user-provided clues. If a hint gives exact calories, macros, serving size, brand, restaurant, or net carbs, use it to identify the item and preserve those explicit values unless the visible nutrition label clearly says otherwise.
- Use saved/product nutrition candidates only when they clearly match the visible food/context and do not conflict with visible label text, exact user notes, brand, size, or serving.
- If a saved or barcode/product candidate matches and no label contradicts it, preserve its per-unit macros and serving.
- If context hints include "Portion eaten" or "Portion detail", treat that as the user's consumed portion unless the photo clearly contradicts it.
- If context hints say "Nutrition Facts label is visible", make a serious OCR attempt before using any generic lookup. If the panel is not readable, say that in notes and return low/medium confidence.
- If context hints say "plate-only photo", do not invent a package label. Estimate from the visible portion and make the serving assumption explicit.
- If a context hint names a brand/product/restaurant, do not downgrade the item to a generic version.
- If a nutrition facts label is visible, prioritize the label over all other estimates. Transcribe the serving size and calories/macros exactly from the label when readable.
- visibleLabel must contain the readable label facts even if the food item estimate is uncertain. Use null for unreadable fields instead of guessing.
- If the label shows "1 serving per container" and "Serving size 1 container", set serving to "1 container" and quantity to 1. Do not change that to 1/2 cup, 1 slice, or a generic database serving.
- For visible nutrition labels, read the panel line-by-line and preserve the actual numbers even if they differ from common/generic food values. Example: a label with 160 calories, 5g fat, 15g carbs, 0g fiber, 11g sugar, and 14g protein must return those values, not a generic cottage cheese estimate.
- If a nutrition label uses a fractional item serving such as "1/4 pizza", "1/3 pizza", or "1/2 package", never rewrite it as a generic slice. Use the exact label serving.
- If the photo/context shows a whole pizza and the label says "Serving size 1/4 pizza", set calories/macros per 1/4 pizza and quantity 4. For "1/3 pizza", quantity 3. For "1/2 pizza", quantity 2.
- If the image is label-only and the eaten amount is not visible or stated, return the label serving with quantity 1 and low/medium confidence so the user can adjust servings.
- If the photo shows an entire prepared pizza/flatbread and no label is visible, do not default to a generic single slice. Estimate the whole visible pizza as one item, or set serving to the visible portion and quantity to the visible count only when the image clearly shows a single slice or partial leftovers.
- If the photo shows one loose slice on a plate, estimate one slice/visible portion only. Do not scale that to a whole pizza unless the context explicitly says whole/full/entire pizza.
- For packaged foods with visible branding, set lookupQuery to the exact brand + product name even if part of the package is cut off.
- If no visible label, use official values for branded/restaurant foods when possible, otherwise estimate carefully.
- For popcorn, estimate by popped cups. Plain air-popped popcorn is about 31 calories, 1g protein, 6g carbs, 1g+ fiber, and near 0g fat per cup. Buttered/oil-popped popcorn is commonly about 45-60 calories per cup. Do not use high protein or zero fiber for popcorn unless a visible label says so.
- For sausage links, classify size before estimating. Small breakfast links are short/thin and commonly about 150-170 calories per 3 links. Large/thick/full-size links, bratwurst, or Italian-style sausage are much larger and commonly about 200-250 calories per link. If the photo shows 1-2 thick browned links on a plate and no small-link package label, call them "Large Sausage Link", not "Breakfast Sausage Links".
- For small breakfast sausage links, do not price each link like a full-size sausage. Johnsonville/Vermont Maple-style small links are commonly about 150-170 calories per 3 links, so 6 small links should be about 300-340 calories unless a visible label says otherwise.
- Size-sensitive foods like sausage, steak, pancakes, muffins, popcorn, pizza, rice, pasta, fries, dressing, sauces, oil, and butter must include the assumed serving/size in serving or dataSource. If size is unclear, confidence must be "low" or "medium", not "high".
- If restaurant/menu item can be inferred from branding, packaging, visible text, or context hints, set lookupQuery to a short text query with restaurant + likely item + estimated count.
- For nugget/tender basket meals, estimate piece count carefully and include the estimated count in lookupQuery.
- If no reliable branded clue exists, set lookupQuery to null.
- If no food is visible, return {"foods":[],"overallConfidence":"low","notes":"No food detected"}.
- No markdown, no prose outside JSON.`;

    const requestBody = {
        model: getFastClaudeModel(),
        max_tokens: 900,
        temperature: 0,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType,
                            data: image,
                        },
                    },
                    {
                        type: 'text',
                        text: prompt
                    }
                ]
            }
        ]
    };

    if (useWebSearch) {
        requestBody.tools = [
            {
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 2
            }
        ];
    }

    const response = await fetch(anthropicConstants.ANTHROPIC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': anthropicConstants.ANTHROPIC_VERSION,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude vision API ${response.status}: ${errorText.slice(0, 500)}`);
    }

    return response.json();
}

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) {
        return;
    }
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['POST'])) {
        return;
    }

    if (!await requireAiAccess(req, res, { capability: 'ai_food' })) {
        return;
    }

    try {
        const body = req.body || {};
        const image = body.image;
        const mimeType = cleanText(body.mimeType, 'image/jpeg', 60);
        const preferWebSearch = body.forceWebSearch !== false;
        const preferHintLookupFirst = body.preferHintLookupFirst === true;
        const fileName = cleanText(body.fileName || '', '', 140);
        const rawImageContext = cleanText(body.imageContext || '', '', 360);
        const structuredPhotoContext = buildStructuredPhotoContext(body.photoContextDetails);
        const imageContext = cleanText(
            rawImageContext && structuredPhotoContext && rawImageContext.includes(structuredPhotoContext)
                ? rawImageContext
                : [rawImageContext, structuredPhotoContext].filter(Boolean).join(' | '),
            '',
            520
        );
        const imageContextAlternatives = normalizeContextAlternatives(body.imageContextAlternatives);
        const foodMemoryHints = sanitizeFoodMemoryHints(body.foodMemoryHints);
        const locationContext = sanitizeLocationContext(body.locationContext);
        const hintLookupQueries = deriveHintLookupQueries(imageContext, fileName, imageContextAlternatives);
        const hintLookupQuery = hintLookupQueries[0] || '';
        const contextHint = [
            fileName ? `file:${fileName}` : '',
            imageContext ? `note:${imageContext}` : '',
            ...imageContextAlternatives.map((alt, index) => `speech alternative ${index + 1}:${alt}`)
        ]
            .filter(Boolean)
            .join(' | ');
        const baseUrl = deriveBaseUrl(req);

        if (!image || typeof image !== 'string') {
            return res.status(400).json({ error: 'Image data required' });
        }

        if (preferHintLookupFirst && shouldPreferHintLookupBeforeVision(imageContext, imageContextAlternatives)) {
            console.log('Ignoring pre-vision hint lookup for photo flow; visible Nutrition Facts must be scanned first.');
        }

        const apiKey = getAnthropicApiKey();
        if (!apiKey) {
            return res.status(500).json({ error: 'Claude API key not configured' });
        }

        let usedWebSearch = false;
        let claudeResponse;
        let visionError = null;
        try {
            claudeResponse = await callClaudeVision({
                apiKey,
                image,
                mimeType,
                useWebSearch: false,
                contextHint,
                memoryHints: foodMemoryHints,
                locationContext
            });
        } catch (error) {
            visionError = error;
            if (preferWebSearch) {
                console.warn(`Vision baseline analysis failed, retrying with web search: ${error.message}`);
                try {
                    claudeResponse = await callClaudeVision({
                        apiKey,
                        image,
                        mimeType,
                        useWebSearch: true,
                        contextHint,
                        memoryHints: foodMemoryHints,
                        locationContext
                    });
                    usedWebSearch = true;
                    visionError = null;
                } catch (webSearchError) {
                    visionError = webSearchError;
                }
            } else {
                throw error;
            }
        }

        if (!claudeResponse && preferWebSearch && hintLookupQueries.length) {
            const hintMatch = await lookupFirstParserMatch(baseUrl, hintLookupQueries, foodMemoryHints, locationContext);
            if (hintMatch) {
                return res.status(200).json(buildParserBackedResponse(
                    hintMatch.parserResult,
                    'photo-hint-via-parser',
                    hintMatch.lookupQuery,
                    'Used text lookup fallback because image analysis was unavailable.'
                ));
            }
        }

        if (!claudeResponse) {
            throw visionError || new Error('Vision analysis unavailable');
        }

        let textContent = extractTextFromClaudeResponse(claudeResponse);
        let parsedPayload = parseVisionPayload(textContent);
        let popcornContext = [imageContext, parsedPayload?.notes, parsedPayload?.lookupQuery]
            .filter(Boolean)
            .join(' ');
        let foods = removePreparedFoodComponents(
            applyPackagedServingMath(
                applyVisibleNutritionLabel(sanitizeVisionFoods(parsedPayload.foods, popcornContext), parsedPayload.visibleLabel || parsedPayload.nutritionLabel, imageContext, parsedPayload),
                imageContext,
                parsedPayload
            )
        );

        if ((parsedPayload.error || !foods.length) && preferWebSearch && !usedWebSearch) {
            try {
                const webSearchResponse = await callClaudeVision({
                    apiKey,
                    image,
                    mimeType,
                    useWebSearch: true,
                    contextHint,
                    memoryHints: foodMemoryHints,
                    locationContext
                });
                usedWebSearch = true;
                textContent = extractTextFromClaudeResponse(webSearchResponse);
                parsedPayload = parseVisionPayload(textContent);
                popcornContext = [imageContext, parsedPayload?.notes, parsedPayload?.lookupQuery]
                    .filter(Boolean)
                    .join(' ');
                foods = removePreparedFoodComponents(
                    applyPackagedServingMath(
                        applyVisibleNutritionLabel(sanitizeVisionFoods(parsedPayload.foods, popcornContext), parsedPayload.visibleLabel || parsedPayload.nutritionLabel, imageContext, parsedPayload),
                        imageContext,
                        parsedPayload
                    )
                );
            } catch (webSearchError) {
                console.warn(`Vision web-search retry failed: ${webSearchError.message}`);
            }
        }

        if (parsedPayload.error) {
            if (preferWebSearch && hintLookupQueries.length) {
                const hintMatch = await lookupFirstParserMatch(baseUrl, hintLookupQueries, foodMemoryHints, locationContext);
                if (hintMatch) {
                    return res.status(200).json(buildParserBackedResponse(
                        hintMatch.parserResult,
                        'photo-hint-via-parser',
                        hintMatch.lookupQuery,
                        parsedPayload.message || 'Used text lookup fallback after low-confidence image analysis.'
                    ));
                }
            }
            return res.status(200).json({
                success: false,
                error: parsedPayload.message || 'Could not identify food in the image',
                suggestion: 'Try taking a clearer photo with better lighting'
            });
        }

        if (!foods.length) {
            if (preferWebSearch && hintLookupQueries.length) {
                const hintMatch = await lookupFirstParserMatch(baseUrl, hintLookupQueries, foodMemoryHints, locationContext);
                if (hintMatch) {
                    return res.status(200).json(buildParserBackedResponse(
                        hintMatch.parserResult,
                        'photo-hint-via-parser',
                        hintMatch.lookupQuery,
                        'Used text lookup fallback because no clear foods were detected in the image.'
                    ));
                }
            }
            return res.status(200).json({
                success: false,
                error: 'Could not identify food in the image',
                suggestion: 'Try taking a clearer photo that includes the whole meal'
            });
        }

        let lookupQueries = derivePostVisionLookupQueries({
            foods,
            restaurantIdentified: deriveRestaurant(parsedPayload, foods),
            currentLookupQuery: parsedPayload.lookupQuery,
            fileNameHint: fileName,
            imageContext,
            imageContextAlternatives
        });
        const contextMentionsDrink = /\b(drink|soda|coke|sprite|tea|lemonade|shake|milkshake|coffee)\b/.test(imageContext.toLowerCase());
        const lookupMentionsDrink = lookupQueries.some((query) => /\b(drink|soda|coke|sprite|tea|lemonade|shake|milkshake|coffee)\b/.test(query.toLowerCase()));
        if (contextMentionsDrink && lookupQueries.length && !lookupMentionsDrink) {
            lookupQueries = Array.from(new Set([
                cleanText(`${lookupQueries[0]} with a drink`, lookupQueries[0], 160),
                ...lookupQueries
            ])).filter(Boolean);
        }
        const lookupQuery = lookupQueries[0] || '';
        const shouldTrustVisibleLabel = shouldUseVisionNutritionWithoutParser(foods, parsedPayload, textContent);
        if (preferWebSearch && lookupQueries.length && !shouldTrustVisibleLabel) {
            try {
                const lookupMatch = await lookupFirstParserMatch(baseUrl, lookupQueries, foodMemoryHints, locationContext);
                if (lookupMatch?.parserResult?.success && Array.isArray(lookupMatch.parserResult.foods) && lookupMatch.parserResult.foods.length > 0) {
                    return res.status(200).json(buildParserBackedResponse(
                        lookupMatch.parserResult,
                        'photo-ai-via-parser',
                        lookupMatch.lookupQuery,
                        parsedPayload.notes || ''
                    ));
                }
            } catch (lookupError) {
                console.warn(`Photo lookupQuery handoff failed: ${lookupError.message}`);
            }
        } else if (shouldTrustVisibleLabel && lookupQuery) {
            console.log(`Skipping parser handoff for visible nutrition label values: ${lookupQuery}`);
        }

        const totals = calculateTotals(foods);
        const restaurantIdentified = deriveRestaurant(parsedPayload, foods);
        const overallConfidence = deriveOverallConfidence(foods, parsedPayload.overallConfidence);
        const notes = cleanText(parsedPayload.notes || '', '', 280) || null;

        console.log(`✅ Photo analyzed: ${foods.length} item(s), ${totals.calories} calories`);

        res.status(200).json({
            success: true,
            foods,
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFiber: totals.fiber,
            totalNetCarbs: totals.netCarbs,
            totalFat: totals.fat,
            totalSugar: totals.sugar,
            overallConfidence,
            restaurantIdentified,
            notes,
            lookupQuery: lookupQuery || null,
            source: usedWebSearch ? 'photo-ai-web-search' : 'photo-ai'
        });
    } catch (error) {
        console.error('Food vision analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze food photo. Please retry or add a label/brand description.',
            code: 'FOOD_VISION_FAILED'
        });
    }
}
