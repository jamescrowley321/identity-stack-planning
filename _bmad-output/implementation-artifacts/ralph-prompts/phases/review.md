# Phase: review

**This phase MUST spawn independent reviewer subagents using the `Agent` tool.** Do NOT review the diff yourself in-context. Do NOT summarize findings without spawning subagents. The whole point of this phase is to get an adversarial perspective from outside the implementation context — that only happens in a fresh subagent with no prior knowledge of the plan or the implementation decisions.

If you catch yourself writing "## Review: Blind Hunter" or any review content directly in your response, STOP — you are doing it wrong. The reviewers must write their own findings to disk via the Agent tool.

`cd <worktree or repo root>`

## Step 1: Generate diff + pin SHA

```
mkdir -p .claude
git diff origin/<base_branch>...HEAD > .claude/review-diff.patch
git rev-parse HEAD > .claude/pre-review-sha.txt
```

Also record the SHA in task-state under `## Pre-Review SHA` for the review-fix delta-review step.

Verify the diff is non-empty:
```
test -s .claude/review-diff.patch || echo "EMPTY DIFF — nothing to review"
```

If the diff is empty, write `## Review Summary: empty diff, skipped` to task-state and advance to the next phase. End your response.

## Step 2: Scope the review

Run `git diff --stat origin/<base_branch>...HEAD` and select reviewers using this table:

| Changed files match | Reviewers |
|---|---|
| middleware, auth deps, tokens, JWT, OIDC, docker-compose, tyk, infra | Blind + Edge Case + Acceptance + Sentinel + Viper |
| API routes, services, business logic, models | Blind + Edge Case + Acceptance + Sentinel |
| Tests only (`tests/**`) | Blind + Acceptance |
| Docs/config only (`*.md`, `*.yml`, `*.toml`) | Acceptance |
| Single file, <50 lines changed | Blind + Acceptance |

Record the selected reviewers in task-state under `## Reviewers Selected`.

## Step 3: Read reviewer templates

The persona templates live at:
`~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/`

- `blind-hunter.md`
- `edge-case-hunter.md`
- `acceptance-auditor.md`
- `sentinel.md`
- `viper.md`

Read only the ones you selected in Step 2. You need the full contents because you'll pass them to the subagents.

## Step 4: Spawn reviewers in parallel via the Agent tool

**In a single assistant turn, make one `Agent` tool call per selected reviewer.** Use `subagent_type: general-purpose`. Each subagent's prompt must follow this structure:

```
<contents of the review-agents/<persona>.md template file, verbatim>

---

## Your task
- Read the diff from <absolute path>/.claude/review-diff.patch
- <For Edge Case / Acceptance / Sentinel / Viper:> The codebase is at <absolute path>/ — read any source file you need for context
- <For Acceptance only:> Read the spec with: gh issue view <issue_number> --repo jamescrowley321/<repo>
- <For Acceptance only:> Read the architecture doc at <absolute path to arch doc>
- Write your findings to <absolute path>/.claude/review-<persona>.md
- Do NOT read PROMPT.md, task-state.md, sprint-plan.md, task-queue.md, or any file under ralph-prompts/phases/
- Follow the output format specified in the persona template literally
- Return a one-line summary: total finding count by severity
```

**Critical rules for the subagent prompts:**
- NEVER pass task-state.md or any implementation notes
- NEVER pass the plan, the sprint doc, or the prior review findings from previous iterations
- NEVER tell the reviewer what the "correct" answer is
- NEVER include the issue you want them to find — let them discover it

**Launch all selected reviewers in a single turn** (one assistant message, multiple Agent tool uses in parallel). Wait for all to complete.

## Step 5: Verify subagents actually ran

After all subagents return, verify each expected output file:

```
for persona in blind edge-case acceptance sentinel viper; do
  f=".claude/review-${persona}.md"
  if [ -f "$f" ] && [ -s "$f" ] && grep -q "## Review:" "$f"; then
    echo "OK: $f"
  else
    echo "MISSING: $f"
  fi
done
```

(Only check the personas you selected.)

Each file must:
- Exist
- Be non-empty (>100 bytes)
- Contain the persona's header line (e.g. `## Review: Blind Hunter`, `## Review: Edge Case Hunter`, `## Review: Acceptance Auditor`, `## Review: Security (Sentinel)`, `## Review: Red Team (Viper)`)

**If any expected file is missing or empty, the subagent did NOT run correctly.** Re-spawn the missing reviewer. Do NOT fabricate review output in-context. Do NOT advance to review-fix with missing files.

If after two re-spawn attempts a reviewer still fails, write `## Review Gate: REVIEWER FAILED` to task-state with the persona name and error, set task status to `blocked`, end.

## Step 6: Advance

Once all selected review files are verified present and properly headed, set phase to `review-fix`. End your response.
