const OPEN_FOOD_FACTS_SEARCH_URL = 'https://search.openfoodfacts.org/search';
const OPEN_FOOD_FACTS_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OPEN_FOOD_FACTS_FIELDS = [
    'code',
    'product_name',
    'brands',
    'serving_size',
    'nutrition_data_per',
    'nutriments'
].join(',');

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'at', 'full', 'i', 'in', 'of', 'one', 'the', 'with',
    'ate', 'had', 'food', 'item', 'serving', 'package', 'whole'
]);

function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function tokens(value) {
    return normalize(value)
        .split(/\s+/)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function servingGrams(value) {
    const match = String(value || '').match(/(?:^|\(|\s)(\d+(?:\.\d+)?)\s*(g|ml)(?:\)|\s|$)/i);
    return match ? Number(match[1]) : null;
}

function productScore(product, query) {
    const queryTokens = tokens(query);
    if (!queryTokens.length) return 0;

    const productText = normalize(`${product?.brands || ''} ${product?.product_name || ''}`);
    const productTokens = new Set(tokens(productText));
    const matched = queryTokens.filter((token) => productTokens.has(token));
    const coverage = matched.length / queryTokens.length;
    const productCoverage = matched.length / Math.max(1, productTokens.size);
    const phraseBonus = productText && normalize(query).includes(productText) ? 0.25 : 0;
    const brand = normalize(product?.brands || '').split(/[,;]/)[0].trim();
    const brandBonus = brand && normalize(query).includes(brand) ? 0.2 : 0;
    return coverage * 0.65 + productCoverage * 0.15 + phraseBonus + brandBonus;
}

function queryTokenCoverage(product, query) {
    const queryTokens = tokens(query);
    if (!queryTokens.length) return 0;
    const productTokens = new Set(tokens(`${product?.brands || ''} ${product?.product_name_en || ''} ${product?.product_name || ''}`));
    return queryTokens.filter((token) => productTokens.has(token)).length / queryTokens.length;
}

function nutrientForServing(nutriments, key, grams) {
    const servingValue = number(nutriments?.[`${key}_serving`]);
    if (servingValue !== null) return servingValue;
    const per100 = number(nutriments?.[`${key}_100g`]);
    if (per100 !== null && grams !== null) return per100 * grams / 100;
    return null;
}

function normalizeProduct(product, score, query) {
    const nutriments = product?.nutriments || {};
    const grams = servingGrams(product?.serving_size);
    const calories = nutrientForServing(nutriments, 'energy-kcal', grams);
    if (calories === null || calories <= 0) return null;
    const queryText = normalize(query);
    if (/\b(shake|drink|beverage|milk|juice|soda)\b/.test(queryText) && (grams === null || grams < 100 || calories < 50)) {
        return null;
    }
    if (/\bpizza\b/.test(queryText) && grams !== null && grams < 40) return null;

    const carbs = nutrientForServing(nutriments, 'carbohydrates', grams) || 0;
    const fiber = nutrientForServing(nutriments, 'fiber', grams) || 0;
    const protein = nutrientForServing(nutriments, 'proteins', grams) || 0;
    const fat = nutrientForServing(nutriments, 'fat', grams) || 0;
    if (grams !== null && protein + carbs + fat > grams * 1.25) return null;
    const name = [product?.brands, product?.product_name].filter(Boolean).join(' ').trim();
    if (!name) return null;

    return {
        name,
        matchedItem: name,
        restaurant: product?.brands || null,
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fiber: Math.round(fiber),
        netCarbs: Math.max(0, Math.round(carbs - fiber)),
        fat: Math.round(fat),
        sugar: Math.round(nutrientForServing(nutriments, 'sugars', grams) || 0),
        serving: String(product?.serving_size || (grams ? `${grams} g` : '1 serving')).slice(0, 100),
        quantity: 1,
        confidence: score >= 0.92 ? 'high' : 'medium',
        needsVerification: score < 0.92,
        source: 'Open Food Facts product database',
        sourceType: 'database',
        sourceUrl: product?.code ? `https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}` : null,
        evidence: `Matched brand/product tokens (${Math.round(score * 100)}% score)`,
        matchScore: score
    };
}

export async function lookupOpenFoodFacts(query, { timeoutMs = 5000 } = {}) {
    const normalizedQuery = normalize(query);
    if (normalizedQuery.length < 3) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(OPEN_FOOD_FACTS_SEARCH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'WellFitPro/1.0 (contact: support@wellfitpro.app)'
            },
            body: JSON.stringify({
                q: normalizedQuery,
                page_size: 8,
                langs: ['en'],
                boost_phrase: true,
                fields: ['code', 'product_name', 'product_name_en', 'brands']
            }),
            signal: controller.signal
        });
        if (!response.ok) return null;
        const data = await response.json();
        const rankedHits = (Array.isArray(data?.hits) ? data.hits : [])
            .map((product) => ({
                product,
                score: productScore(product, normalizedQuery),
                queryCoverage: queryTokenCoverage(product, normalizedQuery)
            }))
            .filter((candidate) => candidate.score >= 0.4 && candidate.queryCoverage >= 0.75)
            .sort((a, b) => b.score - a.score);

        for (const candidate of rankedHits.slice(0, 5)) {
            const code = String(candidate.product?.code || '').trim();
            if (!code) continue;
            const productUrl = `${OPEN_FOOD_FACTS_PRODUCT_URL}/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(OPEN_FOOD_FACTS_FIELDS)}`;
            const productResponse = await fetch(productUrl, {
                headers: { 'User-Agent': 'WellFitPro/1.0 (contact: support@wellfitpro.app)' },
                signal: controller.signal
            });
            if (!productResponse.ok) continue;
            const productData = await productResponse.json();
            const product = productData?.product || candidate.product;
            const normalized = normalizeProduct(product, candidate.score, normalizedQuery);
            if (normalized) return normalized;
        }
        return null;
    } catch (error) {
        if (error?.name !== 'AbortError') {
            console.warn(`Open Food Facts lookup failed: ${error.message}`);
        }
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export const nutritionEvidenceConstants = {
    OPEN_FOOD_FACTS_SEARCH_URL,
    OPEN_FOOD_FACTS_PRODUCT_URL,
    OPEN_FOOD_FACTS_FIELDS
};
