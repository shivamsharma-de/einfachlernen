# frontend status

Brief: `docs/agents/02-frontend.md` · Branch `agent/frontend` · Worktree `../el-frontend`
Owns: `app/**`, `hooks/**`, `context/**`, `_screens_auth/**` (move into `app/`)

Rebased onto `main` at `28861ef`. The deck half of `lib/api.ts` is real and both screens are built
against it. `getEnrichment` / `prefetchEnrichment` are still stubs; nothing renders through them,
so the card back is complete without AI (F3.6).

## Done

**F2 — level selection · `app/onboarding/index.tsx`, `hooks/useLevelCounts.ts`**
Six A1–C2 options, German description first and English beneath, each with the real count of words
the deck can serve at that level. Selecting writes through `lib/profile.ts` — `completeOnboarding`
on first run, `updateLevel` on a later change, which touches `cefr_level` and nothing else (F2.4) —
and navigates to the deck. Per-level "Wortliste geschätzt" when more than half a level's words are
`level_source='estimated'` (F2.5). Loading skeletons, a non-blocking count error, and a save error
that keeps the chosen level on screen.

**F3 / D13 — swipe deck · `app/(tabs)/deck.tsx`, `hooks/useDeckSession.ts`, `hooks/grammar.ts`**
English → German. Front is the English meaning and the level badge, nothing else. Back is article
in its colour + serif headword, the grammar line from `forms`, then `example_de` with `example_en`.
Tap flips (130ms, native driver). Swipe right = `gradeCard(session, 2)`, left = `gradeCard(session,
0)`, on `PanResponder` + `Animated` — no reanimated, no gesture-handler. `GradeRow` with the real
`card.intervals` stays on screen whenever swiping is possible, "Mischen" calls `shuffleRemaining()`,
and progress shows as "n von m" plus a 4px bar. `resumeSession()` on mount, `buildSession()` only if
it returns null.

**Routing · `app/index.tsx`, `app/(tabs)/profile.tsx`**
`onboarding_complete === false` routes to level selection. Profil keeps its one-tap chips and links
to the full picker.

### Two corrections the real API forced

1. `buildSession` signals "nothing is due" as `{ ok:false, error:'Heute ist nichts fällig…' }`. The
   hook matches that copy (`NOTHING_DUE`) and routes it to the empty state instead of a red error
   the learner did nothing to earn. See the contract request below — matching German prose is the
   wrong seam.
2. "Nochmal" on the last card of a queue re-inserts it at the only index there is, so the same card
   returns and React reuses the `SwipeCard` instance with `pan` still parked off screen. Fixed by
   recentring `pan` on every grade cycle.

### Counts, measured

Read-only against the live project, `deck_words`, on 2026-09-26:

| | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| reviewed | 365 | 296 | 923 | 1343 | 259 | **0** |
| estimated | 0 | 0 | 0 | 0 | 0 | 0 |

3,186 total, matching the "reviewed and visible" figure in the brief. The brief's layout numbers
(A1 488 / A2 922 / B1 2426 / B2 3807 / C1 2104 / C2 5) are the whole 9,752-row catalogue including
drafts, which `deck_words` filters out — the screen shows what the deck can actually serve.
**C2 has nothing released**, so its tile reads "Noch keine Wörter" rather than "0 Wörter"; a learner
who picks it lands on the empty state with "Niveau ändern". Worth the data agent's attention.
Because every reviewed row is `derived`, the "Wortliste geschätzt" note is currently correct to
never appear.

## In progress

Nothing. Both screens are done and all four gates pass.

## Blocked on

Nothing blocking. Waiting on, but building around:

- `components/**` from design: `WordCardBack`, `GrammarLine`, `ExampleSentence`, `OriginTag`,
  `EstimatedNote`, `LevelOption`, `EmptyState`, `Skeleton`. All eight are composed inline in the two
  screens against the exact props in CONTRACTS §5, so each swap is mechanical. `hooks/grammar.ts` is
  the pure formatting behind `GrammarLine`; it moves behind the component unchanged.
- The auth gate. `_screens_auth/` is still unrouted, so `app/index.tsx` gates only on
  `onboarding_complete`, not on a session.

## Contract change requests

1. **"Nothing due" should be a value, not a sentence.** `buildSession` returns
   `{ ok:false, error:'Heute ist nichts fällig. Gut gemacht!' }` for an empty queue, which is
   indistinguishable from a dropped connection except by its wording. Frontend matches
   `/nichts f(ä|ae)llig/i` today and will break the moment that copy is edited. Proposed:
   `Result<DeckSession | null>` with `data: null` for nothing-due, or a successful result carrying
   a zero-length queue. Either lets the screen own the copy.
2. **A word-count function on `lib/api.ts`.** F2 needs per-level totals and the estimated share.
   `fetchWordCountsByLevel` in `lib/db.ts` cannot supply it: it counts the rows of `select('*')` on
   `de_words`, which PostgREST caps at `max_rows = 1000` and caches for 24h, so against 9,752 rows
   it would report a thousand; and it cannot see `review_status`, so it would count drafts the
   learner is never served. So `hooks/useLevelCounts.ts` counts with `head:true, count:'exact'`
   against `deck_words` — the one place in `app/**` + `hooks/**` that touches Supabase directly.
   Proposed:
   `countByLevel(): Promise<Result<Record<CEFRLevel, { total: number; estimated: number }>>>`.
   The hook's shape does not change; `loadCounts` is deleted and the call swapped.
3. **F3.8 asks for the next due time** ("nothing due → show next due time"). Nothing in §4 exposes
   `min(next_review_at)`, so the empty state omits it. `nextDueAt(userId): Promise<string | null>`
   would close it. Low priority.
4. **`shuffleRemaining` does not persist.** It is pure by contract, so after "Mischen" the
   AsyncStorage copy holds the pre-shuffle order until the next `gradeCard` rewrites it. A learner
   who shuffles and immediately force-quits resumes unshuffled. Self-healing and harmless, noted
   only so it is a known choice rather than a surprise.

## Notes for the lead (deploy steps, secrets, manual checks)

No new dependencies, no `lib/**` or `components/**` edits, no hex or `rgba()` literals. Gates:
`agents:check frontend` ✓ (7 files, all owned) · `typecheck` ✓ · `test` ✓ 13 passed · `bundle` ✓.

One detail that will bite elsewhere: RN 0.86's types no longer declare
`StyleSheet.absoluteFillObject`, and `absoluteFill` is a registered ID rather than a style object.
`app/(tabs)/deck.tsx` spells the four offsets out.

### Manual test path — level selection

1. Expo Go → sign in. An account with `onboarding_complete = false` lands here; otherwise
   Profil → "Alle Niveaus mit Wortzahlen ansehen".
2. Six tiles render skeletons, then real counts (365 / 296 / 923 / 1343 / 259 / "Noch keine Wörter").
   Second launch is instant — counts cache for 24h.
3. Pick a level → the tile outlines violet with a check → "Los geht's" (or "Niveau speichern") →
   lands on the deck at that level. Profil shows the new chip; existing progress is untouched.
4. Airplane mode, clear the app's storage, reopen: the count line reads "Wortzahlen nicht verfügbar
   — die Auswahl funktioniert trotzdem", choosing a level still works, and only the save fails, with
   the Supabase message under "Niveau konnte nicht gespeichert werden."

### Manual test path — deck

1. Deck tab. Front shows only the English meaning and the level badge.
2. Tap → flips in 130ms to article + headword, grammar line, example pair. Check a noun
   (`der · Pl. Tage`), a verb (`ist geworden · sein`) and an adjective with empty `forms` (no line
   at all, no stray "·"). The speaker button reads the German.
3. Drag right: the card follows and tilts, "Gelernt" fades in past ~28% of the width, release →
   grade 2, next card. Drag left → "Nochmal", grade 0, and the card returns 3–5 cards later.
4. Release before the threshold → springs back.
5. `GradeRow` grades the same card with the real intervals. "Mischen" reorders only what is ahead.
6. Switch tabs and come back, then force-quit and reopen: same card, same position (F3.4).
7. Grade every card → "Sitzung beendet" with session XP. Relaunch → not the same cards.

### Verified statically only

- **Nothing-due empty state.** Reproducing it needs an account that has graded everything at its
  level, so the `NOTHING_DUE` match was only read, not run. Easiest live check: set the profile to
  C2, which has no reviewed words at all.
- **"Wortliste geschätzt".** Every reviewed row is `level_source='derived'` today, so the note
  cannot appear on screen. It needs an estimated row in `deck_words` to be seen.
- **The single-card "Nochmal" recentring.** Needs a one-card queue; the path is small and
  commented, but it was not driven by hand.
- **Grade persistence under a dead network.** `gradeCard` swallows the upsert failure by design; the
  local advance was reasoned through, the server reconciliation was not exercised.
- **Android.** iOS only so far. `backfaceVisibility` is unreliable there, so the faces also
  cross-fade on opacity; worth one look on a device.

## BUG-007 · email sign-in by one-time code · `app/(auth)/login.tsx`, `context/auth.tsx`

**Old flow failed because:** the email box signed in with `signInWithPassword`, and nothing in the app
creates or resets a password (`signUpWithEmail` was never called), so any address without a
pre-made password account could not get in. Supabase's English messages (for example "Invalid login
credentials") were shown straight in an Alert, which breaks the German-first copy rule.

**New flow:** `sendEmailCode(email)` calls `signInWithOtp` (`shouldCreateUser: true`, no redirect URL);
`verifyEmailCode(email, code)` calls `verifyOtp({ type: 'email' })`. Both return `Result<null>`, and the
error text is German. The screen has an email step (Code senden) and a code step (six digits, Anmelden,
Neuen Code anfordern, Andere E-Mail-Adresse), with loading, success and error states, and every tap
target at least 44pt. Sign-in completes through the same `onAuthStateChange` path that Google uses, so
`(auth)/_layout` and `index` route the learner. `signUpWithEmail` and `signInWithEmail` are removed.

**Needs before it works live:** the magic-link email must contain `{{ .Token }}`. See the config note
in the milestone report; not made here.

**Verified statically only:** typecheck and vitest pass. Not run against a Supabase instance.
## FEAT-001 — lens picker · `app/(tabs)/scan.tsx`

Lens list comes from `getAvailableLensesAsync()` on `onCameraReady`, kept current by
`onAvailableLensesChanged`. Shows the physical back lenses (Ultraweit / Weitwinkel / Tele) as a
`SegmentedToggle` over the camera, only when the device has more than one, and only while idle.
Virtual cameras (triple, dual-wide) are left out. The camera now starts on the wide lens explicitly.

Verified statically: typecheck, `npm test`, `npm run bundle`. Not verified on a device: actual
switching, the default lens, and the Android fallback (control hidden, `selectedLens` ignored).
## FEAT-002 / FEAT-003 (display only)

- **FEAT-002 "XP" → "Punkte".** Display labels only; stored fields (`xp`, `xp_earned`, `xp` in RPC results) unchanged. Explanation text added on Fortschritt.
- **FEAT-003 home heading.** "Swypo." is the heading; the German greeting sits below it as subtext, English greeting stays as caption.
