# Phase: review

Spawn independent review subagents scoped to the change.

`cd <worktree or repo root>`

1. Generate diff:
   ```
   git diff origin/<base_branch>...HEAD > .claude/review-diff.patch
   ```

2. Record pre-review SHA in task-state under `## Pre-Review SHA`:
   ```
   git rev-parse HEAD
   ```

3. **Scope the review** — run `git diff --stat origin/<base_branch>...HEAD` and select reviewers:

   | Changed files match | Reviewers |
   |---|---|
   | middleware, auth deps, tokens, JWT, OIDC, docker-compose, tyk, infra | Blind + Edge Case + Acceptance + Sentinel + Viper |
   | API routes, services, business logic, models | Blind + Edge Case + Acceptance + Sentinel |
   | Tests only (`tests/**`) | Blind + Acceptance |
   | Docs/config only (`*.md`, `*.yml`, `*.toml`) | Acceptance |
   | Single file, <50 lines changed | Blind + Acceptance |

4. Read review agent templates from:
   `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/`

5. Spawn each reviewer using the `Agent` tool. Each receives ONLY:
   - Its template instructions (from the review-agents/ file)
   - "Read the diff from `<path>/.claude/review-diff.patch`"
   - For Edge Case / Acceptance / Sentinel / Viper: "The codebase is at `<path>/` — read any file you need for context"
   - For Acceptance: also "Read the spec: `gh issue view <issue> --repo jamescrowley321/<repo>`"
   - "Write findings to `<path>/.claude/review-<name>.md`"

   **NEVER** give reviewers task-state, the plan, or implementation notes.
   Launch all selected reviewers in parallel.

6. Verify all review files exist and are non-empty.
7. **Advance to the next phase. End your response.**
