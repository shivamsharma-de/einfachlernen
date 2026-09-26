# Content pipeline

Turns open corpora into confidence-scored vocabulary rows. No licensed wordlist
(PRD D12) — CEFR level is *derived* from four independent signals and only ships
when they agree.

Plain `.mjs` run with `node`, not TypeScript with `tsx`: these scripts need
`node:fs` and `process`, and `@types/node` is not a project dependency — adding
it just to type nine build scripts would slow `npm run typecheck` for everyone.

## Run order

```bash
node scripts/content/00_fetch_sources.mjs          # open corpora + MANIFEST (licence, sha256)
node scripts/content/01_pool.mjs [--take=12000]    # candidate word forms + gold-set snapshot
node scripts/content/02_signals.mjs                # spoken bias + morphology per form
node scripts/content/03_level.mjs --yes            # ⚠ spends: lemma, POS, teachable, level ×3
node scripts/content/04_gate.mjs [--threshold=0.7] # lemma aggregation, ensemble, gate
node scripts/content/05_calibrate.mjs              # accuracy vs the gold set; pick the threshold
node scripts/content/06_enrich.mjs --only-derived --yes   # ⚠ spends: article, forms, examples
node scripts/content/07_validate.mjs --escalate --yes     # ⚠ may spend: rule checks + repair
node scripts/content/08_seed.mjs                   # supabase/seeds/010_de_words_v3.sql
supabase db reset                                  # apply it
```

Watch it with `npm run content:status` (add `-- -w` to refresh).

## Rules

- **Every stage that calls a model prints a cost estimate and stops** unless
  `--yes` is passed. Never remove that gate.
- **Every stage is resumable.** Stage 03 and 06 append and skip what they
  already have, so an interrupted run costs nothing to restart.
- **Stage order matters more than it looks.** The frequency *band* is computed in
  stage 04, not 02, because a rank over word forms is meaningless — `gehen`,
  `geht` and `ging` must collapse into one lemma with their frequencies summed
  first, and lemmas only exist after stage 03.

## Token efficiency (brief §2c)

| Lever | Effect |
|---|---|
| 50 words per classification request | ~12 input tokens per word instead of ~270 |
| 20 words per enrichment request | output is the costly side here, so smaller batches |
| short JSON keys (`l`, `v`, `k`) | output tokens are 5× the price of input |
| cheap gate before expensive pass | never enrich a word that failed agreement |
| Haiku first, Opus only on validator failures | the validator is what makes the cheap pass safe |
| no thinking on classification, `effort: low` on enrichment | labelling is not reasoning |

For the full ~10k catalogue this lands around **$10**. If an estimate comes out
far above that, something is mis-batched — check the per-request word count
before paying for it.

## What is still missing

- **`wiktionary_de.jsonl`** (kaikki.org extract, CC BY-SA) is not downloaded, so
  stage 07 runs rule checks only. Articles and plurals are currently the model's
  word against itself. Adding the extract is the single biggest quality upgrade
  available and costs nothing per word.
- **The gold set is 82 words**, not the ~300 the brief asks for: it is the subset
  of the hand-authored `de_words` rows that are single tokens. Small, and it
  covers A1 far better than C1. Treat stage 05's numbers as a sanity check on the
  method, not a certification.
- **Message Batches** would halve the model cost. The stages currently run
  synchronously with bounded concurrency because that returns in minutes rather
  than up to 24 hours; for a full re-run, batch mode is the right choice.
