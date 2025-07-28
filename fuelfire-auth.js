// FuelFire Authentication System
// Simple authentication for Claude meal plan generation

class FuelFireAuth {
    constructor() {
        this.apiBaseUrl = window.location.origin;
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
            console.log('🔍 API URL:', `${this.apiBaseUrl}/api/claude-meal-plan`);
            console.log('🔍 Quiz data keys:', Object.keys(quizData));
            
            const response = await fetch('/api/claude-meal-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quizData: quizData,
                    userId: sessionId,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                console.error('❌ API Response not OK:', response.status, response.statusText);
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    const textData = await response.text();
                    console.error('❌ Raw error response:', textData);
                    throw new Error(`API Error ${response.status}: ${textData.substring(0, 200)}`);
                }
                console.error('❌ Error data:', errorData);
                throw new Error(errorData.message || `API Error ${response.status}`);
            }

            const result = await response.json();
            
            // Track successful generation
            this.incrementPlanCount();
            
            console.log('✅ Meal plan generated successfully!');
            return result;

        } catch (error) {
            console.error('❌ Error generating meal plan:', error);
            throw error;
        }
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