#!/bin/sh

set -eu

cd "${CI_PRIMARY_REPOSITORY_PATH:-$(pwd)}"

if ! command -v npm >/dev/null 2>&1; then
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew install node
fi

npm ci
npx cap sync ios
