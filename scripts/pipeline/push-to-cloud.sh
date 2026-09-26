#!/usr/bin/env bash
# Cutover: apply migrations 005 + 006 and the v3 catalogue to the LIVE project.
#
#   SUPABASE_ACCESS_TOKEN=sbp_...  SUPABASE_DB_PASSWORD='...' \
#     bash scripts/pipeline/push-to-cloud.sh [--dry-run]
#
# This writes to production. It is deliberately a separate, explicit script
# rather than something any stage can trigger, and it is the lead's to run —
# the PreToolUse guard still blocks every agent worktree from these commands.
#
# What it does, in order:
#   1. links this checkout to the project
#   2. shows the migrations that would apply, and stops there on --dry-run
#   3. applies them (005 and 006 are additive: ADD COLUMN IF NOT EXISTS,
#      CREATE TABLE IF NOT EXISTS, so existing rows and data survive)
#   4. applies supabase/seeds/010_de_words_v3.sql — INSERT ... ON CONFLICT (id)
#      DO UPDATE, which overwrites the 168 hand-authored rows' levels with
#      pipeline-derived ones. That is the owner's decision, recorded here so it
#      is not a surprise later.
#   5. verifies the row counts from the cloud
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-soscxohifanqklpcfuhd}"
SEED="supabase/seeds/010_de_words_v3.sql"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

die() { echo "✗ $*" >&2; exit 1; }

[[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]] || die "SUPABASE_ACCESS_TOKEN not set (supabase.com/dashboard/account/tokens)"
[[ -f "$SEED" ]] || die "$SEED not found — run the pipeline's stage 08 first"

echo "project   : $PROJECT_REF"
echo "seed      : $SEED ($(du -h "$SEED" | cut -f1), $(grep -c '^  (' "$SEED") rows)"
echo "migrations: $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') on disk"
echo ""

echo "── 1. link ─────────────────────────────────────────────"
supabase link --project-ref "$PROJECT_REF"

echo ""
echo "── 2. pending migrations ───────────────────────────────"
supabase migration list

if $DRY_RUN; then
  echo ""
  echo "--dry-run: stopping before any write."
  exit 0
fi

echo ""
echo "── 3. apply migrations ─────────────────────────────────"
supabase db push

echo ""
echo "── 4. apply the catalogue ──────────────────────────────"
# psql over the pooler; the CLI has no "run this seed remotely" command.
[[ -n "${SUPABASE_DB_PASSWORD:-}" ]] || die "SUPABASE_DB_PASSWORD not set (Dashboard → Project Settings → Database)"
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres.${PROJECT_REF}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -v ON_ERROR_STOP=1 -f "$SEED"

echo ""
echo "── 5. verify ───────────────────────────────────────────"
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres.${PROJECT_REF}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "select level, count(*) total, count(*) filter (where review_status='reviewed') reviewed
        from de_words group by level order by level;"

echo ""
echo "✓ cutover complete"
