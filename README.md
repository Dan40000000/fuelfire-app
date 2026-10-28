# FuelFire Fitness App 🔥

### Subscription event ledger
`api/subscriptions.js` uses the same durable Redis REST configuration as the production quota store. Set `FUELFIRE_REDIS_URL` and `FUELFIRE_REDIS_TOKEN` (or the supported `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names) in the deployment environment. Production appends are atomic, deduplicated by authoritative event ID, and retain the newest 500 events; a missing or unavailable store returns `503` rather than acknowledging an event.

Firebase/Firestore is not a supported subscription-ledger backend in this deployment. The old Firebase path is intentionally absent because the serverless runtime does not include `firebase-admin`, and a local file is not durable or shared in production.

For an explicit local or offline test harness only, set `FUELFIRE_SUBSCRIPTION_LEDGER_MODE=local` and optionally `FUELFIRE_SUBSCRIPTION_LEDGER_PATH` to select a JSON file. Local JSON is never selected by a production runtime.

### Stripe billing (Elite/Premium/Core subscriptions)
- Create a Stripe account and enable payouts.
- Create recurring prices in Stripe (e.g., Elite ~$96/mo, Premium $15/mo, Core $6/mo after the 20% uplift) and capture their price IDs.
- Add these env vars (see `.env.example`):
```
STRIPE_SECRET_KEY=sk_live_or_test
STRIPE_PUBLISHABLE_KEY=pk_live_or_test
STRIPE_WEBHOOK_SECRET=whsec_from_dashboard
STRIPE_PRICE_ID_PREMIUM=price_for_premium
STRIPE_PRICE_ID_CORE=price_for_core
```
- Deploy the webhook endpoint `api/stripe-webhook.js` to your host and point a Stripe webhook at it for events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`.
- The paywall uses `/api/create-checkout-session` to start Stripe Checkout and `/api/stripe-config` to pull price IDs; successful webhooks post into the same subscription log store used by the Account page admin dashboard.

### Apple IAP via RevenueCat (optional) + Android Play Billing
- Create products/entitlements in RevenueCat that mirror Elite/Premium/Core (and map to Apple/Google products).
- Set `REVENUECAT_WEBHOOK_SECRET` if you want webhook auth, and point RevenueCat webhooks to `/api/revenuecat-webhook`.
- Webhook events (purchase/renew/cancel/expire) write into the same subscription log store (durable Redis in production), so Account admin tables stay consistent across Stripe and Apple purchases.
- Native → webview unlock: send `postMessage` with `{ type: 'RC_ENTITLEMENT', entitlement: 'premium', email, name, expiresAt }` or call `window.RCBridge.applyEntitlement(...)` from native to unlock the paywall and log the event. Script is loaded on pages that use AI paywall (`revenuecat-bridge.js`).
- See `APP_STORE_IAP_SETUP.md` for a concise integration and testing checklist.

A modern, responsive fitness tracking app with AI-powered meal planning using Claude AI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDan40000000%2Ffuelfire-app&env=CLAUDE_API_KEY&envDescription=Your%20Claude%20API%20key%20from%20console.anthropic.com&project-name=fuelfire-app&repository-name=fuelfire-app)

## ✨ Features

- **📱 Mobile-First Design**: Optimized for mobile devices with a sleek phone container UI
- **🎨 Carolina Blue Theme**: Beautiful gradient color scheme with professional design
- **🏠 Dashboard**: Daily overview with calories, workout time, and streak tracking
- **🏋️ Workout Management**: Create, track, and manage workout routines
- **🥗 Nutrition Tracking**: Log meals and track nutritional intake
- **📊 Progress Analytics**: View detailed fitness progress and statistics
- **💪 Motivational Quotes**: Daily inspiration to keep you motivated
- **⚡ Interactive UI**: Smooth animations and responsive interactions

## 🚀 Live Demo

Visit the app at: [Your Vercel URL will be here]

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Variables
- **Animations**: CSS Transitions & Keyframes
- **Storage**: Local Storage for data persistence
- **Deployment**: Vercel

## 🎯 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional installations required - it's a static web app!

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/fuelfire-fitness-app.git
```

2. Navigate to the project directory:
```bash
cd fuelfire-fitness-app
```

3. Open `index.html` in your web browser or serve it locally:
```bash
# Option 1: Direct file access
open index.html

# Option 2: Local server (recommended)
python -m http.server 8000
# Then visit http://localhost:8000
```

## 🚀 Deployment

### Deploy to Vercel

1. **Fork this repository** on GitHub

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import your forked repository

3. **Deploy**:
   - Vercel will automatically detect it's a static site
   - Click "Deploy"
   - Your app will be live in minutes!

### Alternative Deployment Options

- **Netlify**: Drag and drop the project folder
- **GitHub Pages**: Enable in repository settings
- **Firebase Hosting**: Use Firebase CLI

## 📱 App Structure

```
fuelfire-fitness-app/
├── index.html          # Main application file
├── README.md           # This file
└── assets/            # Future assets (images, icons, etc.)
```

## 🎨 Design Features

- **Phone Container**: Realistic mobile device mockup
- **Carolina Blue Theme**: Professional color palette
- **Smooth Animations**: Hover effects and transitions
- **Responsive Layout**: Works on all screen sizes
- **Modern Icons**: Emoji-based icon system
- **Glass Morphism**: Subtle transparent effects

## 🚀 Future Enhancements

- [ ] Backend API integration
- [ ] User authentication
- [ ] Real-time data synchronization
- [ ] Social features and sharing
- [ ] Workout video integration
- [ ] Push notifications
- [ ] PWA capabilities
- [ ] Dark mode toggle

## ✅ Quality Checks

- `npm run verify` — confirms Anthropic model names stay centralized in `api/_lib/anthropic.js` so deployed endpoints never drift to unsupported models again.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by modern fitness apps and Carolina Blue design
- Built with modern web technologies
- Designed for optimal user experience

---

**Made with ❤️ by [Your Name]**

*Ignite Your Fitness Journey* 🔥
