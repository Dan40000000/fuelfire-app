#!/usr/bin/env bash
set -euo pipefail

require_signed=false
archive_path=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --require-signed)
      require_signed=true
      shift
      ;;
    --)
      shift
      break
      ;;
    -*|"")
      echo "Usage: $0 [--require-signed] <path-to-App.xcarchive>" >&2
      exit 2
      ;;
    *)
      [[ -z "${archive_path}" ]] || { echo "Only one archive path is supported" >&2; exit 2; }
      archive_path="$1"
      shift
      ;;
  esac
done

[[ -n "${archive_path}" ]] || { echo "Usage: $0 [--require-signed] <path-to-App.xcarchive>" >&2; exit 2; }
[[ -d "${archive_path}" ]] || { echo "Archive path is not a directory: ${archive_path}" >&2; exit 1; }

script_root="$(cd "$(dirname "$0")/.." && pwd)"
app_path="${archive_path}/Products/Applications/App.app"
info_plist="${app_path}/Info.plist"
pod_lock="${script_root}/ios/App/Podfile.lock"

[[ -d "${app_path}" ]] || { echo "Archive does not contain App.app" >&2; exit 1; }
[[ -f "${info_plist}" ]] || { echo "Archive App.app is missing Info.plist" >&2; exit 1; }

plutil -lint "${info_plist}" >/dev/null
bundle_id="$(plutil -extract CFBundleIdentifier raw -o - "${info_plist}" 2>/dev/null || true)"
[[ "${bundle_id}" == "com.wellfit.app" ]] || { echo "Archive bundle identifier is not com.wellfit.app" >&2; exit 1; }

required_keys=(
  NSCameraUsageDescription
  NSHealthShareUsageDescription
  NSHealthUpdateUsageDescription
  NSLocationWhenInUseUsageDescription
  NSMicrophoneUsageDescription
  NSPhotoLibraryAddUsageDescription
  NSPhotoLibraryUsageDescription
  NSSpeechRecognitionUsageDescription
)
for key in "${required_keys[@]}"; do
  plutil -extract "${key}" xml1 -o /dev/null "${info_plist}" 2>/dev/null \
    || { echo "Archive Info.plist is missing required usage metadata: ${key}" >&2; exit 1; }
done

node - "${script_root}/package-lock.json" "${pod_lock}" <<'NODE'
const fs = require('node:fs');

const [lockPath, podLockPath] = process.argv.slice(2);
const minimum = [7, 6, 9];
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const packages = lock.packages || {};
const names = [
  '@capacitor/android',
  '@capacitor/cli',
  '@capacitor/core',
  '@capacitor/ios',
];

function atLeast(version) {
  const parts = String(version).split('.').map((part) => Number.parseInt(part, 10));
  return parts.length >= 3 && parts.every(Number.isFinite)
    && (parts[0] > minimum[0]
      || (parts[0] === minimum[0] && (parts[1] > minimum[1]
        || (parts[1] === minimum[1] && parts[2] >= minimum[2]))));
}

for (const name of names) {
  const entry = packages[`node_modules/${name}`];
  if (!entry || !atLeast(entry.version)) {
    console.error(`Capacitor dependency below the patched minimum: ${name}`);
    process.exit(1);
  }
}

const podLock = fs.readFileSync(podLockPath, 'utf8');
const match = podLock.match(/^  - Capacitor \((\d+\.\d+\.\d+)\):$/m);
if (!match || !atLeast(match[1])) {
  console.error('CocoaPods Capacitor dependency below the patched minimum.');
  process.exit(1);
}
NODE

manifest_count=0
while IFS= read -r -d '' manifest; do
  plutil -lint "${manifest}" >/dev/null
  manifest_count=$((manifest_count + 1))
done < <(find "${archive_path}" -type f -name PrivacyInfo.xcprivacy -print0)

if [[ ${manifest_count} -eq 0 ]]; then
  echo "Archive contains no PrivacyInfo.xcprivacy manifest" >&2
  exit 1
fi

app_manifest_count=0
while IFS= read -r -d '' _manifest; do
  app_manifest_count=$((app_manifest_count + 1))
done < <(find "${app_path}" -type f -name PrivacyInfo.xcprivacy -print0)
if [[ ${app_manifest_count} -eq 0 ]]; then
  echo "App bundle is missing PrivacyInfo.xcprivacy" >&2
  exit 1
fi

if [[ "${require_signed}" == true ]]; then
  codesign --verify --deep --strict "${app_path}" >/dev/null 2>&1 \
    || { echo "Signed archive verification failed" >&2; exit 1; }
  entitlements_file="$(mktemp "${TMPDIR:-/tmp}/fuelfire-entitlements.XXXXXX")"
  trap 'rm -f "${entitlements_file}"' EXIT
  codesign --display --entitlements :- "${app_path}" >"${entitlements_file}" 2>/dev/null \
    || { echo "Signed archive entitlements could not be read" >&2; exit 1; }
  grep -q 'com.apple.developer.healthkit' "${entitlements_file}" \
    || { echo "Signed archive is missing HealthKit entitlement" >&2; exit 1; }
  echo "Signed archive verification passed (codesign and HealthKit entitlement)."
else
  echo "Signed verification skipped (unsigned archive validation)."
fi

echo "iOS archive validation passed: App.app, permissions, Capacitor runtime, and ${manifest_count} privacy manifest(s)."
