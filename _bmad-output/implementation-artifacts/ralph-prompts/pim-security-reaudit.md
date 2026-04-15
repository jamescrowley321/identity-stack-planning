You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `py-identity-model` at `~/repos/auth/py-identity-model`

These tasks fix 8 findings from the 2026-04-14 adversarial security re-audit. Findings are grouped into batches per the security fix plan. Each task maps to a GitHub issue with full exploit scenario and recommended fix.

## CRITICAL: No Auto-Merge

**DO NOT merge any PR.** The owner will manually review and merge every PR created by this loop. The `complete` phase must NOT call `gh pr merge`. Only mark the task done, clean up, and move on.

## Task Queue

Tasks are independent — no dependency chain. Each creates its own branch and PR.

| Task | Issue | Branch | Description | Status |
|------|-------|--------|-------------|--------|
| T200 | 375 | fix/deprecate-get-public-key-from-jwk | Deprecate `get_public_key_from_jwk` — stop mutating shared JWKS keys, add DeprecationWarning, remove from `__all__` | pending |
| T201 | 376 | fix/jwks-response-size-limit | Add JWKS response size limit — Content-Length check (512KB), max 100 keys, guard `response_json["keys"]` KeyError | pending |
| T202 | 377 | fix/require-https-dead-code | Fix dead `require_https` field — wire to DiscoveryPolicy in `_discover_and_resolve_key` or deprecate | pending |
| T203 | 378 | fix/cache-stampede | Prevent cache stampede — single-flight refresh on TTL expiry (fetch-under-lock or stale-while-revalidate) | pending |
| T204 | 379 | fix/jwks-missing-content-type | Reject JWKS with missing Content-Type + guard `response_json["keys"]` KeyError with descriptive error | pending |
| T205 | 380 | fix/jwks-url-scheme-validation | Add pre-flight URL scheme validation to `get_jwks()` matching the discovery pattern | pending |
| T206 | 381 | fix/conformance-harness-xss | Escape HTML in conformance harness error responses with `html.escape()` | pending |
| T207 | 382 | fix/async-cleanup-lock-init | Fix async cleanup lock TOCTOU — eagerly initialize lock at module load time | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
2. Read `~/repos/auth/py-identity-model/CLAUDE.md` for project-specific commands and patterns

## Step 2: Determine What To Do

Read `~/repos/auth/py-identity-model/.claude/task-state.md`.

- **Does not exist** → Pick up next task (Step 3)
- **phase is `complete`** → Update queue status in THIS prompt file (replace `pending` with `done` for that row), clean up worktree, delete task-state.md, pick up next task (Step 3)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue above.

- If none eligible (all done) → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Create `~/repos/auth/py-identity-model/.claude/task-state.md`:
     ```
     task_id: T20X
     issue: <issue number>
     repo: py-identity-model
     branch: <branch from queue>
     base_branch: main
     worktree: /tmp/pim-T20X
     phase: setup
     ```
  2. Execute the `setup` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from task-state.md. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

**All work after `setup` happens in the worktree directory** — `cd` to the path in `worktree:` before doing anything.

Phase order:

```
setup → analyze → implement → test → review → review-fix → pr → ci → complete
```

### Phase instructions

Read the shared phase file for each phase from:
`~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md`

Phase-specific overrides and guidance below.

---

### setup

Follow `phases/setup.md`. Repo root is `~/repos/auth/py-identity-model`.

---

### analyze

Follow `phases/analyze.md` with these additions:

1. Read the GH issue: `gh issue view <issue> --repo jamescrowley321/py-identity-model`
2. Read the affected source files identified in the issue
3. Read related test files to understand existing test patterns
4. Read the security fix plan for batch context: `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/security-fix-plan.md`
5. Plan must include:
   - Exact files to modify with current line counts
   - The exploit scenario from the issue — your fix must block it
   - Test plan: unit tests for the fix + regression tests for the attack vector
   - Edge cases specific to this security fix
6. Write plan to task-state under `## Plan`

**Per-task analysis guidance:**

**T200 (#375):** Read `core/parsers.py` lines 180-251 (the function), `core/__init__.py` (exports), `sync/__init__.py` and `aio/__init__.py` (re-exports). The fix: add `DeprecationWarning`, work on a copy of the key (never mutate the original), remove from `__all__`. Verify `find_key_by_kid` (the replacement) does NOT have the same mutation issue.

**T201 (#376):** Read `core/response_processors.py` lines 287-314 (`parse_jwks_response`). Add Content-Length check before `response.json()`, add max key count after parsing, wrap `response_json["keys"]` in try/except KeyError.

**T202 (#377):** Read `core/models.py:1025` (the field), `sync/token_validation.py` and `aio/token_validation.py` (`_discover_and_resolve_key`). Decide: wire through or deprecate. If wiring through: create a `DiscoveryPolicy` from the config's `require_https` value and pass it to `DiscoveryDocumentRequest`.

**T203 (#378):** Read `sync/token_validation.py:56-111` and `aio/token_validation.py:52-111` (cache functions). Implement single-flight: hold lock during fetch, or use a "fetching" sentinel so other threads/tasks wait on the result instead of fetching independently.

**T204 (#379):** Read `core/response_processors.py:297-314`. Change missing Content-Type from warning to rejection. Add try/except `KeyError` around `response_json["keys"]` at line 312.

**T205 (#380):** Read `sync/jwks.py` and `aio/jwks.py`. Add `validate_url_scheme(jwks_request.address, DiscoveryPolicy())` before the HTTP request, matching the pattern in `sync/discovery.py:51-52`.

**T206 (#381):** Read `conformance/app.py`. Add `import html` and wrap all f-string interpolations in `HTMLResponse` with `html.escape()`. Focus on lines 349, 363, 376, 389, 438, 534, 548, 603-604.

**T207 (#382):** Read `aio/http_client.py:42-45` (state dict), lines 177-198 (close function), lines 200-213 (reset function). Move `asyncio.Lock()` creation to module-level `_state` initialization. Remove lazy init in `close_async_http_client()`.

---

### implement

Follow `phases/implement.md`. Additional rules:

- These are security fixes — be precise. Match the exploit scenario from the issue and verify your fix blocks it.
- Run `make lint` before every commit (from the worktree root)
- Use conventional commits: `fix(security): <description>\n\nCloses #<issue>`
- Never `git add .` — add specific files only

---

### test

Follow `phases/test.md`. Additional rules for security fixes:

1. Write unit tests that **reproduce the attack scenario** from the issue, then verify the fix blocks it
2. Write positive tests (normal operation still works after the fix)
3. Run `make test-unit` from the worktree root
4. If the task modifies sync code, verify async parity (or vice versa)
5. Security test naming: `test_<attack_name>_blocked` (e.g., `test_key_mutation_via_jwt_header_blocked`)

---

### review

Follow `phases/review.md`.

**Reviewer selection:** Since ALL tasks are security fixes, always use the full set:
**Blind Hunter + Edge Case Hunter + Acceptance Auditor + Sentinel + Viper**

The review-agents templates are at:
`~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/`

---

### review-fix

Follow `phases/review-fix.md`. No overrides.

---

### pr

Follow `phases/pr.md` with these additions:

- Repo is `jamescrowley321/py-identity-model`
- PR title format: `fix(security): <description>`
- PR body must include:
  - The issue number (`Closes #NNN`)
  - The exploit scenario that was blocked
  - Review finding summary
- Add label: `--label security`
- **DO NOT add auto-merge flags.** No `--auto`, no merge queue.

---

### ci

Follow `phases/ci.md`. Repo is `jamescrowley321/py-identity-model`. Max 3 CI fix attempts per task.

---

### complete

**OVERRIDE: Do NOT merge the PR.** The owner will manually review and merge.

1. Update task status in THIS prompt file: replace `pending` with `done` for the completed row
2. Clean up worktree:
   ```
   cd ~/repos/auth/py-identity-model
   git worktree remove <worktree> --force
   ```
3. Delete task-state.md
4. Output: <promise>TASK COMPLETE</promise>

---

## Rules

- Execute ONE phase per iteration, then end
- NEVER commit to main — always work on feature branches in worktrees
- All work after setup happens in the worktree
- Follow existing code patterns in py-identity-model
- Use conventional commits (Angular convention) — this repo uses semantic-release
- Always run `make lint` before committing — do NOT split into separate ruff/pyrefly/pytest calls
- Always run `make test-unit` before pushing
- If stuck 3+ iterations on same phase: set task to `blocked`, clean up, move on
- **NEVER merge PRs — owner reviews and merges manually**
- One phase per iteration ensures fresh context and prevents drift
