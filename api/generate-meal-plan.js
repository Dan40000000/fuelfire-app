// Backend API endpoint for meal plan generation using Claude AI
// This file should be deployed to your server (e.g., Vercel, Netlify Functions, or Express.js)

import { callClaude, getClaudeModel } from './_lib/anthropic.js';
import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) {
        return;
    }
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['POST'])) {
        return;
    }

    try {
        const body = req.body || {};
        const { prompt, userToken } = body;

        // Validate user token (implement your auth logic here)
        if (!userToken) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!process.env.CLAUDE_API_KEY) {
            return res.status(500).json({
                error: 'Claude API key missing',
                message: 'Configure CLAUDE_API_KEY in environment variables',
            });
        }

        // Call Claude AI API
        const result = await callClaude({
            prompt,
            maxTokens: 4000,
            temperature: 0.3,
            tags: ['meal-plan', 'single-endpoint'],
        });
        const mealPlan = result.text;

        // Format the meal plan for better display
        const formattedMealPlan = formatMealPlan(mealPlan);

        res.status(200).json({
            success: true,
            mealPlan: formattedMealPlan,
            model: getClaudeModel(),
            apiKeyRedacted: result.metadata.apiKey,
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
