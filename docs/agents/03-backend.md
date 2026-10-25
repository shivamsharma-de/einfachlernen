# Agent 3 — Backend (Edge Functions + client data layer)

**Branch** `agent/backend` · **Worktree** `../el-backend`
**Owns** `supabase/functions/**`, `lib/**` (except `lib/supabase.ts`), `lib/__tests__/**`
**Consumes** DB shape in CONTRACTS §1 (data) · **Produces for** frontend: `lib/api.ts` (CONTRACTS §4)

## Context
`word-ai` and `scan-words` Edge Functions exist (Deno, Anthropic SDK with structured outputs via zod,
service-role client). `lib/srs.ts` (pure four-grade SM-2), `lib/deck.ts`, `lib/ai.ts`, `lib/ocr.ts`,
`lib/activity.ts` exist. v3 changes: multi-page scan that keeps non-catalogue words, a new `import-scan`
function, `u_` word support, the session builder + shuffle, and a stable `lib/api.ts` facade.

## Deliverables (PRD IDs)
1. **`lib/shuffle.ts` — F3.2, F3.3** (pure): `mulberry32`, `constrainedShuffle` (Fisher–Yates, then repair
   runs of > `maxNewRun`=2 new cards by swapping with the nearest later review card; if impossible, leave as
   is), `reinsertIndex` (3–5 ahead, clamped to queue end). Vitest tests in `lib/__tests__/shuffle.test.ts`:
   determinism per seed, permutation property, run constraint over 1,000 seeds, edge cases (0/1 items, all new).
2. **Deck — F3.1, F3.4, F3.5.** `buildSession`: due rows from `word_progress` joined to `deck_words`
   (most overdue first) + `next_new_words(level, daily_new_cards − introduced_today)` + unreviewed scan
   cards; cap 30; attach `srs` and `intervals` (from `previewIntervals`); shuffle with a new seed. Persist
   session to AsyncStorage key `deck_session:${userId}:${YYYY-MM-DD}`. `resumeSession` returns it only if
   same user and same local day. `gradeCard` → `schedule()` → upsert `word_progress`, re-queue on grade 0,
   `logActivity`; when offline, write to the `lib/progress.ts` buffer and flush on next success.
   Tests for session composition with a mocked Supabase client.
3. **`scan-words` v3 — F4.3–F4.5, F4.9** (CONTRACTS §2.2). One vision request with all pages as separate
   image blocks. Set `output_config.effort` explicitly — reading printed text is not reasoning-ceiling
   work, and the unset default runs high, which is a large share of scan output tokens. Structured output per word: `surface, lemma, type, article, english, cefr_estimate,
   example_de, example_en, page`. Then: dedupe by `lower(lemma)`; match `de_words.lemma_key`; catalogue level
   and `level_source='official'` override estimates; drop words already in the caller's `word_progress` or
   `user_words`; apply relevance D10 (at or above level); count the rest into `counts`. Rate limit by summing
   `page_count` over the last hour. Save `detected` = full candidate list. Never store images.
   Prompt the model to skip proper nouns, numbers, and function words, and to omit unreadable words.
4. **`import-scan` — F4.7** (CONTRACTS §2.3). Validates `scan_id` belongs to caller, reads candidates from
   `scan_results.detected`, inserts `user_words` (`ON CONFLICT (user_id, lemma_key) DO NOTHING`), upserts
   `word_progress` with `added_via='scan'`, updates `imported_count`. Idempotent.
5. **`word-ai` — F3.6.** Accept `u_` ids (read from `user_words` as caller; write enrichment back to that
   row's `forms`/`example_*` via service role only after checking ownership). Rate limit 200/hour/user.
   Guarantee exactly 2 examples.
6. **`lib/api.ts`** — implement every stub from CONTRACTS §4; map every function error code to German text
   (extend the `MESSAGES` map in `lib/ocr.ts`). `preparePage` uses `expo-image-manipulator` (long edge **1280**,
   JPEG 0.7, base64 — vision is billed by pixel area, see PRD F4.2). `prefetchEnrichment` is fire-and-forget with an in-memory de-dupe.
7. Replace hard-coded `MODEL` constants with `Deno.env.get('ANTHROPIC_MODEL_TEXT' | 'ANTHROPIC_MODEL_VISION')`,
   failing with `ai_not_configured` 500 when unset.
8. Shared Deno helpers in `supabase/functions/_shared/` (cors, json, auth, rate limit) — remove duplication.

## Checks before each milestone
`npm run typecheck`; `npm test`; `deno check supabase/functions/*/index.ts`;
`supabase start && supabase db reset && supabase functions serve` then curl each function with a local test
user JWT (document the exact curl commands in your status file). You cannot call Anthropic without a key —
if `ANTHROPIC_API_KEY` is not in your env, test up to the model call and mock the model response in a
`__fixtures__/` JSON to test the post-processing path.

Until data's migration 006 is on `main`, write against CONTRACTS §1 and test with a local copy of that SQL
in `supabase/functions/_shared/__fixtures__/schema.sql` (do not add it to migrations/).

## Prompt to paste
```
You are the BACKEND agent in a four-agent parallel build of the swapo app (Expo / React Native /
TypeScript client, Supabase Postgres + Edge Functions on Deno, Anthropic API). You are in your own git
worktree on branch agent/backend.

Read fully, in order, before writing code: docs/PRD-v3.md, docs/agents/CONTRACTS.md,
docs/agents/README.md §4, docs/agents/03-backend.md (your brief), then every file in lib/ and
supabase/functions/, and supabase/migrations/005_profile_deck_activity_ai.sql.

Then implement the deliverables in 03-backend.md, milestone by milestone (README §5, backend column).
Start with lib/shuffle.ts and its tests, then lib/api.ts deck functions, so frontend can integrate early.

Hard rules: write only in supabase/functions/**, lib/** (not lib/supabase.ts), lib/__tests__/**. Match the
signatures in CONTRACTS §2–§4 exactly. Never edit CONTRACTS.md, types/contracts.ts, migrations, package.json
or app.json. Never deploy, push to, or set secrets on the remote Supabase project — local only. The
Anthropic key lives only in Edge Function env, never in client code or EXPO_PUBLIC_ vars. No new
dependencies. Commit small with prefix [backend]. Update docs/agents/status/backend.md at each milestone.
Run npm run typecheck, npm test and deno check before calling a milestone done.
```
