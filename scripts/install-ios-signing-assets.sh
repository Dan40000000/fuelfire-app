#!/usr/bin/env bash
set -euo pipefail

: "${IOS_SIGNING_CERTIFICATE_P12_B64:?IOS_SIGNING_CERTIFICATE_P12_B64 is required}"
: "${IOS_SIGNING_CERTIFICATE_PASSWORD:?IOS_SIGNING_CERTIFICATE_PASSWORD is required}"
: "${IOS_PROVISIONING_PROFILE_B64:?IOS_PROVISIONING_PROFILE_B64 is required}"
: "${IOS_KEYCHAIN_PASSWORD:?IOS_KEYCHAIN_PASSWORD is required}"

runner_temp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
work_dir="$(mktemp -d "${runner_temp%/}/fuelfire-signing.XXXXXX")"
keychain_path="${runner_temp%/}/fuelfire-signing.keychain-db"
certificate_path="${work_dir}/signing-certificate.p12"
profile_path="${work_dir}/embedded.mobileprovision"

cleanup() {
  rm -rf "${work_dir}"
}
trap cleanup EXIT

if base64 -D </dev/null >/dev/null 2>&1; then
  decode_flag='-D'
else
  decode_flag='-d'
fi

printf '%s' "${IOS_SIGNING_CERTIFICATE_P12_B64}" | base64 "${decode_flag}" >"${certificate_path}"
printf '%s' "${IOS_PROVISIONING_PROFILE_B64}" | base64 "${decode_flag}" >"${profile_path}"

security create-keychain -p "${IOS_KEYCHAIN_PASSWORD}" "${keychain_path}" >/dev/null
security set-keychain-settings -lut 21600 "${keychain_path}"
security unlock-keychain -p "${IOS_KEYCHAIN_PASSWORD}" "${keychain_path}"
security import "${certificate_path}" \
  -k "${keychain_path}" \
  -P "${IOS_SIGNING_CERTIFICATE_PASSWORD}" \
  -T /usr/bin/codesign \
  -T /usr/bin/security >/dev/null
security set-key-partition-list \
  -S apple-tool:,apple: \
  -s \
  -k "${IOS_KEYCHAIN_PASSWORD}" \
  "${keychain_path}" >/dev/null
security list-keychains -d user -s "${keychain_path}"

profile_uuid="$(security cms -D -i "${profile_path}" | plutil -extract UUID raw -o - - 2>/dev/null)"
profile_name="$(security cms -D -i "${profile_path}" | plutil -extract Name raw -o - - 2>/dev/null)"
[[ -n "${profile_uuid}" && -n "${profile_name}" ]] || {
  echo "Provisioning profile metadata is incomplete" >&2
  exit 1
}

ios_home_path="${HOME}"
profiles_dir="${ios_home_path}/Library/MobileDevice/Provisioning Profiles"
mkdir -p "${profiles_dir}"
cp "${profile_path}" "${profiles_dir}/${profile_uuid}.mobileprovision"

if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    printf 'IOS_SIGNING_KEYCHAIN=%s\n' "${keychain_path}"
    printf 'IOS_PROVISIONING_PROFILE_UUID=%s\n' "${profile_uuid}"
    printf 'IOS_PROVISIONING_PROFILE_NAME=%s\n' "${profile_name}"
  } >>"${GITHUB_ENV}"
fi

echo "iOS signing assets installed into an ephemeral runner keychain."
