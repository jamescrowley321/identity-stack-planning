You are in a self-referential fix loop. Each iteration you execute ONE phase of ONE fix task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Step 1: Determine Context

- Identify which repo from `git remote -v` (terraform-provider-descope, identity-stack, or py-identity-model)
- Read ~/repos/auth/CLAUDE.md for repo commands and git conventions

## Step 2: Determine What To Do

Read `.claude/task-state.md` in the repo root.

- **Does not exist** → Pick up next fix task (Step 3)
- **phase is `complete`** → Mark task done in queue, delete `.claude/task-state.md`, pick up next task (Step 3)
- **phase is `ci-fix`** → Go to ci-fix sub-phase (Step 4)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Fix Task

Read queue: `~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/task-queue.md`

Find your repo's **"Review Fix Tasks"** section(s). ONLY look at sections whose heading contains "Review Fix Tasks" — do NOT pick tasks from any other section. Take first `pending` row whose dependencies are all `done`.

- If none eligible (all done, blocked, or deps not met) → output: <promise>ALL FIX TASKS COMPLETE</promise>
- CRITICAL: Never pick up tasks outside "Review Fix Tasks" sections. If you cannot find an eligible task, output the promise — do NOT fall back to other sections.
- Otherwise:
  1. Set status to `in_progress` in queue
  2. Create `.claude/task-state.md`:
     ```
     task_id: <ID>
     issue: <number or empty>
     repo: <name>
     branch: <branch>
     pr: <PR number>
     description: <desc>
     phase: checkout
     ```
  3. Execute the `checkout` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from `.claude/task-state.md`. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

Phase order: checkout → fix → test → review-blind → review-edge → review-security → review-fix → ci → complete

---

### checkout

1. Read the review findings:
   - If `issue` is set: `gh issue view <number> --repo jamescrowley321/<repo>`
   - If `issue` is empty: read the **most recent** "Adversarial Code Review" comment from the PR: `gh pr view <pr> --repo jamescrowley321/<repo> --comments`
   - Look for the comment titled "Adversarial Code Review — PR #XX (Re-run ...)" — use the LATEST such comment if multiple exist
2. Record the MUST FIX and SHOULD FIX items in `.claude/task-state.md` under `## Findings`
3. Fetch and checkout the existing branch:
   ```
   git fetch origin
   git checkout <branch>
   git pull origin <branch>
   ```
4. **For identity-stack cross-cutting fix tasks (T96-T119):** These branches are cumulative builds. After checkout, check if the base phased branches have been updated:
   - Find the most recent completed phased fix task's branch from the queue (T90-T94 section)
   - Rebase onto it: `git rebase origin/<latest-fixed-phased-branch>`
   - If conflicts arise, resolve them — the phased branch's version takes precedence for systemic fixes
5. Read the current code to understand what needs to change
6. **Set phase to `fix`. End your response.**

---

### fix

**Persona:** Read `~/repos/auth/auth-planning/_bmad/bmm/agents/dev.md` — adopt Amelia's mindset.

1. Read `## Findings` from `.claude/task-state.md`
2. Fix ALL **MUST FIX** items — these are non-negotiable
3. Fix all **SHOULD FIX** items where the fix is straightforward and low-risk
4. For each fix:
   - Make the change
   - Run repo lint checks (see ~/repos/auth/CLAUDE.md)
   - Commit with a descriptive message referencing the issue
5. Do NOT introduce new features or refactor unrelated code — fix only what the review identified
6. **Set phase to `test`. End your response.**

---

### test

**Persona:** Read `~/repos/auth/auth-planning/_bmad/bmm/agents/qa.md` — adopt Quinn's mindset.

1. Run the repo's full test suite (commands in ~/repos/auth/CLAUDE.md)
2. If failures: fix and re-run until green
3. Verify that the fixes are actually tested:
   - MUST FIX items should have corresponding test coverage
   - If a MUST FIX item (e.g., authorization bypass, nil pointer) has no test, add one
4. **For identity-stack:** Also run `make test-e2e` to verify Playwright E2E tests pass as regression. If a MUST FIX item (e.g., auth bypass, IDOR, tenant isolation) is not covered by an E2E test, add one following patterns in `backend/tests/e2e/`.
5. Commit any new tests
6. When all green: **set phase to `review-blind`. End your response.**

---

### review-blind

**Persona: Blind Hunter (Adversarial Reviewer)** — Read `~/repos/auth/auth-planning/_bmad/core/skills/bmad-review-adversarial-general/workflow.md`. Cynical, jaded reviewer. The fixes may have introduced new problems.

1. Generate the diff — scope to ONLY the fix commits (not the entire PR history):
   ```
   git log --oneline --since="$(git log -1 --format=%ci HEAD~$(git rev-list --count HEAD ^origin/<branch>))" | head -5
   git diff HEAD~<fix_commit_count>...HEAD
   ```
   If unsure of commit count, diff against the state before your fixes.
2. **Review the fixes only.** Look for:
   - Regressions introduced by the fix
   - Incomplete fixes (partially addressed but still exploitable)
   - New edge cases created by the fix
   - Test gaps (fix applied but no test proving it works)
3. Write findings to `.claude/task-state.md` under `## Review: Blind Hunter`:
   ```
   ### MUST FIX
   - [location] finding description

   ### SHOULD FIX
   - [location] finding description
   ```
4. **Set phase to `review-edge`. End your response.**

---

### review-edge

**Persona: Edge Case Hunter** — Read `~/repos/auth/auth-planning/_bmad/core/skills/bmad-review-edge-case-hunter/workflow.md`. Pure path tracer on the fix diff only.

1. Generate the fix diff (same scope as review-blind)
2. Walk ALL branching paths in the changed code. Collect ONLY unhandled paths.
3. Write findings to `.claude/task-state.md` under `## Review: Edge Case Hunter` as JSON:
   ```json
   [
     {
       "location": "file:line",
       "trigger_condition": "description (max 15 words)",
       "guard_snippet": "minimal code sketch to close gap",
       "potential_consequence": "what goes wrong (max 15 words)"
     }
   ]
   ```
4. **Set phase to `review-security`. End your response.**

---

### review-security

**Persona: Sentinel (Security Auditor)** — Read `~/repos/auth/auth-planning/docs/ralph-planning/ralph-bmad-integration-plan.md` § 2.1. Pragmatic auth-domain security review of the fixes.

1. Generate the fix diff
2. **Security review through the auth-domain lens.** Focus on:
   - Did the fix close the vulnerability completely? (no partial mitigations)
   - Did the fix introduce new attack surface?
   - Tenant isolation, authorization bypass, injection, IDOR, information disclosure
3. Write findings to `.claude/task-state.md` under `## Review: Security (Sentinel)`:
   ```
   ### BLOCK (must fix before merge)
   - [CONFIRMED/LIKELY] [location] — finding + attack scenario

   ### WARN (should fix)
   - [location] — finding + mitigation suggestion

   ### INFO
   - [location] — observation
   ```
4. If no issues: write `PASS`.
5. **Set phase to `review-fix`. End your response.**

---

### review-fix

**Persona:** Amelia (dev.md) — fix mode.

1. Read ALL review sections from `.claude/task-state.md`:
   - `## Review: Blind Hunter` — MUST FIX and SHOULD FIX
   - `## Review: Edge Case Hunter` — unhandled paths
   - `## Review: Security (Sentinel)` — BLOCK and WARN
2. **Priority order:** Security BLOCK → Blind Hunter MUST FIX → Edge Case (security/crash consequences) → WARN/SHOULD FIX
3. Fix each item, run lint/tests, commit
4. If no findings to fix (all PASS/INFO): skip to next phase.
5. **Set phase to `ci`. End your response.**

---

### ci

**Persona:** Amelia (dev.md) — CI ops mode.

1. **Push the branch:**
   ```
   git push origin <branch> --force-with-lease
   ```
   (force-with-lease because we may have rebased cross-cutting branches)

2. **Find the existing PR:**
   - `gh pr list --head <branch> --repo jamescrowley321/<repo>`
   - If somehow no PR exists: `gh pr create --base main --title "Fix: <description>" --body "Fixes review findings from adversarial code review. Closes #<issue>" --repo jamescrowley321/<repo>`
   - Record PR number in `.claude/task-state.md` under `## CI`

3. **Wait for CI:**
   - `gh pr checks <pr_number> --repo jamescrowley321/<repo> --watch --fail-fast`
   - If timeout, poll up to 3 times with 30s sleep

4. **Evaluate:**
   - **All pass** → **set phase to `complete`. End your response.**
   - **Fail** → read failure details:
     - `gh run list --branch <branch> --repo jamescrowley321/<repo> --limit 1`
     - `gh run view <run_id> --repo jamescrowley321/<repo> --log-failed`
   - Write details to `## CI` in state file
   - **Set phase to `ci-fix`. End your response.**

5. **No CI** (no checks after 60s) → **set phase to `complete`. End your response.**

---

### ci-fix

1. Read `## CI` from `.claude/task-state.md`
2. Diagnose and fix the failure
3. Run local lint/build/tests
4. Commit and push: `git push origin <branch>`
5. **Set phase to `ci`. End your response.**

---

### complete

1. Set task status to `done` in queue file
2. Delete `.claude/task-state.md`
3. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — do NOT chain phases
- NEVER output a promise unless a task just completed or no tasks remain
- NEVER skip phases — every fix task goes through all review layers
- **Review integrity:** Each review persona operates independently. Do NOT pre-emptively fix things to avoid review findings.
- NEVER commit to main
- NEVER modify other repos
- Always read ~/repos/auth/CLAUDE.md for repo commands
- **Git operations:** Use `gh` CLI for GitHub operations (PRs, issues, checks, runs). Use `git` with SSH remotes for push/pull/fetch.
- Only fix what the review identified — no scope creep
- If stuck multiple iterations on same phase: set task to `blocked` in queue, delete state file, pick up next
