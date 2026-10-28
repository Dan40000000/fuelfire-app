// Backend API endpoint for meal plan generation using Claude AI
// This file should be deployed to your server (e.g., Vercel, Netlify Functions, or Express.js)

import { callClaude, getClaudeModel } from './_lib/anthropic.js';
import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';
import { requireAiAccess } from './_lib/security.js';
import { createProviderBudget } from './_lib/provider-budget.js';
import { getRequestBody, requireBodyLimit } from './_lib/request-security.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

const MAX_BODY_BYTES = 96 * 1024;
const MAX_PROMPT_LENGTH = 64 * 1024;

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
        if (!body || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > MAX_PROMPT_LENGTH) {
            return res.status(400).json({
                success: false,
                error: 'A bounded prompt is required.',
                code: 'INVALID_PROMPT_SCHEMA',
            });
        }

        const access = await requireAiAccess(req, res, { capability: 'planning' });
        if (!access) return;

        if (!process.env.CLAUDE_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Meal-plan provider is not configured.',
                code: 'PROVIDER_CONFIG_REQUIRED',
            });
        }

        // Call Claude AI API
        const result = await callClaude({
            prompt: body.prompt.trim(),
            maxTokens: 4000,
            temperature: 0.3,
            tags: ['meal-plan', 'single-endpoint'],
            providerBudget: createProviderBudget({ limit: process.env.FUELFIRE_MEAL_PLAN_PROVIDER_BUDGET || 3 }),
        });
        const mealPlan = result.text;

        // Format the meal plan for better display
        const formattedMealPlan = formatMealPlan(mealPlan);

        res.status(200).json({
            success: true,
            mealPlan: formattedMealPlan,
            model: getClaudeModel(),
        });

    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({
            error: 'Failed to generate meal plan',
            message: 'Our AI chef is taking a quick break. Please try again in a moment.',
        });
    }
}

function formatMealPlan(rawMealPlan) {
    // Format the raw text response into structured HTML
    let formatted = escapeHtml(rawMealPlan);
    
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

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[character]));
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
