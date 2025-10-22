// Backend API endpoint for meal plan generation using Claude AI
// This file should be deployed to your server (e.g., Vercel, Netlify Functions, or Express.js)

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, userToken } = req.body;

        // Validate user token (implement your auth logic here)
        if (!userToken) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Call Claude AI API
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY, // Store your Claude API key in environment variables
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!claudeResponse.ok) {
            throw new Error(`Claude API error: ${claudeResponse.status}`);
        }

        const claudeData = await claudeResponse.json();
        const mealPlan = claudeData.content[0].text;

        // Format the meal plan for better display
        const formattedMealPlan = formatMealPlan(mealPlan);

        res.status(200).json({
            success: true,
            mealPlan: formattedMealPlan
        });

    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({
            error: 'Failed to generate meal plan',
            message: error.message
        });
    }
}

function formatMealPlan(rawMealPlan) {
    // Format the raw text response into structured HTML
    let formatted = rawMealPlan;
    
    // Convert markdown-style headers to HTML
    formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2 class="section-header">$1</h2>');
    formatted = formatted.replace(/^### (.*$)/gm, '<h3 class="day-header">$1</h3>');
    
    // Convert bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert line breaks to HTML
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = '<p>' + formatted + '</p>';
    
    // Add structured sections
    formatted = addStructuredSections(formatted);
    
    return formatted;
}

function addStructuredSections(content) {
    // Add specific styling and structure for different sections
    
    // Style meal plans
    content = content.replace(/(Day \d+:.*?(?=Day \d+:|Week \d+ Shopping List|$))/gs, 
        '<div class="day">$1</div>');
    
    // Style shopping lists
    content = content.replace(/(Week \d+ Shopping List:.*?(?=Week \d+ Shopping List:|Nutritional Summary|$))/gs, 
        '<div class="shopping-list">$1</div>');
    
    // Style meals within days
    content = content.replace(/(Breakfast:|Lunch:|Dinner:|Snack:)(.*?)(?=Breakfast:|Lunch:|Dinner:|Snack:|<\/div>)/gs, 
        '<div class="meal"><strong>$1</strong>$2</div>');
    
    // Style nutritional info
    content = content.replace(/(Calories:.*?Fat:.*?)/g, 
        '<div class="nutrition">$1</div>');
    
    return content;
}