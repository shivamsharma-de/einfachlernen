# frontend status

Brief: `docs/agents/02-frontend.md` · Branch `agent/frontend` · Worktree `../el-frontend`
Owns: `app/**`, `hooks/**`, `context/**`, `_screens_auth/**` (move into `app/`)

> `lib/api.ts` is stubbed until agent/backend merges: async functions return
> `{ ok: false, error: 'Noch nicht verfügbar' }`. That is the expected state — build the error
> and loading UI against it, and the screens light up after the merge.

## Done

## In progress

## Blocked on

## Contract change requests

## Notes for the lead (deploy steps, secrets, manual checks)

<!-- Per screen: the manual test path to run in Expo Go, and which states you could only
     verify against stubs or that need an EAS dev build (Apple sign-in, camera). -->
