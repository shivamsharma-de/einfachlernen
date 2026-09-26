# Agent 1 — Design (design system + components)

**Branch** `agent/design` · **Worktree** `../el-design`
**Owns** `components/**`, `constants/Colors.ts`, `docs/design/**`, `assets/**`
**Consumes** `types/contracts.ts` · **Produces for** frontend (components in CONTRACTS §5)

## Context
The visual system is already defined (`docs/design-spec.md`, `docs/tokens.ts`) and implemented in
`constants/Colors.ts` and ten primitives in `components/`. This agent does not redesign; it **extends** the
system to the v3 screens (login, onboarding level picker, full card back, multi-page scan, empty/loading
states) and ships them as React Native components, so the frontend agent composes screens rather than styling them.

## Deliverables
1. `docs/design/v3-screens.md` — short spec per new screen/state: block order, tokens used, copy (German
   first, English secondary), states. Screens: Login, Onboarding (name → level → daily new cards), Deck card
   back (full), Deck empty/finished, Scan capture with page strip, Scan processing, Scan review, Scan error.
2. Components from CONTRACTS §5, each in its own file, exported from `components/index.ts`:
   `WordCardBack, ExampleSentence, GrammarLine, OriginTag, EstimatedNote, AuthButton, LevelOption,
   PageThumbStrip, ScanCandidateRow, EmptyState, Skeleton`.
3. `components/__gallery__/Gallery.tsx` — renders every component in every state with fixture data
   (`components/__gallery__/fixtures.ts`, typed with `types/contracts.ts`). Frontend will mount it at
   `/dev/components` behind `__DEV__`.
4. Accessibility pass on all components (design-spec §8).

## Specific requirements
- `WordCardBack`: article (article colour, mono) + serif headword; divider; English meaning 19px; `GrammarLine`
  in mono; two `ExampleSentence`s; TTS button 50px. While `enrichment === null`, render catalogue fields and a
  `Skeleton` where AI fields go — never a spinner over the whole card. Must fit a 375×667 screen without scroll
  for a noun with two 90-character examples; scroll only beyond that.
- `GrammarLine` by word type: noun `die · -n` / `Pl. Häuser`; verb `hat gemacht · trennbar`; adjective
  `größer · am größten`. Omit parts that are missing; never print "undefined" or empty separators.
- `ExampleSentence`: highlight the headword **and inflected forms** (case-insensitive prefix match on the
  lemma stem is acceptable) in violet.
- `AuthButton`: Google and Apple must follow each provider's brand rules (Apple: black/white button, Apple
  logo, "Mit Apple anmelden"; Google: standard G mark and "Mit Google anmelden"). Use provider-supplied assets
  only; put them in `assets/auth/` and note their source in `docs/design/v3-screens.md`.
- `LevelOption`: level, one-line German description, word count, `EstimatedNote` when `estimated` is true.
  `estimated` now means "this level still holds low-confidence words" — it is driven by per-word
  `level_source`, not hardcoded to B2–C2 (PRD F2.5, D12). Keep the prop as-is; only the meaning changed.
- `ScanCandidateRow`: checkbox ≥44pt, article + word + meaning, `LevelBadge`, `OriginTag` for `origin:'new'`,
  expandable example.
- `PageThumbStrip`: up to `max` thumbs (5), remove "×" on each, trailing "+" tile.
- No new colours outside tokens. If one is truly needed, add it to `Colors.ts` with a comment explaining the
  role, and verify contrast.

## Checks before each milestone
`npm run typecheck`; `npm run bundle`; every component renders in the gallery with (a) complete data,
(b) minimal data (all optionals null), (c) longest German stress test ("Kreislaufwirtschaft",
"Bildung und Ausbildung").

## Prompt to paste
```
You are the DESIGN agent in a four-agent parallel build of the einfach lernen app (Expo / React Native /
TypeScript). You are in your own git worktree on branch agent/design.

Read fully, in order, before writing code: docs/PRD-v3.md, docs/agents/CONTRACTS.md,
docs/agents/README.md §4, docs/agents/01-design.md (your brief), docs/design-spec.md, docs/tokens.ts,
constants/Colors.ts, and every file in components/.

Then implement the deliverables in 01-design.md, milestone by milestone (README §5, design column).

Hard rules: write only in components/**, constants/Colors.ts, docs/design/**, assets/**. Never edit
CONTRACTS.md, types/contracts.ts, package.json or app.json. Component props must match CONTRACTS §5 exactly;
existing components may only gain optional props. No new dependencies. Commit small with prefix [design].
Update docs/agents/status/design.md at each milestone. Run npm run typecheck and npm run bundle before
calling a milestone done. If something you need is missing from a contract, write a request in your status
file and continue with a reasonable assumption you record there.
```
