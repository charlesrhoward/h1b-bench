#!/usr/bin/env bash
# ETL checks, shared by `pnpm preflight` (local, pre-push) and CI:
# ruff with no suppressions honored, no suppression comments, 500-line cap.
set -euo pipefail
cd "$(dirname "$0")/.."

RUFF_VERSION="${RUFF_VERSION:-0.16.10}"
in_ci="${GITHUB_ACTIONS:-}"

fail() {
  if [ -n "$in_ci" ]; then echo "::error${2:+ file=$2}::$1"; else echo "error: ${2:+$2: }$1" >&2; fi
}

if [ -x venv/bin/ruff ] && venv/bin/ruff --version | grep -q " $RUFF_VERSION$"; then
  ruff=(venv/bin/ruff)
elif command -v uvx >/dev/null; then
  ruff=(uvx "ruff@$RUFF_VERSION")
elif command -v pipx >/dev/null; then
  ruff=(pipx run "ruff==$RUFF_VERSION")
else
  fail "ruff $RUFF_VERSION not found. Install it in ./venv, or install uv or pipx."
  exit 1
fi

# Rules: ruff.toml. --ignore-noqa makes `# noqa` comments inert.
"${ruff[@]}" check --ignore-noqa ${in_ci:+--output-format github}

# Ruff has no file-length rule and cannot reject noqa comments, so check both here.
failed=0
if grep -rnE '#\s*(noqa|ruff:\s*noqa|type:\s*ignore|pyright:\s*ignore)' --include='*.py' etl; then
  fail "Suppression comments are not allowed. Fix the code."
  failed=1
fi
while IFS= read -r f; do
  lines=$(wc -l < "$f" | tr -d " ")
  if [ "$lines" -gt 500 ]; then
    fail "$lines lines (max 500)" "$f"
    failed=1
  fi
done < <(git ls-files 'etl/*.py')
exit $failed
