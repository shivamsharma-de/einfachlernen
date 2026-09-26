# Agent 4 — Data & Integrations (schema, vocabulary content, provider setup)

**Branch** `agent/data` · **Worktree** `../el-data`
**Owns** `supabase/migrations/006_*` and later, `supabase/seeds/**`, `scripts/content/**`, `content/**`,
`docs/runbooks/**`
**Produces for** backend + frontend: the DB in CONTRACTS §1, and the word catalogue that fills every deck.

## Context
Migrations 001–005 are applied to the remote project (do not edit them). `de_words` has 168 rows
(124 A1, 23 A2, 9 B1, 4 B2, 3 C1, 5 C2) — far too few. Ids follow `de-{level}-{category_code}-{sequence}`.
This agent owns the schema change and the **content pipeline** that turns wordlists into complete,
reviewed card rows. It also writes the runbooks the human needs for things agents cannot do (secrets,
OAuth provider consoles, deploy).

## Deliverables (PRD IDs)
1. **Migration `006_v3_decks_scan_content.sql`** — exactly CONTRACTS §1, idempotent, with RLS on
   `user_words` (owner-only, `WITH CHECK`), the `deck_words` view (`security_invoker`), and the
   `next_new_words` RPC. Backfill: existing 168 rows → `level_source='official'` for A1–B1,
   `'estimated'` for B2–C2, `review_status='reviewed'`.
   `supabase/tests/006_rls.sql`: assertions that user A cannot read/write user B's `user_words`,
   `word_progress`, `scan_results`, and that `deck_words` shows A only A's scan words.
2. **Content pipeline — F5** in `scripts/content/` (TypeScript, run with `npx tsx`), each step a script
   reading and writing files in `content/` so it can be re-run and diffed:
   - `01_ingest.ts` — read source CSVs from `content/sources/` (columns: `lemma, article, word_type, level,
     source`), normalise (strip "der/die/das" prefixes into `article`, split "-e/-n" plural notation into
     `forms.plural`), level = lowest list the lemma appears in. → `content/stage/01_ingested.jsonl`
   - `02_frequency.ts` — join a frequency list (`content/sources/frequency.tsv`, `lemma\trank`) →
     `frequency_rank`; for B2–C2 candidates, take frequency ranks not covered by A1–B1 and band them
     (PRD F5.2), `level_source='estimated'`.
   - `03_enrich_batch.ts` — build an Anthropic **Message Batches** request (one request per word,
     structured output: `article, word_type, english, forms, example_de, example_en, examples[2], thema`,
     thema from the canonical list in `docs/tokens.ts`). **Print word count and a cost estimate, then stop
     and ask for confirmation before submitting.** `--poll <batch_id>` downloads results.
   - `04_validate.ts` — rule checks: noun has article; plural present for nouns; verb has Partizip II +
     auxiliary; both examples contain the lemma or an inflection; no English in `example_de`. If a
     Wiktionary extract is present at `content/sources/wiktionary_de.jsonl` (e.g. kaikki.org, CC BY-SA),
     cross-check article and plural. Failures → `content/stage/04_rejects.csv`.
   - `05_review_export.ts` / `06_review_import.ts` — CSV round-trip for a human reviewer
     (`id, level, german, article, english, plural, example_de, example_en, status, note`).
   - `07_seed.ts` — emit `supabase/seeds/010_de_words_v3.sql`: `INSERT … ON CONFLICT (id) DO UPDATE`,
     keeping the existing 168 ids stable, new ids in the existing format, `review_status` from review.
   - `README.md` in `scripts/content/` with the exact run order.
3. **Sources — F5.1.** Do **not** scrape or download publisher/institute wordlists. Write
   `docs/runbooks/content-sources.md`: which lists to obtain (Goethe-Zertifikat A1, A2, B1 Wortlisten; a
   corpus frequency list; optional Wiktionary extract), where they are published, licence notes and the open
   question for commercial use (PRD F5 licensing box), and how to turn the PDFs into
   `content/sources/*.csv` (a `00_pdf_to_csv.ts` helper using text extraction is welcome if feasible
   without new dependencies — otherwise document manual steps). Until real sources are placed, ship the
   pipeline end-to-end on a **50-word sample CSV you write yourself** (`content/sources/sample.csv`).
4. **Runbooks** in `docs/runbooks/`:
   - `deploy.md` — `supabase init` (if missing `config.toml`), secrets (`ANTHROPIC_API_KEY`,
     `ANTHROPIC_MODEL_TEXT`, `ANTHROPIC_MODEL_VISION`), `supabase db push`, deploying `word-ai`,
     `scan-words`, `import-scan`, applying the seed, smoke-test queries.
   - `auth-providers.md` — Google: OAuth client(s) in Google Cloud, Supabase Auth provider config, redirect
     URLs for Expo Go (`exp://…/--/auth/callback`) and the app scheme (`einfachlernen://auth/callback`).
     Apple: Apple Developer membership, App ID with Sign in with Apple capability, Services ID, key, Supabase
     Apple provider config, `ios.usesAppleSignIn: true` + bundle identifier in `app.json` (lead change),
     EAS dev build steps.
   - `analytics.md` — replace the PostHog placeholder key (`lib/analytics.ts`) via env, event list from PRD F7.

## Checks before each milestone
`supabase start && supabase db reset` applies 001–006 + seeds cleanly twice in a row (idempotency);
`supabase/tests/006_rls.sql` passes; `npx tsx scripts/content/0N_*.ts` runs on the sample without network
except step 03; `npm run typecheck`.

## Prompt to paste
```
You are the DATA & INTEGRATIONS agent in a four-agent parallel build of the einfach lernen app (Expo /
React Native client, Supabase Postgres + Edge Functions, Anthropic API). You are in your own git worktree
on branch agent/data.

Read fully, in order, before writing code: docs/PRD-v3.md (especially F5 and §6), docs/agents/CONTRACTS.md
(especially §0 and §1), docs/agents/README.md §4, docs/agents/04-data-integrations.md (your brief), then
supabase/migrations/001–005, the head of supabase/seeds/001_de_words.sql, and docs/tokens.ts.

Then implement the deliverables in 04-data-integrations.md, milestone by milestone (README §5, data column).
Migration 006 first — the other agents are coding against it.

Hard rules: write only in supabase/migrations/006_* and later, supabase/seeds/**, supabase/tests/**,
scripts/content/**, content/**, docs/runbooks/**. Never edit migrations 001–005, CONTRACTS.md,
types/contracts.ts, package.json or app.json. Never touch the remote Supabase project (no db push, no
deploy, no secrets) — local only. Do not download or scrape copyrighted wordlists; work on a sample and
document where the real sources come from. Before submitting any Anthropic batch, print the word count
and cost estimate and wait for my explicit OK. No new dependencies. Commit small with prefix [data].
Update docs/agents/status/data.md at each milestone.
```
