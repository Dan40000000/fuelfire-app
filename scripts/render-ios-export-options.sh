#!/usr/bin/env bash
set -euo pipefail

: "${IOS_TEAM_ID:?IOS_TEAM_ID is required}"
: "${IOS_PROVISIONING_PROFILE_NAME:?IOS_PROVISIONING_PROFILE_NAME is required}"
output_path="${1:-}"
[[ -n "${output_path}" ]] || { echo "Usage: $0 <output-plist>" >&2; exit 2; }

template_path="$(cd "$(dirname "$0")/.." && pwd)/scripts/ios-export-options.plist"
cp "${template_path}" "${output_path}"
/usr/libexec/PlistBuddy -c "Set :teamID ${IOS_TEAM_ID}" "${output_path}"
/usr/libexec/PlistBuddy -c \
  "Set :provisioningProfiles:com.wellfit.app ${IOS_PROVISIONING_PROFILE_NAME}" \
  "${output_path}"
