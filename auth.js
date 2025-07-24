// Simple authentication system for FuelFire app
// This handles user login and token management for AI meal plan generation

class FuelFireAuth {
    constructor() {
        this.apiBaseUrl = window.location.origin; // Use same domain for API calls
        this.init();
    }

    init() {
        // Check if user is already logged in
        const token = this.getStoredToken();
        if (token) {
            this.validateToken(token);
        }
    }

    // Simple login - in production, this would connect to your auth provider
    async login(email, password) {
        try {
            // For demo purposes, we'll create a simple token
            // In production, this would authenticate with your backend
            const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.storeToken(data.token, data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: 'Invalid credentials' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Login failed' };
        }
    }

    // Quick demo login for testing
    demoLogin() {
        const demoToken = 'demo-' + Date.now();
        const demoUser = {
            id: 'demo-user',
            email: 'demo@fuelfire.com',
            name: 'Demo User'
        };
        
        this.storeToken(demoToken, demoUser);
        return { success: true, user: demoUser };
    }

    storeToken(token, user) {
        localStorage.setItem('fuelfire_token', token);
        localStorage.setItem('fuelfire_user', JSON.stringify(user));
        this.currentUser = user;
        this.currentToken = token;
    }

    getStoredToken() {
        return localStorage.getItem('fuelfire_token');
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('fuelfire_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    async validateToken(token) {
        // In production, this would validate the token with your backend
        // For now, we'll assume demo tokens are valid
        if (token.startsWith('demo-')) {
            this.currentToken = token;
            this.currentUser = this.getCurrentUser();
            return true;
        }
        return false;
    }

    logout() {
        localStorage.removeItem('fuelfire_token');
        localStorage.removeItem('fuelfire_user');
        this.currentToken = null;
        this.currentUser = null;
    }

    isLoggedIn() {
        return !!this.currentToken;
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.currentToken}`,
            'Content-Type': 'application/json'
        };
    }
}

// Create global auth instance
window.fuelFireAuth = new FuelFireAuth();