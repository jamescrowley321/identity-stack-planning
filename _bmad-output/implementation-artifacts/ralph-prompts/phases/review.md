# Phase: review

**Spawn independent reviewer subagents via the `Agent` tool — do NOT review the diff in-context.** The whole point is an adversarial perspective from outside the implementation context; that only happens in a fresh subagent. If you start writing `## Review: <persona>` in your own response, you're doing it wrong — stop and spawn the subagents.

`cd <worktree or repo root>`

## Step 1: Generate diff + pin SHA

```
mkdir -p .claude
git diff origin/<base_branch>...HEAD > .claude/review-diff.patch
git rev-parse HEAD > .claude/pre-review-sha.txt
```

Record the SHA in task-state under `## Pre-Review SHA` (used by review-fix delta re-review).

If `.claude/review-diff.patch` is empty: write `## Review Summary: empty diff, skipped` to task-state, advance to next phase, end.

## Step 2: Scope the review

Run `git diff --stat origin/<base_branch>...HEAD` and select reviewers:

| Changed files match | Reviewers |
|---|---|
| middleware, auth deps, tokens, JWT, OIDC, docker-compose, tyk, infra | Blind + Edge + Acceptance + Sentinel + Viper |
| API routes, services, business logic, models | Blind + Edge + Acceptance + Sentinel |
| Tests only (`tests/**`) | Blind + Acceptance |
| Docs/config only (`*.md`, `*.yml`, `*.toml`) | Acceptance |
| Single file, <50 lines changed | Blind + Acceptance |

Record under `## Reviewers Selected` in task-state.

## Step 3: Read selected reviewer templates

Read only the templates you selected from `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/`:
`blind-hunter.md`, `edge-case-hunter.md`, `acceptance-auditor.md`, `sentinel.md`, `viper.md`.

## Step 4: Spawn reviewers in parallel via the Agent tool

**One assistant turn, one `Agent` call per selected reviewer**, `subagent_type: general-purpose`. Each subagent prompt:

```
<contents of review-agents/<persona>.md, verbatim>

---

## Your task
- Read the diff from <abs path>/.claude/review-diff.patch
- <Edge / Acceptance / Sentinel / Viper:> Codebase is at <abs path>/ — read source as needed
- <Acceptance only:> Read spec: gh issue view <issue_number> --repo jamescrowley321/<repo>
- <Acceptance only:> Read architecture doc at <abs path>
- Write findings to <abs path>/.claude/review-<persona>.md
- Do NOT read PROMPT.md, task-state.md, sprint-plan.md, task-queue.md, or any phases/ file
- Follow the persona template's output format literally
- Return one-line summary: total findings by severity
```

**Critical:** never pass task-state, the plan, prior findings, or hints about what to find — let reviewers discover issues independently.

Wait for all subagents to complete.

## Step 5: Verify subagents ran

```
for persona in blind edge-case acceptance sentinel viper; do
  f=".claude/review-${persona}.md"
  [ -f "$f" ] && [ -s "$f" ] && grep -q "## Review:" "$f" && echo "OK: $f" || echo "MISSING: $f"
done
```

(Check only personas you selected.) Each must exist, be >100 bytes, and contain its persona header.

If any expected file is missing/empty, the subagent did NOT run — re-spawn it. Do NOT fabricate review output. After two re-spawn failures, write `## Review Gate: REVIEWER FAILED <persona> <error>` to task-state, set task to `blocked`, end.

## Step 6: Advance

Once all selected files verify, set phase to `review-fix`. End.
