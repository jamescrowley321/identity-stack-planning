You are in a self-referential fix loop. Each iteration you execute ONE phase of ONE fix task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Step 1: Determine Context

- Identify which repo from `git remote -v` (terraform-provider-descope, descope-saas-starter, or py-identity-model)
- Read ~/repos/auth/CLAUDE.md for repo commands and git conventions

## Step 2: Determine What To Do

Read `.claude/task-state.md` in the repo root.

- **Does not exist** → Pick up next fix task (Step 3)
- **phase is `complete`** → Mark task done in queue, delete `.claude/task-state.md`, pick up next task (Step 3)
- **phase is `ci-fix`** → Go to ci-fix sub-phase (Step 4)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Fix Task

Read queue: `~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/task-queue.md`

Find your repo's **"Review Fix Tasks"** section(s). Take first `pending` row whose dependencies are all `done`.

- If none eligible → output: <promise>ALL FIX TASKS COMPLETE</promise>
- Otherwise:
  1. Set status to `in_progress` in queue
  2. Create `.claude/task-state.md`:
     ```
     task_id: <ID>
     issue: <number>
     repo: <name>
     branch: <branch>
     pr: <PR number from issue body>
     description: <desc>
     phase: checkout
     ```
  3. Execute the `checkout` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from `.claude/task-state.md`. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

Phase order: checkout → fix → test → ci → complete

---

### checkout

1. Read the issue: `gh issue view <number> --repo jamescrowley321/<repo>`
2. Record the MUST FIX and SHOULD FIX items in `.claude/task-state.md` under `## Findings`
3. Fetch and checkout the existing branch:
   ```
   git fetch origin
   git checkout <branch>
   git pull origin <branch>
   ```
4. **For descope-saas-starter cross-cutting fix tasks (T95-T98):** These branches are cumulative builds. After checkout, check if the base phased branches have been updated:
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
4. Commit any new tests
5. When all green: **set phase to `ci`. End your response.**

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
- NEVER skip phases
- NEVER commit to main
- NEVER modify other repos
- Always read ~/repos/auth/CLAUDE.md for repo commands
- **Git operations:** Use `gh` CLI for GitHub operations (PRs, issues, checks, runs). Use `git` with SSH remotes for push/pull/fetch.
- Only fix what the review identified — no scope creep
- If stuck multiple iterations on same phase: set task to `blocked` in queue, delete state file, pick up next
