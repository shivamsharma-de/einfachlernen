# Agent 2 — Frontend (screens, navigation, state)

**Branch** `agent/frontend` · **Worktree** `../el-frontend`
**Owns** `app/**`, `hooks/**`, `context/**`, `_screens_auth/**`
**Consumes** `lib/api.ts` (backend), `components/**` (design), `lib/profile.ts`, `lib/activity.ts`

## Context
Screens for deck, scan and profile exist (uncommitted v2 work, now on `main`). Login/signup/onboarding exist
but live in `_screens_auth/`, outside the router, so they never mount. v3 is mostly about wiring the real flow
end to end and upgrading deck and scan to the v3 behaviour.

## Deliverables (PRD IDs)
1. **Auth gate & routing — F1.1–F1.4, F1.6.** Move `_screens_auth/*` into `app/` (routes in CONTRACTS §6).
   `app/index.tsx` routes by session + `profile.onboarding_complete`. Handle the OAuth callback deep link
   (`scheme: swapo`) in Expo Go. Sign out in Profil clears session, deck cache, PostHog.
2. **Apple sign-in — F1.5** in `context/auth.tsx` with `expo-apple-authentication` →
   `supabase.auth.signInWithIdToken({ provider: 'apple', token })`. Show the button only when
   `AppleAuthentication.isAvailableAsync()` is true (hides in Expo Go/Android).
3. **Onboarding — F2.1–F2.5.** Three steps: name (skippable) → level (`LevelOption` list with counts from
   `fetchWordCountsByLevel`) → daily new cards 5/10/20. Writes via `lib/profile.ts`.
4. **Deck — F3.1–F3.8.** Rewrite `hooks/useSRS.ts` (or replace with `hooks/useDeckSession.ts`) on top of
   `lib/api.ts`: on focus, `resumeSession()` else `buildSession()`; "Mischen" → `shuffleRemaining()`;
   grade → `gradeCard()`; prefetch enrichment for next 3 cards; `WordCardBack` for the back; finished and
   nothing-due states with `EmptyState`. Log activity via existing `createSessionTimer`/`logActivity`.
5. **Scan — F4.1–F4.7.** Capture up to 5 pages (camera + "Aus Fotos" via `expo-image-picker`),
   `PageThumbStrip`, `preparePage()` each, `scanPages()`, review screen with `ScanCandidateRow` grouped
   Nomen / Verben / Adjektive / Andere, status line from `counts`, `importScan()`, then success state with
   "Zum Deck". First-scan privacy note (PRD §5). Camera permission denied state.
6. **Profil — F2.4, F6.** Level switch (does not reset progress), daily new cards, today's stats, sign out.
7. **Analytics — F7** via `lib/analytics.ts` `track()`; event names exactly as PRD F7.
8. `/dev/components` route mounting design's gallery, only when `__DEV__`.

## Specific requirements
- Import deck/scan/enrichment functions **only from `lib/api.ts`**. Until backend lands they return stub
  errors — build every screen so the error state is visible and sensible, then it lights up after merge.
- No styling beyond layout (flex, gaps from `Space`). Visual decisions belong to components; if a component is
  missing, compose existing primitives and request the component in your status file.
- Deck state survives: tab switch, backgrounding, app kill (via `resumeSession`).
- Never block card rendering on enrichment (`card.enrichment === null` is a normal state).
- Every async action has loading, success, and error UI; error text comes from `Result.error` (already German).
- Tap targets ≥ 44pt; no layout that truncates German words.

## Checks before each milestone
`npm run typecheck`; `npm run bundle`; describe in your status file the manual test path for each screen
(the human will run it in Expo Go), including which states you could only verify with stubs.

## Prompt to paste
```
You are the FRONTEND agent in a four-agent parallel build of the swapo app (Expo 57 / expo-router /
React Native / TypeScript / Supabase). You are in your own git worktree on branch agent/frontend.

Read fully, in order, before writing code: docs/PRD-v3.md, docs/agents/CONTRACTS.md,
docs/agents/README.md §4, docs/agents/02-frontend.md (your brief), docs/design-spec.md §6, then the current
app/, _screens_auth/, hooks/, context/auth.tsx, lib/api.ts, lib/profile.ts, lib/activity.ts and
components/index.ts.

Then implement the deliverables in 02-frontend.md, milestone by milestone (README §5, frontend column).

Hard rules: write only in app/**, hooks/**, context/**, _screens_auth/**. Import deck, scan and enrichment
functions only from lib/api.ts — they are stubs until the backend branch merges, so build and show the error
states. Never edit CONTRACTS.md, types/contracts.ts, lib/**, components/**, package.json or app.json. No new
dependencies. Commit small with prefix [frontend]. Update docs/agents/status/frontend.md at each milestone.
Run npm run typecheck and npm run bundle before calling a milestone done. If you need a component or API that
is not in the contracts, request it in your status file, use existing primitives meanwhile, and continue.
```
