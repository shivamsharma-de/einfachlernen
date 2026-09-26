# Contracts between agents

This file is the **only** thing agents may assume about each other's work. If it is not written here, do not
depend on it. Every agent reads this file fully before starting.

**Changing a contract:** never edit this file on your branch. Write the proposal in your status file
(`docs/agents/status/<agent>.md` → "Contract change requests"), stop depending on the change, and continue.
The lead merges approved changes to `main`; everyone rebases.

The TypeScript in §3 and §4 is committed to `main` during bootstrap as `types/contracts.ts` and stub
functions, so every branch compiles against the same shapes from minute one.

---

## 0. File ownership

An agent writes **only** inside its own paths. Reading anything is fine.

| Path | Owner |
|---|---|
| `supabase/migrations/006_*.sql` and later, `supabase/seeds/**`, `supabase/tests/**`, `scripts/content/**`, `content/**`, `docs/runbooks/**` | **data** |
| `supabase/functions/**`, `lib/**` (except `lib/supabase.ts`), `lib/__tests__/**` | **backend** |
| `components/**`, `constants/Colors.ts`, `docs/design/**`, `assets/**` | **design** |
| `app/**`, `hooks/**`, `context/**`, `_screens_auth/**` (to be moved into `app/`) | **frontend** |
| `types/contracts.ts`, `docs/agents/CONTRACTS.md`, `package.json`, `app.json`, `lib/supabase.ts`, `types/index.ts` | **lead only** (bootstrap / merges) |
| `docs/agents/status/<agent>.md` | that agent |

Nobody edits migrations `001`–`005` — they are already applied to the remote project.

---

## 1. Database (migration `006_v3_decks_scan_content.sql`, owner: data)

Idempotent, like 001–005.

```sql
-- de_words
ALTER TABLE de_words
  ADD COLUMN IF NOT EXISTS level_source   text NOT NULL DEFAULT 'official'
       CHECK (level_source IN ('official','estimated')),
  ADD COLUMN IF NOT EXISTS review_status  text NOT NULL DEFAULT 'reviewed'
       CHECK (review_status IN ('draft','reviewed')),
  ADD COLUMN IF NOT EXISTS frequency_rank integer,
  ADD COLUMN IF NOT EXISTS lemma_key      text GENERATED ALWAYS AS (lower(german)) STORED;
CREATE INDEX IF NOT EXISTS de_words_lemma_key_idx ON de_words (lemma_key);
CREATE INDEX IF NOT EXISTS de_words_level_rank_idx ON de_words (level, frequency_rank);

-- profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_new_cards integer NOT NULL DEFAULT 10
  CHECK (daily_new_cards BETWEEN 1 AND 50);

-- word_progress
ALTER TABLE word_progress ADD COLUMN IF NOT EXISTS added_via text NOT NULL DEFAULT 'level'
  CHECK (added_via IN ('level','scan','manual'));

-- user_words: private words created from scans (PRD D11). id prefix 'u_' so
-- word_progress.word_id (text, no FK) can reference either table unambiguously.
CREATE TABLE IF NOT EXISTS user_words (
  id              text PRIMARY KEY DEFAULT ('u_' || gen_random_uuid()),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  german          text NOT NULL,
  article         text CHECK (article IN ('der','die','das')),
  word_type       text NOT NULL,          -- same values as de_words.word_type
  english         text NOT NULL,
  level           text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  forms           jsonb NOT NULL DEFAULT '{}',
  example_de      text,
  example_en      text,
  source_scan_id  uuid REFERENCES scan_results(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  lemma_key       text GENERATED ALWAYS AS (lower(german)) STORED,
  UNIQUE (user_id, lemma_key)
);
-- RLS: owner-only for all operations.

-- scan_results
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS page_count integer NOT NULL DEFAULT 1;

-- deck_words: one read shape for the client. security_invoker so RLS of the
-- caller applies to user_words.
CREATE OR REPLACE VIEW deck_words WITH (security_invoker = true) AS
  SELECT id, german, article, word_type, english, level, level_source, forms,
         example_de, example_en, frequency_rank, thema, 'catalogue'::text AS origin
    FROM de_words WHERE review_status = 'reviewed'
  UNION ALL
  SELECT id, german, article, word_type, english, level, 'estimated', forms,
         example_de, example_en, NULL, NULL, 'scan'
    FROM user_words WHERE user_id = auth.uid();
```

Also owned by data: an RPC `next_new_words(p_level text, p_limit int)` returning `deck_words` rows at
`p_level` that have no `word_progress` row for `auth.uid()`, ordered by `frequency_rank NULLS LAST, id`.

`de_word_ai` is unchanged; for `u_` ids the backend writes enrichment into `user_words` instead.

---

## 2. Edge Functions (owner: backend)

All: `POST`, `Authorization: Bearer <user JWT>`, JSON in/out, errors as `{ "error": "<code>" }` with HTTP status.
Model IDs come from env `ANTHROPIC_MODEL_TEXT` / `ANTHROPIC_MODEL_VISION`.

### 2.1 `word-ai` (exists — extend)
Request `{ word_id }` where id is a `de_words` id **or** a `u_` id. Response `WordEnrichment` (§3).
Errors: `word_not_found` 404, `rate_limited` 429, `ai_failed` 502.

### 2.2 `scan-words` (exists — replace body)
Request `{ images: string[] /* base64 JPEG, 1–5 */, level: CEFRLevel }`.
Response `ScanResponse` (§3). Errors: `too_many_pages` 400, `image_too_large` 413 (any page > 5MB decoded),
`rate_limited` 429 (30 pages/hour), `vision_failed` 502.
Stores the candidate list in `scan_results.detected` (no images).

### 2.3 `import-scan` (new)
Request `{ scan_id: string, keys: string[] }`. Creates `user_words` for selected `origin:'new'` candidates,
`word_progress` rows (`added_via='scan'`, `next_review_at=today`) for all selected; idempotent on repeat.
Response `{ imported: number, word_ids: string[] }`. Errors: `scan_not_found` 404.

---

## 3. Shared types — `types/contracts.ts` (lead commits in bootstrap)

```ts
import type { Article, CEFRLevel, WordType } from './index';

export type LevelSource = 'official' | 'estimated';
export type WordOrigin = 'catalogue' | 'scan';
export type Grade = 0 | 1 | 2 | 3; // Nochmal | Schwer | Gut | Leicht

export interface ExampleSentence { de: string; en: string }

/** Row of the `deck_words` view. */
export interface DeckWord {
  id: string;                 // de_words id, or 'u_…' for user_words
  german: string;
  article: Article | null;
  word_type: WordType;
  english: string;
  level: CEFRLevel;
  level_source: LevelSource;
  forms: Record<string, unknown>;
  example_de: string | null;
  example_en: string | null;
  frequency_rank: number | null;
  thema: string | null;
  origin: WordOrigin;
}

export interface WordEnrichment {
  meaning: string;
  description: string | null;
  examples: ExampleSentence[];                  // exactly 2 when present
  grammar: Partial<Record<'plural' | 'genitive' | 'auxiliary' | 'past_participle'
                        | 'separable' | 'comparative' | 'superlative', string>>;
}

/** Structurally identical to SRSState in lib/srs.ts. */
export interface SRSSnapshot { repetitions: number; intervalDays: number; easeFactor: number; lapses: number }

export interface DeckCard {
  word: DeckWord;
  enrichment: WordEnrichment | null;            // null until loaded; UI must render without it
  srs: SRSSnapshot;
  isNew: boolean;
  intervals: readonly [string, string, string, string]; // labels from lib/srs.ts previewIntervals(), feed GradeRow as-is
}

export interface DeckSession {
  id: string;                                   // `${userId}:${YYYY-MM-DD}:${n}`
  seed: number;
  queue: DeckCard[];
  position: number;
  stats: { due: number; new: number; reviewed: number };
}

export interface ScanCandidate {
  key: string;                                  // stable within a scan: lemma_key
  german: string;                               // lemma
  surface: string;                              // as seen on the page
  article: Article | null;
  word_type: WordType | 'other';
  english: string;
  level: CEFRLevel;
  level_source: LevelSource;                    // 'official' if matched in catalogue
  origin: 'catalogue' | 'new';
  word_id: string | null;                       // de_words id when origin='catalogue'
  example_de: string | null;
  example_en: string | null;
  page: number;                                 // 1-based, first page it appeared on
}

export interface ScanResponse {
  scan_id: string;
  pages: number;
  candidates: ScanCandidate[];                  // only relevant words (PRD D10)
  counts: { total_detected: number; already_in_deck: number; below_level: number; unreadable: number };
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string /* German, user-facing */ };
```

---

## 4. Client library API — `lib/api.ts` (owner: backend; frontend consumes)

Frontend imports **only from `lib/api.ts`** for anything in this section (plus the existing `lib/activity.ts`
and `lib/profile.ts` exports it already uses). Bootstrap commits `lib/api.ts` with these signatures as stubs
(async ones return `{ ok:false, error:'Noch nicht verfügbar' }`, pure ones do the simplest correct thing), so
frontend builds UI against them immediately. Backend replaces bodies — usually by delegating to
`lib/deck.ts`, `lib/ocr.ts`, `lib/ai.ts`, which it may restructure freely — and never changes signatures.
Existing `WordEnrichment` in `lib/ai.ts` must become a re-export of the contract type.

```ts
// deck
export function buildSession(userId: string, level: CEFRLevel, opts?: { maxCards?: number; seed?: number }): Promise<Result<DeckSession>>;
export function resumeSession(userId: string): Promise<DeckSession | null>;          // today's persisted session
export function shuffleRemaining(session: DeckSession, seed?: number): DeckSession;   // pure
export function gradeCard(session: DeckSession, grade: Grade): Promise<DeckSession>;  // persists, re-queues 'again'
export function addToDeck(userId: string, wordIds: string[], via: 'level'|'scan'|'manual'): Promise<Result<number>>;

// shuffle — pure, unit-tested; implementation lives in lib/shuffle.ts
export function mulberry32(seed: number): () => number;
export function constrainedShuffle<T>(items: T[], isNew: (t: T) => boolean, rng: () => number, maxNewRun?: number): T[];
export function reinsertIndex(position: number, length: number, rng: () => number): number; // 3–5 ahead, clamped

// enrichment
export function getEnrichment(wordId: string): Promise<Result<WordEnrichment>>;
export function prefetchEnrichment(wordIds: string[]): void;

// scan
export function preparePage(uri: string): Promise<string>;                   // resize ≤1600px, JPEG .7, → base64
export function scanPages(imagesBase64: string[], level: CEFRLevel): Promise<Result<ScanResponse>>;
export function importScan(scanId: string, keys: string[]): Promise<Result<{ imported: number; word_ids: string[] }>>;

// profile
export function updateDailyNewCards(userId: string, n: number): Promise<Result<void>>;
```

---

## 5. Components (owner: design; frontend consumes)

Existing: `Eyebrow, GradeRow, LevelBadge, LevelChipRow, PillButton, ProgressRing, SectionShelf, StatPair,
WordCard, WordRow`. Props of existing components may **gain optional** props only.

New, exported from `components/index.ts`:

```ts
WordCardBack      { card: DeckCard; onSpeak(): void }                 // full back layout, AI skeleton while enrichment=null
ExampleSentence   { sentence: ExampleSentence; highlight: string }    // headword in violet
GrammarLine       { word: DeckWord; enrichment: WordEnrichment | null }
OriginTag         { origin: WordOrigin | 'new' }                      // "Scan" / "Neu"
EstimatedNote     { }                                                 // "Wortliste geschätzt" mono note
AuthButton        { provider: 'google' | 'apple' | 'email'; onPress(): void; loading?: boolean }
LevelOption       { level: CEFRLevel; selected: boolean; wordCount: number; estimated: boolean; onPress(): void }
PageThumbStrip    { uris: string[]; onRemove(i: number): void; onAdd(): void; max: number }
ScanCandidateRow  { c: ScanCandidate; checked: boolean; onToggle(): void; expanded: boolean; onExpand(): void }
EmptyState        { title: string; body?: string; action?: { label: string; onPress(): void } }
Skeleton          { width: number | string; height: number }
```

---

## 6. Routes (owner: frontend)

`app/index.tsx` auth gate → `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/auth/callback.tsx`,
`app/onboarding/index.tsx` (**not** `(onboarding)/index` — a route group index would resolve to `/` and collide
with `(tabs)/index`), tabs `(tabs)/index|deck|scan|phrases|profile`. Scan review may be a nested
route `app/scan/review.tsx`.
