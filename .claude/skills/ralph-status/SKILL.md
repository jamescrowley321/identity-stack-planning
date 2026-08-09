---
name: ralph-status
description: Monitor active ralph loops across the auth workspace. Shows task-state, worktrees, phase progress, task queue summary, and open PRs for each repo. Use when the user says "ralph status", "check ralph", "loop status", or "what's ralph doing".
allowed-tools: Bash, Read, Glob, Grep
---

# Ralph Loop Status Dashboard

Show the current state of all ralph loops running across the auth workspace (`~/repos/auth/`).

The workspace has five git repos: `identity-stack`, `py-identity-model`,
`terraform-provider-descope`, `identity-stack-planning`, and `identity-model`.

## Step 1: Enumerate every worktree across all repos

Ralph loops almost always run in an isolated worktree under `/tmp/`, and the
loop's `task-state*.md` lives in **that worktree's** `.claude/` — NOT in the
primary checkout. So discovery must be worktree-driven: searching only the
primary checkouts' `.claude/` misses every `/tmp` loop and reports a false
"no active loop".

List all worktrees (primary checkout + `/tmp/` isolation worktrees) for every repo:

```bash
for repo in identity-stack py-identity-model terraform-provider-descope identity-stack-planning identity-model; do
  git -C ~/repos/auth/$repo worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}'
done | sort -u
```

## Step 2: Discover active task-state files (in EVERY worktree)

For each worktree path from Step 1, search its `.claude/` for task-state files.
This is the step that catches loops running in `/tmp`:

```bash
for repo in identity-stack py-identity-model terraform-provider-descope identity-stack-planning identity-model; do
  git -C ~/repos/auth/$repo worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}'
done | sort -u | while read -r wt; do
  find "$wt/.claude" -maxdepth 2 -name 'task-state*.md' 2>/dev/null
done
```

For each file found, read it and extract the metadata header fields:
- `task_id` or `story` (identifier)
- `issue` (GitHub issue number)
- `branch` (working branch)
- `base_branch` (parent branch)
- `worktree` (filesystem path, if using worktree isolation)
- `phase` (current execution phase)

Match each task-state to the worktree it was found in **and** to its `worktree:`
field — a loop's home worktree (which holds the task-state) may differ from the
per-task code worktree it points at (e.g. loop home `/tmp/pim-fapi2-ralph`
tracks the current task while the code lives in `/tmp/pim-T252`). Flag:
- **orphaned** worktree — a `/tmp/` worktree with no task-state (an orchestrator
  base between stories, or a manual/abandoned worktree);
- **stale** task-state — its `worktree:` path no longer exists (a completed or
  abandoned loop; often also `phase: complete`).

## Step 3: Check open PRs

For each repo, check for open PRs:

```bash
for repo in identity-stack py-identity-model terraform-provider-descope identity-stack-planning identity-model; do
  echo "== $repo =="
  gh pr list --repo jamescrowley321/$repo --state open \
    --json number,title,headRefName,isDraft,mergeStateStatus,statusCheckRollup --limit 20 2>/dev/null
done
```

Cross-reference PR branches with active task-state branches to identify which PRs are associated with active loops.

## Step 4: Parse task queue summary

Read the task queue file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/task-queue.md
```

For each repo section (terraform-provider-descope, identity-stack, py-identity-model), count tasks by status:
- `done` — completed tasks
- `in_progress` — currently being worked on
- `pending` — ready for pickup
- `blocked` — waiting on dependencies or external factors
- `wontfix` — intentionally skipped

Also count review fix tasks separately (they appear in "Review Fix Tasks" subsections).

Note: `identity-model` (and `identity-stack-planning` itself) are not tracked in
this `task-queue.md`; their loops surface via Steps 1–3 only.

## Step 5: Display the dashboard

Format the output as a structured dashboard. Use this template:

```
## Ralph Loop Status

### Active Loops

For each active task-state file found:

**{repo}** — `{task_id or story}` (issue #{issue})
- Phase: `{phase}`
- Branch: `{branch}` (base: `{base_branch}`)
- Worktree: `{worktree path}` {or "in-repo" if no worktree}
- PR: #{pr_number} {title} {check_status} {or "no PR yet" if phase < ci}

If no active loops found, display: "No active ralph loops detected."

### Worktree Summary

| Repo | Path | Branch | Linked Task |
|------|------|--------|-------------|
| ... | ... | ... | ... |

Flag orphaned worktrees (no task-state) or stale references (task-state points to missing worktree).

### Task Queue Progress

| Repo | Done | In Progress | Pending | Blocked | Won't Fix | Total |
|------|------|-------------|---------|---------|-----------|-------|
| terraform-provider-descope | ... | ... | ... | ... | ... | ... |
| identity-stack | ... | ... | ... | ... | ... | ... |
| py-identity-model | ... | ... | ... | ... | ... | ... |

Show separate counts for feature tasks and review fix tasks.

### Open PRs

For each repo with open PRs, list them with CI status:

**{repo}** ({count} open)
- #{number} {title} — `{branch}` — CI: {pass/fail/pending}
```

## Phase Reference

Valid phases in order of execution:

**Feature/Story loops:** setup > analyze > implement > test > review > review-fix > pr > ci > complete

**Fix loops:** (setup >) fix > test > review > review-fix > ci > complete

**Legacy phases** (may appear in old task-state files): analysis, plan, anchor, execute, review-blind, review-edge, review-acceptance, review-security, docs, ci-fix, checkout

## Notes

- Task-state files are the primary indicator of an active loop — but they live in
  the worktree that is running the loop, so search **every worktree's** `.claude/`
  (Steps 1–2), not just the primary checkouts, or you will miss every `/tmp` loop.
- Multiple task-state files (in different worktrees, or `task-state.md` +
  `task-state-gateway.md`) indicate parallel loops.
- Loops run in `/tmp/` worktrees for filesystem isolation; an orchestrator loop
  may hold the task-state in its home worktree while spawning a separate per-task
  code worktree.
- The `phase` field tells you exactly where the loop is in its workflow cycle.
- If a task-state exists but the ralph process is not running, the loop is
  paused/crashed — the state file allows resumption.
