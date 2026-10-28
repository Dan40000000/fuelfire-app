(function() {
    const STORAGE_KEY = 'fuelfire_ai_access';

    function saveStatus(status) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
        if (window.__aiAccess && typeof window.__aiAccess.saveStatus === 'function') {
            window.__aiAccess.saveStatus(status);
        }
    }

    function applyEntitlement(payload = {}) {
        const rcAppUserId = payload.rcAppUserId || payload.appUserID || '';
        const isBound = window.__aiAccess?.isBoundCustomerId;
        if (!rcAppUserId || typeof isBound !== 'function' || !isBound(String(rcAppUserId))) {
            return { accepted: false, reason: 'unbound_revenuecat_identity' };
        }
        const plan = payload.entitlement || payload.plan || '';
        if (!plan) return { accepted: false, reason: 'missing_entitlement' };
        const expiresAt = payload.expiresAt || null;

        const status = {
            plan,
            source: 'revenuecat',
            expiresAt: expiresAt ? new Date(expiresAt).getTime() : null
        };
        saveStatus(status);
        return { accepted: true };
    }

    window.RCBridge = {
        applyEntitlement
    };

    // Allow native → webview postMessage with { type: 'RC_ENTITLEMENT', rcAppUserId, entitlement, expiresAt }.
    window.addEventListener('message', (event) => {
        const data = event?.data || {};
        if (data.type === 'RC_ENTITLEMENT') {
            applyEntitlement(data);
        }
    });
})();
