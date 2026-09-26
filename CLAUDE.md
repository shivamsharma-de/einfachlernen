# einfach lernen

Expo 57 / expo-router / React Native / TypeScript. Supabase (Postgres + Auth + Edge Functions on
Deno) and the Anthropic API behind those functions. PostHog for analytics.

**This repo is being built by four agents in parallel, one per git worktree.** If you are one of
them, the rules below are binding. If you are the lead on `main`, they are what you enforce at merge.

## Read before writing code

1. `docs/PRD-v3.md` — what to build (feature IDs F1–F7), and which decisions are already made.
2. `docs/agents/CONTRACTS.md` — the only interfaces you may rely on, plus **file ownership** (§0).
3. `docs/agents/README.md` §4–5 — the shared rules and the milestone/merge order.
4. `docs/agents/0N-<your-agent>.md` — your brief.

## File ownership

Write **only** inside your own paths. Reading anything is fine.

| Paths | Owner |
|---|---|
| `supabase/migrations/006_*` and later, `supabase/seeds/**`, `supabase/tests/**`, `scripts/content/**`, `content/**`, `docs/runbooks/**` | data |
| `supabase/functions/**`, `lib/**` (except `lib/supabase.ts`), `lib/__tests__/**` | backend |
| `components/**`, `constants/Colors.ts`, `docs/design/**`, `assets/**` | design |
| `app/**`, `hooks/**`, `context/**`, `_screens_auth/**` | frontend |
| `types/contracts.ts`, `types/index.ts`, `docs/agents/CONTRACTS.md`, `package.json`, `app.json`, `lib/supabase.ts`, `vitest.config.ts`, `supabase/config.toml`, `scripts/agents/**`, `scripts/pipeline/**`, `CLAUDE.md` | **lead only** |
| `docs/agents/status/<agent>.md` | that agent |

`npm run agents:check <your-agent>` fails if your branch touched anything else. Run it before you commit.
Migrations `001`–`005` are already applied to the remote project — nobody edits them.

## Hard rules

- **Never** edit `docs/agents/CONTRACTS.md` or `types/contracts.ts`, and never change a contract
  signature. Need a change? Write it under "Contract change requests" in your status file, stop
  depending on it, and keep going.
- **Never** add a dependency. Everything needed is already installed; request additions in your status file.
- **Never** touch the remote Supabase project: no `db push`, no `functions deploy`, no `secrets set`,
  no `git push`. Local only — `supabase start`, `supabase db reset`, `supabase functions serve`.
  Deploying is a human step at the end, from `docs/runbooks/deploy.md`.
- The Anthropic key lives only in Edge Function env (`supabase/functions/.env.local`, gitignored).
  Never in client code, never in an `EXPO_PUBLIC_` variable.
- Model IDs come from `ANTHROPIC_MODEL_TEXT` / `ANTHROPIC_MODEL_VISION` — never hard-coded.
- Small commits, prefixed `[data]` / `[backend]` / `[design]` / `[frontend]`.
  `git rebase main` at the start of each milestone — local `main`, which all worktrees share.
  Nothing is pushed during the run, so `origin/main` stays stale; do not rebase onto it.
- Update `docs/agents/status/<agent>.md` at every milestone.
- If you are blocked, keep working against the stub or the contract and write down what you assumed.

## Quality gates — before you call any milestone done

```
npm run agents:check <agent>   # you stayed inside your paths
npm run typecheck              # tsc --noEmit, must be clean
npm test                       # vitest; pure TS only (lib/__tests__, scripts)
npm run bundle                 # expo export, iOS
```
Plus your brief's own checks (`deno check` for backend, `supabase db reset` twice for data, the
component gallery for design, the manual test paths for frontend).

## Conventions

- TypeScript strict. No `any` that a contract type already covers.
- German UI copy first, English secondary (design-spec §6.6). Never truncate a German word.
- Tap targets ≥44pt; 4.5:1 contrast; no text set with an alpha channel; `textDim` never on text.
- Colours come from `constants/Colors.ts` — no hex or `rgba()` literals in a StyleSheet.
- The card back never blocks on AI: `enrichment === null` is a normal render state, not an error.
- Every async action has a loading, success and error state. Error text comes from `Result.error`,
  which is already German.

## The local Supabase stack is shared

The CLI binds fixed ports (54321–54324) from `supabase/config.toml`, so **all worktrees share one
stack**. It belongs to the **data** agent until migration 006 is merged to `main`; a `db reset` wipes
whatever anyone else is testing against. From M2 it is shared — announce a reset in your status file
before running it. `db reset` applies migrations 001+ and seeds matching `seeds/0[1-9][0-9]_*.sql`
(the `001`/`002` seed files are legacy duplicates of migrations 003/004 and are deliberately excluded).
