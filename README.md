# FuelFire Fitness App 🔥

## Subscription event ledger

`api/subscriptions.js` uses the same durable Redis REST configuration as the production quota store. Set `FUELFIRE_REDIS_URL` and `FUELFIRE_REDIS_TOKEN` (or the supported `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names) in the deployment environment. Production appends are atomic, deduplicated by authoritative event ID, and retain the newest 500 events; a missing or unavailable store returns `503` rather than acknowledging an event.

Firebase/Firestore is not a supported subscription-ledger backend in this deployment. The old Firebase path is intentionally absent because the serverless runtime does not include `firebase-admin`, and a local file is not durable or shared in production.

For an explicit local or offline test harness only, set `FUELFIRE_SUBSCRIPTION_LEDGER_MODE=local` and optionally `FUELFIRE_SUBSCRIPTION_LEDGER_PATH` to select a JSON file. Local JSON is never selected by a production runtime.

### RevenueCat webhook raw body contract

The webhook captures the request stream before reading any lazy `req.body` helper or parsing JSON. The HMAC covers those exact UTF-8 bytes, including whitespace and numeric formatting; `JSON.stringify(req.body)` is not a valid substitute. The handler enforces a 128 KiB limit and returns `503 SUBSCRIPTION_RAW_BODY_UNAVAILABLE` when the runtime does not provide raw bytes. Deployment verification must confirm the Node request stream or an equivalent exact `rawBody` buffer is available. Do not globally disable Node helpers: the other API routes use their parsed body and response methods. See [Vercel's raw-body guidance](https://vercel.com/kb/guide/how-do-i-get-the-raw-body-of-a-serverless-function).

## App Store purchases and RevenueCat events

The native app uses RevenueCat purchases and restore. Configure the products and entitlements in the store and RevenueCat dashboards; do not treat a browser plan selection as proof of payment.

Set the installation-session signing secret and RevenueCat server key using deployment secret storage. Existing customer identities require the explicit Restore / migrate purchases flow before switching to the server-issued identity. Native entitlement messages must carry that bound customer ID; browser messages do not authorize server access or mutate the subscription ledger.

Verified RevenueCat events go to `/api/subscriptions`. Webhook signing is required for this public event path, not optional; configure the matching signing secret and preserve the exact raw body. The separate administrator read path requires its own token and is not exposed in the consumer account page.

The previously documented Stripe checkout and `/api/revenuecat-webhook` endpoints are not present in this checkout. They are not supported deployment instructions. Use [the reliability release checklist](RELIABILITY_RELEASE_CHECKLIST.md) and [native release checklist](NATIVE_RELEASE_CHECKLIST.md) before another candidate is distributed.

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
