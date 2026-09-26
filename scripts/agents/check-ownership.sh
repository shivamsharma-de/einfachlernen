#!/usr/bin/env bash
# Fail if an agent branch touched a path it does not own (CONTRACTS §0).
#
#   npm run agents:check <data|backend|design|frontend>       # branch vs origin/main
#   npm run agents:check <agent> -- --staged                  # what you are about to commit
#
# Agents run this before every commit; the lead runs it before every merge.
# Lead-owned file — agents do not edit it.
set -euo pipefail

AGENT="${1:-}"
MODE="${2:-branch}"

case "$AGENT" in
  data|backend|design|frontend) ;;
  *)
    echo "usage: npm run agents:check <data|backend|design|frontend> [-- --staged]" >&2
    exit 2
    ;;
esac

# Owned paths, as extended-regex anchored at the repo root. Keep in sync with
# CONTRACTS §0 and the table in CLAUDE.md.
case "$AGENT" in
  data)
    OWNED='^(supabase/migrations/(0(0[6-9]|[1-9][0-9])|[1-9][0-9]{2})_.*\.sql|supabase/seeds/.*|supabase/tests/.*|scripts/content/.*|content/.*|docs/runbooks/.*|docs/agents/status/data\.md)$'
    ;;
  backend)
    # All of lib/ except lib/supabase.ts, which is lead-owned (no lookahead in
    # POSIX ERE, so it is subtracted via DENIED below).
    OWNED='^(supabase/functions/.*|lib/.*|docs/agents/status/backend\.md)$'
    DENIED='^lib/supabase\.ts$'
    ;;
  design)
    OWNED='^(components/.*|constants/Colors\.ts|docs/design/.*|assets/.*|docs/agents/status/design\.md)$'
    ;;
  frontend)
    OWNED='^(app/.*|hooks/.*|context/.*|_screens_auth/.*|docs/agents/status/frontend\.md)$'
    ;;
esac
DENIED="${DENIED:-^$}"   # matches nothing by default

if [ "$MODE" = "--staged" ]; then
  CHANGED=$(git diff --cached --name-only)
  SCOPE="staged changes"
else
  BASE=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD)
  CHANGED=$(git diff --name-only "$BASE"...HEAD)
  SCOPE="commits since $(git rev-parse --short "$BASE")"
fi

if [ -z "$CHANGED" ]; then
  echo "[$AGENT] no changes in $SCOPE — nothing to check"
  exit 0
fi

VIOLATIONS=$(echo "$CHANGED" | grep -Ev "$OWNED" || true)
VIOLATIONS=$(printf '%s\n%s' "$VIOLATIONS" "$(echo "$CHANGED" | grep -E "$DENIED" || true)" | grep -v '^$' || true)

if [ -n "$VIOLATIONS" ]; then
  echo "[$AGENT] ✗ paths outside your ownership in $SCOPE:" >&2
  echo "$VIOLATIONS" | sed 's/^/    /' >&2
  echo "" >&2
  echo "  Revert them. If you genuinely need a change there, write it under" >&2
  echo "  'Contract change requests' in docs/agents/status/$AGENT.md and continue" >&2
  echo "  against the current contract (CLAUDE.md → File ownership)." >&2
  exit 1
fi

echo "[$AGENT] ✓ $(echo "$CHANGED" | wc -l | tr -d ' ') file(s) in $SCOPE, all inside owned paths"
