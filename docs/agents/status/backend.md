# backend status

Brief: `docs/agents/03-backend.md` · Branch `agent/backend` · Worktree `../el-backend`
Owns: `supabase/functions/**`, `lib/**` (except `lib/supabase.ts`), `lib/__tests__/**`

> The local Supabase stack belongs to the data agent until migration 006 lands on `main`
> (see README §5a). Your M1 — `lib/shuffle.ts` + tests, `lib/api.ts` deck functions against a
> mocked Supabase client — needs no database. From M2 the stack is shared.

## Done

## In progress

## Blocked on

## Contract change requests

## Notes for the lead (deploy steps, secrets, manual checks)

<!-- Record the exact curl commands you used against `supabase functions serve`,
     including how you minted a local test-user JWT. -->
