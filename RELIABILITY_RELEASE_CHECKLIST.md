# FuelFire reliability release checklist

The October 28 reliability changes are being verified on `codex/reliability-audit-fixes-1028`, based on shared `main` commit `e060326`. They are not a deployed backend or an uploaded TestFlight build. Release requires the configuration and device checks below.

## Product changes

- Food logging validates nonnegative finite values, retains decimals and valid zeroes, exposes a free manual path, preserves failed forms, and safely renders external food text. Shared storage preserves malformed originals before migration.
- Both workout trackers retain sets, original start time, bodyweight and timed exercises, decimal loads, units, and notes. Completion is idempotent and verified before clearing the draft. History and progress use saved records instead of stale counters.
- Activity reconciliation distinguishes local activity, Health active energy, resting energy, stale data, and missing data. A successfully exported overlapping workout is counted once; unrelated activities remain additive.
- Account screens show local data and actual entitlement evidence instead of demonstration records. Export, validated import, rollback, and explicitly confirmed local deletion preserve credentials and unrelated storage. Local deletion does not cancel App Store subscriptions.
- Core navigation and dialogs have keyboard access, focus isolation and return, visible labels, status messages, stronger contrast, zoom, and narrow-screen layout. Automated Chromium checks do not establish iPhone VoiceOver conformance.
- Provider routes require server authorization, durable quotas, and bounded provider attempts. Customer identity is bound to a signed installation session. Subscription events require verified signatures or internal authorization and durable deduplication; administrator reads require separate authorization.
- Capacitor packages and CocoaPods are patched to 7.6.10. CI validates shipped scripts, Chromium and WebKit flows, native builds, and protected signed archive metadata. Archive validation checks the runtime embedded in the candidate, not only source locks.

## Production configuration before deployment

Use the variable names in [the environment template](docs/.env.example) and [security configuration in the README](README.md). Keep values in deployment secret storage, never in source or a browser build.

- [ ] Configure a strong installation-session signing secret, or the supported access-token signing secret.
- [ ] Configure durable Redis REST URL and token for request quotas and the subscription ledger. An unavailable production store must return an error, never silently use local JSON or an in-memory quota.
- [ ] Configure the RevenueCat server key, webhook signing secret, and separate administrator/internal tokens only where those integrations are enabled.
- [ ] Enable and verify the configured RevenueCat webhook signature against exact raw request bytes, with a replay-window and duplicate-delivery test. See [RevenueCat webhook documentation](https://www.revenuecat.com/docs/integrations/webhooks).
- [ ] Verify first-install identity, renewal, existing-customer migration, purchase restore, expiry, and revocation on a sandbox candidate. Do not silently attach an existing purchase to a new customer identity.
- [ ] Confirm the older credential incident has been remediated. Historical backup archives were not opened or removed, credentials were not rotated, and Git history was not rewritten by this change.

## Local verification and host limits

The reproducible free checks are:

```sh
npm ci
npm run build
npm run test:coverage
npm run test:ai-food:regression
npm run test:accuracy
CI=1 npm run test:e2e
npm audit
bash scripts/check-release-files.sh --base e0603264bd42dc89f5d16217cbab6047fc56ac14
```

The accuracy command scores stored fixture predictions, not live food recognition. The offline regression suite blocks external network requests. A live accuracy run requires explicit consent flags, a case cap, and a cost budget.

Recorded local results on October 28, 2026:

- 295 unit and contract tests passed across 25 files.
- 135 desktop/mobile Chromium browser tests passed, with one expected desktop-only skip and no retries.
- All 44 offline food regressions and all 13 stored accuracy fixtures passed.
- All 70 shipped JavaScript and inline scripts passed the build gate; the dependency audit reported zero vulnerabilities, and the release-file guard passed.
- The combined iOS simulator target compiled after native sync; its embedded Capacitor framework reports 7.6.10. Archive metadata tests reject missing, affected, and mismatched runtimes, but those synthetic tests are not signed-archive acceptance.

The final browser run includes free offline food entry, decimal and zero values, preserved failed forms, inert external text, legacy migration and deletion, saved-workout recovery, bodyweight/timed sets, canonical counters, account backup/restore, deletion scope, and an open-manual-dialog serious/critical accessibility scan. Webhook tests also reproduce Vercel's restored request stream while keeping the other API helpers enabled.

An updated iOS simulator app compiled successfully on this Mac. Native UI execution is blocked because Xcode does not offer the available FuelFire simulator as a test destination. Bundled Playwright WebKit exits with `Segmentation fault: 11` before creating a page. Android compilation needs a local JDK; none is installed here, and CI now provisions JDK 21. These are unpassed gates, not successful native tests.

## Signed candidate and physical iPhone acceptance

Follow [the native release checklist](NATIVE_RELEASE_CHECKLIST.md). Preserve the existing installed app and its logs while testing an update.

- [ ] Produce and validate a signed candidate with patched embedded runtime, permissions, HealthKit entitlement, and privacy manifests.
- [ ] Log food offline, including zeroes and decimals; edit, delete, reload, background, force-quit, and update without losing history.
- [ ] Enter weighted, bodyweight, and timed sets and notes through both trackers; reopen, complete twice rapidly, and verify one consistent history record.
- [ ] Refuse and later grant camera, microphone, speech, barcode, and Health permissions; cancel and retry FoodDepth presentation.
- [ ] Verify overlapping and independent Health workouts, midnight and Sunday boundaries, export/import cancellation, invalid backups, quota failure, and local deletion scope.
- [ ] Test iPhone VoiceOver, large text, focus return, and 320-point reflow through logging and recovery.
- [ ] Record sandbox subscription purchase, restore, migration, expiry, and revoked-access results.
- [ ] Approve deployment and a new TestFlight upload only after these gates have recorded results.
