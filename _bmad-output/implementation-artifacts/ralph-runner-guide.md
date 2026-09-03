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
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/run-next-task.md PROMPT.md
ralph run
```

Each iteration completes one phase, persists state to `.claude/task-state.md`, and exits.

## Available Prompts

| Prompt | Purpose | Target Repos |
|--------|---------|-------------|
| `run-next-task.md` | General task execution from queue | All repos |
| `fix-review-findings.md` | Fix review findings on existing PRs | All repos |
| `design-system.md` | PRD 5b design-system story execution (worktree-based) | identity-stack |
| `open-identity-epic-a.md` | Epic A — Descope⇄Ory provider-swap demo, zero RBAC migration (12 stories, worktree-run, cloud Ory Network) | identity-stack |
| `pim-integration-tests.md` | Integration test chain | py-identity-model |
| `pim-fix-review-chain.md` | Chained PR fix loop | py-identity-model |
| `pim-adversarial-review.md` | Full codebase security review (one-shot) | py-identity-model |
| `pim-fapi2-hardening.md` | FAPI2 RP gating items (private_key_jwt, RFC 9207) + jwks-cache LRU (worktree-run) | py-identity-model |
| `identity-model-go-core.md` | Go Core Tier (Epic 3, stories 3.2–3.6) — stacked PRs, conformance-gated (worktree-run) | identity-model |
| `token-harness.md` | TH-1..TH-3: RS boot + correctness matrix + Locust load/soak + feature-proof (worktree-run) | py-identity-model |
| `pim-capacity-breakpoint.md` | TH-4: capacity & breakpoint — ramp-to-SLO-breach, worker scaling, nightly full sweep (worktree-run) | py-identity-model |

> Completed one-shot loops (PRD 5 `canonical-identity`, PRD 2 `api-gateway`, `repository-base-refactor`, dated planning sessions) are archived under `_archive/ralph-planning/completed-epics/`.

## Phase Pipeline

Feature: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`
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
