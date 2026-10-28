// FuelFire Authentication System
// Simple authentication for Claude meal plan generation

const DEFAULT_API_BASE_URL = 'https://fuelfire-app.vercel.app';

function normalizeBaseUrl(value) {
    if (!value) return DEFAULT_API_BASE_URL;
    return value.replace(/\/+$/, '');
}

const API_BASE_URL = normalizeBaseUrl(window.FUELFIRE_API_BASE_URL || DEFAULT_API_BASE_URL);
const CLAUDE_MEAL_PLAN_URL = `${API_BASE_URL}/api/claude-meal-plan`;
const INSTALLATION_SESSION_KEY = 'fuelfire_installation_session';
const SERVER_RC_APP_USER_ID_KEY = 'fuelfire_server_rc_app_user_id';
const LEGACY_RC_APP_USER_ID_KEY = 'fuelfire_legacy_rc_app_user_id';

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
        this.ensureSession().catch(() => {});
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

    readInstallationSession() {
        try {
            const raw = localStorage.getItem(INSTALLATION_SESSION_KEY);
            const session = raw ? JSON.parse(raw) : null;
            return session && typeof session.token === 'string' && typeof session.rcAppUserId === 'string'
                ? session
                : null;
        } catch (error) {
            return null;
        }
    }

    async ensureSession({ explicitMigration = false } = {}) {
        const sharedAccess = window.__aiAccess;
        if (sharedAccess && typeof sharedAccess.ensureSession === 'function') {
            const session = await sharedAccess.ensureSession({ explicitMigration });
            if (session) this.installationSession = session;
            return session;
        }

        if (this.installationSessionPromise) return this.installationSessionPromise;
        this.installationSessionPromise = (async () => {
            const previous = this.readInstallationSession();
            const currentRcId = localStorage.getItem('rc_app_user_id') || '';
            const serverRcId = localStorage.getItem(SERVER_RC_APP_USER_ID_KEY) || '';
            const preserveServerBinding = explicitMigration || !previous?.token;
            const legacyCandidate = currentRcId || (preserveServerBinding ? serverRcId : '');
            if (legacyCandidate
                && (legacyCandidate !== serverRcId || preserveServerBinding)
                && !localStorage.getItem(LEGACY_RC_APP_USER_ID_KEY)) {
                localStorage.setItem(LEGACY_RC_APP_USER_ID_KEY, legacyCandidate);
            }
            const body = previous?.token
                ? { installationSessionToken: previous.token }
                : {};
            if (explicitMigration) body.explicitMigration = true;
            const response = await fetch(`${this.apiBaseUrl}/api/installation-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (!data?.success
                || typeof data.installationSessionToken !== 'string'
                || !/^fuelfire_[a-f0-9]{48}$/.test(data.rcAppUserId || '')) return null;
            const session = {
                token: data.installationSessionToken,
                rcAppUserId: data.rcAppUserId,
                expiresAt: data.expiresAt || null,
            };
            localStorage.setItem(INSTALLATION_SESSION_KEY, JSON.stringify(session));
            localStorage.setItem(SERVER_RC_APP_USER_ID_KEY, session.rcAppUserId);
            if (!localStorage.getItem(LEGACY_RC_APP_USER_ID_KEY)) {
                localStorage.setItem('rc_app_user_id', session.rcAppUserId);
            }
            this.installationSession = session;
            return session;
        })();
        try {
            return await this.installationSessionPromise;
        } finally {
            this.installationSessionPromise = null;
        }
    }

    async restoreSession() {
        const sharedAccess = window.__aiAccess;
        if (sharedAccess && typeof sharedAccess.restorePurchases === 'function') {
            await sharedAccess.restorePurchases();
            const restored = this.readInstallationSession();
            if (restored && (!restored.expiresAt || Number(restored.expiresAt) > Date.now())) return restored;
            const error = new Error('Secure installation session migration did not complete.');
            error.code = 'INSTALLATION_SESSION_MIGRATION_REQUIRED';
            throw error;
        }

        const migrated = await this.ensureSession({ explicitMigration: true });
        if (migrated) return migrated;
        const error = new Error('Secure installation session migration is unavailable.');
        error.code = 'INSTALLATION_SESSION_MIGRATION_REQUIRED';
        throw error;
    }

    getRequestHeaders() {
        const sharedAccess = window.__aiAccess;
        if (sharedAccess && typeof sharedAccess.getRequestHeaders === 'function') {
            return sharedAccess.getRequestHeaders();
        }

        const headers = {};
        const accessToken = localStorage.getItem('fuelfire_ai_access_token') || '';
        const sessionToken = this.readInstallationSession()?.token || '';
        if (accessToken) headers['X-FuelFire-Access-Token'] = accessToken;
        if (sessionToken) {
            headers['X-FuelFire-Installation-Session'] = sessionToken;
            headers.Authorization = `Bearer ${sessionToken}`;
        }
        return headers;
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

        const session = await this.ensureSession();
        if (!session) {
            const error = new Error('Secure installation session renewal is required before generating a meal plan.');
            error.code = 'INSTALLATION_SESSION_RENEWAL_REQUIRED';
            throw error;
        }

        const response = await fetch(CLAUDE_MEAL_PLAN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getRequestHeaders(),
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
