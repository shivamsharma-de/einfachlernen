# swapo — PRD v2: Profile, Deck, Scan, Themen, AI

Supersedes nothing; extends `design-spec.md` (visual system) and `CLAUDE_CODE_PROMPT.md` (sequencing).
Where this document and `design-spec.md` disagree, **this document wins** — it carries later decisions.

Status legend: ✅ built · 🟡 partial · ⬜ not started

---

## 1. Scope

Six workstreams, in dependency order:

| # | Workstream | Depends on | Status |
|---|---|---|---|
| 1 | Profile + level selection (single source of truth) | — | ⬜ |
| 2 | Supabase data layer (profile, progress, activity) | 1 | ⬜ |
| 3 | Daily usage tracking (minutes, streak, XP) | 2 | ⬜ |
| 4 | Deck cards + 4-grade SRS | 2 | ⬜ |
| 5 | AI enrichment on the fly (meaning, examples) | 2 | ⬜ |
| 6 | Camera word detection | 5 | ⬜ |
| 7 | Themen + their words | 2 | ⬜ |

---

## 2. Decisions taken (and why)

These were open questions in `CLAUDE_CODE_PROMPT.md`. Resolved here so implementation is unblocked.

### D1 — Level selection lives **only** in Profile

`design-spec.md` §6.1 puts a `LevelChipRow` on Home that re-filters everything below. **Overridden.**
The user's CEFR level is now one value, set during profile creation and changeable only in Profile.

*Why:* two independent level controls (onboarding + Home chips) means two sources of truth for
"what level am I", and the Home chip row silently diverged from `profiles.cefr_level`. One control,
persisted server-side, read everywhere.

*Consequence:* `LevelChipRow` stays in `components/` — it is now the Profile picker, not a Home filter.

### D2 — Deck stores **all** words in the database

Every word the learner meets becomes a row in `word_progress`, not a local blob. AsyncStorage is a
cache with a TTL, never the record of truth.

*Why:* the user explicitly asked for this, and it is what makes the deck survive a reinstall or a
second device. `lib/progress.ts` (local-only, written in the previous phase) is demoted to an offline
write buffer that reconciles against Supabase.

### D3 — Meaning/description/examples are generated **on demand by Claude**, then cached

`de_words` has 168 rows. Rather than seed rich content for thousands of words, the app requests
`{meaning, description, examples[], grammar}` from Claude at the moment a word is first opened, and
writes the result to `de_word_ai` keyed by word. Second open is a DB read.

*Why:* the user asked for "AI access on the fly to reduce the logic and get a predictive output for
description meaning and obj structure". Structured outputs give a guaranteed object shape, so the
client never parses prose.

*Cost control:* cache-on-write means each word is generated at most once **globally**, not per user.

### D4 — OCR is **Claude vision**, not on-device ML Kit

`design-spec.md` §6.2 targets on-device ML Kit text recognition via an Expo config plugin. **Overridden.**

*Why, and this is the important one:* ML Kit via config plugin **does not run in Expo Go**. The user
runs this app by scanning a QR into Expo Go, so an ML Kit build would be untestable for them without
an EAS development build. `expo-camera` *is* bundled in Expo Go. Sending the frame to Claude vision
keeps the whole feature testable in the user's actual workflow and reuses the D3 infrastructure.

*Trade-off accepted:* requires connectivity and costs per scan, where ML Kit is offline and free.
`lib/ocr.ts` keeps the swappable one-function boundary §6.2 asked for, so ML Kit can replace it later
without touching the screen.

### D5 — The Anthropic API key never ships in the app

All Claude calls go through **Supabase Edge Functions**. The client calls the function with the user's
Supabase JWT; the function holds `ANTHROPIC_API_KEY` as a secret.

*Why:* `EXPO_PUBLIC_*` variables are embedded in the JS bundle and readable by anyone with the app.
An API key there is a billable key handed to every user. This is not negotiable.

### D6 — Themen: normalise by migration, keep `category` as-is

Adds a `thema` column to `de_words` populated by a SQL mapping from the existing free-text `category`.
The original `category` is preserved.

*Why:* reversible, and does not break `Word.category` consumers already shipped.

### D7 — Four SRS grades

Extends SM-2 to again/hard/good/easy, as `design-spec.md` §6.4 recommends.

---

## 3. Data model changes

### 3.1 `profiles` (exists — extend)

Already has `cefr_level`, `xp`, `streak`, `last_active_date`, `onboarding_complete`. No change needed;
the gap is that **no client code reads or writes it**.

### 3.2 `word_progress` (exists — extend)

Has `repetitions`, `interval_days`, `next_review_at`, `mastered`. Add for 4-grade SM-2:

| Column | Type | Note |
|---|---|---|
| `ease_factor` | `numeric(4,2)` default `2.50` | SM-2 EF; floor 1.30 |
| `last_grade` | `smallint` | 0=again 1=hard 2=good 3=easy |
| `lapses` | `integer` default 0 | count of `again` after a success |

### 3.3 `daily_activity` (new)

One row per user per day. This is the daily-usage tracking store.

| Column | Type |
|---|---|
| `user_id` | `uuid` → profiles |
| `day` | `date` |
| `minutes` | `integer` |
| `cards_reviewed` | `integer` |
| `xp_earned` | `integer` |

Primary key `(user_id, day)`. Streak is **derived** from consecutive `day` values, not stored — a
stored counter drifts when a day is backfilled or a device clock is wrong.

### 3.4 `de_word_ai` (new)

Global AI cache — not per user.

| Column | Type |
|---|---|
| `word_id` | `text` → de_words, PK |
| `meaning` | `text` |
| `description` | `text` |
| `examples` | `jsonb` — `[{de, en}]` |
| `grammar` | `jsonb` |
| `model` | `text` |
| `generated_at` | `timestamptz` |

### 3.5 `de_words.thema` (new column)

`text`, nullable, populated by mapping migration. Indexed.

### 3.6 `scan_results` (new)

Persists a camera scan so the harvest survives a screen exit.

---

## 4. AI contract

**Model:** `claude-opus-5`. Adaptive thinking. Structured outputs (`output_config.format`) so the
response is a validated object, never parsed prose.

### 4.1 Word enrichment — `POST /functions/v1/word-ai`

Request `{ word_id }`. Returns, and caches to `de_word_ai`:

```jsonc
{
  "meaning":     "one-line English meaning",
  "description": "2-3 sentences on usage/register/nuance",
  "examples":    [{ "de": "...", "en": "..." }],   // exactly 2
  "grammar":     { "plural": "…", "genitive": "…", "auxiliary": "…", "comparative": "…" }
}
```

`grammar` keys vary by word type; all optional.

### 4.2 Scan — `POST /functions/v1/scan-words`

Request `{ image_base64, level }`. Claude vision extracts German words, lemmatised.

```jsonc
{
  "words": [{ "surface": "Häuser", "lemma": "Haus", "type": "noun", "article": "das" }],
  "total_detected": 42
}
```

Server matches lemmas against `de_words.german`; unmatched are dropped (§6.2). The screen shows only
words **strictly above** the user's level; the rest are counted in the status line.

---

## 5. Screens

| Screen | Route | Status |
|---|---|---|
| Profile (level selection, stats, sign out) | `app/(tabs)/profile.tsx` | ⬜ |
| Deck review | `app/(tabs)/deck.tsx` | ⬜ |
| Scan | `app/(tabs)/scan.tsx` | ⬜ |
| Themen browser | `app/themen/[thema].tsx` | ⬜ |
| Home (drop level chips per D1) | `app/(tabs)/index.tsx` | 🟡 |

### 5.1 Tab bar

Per §6.6, five tabs, no more: **Heute · Deck · Scan · Wörter · Profil**. Phrases folds into Wörter as
a segmented control; Ranks (leaderboard) moves inside Profil.

---

## 6. Explicitly out of scope for this pass

- The `1d` tap-on-page scan variant (§6.2) — the list version ships first.
- The `1e` cloze card type (§6.4) — a second card type, not a blocker.
- Migrating `de_words.english` to `{text, domain}[]` — D3 makes the domain label an AI field instead.
- Seeding beyond 168 words.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| **Per-scan and per-word AI cost** is unbounded if a user spams | Cache-on-write (D3); rate-limit per user in the Edge Function |
| Claude vision misreads Fraktur/handwriting | Unmatched lemmas are dropped, never guessed (§6.2) |
| Edge Functions need secrets the developer must set | Documented in §8; the app degrades to cached content when the function is unreachable |
| Only 168 seed words, ~113 of them A1 | Themen shelves will be thin above A2 until seeding grows |
| No simulator in the dev environment | Every change verified by `tsc` + a real `expo-router/entry` bundle build; on-device check is the developer's |

---

## 8. Deploy steps the developer must run

These need credentials this agent does not have:

```bash
# 1. Apply migrations
supabase db push

# 2. Set the API key as a function secret (NOT an EXPO_PUBLIC var)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 3. Deploy the functions
supabase functions deploy word-ai
supabase functions deploy scan-words
```
