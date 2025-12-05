# FuelFire Fitness App — Focused Handoff (Today’s Work)

Project path: `/Users/danperry/Apps/FuelFire/fuelfire-app`

## Key Changes Completed
- **AI Access & Billing:** Added client paywall guarding voice food logging, AI typed search, custom AI workouts, and AI diet creation. Trial/promo/DAN unlocks now post subscription events to `api/subscriptions.js`, which prefers Firestore (env-driven) and falls back to `api/data/subscriptions.json`. Frontend hooks live in `public/ai-paywall.js`, `public/app.js`, `public/index.html`, and `public/calorie-tracker.html`.
- **Subscription backend (Firestore-ready):** `api/subscriptions.js` now uses `firebase-admin` when `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (keep literal `\n`) are set; otherwise it writes to local JSON. Events capture action/plan/promo/expiry/user context; GET returns both full events and a latest-state user summary.
- **Account page + AI Access Admin:** `public/account.html` now embeds the AI Access Admin dashboard (summary cards, latest user state table, full event log) pulling from Firestore or local fallback. Profile section persists name/gender/age/weight to `localStorage` and updates the avatar initial. Subscription cards: Elite $96 (all AI + 1 free coaching session monthly), Premium $15 (all AI + unlimited plans), and Core $6 (capped plans, no AI food logging) with active-state UI and plan save actions. Payment methods box removed to align with in-app purchase rules; bottom nav and safe-area padding preserved.
- **Coaching scheduler restyle:** `public/coaching-scheduler.html` now matches app chrome with header + hamburger back to `index.html`, phone-container layout, preserved bottom nav, featured coaches with photos/tags/selectable cards, session type toggle (video/phone), date/time/focus inputs, notes, pricing tiers (single $100, 2-pack $150, concierge monthly $70 with free session), live summary, and upcoming entries.
- **Treadmill Vision robustness:** `api/treadmill-vision.js` uses the Claude Sonnet model with better extraction (pace normalization, derive pace/speed from distance+duration, backfill pace from speed, text inference for missing metrics, stricter JSON handling). Still returns summary/confidence/notes and ignores interval noise.
- **Onboarding cleanup:** Removed the old Health Dashboard overlay step and related CSS/JS; tour now uses modal/log steps without the buggy iframe preview (`public/onboarding.js`, `public/styles.css` previously cleaned).
- **Build/sync state:** `firebase-admin` installed. Assets synced to iOS via `npx cap sync ios`. Recent Xcode build succeeded with `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build` (only standard CocoaPods embed warning).
- **Stripe billing added:** New endpoints for checkout, config, and webhooks (`api/create-checkout-session.js`, `api/stripe-config.js`, `api/stripe-webhook.js`) with Firestore/local logging of subscription events. Paywall now launches Stripe Checkout using configured price IDs.
- **Apple IAP (RevenueCat webhook bridge):** `api/revenuecat-webhook.js` captures RevenueCat purchase/renew/cancel/expire events, optionally auth’d via `REVENUECAT_WEBHOOK_SECRET`, and logs into the same subscription store (Firestore/local). Use this when adding native iOS purchases.
- **Native → webview unlock helper:** `public/revenuecat-bridge.js` listens for `postMessage` `{ type: 'RC_ENTITLEMENT', entitlement, email, name, expiresAt }` (or call `window.RCBridge.applyEntitlement`) to unlock AI paywall and log the event so Account admin tables stay in sync.

## Env to Set (for Firestore + Admin dashboards)
- `FIREBASE_PROJECT_ID=well-fit-pro-fitness-app`
- `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@well-fit-pro-fitness-app.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY` with literal `\n` newlines (wrap in quotes if exporting)
With these set, Account page AI Access Admin will read live Firestore data; backend still logs locally as backup.

## Env to Set (Stripe billing)
- `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` (test/live)
- `STRIPE_WEBHOOK_SECRET` (from dashboard)
- `STRIPE_PRICE_ID_PREMIUM` (monthly Premium price ID)
- `STRIPE_PRICE_ID_CORE` (monthly Core price ID)
After setting, point Stripe webhooks to `/api/stripe-webhook` for events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

## Env to Set (Apple IAP via RevenueCat)
- `REVENUECAT_WEBHOOK_SECRET` (optional, for Bearer auth)
- Point RevenueCat webhook to `/api/revenuecat-webhook` to log Apple purchases/renewals/cancellations/expirations into the subscription store.

## Files Worth Opening
- `public/account.html` — Account page with embedded AI Access Admin + profile/subscription/payment logic.
- `public/ai-paywall.js`, `public/app.js`, `public/index.html`, `public/calorie-tracker.html` — Client paywall hooks.
- `public/revenuecat-bridge.js` — Native-to-web unlock hook for Apple IAP entitlements.
- `api/subscriptions.js` — Firestore/local subscription event logger and admin data source.
- `api/create-checkout-session.js`, `api/stripe-config.js`, `api/stripe-webhook.js` — Stripe checkout + config + webhook handlers.
- `public/coaching-scheduler.html` — Restyled coaching scheduler UI.
- `api/treadmill-vision.js`, `api/_lib/anthropic.js` — Treadmill Vision model + extraction improvements.

## Quick Guidance for Next Steps
- Verify env vars are loaded (see `.env.example` and `FIREBASE_SETUP.md`); ensure `FIREBASE_PRIVATE_KEY` keeps escaped newlines.
- Hit `GET /api/subscriptions.js` and confirm Firestore returns events/users; POST trial/promo events from the paywall to validate writes.
- Configure Stripe env vars, set webhook to `/api/stripe-webhook`, and run a test checkout (via paywall) to see events appear in Account admin tables.
- Smoke-test AI-gated features (voice food logging, AI searches, custom workouts, AI diet creation) to ensure paywall gating + unlock flows behave with and without Firestore available.
- Open `public/account.html` in the simulator/device to confirm AI Access Admin tables populate and profile/subscription/payment interactions persist.
- Run the updated coaching scheduler to verify selection, pricing, summary, and upcoming session display match the new layout.
