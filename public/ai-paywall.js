// AI paywall helper using RevenueCat entitlements (iOS/Android) with a local promo fallback
(function() {
    const STORAGE_KEY = 'fuelfire_ai_access';
    const RC_KEY = 'appl_jODVYiKLuaYmvESjhFcYJGaVkLe'; // RevenueCat public SDK key (Apple)
    const RC_PACKAGE_MAP = {
        premium: 'premium_monthly',
        trial_week: 'premium_monthly', // intro offer configured in App Store Connect
        voice_trial: 'premium_monthly',
        core: 'Core_monthly',
        elite: 'Elite_monthly',
        coaching_single: 'Coaching_single',
        coaching_package: 'Coaching_package'
    };
    // Entitlement identifiers from RevenueCat dashboard (case-sensitive)
    const RC_ENTITLEMENTS_FOR_AI = ['Premium_Access', 'Elite_access'];
    let rcReady = false;
    let rcEntitlements = {};
    let offeringsCache = null;

    function readStatus() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { plan: 'none' };
        try {
            return JSON.parse(raw);
        } catch (e) {
            return { plan: 'none' };
        }
    }

    function saveStatus(status) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
    }

    const EVENT_KEY = 'fuelfire_subscription_events';
    function getEvents() {
        try {
            return JSON.parse(localStorage.getItem(EVENT_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }
    function saveEvents(events) {
        localStorage.setItem(EVENT_KEY, JSON.stringify(events));
    }

    function parseQueryFlags() {
        const params = new URLSearchParams(window.location.search || '');
        if (params.get('aiPaid') === '1') {
            saveStatus({ plan: 'premium', source: 'stripe' });
            logEvent({ action: 'stripe_return', plan: 'premium' });
        }
    }

    function getUserContext() {
        const name = localStorage.getItem('userName') || document.querySelector('#userName')?.textContent || 'Unknown User';
        const email = document.querySelector('#userEmail')?.textContent || localStorage.getItem('userEmail') || 'unknown@example.com';
        return { name, email };
    }

    function logEvent(event) {
        const events = getEvents();
        const ctx = getUserContext();
        events.unshift({
            ...event,
            user: ctx,
            ts: new Date().toISOString()
        });
        saveEvents(events.slice(0, 200)); // cap

        // Fire-and-forget to backend
        fetch('/api/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...event, user: ctx })
        }).catch(err => console.warn('Subscription log error', err));
    }

    function getPurchasesPlugin() {
        return (window.Capacitor?.Plugins?.Purchases) || (window.capacitor?.Plugins?.Purchases) || null;
    }

    async function initRevenueCat() {
        if (rcReady) return true;
        const Purchases = getPurchasesPlugin();
        if (!Purchases) {
            console.warn('RevenueCat Purchases plugin not available yet.');
            return false;
        }
        try {
            const appUserID = localStorage.getItem('rc_app_user_id') || `anon_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem('rc_app_user_id', appUserID);
            await Purchases.configure({
                apiKey: RC_KEY,
                appUserID
            });
            rcReady = true;
            Purchases.addCustomerInfoUpdateListener(async () => {
                await refreshEntitlements();
            });
            await refreshEntitlements();
            return true;
        } catch (err) {
            console.error('RevenueCat configure failed', err);
            return false;
        }
    }

    async function refreshEntitlements() {
        const Purchases = getPurchasesPlugin();
        if (!Purchases) return;
        try {
            const { customerInfo } = await Purchases.getCustomerInfo();
            rcEntitlements = customerInfo?.entitlements?.active || {};
            localStorage.setItem('rc_entitlements', JSON.stringify(rcEntitlements));
        } catch (err) {
            console.warn('Failed to refresh RevenueCat entitlements', err);
        }
    }

    function getCachedEntitlements() {
        if (rcEntitlements && Object.keys(rcEntitlements).length) return rcEntitlements;
        try {
            const raw = localStorage.getItem('rc_entitlements');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    async function getOfferings() {
        if (offeringsCache) return offeringsCache;
        const Purchases = getPurchasesPlugin();
        if (!Purchases) return null;
        try {
            const offerings = await Purchases.getOfferings();
            // Check if offerings are empty (common during development)
            if (!offerings?.current?.availablePackages?.length) {
                console.info('RevenueCat: No packages in current offering. Configure packages in RevenueCat dashboard: https://app.revenuecat.com');
            }
            offeringsCache = offerings;
            return offerings;
        } catch (err) {
            // Suppress verbose error during development when offerings aren't configured
            if (err?.message?.includes('empty') || err?.message?.includes('No packages')) {
                console.info('RevenueCat: Offerings not configured yet. This is normal during development.');
                return null;
            }
            console.warn('Failed to load offerings', err);
            return null;
        }
    }

    async function findPackageById(identifier) {
        const offerings = await getOfferings();
        if (!offerings) return null;
        const allOfferings = Object.values(offerings?.all || {});
        for (const off of allOfferings) {
            if (!off?.availablePackages) continue;
            const match = off.availablePackages.find(p => p.identifier === identifier);
            if (match) return match;
        }
        return null;
    }

    async function purchasePackage(planKey) {
        const Purchases = getPurchasesPlugin();
        if (!Purchases) {
            alert('In-app purchases are not available on this device/build.');
            return;
        }
        const pkgId = RC_PACKAGE_MAP[planKey] || RC_PACKAGE_MAP.premium;
        const pkg = await findPackageById(pkgId);
        if (!pkg) {
            alert('Offer is not available right now. Please try again later.');
            return;
        }
        try {
            const result = await Purchases.purchasePackage({ aPackage: pkg });
            rcEntitlements = result?.customerInfo?.entitlements?.active || {};
            localStorage.setItem('rc_entitlements', JSON.stringify(rcEntitlements));
            logEvent({ action: 'purchase', plan: planKey, package: pkgId, entitlements: Object.keys(rcEntitlements) });
            alert('✅ Purchase complete.');
        } catch (err) {
            if (err?.userCancelled) {
                console.info('Purchase cancelled by user');
                return;
            }
            console.error('Purchase failed', err);
            alert('Purchase failed. Please try again.');
        }
    }

    async function restorePurchases() {
        const Purchases = getPurchasesPlugin();
        if (!Purchases) {
            alert('In-app purchases are not available on this device/build.');
            return;
        }
        try {
            const { customerInfo } = await Purchases.restorePurchases();
            rcEntitlements = customerInfo?.entitlements?.active || {};
            localStorage.setItem('rc_entitlements', JSON.stringify(rcEntitlements));
            logEvent({ action: 'restore', entitlements: Object.keys(rcEntitlements) });
            alert('Restored purchases.');
        } catch (err) {
            console.error('Restore failed', err);
            alert('Restore failed. Please try again.');
        }
    }

    function isFoodLoggingContext() {
        const path = (window.location.pathname || '').toLowerCase();
        return path.includes('calorie') || path.includes('food');
    }

    function hasAccess() {
        const entitlements = getCachedEntitlements();
        const entitlementKeys = Object.keys(entitlements || {});
        if (entitlementKeys.some(key => RC_ENTITLEMENTS_FOR_AI.includes(key))) return true;

        // Fallback to local selections (legacy UI, non-binding)
        const plan = (localStorage.getItem('selectedPlan') || localStorage.getItem('subscriptionPlan') || '').toLowerCase();
        if (plan === 'elite' || plan === 'premium') return true;

        // Fallback to local paywall overrides
        const status = readStatus();
        if (status.plan === 'premium' || status.plan === 'promo') return true;
        if (status.plan === 'owner_unlock') return true; // manual indefinite unlock
        if (status.plan === 'promo_day' && status.expiresAt && Date.now() < status.expiresAt) return true;
        if (status.plan === 'promo_ai_log' && status.expiresAt && Date.now() < status.expiresAt) {
            return isFoodLoggingContext();
        }
        if (status.plan === 'trial' && status.expiresAt && Date.now() < status.expiresAt) return true;
        return false;
    }

    function ensurePaywall(actionLabel) {
        let modal = document.getElementById('ai-paywall');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ai-paywall';
            modal.style.cssText = 'position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,8,18,0.7);backdrop-filter:blur(12px);';
            modal.innerHTML = `
                <div style="background:#0f172a;color:#fff;border-radius:20px;padding:20px;border:1px solid rgba(255,255,255,0.08);max-width:420px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.35);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h2 style="margin:0;font-size:1.3rem;">Unlock AI Access</h2>
                        <button id="ai-paywall-close" style="background:transparent;border:none;color:#fff;font-size:1.3rem;cursor:pointer;">✕</button>
                    </div>
                    <p id="ai-paywall-action" style="margin:6px 0 12px;opacity:0.85;font-size:0.95rem;"></p>
                    <div style="display:grid;gap:8px;font-size:0.9rem;opacity:0.9;">
                        <div>• Voice food logging</div>
                        <div>• AI typing & smart search</div>
                        <div>• Diet creation</div>
                        <div>• Custom workouts</div>
                    </div>
                    <div style="margin:14px 0 10px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-weight:800;margin-bottom:4px;">Premium access</div>
                        <div style="font-size:0.9rem;opacity:0.85;">Apple/Google in-app purchase. Cancel anytime.</div>
                    </div>
                    <div style="display:grid;gap:8px;margin:8px 0;">
                        <button id="ai-start-trial" style="width:100%;background:linear-gradient(135deg,#4B9CD3,#8e54e9);border:none;color:#fff;padding:14px;border-radius:12px;font-weight:800;cursor:pointer;">Start subscription</button>
                        <button id="ai-trial-1week" style="width:100%;background:#e8f4ff;border:1px solid #4B9CD3;color:#0b1a2b;padding:12px;border-radius:12px;font-weight:800;cursor:pointer;">$1 · 48h food logging trial</button>
                        <button id="ai-voice-trial" style="width:100%;background:#f7f0ff;border:1px solid #8e54e9;color:#3a2950;padding:12px;border-radius:12px;font-weight:800;cursor:pointer;">AI voice add-on</button>
                        <button id="ai-restore" style="width:100%;background:#0f172a;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:12px;border-radius:12px;font-weight:700;cursor:pointer;">Restore purchases</button>
                    </div>
                    <div style="margin-top:8px;">
                        <label for="ai-promo-input" style="display:block;font-weight:700;font-size:0.9rem;margin-bottom:6px;">Have a promo?</label>
                        <div style="display:flex;gap:8px;">
                            <input id="ai-promo-input" type="text" placeholder="Enter promo code" style="flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;">
                            <button id="ai-apply-promo" style="background:#18c964;border:none;color:#0b1a2b;padding:12px 14px;border-radius:10px;font-weight:800;cursor:pointer;">Apply</button>
                        </div>
                        <div style="margin-top:6px;font-size:0.85rem;opacity:0.8;">Owner/testing? Use your promo to unlock for free.</div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('#ai-paywall-close').onclick = () => modal.remove();
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
            modal.querySelector('#ai-start-trial').onclick = () => {
                purchasePackage('premium');
            };
            modal.querySelector('#ai-trial-1week').onclick = () => {
                const expiresAt = Date.now() + 48 * 60 * 60 * 1000; // 48h food logging only
                saveStatus({ plan: 'promo_ai_log', promoCode: 'trial_food', expiresAt });
                logEvent({ action: 'trial_food', plan: 'promo_ai_log', expiresAt });
                alert('✅ 48-hour AI food logging trial activated. Meal plans and other AI stay locked.');
                modal.remove();
            };
            modal.querySelector('#ai-voice-trial').onclick = () => {
                purchasePackage('voice_trial');
            };
            modal.querySelector('#ai-restore').onclick = () => {
                restorePurchases();
            };
            modal.querySelector('#ai-apply-promo').onclick = () => {
                const code = modal.querySelector('#ai-promo-input').value.trim();
                if (!code) {
                    alert('Enter a promo code to unlock.');
                    return;
                }
                const normalized = code.toLowerCase();
                if (normalized === 'dan') {
                    saveStatus({ plan: 'owner_unlock', promoCode: code });
                    logEvent({ action: 'promo', code, plan: 'owner_unlock' });
                    alert('✅ Promo DAN applied. Unlimited access granted until you revoke it.');
                } else if (normalized === 'ai') {
                    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
                    saveStatus({ plan: 'promo_day', promoCode: code, expiresAt });
                    logEvent({ action: 'promo', code, plan: 'promo_day', expiresAt });
                    alert('✅ AI unlocked for 24 hours.');
                } else {
                    saveStatus({ plan: 'promo', promoCode: code });
                    logEvent({ action: 'promo', code, plan: 'promo' });
                    alert(`✅ Promo applied: ${code}. AI unlocked.`);
                }
                modal.remove();
            };
        }
        const actionEl = modal.querySelector('#ai-paywall-action');
        actionEl.textContent = `AI required for ${actionLabel || 'this feature'}. Choose a trial or promo to continue.`;
        return modal;
    }

    window.requireAIAccess = function(actionLabel) {
        if (hasAccess()) return true;
        ensurePaywall(actionLabel);
        return false;
    };

    // Expose helpers for debugging if needed
    window.__aiAccess = {
        hasAccess,
        readStatus,
        saveStatus,
        getEvents,
        refreshEntitlements,
        purchasePackage,
        restorePurchases
    };

    parseQueryFlags();
    initRevenueCat();
})();
