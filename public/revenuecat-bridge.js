(function() {
    const STORAGE_KEY = 'fuelfire_ai_access';

    function saveStatus(status) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
        if (window.__aiAccess && typeof window.__aiAccess.saveStatus === 'function') {
            window.__aiAccess.saveStatus(status);
        }
    }

    function logEvent(event) {
        try {
            fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            }).catch(() => {});
        } catch (e) {
            // ignore
        }
    }

    function applyEntitlement(payload = {}) {
        const plan = payload.entitlement || payload.plan || 'premium';
        const expiresAt = payload.expiresAt || null;
        const email = payload.email || 'ios_user';
        const name = payload.name || payload.userName || email || 'iOS User';

        const status = {
            plan,
            source: 'revenuecat',
            expiresAt: expiresAt ? new Date(expiresAt).getTime() : null
        };
        saveStatus(status);
        logEvent({
            action: 'revenuecat_entitlement',
            plan,
            expiresAt,
            platform: 'apple_iap',
            user: { email, name }
        });
    }

    window.RCBridge = {
        applyEntitlement
    };

    // Allow native → webview postMessage with { type: 'RC_ENTITLEMENT', entitlement, email, name, expiresAt }
    window.addEventListener('message', (event) => {
        const data = event?.data || {};
        if (data.type === 'RC_ENTITLEMENT') {
            applyEntitlement(data);
        }
    });
})();
