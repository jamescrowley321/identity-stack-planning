# Ralph Loop Runner Guide

One prompt, one queue. The prompt reads the task queue, picks up the next pending task, runs it through 5 phases (analysis → plan → execute → test → review), marks it done, and signals for the next iteration.

## Files

- **Prompt:** `ralph-prompts/run-next-task.txt` — the single reusable prompt
- **Queue:** `task-queue.md` — prioritized task list with statuses and dependencies

## Running

```bash
# Terraform provider tasks
cd ~/repos/auth/terraform-provider-descope
/ralph-loop "$(cat ~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/run-next-task.txt)" --completion-promise 'TASK COMPLETE' --max-iterations 15

# SaaS starter tasks
cd ~/repos/auth/descope-saas-starter
/ralph-loop "$(cat ~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/run-next-task.txt)" --completion-promise 'TASK COMPLETE' --max-iterations 25

# py-identity-model tasks
cd ~/repos/auth/py-identity-model
/ralph-loop "$(cat ~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/run-next-task.txt)" --completion-promise 'TASK COMPLETE' --max-iterations 25
```

Each iteration completes one task. The loop restarts, reads the queue, picks up the next one.

## Fixing Review Findings

Use the `fix-review-findings.md` prompt to fix issues identified in adversarial code reviews on existing PRs. This prompt checks out existing branches (instead of creating new ones) and applies targeted fixes.

```bash
# Fix terraform provider PRs
cd ~/repos/auth/terraform-provider-descope
/ralph-loop "$(cat ~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/fix-review-findings.md)" --completion-promise 'TASK COMPLETE' --max-iterations 10

# Fix SaaS starter PRs (phased first, then cross-cutting)
cd ~/repos/auth/descope-saas-starter
/ralph-loop "$(cat ~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/fix-review-findings.md)" --completion-promise 'TASK COMPLETE' --max-iterations 15

# Fix py-identity-model PRs (chained — 16 PRs)
cd ~/repos/auth/py-identity-model
/ralph-loop "$(cat ~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/fix-review-findings.md)" --completion-promise 'TASK COMPLETE' --max-iterations 50
```

Fix tasks are in the "Review Fix Tasks" sections of `task-queue.md`. Phase order: checkout → fix → test → ci → complete.

## Between Runs

After a ralph loop finishes (or you cancel it):

```bash
# Review what was done
git log main..HEAD --oneline

# Create PR if satisfied
gh pr create --title "..." --body "..."

# Return to main for the next task
git checkout main && git pull
```

Then re-run the same command to pick up the next task.

## Monitoring

```bash
# Current loop iteration
grep '^iteration:' .claude/ralph-loop.local.md

# Current task and phase
cat .claude/task-state.md

# Cancel the loop
/cancel-ralph
```

## Adjusting the Queue

Edit `task-queue.md` to:
- Reorder tasks (first pending row wins)
- Skip a task (set status to `blocked`)
- Add new tasks
- Change dependencies
