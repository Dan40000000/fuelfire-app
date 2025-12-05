// Lightweight AI paywall helper used across pages
(function() {
    const STORAGE_KEY = 'fuelfire_ai_access';
    let configPromise = null;

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

    function loadConfig() {
        if (!configPromise) {
            configPromise = fetch('/api/stripe-config')
                .then(res => (res.ok ? res.json() : { priceIds: {} }))
                .catch(() => ({ priceIds: {} }));
        }
        return configPromise;
    }

    async function startCheckout(plan) {
        try {
            const cfg = await loadConfig();
            const priceId = cfg?.priceIds?.[plan];
            if (!priceId) {
                alert('Billing is not configured yet. Please add Stripe price IDs.');
                return;
            }
            const ctx = getUserContext();
            const resp = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, priceId, email: ctx.email, returnPath: window.location.pathname.replace(/^\\//, '') })
            });
            if (!resp.ok) {
                alert('Unable to start checkout. Please try again.');
                return;
            }
            const data = await resp.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Checkout link not available yet. Try again in a moment.');
            }
        } catch (err) {
            console.error('Checkout error', err);
            alert('Something went wrong starting checkout. Please try again.');
        }
    }

    function hasAccess() {
        const status = readStatus();
        if (status.plan === 'premium' || status.plan === 'promo') return true;
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
                        <div style="font-size:0.9rem;opacity:0.85;">Checkout securely with Stripe. Cancel anytime.</div>
                    </div>
                    <button id="ai-start-trial" style="width:100%;margin:8px 0;background:linear-gradient(135deg,#4B9CD3,#8e54e9);border:none;color:#fff;padding:14px;border-radius:12px;font-weight:800;cursor:pointer;">Start subscription</button>
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
                startCheckout('premium');
            };
            modal.querySelector('#ai-apply-promo').onclick = () => {
                const code = modal.querySelector('#ai-promo-input').value.trim();
                if (!code) {
                    alert('Enter a promo code to unlock.');
                    return;
                }
                if (code.toLowerCase() === 'dan') {
                    saveStatus({ plan: 'premium', promoCode: code });
                    logEvent({ action: 'promo', code, plan: 'premium' });
                    alert('✅ Promo DAN applied. Unlimited access granted.');
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
        getEvents
    };

    parseQueryFlags();
})();
