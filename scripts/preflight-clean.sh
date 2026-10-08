#!/usr/bin/env bash
# Runs `pnpm preflight` on a clean checkout of one commit, so the result depends only on
# committed files: no uncommitted edits, no untracked files, and no generated types or
# build output from a local `next dev`. The pre-push hook calls it for each pushed commit.
#
#   scripts/preflight-clean.sh [commit]   (default: HEAD)
set -euo pipefail

commit="$(git rev-parse --verify "${1:-HEAD}^{commit}")"
root="$(git rev-parse --show-toplevel)"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/h1b-preflight.XXXXXX")"
tree="$tmp/tree"

cleanup() {
  git -C "$root" worktree remove --force "$tree" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT

echo "preflight: clean checkout of ${commit:0:7}"
git -C "$root" worktree add --detach --quiet "$tree" "$commit"

# Install from the commit's lockfile, as CI does. pnpm links packages from its local store,
# so this takes seconds. (Turbopack rejects a node_modules symlink that leaves the project.)
# HUSKY=0 keeps the prepare script from touching the shared git hooks config.
(cd "$tree/web" && HUSKY=0 pnpm install --frozen-lockfile --prefer-offline --reporter=silent)

# Local config is not source: the build reads the public Supabase URL and key from it,
# and the ETL check prefers the pinned ruff in the local venv.
if [ -e "$root/web/.env.local" ]; then ln -s "$root/web/.env.local" "$tree/web/.env.local"; fi
if [ -d "$root/venv" ]; then ln -s "$root/venv" "$tree/venv"; fi

cd "$tree/web"
pnpm preflight
