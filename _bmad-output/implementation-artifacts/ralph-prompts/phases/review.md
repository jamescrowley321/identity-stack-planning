# Phase: review

**Spawn independent review subagents.** Each reviewer runs in a fresh context with NO access to the plan or task-state.md.

`cd <worktree>`

1. Generate diff: `git diff origin/<base_branch>...HEAD > .claude/review-diff.patch`

2. Read the review agent templates from:
   `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/`

3. Spawn 4 independent review subagents using the `Agent` tool. Each receives ONLY what's listed:

   **Blind Hunter** — diff only → `.claude/review-blind.md`
   **Edge Case Hunter** — diff + codebase read → `.claude/review-edge.md`
   **Acceptance Auditor** — diff + spec (`gh issue view`) + architecture doc + codebase → `.claude/review-acceptance.md`
   **Sentinel** — diff + codebase read → `.claude/review-security.md`

   Launch all 4 in parallel.

4. **Conditional: Viper** — if changed files match `middleware/* | dependencies/rbac.py | **/token* | **/jwt* | docker-compose* | tyk/*`, spawn 5th agent → `.claude/review-redteam.md`

5. Verify all review files exist and are non-empty.

6. **Set phase to `review-fix`. End your response.**
