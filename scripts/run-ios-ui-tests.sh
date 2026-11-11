#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -n "${IOS_SIMULATOR_UDID:-}" ]]; then
  DEVICE_JSON="$(xcrun simctl list devices available --json | jq -c --arg udid "${IOS_SIMULATOR_UDID}" '[.devices[][] | select(.udid == $udid)][0] // {}')"
else
  DEVICE_JSON="$(xcrun simctl list devices available --json | jq -c '[.devices[][] | select(.name | contains("iPhone"))][0] // {}')"
fi
DEVICE_NAME="$(jq -r '.name // empty' <<< "${DEVICE_JSON}")"
DEVICE_UDID="$(jq -r '.udid // empty' <<< "${DEVICE_JSON}")"

if [[ -z "${DEVICE_NAME}" || -z "${DEVICE_UDID}" ]]; then
  if [[ -n "${IOS_SIMULATOR_UDID:-}" ]]; then
    echo "Requested simulator ${IOS_SIMULATOR_UDID} is not available. No other simulator will be selected."
  else
    echo "No available iPhone simulator was found. Install an iOS simulator runtime in Xcode."
  fi
  exit 1
fi

echo "Running Well Fit Pro UI tests on ${DEVICE_NAME} (${DEVICE_UDID})"
xcodebuild test \
  -quiet \
  -workspace "${PROJECT_ROOT}/ios/App/App.xcworkspace" \
  -scheme AppUITests \
  -destination "platform=iOS Simulator,id=${DEVICE_UDID}" \
  -derivedDataPath "/tmp/WellFitUITestDerivedData"
