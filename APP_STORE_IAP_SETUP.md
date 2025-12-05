# Apple IAP + RevenueCat Integration Guide

Use this to wire native iOS purchases into the existing paywall/subscription log.

## 1) Create products/entitlements in RevenueCat
- Create offerings/entitlements that mirror your plans:
  - Premium (matches Stripe Premium)
  - Core (matches Stripe Core)
- Note the entitlement IDs; these become `entitlement` values you send to the webview.

## 2) Configure webhook
- Set `REVENUECAT_WEBHOOK_SECRET` (optional, for Bearer auth).
- Point RevenueCat webhook URL to `/api/revenuecat-webhook`.
- Events purchase/renew/cancel/expire will log into Firestore/local `subscriptions.json` (same feed Account admin uses).

## 3) Native → webview unlock
After confirming entitlement in native code (StoreKit/RevenueCat SDK), inject to the webview:

```js
// Example: Capacitor bridge to webview
const payload = {
  type: 'RC_ENTITLEMENT',
  entitlement: 'premium',      // or 'core'
  email: 'user@example.com',   // if available
  name: 'User Name',           // optional
  expiresAt: '2025-01-01T00:00:00Z' // optional ISO
};
window.postMessage(payload, '*');

// or directly:
window.RCBridge.applyEntitlement({
  entitlement: 'premium',
  email: 'user@example.com',
  name: 'User Name',
  expiresAt: '2025-01-01T00:00:00Z'
});
```

This unlocks the AI paywall, persists access locally, and logs to the subscription store.

## 4) Testing checklist
- Enable RevenueCat sandbox.
- Make test purchases/renewals/cancellations; confirm webhook events appear in Account admin tables (GET `/api/subscriptions.js`).
- Trigger native entitlement call and confirm the paywall allows AI features immediately.

## 5) Ship to App Store
- Ensure entitlements/products are in App Store Connect and match RevenueCat.
- Keep Stripe web checkout out of the native paywall if you rely on Apple IAP to stay compliant.
- Redeploy after setting envs so webhooks and scripts are live.
