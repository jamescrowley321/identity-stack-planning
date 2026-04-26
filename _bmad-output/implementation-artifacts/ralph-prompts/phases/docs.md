# Phase: docs

**This phase spawns a docs writer subagent using the `Agent` tool.** Do NOT update documentation yourself in-context. The docs writer operates with fresh context and no knowledge of implementation decisions — it sees only what changed and what the docs currently say.

`cd <worktree or repo root>`

## Step 1: Verify diff exists

```
test -s .claude/review-diff.patch || git diff origin/<base_branch>...HEAD > .claude/review-diff.patch
```

If the diff is empty, write `## Docs: no changes, skipped` to task-state and advance to the next phase. End your response.

## Step 2: Read the docs writer template

Read the full contents of:
`~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/docs-writer.md`

You need the full contents because you'll pass it to the subagent.

## Step 3: Spawn docs writer via the Agent tool

Make one `Agent` tool call with `subagent_type: general-purpose`. The prompt must follow this structure:

```
<contents of review-agents/docs-writer.md, verbatim>

---

## Your task
- Read the diff from <absolute path>/.claude/review-diff.patch
- The codebase is at <absolute path>/ — read any source file you need for context
- Read the story spec with: gh issue view <issue_number> --repo jamescrowley321/<repo>
- Update any stale documentation directly in the codebase
- Write your summary to <absolute path>/.claude/docs-writer.md
- Do NOT read PROMPT.md, task-state.md, sprint-plan.md, task-queue.md, or any file under ralph-prompts/phases/
- Follow the output format specified in the persona template literally
- Return a one-line summary: files checked and files updated
```

**Critical rules for the subagent prompt:**
- NEVER pass task-state.md or any implementation notes
- NEVER pass the plan or sprint doc

Wait for the subagent to complete.

## Step 4: Verify subagent ran

```
f=".claude/docs-writer.md"
if [ -f "$f" ] && [ -s "$f" ] && grep -q "## Docs:" "$f"; then
  echo "OK: $f"
else
  echo "MISSING: $f"
fi
```

If missing after two attempts, write `## Docs: WRITER FAILED` to task-state and advance anyway (docs are not a merge gate).

## Step 5: Push any doc commits

If the docs writer made commits, push them:
```
git push
```

## Step 6: Advance

Append the docs writer summary to task-state under `## Docs`. Set phase to `ci`. End your response.
