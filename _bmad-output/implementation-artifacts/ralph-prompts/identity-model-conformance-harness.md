You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

> **⚠️ RECONCILED 2026-08-12 — READ FIRST. K1 (#43) and K2 (#44) are MERGED.** `conformance/` already exists on `main` (ported runner/configs/docker-compose/nginx + `rp-go/`, basic-rp green). The **next pending task is K3 (Rust RP harness)**. The Task Queue below marks K1/K2 `done`; if any copy still shows them `pending`, trust the merged PRs (#43/#44) and do NOT re-port the scaffold. Also: the JSON-vector runner (`feat/conformance-runner-jwt`, #36) already **merged** and is KEPT as the in-CI parity check (see `epics/epic-21-cross-platform-serializer.md`) — ignore any instruction below to "recommend closing it unmerged". Repo is **public** (since 2026-07-22).

## Context

Target repo: `identity-model` at `~/repos/auth/py-identity-model` (public, `jamescrowley321/identity-model`).

This loop stands up an **OpenID Foundation (OIDF) conformance / certification tier for the Go and Rust client libraries**, mirroring the OIDF-certified `py-identity-model` reference, and then brings the **integration provider matrix** to parity across both languages. It proves the already-merged Go/Rust implementations behave correctly by driving them through the **official OpenID Foundation conformance suite as Relying Parties (RPs)** — the same way py-identity-model earned its OIDF RP certification. It is a *validation and test-infrastructure* workstream, not a new-capability workstream.

### NON-NEGOTIABLE: match py-identity-model's testing infrastructure

`py-identity-model` (`~/repos/auth/py-identity-model`) is the OIDF-certified reference implementation and the **canonical source of truth for how identity-model tests are structured and what correct RP behavior is**. Before writing anything in this loop, read py-identity-model's testing infrastructure and mirror it. Specifically:

- **Conformance = the external OIDF certification suite driving a thin Relying-Party harness — NOT homegrown vectors.** py-identity-model's `conformance/` directory is a FastAPI RP harness (`app.py`) that exercises the library's public API, plus a Python orchestration runner (`run_tests.py`) that talks the OIDF suite's REST API, plus plan-config JSON, plus a Docker stack (OIDF suite + MongoDB + nginx TLS + cert-init). **This is the model to replicate for Go and Rust.**
- **The runner is language-agnostic.** `run_tests.py` drives an RP purely over `--rp-url` + the suite REST API — it does not care what language the RP is written in. So identity-model **reuses/ports py-identity-model's `run_tests.py`, its plan-config JSON, and its docker-compose suite/mongo/nginx/cert-init verbatim**, and only the **RP harness app is re-implemented per language** (Go RP + Rust RP), each on top of its own client library. This mirrors how py-identity-model already runs TWO harnesses (core `app.py` on :8888 and the `fastapi-identity-model` package harness `app_fastapi.py` on :8889) over the identical plans as a regression shield — here the two harnesses are Go-RP and Rust-RP.
- **Preserve py-identity-model's four-tier split** — unit (offline, mocked, in-process minting) / integration (live providers, capability-gated skips) / conformance (OIDF RP harness) / examples (Docker end-to-end) — and its rigor bar (coverage floor, warnings-as-errors posture where the language supports it, teardown discipline).
- **Preserve py-identity-model's integration infrastructure** — `.env.<provider>` profiles with the fixed `TEST_*` vocabulary, **discovery-driven capability detection → clean skips (never branch on a provider name)**, credentials-free local Docker fixtures with **application-level** healthchecks (probe the real discovery endpoint / imported realm, not a bare TCP port), parallel-run rate-limit safety, and the same provider set (local node-oidc-provider + Duende IdentityServer, cloud Ory + Descope; py-identity-model also ships a Keycloak fixture).
- **Behavioral ground truth is whatever py-identity-model does.** When the suite or a spec is ambiguous (e.g. what to do on `alg:none`, key rotation, a `sub` mismatch), the correct RP behavior is what py-identity-model's harness does — read its `app.py`, its per-test driving table, and its `conformance/README.md` expected-outcome table, and make the Go/Rust RP behave the same. Never weaken a security check (reject `alg:none`, verify signature, enforce issuer/aud/exp, honor the JWKS-cache-miss refresh-on-rotation path) to make a test go green.

### What this loop explicitly does NOT do

- **The cross-language JSON-vector conformance model is PARKED.** The unmerged seed branch `feat/conformance-runner-jwt` (which added `go/internal/conformance/` + executable `spec/conformance/validation.json` vectors) is **superseded by this OIDF-harness approach and must NOT be extended or merged** by this loop. Leave the existing `spec/conformance/*.json` files as the prose behavior contracts they are on `main` (they document required behavior and remain useful); do not add executable `vectors`, do not build a vector runner. Recommend to the owner (in the K1 PR body) that `feat/conformance-runner-jwt` be closed unmerged.
- **Extended-tier client behavior is out of conformance scope.** The OIDF *client* certification suite exercises the RP login flow (discovery, JWKS + key rotation, id_token validation, auth-code/PKCE, form_post, userinfo, logout) — it does **not** cover introspection / revocation / token-exchange / DPoP client behavior. Those stay validated by their existing unit + integration tests only; note the gap in K5's PR body as future work. Do not try to force Extended capabilities through the OIDF suite.

### Current implementation state (verified against merged PRs, not the drift-prone task queue)

- **Go — Core + Extended merged.** `go/pkg/{discovery,jwks,jwt,token,userinfo,introspection,revocation,dpop}`. Core (discovery, jwks, jwt-validation incl. key rotation, token auth-code+PKCE, userinfo) fully covers the RP login flow the OIDF suite drives.
- **Rust — Core only merged.** `rust/src/{discovery,jwks,jwt,token,userinfo}`. Core likewise covers the RP login flow. Rust has no Extended tier — fine, it is out of conformance scope here.
- **Reconciled 2026-08-12:** `conformance/` now **exists** on `main` (K1 #43 + K2 #44 merged) — ported runner/configs/docker-compose/nginx + `rp-go/` (basic-rp green). The greenfield port is done; the next task is **K3 (Rust RP)**. Do not re-create K1/K2.

Reference test infra: `~/repos/auth/py-identity-model/conformance/` (RP harness `app.py`, runner `run_tests.py`, `configs/*.json`, `docker-compose.yml`, `nginx/`, `README.md`), `~/repos/auth/py-identity-model/src/tests/integration/` (provider matrix, capability detection), and its `Makefile` + `.github/workflows/{ci.yml,conformance.yml,conformance-hosted.yml}`.

## Running

**DO NOT launch this loop while any other identity-model loop is running — one ralph workstream per repo at a time.** (The Rust hardening loop `identity-model-rust-hardening.md` and this loop both touch `rust/`; run them sequentially, never concurrently.)

Run the loop from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/py-identity-model` — the owner works in that checkout by hand, so the loop must stay isolated from it. `PROMPT.md` and `.claude/task-state.md` live in the orchestrator worktree for the whole run. Note `/tmp` is wiped on reboot: if the worktree vanishes mid-run, `git worktree prune` then recreate with the recipe below and re-mark completed tasks `done` in the fresh `PROMPT.md` before resuming.

```bash
# One-time: create the orchestrator worktree off main.
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/im-conf-orch -b ralph/conformance-harness origin/main

# Run the loop from inside that worktree, idle-timeout 0 so long docker/go/cargo
# builds and OIDF-suite spin-ups aren't SIGTERM'd during quiet phases.
cd /tmp/im-conf-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/identity-model-conformance-harness.md PROMPT.md
ralph run --idle-timeout 0
```

`ORCH_WORKTREE` = `/tmp/im-conf-orch`. The prompt must remain copied in as `PROMPT.md` for the whole run (ralph re-reads it from CWD each iteration); the planning-repo copy is the source of truth — edit it there and re-`cp` if you change the workstream mid-run. Per-task implementation happens in its own `/tmp/im-conf-KX` worktree (created by `setup`) off the task's base branch. When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/im-conf-orch`.

## CRITICAL: No Auto-Merge

**DO NOT merge any PR.** The owner manually reviews and merges every PR this loop creates. The `complete` phase must NOT call `gh pr merge` — no `--auto`, no merge queue. Only mark the task done, clean up, and move on.

## Dependency Model — Base-Branch Chaining

Each task builds on the previous one's files (the shared `conformance/` scaffold, then the Go RP, then the Rust RP, then more plans, then CI, then integration), so each task branches off the **previous task's branch** and opens its PR with `--base <previous_branch>`. This produces a clean, conflict-free stack the owner merges bottom-up. K1 bases off `main`. Per the Step 3 rule, once a base branch has been merged to `main`, later tasks MAY base off `main` instead — this self-corrects as the owner lands the stack.

## Task Queue

| Task | Branch | Base branch | Description | Status |
|------|--------|-------------|-------------|--------|
| K1 | feat/conformance-harness-scaffold | main | **Port the language-neutral harness.** Create `conformance/` in identity-model by porting py-identity-model's `conformance/`: the runner (`run_tests.py` — suite REST client: create-plan/create-module/poll-until-done/download-export; the per-test-name driving table; the strict `PASSING_STATUSES` gate where empty-run and REVIEW are NOT passing; hosted-vs-local export gating), the plan-config JSON (`configs/*.json` — basic-rp, config-rp, form-post-basic-rp with `plan_name` + `variant` + client), the `docker-compose.yml` (OIDF suite + mongodb + nginx TLS + cert-init shared-cert volume), `nginx/`, and `README.md`. No RP app yet — verify the suite stack comes up and the runner can create a plan. | done — MERGED (PR #43) |
| K2 | feat/conformance-rp-go | feat/conformance-harness-scaffold | **Go RP harness.** `conformance/rp-go/` (stdlib `net/http`) driving `go/pkg` client lib: endpoints `/health`, `/clear-cache`, `/discover`, `/register`, `/authorize`, `/callback` (GET + form_post), `/userinfo`, `/logout`, `/results/{id}`; in-memory session map; per-test `ACCEPTED`/`REJECTED` evidence logging routed per active test (context-scoped log routing, path-sanitized) into `<log-dir>/<profile>/<test>.log`. Trust the suite's self-signed cert. Get `oidcc-client-basic-certification-test-plan` green locally against the Docker suite via the runner (`--rp-url` → Go RP). | done — MERGED (PR #44) |
| K3 | feat/conformance-rp-rust | feat/conformance-rp-go | **Rust RP harness.** `conformance/rp-rust/` (idiomatic async web stack, e.g. `axum`, as a harness binary — NOT a library dep) driving the `rust` client lib with the identical endpoint contract + per-test evidence logging + self-signed-cert trust. Basic-rp green locally against the suite via the same runner. Both harnesses now run the identical plan as a two-language regression shield. | pending |
| K4 | feat/conformance-plans-config-formpost | feat/conformance-rp-rust | **Config + form-post plans.** Get `oidcc-client-config-certification-test-plan` and `oidcc-client-formpost-basic-certification-test-plan` green for BOTH Go and Rust harnesses: handle `form_post` response_mode, the static-client and (where the RP supports it) dynamic-registration variants, and the signing-key-rotation test (must exercise the real JWKS cache-miss refresh path — do NOT bypass it). Note any known-flaky/timeout test the way py-identity-model does (config-rp key-rotation). | pending |
| K5 | ci/conformance-workflow | feat/conformance-plans-config-formpost | **CI + hosted evidence.** Add `.github/workflows/conformance.yml` mirroring py-identity-model's: jobs `conformance-go` and `conformance-rust`, each `docker compose up --build --wait` (suite + RP) → application-level readiness poll of suite + RP → run the three plans → upload HTML export + docker logs + rp-logs artifacts `if: always()` → `docker compose down -v`. Add `.github/workflows/conformance-hosted.yml` (workflow_dispatch, `publish` input) that runs each RP against `https://www.certification.openid.net/` with a `CONFORMANCE_TOKEN` secret and produces `*-export.zip` + `*-rp-logs.zip` evidence. Reconcile the existing `conformance` aggregation job in `ci.yml` (rename/repoint so it no longer implies a vector runner). PR body: note Extended-tier client behavior is not OIDF-covered (future work) and recommend closing `feat/conformance-runner-jwt` unmerged. | pending |
| K6 | test/integration-matrix-parity | ci/conformance-workflow | **Integration matrix + py-identity-model infra parity.** Match py-identity-model's integration infra and run the matrix green: adopt discovery-driven capability detection → clean `skip`s (RFC 8414 grant/endpoint/feature flags; never branch on provider name) in Go + Rust integration; keep the `TEST_*` env-profile contract with fail-fast required-var validation; ensure local fixtures gate readiness at the application level. **Bring Rust integration to provider parity with Go** — today `rust-integration` runs node-oidc only; add IdentityServer and the secret-gated cloud profiles (Ory, Descope), mirroring the Go jobs and Makefile targets. Run Go + Rust integration across node-oidc / IdentityServer / Ory / Descope and fix every failure. Gate Descope grant tests on the token endpoint's actual response, not discovery (Descope over-advertises grants its endpoint rejects with E011003). | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for workspace commands and git conventions.
2. Read `~/repos/auth/py-identity-model/CONTRIBUTING.md` for repo workflow (branching, conventional commits, the monorepo CI path-filter table) and `~/repos/auth/py-identity-model/README.md` + `Makefile` for the current test targets and layout.
3. **Read the py-identity-model reference for the current task** (`~/repos/auth/py-identity-model/conformance/` for K1–K5; `src/tests/integration/` + its `Makefile`/`ci.yml` for K6) and mirror it. This is the source of truth — see the Context mandate. Restated per-phase in `analyze` below.

## Step 2: Determine What To Do

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/im-conf-orch/.claude/task-state.md`).

- **Does not exist** → Pick up next task (Step 3).
- **phase is `complete`** → Mark the task `done` in the queue in THIS file, clean up the worktree, delete task-state.md, pick up next task (Step 3).
- **Any other phase** → Execute that one phase (Step 4).

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue.

- If none remain → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Determine the base branch from the queue's "Base branch" column. If that base branch's PR has already been merged to `main`, you MAY base off `main` instead (cleaner). Otherwise base off the branch as listed.
  2. Create `ORCH_WORKTREE/.claude/task-state.md` (`/tmp/im-conf-orch/.claude/task-state.md`):
     ```
     task_id: KX
     repo: identity-model
     branch: <branch from queue>
     base_branch: <base branch from queue>
     worktree: /tmp/im-conf-KX
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

**setup** — Follow `phases/setup.md`. Repo root `~/repos/auth/py-identity-model`. Create the worktree off `base_branch`: `git worktree add -b <branch> <worktree> <base_branch>` (fetch first). Work happens in `<worktree>/conformance` (K1–K5), `<worktree>/go` + `<worktree>/rust` (K2/K3/K6), `<worktree>/.github` (K5), and `<worktree>/infra` + repo-root `.env.*`/`Makefile` (K6).

**analyze** — Follow `phases/analyze.md`, plus:
1. **Read the py-identity-model reference for this task FIRST and plan to mirror it.** K1: `py-identity-model/conformance/{run_tests.py,configs/*.json,docker-compose.yml,nginx/,README.md}` — understand the `ConformanceSuiteClient` REST calls (create-plan with the `variant` as a single JSON-encoded query param; poll-until-`FINISHED`/`INTERRUPTED`; export download), the per-test driving table (`DISCOVERY_ONLY_TESTS`, `DOUBLE_FLOW_TESTS` for key rotation, else full auth flow), the `PASSING_STATUSES = {PASSED, WARNING, SKIPPED}` gate, and the hosted-only signed-export gating. K2/K3: `conformance/app.py` — the endpoint contract, the in-memory `sessions` map, the `ACCEPTED`/`REJECTED` decision lines, the per-test `ContextVar` + custom log handler + path sanitization, and the **load-bearing rule that the harness must NOT bypass the library's JWKS cache-miss retry** (the key-rotation tests exist to exercise it). K6: `src/tests/integration/{conftest.py,test_utils.py,provider_matrix.py}` — the `--env-file` mechanism, `_REQUIRED_ENV_VARS`, `_detect_grant_capabilities`/`_detect_feature_capabilities`, the file-locked cross-worker caches, and the app-level fixture healthchecks.
2. Read the current-task language implementation the RP will drive (`go/pkg/{discovery,jwks,jwt,token,userinfo}` for K2; `rust/src/{...}` for K3) — note the public API for discovery, building the authorize URL, code exchange, id_token validation (with clock skew + nonce), forced JWKS refresh on kid-miss, and userinfo.
3. Read the OIDF plan/variant details from py-identity-model's `configs/*.json` and reuse the **exact `plan_name` + `variant`** — do NOT invent plan names. (The OIDF plan taxonomy has traps: some `*-certification-test-plan` names are OP tests, not RP tests; mirror only the plans py-identity-model actually uses for RP certification.)
4. Plan must list: exact files to create/modify, the RP endpoint/route surface (K2/K3), which OIDF plans+variants (K4), the CI job/workflow shape (K5), and the exact providers/skip-gates/Make targets (K6).

**implement** — Follow `phases/implement.md`, plus:
- **Port, don't reinvent (K1).** Bring py-identity-model's runner + configs + docker-compose across faithfully; adapt only what's identity-model-specific (paths, RP URLs/ports, artifact dirs). Keep the same argparse surface (`--plan` choices, `--suite-url`, `--rp-url`, `--output`, `--export-zip`, `--publish`). The runner stays Python (it is language-neutral orchestration and matching py-identity-model is the mandate) unless a compelling reason emerges — if so, raise it in review, don't silently rewrite it.
- **Go RP (K2):** idiomatic stdlib `net/http`; drive ONLY the public `go/pkg` API (no reaching into internals); configure the HTTP client to trust the suite's self-signed cert (custom `x509` cert pool / `SSL_CERT_FILE`). `cd <worktree>/go && go build ./... && go vet ./... && gofmt -l . && golangci-lint run` clean before commit. If the RP needs a module of its own, keep it under `conformance/rp-go/` with its own `go.mod` or as a `go/cmd/` binary — match whatever keeps the existing `go` CI job clean.
- **Rust RP (K3):** idiomatic async (`axum`/`tokio`) as a **harness binary/dev artifact**, not a dependency of the shipped `identity-model` crate — keep the library's dependency tree and MSRV unchanged; trust the self-signed cert via `reqwest`/`rustls` custom root. `cd <worktree>/rust && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test` clean for the library; the RP harness must not break the `rust` unit job.
- Never `git add .` — add specific files. Conventional commits: `feat(conformance):` for the harness/runner/configs, `feat(go):`/`feat(rust):` for RP apps, `ci:` for workflows, `test(go):`/`test(rust):`/`fix(...)` for integration + fixes.

**test** — Follow `phases/test.md`, plus:
- **Conformance is Docker-driven and slow** — it does NOT run under the unit `go`/`rust` jobs. Verify locally: bring up the suite stack (`docker compose -f conformance/docker-compose.yml up -d --build --wait`), start the RP, run `python conformance/run_tests.py --plan <plan> --rp-url <url>`, and require the runner's strict gate to pass (empty run / REVIEW = fail). Tear the stack down after. Port py-identity-model's harness self-tests (`conformance/tests/` — parser, escaping, per-test log routing) as ordinary Go/Rust unit tests of the harness's pure helpers so the harness logic is covered without Docker.
- **Integration (K6):** Go behind `//go:build integration`; Rust `#[ignore]`-gated in `rust/tests/`. Read provider config from the `TEST_*` env per the `.env.node-oidc`/`.env.identityserver`/`.env.ory`/`.env.descope` profiles the Makefile sources; **skip cleanly** (not fail) when a provider lacks a capability or a required credential is unset — driven by discovery capability detection, never a provider name. `make infra-up` → relevant `make test-integration-*` → `make infra-down`; `make test-integration-local` for the full local matrix.
- All unit AND integration tests must pass before the `pr` phase, and the targeted OIDF plan(s) must be green locally for both harnesses before their PR. Never rationalize a red test or a non-passing conformance status as pre-existing, environmental, or out-of-scope — fix the RP/implementation, or (for a genuine known suite flake like config-rp key-rotation) handle it exactly as py-identity-model does and document it.

**review** — Follow `phases/review.md`. Reviewers: **Blind Hunter + Edge Case Hunter + Acceptance Auditor** (templates in `ralph-prompts/review-agents/`). The Acceptance Auditor MUST verify: the harness/runner faithfully mirrors py-identity-model (endpoint contract, driving table, PASSING_STATUSES gate, per-test evidence logging), no security check is weakened to pass a test (reject `alg:none`, verify signature, enforce iss/aud/exp/nonce, honor JWKS refresh-on-rotation), and the RP drives only the library's public API.

**review-fix** — Follow `phases/review-fix.md`. No overrides.

**pr** — Follow `phases/pr.md`, plus:
- Repo `jamescrowley321/identity-model`. **Open with `--base <base_branch>`** (the chained parent, not main, unless the parent is already merged).
- Title per task: `feat(conformance): OIDF suite runner + docker stack` / `feat(go): OIDF RP conformance harness` / `feat(rust): OIDF RP conformance harness` / `feat(conformance): config + form-post RP plans` / `ci: OIDF conformance workflows` / `test: integration provider matrix parity`. Body lists the OIDF plans exercised and their statuses, the py-identity-model files mirrored, the review summary, and (K5) the Extended-tier coverage-gap note + the recommendation to close `feat/conformance-runner-jwt` unmerged.
- **No auto-merge flags.**

**ci** — Follow `phases/ci.md`. Repo `jamescrowley321/identity-model`. Max 3 CI fix attempts. Existing gates: **`go`** (build/vet/test/golangci-lint), **`go-integration`** (node-oidc + IdentityServer), **`go-integration-ory`** / **`go-integration-descope`** (pass trivially without secrets), **`rust`** (fmt/clippy/test), **`rust-integration`**, and the **`conformance`** aggregation gate. K5 adds the `conformance-go`/`conformance-rust` Docker jobs. The `changes` paths-filter triggers jobs by directory — new `conformance/` paths need their own filter entry (add it in K5). CI runs on every PR regardless of base branch. If a lint/toolchain error fires only in CI, install the CI toolchain locally to reproduce rather than guessing.

**complete** — **OVERRIDE: do NOT merge the PR.**
1. Mark the task `done` in the queue in THIS file.
2. `cd ~/repos/auth/py-identity-model && git worktree remove <worktree> --force`
3. Delete `.claude/task-state.md`.
4. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — fresh context prevents drift.
- NEVER commit to `main`; always feature branches in worktrees. All work after setup happens in the task worktree.
- **Match py-identity-model.** Its `conformance/` (OIDF suite + RP harness + runner) and its integration infra ARE the reference. Port the language-neutral runner/configs/docker stack; re-implement only the RP app per language. Never diverge behavior to paper over a Go/Rust quirk — fix the implementation.
- **Do NOT extend or merge the parked JSON-vector seed** (`feat/conformance-runner-jwt` / `go/internal/conformance/` / executable `spec/conformance/*.json` vectors). Leave `spec/` prose contracts as-is.
- The RP harness drives only each library's **public API**, must **reject** bad input with logged `REJECTED` evidence (negative tests prove rejection), and must **not** bypass the JWKS cache-miss refresh path (key-rotation tests depend on it). Trust the suite's self-signed cert.
- The runner's pass gate is strict: `PASSING_STATUSES = {PASSED, WARNING, SKIPPED}`; an empty run or a `REVIEW` status is NOT passing.
- Go: `go build ./... && go vet ./... && gofmt -l . && golangci-lint run` before commit, `go test ./...` before push. Rust: `cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test` before commit/push. No `--no-verify`. The RP harnesses must not break the unit `go`/`rust` jobs.
- Integration must be green before `pr` for K6; the targeted OIDF plan(s) green for both harnesses before their PR.
- Conventional commits (`feat(conformance):` / `feat(go):` / `feat(rust):` / `ci:` / `test(...)` / `fix(...)`).
- If stuck 3+ iterations on the same phase: set the task to `blocked`, clean up the worktree, delete task-state.md, move on. (The OIDF suite + self-signed TLS + auth-flow driving is the most likely place to block — capture the failing test log and block rather than weakening security.)
- **One workstream per repo: this loop must not run concurrently with any other identity-model loop (e.g. rust-hardening).**
- **NEVER merge PRs — the owner reviews and merges manually.**
