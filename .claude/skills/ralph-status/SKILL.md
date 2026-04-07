---
name: ralph-status
description: Monitor active ralph loops across the auth workspace. Shows task-state, worktrees, phase progress, task queue summary, and open PRs for each repo. Use when the user says "ralph status", "check ralph", "loop status", or "what's ralph doing".
allowed-tools: Bash, Read, Glob, Grep
---

# Ralph Loop Status Dashboard

Show the current state of all ralph loops running across the auth workspace (`~/repos/auth/`).

## Step 1: Discover active task-state files

Search for all task-state files across the three application repos:

```bash
find ~/repos/auth/identity-stack/.claude/ ~/repos/auth/py-identity-model/.claude/ ~/repos/auth/terraform-provider-descope/.claude/ -name 'task-state*.md' 2>/dev/null
```

For each file found, read it and extract the metadata header fields:
- `task_id` or `story` (identifier)
- `issue` (GitHub issue number)
- `branch` (working branch)
- `base_branch` (parent branch)
- `worktree` (filesystem path, if using worktree isolation)
- `phase` (current execution phase)

## Step 2: Check git worktrees

For each application repo, list active worktrees:

```bash
git -C ~/repos/auth/identity-stack worktree list 2>/dev/null
git -C ~/repos/auth/py-identity-model worktree list 2>/dev/null
git -C ~/repos/auth/terraform-provider-descope worktree list 2>/dev/null
```

Match worktrees to task-state files (the `worktree` field in task-state points to the worktree path). Flag any worktrees that don't have a corresponding task-state (orphaned) or task-states referencing worktrees that don't exist (stale).

## Step 3: Check open PRs

For each application repo, check for open PRs:

```bash
gh pr list --repo jamescrowley321/identity-stack --state open --json number,title,headRefName,statusCheckRollup --limit 20 2>/dev/null
gh pr list --repo jamescrowley321/py-identity-model --state open --json number,title,headRefName,statusCheckRollup --limit 20 2>/dev/null
gh pr list --repo jamescrowley321/terraform-provider-descope --state open --json number,title,headRefName,statusCheckRollup --limit 20 2>/dev/null
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

- Task-state files are the primary indicator of an active loop. No task-state = no active loop for that repo.
- Multiple task-state files per repo indicate parallel loops (e.g., `task-state.md` + `task-state-gateway.md`).
- Worktrees in `/tmp/` are created by story loops for filesystem isolation.
- The `phase` field tells you exactly where the loop is in its workflow cycle.
- If a task-state exists but the ralph process is not running, the loop is paused/crashed — the state file allows resumption.
