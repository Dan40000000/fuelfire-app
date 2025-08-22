// Simple test endpoint to check if Claude API key is working
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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
        const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 50,
                messages: [
                    {
                        role: 'user',
                        content: 'Say "API key is working!" and nothing else.'
                    }
                ]
            })
        });

        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('Claude API Error:', errorText);
            return res.status(500).json({
                error: 'Claude API call failed',
                status: testResponse.status,
                statusText: testResponse.statusText,
                errorDetails: errorText.substring(0, 200),
                hasApiKey,
                apiKeyLength,
                apiKeyPrefix
            });
        }

        const testData = await testResponse.json();
        
        return res.status(200).json({
            success: true,
            message: 'Claude API key is working perfectly!',
            claudeResponse: testData.content[0].text,
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