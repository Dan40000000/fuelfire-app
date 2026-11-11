// Claude AI Meal Plan Generation API
// This routes all user requests through your Claude Pro account
// Last updated: July 25, 2025 - Added better error handling

import { callClaude } from './_lib/anthropic.js';
import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';
import { requireAiAccess } from './_lib/security.js';
import { createProviderBudget } from './_lib/provider-budget.js';
import { getRequestBody, requireBodyLimit } from './_lib/request-security.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
};

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validateQuizData(quizData) {
    if (!quizData || typeof quizData !== 'object' || Array.isArray(quizData)) return false;
    try {
        if (Buffer.byteLength(JSON.stringify(quizData), 'utf8') > 64 * 1024) return false;
    } catch {
        return false;
    }
    return Object.values(quizData).every((value) => {
        if (typeof value === 'string') return value.length <= 500;
        if (Array.isArray(value)) return value.length <= 50 && value.every((item) => typeof item === 'string' && item.length <= 200);
        return value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'undefined';
    });
}

function validateImageData(imageData) {
    if (typeof imageData !== 'string' || imageData.length > MAX_IMAGE_BYTES * 2) return null;
    const match = imageData.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!match) return null;
    let decoded;
    try {
        decoded = Buffer.from(match[2], 'base64');
    } catch {
        return null;
    }
    if (!decoded.length || decoded.length > MAX_IMAGE_BYTES) return null;
    return { imageData, mediaType: match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase(), bytes: decoded.length };
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
        if (!requireBodyLimit(req, res, MAX_BODY_BYTES)) return;
        const body = getRequestBody(req);
        if (!body) {
            return res.status(400).json({ success: false, error: 'A JSON object body is required.', code: 'INVALID_JSON_BODY' });
        }
        const { quizData, imageUpload, image, images, phase } = body;

        const imageArray = imageUpload === true
            ? (Array.isArray(images) ? images : image ? [image] : [])
            : [];
        if (imageUpload === true) {
            if (!imageArray.length || imageArray.length > 5) {
                return res.status(400).json({ success: false, error: 'One to five meal-plan images are required.', code: 'INVALID_IMAGE_SCHEMA' });
            }
            const validatedImages = imageArray.map(validateImageData);
            if (validatedImages.some((item) => !item)
                || validatedImages.reduce((total, item) => total + item.bytes, 0) > 8 * 1024 * 1024) {
                return res.status(400).json({ success: false, error: 'Meal-plan images must be valid, bounded data URLs.', code: 'INVALID_IMAGE_SCHEMA' });
            }
        } else if (!validateQuizData(quizData)) {
            return res.status(400).json({ success: false, error: 'Valid quiz data is required.', code: 'INVALID_QUIZ_SCHEMA' });
        }

        const access = await requireAiAccess(req, res, {
            capability: imageUpload === true ? 'meal_import' : 'planning',
        });
        if (!access) return;

        if (!process.env.CLAUDE_API_KEY) {
            return res.status(503).json({
                success: false,
                error: 'Meal-plan provider is not configured.',
                code: 'PROVIDER_CONFIG_REQUIRED',
            });
        }

        const providerBudget = createProviderBudget({ limit: process.env.FUELFIRE_MEAL_PLAN_PROVIDER_BUDGET || 10 });

        // Handle image upload (single or multiple)
        if (imageUpload === true) {
            console.log(`📷 Processing ${imageArray.length} uploaded meal plan image(s)`);

            // Extract meal plan from image(s)
            const extractedMealPlan = await extractMealPlanFromImages(imageArray, { providerBudget });

            console.log(`✅ Successfully extracted meal plan from ${imageArray.length} image(s)`);

            return res.status(200).json({
                success: true,
                mealPlan: extractedMealPlan,
                content: extractedMealPlan,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    planDuration: 'custom',
                    goal: 'uploaded',
                    source: 'uploaded_photos',
                    imageCount: imageArray.length,
                }
            });
        }

        // Regular quiz-based generation
        console.log('🎯 Generating complete meal plan');
        console.log(`📊 Quiz data includes: ${Object.keys(quizData).join(', ')}`);
        console.log('🚀 Dispatching segmented meal plan prompts...');

        if (phase === 'legacy') {
            console.log('🕰️ Legacy phase requested, using consolidated prompt flow.');
            const legacyPrompt = buildLegacyPrompt(quizData);
            const legacyPlan = await callClaudeText({
                prompt: legacyPrompt,
                maxTokens: 4000,
                tags: ['meal-plan', 'legacy'],
                providerBudget,
            });

            return res.status(200).json({
                success: true,
                mealPlan: formatMealPlanForApp(legacyPlan),
                content: legacyPlan,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    planDuration: '14-day',
                    goal: quizData.goal,
                    mode: 'legacy',
                },
            });
        }

        // Generate all 5 parts in parallel with individual error handling
        let week1, week2, shopping1, shopping2, title;

        try {
            [week1, week2, shopping1, shopping2, title] = await Promise.all([
                generateWeek1(quizData, providerBudget).catch(e => { console.error('❌ Week1 failed:', e); throw e; }),
                generateWeek2(quizData, providerBudget).catch(e => { console.error('❌ Week2 failed:', e); throw e; }),
                generateWeek1ShoppingList(quizData, providerBudget).catch(e => { console.error('❌ Shopping1 failed:', e); throw e; }),
                generateWeek2ShoppingList(quizData, providerBudget).catch(e => { console.error('❌ Shopping2 failed:', e); throw e; }),
                generateTitle(quizData).catch(e => { console.error('❌ Title failed:', e); throw e; })
            ]);

            console.log('✅ All 5 parts generated successfully');
            console.log('📊 Part lengths - Title:', title?.length, 'Week1:', week1?.length, 'Week2:', week2?.length, 'Shopping1:', shopping1?.length, 'Shopping2:', shopping2?.length);
        } catch (error) {
            console.error('❌ Failed to generate one or more meal plan parts:', error);
            throw error;
        }

        // Validate all parts exist
        if (!week1 || !week2 || !shopping1 || !shopping2 || !title) {
            console.error('❌ Missing meal plan parts:', {
                hasTitle: !!title,
                hasWeek1: !!week1,
                hasWeek2: !!week2,
                hasShopping1: !!shopping1,
                hasShopping2: !!shopping2
            });
            throw new Error('Failed to generate complete meal plan - missing parts');
        }

        // Combine all parts
        const completeMealPlan = `${title}\n\n${week1}\n\n${shopping1}\n\n${week2}\n\n${shopping2}`;

        console.log('✅ Successfully generated complete meal plan');
        console.log(`📏 Complete meal plan length: ${completeMealPlan.length} characters`);

        res.status(200).json({
            success: true,
            mealPlan: completeMealPlan,  // Frontend expects this field
            content: completeMealPlan,   // Keep for backward compatibility
            metadata: {
                generatedAt: new Date().toISOString(),
                planDuration: '2-week',
                goal: quizData.goal,
            }
        });

    } catch (error) {
        console.error('❌ Error generating meal plan:', error);
        console.error('Full error:', error.stack);
        res.status(500).json({
            error: 'Failed to generate meal plan',
            message: 'Our AI chef is taking a quick break. Please try again in a moment!',
        });
    }
}

async function callClaudeText(options) {
    const { text } = await callClaude(options);
    return text;
}

async function extractMealPlanFromImage(imageData, { providerBudget } = {}) {
    const [header, base64] = imageData.split(',');
    const mediaTypeMatch = header.match(/data:image\/(.*?);/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'jpeg';

    const content = [
        {
            type: 'text',
            text: `Analyze this image of a meal plan and extract all the information into a structured format.

Please format the extracted meal plan EXACTLY like this:

### Day 1

**🍳 Breakfast:**
[meal with specific quantities - e.g., "3 eggs scrambled, 2 slices whole wheat toast, 1 tbsp butter"]
Calories: [number]

**🥗 Lunch:**
[meal with specific quantities - e.g., "6oz grilled chicken breast, 1.5 cups mixed greens, 1/2 avocado"]
Calories: [number]

**🍽️ Dinner:**
[meal with specific quantities - e.g., "6oz salmon fillet, 1 cup sweet potato, 1 cup steamed broccoli"]
Calories: [number]

**🍎 Snacks:**
[snack items with quantities - e.g., "1 cup Greek yogurt, 1/4 cup blueberries"]
Calories: [number]

**Day Total:** [total] calories | P: [protein]g | C: [carbs]g | F: [fat]g

[Continue for all days in the meal plan]

### Shopping List
[Extract any shopping list if visible]

Important:
- Extract ALL meals and days visible in the image
- Include calorie counts and macros if shown
- Keep the exact formatting with emojis
- If some information is not visible, make reasonable estimates based on the meals
- Organize by days if the plan shows multiple days
- If it's a weekly plan, expand it to cover 7-14 days as appropriate`,
        },
        {
            type: 'image',
            source: {
                type: 'base64',
                media_type: `image/${mediaType}`,
                data: base64,
            },
        },
    ];

    return await callClaudeText({
        messages: [{ role: 'user', content }],
        maxTokens: 4000,
        tags: ['meal-plan', 'image-extract'],
        providerBudget,
    });
}

async function extractMealPlanFromImages(imageDataArray, { providerBudget } = {}) {
    // Build content array with prompt text first, then all images
    const content = [
        {
            type: 'text',
            text: `Analyze these ${imageDataArray.length} images of a meal plan and extract all the information into a single, organized meal plan.

Please combine and format the extracted meal plan EXACTLY like this:

### Day 1

**🍳 Breakfast:**
[meal with specific quantities - e.g., "3 eggs scrambled, 2 slices whole wheat toast, 1 tbsp butter"]
Calories: [number]

**🥗 Lunch:**
[meal with specific quantities - e.g., "6oz grilled chicken breast, 1.5 cups mixed greens, 1/2 avocado"]
Calories: [number]

**🍽️ Dinner:**
[meal with specific quantities - e.g., "6oz salmon fillet, 1 cup sweet potato, 1 cup steamed broccoli"]
Calories: [number]

**🍎 Snacks:**
[snack items with quantities - e.g., "1 cup Greek yogurt, 1/4 cup blueberries"]
Calories: [number]

**Day Total:** [total] calories | P: [protein]g | C: [carbs]g | F: [fat]g

[Continue for all days in the meal plan]

### Shopping List
[Extract and combine any shopping lists if visible across images]

Important:
- Extract ALL meals and days visible across ALL images
- Combine information from multiple images into one cohesive meal plan
- If the same day appears in multiple images, use the most complete information
- Include calorie counts and macros if shown
- Keep the exact formatting with emojis
- If some information is not visible, make reasonable estimates based on the meals
- Organize by days sequentially (Day 1, Day 2, Day 3, etc.)
- If it's a weekly plan, expand it to cover 7-14 days as appropriate
- Remove any duplicate information
- Create a unified shopping list if multiple shopping lists are present`
        }
    ];

    // Add all images to the content array
    for (let i = 0; i < imageDataArray.length; i++) {
        const imageData = imageDataArray[i];
        // Extract the base64 data and media type
        const [header, base64] = imageData.split(',');
        const mediaType = header.match(/data:image\/(.*?);/)[1];

        content.push({
            type: 'image',
            source: {
                type: 'base64',
                media_type: `image/${mediaType}`,
                data: base64
            }
        });
    }

    return await callClaudeText({
        messages: [{ role: 'user', content }],
        maxTokens: 4000,
        tags: ['meal-plan', 'image-batch', `count:${imageDataArray.length}`],
        providerBudget,
    });
}

async function generateTitle(quizData) {
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes Plan' : 'Your Custom Fuel Plan';
    return `# 🔥 ${title}`;
}

async function generateWeek1(quizData, providerBudget) {
    const userInfo = `User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}`;

    const varietyInstructions = getVarietyInstructions(quizData.mealVariety);

    const prompt = `Create Week 1 (Days 1-7) of a meal plan.

${userInfo}
${varietyInstructions}

IMPORTANT: Include specific quantities for each ingredient (6oz chicken breast, 1 cup rice, 2 tbsp olive oil, etc.)

Format each day exactly like this:
### Day X:
**🍳 Breakfast:** 3 eggs scrambled, 2 slices whole wheat toast, 1 tbsp butter - Cal: X | P: Xg | C: Xg | F: Xg
**🥗 Lunch:** 6oz grilled chicken breast, 1.5 cups mixed greens, 1/2 avocado, 2 tbsp olive oil dressing - Cal: X | P: Xg | C: Xg | F: Xg
**🍽️ Dinner:** 6oz salmon fillet, 1 cup sweet potato, 1 cup steamed broccoli, 1 tsp olive oil - Cal: X | P: Xg | C: Xg | F: Xg
**🍎 Snacks:** 1 cup Greek yogurt, 1/4 cup blueberries, 1 tbsp honey - Cal: X | P: Xg | C: Xg | F: Xg
**Day Total:** X cal | P: Xg | C: Xg | F: Xg

Include ALL 7 days. ALWAYS specify exact quantities for every ingredient. Keep meal descriptions with quantities but concise. ALWAYS include complete macro totals for each day. Start with Day 1.`;

    return await callClaudeText({
        prompt,
        maxTokens: 4000,
        tags: ['meal-plan', 'week1'],
        providerBudget,
    });
}

async function generateWeek2(quizData, providerBudget) {
    const userInfo = `User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}`;

    const varietyInstructions = getVarietyInstructions(quizData.mealVariety);

    const prompt = `Create Week 2 (Days 8-14) of a meal plan.

${userInfo}
${varietyInstructions}

IMPORTANT: Include specific quantities for each ingredient (6oz chicken breast, 1 cup rice, 2 tbsp olive oil, etc.)

Format each day exactly like this:
### Day X:
**🍳 Breakfast:** 3 eggs scrambled, 2 slices whole wheat toast, 1 tbsp butter - Cal: X | P: Xg | C: Xg | F: Xg
**🥗 Lunch:** 6oz grilled chicken breast, 1.5 cups mixed greens, 1/2 avocado, 2 tbsp olive oil dressing - Cal: X | P: Xg | C: Xg | F: Xg
**🍽️ Dinner:** 6oz salmon fillet, 1 cup sweet potato, 1 cup steamed broccoli, 1 tsp olive oil - Cal: X | P: Xg | C: Xg | F: Xg
**🍎 Snacks:** 1 cup Greek yogurt, 1/4 cup blueberries, 1 tbsp honey - Cal: X | P: Xg | C: Xg | F: Xg
**Day Total:** X cal | P: Xg | C: Xg | F: Xg

Include ALL 7 days (Days 8-14). ALWAYS specify exact quantities for every ingredient. Keep meal descriptions with quantities but concise. ALWAYS include complete macro totals for each day. Start with Day 8.`;

    return await callClaudeText({
        prompt,
        maxTokens: 4000,
        tags: ['meal-plan', 'week2'],
        providerBudget,
    });
}

async function generateWeek1ShoppingList(quizData, providerBudget) {
    const prompt = `Create a shopping list for Week 1 (Days 1-7) of a meal plan.

User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}

## 🛒 Week 1 Shopping List
**Proteins:** chicken breast (2 lbs), ground beef (1 lb), eggs (1 dozen)
**Vegetables:** spinach (2 bags), broccoli (2 heads), bell peppers (4)
**Fruits:** apples (6), bananas (7), berries (2 cups)
**Dairy & Eggs:** Greek yogurt (32 oz), cheese (8 oz), milk (1/2 gallon)
**Pantry Items:** rice (2 lbs), oats (1 lb), olive oil (1 bottle)
**Cost Estimate:** $X

Format each category with specific items and quantities. Keep it practical.`;

    return await callClaudeText({
        prompt,
        maxTokens: 2000,
        tags: ['meal-plan', 'shopping', 'week1'],
        providerBudget,
    });
}

async function generateWeek2ShoppingList(quizData, providerBudget) {
    const prompt = `Create a shopping list for Week 2 (Days 8-14) of a meal plan.

User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}

## 🛒 Week 2 Shopping List
**Proteins:** salmon (1.5 lbs), turkey breast (1 lb), tofu (1 block)
**Vegetables:** kale (2 bunches), carrots (2 lbs), zucchini (4)
**Fruits:** oranges (6), grapes (2 lbs), melon (1)
**Dairy & Eggs:** cottage cheese (16 oz), almond milk (1/2 gallon)
**Pantry Items:** quinoa (1 lb), whole grain bread (1 loaf), nuts (1 lb)
**Cost Estimate:** $X

Format each category with specific items and quantities. Keep it practical.`;

    return await callClaudeText({
        prompt,
        maxTokens: 2000,
        tags: ['meal-plan', 'shopping', 'week2'],
        providerBudget,
    });
}

function getVarietyInstructions(mealVariety) {
    if (mealVariety === 'same-daily') {
        return 'Same meals every day.';
    } else if (mealVariety === 'weekday-same') {
        return 'Days 1-5: same meals. Days 6-7: different weekend meals.';
    } else if (mealVariety === 'full-variety') {
        return 'Different meals every day.';
    } else {
        return '2-3 rotating options for breakfast/lunch, varied dinners.';
    }
}

function buildMealPlanPrompt(quizData, phase) {
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes Plan' : 'Your Custom Fuel Plan';
    
    const userInfo = `User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}`;
    
    let varietyInstructions = '';
    if (quizData.mealVariety === 'same-daily') {
        varietyInstructions = 'Same meals every day.';
    } else if (quizData.mealVariety === 'weekday-same') {
        varietyInstructions = 'Days 1-5: same meals. Days 6-7: different weekend meals.';
    } else if (quizData.mealVariety === 'full-variety') {
        varietyInstructions = 'Different meals every day.';
    } else {
        varietyInstructions = '2-3 rotating options for breakfast/lunch, varied dinners.';
    }
    
    // Optimized for complete generation within token limits
    return `Create a complete 14-day meal plan. Be concise but complete. Start with: # 🔥 ${title}

${userInfo}
${varietyInstructions}

IMPORTANT: Include specific quantities for each ingredient (6oz chicken breast, 1 cup rice, 2 tbsp olive oil, etc.)

Format each day:
### Day X:
**🍳 Breakfast:** 3 eggs scrambled, 2 slices whole wheat toast, 1 tbsp butter - Cal: X | P: Xg | C: Xg | F: Xg
**🥗 Lunch:** 6oz grilled chicken breast, 1.5 cups mixed greens, 1/2 avocado, 2 tbsp olive oil dressing - Cal: X | P: Xg | C: Xg | F: Xg  
**🍽️ Dinner:** 6oz salmon fillet, 1 cup sweet potato, 1 cup steamed broccoli, 1 tsp olive oil - Cal: X | P: Xg | C: Xg | F: Xg
**🍎 Snacks:** 1 cup Greek yogurt, 1/4 cup blueberries, 1 tbsp honey - Cal: X | P: Xg | C: Xg | F: Xg
**Day Total:** X cal

Include ALL Days 1-14. ALWAYS specify exact quantities for every ingredient. Keep meal descriptions with quantities but concise (1-2 lines max per meal).

Then add:
## 🛒 Shopping List
**Proteins:** [concise list]
**Vegetables:** [concise list]
**Fruits:** [concise list]
**Dairy & Eggs:** [concise list]
**Pantry Items:** [concise list]
**Cost Estimate:** $X

## 📝 Meal Prep Tips
[2-3 brief tips]

IMPORTANT: Complete the ENTIRE 14-day plan and ALL sections. Do not ask to continue - generate everything.`;
}

// Fallback to original prompt if phase not recognized
function buildLegacyPrompt(quizData) {
    const title = quizData.mealVariety === 'weekday-same' ? '5-Day Hustle + Weekend Vibes' : 'Your Custom Fuel Plan';
    return `Create a 14-day meal plan. Start with: # 🔥 ${title}

User: ${quizData.age}yo ${quizData.gender}, ${quizData.weight}lbs, goal: ${quizData.goal}
Allergies: ${quizData.allergies?.join(', ') || 'None'}
Preferences: ${quizData.meats?.slice(0,3).join(', ') || 'All meats'}

Format: Days 1-14 with breakfast/lunch/dinner/snacks + calories, then shopping lists.
NO intro text. Start with title.`;
}

function formatMealPlanForApp(rawMealPlan) {
    // Return the raw meal plan without HTML conversion
    // The frontend will handle the formatting
    return rawMealPlan;
}
