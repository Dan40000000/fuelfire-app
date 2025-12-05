// Simple test endpoint to check if Claude API key is working

import { callClaude, getClaudeModel } from './_lib/anthropic.js';
import { applyCors, handleCorsPreflight, ensureMethod } from './_lib/http.js';

const corsOptions = {
    methods: ['GET', 'POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) {
        return;
    }
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['GET', 'POST'])) {
        return;
    }

    try {
        // Check environment variables
        const hasApiKey = !!process.env.CLAUDE_API_KEY;
        const apiKeyLength = process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.length : 0;
        const apiKeyPrefix = process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.substring(0, 15) : 'None';
        
        console.log('🔍 API Key Test Results:');
        console.log('- Has API Key:', hasApiKey);
        console.log('- API Key Length:', apiKeyLength);
        console.log('- API Key Prefix:', apiKeyPrefix);
        console.log('- All env vars:', Object.keys(process.env).join(', '));

        if (!hasApiKey) {
            return res.status(400).json({
                error: 'No API key found',
                hasApiKey,
                availableEnvVars: Object.keys(process.env),
                message: 'Claude API key is not configured in Vercel environment variables'
            });
        }

        // Test a simple Claude API call
        const result = await callClaude({
            prompt: 'Say "API key is working!" and nothing else.',
            maxTokens: 20,
            temperature: 0,
            tags: ['healthcheck'],
        });
        
        return res.status(200).json({
            success: true,
            message: 'Claude API key is working perfectly!',
            claudeResponse: result.text,
            model: getClaudeModel(),
            apiKeyRedacted: result.metadata.apiKey,
            hasApiKey,
            apiKeyLength,
            apiKeyPrefix
        });

    } catch (error) {
        console.error('Test endpoint error:', error);
        return res.status(500).json({
            error: 'Test failed',
            message: error.message,
            stack: error.stack.substring(0, 300)
        });
    }
}
