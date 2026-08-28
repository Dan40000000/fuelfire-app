(function initFoodPersonalization(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.FoodPersonalization = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildFoodPersonalization() {
    const SIZE_WORDS = ['mini', 'small', 'little', 'standard', 'regular', 'medium', 'large', 'big', 'huge', 'thick', 'jumbo'];
    const STRONG_SOURCE_TERMS = /nutrition facts|visible label|barcode|openfoodfacts|official|manufacturer|menu pdf|package label/i;
    const WEAK_SOURCE_TERMS = /estimate|estimated|aggregator|visual|ai parse fallback/i;

    function numberValue(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizeText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/\b\d+(?:\.\d+)?\s*x\s+/g, ' ')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\b(add|log|ate|had|please|for|my|the)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extractSize(value) {
        const normalized = ` ${normalizeText(value)} `;
        return SIZE_WORDS.find((word) => normalized.includes(` ${word} `)) || '';
    }

    function extractPortionBasis(value) {
        const normalized = ` ${normalizeText(value)} `;
        if (/\b\d+(?:\.\d+)?\s*(?:g|gram|grams|kg|kilogram|kilograms|oz|ounce|ounces|lb|pound|pounds)\b/.test(normalized)) return 'weight';
        if (/\b\d+(?:\.\d+)?\s*(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|ml|milliliter|milliliters|liter|liters)\b/.test(normalized)) return 'volume';
        if (/\b(?:whole|entire|full)\s+(?:pizza|pie|package|container|bag|bottle|can)\b/.test(normalized)) return 'whole';
        if (/\b(?:slice|slices|half|quarter|third|1\s+[234568])\b/.test(normalized)) return 'part';
        if (/\b(?:container|package|packet|pouch|carton|bottle|bottles|can|cans|bag|bags|bar|bars)\b/.test(normalized)) return 'package';
        if (
            /\b\d+(?:\.\d+)?\b/.test(normalized)
            && /\b(?:shrimp|prawn|link|links|piece|pieces|item|items|egg|eggs|muffin|muffins|pancake|pancakes|wing|wings|nugget|nuggets|meatball|meatballs|dumpling|dumplings|taco|tacos|cookie|cookies|cracker|crackers)\b/.test(normalized)
        ) return 'count';
        return '';
    }

    function extractServingPortionAmount(value, basis) {
        const normalized = ` ${normalizeText(value)} `;
        if (basis === 'weight') {
            const match = normalized.match(/\b(\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms|g|gram|grams|oz|ounce|ounces|lb|pound|pounds)\b/);
            if (!match) return 0;
            const amount = numberValue(match[1], 0);
            if (/^(kg|kilogram)/.test(match[2])) return amount * 1000;
            if (/^(oz|ounce)/.test(match[2])) return amount * 28.3495;
            if (/^(lb|pound)/.test(match[2])) return amount * 453.592;
            return amount;
        }
        if (basis === 'volume') {
            const match = normalized.match(/\b(\d+(?:\.\d+)?)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|ml|milliliter|milliliters|liter|liters)\b/);
            if (!match) return 0;
            const amount = numberValue(match[1], 0);
            if (/^cup/.test(match[2])) return amount * 236.588;
            if (/^(tbsp|tablespoon)/.test(match[2])) return amount * 14.7868;
            if (/^(tsp|teaspoon)/.test(match[2])) return amount * 4.92892;
            if (/^liter/.test(match[2])) return amount * 1000;
            return amount;
        }
        if (basis === 'count') {
            const match = normalized.match(/\b(\d+(?:\.\d+)?)\b/);
            return match ? numberValue(match[1], 0) : 0;
        }
        if (basis === 'whole') return 1;
        if (basis === 'part') {
            const fraction = normalized.match(/\b1\s+([234568])\b/);
            if (fraction) return 1 / numberValue(fraction[1], 1);
            if (/\bhalf\b/.test(normalized)) return 0.5;
            if (/\bthird\b/.test(normalized)) return 1 / 3;
            if (/\bquarter\b/.test(normalized)) return 0.25;
            const slices = normalized.match(/\b(\d+(?:\.\d+)?)\s+slices?\b/);
            return slices ? numberValue(slices[1], 0) : 1;
        }
        if (basis === 'package') {
            const match = normalized.match(/\b(\d+(?:\.\d+)?)\s+(?:containers?|packages?|packets?|pouches?|cartons?|bottles?|cans?|bags?|bars?)\b/);
            return match ? numberValue(match[1], 0) : 1;
        }
        return 0;
    }

    function portionsAreCompatible(left, right, tolerance = 1.35) {
        const leftText = `${left?.name || ''} ${left?.serving || ''}`;
        const rightText = `${right?.name || ''} ${right?.serving || ''}`;
        const leftSize = extractSize(leftText);
        const rightSize = extractSize(rightText);
        if (leftSize && rightSize && leftSize !== rightSize) return false;

        const leftBasis = extractPortionBasis(leftText);
        const rightBasis = extractPortionBasis(rightText);
        if (leftBasis && rightBasis && leftBasis !== rightBasis) return false;
        if (!leftBasis || !rightBasis) return true;

        const leftAmount = extractServingPortionAmount(left?.serving, leftBasis);
        const rightAmount = extractServingPortionAmount(right?.serving, rightBasis);
        if (!leftAmount || !rightAmount) return true;
        const ratio = Math.max(leftAmount, rightAmount) / Math.min(leftAmount, rightAmount);
        return ratio <= tolerance;
    }

    function inferEvidenceTier(food) {
        const sourceType = String(food?.sourceType || '').toLowerCase();
        const sourceText = `${food?.source || ''} ${food?.dataSource || ''} ${food?.evidence || ''}`;
        if (food?.labelExtracted || /nutrition facts|visible label/i.test(sourceText)) return 100;
        if (/barcode|openfoodfacts/i.test(sourceText)) return 98;
        if (food?.correctionCount > 0 || food?.memoryAction === 'corrected') return 95;
        if (food?.fromFoodMemory || sourceType === 'user-saved') return 90;
        if (sourceType === 'official' || sourceType === 'menu_pdf' || /official|manufacturer/i.test(sourceText)) return 85;
        if (sourceType === 'database' || /database|package label/i.test(sourceText)) return 70;
        if (sourceType === 'aggregator') return 35;
        if (sourceType === 'estimate' || WEAK_SOURCE_TERMS.test(sourceText)) return 20;
        return 50;
    }

    function isMemoryEligible(item) {
        if (!item) return false;
        if (numberValue(item.correctionCount) > 0 || item.memoryAction === 'corrected') return true;
        if (STRONG_SOURCE_TERMS.test(`${item.source || ''} ${item.dataSource || ''}`)) return true;
        const count = numberValue(item.count);
        const tier = numberValue(item.evidenceTier, inferEvidenceTier(item));
        if (tier >= 70) return count >= 1;
        if (tier >= 50) return count >= 2;
        return count >= 3;
    }

    function shouldMemoryOverride(candidate, memoryItem) {
        if (!isMemoryEligible(memoryItem)) return false;
        if (
            candidate?.nutritionBasis === 'user-provided'
            || /user dictated|user-provided nutrition/i.test(`${candidate?.source || ''} ${candidate?.evidence || ''}`)
        ) {
            return false;
        }
        if (!portionsAreCompatible(candidate, memoryItem)) return false;
        return inferEvidenceTier(memoryItem) > inferEvidenceTier(candidate);
    }

    function normalizeNutrition(food) {
        const quantity = Math.max(0.01, numberValue(food?.quantity, 1));
        const base = food?.baseNutrition || {
            calories: numberValue(food?.calories) / quantity,
            protein: numberValue(food?.protein) / quantity,
            carbs: numberValue(food?.carbs) / quantity,
            fiber: numberValue(food?.fiber) / quantity,
            netCarbs: numberValue(food?.netCarbs, Math.max(0, numberValue(food?.carbs) - numberValue(food?.fiber))) / quantity,
            fat: numberValue(food?.fat) / quantity,
            sugar: numberValue(food?.sugar) / quantity
        };
        return {
            calories: numberValue(base.calories),
            protein: numberValue(base.protein),
            carbs: numberValue(base.carbs),
            fiber: numberValue(base.fiber),
            netCarbs: numberValue(base.netCarbs, Math.max(0, numberValue(base.carbs) - numberValue(base.fiber))),
            fat: numberValue(base.fat),
            sugar: numberValue(base.sugar)
        };
    }

    function normalizeBundleFood(food) {
        const quantity = Math.max(0.01, numberValue(food?.quantity, 1));
        const baseNutrition = normalizeNutrition(food);
        return {
            name: String(food?.name || 'Food item').replace(/^\s*\d+(?:\.\d+)?\s*x\s+/i, '').trim(),
            serving: String(food?.serving || '1 serving').trim(),
            quantity,
            baseNutrition,
            restaurant: food?.restaurant || null,
            source: food?.dataSource || food?.source || 'saved meal',
            sourceType: food?.sourceType || 'user-saved',
            memoryAliases: Array.isArray(food?.memoryAliases) ? food.memoryAliases.slice(0, 12) : []
        };
    }

    function buildMealSignature(foods, mealType = '') {
        const parts = (Array.isArray(foods) ? foods : [])
            .map((food) => {
                const normalizedName = normalizeText(food?.name).replace(/^\d+(?:\.\d+)?\s+/, '');
                const quantity = Math.round(Math.max(0.01, numberValue(food?.quantity, 1)) * 100) / 100;
                return normalizedName ? `${normalizedName}:${quantity}` : '';
            })
            .filter(Boolean)
            .sort();
        return `${normalizeText(mealType)}|${parts.join('|')}`;
    }

    function createMealBundle(name, foods, mealType = 'snack', aliases = [], now = new Date().toISOString()) {
        const normalizedFoods = (Array.isArray(foods) ? foods : []).map(normalizeBundleFood).filter((food) => food.name);
        if (!normalizedFoods.length) return null;
        const cleanName = String(name || '').replace(/\s+/g, ' ').trim() || `Usual ${mealType}`;
        const normalizedAliases = Array.from(new Set([
            cleanName,
            `usual ${mealType}`,
            `my usual ${mealType}`,
            ...(Array.isArray(aliases) ? aliases : [])
        ].map(normalizeText).filter(Boolean))).slice(0, 20);
        return {
            id: `meal_${Date.parse(now) || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: cleanName,
            mealType,
            foods: normalizedFoods,
            aliases: normalizedAliases,
            signature: buildMealSignature(normalizedFoods, mealType),
            count: 1,
            createdAt: now,
            lastLoggedAt: now
        };
    }

    function bundleToFoods(bundle) {
        return (Array.isArray(bundle?.foods) ? bundle.foods : []).map((food) => ({
            name: food.name,
            serving: food.serving || '1 serving',
            quantity: Math.max(0.01, numberValue(food.quantity, 1)),
            ...normalizeNutrition(food),
            baseNutrition: normalizeNutrition(food),
            restaurant: food.restaurant || null,
            confidence: 'high',
            sourceType: 'user-saved',
            source: `Saved meal: ${bundle.name}`,
            dataSource: food.source || 'saved meal',
            memoryAliases: Array.isArray(food.memoryAliases) ? food.memoryAliases : [],
            fromFoodMemory: true,
            fromSavedMeal: true
        }));
    }

    function scoreBundleQuery(query, bundle) {
        const q = normalizeText(query);
        if (!q) return 0;
        const searchable = [bundle?.name, ...(bundle?.aliases || [])].map(normalizeText).filter(Boolean);
        let score = 0;
        searchable.forEach((text) => {
            if (q === text) score = Math.max(score, 100);
            else if (q.includes(text) && text.length >= 5) score = Math.max(score, 94);
            else if (text.includes(q) && q.length >= 5) score = Math.max(score, 88);
        });
        if (/\b(usual|regular|saved|same)\b/.test(q) && q.includes(normalizeText(bundle?.mealType))) {
            score = Math.max(score, 90);
        }
        return score;
    }

    function findMealBundle(query, bundles, alternatives = []) {
        const queries = [query, ...(Array.isArray(alternatives) ? alternatives : [])].filter(Boolean);
        const scored = (Array.isArray(bundles) ? bundles : []).map((bundle) => ({
            bundle,
            score: Math.max(...queries.map((value) => scoreBundleQuery(value, bundle)), 0)
        })).filter(({ score }) => score >= 88);
        scored.sort((a, b) => b.score - a.score || numberValue(b.bundle.count) - numberValue(a.bundle.count));
        return scored[0]?.bundle || null;
    }

    function recordMealPattern(patterns, foods, mealType, now = new Date().toISOString()) {
        const signature = buildMealSignature(foods, mealType);
        if (!signature || signature.endsWith('|')) return { patterns: Array.isArray(patterns) ? patterns : [], pattern: null };
        const next = Array.isArray(patterns) ? patterns.map((item) => ({ ...item })) : [];
        const index = next.findIndex((item) => item.signature === signature);
        const snapshot = (Array.isArray(foods) ? foods : []).map(normalizeBundleFood);
        const pattern = index >= 0 ? {
            ...next[index],
            count: numberValue(next[index].count) + 1,
            foods: snapshot,
            lastLoggedAt: now
        } : {
            signature,
            mealType,
            foods: snapshot,
            count: 1,
            firstLoggedAt: now,
            lastLoggedAt: now,
            dismissed: false
        };
        if (index >= 0) next[index] = pattern;
        else next.push(pattern);
        next.sort((a, b) => numberValue(b.count) - numberValue(a.count));
        return { patterns: next.slice(0, 60), pattern };
    }

    function getMealSaveSuggestion(pattern, bundles, minimumCount = 3) {
        if (!pattern || pattern.dismissed || numberValue(pattern.count) < minimumCount) return null;
        const alreadySaved = (Array.isArray(bundles) ? bundles : []).some((bundle) => bundle.signature === pattern.signature);
        if (alreadySaved) return null;
        return {
            ...pattern,
            suggestedName: `Usual ${pattern.mealType || 'meal'}`
        };
    }

    function sanitizeLocationContext(value) {
        const latitude = numberValue(value?.latitude, NaN);
        const longitude = numberValue(value?.longitude, NaN);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
        return {
            latitude: Math.round(latitude * 1000) / 1000,
            longitude: Math.round(longitude * 1000) / 1000,
            accuracyMeters: Math.max(0, Math.min(10000, Math.round(numberValue(value?.accuracyMeters, 0))))
        };
    }

    return {
        buildMealSignature,
        bundleToFoods,
        createMealBundle,
        findMealBundle,
        getMealSaveSuggestion,
        inferEvidenceTier,
        isMemoryEligible,
        normalizeText,
        recordMealPattern,
        sanitizeLocationContext,
        portionsAreCompatible,
        shouldMemoryOverride
    };
}));
