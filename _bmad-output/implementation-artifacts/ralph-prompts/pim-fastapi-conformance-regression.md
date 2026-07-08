Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

## Running

Run the loop from a **dedicated py-identity-model worktree**, never from the main `~/repos/auth/py-identity-model` checkout — this keeps `PROMPT.md`/`.claude/task-state.md` out of the primary checkout and keeps `main` pristine.

```bash
# One-time: create the orchestrator worktree off main
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/pim-fastapi-conf-ralph -b ralph/fastapi-conformance-regression origin/main

# Run the loop from inside that worktree
cd /tmp/pim-fastapi-conf-ralph
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-fastapi-conformance-regression.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` below refers to `/tmp/pim-fastapi-conf-ralph`. **The prompt must live inside the orchestrator worktree as `PROMPT.md` for the whole run** — ralph re-reads `PROMPT.md` from the worktree's CWD on every iteration. The planning-repo copy at `ralph-prompts/pim-fastapi-conformance-regression.md` is the source of truth; edit it there and re-`cp` if you change the workstream mid-run. Per-task implementation happens in its own short-lived worktree (`/tmp/pim-T173x`) created by the `setup` phase. When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-fastapi-conf-ralph`.

## Task Queue

Tracking issue: [#437](https://github.com/jamescrowley321/py-identity-model/issues/437) (regression stage for #242 — the library is the cert target; this proves the `fastapi-identity-model` router passes the same local suite). Package: #334 / PR #434.

> **Base-branch gate:** if PR #434 is not yet merged, all branches below base off `feat/fastapi-identity-model-package` (the package only exists there) and PRs use `--base feat/fastapi-identity-model-package` (stacked; GitHub retargets to `main` when #434 merges). Once #434 is on `main`, base off `origin/main` as usual.

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| T173a | feat/fastapi-conformance-regression | Router form_post: refactor `_callback` to take explicit `callback_url`; add `POST /callback` (parse urlencoded body via stdlib `parse_qsl`, no python-multipart dep); GET+POST tests in `tests/test_rp.py` | done |
| T173b | feat/fastapi-conformance-regression | Harness `conformance/app_fastapi.py`: same runner contract as `app.py` (`/authorize`, `/callback` GET+POST, `/discover`, `/clear-cache`, per-test logs) delegating to the real `build_oidc_router` — per-test app over `httpx.ASGITransport`, `(client, cookie jar)` keyed by `state`, `aio` cache clears | done |
| T173c | feat/fastapi-conformance-regression | Wiring: `fastapi-{basic,config,form-post-basic}-rp` configs, runner `--plan` choices, `rp-fastapi` service (8889) + `Dockerfile.fastapi`, `make conformance-test-fastapi`, `conformance-fastapi` CI job (local suite only) | done |
| T173d | feat/fastapi-conformance-regression | Fix gaps the suite surfaces (found so far: §4.3 discovery issuer-mismatch check in `rp._discover`; `fetch_userinfo` router option mapped from the runner's `skip_userinfo`) until all 3 plans match the library baselines | done |

All four land on ONE branch/PR — they are a single regression stage, not independent workstreams. If the initial PR is merged and a regression later appears (e.g. a suite update or router change breaks a plan), re-open this loop with a fresh `fix/fastapi-conformance-<test>` branch per failure.

## Routing

Repo: `~/repos/auth/py-identity-model` (the loop's CWD is `ORCH_WORKTREE`).

Read `ORCH_WORKTREE/.claude/task-state.md`.

- **Does not exist** → Pick first `pending` task, create state, execute setup
- **phase is `complete`** → Update status to `done` in this file, clean up the task worktree, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order: `setup → analyze → implement → test → review → review-fix → pr → ci → complete` (no `docs` phase — conformance/README.md updates ship inside `implement`).

## New Task Setup

Create `ORCH_WORKTREE/.claude/task-state.md`:
```
task_id: T173x
branch: <branch from queue>
worktree: /tmp/pim-T173x
phase: setup
```

If all done: `<promise>LOOP_COMPLETE</promise>`

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

All work after setup happens in the task worktree — `cd /tmp/pim-T173x` first.

## Task-Specific Guidance

- **The verification is the local Docker suite, not unit tests alone.** `make conformance-up` then `make conformance-test-fastapi`. Green = Basic RP 13 pass / 1 skip (`idtoken-sig-none`), Form Post RP 13 pass / 1 skip, Config RP 5 pass / 1 skip — identical to the library baselines in `conformance/results/*-latest.json`. Anything else is a failure to analyze via the suite log URL and `docker logs conformance-rp-fastapi-1`.
- **The OIDF issuer varies per test module** (`run_tests.py` reads it from each module's creation URL) — the harness must build a per-test router; a static `OIDCSettings` cannot pass a whole plan.
- **The runner clears caches between modules** via `POST /clear-cache` — the harness must clear `py_identity_model.aio.token_validation.clear_discovery_cache/clear_jwks_cache` (both async) or key-rotation tests hang on stale JWKS.
- **`skip_userinfo` matters:** the `discovery-jwks-uri-keys` module is FINISHED once the token is issued; a trailing UserInfo call is an "Illegal test state change" FAILURE. The harness maps it to `build_oidc_router(fetch_userinfo=False)`.
- **Known monorepo SemVer gap:** the root semantic-release parses ALL conventional commits with no scope filter — a `feat`/`fix`/`perf` commit, even scoped `(fastapi)`, bumps the CORE library. Commit package + conformance work ONLY with non-releasing types (`build`/`chore`/`refactor`/`docs`/`test`/`ci`) scoped `(fastapi)`/`(conformance)`.
- **Hosted suite is out of scope.** No `HOSTED=1`, no certification exports, no publish. Local Docker suite only.

## Rules

- Execute ONE phase per iteration, then end
- NEVER commit to main — always work on feature branches in worktrees
- Conventional commits, but **non-releasing types only** (see SemVer gap above)
- Gate every commit on `make lint` and `make test-fastapi` (pyrefly 1.0.0 is the CI version: `uv run --no-sync --with pyrefly==1.0.0 pyrefly check packages/fastapi-identity-model/fastapi_identity_model/`)
- Never auto-merge PRs — the owner reviews and merges
- If stuck 3+ iterations on same phase: set task to `blocked`, clean up, move on
