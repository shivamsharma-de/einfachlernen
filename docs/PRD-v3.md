# einfach lernen — PRD v3: Level decks, Scan-to-deck, Vocabulary content

Extends `PRD-v2.md` (decisions D1–D7 still stand) and `design-spec.md` (visual system).
Where this document disagrees with either, **this document wins**.
Parallel execution plan: `docs/agents/README.md`. Interfaces between agents: `docs/agents/CONTRACTS.md`.

Stack as it actually is: **Expo 57 / React Native / expo-router / TypeScript**, Supabase (Postgres + Auth +
Edge Functions on Deno), Anthropic API behind Edge Functions, PostHog analytics.

Priority legend: **P0** = MVP, blocks release · **P1** = MVP-nice, ship if time · **P2** = later.
Status legend: ✅ built · 🟡 partial / uncommitted · ⬜ not started.

---

## 1. Product in one paragraph

A German learner signs in, picks the CEFR level they are training for (A1–C2), and gets a deck of flashcards
drawn from a frequency-ordered, confidence-scored word list for that level. Each card shows the word with its article, its meaning,
grammar forms and two example sentences. The deck is shuffled and can be dipped into many times a day; a
spaced-repetition scheduler decides what is due. The second feature is the camera: the learner photographs one
or more pages of a German text, the app finds the words on those pages that are worth learning *for this
learner*, and turns them into cards in the same deck.

## 2. Goals and non-goals

**Goals (this release)**
1. Sign-in to deck in under 60 seconds for a new user.
2. A credible word list for every level: ~10,000 words from open corpora, each with a measured level confidence, and only high-confidence words shown as settled (D12).
3. Every card complete: article, meaning, grammar, two example sentences — no empty backs.
4. Scan 1–5 pages → reviewed list of relevant words → imported into the deck in under 30 seconds per page.

**Non-goals (this release)** — quiz/hearts mode changes, leaderboard, phrases/Redemittel, cloze cards
(`1e`), tap-on-page scan (`1d`), offline scanning, other languages, social features, payments.

## 3. Personas

- **Anna, B1, living in Germany** — prepares for telc B2, reads newspapers, wants unknown words from real texts.
- **Ravi, A1 beginner** — needs structure; will use only the level deck at first.

---

## 4. Features and requirements

### F1 — Authentication · P0 · 🟡

Google sign-in exists in `context/auth.tsx`, but `_screens_auth/` is **outside `app/`**, so the login and
onboarding screens never mount and `app/index.tsx` redirects straight into the tabs.

| ID | Requirement | Pri |
|---|---|---|
| F1.1 | Google sign-in via Supabase OAuth (existing `signInWithGoogle`) works in Expo Go on iOS and Android. | P0 |
| F1.2 | Auth gate: unauthenticated → `/(auth)/login`; authenticated with `onboarding_complete=false` → onboarding; otherwise → tabs. | P0 |
| F1.3 | Session persists across restarts (SecureStore/AsyncStorage adapter already in `lib/supabase.ts`). | P0 |
| F1.4 | Sign out from Profil clears session, local deck cache and PostHog identity. | P0 |
| F1.5 | **Sign in with Apple** via `expo-apple-authentication` + `supabase.auth.signInWithIdToken`. Needs an EAS dev build (does not run in Expo Go) and an Apple Developer account. Required before App Store submission (App Review guideline 4.8 when a third-party login is offered). | P1 |
| F1.6 | Email/password stays available as fallback (already implemented). | P1 |

**Decision D8 — Google first, Apple before store submission.** Google already works in the user's Expo Go
workflow; Apple needs native build infrastructure. The login screen reserves the Apple button slot so adding it is
not a layout change.

**Acceptance:** fresh install → Google → onboarding → deck, no manual navigation; kill app → reopen → still signed in.

### F2 — Onboarding & level selection · P0 · 🟡

| ID | Requirement | Pri |
|---|---|---|
| F2.1 | Onboarding asks for display name (optional) and target level A1–C2, with a one-line description of each level ("A1 — Grundlagen, ~650 Wörter"). | P0 |
| F2.2 | Level is written to `profiles.cefr_level`; `onboarding_complete=true`. Single source of truth (D1). | P0 |
| F2.3 | Onboarding asks for daily new-card count: 5 / 10 / 20 (default 10) → `profiles.daily_new_cards`. | P1 |
| F2.4 | Level changeable only in Profil; changing it does **not** delete progress — it changes which new cards are introduced. | P0 |
| F2.5 | The "Wortliste geschätzt" note is shown **per word by confidence**, not per level: any word with `level_source='estimated'` carries it. With the ensemble gate most levels are mostly `derived`, so the note marks genuine uncertainty rather than blanketing B2–C2. | P0 |

### F3 — Level deck & cards · P0 · 🟡

The deck screen, SM-2 four-grade scheduler (`lib/srs.ts`), `useSRS` and AI enrichment exist uncommitted.
v3 adds the session builder, shuffle, and the full card content.

**Card content (back of card)** — every field below must be present or gracefully omitted, never "undefined":

| Field | Source |
|---|---|
| Article (`der/die/das`, article colour) + headword (serif) | `de_words` |
| Word type + level badge | `de_words` |
| Meaning (English, one line) | `de_words.english`, refined by `de_word_ai.meaning` |
| Grammar line: plural / genitive for nouns; Partizip II + auxiliary + separable for verbs; comparative/superlative for adjectives | `de_words.forms` ∪ `de_word_ai.grammar` |
| **Two** example sentences, German with headword highlighted, English beneath | `de_word_ai.examples` (fallback `example_de/en`) |
| TTS button, locale `de-DE` | `expo-speech` |

| ID | Requirement | Pri |
|---|---|---|
| F3.1 | **Session builder**: due cards (`next_review_at ≤ today`, most overdue first) + up to `daily_new_cards` unseen words from the user's level (catalogue order = frequency rank) + any scanned cards not yet reviewed. Max session 30 cards. | P0 |
| F3.2 | **Shuffle** (D9): Fisher–Yates over the session queue with a seeded RNG, then a constraint pass so no more than 2 new cards appear consecutively. A "Mischen" button reshuffles the *remaining* queue. | P0 |
| F3.3 | Grade "Nochmal" re-inserts the card 3–5 positions later in the same session (random within range). | P0 |
| F3.4 | "Throughout the day": the day's queue and position persist locally (AsyncStorage, keyed by user + date); closing and reopening resumes. After finishing, "Weiter lernen" builds a new session from remaining due + next new cards. | P0 |
| F3.5 | Grade buttons show real computed intervals (already required by v2). | P0 |
| F3.6 | Card back never waits on AI: render catalogue fields immediately, fill AI fields when `word-ai` returns; prefetch enrichment for the next 3 cards. | P0 |
| F3.7 | Card origin marker: a small "Scan" tag on cards that came from a scan. | P1 |
| F3.8 | Empty states: nothing due → show next due time + "Neue Wörter lernen" (introduces next batch beyond the daily cap). | P0 |
| F3.9 | Browse my deck (list, filter by level/origin, remove a card). | P2 |

**Decision D13 — the card runs English → German, and grading is a swipe.** The front shows only the
English meaning and the level badge; flipping reveals the German headword with its article, grammar line
and examples. This is production practice rather than recognition: the learner has to *produce* the
German, article included, which is the direction that builds speaking ability and the one where a wrong
`der/die/das` actually gets caught. It supersedes design-spec §6.4, which assumed a German-first front.

Grading is a horizontal swipe on the card, with the existing `GradeRow` buttons kept as an accessible
equivalent (a swipe is not operable by every user, design-spec §8):

| Gesture | Grade | Meaning |
|---|---|---|
| Swipe **right** | `2` (Gut) | learned — schedule it forward |
| Swipe **left** | `0` (Nochmal) | show it again this session (F3.3: re-insert 3–5 cards later) |

Swipe is implemented with React Native's built-in `PanResponder` + `Animated`. `react-native-reanimated`
and `react-native-gesture-handler` are **not** installed and must not be added.

**Decision D9 — Shuffle is Fisher–Yates with light constraints, not pure random.** Pure random can put 8 new
words in a row, which is the most discouraging session possible. Seeded so a resumed session reproduces the
same order.

**Acceptance:** A1 user with 0 progress gets 10 new cards, shuffled, each back complete; grade all "Gut" → 0 due
today; relaunch → deck shows "fertig" state, not the same 10 cards.

### F4 — Scan pages → cards · P0 · 🟡

Exists for one image, but only keeps words that are in the 168-word catalogue — so most scans return nothing.

| ID | Requirement | Pri |
|---|---|---|
| F4.1 | Capture **1–5 pages** per scan session with `expo-camera`; thumbnail strip, retake/remove a page, "Auswerten". Also allow picking from photo library. | P0 |
| F4.2 | Each page resized client-side to long edge ≤ **1280px**, JPEG q≈0.7 (`expo-image-manipulator`) before upload. Vision input is billed by pixel area, so 1280 caps a page near ~1,200 tokens against ~2,450 at 1600 — roughly 35% off every scan. If OCR accuracy on small print suffers, raise it back and say so. | P0 |
| F4.3 | `scan-words` processes all pages in one call; dedupes lemmas across pages. | P0 |
| F4.4 | **Relevance rule** (D10): a word is shown if it is (a) a content word, (b) not already in the user's deck, and (c) at or above the user's level — catalogue level if matched, model-estimated level otherwise. Everything else is counted in the status line ("42 erkannt · 12 schon im Deck · 18 unter deinem Niveau"). | P0 |
| F4.5 | **Words not in the catalogue are no longer dropped** (supersedes v2 §4.2 / design-spec §6.2). The vision pass returns article, word type, English meaning and an estimated level for every word; unmatched words become private `user_words` on import, tagged "Neu". | P0 |
| F4.6 | Review list grouped Nomen / Verben / Adjektive / Andere, all pre-checked, each row shows article + word + meaning + level; tap row to expand example sentence. | P0 |
| F4.7 | Import creates `word_progress` rows (`added_via='scan'`) due today, and the words appear in the next deck session. | P0 |
| F4.8 | Scan history: list of past scans with count imported, re-open to import leftovers. | P2 |
| F4.9 | Rate limit 30 scan *pages*/hour/user; image never stored server-side (privacy). | P0 |

**Decision D10 — "Relevant" = at or above level, not strictly above.** v2 said strictly above; but a B1 learner
training B1 wants unknown B1 words. Already-known words are removed by (b) instead. Configurable later.

**Decision D11 — Unknown words go to `user_words`, not the global catalogue.** Model output is unreviewed; it
must not leak into other users' decks. A later admin job can promote frequently-scanned words into `de_words`.

**Acceptance:** photograph 2 pages of a B1 newspaper article as a B1 user → ≥ 10 words listed, none already in
deck, each with article (for nouns) and meaning; import → they appear in the deck session within the same launch.

### F5 — Vocabulary content · P0 · ⬜

| ID | Requirement | Pri |
|---|---|---|
| F5.1 | **Open corpora only — no licensed wordlists** (decision D12). Candidate pool from the Leipzig Corpora Collection German frequency list, lemmatised and filtered to ~10,000 teachable entries. Sources, licences and SHA256 recorded per file. | P0 |
| F5.2 | **Level is derived, and its confidence is measured.** Four independent signals — written frequency band (cumulative A1 ≈650 / A2 ≈1,300 / B1 ≈2,400 / B2 ≈4,400 / C1 ≈7,400 / C2 ≈10,000), spoken:written ratio, morphological complexity, and three model samples. A word is `level_source='derived'` only when frequency band and all three samples agree within one level and `level_confidence` clears the calibrated threshold; otherwise `'estimated'` and held at `review_status='draft'`. | P0 |
| F5.3 | Every row gets: article, word_type, english, forms, 2 examples — generated in bulk by the Anthropic **Batch API** (cheaper, async), written with `review_status='draft'`. | P0 |
| F5.4 | **Calibration replaces bulk review.** A ~300-word gold set (uncontroversial levels, all six bands) is hand-checked once, ~2 hours. The ensemble is scored against it; the gate threshold is chosen from that table and recorded. Ship only if within-one-level accuracy ≥ 85% — below that, stop and report. Grammar is verified per row against Wiktionary, not by a human. | P0 |
| F5.5 | `frequency_rank` on every row, so new cards are introduced most-useful-first. | P0 |
| F5.6 | Map every word to one of the canonical Themen (existing `thema` column). | P1 |

**Decision D12 — no licensed wordlists, levels are derived and measured.** Goethe/telc/publisher lists are
copyrighted and are not used. Frequency rank is an observed property of a corpus, not a creative work, so
the open route is clean; the level assignment is our own method, and its accuracy is a number from the gold
set rather than borrowed authority. Consequence to accept: **our bands will not match Goethe's exactly** —
a learner cramming for a specific exam will meet words in their deck that are not on that exam's list. The
product claim is "the ~10,000 most useful German words, banded by level and ordered by frequency". Sources,
licences and verification steps: `docs/runbooks/content-sources.md`. **Not legal advice — confirm terms with
each source at download time.**

### F6 — Profile & daily progress · P0 · 🟡

Profile screen, `daily_activity`, `log_activity()` and `current_streak()` exist uncommitted. P0 remaining:
level switch (F2.4), daily new-card setting, sign out (F1.4), today's minutes/cards/streak. Stats beyond that P2.

### F7 — Analytics · P1

PostHog events: `signed_in{provider}`, `onboarding_completed{level}`, `session_started{due,new}`,
`card_graded{grade,origin}`, `deck_shuffled`, `scan_started{pages}`, `scan_completed{shown,new,ms}`,
`scan_imported{count}`. No word text or images in analytics.

---

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Deck opens < 1.5s on warm start with ≤ 30 cards; card flip < 100ms; scan result < 15s for 3 pages at p50. |
| Offline | Deck review works offline for the current session; grades buffer locally (`lib/progress.ts`) and sync on reconnect. Scan requires connectivity (states so). |
| Security | Anthropic key only in Edge Function secrets (D5). RLS on every user table. `de_words`/`de_word_ai` writable only by service role. |
| Privacy | Scan images are sent to Anthropic for processing and not stored by us; say so on first scan. Account deletion deletes all user rows (cascade already in place). |
| Cost | Word enrichment cached globally (once per word). Scan: one vision call per session, ≤ 5 pages. Model IDs set by env var (`ANTHROPIC_MODEL_TEXT`, `ANTHROPIC_MODEL_VISION`), never hard-coded. |
| Accessibility | design-spec §8 (4.5:1 contrast, ≥ 44pt targets, German labels wrap). |
| Quality gates | `npx tsc --noEmit` clean; `npx expo export --platform ios` bundles; `deno check` on every Edge Function; migrations apply cleanly on `supabase db reset`. |

## 6. Data model changes (migration `006_*`)

Summary — exact columns in `docs/agents/CONTRACTS.md` §1.

- `de_words`: + `level_source`, `review_status`, `frequency_rank`, `lemma_key` (lowercased, for matching).
- `profiles`: + `daily_new_cards`.
- `word_progress`: + `added_via` (`level` | `scan` | `manual`).
- **new** `user_words`: private words created by scans (D11).
- **new** view `deck_words`: `de_words` (reviewed) ∪ caller's `user_words`, one shape for the client.
- `scan_results`: + `page_count`, + `detected` holds the full candidate list for import.

## 7. Open questions (defaults chosen; change them here)

| # | Question | Default taken |
|---|---|---|
| Q1 | New cards per day default | 10 |
| Q2 | Relevance: at-or-above vs strictly-above level | at-or-above (D10) |
| Q3 | Should scanned unknown words ever be promoted to the global catalogue? | Not in this release (D11) |
| Q4 | Who reviews A1–A2 content, and how long do they have? | **Resolved by D12** — no bulk review. One person spot-checks the ~300-word gold set once (~2h); the gate does the rest. |
| Q5 | Commercial release or personal/non-commercial? | **No longer gates the wordlist** (D12). Still relevant to anything redistributed under CC BY-SA — currently only the build-time Wiktionary extract. |
| Q6 | Apple Developer account available? | Needed for F1.5 only |

## 8. Release checklist

1. Commit current uncommitted v2 work to `main` (bootstrap, `docs/agents/README.md` §2).
2. Four agents run in parallel (`docs/agents/`).
3. Merge in order Data → Backend → Design → Frontend; integration pass.
4. Human: set secrets, `supabase db push`, deploy functions, configure OAuth providers (runbook from Data agent).
5. On-device test in Expo Go (Google) and EAS dev build (camera + Apple).
