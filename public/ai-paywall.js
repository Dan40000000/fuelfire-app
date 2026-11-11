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
    const AI_ACCESS_TOKEN_KEY = 'fuelfire_ai_access_token';
    const INSTALLATION_SESSION_KEY = 'fuelfire_installation_session';
    const SERVER_RC_APP_USER_ID_KEY = 'fuelfire_server_rc_app_user_id';
    const LEGACY_RC_APP_USER_ID_KEY = 'fuelfire_legacy_rc_app_user_id';
    const RC_MIGRATION_REQUIRED_KEY = 'fuelfire_rc_migration_required';
    const RC_MIGRATION_COMPLETE_KEY = 'fuelfire_rc_migration_complete';
    const PRODUCTION_API_ORIGIN = 'https://fuelfire-app.vercel.app';
    const AI_API_PATHS = new Set([
        '/api/accuracy-lab-session',
        '/api/ai-food-parser',
        '/api/ai-food-vision',
        '/api/client-diagnostics',
        '/api/claude-meal-plan',
        '/api/generate-meal-plan',
        '/api/ai-workout-plan',
        '/api/treadmill-vision',
        '/api/usda-food-search'
    ]);
    const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    let rcReady = false;
    let rcEntitlements = {};
    let offeringsCache = null;
    let installationSessionPromise = null;

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

    function logEvent(event) {
        const events = getEvents();
        const safeEvent = {
            action: typeof event?.action === 'string' ? event.action.slice(0, 80) : 'unknown',
            ...(typeof event?.plan === 'string' ? { plan: event.plan.slice(0, 80) } : {}),
            ...(typeof event?.package === 'string' ? { package: event.package.slice(0, 120) } : {}),
            ts: new Date().toISOString(),
        };
        events.unshift({
            ...safeEvent,
        });
        saveEvents(events.slice(0, 200)); // cap
    }

    function readInstallationSession() {
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

    function rememberLegacyRevenueCatId({ preserveServerBinding = false } = {}) {
        const currentId = localStorage.getItem('rc_app_user_id') || '';
        const serverId = localStorage.getItem(SERVER_RC_APP_USER_ID_KEY) || '';
        const candidate = currentId || (preserveServerBinding ? serverId : '');
        if (candidate && (candidate !== serverId || preserveServerBinding) && !localStorage.getItem(LEGACY_RC_APP_USER_ID_KEY)) {
            localStorage.setItem(LEGACY_RC_APP_USER_ID_KEY, candidate);
        }
        return localStorage.getItem(LEGACY_RC_APP_USER_ID_KEY) || '';
    }

    function hasUsableInstallationSession(session) {
        if (!session) return false;
        if (!session.expiresAt) return true;
        const expiresAt = Number(session.expiresAt);
        return Number.isFinite(expiresAt) && expiresAt > Date.now();
    }

    async function ensureSession({ explicitMigration = false, reuseCurrent = false } = {}) {
        if (installationSessionPromise) return installationSessionPromise;
        if (reuseCurrent && !explicitMigration) {
            const currentSession = readInstallationSession();
            if (hasUsableInstallationSession(currentSession)) return currentSession;
        }
        installationSessionPromise = (async () => {
            const previousSession = readInstallationSession();
            const legacyId = rememberLegacyRevenueCatId({
                preserveServerBinding: explicitMigration || !previousSession?.token,
            });
            const body = previousSession?.token
                ? { installationSessionToken: previousSession.token }
                : {};
            if (explicitMigration) body.explicitMigration = true;
            const request = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            };
            try {
                if (!nativeFetch) return null;
                const response = await nativeFetch(resolveInstallationSessionUrl(), request);
                if (!response.ok) return null;
                const data = await response.json();
                if (!data?.success
                    || typeof data.installationSessionToken !== 'string'
                    || !/^fuelfire_[a-f0-9]{48}$/.test(data.rcAppUserId || '')) {
                    return null;
                }

                const session = {
                    token: data.installationSessionToken,
                    rcAppUserId: data.rcAppUserId,
                    expiresAt: data.expiresAt || null,
                };
                localStorage.setItem(INSTALLATION_SESSION_KEY, JSON.stringify(session));
                localStorage.setItem(SERVER_RC_APP_USER_ID_KEY, session.rcAppUserId);

                if (legacyId && legacyId !== session.rcAppUserId) {
                    localStorage.setItem(RC_MIGRATION_REQUIRED_KEY, '1');
                    localStorage.removeItem(RC_MIGRATION_COMPLETE_KEY);
                } else if (!legacyId) {
                    localStorage.setItem('rc_app_user_id', session.rcAppUserId);
                }
                return session;
            } catch (error) {
                console.warn('FuelFire installation session unavailable; server authorization remains authoritative.');
                return null;
            }
        })();

        try {
            return await installationSessionPromise;
        } finally {
            installationSessionPromise = null;
        }
    }

    function getServerRcAppUserId() {
        return localStorage.getItem(SERVER_RC_APP_USER_ID_KEY) || readInstallationSession()?.rcAppUserId || '';
    }

    function isBoundCustomerId(appUserId) {
        return Boolean(appUserId && getServerRcAppUserId() && appUserId === getServerRcAppUserId());
    }

    function migrationRequired() {
        return localStorage.getItem(RC_MIGRATION_REQUIRED_KEY) === '1'
            && localStorage.getItem(RC_MIGRATION_COMPLETE_KEY) !== '1';
    }

    function getPurchasesPlugin() {
        return (window.Capacitor?.Plugins?.Purchases) || (window.capacitor?.Plugins?.Purchases) || null;
    }

    async function initRevenueCat() {
        if (rcReady) return true;
        const session = await ensureSession();
        if (!session) {
            console.warn('RevenueCat is waiting for a server-issued installation session.');
            return false;
        }
        const Purchases = getPurchasesPlugin();
        if (!Purchases) {
            console.warn('RevenueCat Purchases plugin not available yet.');
            return false;
        }
        try {
            const legacyId = rememberLegacyRevenueCatId();
            const appUserID = migrationRequired() && legacyId ? legacyId : session.rcAppUserId;
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
            saveAuthoritativeEntitlements(customerInfo?.entitlements?.active);
        } catch (err) {
            console.warn('Failed to refresh RevenueCat entitlements', err);
        }
    }

    function saveAuthoritativeEntitlements(active) {
        if (!active || typeof active !== 'object' || Array.isArray(active)) {
            throw new Error('RevenueCat returned invalid active entitlements.');
        }
        rcEntitlements = active;
        if (Object.keys(active).length) {
            localStorage.setItem('rc_entitlements', JSON.stringify(active));
        } else {
            localStorage.removeItem('rc_entitlements');
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
        if (migrationRequired()) {
            alert('Restore/migrate your existing purchases before starting a new subscription on this installation.');
            return;
        }
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
            const active = result?.customerInfo?.entitlements?.active || {};
            saveAuthoritativeEntitlements(active);
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
        try {
            let session = await ensureSession();
            if (!session) {
                // An expired session cannot authorize a new identity silently. A
                // user-selected restore is the only path that may issue one.
                session = await ensureSession({ explicitMigration: true });
            }
            const Purchases = getPurchasesPlugin();
            if (!session || !Purchases) {
                alert('Secure restore is unavailable until this app can reach FuelFire. Existing access was kept.');
                return;
            }
            if (!rcReady && !(await initRevenueCat())) {
                alert('Secure restore is unavailable until RevenueCat is ready. Existing access was kept.');
                return;
            }
            if (migrationRequired()) {
                const legacyId = rememberLegacyRevenueCatId();
                if (!session || !legacyId || typeof Purchases.logIn !== 'function') {
                    alert('Restore/migration is not available until the app can securely bind this installation.');
                    return;
                }
                // The user explicitly selected restore/migrate. Preserve the old customer
                // until RevenueCat has completed the link, then switch to the server ID.
                const legacyRestored = await Purchases.restorePurchases();
                const legacyActive = legacyRestored?.customerInfo?.entitlements?.active || {};
                saveAuthoritativeEntitlements(legacyActive);
                const loginResult = await Purchases.logIn({ appUserID: session.rcAppUserId });
                localStorage.setItem('rc_app_user_id', session.rcAppUserId);
                localStorage.setItem(RC_MIGRATION_COMPLETE_KEY, '1');
                localStorage.removeItem(RC_MIGRATION_REQUIRED_KEY);
                const migrated = loginResult?.customerInfo?.entitlements?.active || {};
                saveAuthoritativeEntitlements(migrated);
                const restored = await Purchases.restorePurchases();
                const restoredActive = restored?.customerInfo?.entitlements?.active || {};
                saveAuthoritativeEntitlements(restoredActive);
                logEvent({ action: 'restore_migrate', entitlements: Object.keys(rcEntitlements) });
                alert(Object.keys(rcEntitlements).length ? 'Purchases restored and securely migrated.' : 'Restore completed. No active purchases were found.');
                return;
            }

            const { customerInfo } = await Purchases.restorePurchases();
            const active = customerInfo?.entitlements?.active || {};
            saveAuthoritativeEntitlements(active);
            logEvent({ action: 'restore', entitlements: Object.keys(active) });
            alert(Object.keys(active).length ? 'Restored purchases.' : 'No active purchases were found.');
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

    function getAiRequestHeaders(sessionOverride) {
        const headers = {};
        const accessToken = localStorage.getItem(AI_ACCESS_TOKEN_KEY) || '';
        const installationSession = arguments.length ? sessionOverride : readInstallationSession();
        const sessionToken = installationSession?.token || '';
        if (accessToken) headers['X-FuelFire-Access-Token'] = accessToken;
        if (sessionToken) {
            headers['X-FuelFire-Installation-Session'] = sessionToken;
            headers.Authorization = `Bearer ${sessionToken}`;
        }
        return headers;
    }

    function resolveAiApiRequest(input) {
        const value = typeof input === 'string' ? input : input?.url;
        if (!value) return null;
        try {
            const parsed = new URL(value, window.location.href);
            if (!AI_API_PATHS.has(parsed.pathname)) return null;

            const currentOriginIsHttp = /^https?:$/i.test(window.location.protocol);
            if (/^https?:$/i.test(parsed.protocol)) {
                const allowedOrigins = new Set([PRODUCTION_API_ORIGIN]);
                if (currentOriginIsHttp) allowedOrigins.add(window.location.origin);
                return allowedOrigins.has(parsed.origin) ? parsed.href : null;
            }

            return `${PRODUCTION_API_ORIGIN}${parsed.pathname}${parsed.search || ''}`;
        } catch (error) {
            return null;
        }
    }

    function resolveInstallationSessionUrl() {
        if (/^https?:$/i.test(window.location.protocol)) {
            return new URL('/api/installation-session', window.location.origin).href;
        }
        return `${PRODUCTION_API_ORIGIN}/api/installation-session`;
    }

    function installAiFetchCredentials() {
        if (!nativeFetch || window.__fuelfireAiFetchCredentialsInstalled) return;
        window.__fuelfireAiFetchCredentialsInstalled = true;
        window.fetch = async function authenticatedAiFetch(input, init = {}) {
            const resolvedUrl = resolveAiApiRequest(input);
            if (!resolvedUrl) return nativeFetch(input, init);

            const session = await ensureSession({ reuseCurrent: true });
            const headers = new Headers(init.headers || input?.headers || {});
            Object.entries(getAiRequestHeaders(session)).forEach(([name, value]) => headers.set(name, value));
            const requestInput = typeof input === 'string' ? resolvedUrl : new Request(resolvedUrl, input);
            return nativeFetch(requestInput, { ...init, headers });
        };
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
                        <button id="ai-restore" style="width:100%;background:#0f172a;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:12px;border-radius:12px;font-weight:700;cursor:pointer;">Restore / migrate purchases</button>
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
        getRequestHeaders: getAiRequestHeaders,
        getEvents,
        ensureSession,
        getServerRcAppUserId,
        isBoundCustomerId,
        migrationRequired,
        refreshEntitlements,
        purchasePackage,
        restorePurchases
    };

    installAiFetchCredentials();
    parseQueryFlags();
    initRevenueCat();
})();
