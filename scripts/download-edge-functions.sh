#!/usr/bin/env bash
#
# Download every edge function declared in supabase/config.toml into
# supabase/functions/, so the source lands in version control.
#
# Why this exists: config.toml declares 38 functions, but supabase/functions/
# does not exist in this repo. That code runs in production and lives only in
# the deployed Supabase project. It cannot be reviewed, diffed, restored, or
# migrated to another project until a copy is pulled down.
#
# Usage:
#   ./scripts/download-edge-functions.sh                    # uses the linked project
#   ./scripts/download-edge-functions.sh <project-ref>      # targets a specific project
#
# The Hive project (production as of Aug 2026) is zbltbvizmlvotayjjcum.
# Note that supabase/config.toml deliberately names the RETIRED project, so
# passing the ref explicitly is safer than relying on the link.
#
# Requires the Supabase CLI, logged in: https://supabase.com/docs/guides/cli

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$REPO_ROOT/supabase/config.toml"
OUT_DIR="$REPO_ROOT/supabase/functions"
PROJECT_REF="${1:-}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: the Supabase CLI is not installed." >&2
  echo "       https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if [ ! -f "$CONFIG" ]; then
  echo "error: $CONFIG not found. Run this from the repository." >&2
  exit 1
fi

# Function names come from the [functions.NAME] headers, so this list stays in
# step with config.toml rather than being hardcoded here.
mapfile -t FUNCTIONS < <(
  grep -oE '^[[:space:]]*\[functions\.[a-zA-Z0-9_-]+\]' "$CONFIG" \
    | sed -E 's/.*\[functions\.([a-zA-Z0-9_-]+)\].*/\1/' \
    | sort -u
)

if [ "${#FUNCTIONS[@]}" -eq 0 ]; then
  echo "error: no [functions.*] entries found in $CONFIG" >&2
  exit 1
fi

echo "Found ${#FUNCTIONS[@]} function(s) declared in supabase/config.toml"
if [ -n "$PROJECT_REF" ]; then
  echo "Target project: $PROJECT_REF"
else
  echo "Target project: whatever is currently linked"
  echo "  (config.toml names the RETIRED project on purpose — pass a ref to be sure)"
fi
echo

mkdir -p "$OUT_DIR"

downloaded=(); failed=(); skipped=()

for fn in "${FUNCTIONS[@]}"; do
  # Never clobber a local copy — it may hold uncommitted edits.
  if [ -d "$OUT_DIR/$fn" ] && [ -n "$(ls -A "$OUT_DIR/$fn" 2>/dev/null)" ]; then
    echo "skip     $fn (already present)"
    skipped+=("$fn")
    continue
  fi

  args=(functions download "$fn")
  [ -n "$PROJECT_REF" ] && args+=(--project-ref "$PROJECT_REF")

  if (cd "$REPO_ROOT" && supabase "${args[@]}" >/dev/null 2>&1); then
    echo "ok       $fn"
    downloaded+=("$fn")
  else
    echo "FAILED   $fn"
    failed+=("$fn")
  fi
done

echo
echo "downloaded: ${#downloaded[@]}   skipped: ${#skipped[@]}   failed: ${#failed[@]}"

if [ "${#failed[@]}" -gt 0 ]; then
  echo
  echo "Failed to download:"
  printf '  %s\n' "${failed[@]}"
  echo
  echo "Common causes:"
  echo "  - declared in config.toml but never deployed (safe to ignore, but confirm)"
  echo "  - the CLI is linked to a different project than you expect"
  echo "  - the account lacks access to this project"
  echo
  echo "Re-run one by hand to see the real error:"
  echo "  supabase functions download ${failed[0]}${PROJECT_REF:+ --project-ref $PROJECT_REF}"
  exit 1
fi

echo
echo "Next: review the source, then commit it."
echo "  git add supabase/functions && git commit -m 'Vendor edge function source'"
echo
echo "Secrets are NOT included. List them with:"
echo "  supabase secrets list${PROJECT_REF:+ --project-ref $PROJECT_REF}"
