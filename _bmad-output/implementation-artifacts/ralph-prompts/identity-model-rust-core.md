You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `identity-model` at `~/repos/auth/identity-model` (private, `jamescrowley321/identity-model`).

This loop implements the **Rust Core Tier** (Epic 4, stories 4.2–4.6) of the multi-language identity-model OIDC/OAuth2 client library. Story 4.1 (scaffolding) already shipped, and the **Go core tier (Epic 3) is merged to `main`** — every capability you implement has a working Go twin under `go/pkg/` to consult for semantics, edge cases, and test coverage. Each story fills in a scaffolded module under `rust/src/`, validated against the cross-language conformance spec in `spec/` and the local provider matrix in `infra/`.

Epic source of truth: `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-4-core-rust.md`
Cross-language contract: `spec/capabilities.md` + `spec/conformance/*.json` (all six capability files exist — authored during the Go tier; extend fixtures only where Rust surfaces a gap).

**Toolchain override:** the epic's tech table says MSRV 1.75 — it is stale. Follow the scaffold: edition 2024, MSRV per `rust/Cargo.toml` (1.91), latest stable toolchain. Deps per the epic otherwise: `reqwest` (rustls), `jsonwebtoken`, `tokio`, `thiserror`, `serde`/`serde_json`.

**Owner learning carve-out:** PKCE (identity-model issue #12) is reserved for the owner as a hand-written learning task. When R4.5 starts: if a PKCE module exists (`rust/src/token/pkce.rs` or `rust/src/pkce.rs`), USE it — review it against `spec/conformance/authorization-code.json`, add only missing tests, and do not rewrite it. Only if it is absent, implement it as part of the story. Never pick up issues labeled `learning`.

## Running

Run the loop from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/identity-model` — the owner works in that checkout by hand, so the loop must stay isolated from it. `PROMPT.md` and `.claude/task-state.md` live in the orchestrator worktree for the whole run.

```bash
# One-time: create the orchestrator worktree off main (everything is merged).
cd ~/repos/auth/identity-model
git fetch origin
git worktree add /tmp/im-rust-orch -b ralph/rust-core origin/main

# Run the loop from inside that worktree
cd /tmp/im-rust-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/identity-model-rust-core.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/im-rust-orch`. The prompt must remain copied in as `PROMPT.md` for the whole run (ralph re-reads it from CWD each iteration); the planning-repo copy is the source of truth. The orchestrator worktree only hosts the loop — per-task implementation happens in its own `/tmp/im-rust-4X` worktree (created by `setup`) off the task's base branch. When the loop finishes, remove it: `cd ~/repos/auth/identity-model && git worktree remove /tmp/im-rust-orch`.

## CRITICAL: No Auto-Merge

**DO NOT merge any PR.** The owner reviews every PR this loop creates and directs merges himself. The `complete` phase must NOT call `gh pr merge` — no `--auto`, no merge queue. Only mark the task done, clean up, and move on.

## Dependency Model — Base-Branch Chaining

The Rust modules build on each other (jwt needs jwks; token/userinfo need discovery types). Because PRs are NOT auto-merged, each task branches off the **previous task's branch**, not `main`, and opens its PR with `--base <previous_branch>`. This produces a clean reviewable stack the owner merges bottom-up. The first task (R4.2) bases off `main`. Per the Step 3 rule, once a base branch has been merged to `main`, later tasks MAY base off `main` instead — the stack self-heals as the owner merges.

## Task Queue

| Task | Story | Branch | Base branch | Description | Status |
|------|-------|--------|-------------|-------------|--------|
| R4.2 | 4.2 | feat/rust-discovery | main | OIDC Discovery client — `src/discovery`: async fetch + validate + TTL cache; wires the Rust integration harness (see below) | pending |
| R4.3 | 4.3 | feat/rust-jwks | feat/rust-discovery | JWKS client + key resolution — `src/jwks`: fetch, cache, resolve by kid, force refresh | pending |
| R4.4 | 4.4 | feat/rust-jwt | feat/rust-jwks | JWT validation — `src/jwt`: signature + claims, alg=none reject, nonce, clock skew | pending |
| R4.5 | 4.5 | feat/rust-token | feat/rust-jwt | Client credentials + auth code + PKCE — `src/token` (PKCE: use owner module if present, see carve-out) | pending |
| R4.6 | 4.6 | feat/rust-userinfo | feat/rust-token | UserInfo endpoint — `src/userinfo`: fetch claims + sub consistency; extends cloud CI jobs to Rust | pending |

## Integration Test Convention (Rust)

The Go tier established a four-provider matrix; Rust plugs into the same harness:

- Integration tests live in `rust/tests/<capability>_integration.rs`, marked `#[ignore = "integration: requires a live provider"]` so the CI `rust` job's plain `cargo test` stays offline. Run them with `cargo test -- --ignored` (or `--include-ignored`).
- Provider selection reads the same `TEST_*` env convention as `go/internal/integrationtest` (`TEST_DISCO_ADDRESS`, `TEST_CLIENT_ID`, `TEST_CLIENT_SECRET`, `TEST_SCOPE`, `TEST_PKCE_PUBLIC_CLIENT_ID`, `TEST_REDIRECT_URI`; no env → node-oidc defaults on `http://localhost:9000`). R4.2 implements this once as `rust/tests/common/mod.rs` — port the semantics from the Go helper, including per-field skip behavior when `TEST_DISCO_ADDRESS` is set.
- **R4.2 wires the harness**: Makefile targets `test-integration-rust-node-oidc` / `test-integration-rust-identityserver` (mirroring the Go targets, sourcing the same repo-root `.env.*` profiles), fold them into `test-integration-local`, and add a `rust-integration` CI job mirroring `go-integration` (compose up → both local profiles → logs on failure → teardown), included in the `conformance` gate's needs/result checks.
- **R4.6 extends the cloud jobs**: make `test-integration-ory` / `test-integration-descope` run the Rust suite alongside Go (keep `-p 1`-equivalent serialization: run the two languages sequentially, and prefer `--test-threads=1` for cloud runs to respect rate limits).
- Provider variance already mapped by the Go tier — encode the same tolerances, do not fight them: Descope rejects bad credentials with a non-RFC 6749 error body (typed HTTP/request error, not the OAuth error variant) and omits `WWW-Authenticate` on userinfo 401; IdentityServer declines `openid` scope for client_credentials (skip, don't fail); local fixtures are plain HTTP (issuer prefix `http://` → allow-HTTP path).

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for workspace commands and git conventions.
2. Read `~/repos/auth/identity-model/CONTRIBUTING.md` for repo workflow (branching, conventional commits, conformance loop).
3. Read `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-4-core-rust.md` for the story acceptance criteria.

## Step 2: Determine What To Do

Read `ORCH_WORKTREE/.claude/task-state.md`.

- **Does not exist** → Pick up next task (Step 3).
- **phase is `complete`** → Mark the task `done` in the queue in THIS file, clean up the worktree, delete task-state.md, pick up next task (Step 3).
- **Any other phase** → Execute that one phase (Step 4).

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue.

- If none remain → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Determine the base branch from the queue's "Base branch" column. If that base branch's PR has already been merged to `main`, you MAY base off `main` instead (cleaner). Otherwise base off the branch as listed.
  2. Create `ORCH_WORKTREE/.claude/task-state.md`:
     ```
     task_id: R4.X
     story: 4.X
     repo: identity-model
     branch: <branch from queue>
     base_branch: <base branch from queue>
     worktree: /tmp/im-rust-4X
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

**setup** — Follow `phases/setup.md`. Repo root `~/repos/auth/identity-model`. Create the worktree off `base_branch`: `git fetch origin && git worktree add -b <branch> <worktree> <base_branch>`. All Rust work happens in `<worktree>/rust`.

**analyze** — Follow `phases/analyze.md`, plus:
1. Read the matching story section in `epic-4-core-rust.md` — every acceptance-criteria checkbox is a requirement (modulo the toolchain override above).
2. Read the conformance definitions for this capability in `<worktree>/spec/conformance/*.json` and the fixtures in `<worktree>/spec/test-fixtures/`.
3. Read the Go twin package under `<worktree>/go/pkg/<capability>/` — match its behavior and edge-case coverage, expressed idiomatically in Rust (builders instead of functional options, `Result<T, IdentityError>` instead of error returns). Also read the module's existing `rust/src/<capability>/mod.rs` scaffold and `src/error.rs`.
4. Plan must list: exact files to create/modify, the public API surface (types, builder methods), unit test cases (map each to ACs + conformance IDs), and the `#[ignore]` integration tests against the local providers.

**implement** — Follow `phases/implement.md`, plus:
- Idiomatic Rust: async via tokio, `reqwest` with rustls, `thiserror` variants on the existing `IdentityError`, builder-pattern config, `tokio::sync::RwLock` for caches, no `unwrap()`/`expect()` outside tests.
- Add deps with `cargo add` inside `rust/`; commit `Cargo.toml` + `Cargo.lock`.
- `cd <worktree>/rust && cargo build && cargo clippy --all-targets -- -D warnings && cargo fmt --check` clean before every commit. Never `git add .` — add specific files.
- Conventional commits: `feat(rust): <description>`.

**test** — Follow `phases/test.md`, plus:
- Unit tests under `#[cfg(test)]` cover every AC and reference the conformance IDs (e.g. `// DISC-003`). Use the shared fixtures in `spec/test-fixtures/` (load via relative path) and RFC 7636 Appendix B vectors for PKCE.
- Integration tests per the convention above; bring up `infra/` (`make infra-up` from the worktree root) and run both local profiles via the Make targets.
- `cargo test` (unit) must pass before pushing.

**review** — Follow `phases/review.md`. Reviewers: **Blind Hunter + Edge Case Hunter + Acceptance Auditor** (templates in `ralph-prompts/review-agents/`). Acceptance Auditor must verify every story AC and conformance ID is covered, and cross-check behavior parity against the Go twin.

**review-fix** — Follow `phases/review-fix.md`. No overrides.

**pr** — Follow `phases/pr.md`, plus:
- Repo `jamescrowley321/identity-model`. **Open with `--base <base_branch>`** (the chained parent, not main, unless the parent is already merged).
- Title: `feat(rust): <description>`. Body lists the story, ACs covered, conformance IDs, review summary, and the local verification results (see `ci` note).
- **No auto-merge flags.**

**ci** — Follow `phases/ci.md`, plus this repo-specific reality: **CI only triggers on PRs whose base is `main`** — a chained PR gets no checks until the owner retargets it during bottom-up merge. So for chained PRs, the `ci` phase means running the full local gate yourself and recording it in the PR body: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, plus both local integration profiles (`make test-integration-rust-node-oidc test-integration-rust-identityserver` with the stack up). If the PR's base IS `main` (first task, or a self-healed base), watch real CI instead: the `rust` job (+ `rust-integration` once R4.2 lands) and the `conformance` gate must pass; max 3 CI fix attempts.

**complete** — **OVERRIDE: do NOT merge the PR.**
1. Mark the task `done` in the queue in THIS file.
2. `cd ~/repos/auth/identity-model && git worktree remove <worktree> --force`
3. Delete `ORCH_WORKTREE/.claude/task-state.md`.
4. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — fresh context prevents drift.
- NEVER commit to `main`; always feature branches in worktrees. (A local `pre-push` hook enforces this.)
- All work after setup happens in the worktree.
- Follow the conformance spec in `spec/` — implementation must satisfy the conformance IDs, not just compile. Behavior parity with the Go tier is the bar; deviations need a comment citing the RFC.
- Conventional commits (`feat(rust):` / `test(rust):` / `fix(rust):`).
- Run `cargo build && cargo clippy --all-targets -- -D warnings && cargo fmt --check` before committing, `cargo test` before pushing.
- Never pick up issues labeled `learning` — those are the owner's (e.g. #12 PKCE, #13 examples). Respect the R4.5 carve-out.
- If stuck 3+ iterations on the same phase: set task to `blocked`, clean up the worktree, delete task-state.md, move on.
- **NEVER merge PRs — the owner directs all merges.**
