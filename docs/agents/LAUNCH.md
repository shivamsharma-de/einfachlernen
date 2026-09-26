# Launching and watching the four agents

Bootstrap is done (README §2). This is the operating manual: how to start them, where to see what
they are doing, and how to merge.

---

## 1. Start them — four terminals, one each

```bash
cd ~/Projects/el-data     && npm run agents:prompt data     | pbcopy && claude --dangerously-skip-permissions
cd ~/Projects/el-backend  && npm run agents:prompt backend  | pbcopy && claude --dangerously-skip-permissions
cd ~/Projects/el-design   && npm run agents:prompt design   | pbcopy && claude --dangerously-skip-permissions
cd ~/Projects/el-frontend && npm run agents:prompt frontend | pbcopy && claude --dangerously-skip-permissions
```

Each command copies that agent's brief prompt to the clipboard and opens Claude Code in its worktree —
paste and send. Start all four at once; no agent waits on another to *start*.

**What still protects you under `--dangerously-skip-permissions`:** `.claude/settings.json` registers a
`PreToolUse` hook (`scripts/agents/guard.mjs`) that runs regardless of permission mode. It hard-blocks

- `supabase db push` / `link` / `functions deploy` / `secrets` / `projects` — anything reaching the **remote** project,
- `git push`, `gh pr|repo|release`,
- `npm install` / `npx expo install` / yarn / pnpm — `package.json` is lead-owned,
- any `Edit`/`Write`, and any shell `>`, `tee`, `sed -i`, `cp`, `mv`, into a path the agent does not own.

Local work — `supabase start`, `db reset`, `functions serve`, `npm ci`, typecheck, test, bundle, commit —
flows without a prompt. The hook prints the reason and the agent adapts.

> The worktree `.env` files point at the **hosted** Supabase project (your choice), so the app runs
> against real data. The hook blocks schema and deploy commands, not ordinary signed-in reads and writes.

---

## 2. Watch them

```bash
npm run agents:status        # one-screen rollup of all four
npm run agents:status -- -w  # same, refreshing every 30s
```

Per agent it shows: state (working / blocked / idle), commits ahead of `main`, when the last commit
landed, uncommitted files, and the current **In progress** / **Blocked on** / **Contract change
requests** lines lifted from that agent's status file.

The three underlying sources, if you want detail:

| Source | What it tells you |
|---|---|
| `docs/agents/status/<agent>.md` | the agent's own log: done, in progress, blocked, requests for the lead |
| `git log --oneline agent/<agent>` | what it has actually committed (prefixed `[data]`, `[backend]`, …) |
| the terminal itself | what it is doing this minute |

**What to act on**

- A growing **Blocked on** means a contract is missing. Fix it on `main` and have everyone rebase — do
  not let agents invent workarounds around a gap in `CONTRACTS.md`.
- A **contract change request** is a decision for you, not for them. Approve it on `main`, then tell the
  affected agents to `git fetch && git rebase origin/main`.
- **No commits for an hour** usually means a stuck loop. Look at that terminal.
- The one real spend is the data agent's enrichment batch. Its brief requires it to print a word count
  and cost estimate and **wait for your OK** before submitting. Opus 5 via the Message Batches API is
  $2.50 / $12.50 per MTok (50% of standard).

---

## 3. Milestones

| Milestone | data | backend | design | frontend |
|---|---|---|---|---|
| **M1** (~2h) | migration 006 applies on `db reset` | `lib/shuffle.ts` + tests; `lib/api.ts` deck functions real | new components in a `/dev/components` gallery | auth gate + login + onboarding on stubs |
| **M2** | content pipeline: A1–A2 ingested + enriched (draft) | `scan-words` v3 + `import-scan` + `word-ai` for `u_` ids | card back, scan review, empty/skeleton states final | deck session UI + shuffle + resume; scan capture + review |
| **M3** | B1 official + B2–C2 estimated; review CSV loop; runbooks | rate limits, German error mapping, offline grade buffer | a11y pass | real API wiring, analytics events, profile settings |

---

## 4. Merge a milestone (you, on `main`)

In order — **data → backend → design → frontend**:

```bash
cd ~/Projects/einfachlernen
npm run agents:check data          # branch stayed inside its owned paths
git merge --no-ff agent/data
npm run typecheck && npm test && npm run bundle
```

Then tell the other three to `git rebase main` — local `main`, which every worktree shares, since
nothing is pushed during the run. Because the paths are disjoint, conflicts should only ever appear in
lead-owned files.

---

## 5. Still on you, not on them

- **`ANTHROPIC_API_KEY`** in `supabase/functions/.env.local` (gitignored) in each worktree, or backend and
  data stop at the model call and work against recorded fixtures.
- **Real A1–B1 wordlists.** Not in the repo and not scrapeable; the data agent builds the pipeline against
  a 50-word sample it writes itself and documents acquisition in `docs/runbooks/content-sources.md`.
- **PRD Q4** — who reviews the A1–A2 content — blocks F5.4.
- **Device testing.** Apple sign-in and the real camera path need an EAS dev build; nothing in Expo Go
  verifies them.
- **Deploying.** Secrets, `supabase db push`, function deploys and OAuth provider setup are human steps at
  the end, from `docs/runbooks/deploy.md` (written by the data agent). The agents are blocked from all of it.
