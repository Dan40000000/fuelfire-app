// Claude AI Meal Plan Generation API
// This routes all user requests through your Claude Pro account
// Last updated: July 25, 2025 - Added better error handling

export default async function handler(req, res) {
    // Set CORS headers for frontend access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { quizData, userId } = req.body;

        // Validate required data
        if (!quizData) {
            return res.status(400).json({ error: 'Quiz data is required' });
        }

        // Build comprehensive prompt from quiz data
        const prompt = buildMealPlanPrompt(quizData);
        
        console.log(`🎯 Generating meal plan for user: ${userId || 'anonymous'}`);
        console.log(`📊 Quiz data includes: ${Object.keys(quizData).join(', ')}`);
        
        // Check if API key exists
        if (!process.env.CLAUDE_API_KEY) {
            console.error('❌ CLAUDE_API_KEY not found in environment variables');
            console.error('Available env vars:', Object.keys(process.env));
            throw new Error('API configuration error - Claude API key not configured');
        }
        
        console.log('🔑 API Key found, length:', process.env.CLAUDE_API_KEY.length);
        console.log('🔑 API Key prefix:', process.env.CLAUDE_API_KEY.substring(0, 15) + '...');

        // Call Claude API using your account credentials
        // Log the request for debugging
        const requestBody = {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8000, // Reduce back to 8000 - might be too high
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };
        
        console.log('📤 Sending to Claude API with body length:', JSON.stringify(requestBody).length);
        
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY, // Your Claude API key
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!claudeResponse.ok) {
            const errorData = await claudeResponse.text();
            console.error('Claude API Error Status:', claudeResponse.status);
            console.error('Claude API Error Response:', errorData);
            
            // Parse error if it's JSON
            let errorMessage = `Claude API error: ${claudeResponse.status}`;
            try {
                const errorJson = JSON.parse(errorData);
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
            } catch (e) {
                // Not JSON, use raw text
            }
            
            throw new Error(errorMessage);
        }

        const claudeData = await claudeResponse.json();
        const rawMealPlan = claudeData.content[0].text;

        // Format the meal plan for beautiful display
        const formattedMealPlan = formatMealPlanForApp(rawMealPlan);

        // Log success (for your monitoring)
        console.log(`✅ Successfully generated meal plan for user: ${userId || 'anonymous'}`);

        res.status(200).json({
            success: true,
            mealPlan: formattedMealPlan,
            metadata: {
                generatedAt: new Date().toISOString(),
                planDuration: quizData.planDuration || '2-week',
                goal: quizData.goal,
                userId: userId || 'anonymous'
            }
        });

    } catch (error) {
        console.error('❌ Error generating meal plan:', error);
        console.error('Full error:', error.stack);
        res.status(500).json({
            error: 'Failed to generate meal plan',
            message: 'Our AI chef is taking a quick break. Please try again in a moment!',
            details: error.message // Always show error details for debugging
        });
    }
}

function buildMealPlanPrompt(quizData) {
    return `# FuelFire AI Meal Plan Generation

You are an expert nutritionist and meal planning specialist creating a comprehensive, personalized meal plan for a FuelFire app user.

## User Profile & Goals:
- **Primary Goal**: ${quizData.goal || 'maintenance'}
- **Age**: ${quizData.age} | **Gender**: ${quizData.gender} | **Weight**: ${quizData.weight}lbs
- **Activity Level**: ${quizData.activity || 'moderate'}
- **Body Type**: ${quizData.bodytype || 'unknown'}
- **Target Calories**: ${quizData.calories || 'auto-calculate based on profile'}

## Dietary Restrictions & Preferences:
- **Allergies**: ${quizData.allergies?.join(', ') || 'None'}
- **Additional Allergies**: ${quizData.otherAllergies || 'None'}
- **Dietary Lifestyle**: ${quizData.dietaryLifestyle || 'No restrictions'}

## Food Preferences:
- **Preferred Meats**: ${quizData.meats?.join(', ') || 'All meats'}
- **Meat Frequency**: ${quizData.meatFrequency || 'regular'}
- **Vegetables**: ${quizData.vegetables?.join(', ') || 'All vegetables'}
- **Fruits**: ${quizData.fruits?.join(', ') || 'All fruits'}

## Exercise & Lifestyle:
- **Exercise Type**: ${quizData.exerciseType || 'mixed'}
- **Exercise Frequency**: ${quizData.exerciseFrequency || '3-4 days/week'}
- **Workout Duration**: ${quizData.workoutDuration || '30-45 minutes'}
- **Fitness Goal**: ${quizData.fitnessGoal || 'general health'}

## Meal Planning Preferences:
- **Meals Per Day**: ${quizData.mealsPerDay || '3'} meals
- **Largest Meal**: ${quizData.largestMeal || 'dinner'}
- **Meal Prep Time**: ${quizData.mealPrepTime || 'moderate'}
- **Meal Variety**: ${quizData.mealVariety || 'some-variety'}
- **Cooking Skill**: ${quizData.cookingSkill || 'intermediate'}
- **Kitchen Equipment**: ${quizData.kitchenEquipment?.join(', ') || 'Basic equipment'}
- **Meal Style Preference**: ${quizData.mealStyle || 'balanced'} (creative vs basic vs international)

## Budget & Shopping:
- **Budget Range**: ${quizData.budgetRange || 'moderate'}
- **Preferred Stores**: ${quizData.preferredStores?.join(', ') || 'Any store'}
- **Plan Duration**: ${quizData.planDuration || '2-week'}

## Special Requests:
${quizData.specialRequests || 'None'}

---

# CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
🚨 ABSOLUTELY NO INTRODUCTORY TEXT! 🚨
🚨 DO NOT WRITE "I'll help create..." or ANY explanation! 🚨
🚨 START IMMEDIATELY WITH THE TITLE BELOW! 🚨

YOUR RESPONSE MUST START WITH EXACTLY THIS TITLE (choose based on meal variety):
${quizData.mealVariety === 'same-daily' ? `# 🔥 The Ultimate Simplicity Plan
*Same delicious meals every day for maximum convenience*` : ''}
${quizData.mealVariety === 'weekday-same' ? `# 🔥 5-Day Hustle + Weekend Vibes Plan
*Weekday meal prep mastery with exciting weekend variety*` : ''}
${quizData.mealVariety === 'some-variety' ? `# 🔥 The Balanced Rotation Plan
*Smart variety that keeps things interesting*` : ''}
${quizData.mealVariety === 'full-variety' ? `# 🔥 The Adventure Eater's Dream
*14 days of pure culinary excitement*` : ''}
${quizData.mealVariety === 'office-prep' ? `# 🔥 Office Warrior Meal Strategy
*Work-optimized meals for peak performance*` : ''}
${!quizData.mealVariety || quizData.mealVariety === 'some-variety' ? `# 🔥 Your Custom Fuel Plan
*Perfectly crafted for your ${quizData.goal} goals*` : ''}

## 1. 📅 DAILY MEAL PLANS SECTION
**CRITICAL: You MUST include ALL 14 DAYS (Day 1 through Day 14)**

**Format EXACTLY like this for EVERY day:**

### Day 1:
**🍳 Breakfast:**
- [Meal with exact measurements like "2 scrambled eggs, 1 slice whole grain toast, 1/2 avocado"]
- Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g

**🥗 Lunch:**
- [Meal with exact measurements]  
- Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g

**🍽️ Dinner:**
- [Meal with exact measurements]
- Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g

**🍎 Snacks:**
- [Snack with measurements]

**Daily Total:** [X] calories

### Day 2:
[Same format]

### Day 3:
[Same format]

...continue through...

### Day 14:
[Same format]

## 2. 🛒 SHOPPING LISTS SECTION (CRITICAL - MUST INCLUDE!)
**IMPORTANT: Calculate exact quantities for ALL ingredients across ALL 14 days. This is not optional.**

### Week 1 Shopping List (Days 1-7)
**🥩 Proteins:**
- [Item] - [exact quantity needed for 7 days]
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL proteins used in week 1]

**🥬 Vegetables:**  
- [Item] - [exact quantity needed for 7 days]
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL vegetables used in week 1]

**🍎 Fruits:**
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL fruits used in week 1]

**🥛 Dairy & Eggs:**
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL dairy items used in week 1]

**🌾 Pantry/Dry Goods:**
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL pantry items used in week 1]

**🧂 Spices & Condiments:**
- [List ALL spices, sauces, oils mentioned in week 1 meals]

**🥤 Beverages & Snacks:**
- [Any beverages or packaged snacks mentioned]

**Estimated Total Cost: $[X] (provide realistic estimate based on average grocery prices)**

### Week 2 Shopping List (Days 8-14)
**🥩 Proteins:**
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL proteins used in week 2]

**🥬 Vegetables:**  
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL vegetables used in week 2]

**🍎 Fruits:**
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL fruits used in week 2]

**🥛 Dairy & Eggs:**
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL dairy items used in week 2]

**🌾 Pantry/Dry Goods:**
- [Item] - [exact quantity needed for 7 days]
- [Continue for ALL pantry items used in week 2]

**🧂 Spices & Condiments:**
- [List ALL spices, sauces, oils mentioned in week 2 meals]

**🥤 Beverages & Snacks:**
- [Any beverages or packaged snacks mentioned]

**Estimated Total Cost: $[X] (provide realistic estimate based on average grocery prices)**

## 3. 👨‍🍳 MEAL PREP INSTRUCTIONS
**Sunday Prep (Week 1):**
- [Step-by-step prep instructions]
- [Storage instructions]

**Sunday Prep (Week 2):**
- [Step-by-step prep instructions]

## 4. 📊 NUTRITIONAL SUMMARY
**Daily Averages:**
- Calories: [X]
- Protein: [X]g ([X]%)
- Carbohydrates: [X]g ([X]%)
- Fat: [X]g ([X]%)
- Fiber: [X]g

**How this aligns with your ${quizData.goal} goal:**
[Explanation of nutritional strategy]

## CRITICAL REQUIREMENTS:
- ✅ MUST include detailed shopping lists with exact quantities for EVERY ingredient mentioned
- ✅ Shopping lists must include ALL ingredients from ALL 14 days - nothing can be missing
- ✅ Calculate quantities accurately (if chicken breast appears 3 times at 6oz each = 18oz total)
- ✅ Include spices, oils, condiments, and seasonings - not just main ingredients
- ✅ Use precise measurements (1 cup, 4 oz, 2 tbsp, etc.)
- ✅ Organize content with clear sections and headers
- ✅ Include daily calorie/macro breakdowns
- ✅ Focus on foods from their preferences: ${quizData.meats?.join(', ')}, ${quizData.vegetables?.join(', ')}, ${quizData.fruits?.join(', ')}
- ✅ Match their cooking skill level: ${quizData.cookingSkill}
- ✅ Stay within budget: ${quizData.budgetRange}
- ✅ Consider available equipment: ${quizData.kitchenEquipment?.join(', ')}
- ✅ Provide realistic cost estimates for each week's shopping list
- ✅ Make meals INTERESTING and FLAVORFUL - avoid boring "chicken and rice" repetition
- ✅ Use diverse cuisines, spices, and cooking methods to keep meals exciting

## MEAL STYLE & CREATIVITY INSTRUCTIONS:
**Base meal creativity on user's style preference: ${quizData.mealStyle || 'balanced-creative'}**

${quizData.mealStyle === 'simple-clean' ? `
**SIMPLE & CLEAN APPROACH:**
- Keep meals basic and straightforward
- Use minimal seasonings and simple cooking methods
- Focus on clean, whole foods (grilled chicken, steamed vegetables, etc.)
- Avoid complex recipes or exotic ingredients
- Perfect for those who prefer predictable, healthy meals` : ''}

${quizData.mealStyle === 'balanced-creative' ? `
**BALANCED & CREATIVE APPROACH:**
- Mix simple and creative meals throughout the week
- Use moderate spice levels and familiar flavor combinations
- Include some international dishes but keep them accessible
- Balance comfort foods with healthy options
- Good variety without being overwhelming` : ''}

${quizData.mealStyle === 'international-adventure' ? `
**INTERNATIONAL ADVENTURE APPROACH:**
- Include diverse cuisines (Mediterranean, Asian, Mexican, Indian, etc.)
- Use authentic spices and bold flavor combinations
- Creative cooking methods and interesting ingredients
- Focus on global healthy eating patterns
- Make meals exciting and culturally diverse` : ''}

${quizData.mealStyle === 'comfort-healthy' ? `
**HEALTHY COMFORT FOOD APPROACH:**
- Transform familiar comfort foods into healthier versions
- Use healthier cooking methods for classic dishes
- Maintain familiar flavors but improve nutrition
- Include satisfying, hearty meals that feel indulgent
- Perfect balance of comfort and health` : ''}

${quizData.mealStyle === 'gourmet-exciting' ? `
**GOURMET & EXCITING APPROACH:**
- Use complex flavor profiles and advanced techniques
- Include premium ingredients and sophisticated combinations
- Creative presentations and restaurant-quality meals
- Experiment with unique ingredients and cooking methods
- Push culinary boundaries while maintaining nutrition goals` : ''}

${!quizData.mealStyle ? `
**DEFAULT BALANCED APPROACH:**
- Use interesting spices, marinades, and cooking methods
- Include diverse cuisines (Mediterranean, Asian, Mexican, etc.)
- Add creative twists to basic proteins (cajun chicken, teriyaki salmon, etc.)
- Use fresh herbs, citrus, and flavor combinations
- Avoid repetitive "grilled chicken and rice" - be creative!
- Include satisfying comfort foods that still meet nutritional goals` : ''}

## MEAL VARIETY INSTRUCTIONS:
${quizData.mealVariety === 'same-daily' ? `
- Use the SAME breakfast, lunch, and dinner EVERY DAY (all 14 days)
- Label as: "Daily Meal Plan (Same Every Day)"
- This makes meal prep extremely simple` : ''}
${quizData.mealVariety === 'weekday-same' ? `
- Days 1-5 (Mon-Fri): Use the SAME meals for all weekdays
- Days 6-7 (Sat-Sun): Create DIFFERENT meals for weekends
- Days 8-12 (Mon-Fri): SAME as days 1-5
- Days 13-14 (Sat-Sun): Can be SAME as days 6-7 or different
- Label weekday meals as "Mon-Fri Meal Plan"
- Label weekend meals as "Sat-Sun Meal Plan"` : ''}
${quizData.mealVariety === 'some-variety' ? `
- Provide 2-3 different breakfast options that rotate
- Provide 2-3 different lunch options that rotate
- Dinners can vary each day
- Ensure all 14 days are included` : ''}
${quizData.mealVariety === 'full-variety' ? `
- Create DIFFERENT meals for EVERY SINGLE DAY
- All 14 days should have unique meals
- Maximum variety for those who love cooking` : ''}
${quizData.mealVariety === 'office-prep' ? `
- Office days (Mon/Tue/Thu/Fri): Use SAME meals for meal prep efficiency
- WFH days (Wed/Sat/Sun): Create different meals with more cooking flexibility
- Label office meals as "Office Days Meal Plan"
- Label WFH meals as "WFH Days Meal Plan"` : ''}

🚨🚨🚨 ABSOLUTELY CRITICAL REQUIREMENTS 🚨🚨🚨:
- ✅ FIRST LINE MUST BE THE TITLE (# 🔥 [Title])
- ✅ NO "I'll help create..." or ANY introductory text WHATSOEVER 
- ✅ MUST include ALL 14 days (Day 1, Day 2, Day 3... through Day 14) 
- ✅ Do NOT truncate or shorten the response - FULL CONTENT REQUIRED
- ✅ Include complete shopping lists for both weeks
- ✅ Make sure every day has breakfast, lunch, dinner, and snacks
- ✅ END with the nutritional summary - no additional explanations
- ✅ FAILURE TO FOLLOW = IMMEDIATE REJECTION

🚨 CRITICAL: Your response MUST start with "# 🔥" and include ALL 14 days + shopping lists! 🚨

**REMINDER: This must be a COMPLETE 14-day plan - do not stop at Day 7!**`;
}

function formatMealPlanForApp(rawMealPlan) {
    // Return the raw meal plan without HTML conversion
    // The frontend will handle the formatting
    return rawMealPlan;
}

