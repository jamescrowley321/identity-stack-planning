You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `py-identity-model` at `~/repos/auth/py-identity-model` (`jamescrowley321/py-identity-model`).

`py-identity-model` (PIM) is **OpenID Certified** (v3.1.0, 2 Jul 2026) for **Basic RP + Config RP + Form Post Basic RP**. This loop pursues the **next certification round** — three RP profiles — plus the enabling provider and infra work:

- **Back-Channel Logout RP** (#442) — `validate_logout_token()`
- **RP-Initiated Logout RP** (#214) — `build_end_session_url()` + `state` round-trip
- **Dynamic RP** (#216) — RFC 7591/7592 dynamic client registration
- **Keycloak provider** — added the same way ORY/Descope/node-oidc are wired, with a capability-maximal realm, giving live-IdP coverage for the profiles.

**Dropped (do NOT implement):** Hybrid, Implicit, Front-Channel Logout, Session Management (tracker #242).

Sources of truth (read the matching one per task):
- Logout spec + fixtures + test IDs: `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-0e-spec-logout.md` (LOGOUT-001/002/003 = RP-initiated; LOGOUT-004/005/006/007/009/010 = back-channel; LOGOUT-008 = front-channel = **dropped**).
- Dynamic registration spec: `.../epics/epic-0e-spec-dynamic-registration.md`.
- Keycloak epic: `.../epics/epic-pim-keycloak-provider-integration.md` (stories KC.1–KC.6).
- Cert tracker: py-identity-model #242.

Verified current lib state (do NOT re-discover from scratch): `oidc_constants.py` has `EndSessionRequest`, `BackChannelLogoutRequest`, `END_SESSION_ENDPOINT` (constants only, no logic). Discovery model `core/models.py` has `registration_endpoint` but is **missing** `end_session_endpoint`, `backchannel_logout_supported`, `backchannel_logout_session_supported`. No `validate_logout_token`, no end-session URL builder, no registration client exist. Conformance harness (`conformance/app.py`, `app_fastapi.py`) + basic/config/form-post configs exist and pass; no logout/dynamic configs yet. Provider integration pattern: `.env.<name>` with `TEST_DISCO_ADDRESS`; `make test-integration-<name>`; fixture providers live in `test-fixtures/<name>/` with docker-compose; `provider_matrix.py` globs `.env.*`.

## Running

Run from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/py-identity-model` — the owner uses that checkout by hand and a second ralph loop (identity-model Go tier) runs elsewhere. `PROMPT.md` and `.claude/task-state.md` live in the orchestrator worktree for the whole run.

```bash
cd ~/repos/auth/py-identity-model && git fetch origin
git worktree add /tmp/pim-nextround-orch -b ralph/pim-nextround origin/main
cd /tmp/pim-nextround-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-next-round-conformance.md PROMPT.md
ralph run --autonomous --idle-timeout 0 --no-auto-merge
```

`ORCH_WORKTREE` = `/tmp/pim-nextround-orch`. Per-task implementation happens in its own `/tmp/pim-<taskid>` worktree (created by `setup`) off the task's `base_branch`. When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-nextround-orch`.

## CRITICAL: No Auto-Merge

**DO NOT merge any PR.** The owner manually reviews and merges every PR. The `complete` phase must NOT call `gh pr merge` — no `--auto`, no merge queue. Only mark the task done, clean up, move on.

## CRITICAL: Never delete or force-close a branch

Phase-0 reconciliation tasks **recommend** closes; they never run `git branch -D`, `git push --delete`, or `gh pr close` on the owner's existing branches. Salvaged work goes into a NEW branch/PR; the recommendation to close the old branch is recorded in the PR body for the owner to action.

## Dependency Model — Base-Branch Chaining

Tasks build on each other and PRs are NOT auto-merged, so each task branches off its **`base_branch`** (the previous task's branch), and opens its PR with `--base <base_branch>`. This produces a reviewable stack the owner merges bottom-up. Per Step 3, once a `base_branch` has been merged to `main`, later tasks MAY base off `main` instead — this self-corrects as the owner lands the stack. The Phase-0 reconciliation tasks are independent and each base off `main`.

## Task Queue

| Task | Issue/Story | Branch | Base branch | Description | Status |
|------|-------------|--------|-------------|-------------|--------|
| P0.1 | — | chore/reconcile-conformance-cert-package | main | Diff `feat/conformance-cert-package` vs main; salvage the unmerged slice (hosted-CI workflow, `docs/certification.md`, `run_tests.py` export/log tooling, token-exchange error-body fix) into a clean PR; recommend closing the old branch | pending |
| P0.2 | — | chore/reconcile-fastapi-conformance-regression | main | Diff `feat/fastapi-conformance-regression` vs main; salvage only the genuinely-unmerged delta (`rp.py` delta, `conformance.yml` fastapi job); recommend close | pending |
| P0.3 | — | chore/reconcile-fastapi-identity-model-package | main | Diff `feat/fastapi-identity-model-package` vs main; the package is already released on main — salvage only real deltas, else recommend close with rationale | pending |
| P0.4 | — | chore/reconcile-openid-certification-docs | main | Diff `docs/openid-certification` vs main (check against #440 first); salvage cert mark/badge if not already present; recommend close | pending |
| KC.1 | KC.1 | feat/keycloak-fixture | main | `test-fixtures/keycloak/` docker-compose + capability-maximal `realm-export.json` + README (see Keycloak epic KC.1) | pending |
| KC.2 | KC.2 | feat/keycloak-provider-wiring | feat/keycloak-fixture | `.env.keycloak.example` + `make test-integration-keycloak` (mirror node-oidc target) + confirm `provider_matrix.py` pickup | pending |
| KC.3 | KC.3 | test/keycloak-full-suite | feat/keycloak-provider-wiring | Full capability-gated integration suite runs green vs Keycloak; fix library gaps in `core/` (sync+async) with unit tests | pending |
| KC.4 | KC.4 | feat/provider-matrix-logout-columns | test/keycloak-full-suite | Add `registration_endpoint`/`end_session_endpoint`/`backchannel_logout_supported`/`_session_supported` columns to `provider_matrix.py`; refresh published matrix | pending |
| BCL | #442 | feat/backchannel-logout | feat/provider-matrix-logout-columns | `core/logout_logic.py` `validate_logout_token` (+ `sync/logout.py`, `aio/logout.py`); add `backchannel_logout_supported`/`_session_supported` to discovery model; unit tests LOGOUT-004/005/006/007/009/010; harness `backchannel_logout_uri` receiver + `configs/backchannel-logout-rp.json`; hosted run | pending |
| RPL | #214 | feat/rpinitiated-logout | feat/backchannel-logout | `build_end_session_url` (in `core/logout_logic.py`) + `state` round-trip; add `end_session_endpoint` to discovery model; unit tests LOGOUT-001/002/003; harness logout redirect + post-logout callback + `configs/rpinitiated-logout-rp.json`; hosted run | pending |
| DYN | #216 | feat/dynamic-registration | feat/rpinitiated-logout | `core/registration_logic.py` request/response/document + register/read/update/delete (RFC 7591/7592, sync+async); unit tests (minimal+full metadata, CRUD, errors); harness `configs/dynamic-rp.json`; hosted run | pending |
| KC.5 | KC.5 | test/keycloak-logout-registration-live | feat/dynamic-registration | Live Keycloak integration tests: validate a real Keycloak logout token; end-session URL round-trip; register→read→update→delete a client (capability-gated, skip cleanly if unsupported) | pending |
| KC.6 | KC.6 | ci/keycloak-integration-docs | test/keycloak-logout-registration-live | Add Keycloak CI job (mirror node-oidc) + `pre-push`; update integration README + docs provider page + refreshed matrix | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for workspace commands and git conventions.
2. Read `~/repos/auth/py-identity-model/CLAUDE.md` for the mandatory workflow rules, dual sync/async architecture, and commit conventions.
3. Read the source-of-truth epic/issue for the current task (see Context).

## Step 2: Determine What To Do

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/pim-nextround-orch/.claude/task-state.md`).

- **Does not exist** → Pick up next task (Step 3).
- **phase is `complete`** → Mark the task `done` in the queue in THIS file, clean up the worktree, delete task-state.md, pick up next task (Step 3).
- **Any other phase** → Execute that one phase (Step 4).

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue.

- If none remain → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Determine `base_branch` from the queue. If that base branch's PR has already been merged to `main`, you MAY base off `main` instead (cleaner). Otherwise base off the branch as listed.
  2. Create `ORCH_WORKTREE/.claude/task-state.md`:
     ```
     task_id: <e.g. BCL>
     issue: <issue/story or ->
     repo: py-identity-model
     branch: <branch from queue>
     base_branch: <base branch from queue>
     worktree: /tmp/pim-<taskid>
     phase: setup
     ```
  3. Execute the `setup` phase, then end your response.

## Step 4: Execute ONE Phase

Read `phase` from task-state.md. Execute ONLY that phase. When done, update the `phase` field to the next phase and end your response.

**All work after `setup` happens in the worktree** — `cd` to the `worktree:` path first.

Phase order: `setup → analyze → implement → test → review → review-fix → pr → ci → complete`

Read the shared phase file for each phase from:
`~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md`

### Phase overrides

**setup** — Follow `phases/setup.md`. Repo root `~/repos/auth/py-identity-model`. Create the worktree off `base_branch`: `git fetch origin && git worktree add -b <branch> <worktree> <base_branch>`.

**analyze** — Follow `phases/analyze.md`, plus:
- **P0.x (reconciliation):** `git log --oneline main..<old-branch>` and `git diff main...<old-branch>`; for each hunk decide already-on-main vs genuinely-unmerged. Plan lists exactly which files/hunks to cherry-pick or re-apply onto the new branch, and which to recommend-close. If nothing is unmerged, the plan says so (the task will produce a "superseded — recommend close" PR-less complete).
- **KC.x:** read the matching story in the Keycloak epic — every AC is a requirement. Read the existing `test-fixtures/node-oidc-provider/` fixture as the structural model and `src/tests/integration/conftest.py` + `provider_matrix.py` for the wiring contract.
- **BCL/RPL/DYN:** read the matching story in `epic-0e-spec-logout.md` / `epic-0e-spec-dynamic-registration.md` and map every LOGOUT-* / registration test ID to a unit test. Read the current `core/models.py` discovery model, `oidc_constants.py`, the sync/aio wrapper pattern (`sync/`, `aio/`), and `conformance/app.py`. Implement business logic in `core/` first, then thin sync + aio wrappers (mandatory parity).

**implement** — Follow `phases/implement.md`, plus:
- Match existing PIM patterns: pure logic in `core/`, thin sync/aio wrappers, `httpx`, structured exceptions in `exceptions.py`, full type hints.
- Run `make lint` before every commit (never `--no-verify`, never split into separate ruff/pyrefly/pytest). Never `git add .` — add specific files.
- Conventional commits (Angular): profiles `feat(logout):` / `feat(registration):`; Keycloak `test(keycloak):` / `build(keycloak):` / `feat(integration):`; matrix `feat(matrix):`; reconciliation uses the salvaged change's own type. Scope any `packages/fastapi-identity-model/` change `(fastapi)` — that scope is load-bearing for release routing.

**test** — Follow `phases/test.md`, plus:
- Unit tests reference their spec ID in a comment (e.g. `# LOGOUT-005`). Sync change → verify async parity and vice versa. `make test-unit` (80% cov) before pushing.
- Integration/fixture/conftest changes: run `make test-integration-node-oidc` (and `make test-integration-keycloak` once KC.1–KC.2 are in the stack) before pushing — lint does not exercise fixtures.
- Profiles: after unit tests, run the relevant `make conformance-test` plan locally and capture results under `conformance/results/`.

**review** — Follow `phases/review.md`. Reviewers: **BCL/RPL/DYN** (security-sensitive JWT/token handling) use **Blind Hunter + Edge Case Hunter + Acceptance Auditor + Sentinel + Viper**; **KC.x / P0.x** use **Blind Hunter + Edge Case Hunter + Acceptance Auditor**. Templates in `ralph-prompts/review-agents/`. Acceptance Auditor verifies every AC / spec ID is covered.

**review-fix** — Follow `phases/review-fix.md`. No overrides.

**pr** — Follow `phases/pr.md`, plus:
- Repo `jamescrowley321/py-identity-model`. **Open with `--base <base_branch>`** unless the base is already merged to `main`.
- Title in conventional-commit form. Body lists: the issue/story, ACs / spec IDs covered, review summary, and (for P0.x) the recommend-close note for the old branch. Labels: profiles `--label certification`; P0.x `--label chore` if it exists.
- **No auto-merge flags.** If a reconciliation task found nothing to salvage, skip `pr` (no PR) — record "superseded, recommend close <branch>" in task-state, advance to `complete`.

**ci** — Follow `phases/ci.md`. Repo `jamescrowley321/py-identity-model`. Max 3 CI fix attempts. Do not advance to `complete` on red CI.

**complete** — **OVERRIDE: do NOT merge the PR.**
1. Mark the task `done` in the queue in THIS file.
2. `cd ~/repos/auth/py-identity-model && git worktree remove <worktree> --force`
3. Delete `.claude/task-state.md`.
4. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — fresh context prevents drift.
- NEVER commit to `main`; always feature branches in worktrees.
- All work after setup happens in the worktree.
- Business logic in `core/` first, then sync + aio wrappers — sync/async parity is mandatory.
- Follow the spec: implement to the existing LOGOUT-* / registration IDs and ACs, not just to compile. Front-channel + session management are dropped — do not implement them.
- Conventional commits (Angular); `make lint` before commit; `make test-unit` before push; integration tests before pushing fixture/conftest changes.
- Never delete or force-close the owner's existing branches — recommend only.
- If stuck 3+ iterations on the same phase: set task to `blocked`, clean up the worktree, delete task-state.md, move on.
- **NEVER merge PRs — the owner reviews and merges manually.**
