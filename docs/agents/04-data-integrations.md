# Agent 4 — Data & Integrations (schema, vocabulary content, provider setup)

**Branch** `agent/data` · **Worktree** `../el-data`
**Owns** `supabase/migrations/006_*` and later, `supabase/seeds/**`, `supabase/tests/**`,
`scripts/content/**`, `content/**`, `docs/runbooks/**`
**Produces for** backend + frontend: the DB in CONTRACTS §1, and the word catalogue that fills every deck.

## Context
Migrations 001–005 are applied to the remote project (do not edit them). `de_words` has 168 rows
(124 A1, 23 A2, 9 B1, 4 B2, 3 C1, 5 C2) — far too few. Ids follow `de-{level}-{category_code}-{sequence}`.
This agent owns the schema change and the **content pipeline** that turns open corpora into complete,
confidence-scored card rows. It also writes the runbooks the human needs for things agents cannot do.

**No licensed wordlists.** There is no Goethe/telc/publisher list in this project and none will be
obtained. The catalogue is built from open corpora, and CEFR level is *derived* by an ensemble of
independent signals whose agreement is measured — never asserted. See `docs/runbooks/content-sources.md`.

## Deliverables (PRD IDs)

### 1. Migration `006_v3_decks_scan_content.sql`
Exactly CONTRACTS §1, idempotent, with RLS on `user_words` (owner-only, `WITH CHECK`), the `deck_words`
view (`security_invoker`), and the `next_new_words` RPC. Note the conservative defaults:
`level_source='estimated'`, `review_status='draft'` — a row that never went through the pipeline must not
reach a learner claiming confidence it did not earn. Backfill the existing 168 rows to
`review_status='draft'`; they re-enter through the pipeline like everything else.

`supabase/tests/006_rls.sql`: assertions that user A cannot read/write user B's `user_words`,
`word_progress`, `scan_results`, and that `deck_words` shows A only A's scan words.

### 2. Content pipeline — F5, in `scripts/content/` (TypeScript, `npx tsx`)

Each stage reads and writes files under `content/`, so every stage is re-runnable, diffable and
**resumable**. No stage ever re-spends on work a previous run completed.

| Stage | Does | Writes |
|---|---|---|
| `00_fetch_sources.ts` | download the open corpora, record URL + licence + SHA256 per file | `content/sources/*`, `content/sources/MANIFEST.json` |
| `01_pool.ts` | lemmatise, drop proper nouns / abbreviations / corpus artifacts / non-words, cap at ~15k candidates | `content/stage/01_pool.jsonl` |
| `02_signals.ts` | deterministic signals per word: written frequency rank, spoken:written ratio, morphology score (compound length, derivational affixes) | `content/stage/02_signals.jsonl` |
| `03_level_batch.ts` | model CEFR judgment, **3 samples per word**, Message Batches | `content/stage/03_levels.jsonl` |
| `04_gate.ts` | ensemble → `level`, `level_confidence` (0–1), `level_source`. Agreement gate decides `derived` vs `estimated` | `content/stage/04_levelled.jsonl` |
| `05_calibrate.ts` | score the ensemble against the gold set; report accuracy and tune the gate threshold | `content/gold/report.json` |
| `06_enrich_batch.ts` | article, forms, english, 2 examples, thema — **only for words that pass the gate** | `content/stage/06_enriched.jsonl` |
| `07_validate.ts` | Wiktionary cross-check (article, plural) + rule checks; failures escalate to the stronger model once, then reject | `content/stage/07_rejects.csv` |
| `08_seed.ts` | `INSERT … ON CONFLICT (id) DO UPDATE`, existing 168 ids stable, new ids in the existing format | `supabase/seeds/010_de_words_v3.sql` |

Plus `scripts/content/README.md` with the exact run order.

#### 2a. Level assignment — the ensemble (F5.2)

Four independent signals. **Confidence is their agreement, not any one of them.**

1. **Written frequency band.** Cumulative targets A1 ≈650 / A2 ≈1,300 / B1 ≈2,400 / B2 ≈4,400 /
   C1 ≈7,400 / C2 ≈10,000. Frequency rank is an observed property of a corpus, not a licensed list.
2. **Spoken : written ratio.** Frequent in speech, rare in writing → earlier, conversational.
   The reverse → later, academic.
3. **Morphology.** Compound length and derivational affixes (`-keit`, `-ung`, `-schaft`, `-heit`,
   `ver-`, `ent-`, `zer-`) push later. Deterministic, free.
4. **Model judgment ×3.** Three samples under different framings. **The variance is the signal.**

**Gate:** a word is `level_source='derived'` when the frequency band and the three model samples all
land within one CEFR level of each other, and `level_confidence ≥` the calibrated threshold. Otherwise
`'estimated'`, `review_status='draft'`, and it does not reach a learner. Write the confidence to
`level_confidence` so the gate is inspectable after the fact, never a black box.

#### 2b. Calibration — how "high confidence" becomes a number (blocks F5.4)

Build `content/gold/gold.csv`: ~300 words whose level nobody would argue about, spread across all six
levels (A1 *Haus*, *gehen*, *gut* … C1 *Beharrlichkeit*, *nachvollziehen*). The model proposes candidates;
a human spot-checks them once, in about two hours. **This replaces the bulk human review of PRD F5.4** —
you calibrate the method rather than reviewing 10,000 rows.

`05_calibrate.ts` runs the full ensemble against the gold set and reports exact-match and
within-one-level accuracy, plus the accuracy at each candidate gate threshold. Pick the threshold from
that table and record it in `content/gold/report.json`. If within-one-level accuracy is below 85%,
**stop and report** rather than shipping the catalogue — that is a finding for the lead, not something
to work around.

#### 2c. Token efficiency — required, not optional

The catalogue is ~10,000 words and every stage that calls a model must be built this way:

- **Batch words inside each request.** 50 words per classification request, 20 per enrichment request.
  The system prompt and schema then amortize across the batch — roughly 12 input tokens per word instead
  of 270. This is the single biggest lever; do not send one request per word.
- **Message Batches API for everything.** 50% off every token. Nothing here is latency-sensitive.
  `--poll <batch_id>` resumes; never re-submit a batch that already has results on disk.
- **Cheap gate before expensive generation.** Classification output is ~10 tokens per word; enrichment
  is ~165. Never enrich a word that failed the gate.
- **Model tiering.** `claude-haiku-4-5` for classification and first-pass enrichment. Escalate **only**
  `07_validate.ts` failures to `ANTHROPIC_MODEL_TEXT`, once. The validator is the quality gate, which is
  what makes the cheap first pass safe.
- **No thinking on classification** (it is a labelling task); `effort: 'low'` on enrichment.
- **Skip completed work.** Words already carrying an enrichment stay untouched on a re-run.

Expected total for all ~10,000 words: **well under $20**. If an estimate comes out materially above
that, something is mis-batched — say so in your status file rather than submitting.

**Before submitting any batch: print the word count, the token estimate and the dollar estimate, then
stop and wait for explicit human confirmation.** This is a hard rule.

#### 2d. `content/state.json` — the observability contract

Every stage updates a single state file, and `npm run content:status` renders it. This is what makes the
pipeline inspectable and resumable, so treat the shape as a contract:

```jsonc
{
  "updatedAt": "2026-09-26T14:00:00Z",
  "stages": {
    "03_level_batch": {
      "status": "complete",          // pending | running | submitted | complete | failed
      "startedAt": "…", "finishedAt": "…",
      "in": 15000, "out": 15000, "rejected": 0,
      "batchId": "msgbatch_01…",     // when the stage used the Batch API
      "model": "claude-haiku-4-5",
      "tokens": { "input": 360000, "output": 300000 },
      "costUsd": 0.93,
      "note": "3 samples per word, 50 words per request"
    }
  },
  "gate":  { "threshold": 0.75, "derived": 8600, "estimated": 1400 },
  "gold":  { "size": 300, "exact": 0.71, "withinOne": 0.93, "ranAt": "…" },
  "totals":{ "costUsd": 12.40, "words": 10000 }
}
```

Write it after every stage, and on failure too — a stage that died halfway must leave enough state for
the next run to resume rather than restart.

### 3. Sources — F5.1
`docs/runbooks/content-sources.md` is pre-seeded by the lead with the chosen sources. Your job is to
**verify each licence at the point of download** and record URL, licence and SHA256 in
`content/sources/MANIFEST.json`. Do not scrape publisher or institute wordlists. If a source's terms turn
out to be narrower than the runbook assumes, stop and write it in your status file — the pipeline records
`source` per row precisely so a source can be swapped.

Until the real corpora are in place, ship the pipeline end-to-end on a **50-word sample** you write
yourself (`content/sources/sample.csv`) so every stage is exercised.

### 4. Runbooks in `docs/runbooks/`
- `content-sources.md` — sources, licences, verification steps (pre-seeded; keep it current).
- `deploy.md` — secrets (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_TEXT`, `ANTHROPIC_MODEL_VISION`),
  `supabase db push`, deploying `word-ai`, `scan-words`, `import-scan`, applying the seed, smoke tests.
- `auth-providers.md` — Google: OAuth clients, Supabase Auth provider config, redirect URLs for Expo Go
  (`exp://…/--/auth/callback`) and the app scheme (`einfachlernen://auth/callback`). Apple: Developer
  membership, App ID, Services ID, key, Supabase provider config, `ios.usesAppleSignIn` + bundle id in
  `app.json` (lead change), EAS dev build steps.
- `analytics.md` — replacing the PostHog placeholder key via env; event list from PRD F7.

## Checks before each milestone
`supabase start && supabase db reset` applies 001–006 + seeds cleanly **twice in a row** (idempotency);
`supabase/tests/006_rls.sql` passes; `npx tsx scripts/content/0N_*.ts` runs on the sample without network
except the batch stages; `npm run content:status` renders your `state.json` without errors;
`npm run typecheck`.

## Prompt to paste
```
You are the DATA & INTEGRATIONS agent in a four-agent parallel build of the einfach lernen app (Expo /
React Native client, Supabase Postgres + Edge Functions, Anthropic API). You are in your own git worktree
on branch agent/data.

Read fully, in order, before writing code: docs/PRD-v3.md (especially F5 and §6), docs/agents/CONTRACTS.md
(especially §0 and §1), docs/agents/README.md §4, docs/agents/04-data-integrations.md (your brief),
docs/runbooks/content-sources.md, then supabase/migrations/001–005, the head of
supabase/seeds/001_de_words.sql, and docs/tokens.ts.

Then implement the deliverables in 04-data-integrations.md, milestone by milestone (README §5, data
column). Migration 006 first — the other agents are coding against it. Build the pipeline stages in order
and make each one resumable; write content/state.json after every stage so npm run content:status shows
real progress.

Hard rules: write only in supabase/migrations/006_* and later, supabase/seeds/**, supabase/tests/**,
scripts/content/**, content/**, docs/runbooks/**. Never edit migrations 001-005, CONTRACTS.md,
types/contracts.ts, package.json or app.json. Never touch the remote Supabase project (no db push, no
deploy, no secrets) — local only. There are no licensed wordlists in this project: build the catalogue
from the open sources in the runbook and derive CEFR level by the ensemble in your brief §2a, never by
asking a model to recall a published list. Follow the token-efficiency rules in §2c exactly — batch words
inside each request and use the Batch API. Before submitting any batch, print the word count and cost
estimate and wait for my explicit OK. No new dependencies. Commit small with prefix [data]. Update
docs/agents/status/data.md at each milestone.
```
