# Ralph Loop Runner Guide

Quick reference for running autonomous task execution with [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator). For full process docs, see [docs/ralph-loop-process.md](../../docs/ralph-loop-process.md). For token efficiency architecture, see [docs/ralph-loop-efficiency.md](../../docs/ralph-loop-efficiency.md).

## Architecture

All prompts use the **router + shared phase file** pattern:
- **Router** (`ralph-prompts/*.md`): task queue, routing logic, domain rules (~300-650 words)
- **Phase files** (`ralph-prompts/phases/*.md`): generic, shared across all loops (~100-250 words each)
- **Review agents** (`ralph-prompts/review-agents/*.md`): loaded only by subagents during review phase

## Running

```bash
cd ~/repos/auth/identity-stack
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/canonical-identity.md PROMPT.md
ralph run
```

Each iteration completes one phase, persists state to `.claude/task-state.md`, and exits.

## Available Prompts

| Prompt | Purpose | Target Repos |
|--------|---------|-------------|
| `run-next-task.md` | General task execution from queue | All repos |
| `fix-review-findings.md` | Fix review findings on existing PRs | All repos |
| `canonical-identity.md` | PRD 5 story execution (worktree-based) | identity-stack |
| `api-gateway.md` | PRD 2 story execution (worktree-based) | identity-stack |
| `pim-integration-tests.md` | Integration test chain | py-identity-model |
| `pim-fix-review-chain.md` | Chained PR fix loop | py-identity-model |
| `pim-adversarial-review.md` | Full codebase security review (one-shot) | py-identity-model |

## Phase Pipeline

Feature: `setup → analyze → implement → test → review → review-fix → pr → ci → complete`
Fix: `(setup →) fix → test → review → review-fix → ci → complete`

Review phase spawns conditional subagents based on change scope (auth changes get all 5 reviewers; docs-only gets Acceptance only). Review-fix uses delta-only re-review (max 3 iterations).

## Monitoring

```bash
cat .claude/task-state.md       # Current phase and task
git worktree list               # Active worktrees
/ralph-status                   # Full dashboard
/ralph-audit                    # Token efficiency audit
```

## Adjusting the Queue

Edit `task-queue.md` to reorder, skip (`blocked`/`wontfix`), add tasks, or change dependencies.
