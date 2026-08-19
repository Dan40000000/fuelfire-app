export const NUTRIENT_FIELDS = ['calories', 'protein', 'carbs', 'fiber', 'netCarbs', 'fat', 'sugar'];

export const DEFAULT_ACCURACY_THRESHOLDS = Object.freeze({
    labelRelativeError: 0.01,
    dictatedRelativeError: 0.01,
    brandedRelativeError: 0.10,
    genericRelativeError: 0.15,
    catastrophicRelativeError: 0.30,
    nameSimilarity: 0.62,
    maxCatastrophicRate: 0.05,
    minOverallPassRate: 0.90,
    minIdentityPassRate: 0.95,
    maxVoiceP95Ms: 6000,
    maxPhotoP95Ms: 12000,
});

function finiteNumber(value, fallback = 0) {
    const number = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function percentile(values, percentileValue) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileValue * sorted.length) - 1));
    return sorted[index];
}

export function normalizeFoodName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(?:the|a|an|with|of|and|x)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenSet(value) {
    return new Set(normalizeFoodName(value).split(' ').filter(Boolean));
}

export function foodNameSimilarity(left, right) {
    const a = tokenSet(left);
    const b = tokenSet(right);
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    for (const token of a) {
        if (b.has(token)) intersection += 1;
    }
    return (2 * intersection) / (a.size + b.size);
}

export function wordErrorRate(reference, hypothesis) {
    const expected = normalizeFoodName(reference).split(' ').filter(Boolean);
    const actual = normalizeFoodName(hypothesis).split(' ').filter(Boolean);
    if (!expected.length) return actual.length ? 1 : 0;
    const matrix = Array.from({ length: expected.length + 1 }, () => Array(actual.length + 1).fill(0));
    for (let row = 0; row <= expected.length; row += 1) matrix[row][0] = row;
    for (let column = 0; column <= actual.length; column += 1) matrix[0][column] = column;
    for (let row = 1; row <= expected.length; row += 1) {
        for (let column = 1; column <= actual.length; column += 1) {
            const substitution = expected[row - 1] === actual[column - 1] ? 0 : 1;
            matrix[row][column] = Math.min(
                matrix[row - 1][column] + 1,
                matrix[row][column - 1] + 1,
                matrix[row - 1][column - 1] + substitution
            );
        }
    }
    return matrix[expected.length][actual.length] / expected.length;
}

export function recomputeNutritionFromFoods(foods = []) {
    const totals = {};
    for (const field of NUTRIENT_FIELDS) {
        totals[field] = foods.reduce((sum, food) => {
            const quantity = Math.max(0, finiteNumber(food?.quantity, 1));
            const carbs = finiteNumber(food?.carbs);
            const fiber = finiteNumber(food?.fiber);
            const value = field === 'netCarbs' && food?.netCarbs == null
                ? Math.max(0, carbs - fiber)
                : finiteNumber(food?.[field]);
            return sum + (value * quantity);
        }, 0);
    }
    return totals;
}

function declaredNutritionValue(payload, field) {
    const alias = `total${field.charAt(0).toUpperCase()}${field.slice(1)}`;
    const value = payload?.[field] ?? payload?.[alias] ?? payload?.totals?.[field];
    return Number.isFinite(Number(value)) ? finiteNumber(value) : null;
}

export function summarizeNutrition(payload = {}) {
    const foods = Array.isArray(payload.foods) ? payload.foods : [];
    const recomputed = recomputeNutritionFromFoods(foods);
    const totals = {};

    for (const field of NUTRIENT_FIELDS) {
        totals[field] = declaredNutritionValue(payload, field) ?? recomputed[field];
    }

    return totals;
}

function evidenceTolerance(testCase, thresholds) {
    if (Number.isFinite(Number(testCase?.tolerance?.relative))) {
        return Number(testCase.tolerance.relative);
    }
    const evidence = String(testCase?.evidence || 'generic').toLowerCase();
    if (evidence === 'visible_label') return thresholds.labelRelativeError;
    if (evidence === 'dictated_values') return thresholds.dictatedRelativeError;
    if (evidence === 'official_brand') return thresholds.brandedRelativeError;
    return thresholds.genericRelativeError;
}

function compareNutrient(field, expected, actual, relativeTolerance, absoluteTolerance = 1) {
    const expectedValue = finiteNumber(expected);
    const actualValue = finiteNumber(actual);
    const absoluteError = Math.abs(actualValue - expectedValue);
    const relativeError = expectedValue === 0
        ? (absoluteError === 0 ? 0 : 1)
        : absoluteError / Math.abs(expectedValue);
    const pass = expectedValue === 0
        ? absoluteError <= absoluteTolerance
        : relativeError <= relativeTolerance;

    return {
        field,
        expected: expectedValue,
        actual: actualValue,
        absoluteError,
        relativeError,
        pass,
    };
}

function evaluateNames(expectedNames, predictedFoods, threshold) {
    const predictions = predictedFoods.map((food) => String(food?.name || '')).filter(Boolean);
    const matches = expectedNames.map((expectedName) => {
        let best = { predicted: '', similarity: 0 };
        for (const predicted of predictions) {
            const similarity = foodNameSimilarity(expectedName, predicted);
            if (similarity > best.similarity) best = { predicted, similarity };
        }
        return { expected: expectedName, ...best, pass: best.similarity >= threshold };
    });

    return {
        matches,
        pass: matches.length === 0 || matches.every((match) => match.pass),
        score: matches.length
            ? matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length
            : 1,
    };
}

export function evaluateFoodCase(testCase, prediction = {}, options = {}) {
    const thresholds = { ...DEFAULT_ACCURACY_THRESHOLDS, ...(options.thresholds || {}) };
    const truth = testCase?.truth || {};
    const expectedTotals = truth.totals || {};
    const actualTotals = summarizeNutrition(prediction);
    const predictedFoods = Array.isArray(prediction.foods) ? prediction.foods : [];
    const recomputedTotals = recomputeNutritionFromFoods(predictedFoods);
    const arithmeticChecks = NUTRIENT_FIELDS.map((field) => {
        const declared = declaredNutritionValue(prediction, field);
        if (declared === null) return null;
        const recomputed = recomputedTotals[field];
        return {
            field,
            declared,
            recomputed,
            difference: Math.abs(declared - recomputed),
            pass: Math.abs(declared - recomputed) <= 1,
        };
    }).filter(Boolean);
    const arithmeticInvariantPass = arithmeticChecks.every((check) => check.pass);
    const relativeTolerance = evidenceTolerance(testCase, thresholds);
    const absoluteTolerance = Number.isFinite(Number(testCase?.tolerance?.absolute))
        ? Number(testCase.tolerance.absolute)
        : 1;

    const nutrients = NUTRIENT_FIELDS
        .filter((field) => expectedTotals[field] !== undefined && expectedTotals[field] !== null)
        .map((field) => compareNutrient(
            field,
            expectedTotals[field],
            actualTotals[field],
            Number.isFinite(Number(testCase?.tolerance?.[field]))
                ? Number(testCase.tolerance[field])
                : relativeTolerance,
            absoluteTolerance
        ));

    const expectedNames = Array.isArray(truth.names) ? truth.names.filter(Boolean) : [];
    const identity = evaluateNames(expectedNames, predictedFoods, thresholds.nameSimilarity);
    const expectedCount = Number.isFinite(Number(truth.foodCount)) ? Number(truth.foodCount) : null;
    const countPass = expectedCount === null || predictedFoods.length === expectedCount;
    const calorieMetric = nutrients.find((metric) => metric.field === 'calories');
    const catastrophic = Boolean(
        calorieMetric && calorieMetric.relativeError > thresholds.catastrophicRelativeError
    );
    const confidence = String(prediction.overallConfidence || prediction.confidence || '').toLowerCase();
    const overconfident = catastrophic && confidence === 'high';
    const latencyMs = Number.isFinite(Number(options.latencyMs)) ? Number(options.latencyMs) : null;
    const intendedPhrase = testCase?.input?.intendedPhrase || '';
    const transcript = testCase?.input?.transcript || '';
    const transcriptionWordErrorRate = intendedPhrase && transcript
        ? wordErrorRate(intendedPhrase, transcript)
        : null;
    const transcriptCandidates = [transcript, ...(testCase?.input?.alternatives || [])]
        .map(normalizeFoodName)
        .filter(Boolean);
    const requiredRecognitionTokens = Array.isArray(testCase?.truth?.recognition?.requiredTokens)
        ? testCase.truth.recognition.requiredTokens.map(normalizeFoodName).filter(Boolean)
        : [];
    const numberAliases = {
        zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
        eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', twenty: '20', thirty: '30', hundred: '100',
    };
    const tokenMatches = (required, candidateTokens) => candidateTokens.includes(required)
        || (numberAliases[required] && candidateTokens.includes(numberAliases[required]))
        || Object.entries(numberAliases).some(([word, digit]) => required === digit && candidateTokens.includes(word));
    const recognizedTokenCount = requiredRecognitionTokens.filter((token) => transcriptCandidates.some((candidate) => tokenMatches(token, candidate.split(' ')))).length;
    const recognitionTokenRecall = requiredRecognitionTokens.length
        ? recognizedTokenCount / requiredRecognitionTokens.length
        : null;
    const recognitionPass = recognitionTokenRecall === null || recognitionTokenRecall >= 0.95;
    const nutrientPass = nutrients.every((metric) => metric.pass);
    const pass = Boolean(prediction.success !== false && nutrientPass && identity.pass && countPass && arithmeticInvariantPass && recognitionPass && !catastrophic);

    return {
        id: testCase.id,
        title: testCase.title || testCase.id,
        modality: testCase.modality || 'unknown',
        evidence: testCase.evidence || 'generic',
        pass,
        nutrientPass,
        identityPass: identity.pass,
        countPass,
        arithmeticInvariantPass,
        arithmeticChecks,
        catastrophic,
        overconfident,
        latencyMs,
        transcriptionWordErrorRate,
        recognitionTokenRecall,
        recognitionPass,
        tolerance: relativeTolerance,
        nutrients,
        identity,
        expectedCount,
        actualCount: predictedFoods.length,
        predictionSource: prediction.source || null,
        confidence: confidence || null,
        error: prediction.error || null,
    };
}

function groupResults(results, field) {
    const groups = new Map();
    for (const result of results) {
        const key = result[field] || 'unknown';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(result);
    }
    return Object.fromEntries(Array.from(groups.entries()).map(([key, values]) => [key, summarizeResultSet(values)]));
}

function summarizeResultSet(results) {
    const count = results.length;
    const calorieErrors = results
        .flatMap((result) => result.nutrients || [])
        .filter((metric) => metric.field === 'calories')
        .map((metric) => metric.relativeError);
    const latencies = results.map((result) => result.latencyMs).filter(Number.isFinite);
    const wordErrorRates = results.map((result) => result.transcriptionWordErrorRate).filter(Number.isFinite);
    const recognitionRecalls = results.map((result) => result.recognitionTokenRecall).filter(Number.isFinite);
    const passed = results.filter((result) => result.pass).length;
    const identityPassed = results.filter((result) => result.identityPass).length;
    const catastrophic = results.filter((result) => result.catastrophic).length;

    return {
        count,
        passed,
        passRate: count ? passed / count : 0,
        identityPassRate: count ? identityPassed / count : 0,
        catastrophic,
        catastrophicRate: count ? catastrophic / count : 0,
        overconfident: results.filter((result) => result.overconfident).length,
        arithmeticFailures: results.filter((result) => !result.arithmeticInvariantPass).length,
        medianCalorieRelativeError: percentile(calorieErrors, 0.5),
        p95CalorieRelativeError: percentile(calorieErrors, 0.95),
        medianLatencyMs: percentile(latencies, 0.5),
        p95LatencyMs: percentile(latencies, 0.95),
        medianTranscriptionWordErrorRate: percentile(wordErrorRates, 0.5),
        p95TranscriptionWordErrorRate: percentile(wordErrorRates, 0.95),
        medianRecognitionTokenRecall: percentile(recognitionRecalls, 0.5),
        recognitionFailures: results.filter((result) => !result.recognitionPass).length,
    };
}

export function aggregateFoodAccuracy(results = [], options = {}) {
    const thresholds = { ...DEFAULT_ACCURACY_THRESHOLDS, ...(options.thresholds || {}) };
    const validResults = results.filter(Boolean);
    const overall = summarizeResultSet(validResults);
    const byModality = groupResults(validResults, 'modality');
    const byEvidence = groupResults(validResults, 'evidence');
    const gates = {
        overallPassRate: overall.passRate >= thresholds.minOverallPassRate,
        identityPassRate: overall.identityPassRate >= thresholds.minIdentityPassRate,
        catastrophicRate: overall.catastrophicRate <= thresholds.maxCatastrophicRate,
        voiceLatency: !byModality.voice?.p95LatencyMs || byModality.voice.p95LatencyMs <= thresholds.maxVoiceP95Ms,
        photoLatency: !byModality.photo?.p95LatencyMs || byModality.photo.p95LatencyMs <= thresholds.maxPhotoP95Ms,
        noOverconfidentCatastrophes: overall.overconfident === 0,
        arithmeticInvariants: overall.arithmeticFailures === 0,
        recognitionStages: overall.recognitionFailures === 0,
    };

    return {
        generatedAt: new Date().toISOString(),
        thresholds,
        overall,
        byModality,
        byEvidence,
        gates,
        releaseGatePassed: Object.values(gates).every(Boolean),
    };
}
