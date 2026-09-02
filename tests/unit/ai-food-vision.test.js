import { describe, expect, it } from 'vitest';
import {
    applyPackagedServingMath,
    applyVisibleNutritionLabel,
    calculateTotals,
    deriveHintLookupQueries,
    hasEffectiveSpatialMeasurement,
    mergeVisibleNutritionLabels,
    mergeVisualPortionEvidence,
    normalizeGenericWholePizzaNutrition,
    parserPortionConflictsWithVision,
    reconcileVolumePortionWithCalorieRange,
    reconcileParserNutritionWithVision,
    formatSpatialContextForPrompt,
    sanitizeSpatialContext,
    sanitizeVisionFoods,
    shouldLookupPhotoNutrition,
    shouldRefocusVisibleNutritionLabel,
    validateVisionNutrition,
} from '../../api/ai-food-vision.js';

describe('AI food vision normalization', () => {
    it('sanitizes LiDAR measurements and derives food height from the plate plane', () => {
        const result = sanitizeSpatialContext({
            captureMode: 'arkit-scene-depth',
            lidarAvailable: true,
            sceneDepthAvailable: true,
            centerDistanceMeters: 0.44,
            platePlaneDistanceMeters: 0.49,
            imageResolution: { width: 1920, height: 1440 },
            depthMapResolution: { width: 256, height: 192 },
            cameraIntrinsics: [1400, 0, 960, 0, 1400, 720, 0, 0, 1],
            depthStats: {
                minMeters: 0.39,
                medianMeters: 0.47,
                maxMeters: 0.62,
                validSampleRatio: 0.94,
                highConfidenceRatio: 0.81,
            },
        });

        expect(result).toMatchObject({
            lidarAvailable: true,
            sceneDepthAvailable: true,
            centerDistanceMeters: 0.44,
            platePlaneDistanceMeters: 0.49,
            estimatedFoodHeightMeters: 0.05,
            imageResolution: { width: 1920, height: 1440 },
        });
        const prompt = formatSpatialContextForPrompt(result);
        expect(prompt).toContain('Estimated height above the plate/support plane: 0.05 m');
        expect(prompt).toContain('full image spans approximately 0.672 m wide by 0.504 m tall');
    });

    it('rejects impossible or unhelpful spatial measurements', () => {
        expect(sanitizeSpatialContext({ centerDistanceMeters: 40 })).toBeNull();
        const result = sanitizeSpatialContext({
            sceneDepthAvailable: true,
            centerDistanceMeters: -1,
            platePlaneDistanceMeters: 99,
            depthStats: { validSampleRatio: 4 },
        });
        expect(result).toMatchObject({ sceneDepthAvailable: true });
        expect(result.centerDistanceMeters).toBeUndefined();
        expect(result.depthStats).toBeUndefined();
    });

    it('does not treat LiDAR capability or zero-only depth stats as an effective measurement', () => {
        const capabilityOnly = {
            captureMode: 'lidarSceneDepth',
            lidarAvailable: true,
            sceneDepthAvailable: true,
        };
        expect(sanitizeSpatialContext(capabilityOnly)).toMatchObject(capabilityOnly);
        expect(hasEffectiveSpatialMeasurement(capabilityOnly)).toBe(false);
        expect(hasEffectiveSpatialMeasurement({
            ...capabilityOnly,
            centerDistanceMeters: 0,
            platePlaneDistanceMeters: 0,
            estimatedFoodHeightMeters: 0,
            depthStats: {
                minMeters: 0,
                medianMeters: 0,
                maxMeters: 0,
                validSampleRatio: 0,
                highConfidenceRatio: 0,
            },
        })).toBe(false);
    });

    it('recognizes valid numeric depth metrics and positive depth evidence', () => {
        expect(hasEffectiveSpatialMeasurement({ centerDistanceMeters: 0.44 })).toBe(true);
        expect(hasEffectiveSpatialMeasurement({ platePlaneDistanceMeters: 0.49 })).toBe(true);
        expect(hasEffectiveSpatialMeasurement({ estimatedFoodHeightMeters: 0.05 })).toBe(true);
        expect(hasEffectiveSpatialMeasurement({
            sceneDepthAvailable: true,
            depthStats: { validSampleRatio: 0.72 },
        })).toBe(true);
        expect(hasEffectiveSpatialMeasurement({
            sceneDepthAvailable: true,
            depthStats: { highConfidenceRatio: 0.4 },
        })).toBe(true);
    });

    it('uses visible label values instead of a generic visual estimate', () => {
        const foods = [{
            name: 'Cottage Cheese', quantity: 1, serving: '1/2 cup', calories: 110,
            protein: 13, carbs: 4, fiber: 0, netCarbs: 4, fat: 5, sugar: 3,
            confidence: 'medium', dataSource: 'estimate',
        }];
        const result = applyVisibleNutritionLabel(foods, {
            hasNutritionFacts: true,
            servingSize: '1 container (170g)', servingsPerContainer: 1,
            calories: 160, protein: 14, carbs: 15, fiber: 0, fat: 5, sugar: 11,
        }, 'Daisy cottage cheese, nutrition facts visible');

        expect(result[0]).toMatchObject({
            calories: 160, protein: 14, carbs: 15, netCarbs: 15, fat: 5, sugar: 11,
        });
    });

    it('preserves estimated fields that were unreadable on a partial label', () => {
        const foods = [{
            name: 'Protein Shake', quantity: 1, serving: '1 bottle', calories: 220,
            protein: 30, carbs: 12, fiber: 2, netCarbs: 10, fat: 5, sugar: 7,
            confidence: 'medium', dataSource: 'visual estimate',
        }];
        const result = applyVisibleNutritionLabel(foods, {
            hasNutritionFacts: true,
            servingSize: '1 bottle',
            calories: 190,
            protein: 26,
        }, 'nutrition label visible but partly obscured');

        expect(result[0]).toMatchObject({
            calories: 190,
            protein: 26,
            carbs: 12,
            fiber: 2,
            netCarbs: 10,
            fat: 5,
            sugar: 7,
            labelExtracted: true,
            confidence: 'medium',
            needsVerification: true,
        });
    });

    it('accepts a readable zero-calorie nutrition label', () => {
        const result = applyVisibleNutritionLabel([], {
            hasNutritionFacts: true,
            productName: 'Diet Soda',
            servingSize: '1 can',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
        }, 'diet soda label visible');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'Diet Soda', calories: 0, protein: 0, carbs: 0, fat: 0,
            confidence: 'high', labelExtracted: true,
        });
    });

    it('scales a quarter-pizza label to a whole pizza', () => {
        const foods = [{
            name: 'Supreme Pizza', quantity: 1, serving: '1/4 pizza', calories: 310,
            protein: 14, carbs: 31, fiber: 1, netCarbs: 30, fat: 15, sugar: 4,
        }];
        const result = applyPackagedServingMath(foods, 'whole pizza', {});

        expect(result[0].quantity).toBe(4);
        expect(calculateTotals(result)).toMatchObject({ calories: 1240, protein: 56, carbs: 124 });
    });

    it('keeps direct label evidence authoritative over a lossy nutrition pass', () => {
        const merged = mergeVisibleNutritionLabels({
            hasNutritionFacts: true, calories: 160, protein: 0, carbs: 0, fat: 0,
        }, {
            hasNutritionFacts: true, calories: 160, protein: 14, carbs: 15, fat: 5,
        });

        expect(merged).toMatchObject({ calories: 160, protein: 14, carbs: 15, fat: 5 });
        expect(shouldRefocusVisibleNutritionLabel(merged)).toBe(false);
        expect(shouldRefocusVisibleNutritionLabel({
            hasNutritionFacts: true, calories: 160, protein: 0, carbs: 0, netCarbs: 15, fat: 0,
        })).toBe(true);
    });

    it('normalizes only implausible scale-ambiguous whole pizzas', () => {
        const normalized = normalizeGenericWholePizzaNutrition({
            name: 'Margherita pizza', serving: '1 whole pizza', quantity: 1,
            calories: 2800, protein: 40, carbs: 320, fiber: 10, fat: 120,
            dataSource: 'standard reference', confidence: 'medium',
        }, 'one whole Margherita pizza');

        expect(normalized).toMatchObject({
            calories: 950, protein: 38, carbs: 120, fat: 34,
            quantity: 1, confidence: 'low', needsVerification: true,
        });
        expect(normalizeGenericWholePizzaNutrition({
            name: 'Kirkland pizza', serving: '1 whole pizza', quantity: 1,
            calories: 1240, protein: 56, carbs: 124, fat: 60,
            dataSource: 'package label',
        }, 'whole pizza').calories).toBe(1240);
    });

    it('normalizes vague sausage and popcorn estimates conservatively', () => {
        const result = sanitizeVisionFoods([
            { name: 'Breakfast Sausage Links', serving: '2 large links', quantity: 1, calories: 120, protein: 7, carbs: 1, fat: 9 },
            { name: 'Mixed Popcorn', serving: '6 cups', quantity: 1, calories: 250, protein: 12, carbs: 22, fat: 10 },
        ], 'large thick sausage links and six cups mixed popcorn');

        expect(result).toHaveLength(2);
        expect(result.every((food) => food.calories > 0)).toBe(true);
        expect(result.every((food) => ['high', 'medium', 'low'].includes(food.confidence))).toBe(true);
        expect(result[1]).toMatchObject({ serving: '1 cup popped', quantity: 6 });
        expect(calculateTotals([result[1]]).calories).toBe(250);
    });

    it('does not collapse a plate of popcorn to one database cup', () => {
        const foods = sanitizeVisionFoods([{
            name: 'Popped popcorn', serving: '1 cup popped', quantity: 1,
            calories: 31, protein: 1, carbs: 6.2, fiber: 1.2, fat: 0,
            confidence: 'low', dataSource: 'generic cup reference',
        }]);
        const corrected = reconcileVolumePortionWithCalorieRange(foods, {
            low: 90, high: 170, midpoint: 130,
        });

        expect(corrected[0]).toMatchObject({
            serving: '1 cup popped', quantity: 4, portionAdjustedToRange: true,
            needsVerification: true,
        });
        expect(calculateTotals(corrected).calories).toBe(124);
    });

    it('reserves the slower parser handoff for identified brands or restaurants', () => {
        const generic = [{ name: 'Popped popcorn', serving: '1 cup popped', quantity: 6 }];
        expect(shouldLookupPhotoNutrition(generic, { lookupQuery: 'popped popcorn' }, '')).toBe(false);
        expect(shouldLookupPhotoNutrition(generic, { packageBrand: 'Orville Redenbacher' }, '')).toBe(true);
        expect(shouldLookupPhotoNutrition(
            [{ name: 'Chicken nuggets', restaurant: 'McDonalds' }],
            { restaurantIdentified: 'McDonalds' },
            ''
        )).toBe(true);
    });

    it('normalizes screenshot-shaped bare small sausages without changing the egg estimate', () => {
        const foods = sanitizeVisionFoods([
            {
                name: 'sausage', serving: '1 small sausage', quantity: 6,
                calories: 160, protein: 10, carbs: 0, fat: 12,
            },
            {
                name: 'fried egg', serving: '1 large egg', quantity: 3,
                calories: 140, protein: 6, carbs: 1, fat: 9,
            },
        ]);

        expect(foods[0]).toMatchObject({
            name: 'sausage', serving: '1 small breakfast sausage link', quantity: 6,
        });
        expect(foods[0].calories).toBeCloseTo(160 / 3, 6);
        expect(foods[0].protein).toBeCloseTo(10 / 3, 6);
        expect(foods[0].carbs).toBe(0);
        expect(foods[0].fat).toBe(4);
        expect(foods[1]).toMatchObject({
            name: 'fried egg', serving: '1 large egg', quantity: 3,
            calories: 140, protein: 6, carbs: 1, fat: 9,
        });
        expect(calculateTotals([foods[0]])).toMatchObject({ calories: 320, protein: 20, fat: 24 });
        expect(calculateTotals(foods)).toMatchObject({ calories: 740, protein: 38, fat: 51 });
    });

    it('treats a counted breakfast-sausage plate as small links even when the model omits the word small', () => {
        const [sausage] = sanitizeVisionFoods([{
            name: 'Breakfast Sausage', serving: '1 link', quantity: 6, visualCount: 6,
            visualAmount: 'six browned links arranged beside the eggs',
            calories: 160, protein: 10, carbs: 0, fat: 12,
            confidence: 'medium', dataSource: 'generic visual nutrition estimate',
        }]);

        expect(sausage).toMatchObject({
            serving: '1 small breakfast sausage link', quantity: 6, visualCount: 6,
            needsVerification: true,
        });
        expect(sausage.calories).toBeCloseTo(160 / 3, 6);
        expect(calculateTotals([sausage])).toMatchObject({ calories: 320, protein: 20, fat: 24 });
    });

    it('does not apply small-sausage normalization to unsized, large, or authoritative values', () => {
        const foods = sanitizeVisionFoods([
            {
                name: 'sausage links', serving: '1 sausage link', quantity: 6,
                calories: 160, protein: 10, carbs: 0, fat: 12,
            },
            {
                name: 'large sausage links', serving: '1 large sausage link', quantity: 6,
                calories: 160, protein: 10, carbs: 0, fat: 12,
            },
            {
                name: 'small sausages', serving: '1 small sausage', quantity: 6,
                calories: 160, protein: 10, carbs: 0, fat: 12,
                labelExtracted: true,
                dataSource: 'Visible Nutrition Facts package label',
            },
        ]);

        expect(foods[0]).toMatchObject({ calories: 160, protein: 10, carbs: 0, fat: 12 });
        expect(foods[0].calories).not.toBe(57);
        expect(foods[1].calories).not.toBe(57);
        expect(foods[2]).toMatchObject({ calories: 160, protein: 10, carbs: 0, fat: 12 });
    });

    it('keeps a counted jumbo-shrimp plate from multiplying an aggregate serving twice', () => {
        const [shrimp] = sanitizeVisionFoods([{
            name: 'shrimp', quantity: 15, serving: '15 large cooked shrimp',
            calories: 230, protein: 30, carbs: 0, fiber: 0, fat: 12, sugar: 0,
            confidence: 'medium', dataSource: 'standard nutrition reference',
        }], 'jumbo cooked shrimp on a plate');

        expect(shrimp).toMatchObject({
            quantity: 15,
            calories: 18,
            protein: 4,
            carbs: 0,
            fat: 0,
            visualCount: 15,
            needsVerification: true,
        });
        expect(calculateTotals([shrimp])).toMatchObject({
            calories: 270,
            protein: 60,
            fat: 0,
        });
        expect(shrimp.serving).toContain('1 cooked shrimp');
        expect(shrimp.dataSource).toContain('99 cal');
    });

    it('normalizes grouped servings for countable foods without double multiplication', () => {
        const foods = sanitizeVisionFoods([
            { name: 'Meatballs', serving: '6 meatballs', quantity: 6, calories: 480, protein: 30, carbs: 24, fat: 30 },
            { name: 'Blueberry Muffins', serving: '4 muffins', quantity: 1, visualCount: 4, calories: 540, protein: 8, carbs: 124, fat: 4 },
        ]);

        expect(foods[0]).toMatchObject({ quantity: 6, serving: '1 meatball', calories: 80, protein: 5 });
        expect(foods[1]).toMatchObject({ quantity: 4, serving: '1 muffin', calories: 135, protein: 2 });
        expect(calculateTotals(foods)).toMatchObject({ calories: 1020, protein: 38, carbs: 148, fat: 34 });
    });

    it('normalizes a grouped rib serving to per-rib nutrition and quantity', () => {
        const [ribs] = sanitizeVisionFoods([{
            name: 'Smoked pork ribs', serving: '6 pork ribs', quantity: 1,
            calories: 690, protein: 54, carbs: 0, fat: 48,
            confidence: 'medium', dataSource: 'generic visual nutrition estimate',
        }]);

        expect(ribs).toMatchObject({
            name: 'Smoked pork ribs', serving: '1 rib', quantity: 6, visualCount: 6,
        });
        expect(ribs.calories).toBeCloseTo(115, 6);
        expect(ribs.protein).toBeCloseTo(9, 6);
        expect(ribs.fat).toBeCloseTo(8, 6);
        expect(calculateTotals([ribs])).toMatchObject({ calories: 690, protein: 54, fat: 48 });
    });

    it.each([
        '4 dumplings',
        '4-count dumplings',
        'serving of 4 dumplings',
        'four dumplings',
    ])('normalizes grouped count phrase "%s" exactly once', (serving) => {
        const [food] = sanitizeVisionFoods([{
            name: 'Pork Dumplings', serving, quantity: 4, visualCount: 4,
            calories: 280, protein: 16, carbs: 36, fat: 8,
        }]);
        const [secondPass] = sanitizeVisionFoods([food]);

        expect(food).toMatchObject({ serving: '1 dumpling', quantity: 4, calories: 70, protein: 4 });
        expect(calculateTotals([food]).calories).toBe(280);
        expect(calculateTotals([secondPass]).calories).toBe(280);
    });

    it('does not mistake weight or length measurements for item counts', () => {
        const foods = sanitizeVisionFoods([
            { name: 'Chicken Breast', serving: '4 oz chicken breast', quantity: 1, calories: 140, protein: 26, carbs: 0, fat: 3 },
            { name: 'Sub Sandwich', serving: '6 inch sandwich', quantity: 1, calories: 420, protein: 22, carbs: 48, fat: 16 },
        ]);

        expect(foods[0]).toMatchObject({ serving: '4 oz chicken breast', quantity: 1, calories: 140 });
        expect(foods[1]).toMatchObject({ serving: '6 inch sandwich', quantity: 1, calories: 420 });
    });

    it.each([
        ['three bananas', 'Bananas', 3, 363],
        ['four eggs', 'Eggs', 4, 280],
        ['24 wings', 'Chicken Wings', 24, 2400],
        ['6 cookies', 'Cookies', 6, 600],
        ['2 bars', 'Protein Bars', 2, 400],
    ])('preserves the consumed count for %s', (serving, name, count, totalCalories) => {
        const [food] = sanitizeVisionFoods([{
            name, serving, quantity: 1, visualCount: count,
            calories: totalCalories, protein: count * 5, carbs: count * 8, fat: count * 3,
        }]);
        expect(food.quantity).toBe(count);
        expect(calculateTotals([food]).calories).toBe(totalCalories);
    });

    it('reconciles a grouped visible label with the visible count', () => {
        const foods = [{
            name: 'Blueberry Muffins', serving: '1 muffin', quantity: 4, visualCount: 4,
            calories: 150, protein: 3, carbs: 34, fat: 2,
        }];
        const result = applyVisibleNutritionLabel(foods, {
            hasNutritionFacts: true,
            servingSize: '2 muffins',
            calories: 270,
            protein: 3,
            carbs: 63,
            fiber: 1,
            fat: 1,
            sugar: 31,
        }, 'four visible blueberry muffins with Nutrition Facts label');

        expect(result[0]).toMatchObject({ serving: '1 muffin', quantity: 4, calories: 135, visualCount: 4 });
        expect(calculateTotals(result).calories).toBe(540);
    });

    it('keeps two visually counted chicken breasts when the reference is per 4 oz breast', () => {
        const [food] = sanitizeVisionFoods([{
            name: 'Chicken Breasts', serving: '1 chicken breast (4 oz)', quantity: 2, visualCount: 2,
            calories: 140, protein: 26, carbs: 0, fat: 3, confidence: 'high',
        }]);

        expect(food).toMatchObject({ quantity: 2, visualCount: 2, calories: 140, needsVerification: true });
        expect(calculateTotals([food])).toMatchObject({ calories: 280, protein: 52 });
    });

    it('scales a weight-based database reference to a visually counted portion', () => {
        const [wings] = sanitizeVisionFoods([{
            name: 'Chicken Wings', serving: '100 grams', quantity: 1, visualCount: 10,
            estimatedGramsPerUnit: 30, estimatedTotalGrams: 300,
            calories: 203, protein: 30, carbs: 0, fat: 8, confidence: 'medium',
            dataSource: 'standard 100g reference',
        }]);

        expect(wings).toMatchObject({
            quantity: 10, visualCount: 10, estimatedGramsPerUnit: 30,
            serving: '1 item (estimated 30g)', needsVerification: true,
        });
        expect(calculateTotals([wings])).toMatchObject({ calories: 609, protein: 90, fat: 24 });
    });

    it('carries count, size, and gram evidence into the nutrition result', () => {
        const [merged] = mergeVisualPortionEvidence(
            [{ name: 'Chicken Wings', quantity: 1, serving: '100 grams', calories: 203 }],
            [{ name: 'wings', count: 8, sizeClass: 'large', estimatedGramsPerUnit: 32, estimatedTotalGrams: 256, confidence: 'medium' }],
        );

        expect(merged).toMatchObject({
            visualCount: 8, sizeClass: 'large', estimatedGramsPerUnit: 32,
            estimatedTotalGrams: 256, portionConfidence: 'medium',
        });
    });

    it('blocks parser handoffs that erase an explicit visual portion', () => {
        expect(parserPortionConflictsWithVision(
            [{ name: 'Shrimp', serving: '1 cooked shrimp', quantity: 13, visualCount: 13 }],
            [{ name: 'Cooked Shrimp', serving: '100 grams', quantity: 1 }],
        )).toBe(true);
        expect(parserPortionConflictsWithVision(
            [{ name: 'Popcorn', serving: '6 cups', quantity: 1 }],
            [{ name: 'Popcorn', serving: '1 cup', quantity: 1 }],
        )).toBe(true);
        expect(parserPortionConflictsWithVision(
            [{ name: 'Whole Pizza', serving: '1 whole pizza', quantity: 1 }],
            [{ name: 'Pizza', serving: '1 slice', quantity: 1 }],
        )).toBe(true);
        expect(parserPortionConflictsWithVision(
            [{ name: 'Chicken Nuggets', serving: '1 nugget', quantity: 10, visualCount: 10 }],
            [{ name: '10-piece Chicken Nuggets', serving: '10 pieces', quantity: 1 }],
        )).toBe(false);
        expect(parserPortionConflictsWithVision(
            [{ name: 'Bananas', serving: '1 large banana', quantity: 3, visualCount: 3, sizeClass: 'large' }],
            [{ name: 'Banana (medium)', serving: '1 serving', quantity: 1 }],
        )).toBe(true);
        expect(parserPortionConflictsWithVision(
            [{ name: 'Chicken Nuggets', serving: '1 nugget', quantity: 7, visualCount: 7 }],
            [{ name: '10-piece Chicken Nuggets', serving: '10 pieces', quantity: 1 }],
        )).toBe(true);
    });

    it('matches reordered parser foods by identity before comparing portions', () => {
        expect(parserPortionConflictsWithVision(
            [
                { name: 'Chicken Wings', serving: '1 wing', quantity: 8, visualCount: 8 },
                { name: 'Apple Slices', serving: '4 slices', quantity: 1, visualCount: 4 },
            ],
            [
                { name: 'Apple Slices', serving: '4 slices', quantity: 1 },
                { name: 'Chicken Wings', serving: '8 wings', quantity: 1 },
            ],
        )).toBe(false);
    });

    it('reconciles grouped parser nutrition without losing the visual count', () => {
        const result = reconcileParserNutritionWithVision(
            [{
                name: 'Chicken Nuggets', serving: '1 nugget', quantity: 10, visualCount: 10,
                sizeClass: 'standard', calories: 45, protein: 3, carbs: 3, fat: 2,
                confidence: 'medium',
            }],
            [{
                name: '10-piece Chicken Nuggets', serving: '10 pieces', quantity: 1,
                calories: 410, protein: 25, carbs: 24, fat: 24, confidence: 'high',
                sourceType: 'official', source: 'Official menu nutrition',
            }],
        );

        expect(result[0]).toMatchObject({
            name: 'Chicken Nuggets', serving: '1 nugget', quantity: 10, visualCount: 10,
            calories: 41, protein: 2.5,
        });
        expect(result[0].carbs).toBeCloseTo(2.4);
        expect(result[0].fat).toBeCloseTo(2.4);
        expect(calculateTotals(result)).toMatchObject({ calories: 410, protein: 25, carbs: 24, fat: 24 });
    });

    it('refuses parser nutrition when it cannot represent the explicit visual portion', () => {
        const result = reconcileParserNutritionWithVision(
            [{ name: 'Bananas', serving: '1 large banana', quantity: 3, visualCount: 3, sizeClass: 'large', calories: 121 }],
            [{ name: 'Banana (medium)', serving: '1 serving', quantity: 1, calories: 105 }],
        );
        expect(result).toBeNull();
    });

    it('downgrades impossible nutrition instead of presenting it as high confidence', () => {
        const food = validateVisionNutrition({
            name: 'Impossible shake', serving: '1 shake', quantity: 1,
            calories: 100, protein: 80, carbs: 40, fiber: 50, netCarbs: 60, fat: 30,
            confidence: 'high', dataSource: 'AI estimate',
        });

        expect(food).toMatchObject({
            fiber: 40, netCarbs: 40, confidence: 'low', needsVerification: true,
            nutritionInconsistent: true,
        });
    });

    it('ranks explicit brand context ahead of generic filename hints', () => {
        const queries = deriveHintLookupQueries(
            'Daisy cottage cheese, 1 container, nutrition label visible',
            'IMG_5526.jpg',
            ['cottage cheese'],
        );

        expect(queries[0].toLowerCase()).toContain('daisy');
    });

    it('does not turn photo instructions into extra food lookup items', () => {
        const queries = deriveHintLookupQueries(
            'one whole Margherita pizza; estimate the entire visible pizza, not one slice',
            'Whole Margherita Pizza.jpg',
        );

        expect(queries[0].toLowerCase()).toBe('one whole margherita pizza');
        expect(queries.every((query) => !query.toLowerCase().includes('estimate the entire'))).toBe(true);
        expect(queries.every((query) => !query.toLowerCase().includes('not one slice'))).toBe(true);
    });
});
