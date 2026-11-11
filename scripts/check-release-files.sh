#!/usr/bin/env bash
set -euo pipefail

# This guard intentionally inspects only Git metadata and newly added diff
# lines. It never opens an existing archive and never prints candidate values.

base_ref=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      [[ $# -ge 2 ]] || { echo "--base requires a Git ref" >&2; exit 2; }
      base_ref="$2"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Usage: $0 [--base <git-ref>]" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${base_ref}" && -n "${GITHUB_BASE_REF:-}" ]]; then
  base_ref="origin/${GITHUB_BASE_REF}"
fi

if [[ -z "${base_ref}" ]]; then
  base_ref="HEAD^"
fi

if ! git rev-parse --verify "${base_ref}^{commit}" >/dev/null 2>&1; then
  echo "Unable to resolve release-file guard base ref: ${base_ref}" >&2
  echo "Fetch the pull-request base or pass --base <git-ref>." >&2
  exit 2
fi

diff_range="${base_ref}...HEAD"
# Treat backup/archive directory names and archive extensions as release-file
# hazards. A source file such as tests/backup.test.js is ordinary code and
# must not be blocked merely because its name contains "backup".
archive_pattern='(^|/)(backup|back-up|backups|archive|archives)(/|$)|(^|/)[^/]+\.(7z|arc|bak|backup|back-up|gz|ipa|old|rar|tar|tgz|zip|xcarchive)(/|$)'
env_pattern='(^|/)\.env($|\.)'
safe_env_pattern='(^|/)\.env\.(example|sample|template)$'
secret_pattern='(-----BEGIN [A-Z0-9 ]+ PRIVATE KEY-----|\b(AWS|AZURE|GOOGLE|GITHUB|SLACK|STRIPE|SENTRY|DATABASE|API|AUTH|OAUTH|PRIVATE)[A-Z0-9_]*(SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL)[A-Z0-9_]*\s*[:=]\s*["'"'"'`]?[A-Za-z0-9_./+=:-]{12,}|\b(ghp_|github_pat_|xox[baprs]-|sk_(live|test)_|sk-ant-|vercel_)[A-Za-z0-9_./+=:-]{8,}|\bAIza[A-Za-z0-9_./+=:-]{12,})'

declare -a violations=()

# Only A/C/R paths are considered "newly tracked". Modified historical files
# are not treated as newly introduced archives or dotenv files.
while IFS= read -r path; do
  [[ -n "${path}" ]] || continue

  if [[ "${path}" =~ ${archive_pattern} ]]; then
    violations+=("archive-like path: ${path}")
    continue
  fi

  if [[ "${path}" =~ ${env_pattern} ]] && [[ ! "${path}" =~ ${safe_env_pattern} ]]; then
    violations+=("dotenv-like path: ${path}")
  fi
done < <(git diff --name-only --diff-filter=ACR "${diff_range}" --)

# Scan only added lines in changed text files. Candidate material is consumed
# by rg and redirected to /dev/null, so values are never included in output.
while IFS= read -r path; do
  [[ -n "${path}" ]] || continue
  [[ "${path}" =~ ${archive_pattern} ]] && continue

  if git diff --unified=0 --no-ext-diff "${diff_range}" -- "${path}" \
    | rg '^\+[^+]' \
    | rg -N --pcre2 "${secret_pattern}" >/dev/null; then
    violations+=("secret-like material in added lines: ${path}")
  fi
done < <(git diff --name-only --diff-filter=ACMR "${diff_range}" --)

if [[ ${#violations[@]} -gt 0 ]]; then
  echo "Release-file guard failed; candidate values were withheld:" >&2
  printf ' - %s\n' "${violations[@]}" >&2
  echo "Use environment/CI secret storage and keep backup archives out of Git." >&2
  exit 1
fi

echo "Release-file guard passed: no newly tracked archive/dotenv paths or secret-like added lines."
