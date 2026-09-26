#!/usr/bin/env bash
# Print the "Prompt to paste" block from an agent's brief.
#
#   npm run agents:prompt design | pbcopy
#
# Lead-owned file — agents do not edit it.
set -euo pipefail

AGENT="${1:-}"
case "$AGENT" in
  design)   BRIEF=01-design.md ;;
  frontend) BRIEF=02-frontend.md ;;
  backend)  BRIEF=03-backend.md ;;
  data)     BRIEF=04-data-integrations.md ;;
  *)
    echo "usage: npm run agents:prompt <data|backend|design|frontend>" >&2
    exit 2
    ;;
esac

ROOT=$(git rev-parse --show-toplevel)
# Everything between the ``` fences that follow the "## Prompt to paste" heading.
awk '
  /^## Prompt to paste/ { found = 1; next }
  found && /^```/       { fence++; next }
  found && fence == 1   { print }
  found && fence == 2   { exit }
' "$ROOT/docs/agents/$BRIEF"
