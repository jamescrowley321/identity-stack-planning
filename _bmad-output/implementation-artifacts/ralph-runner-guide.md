# Ralph Loop Runner Guide

Quick reference for running autonomous task execution with [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator). For the full process documentation, see [docs/ralph-loop-process.md](../../docs/ralph-loop-process.md).

## Files

- **Prompts:** `ralph-prompts/*.md` — per-initiative prompt files (see table below)
- **Queue:** `task-queue.md` — prioritized task list with statuses and dependencies
- **Config:** `ralph.yml` in each target repo — backend, timeout, iteration limits

## Running

1. Navigate to the target repo
2. Copy the appropriate prompt to `PROMPT.md`
3. Run `ralph run`

```bash
# Example: PRD 5 canonical identity stories
cd ~/repos/auth/identity-stack
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/canonical-identity.md PROMPT.md
ralph run

# Example: General task execution from queue
cd ~/repos/auth/py-identity-model
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/run-next-task.md PROMPT.md
ralph run
```

Each iteration completes one phase. The loop persists state to `.claude/task-state.md` and resumes from where it left off.

## Available Prompts

| Prompt | Purpose | Target Repos |
|--------|---------|-------------|
| `run-next-task.md` | General task execution from queue | All repos |
| `fix-review-findings.md` | Fix review findings on existing PRs | All repos |
| `canonical-identity.md` | PRD 5 story execution (worktree-based) | identity-stack |
| `api-gateway.md` | PRD 2 story execution (worktree-based) | identity-stack |
| `pim-integration-tests.md` | Integration test chain | py-identity-model |
| `pim-fix-review-chain.md` | Chained PR fix loop | py-identity-model |
| `pim-adversarial-review.md` | Full codebase security review | py-identity-model |

## Monitoring

```bash
# Current task and phase
cat .claude/task-state.md

# Full task state with review findings
cat .claude/task-state.md | less

# List active worktrees
git worktree list

# Check status from any repo using the skill
/ralph-status
```

## Between Runs

Ralph loops stop cleanly between iterations. To resume after a pause or crash:

```bash
ralph run    # Reads existing task-state.md and continues
```

To start a new task after one completes:

```bash
ralph run    # No task-state.md → reads queue → picks next pending task
```

## Adjusting the Queue

Edit `task-queue.md` to:
- Reorder tasks (ralph picks the first pending task with met dependencies)
- Skip a task (set status to `blocked` or `wontfix`)
- Add new tasks
- Change dependencies
