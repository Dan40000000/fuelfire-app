// FuelFire Authentication System
// Simple authentication for Claude meal plan generation

const DEFAULT_API_BASE_URL = 'https://fuelfire-app.vercel.app';

function normalizeBaseUrl(value) {
    if (!value) return DEFAULT_API_BASE_URL;
    return value.replace(/\/+$/, '');
}

const API_BASE_URL = normalizeBaseUrl(window.FUELFIRE_API_BASE_URL || DEFAULT_API_BASE_URL);
const CLAUDE_MEAL_PLAN_URL = `${API_BASE_URL}/api/claude-meal-plan`;

class FuelFireAuth {
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.init();
    }

    init() {
        // Check if user has a session
        const sessionId = this.getSessionId();
        if (!sessionId) {
            this.createSession();
        }
    }

    // Create a simple session for tracking usage
    createSession() {
        const sessionId = 'fuelfire_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const user = {
            sessionId: sessionId,
            createdAt: new Date().toISOString(),
            planCount: 0
        };
        
        localStorage.setItem('fuelfire_session', sessionId);
        localStorage.setItem('fuelfire_user', JSON.stringify(user));
        
        console.log('🔥 FuelFire session created:', sessionId);
        return user;
    }

    getSessionId() {
        return localStorage.getItem('fuelfire_session');
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('fuelfire_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Track meal plan generation (for your usage monitoring)
    incrementPlanCount() {
        const user = this.getCurrentUser();
        if (user) {
            user.planCount = (user.planCount || 0) + 1;
            user.lastPlanGenerated = new Date().toISOString();
            localStorage.setItem('fuelfire_user', JSON.stringify(user));
        }
    }

    // Generate meal plan using your Claude account
    async generateMealPlan(quizData) {
        const user = this.getCurrentUser();
        const sessionId = this.getSessionId();

        try {
            console.log('🤖 Sending request to Claude AI...');
            console.log('🔍 API URL:', CLAUDE_MEAL_PLAN_URL);
            console.log('🔍 Quiz data keys:', Object.keys(quizData));
            
            const result = await this.requestMealPlan({
                quizData,
                userId: sessionId,
                timestamp: new Date().toISOString()
            }, { context: 'multi-phase' });
            
            // Track successful generation
            this.incrementPlanCount();
            
            console.log('✅ Meal plan generated successfully!');
            return result;

        } catch (error) {
            console.error('❌ Error generating meal plan:', error);
            throw error;
        }
    }
    
    // Legacy single-phase generation (for Quick Test)
    async generateMealPlanLegacy(quizData) {
        const user = this.getCurrentUser();
        const sessionId = this.getSessionId();

        try {
            console.log('🤖 Sending single-phase request to Claude AI...');
            const result = await this.requestMealPlan({
                quizData,
                userId: sessionId,
                phase: 'legacy',
                timestamp: new Date().toISOString()
            }, { context: 'legacy' });
            
            // Convert to new format for compatibility
            return {
                success: true,
                mealPlan: result.content,
                metadata: result.metadata
            };

        } catch (error) {
            console.error('❌ Error generating meal plan:', error);
            throw error;
        }
    }
    
    async requestMealPlan(body, { context = 'standard' } = {}) {
        const payloadKeys = Object.keys(body || {});
        console.log(`📦 Request payload keys [${context}]:`, payloadKeys);

        const response = await fetch(CLAUDE_MEAL_PLAN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error(`❌ API Response not OK [${context}]:`, response.status, response.statusText);
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                const textData = await response.text();
                console.error(`❌ Raw error response [${context}]:`, textData);
                throw new Error(`API Error ${response.status}: ${textData.substring(0, 200)}`);
            }
            console.error(`❌ Error data [${context}]:`, errorData);
            throw new Error(errorData.message || `API Error ${response.status}`);
        }

        return await response.json();
    }

    // Get user stats (for your monitoring)
    getUserStats() {
        const user = this.getCurrentUser();
        return {
            sessionId: this.getSessionId(),
            planCount: user?.planCount || 0,
            lastGenerated: user?.lastPlanGenerated,
            memberSince: user?.createdAt
        };
    }
}

// Create global auth instance
window.fuelFireAuth = new FuelFireAuth();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuelFireAuth;
}
