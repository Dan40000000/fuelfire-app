# Native release checklist

This checklist separates reproducible repository checks from signing and
physical-device acceptance. It does not authorize an Apple-account action,
upload, payment, or production mutation.

## Automated checks

Run from the repository root with Node 22 or newer:

```sh
npm ci
npx cap sync ios
pod install --project-directory=ios/App
npx cap sync android
npm run build
IOS_SIMULATOR_UDID=53BACCC3-32CB-43CD-A3C0-029CF04B434D npm run test:ios:ui
```

The iOS UI command above is intentionally pinned to the FuelFire iPhone 17
simulator. Do not substitute a Card House simulator. The CI native-validation
workflow also compiles iOS and Android debug targets and runs the iOS smoke
tests on a clean runner.

For an archive produced locally or by CI, run:

```sh
bash scripts/verify-ios-archive.sh path/to/App.xcarchive
```

The verifier checks the app bundle identifier, required permission metadata,
patched Capacitor lock versions, and every `PrivacyInfo.xcprivacy` manifest in
the archive. The protected CI workflow adds `--require-signed`, codesign
verification, and the HealthKit entitlement check.

## FoodDepth acceptance

- [ ] On a supported iPhone, grant camera permission and start capture once.
- [ ] Start capture twice quickly; the second request receives a deterministic
  in-progress error and does not create a second presentation.
- [ ] Deny camera permission; the pending call settles with the documented
  permission error and a later retry does not remain blocked.
- [ ] Trigger capture while another modal is presented or transitioning; the
  call settles with `PRESENTATION_FAILED` and a later retry can proceed.
- [ ] Capture a successful result, cancel from the capture screen, and exercise
  a capture failure; each call settles exactly once.

## Physical-device and signing gates

- [ ] Run the FoodDepth, camera, HealthKit permission, speech, barcode, photo,
  and background/resume checks on the release candidate iPhone.
- [ ] Review the archive's embedded permissions, entitlements, and all privacy
  manifests against the currently shipped data-use disclosures.
- [ ] If a signed archive/export is required, dispatch the protected
  `Build iOS App` workflow with `signed_archive=true` in the `ios-release`
  environment. Supply signing material only through that environment's
  secrets; the workflow does not upload the archive.
- [ ] Record reviewer, device OS, app build, and pass/fail evidence before
  release approval.

Current worker verification does **not** constitute physical-device proof. No
real iPhone acceptance, signed export, Apple-account access, or archive upload
was performed here. Credential rotation and any history cleanup require owner
coordination; this worker neither rotates credentials nor rewrites history.
