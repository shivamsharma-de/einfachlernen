# Running four agents in parallel

Four Claude Code agents, one git worktree each, one repo. They coordinate through files, not chat:

- `docs/PRD-v3.md` — what to build (feature IDs F1–F7).
- `docs/agents/CONTRACTS.md` — the only interfaces agents may rely on, plus **file ownership**.
- `docs/agents/0N-<agent>.md` — each agent's brief and the prompt to paste.
- `docs/agents/status/<agent>.md` — each agent's progress log, blockers and contract change requests.

| Agent | Branch | Worktree | Brief |
|---|---|---|---|
| data | `agent/data` | `../el-data` | `04-data-integrations.md` |
| backend | `agent/backend` | `../el-backend` | `03-backend.md` |
| design | `agent/design` | `../el-design` | `01-design.md` |
| frontend | `agent/frontend` | `../el-frontend` | `02-frontend.md` |

---

## 1. Why this split works

Parallel agents collide in two ways: two agents editing one file, and one agent waiting on another's
unfinished code. Both are removed up front:

1. **Disjoint write paths** (CONTRACTS §0). Merge conflicts become impossible except in lead-owned files.
2. **Contracts first, on `main`** (bootstrap below). Types and stub APIs exist before anyone starts, so the
   frontend can build the scan review screen on day one against `scanPages()` that returns a stub.
3. **Only the lead touches `package.json`, `app.json`, migrations 001–005, or the remote Supabase project.**

---

## 2. Bootstrap — lead, once, before fan-out (~30–45 min)

The repo currently has a lot of **uncommitted** v2 work (deck, scan, profile, components, Edge Functions,
migration 005). Worktrees are created from commits, so an uncommitted file does not exist for the agents.

```bash
cd ~/Projects/einfachlernen

# 2.1 Commit what exists (review first — .env is gitignored, keep it that way)
git add -A && git status        # check nothing secret is staged
git commit -m "PRD v2 work: deck, SRS, scan, profile, components, edge functions, migration 005"

# 2.2 Dependencies every agent will need, installed once so package.json never conflicts
npx expo install expo-image-manipulator expo-image-picker expo-apple-authentication expo-crypto
npm i -D vitest tsx csv-parse

# 2.3 Contracts on main
#   - types/contracts.ts        ← copy §3 of CONTRACTS.md verbatim
#   - lib/api.ts                ← §4 signatures as stubs (see CONTRACTS §4)
#   - docs/agents/status/{data,backend,design,frontend}.md  ← empty template (below)
#   - package.json scripts: "typecheck": "tsc --noEmit", "test": "vitest run",
#                            "bundle": "expo export --platform ios --output-dir /tmp/el-bundle"
npx tsc --noEmit
git add -A && git commit -m "v3 bootstrap: contracts, api stubs, deps, agent docs"

# 2.4 Local Supabase for agents (needs Docker running). There is no supabase/config.toml yet.
supabase init          # creates supabase/config.toml; commit it
git add supabase/config.toml && git commit -m "supabase init for local dev"

# 2.5 Worktrees
for a in data backend design frontend; do
  git worktree add ../el-$a -b agent/$a
  (cd ../el-$a && npm ci && cp ../einfachlernen/.env .env)
done
```

A Claude Code session can do 2.2–2.4 for you: *"Do the bootstrap in docs/agents/README.md §2.2–2.4. Don't commit."*

Status file template:

```md
# <agent> status
## Done
## In progress
## Blocked on
## Contract change requests
## Notes for the lead (deploy steps, secrets, manual checks)
```

---

## 3. Launch

One terminal per worktree:

```bash
cd ../el-data     && claude     # paste the prompt from 04-data-integrations.md
cd ../el-backend  && claude     # paste the prompt from 03-backend.md
cd ../el-design   && claude     # paste the prompt from 01-design.md
cd ../el-frontend && claude     # paste the prompt from 02-frontend.md
```

All four start at once. No agent waits on another to *start*; the dependencies below are only for *merging*.

---

## 4. Rules every agent follows (repeated in each prompt)

1. Read `docs/PRD-v3.md`, `docs/agents/CONTRACTS.md` and your brief fully before writing code.
2. Write only inside your owned paths (CONTRACTS §0; data also owns `supabase/tests/**`). Need a change elsewhere → status file request.
3. Never edit `CONTRACTS.md` or `types/contracts.ts`. Never change a contract signature.
4. Never run `supabase db push`, `supabase functions deploy`, `supabase secrets set`, or anything touching the
   remote project. Local only: `supabase start`, `supabase db reset`, `supabase functions serve`.
5. Never add dependencies. If one is missing, request it in the status file.
6. Small commits on your branch, message prefix `[data]`, `[backend]`, `[design]`, `[frontend]`.
   `git fetch && git rebase origin/main` at the start of each milestone.
7. Update your status file at every milestone.
8. Before declaring a milestone done: `npm run typecheck` clean; your agent-specific checks (in brief) pass.
9. If blocked, keep working against the stub/contract and write down what you assumed.
10. Do not touch the German UI copy conventions in design-spec §6.6 (German first, English secondary).

---

## 5. Milestones and merge order

| Milestone | data | backend | design | frontend |
|---|---|---|---|---|
| **M1** (first ~2h) | migration 006 applies on `db reset` | `lib/shuffle.ts` + tests; `lib/api.ts` deck functions real | new components rendered in a `/dev/components` gallery | auth gate + login + onboarding on stubs |
| **M2** | content pipeline: A1–A2 ingested + enriched (draft) | `scan-words` v3 + `import-scan` + `word-ai` for `u_` ids | card back, scan review, empty/skeleton states final | deck session UI + shuffle + resume; scan multi-page capture + review |
| **M3** | B1 official + B2–C2 estimated; review CSV loop; runbooks | rate limits, errors mapped to German, offline grade buffer | a11y pass (contrast, 44pt, wrapping) | wire to real API, analytics events, profile settings |

**Merge order at each milestone: data → backend → design → frontend.** The lead merges into `main`
(`git merge --no-ff agent/<x>`), runs `npm run typecheck && npm test && npm run bundle`, then tells the
others to rebase. Because paths are disjoint, conflicts should only appear in lead-owned files.

---

## 6. Integration pass (after M3, one agent, on `main`)

```
Read docs/PRD-v3.md §4 acceptance criteria. On main, with all four branches merged: run
supabase db reset, supabase functions serve, and walk each acceptance criterion for F1–F4 as far as
possible without a device. Fix only integration bugs (wrong field names, missing awaits, error mapping).
Produce docs/agents/status/integration.md listing each criterion as pass / fail / needs-device.
```

Then the human steps in `docs/runbooks/deploy.md` (written by data agent): secrets, `supabase db push`,
function deploys, OAuth provider setup, and on-device tests.

---

## 7. What to watch while they run

- Status files, every ~30 min. A growing "Blocked on" means a contract is missing — fix the contract on
  `main`, don't let agents work around it.
- `git log --oneline agent/<x>` — no commits for an hour usually means an agent is stuck in a loop.
- Cost: data agent's batch enrichment is the only large spend; it must print an estimate and wait for your
  OK before submitting a batch (enforced in its brief).
