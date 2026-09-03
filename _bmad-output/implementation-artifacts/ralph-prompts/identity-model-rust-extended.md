You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `identity-model` at `~/repos/auth/py-identity-model` (`jamescrowley321/identity-model`).

This loop builds the **Rust Extended Tier** — Epic 5 stories 5.1–5.4 in their Rust decomposition (5.1-rust … 5.4-rust): Token Introspection (RFC 7662), Token Revocation (RFC 7009), Token Exchange (RFC 8693), and DPoP (RFC 9449). It brings Rust to **parity with the already-shipped Go Extended tier** — the biggest open capability gap in the repo. The Go Extended tier is the reference implementation: mirror each Go counterpart's conformance IDs, provider quirks, and public-API intent, in idiomatic async Rust.

**DO NOT launch this loop while any other identity-model loop is running — one ralph workstream per repo at a time.** (This loop and the conformance-harness / rust-hardening loops all touch `rust/`; run them sequentially, never concurrently.) Wait for the other loop's LOOP_COMPLETE.

### Current implementation state (verified against merged PRs, not the drift-prone task queue)

- **Rust — Core only merged.** `rust/src/{discovery,jwks,jwt,token,userinfo}` are implemented and green on `main`, plus `rust/src/error.rs` (`IdentityError`), `rust/src/http.rs`, `rust/src/lib.rs`. **`rust/src/token` has client-credentials + auth-code + PKCE only** — no RFC 8693 exchange. There is **no** `rust/src/introspection`, `rust/src/revocation`, or `rust/src/dpop` — this loop creates them.
- **Go — Core + Extended merged (the reference).** `go/pkg/{discovery,jwks,jwt,token,userinfo,introspection,revocation,dpop}`. The Extended packages `go/pkg/{introspection,revocation,dpop}` + the RFC 8693 exchange grant inside `go/pkg/token` (PRs #25/#26/#27/#28) are the behavior each Rust capability mirrors.
- **The four extended conformance files already exist** — `spec/conformance/{introspection,revocation,token-exchange,dpop}.json` are on `main` as the cross-language **PROSE behavior contracts**. **Do NOT author new conformance JSON.** Your job is to make Rust satisfy the existing IDs, exactly as the Go implementation does.

### Verified toolchain facts (do NOT let the loop re-derive these wrong)

- **Toolchain: `edition = "2024"`, MSRV `rust-version = "1.96"`** (both already pinned in `rust/Cargo.toml`). **Do NOT downgrade MSRV or edition.**
- HTTP: `reqwest` 0.12 **rustls-only** (`default-features = false`, features `rustls-tls`, `json`) — never default openssl. Runtime `tokio`. Errors `thiserror` 2 (`IdentityError`). Models `serde`/`serde_json`. JWT/JOSE via `jsonwebtoken` 11 with the `rust_crypto` backend (pure-Rust: rsa/p256/p384/sha2 — no C toolchain). `base64`, `sha2`, `getrandom` are already regular deps; `wiremock`, `p256`, `rsa`, `url` are already dev-deps.
- Add any new deps with `cargo add`, and commit **`Cargo.toml` AND `Cargo.lock`** (CI caching keys on the Rust workspace). Never `git add .` — add specific files.

Epic source of truth: `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-5-extended-tier.md` (implementation ACs; read the matching story's Rust decomposition).
Cross-language contract: `spec/capabilities.md` + the **existing** `spec/conformance/*.json` (read from the per-task worktree — see below).

As each capability's conformance passes, flip its **Rust** column from `planned` → `implemented` in `<worktree>/spec/capabilities.md` (the four Extended rows currently read `planned` for Rust and `implemented` for Go).

## Running

Run the loop from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/py-identity-model` — the owner works in that checkout by hand, so the loop must stay isolated from it. `PROMPT.md` and `.claude/task-state.md` live in the orchestrator worktree for the whole run. Note `/tmp` is wiped on reboot: if the worktree vanishes mid-run, `git worktree prune` then recreate with the recipe below and re-mark completed tasks `done` in the fresh `PROMPT.md` before resuming.

```bash
# One-time: create the orchestrator worktree off main.
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/im-rustext-orch -b ralph/rust-extended origin/main

# Run the loop from inside that worktree
cd /tmp/im-rustext-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/identity-model-rust-extended.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/im-rustext-orch`. The prompt must remain copied in as `PROMPT.md` for the whole run (ralph re-reads it from CWD each iteration); the planning-repo copy is the source of truth — edit it there and re-`cp` if you change the workstream mid-run. Per-task implementation happens in its own `/tmp/im-rustext-5X` worktree (created by `setup`) off the task's base branch. When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/im-rustext-orch`.

## CRITICAL: No Auto-Merge

**DO NOT merge any PR.** The owner manually reviews and merges every PR this loop creates. The `complete` phase must NOT call `gh pr merge` — no `--auto`, no merge queue. Only mark the task done, clean up, and move on.

## Dependency Model — Base-Branch Chaining

The four capabilities are functionally independent, but every task edits shared files (`spec/capabilities.md`, and `rust/Cargo.toml`/`Cargo.lock`), so each task branches off the **previous task's branch** and opens its PR with `--base <previous_branch>`. This produces a clean, conflict-free stack the owner merges bottom-up. RE5.1 bases off `main`. Per the Step 3 rule, once a base branch has been merged to `main`, later tasks MAY base off `main` instead — this self-corrects as the owner lands the stack.

## Task Queue

| Task | Story | Branch | Base branch | Description | Status |
|------|-------|--------|-------------|-------------|--------|
| RE5.1 | 5.1-rust | feat/rust-introspection | main | Token Introspection (RFC 7662) — new `rust/src/introspection`: POST `application/x-www-form-urlencoded` + client auth (`client_secret_basic` default / `client_secret_post`), typed response with only `active` guaranteed + overflow map for extra fields, endpoint from discovery `introspection_endpoint`. Mirror `go/pkg/introspection`. Satisfy `spec/conformance/introspection.json` IDs. | pending |
| RE5.2 | 5.2-rust | feat/rust-revocation | feat/rust-introspection | Token Revocation (RFC 7009) — new `rust/src/revocation`: POST + client auth, 200-on-any-2xx (unknown/already-invalid token = success), typed OAuth error on non-2xx failure, endpoint from discovery `revocation_endpoint`. Mirror `go/pkg/revocation`. Satisfy `spec/conformance/revocation.json` IDs. | pending |
| RE5.3 | 5.3-rust | feat/rust-token-exchange | feat/rust-revocation | Token Exchange (RFC 8693) — extend `rust/src/token`: `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, subject/actor tokens + token-type URIs, `issued_token_type` enforced on the response. Mirror the exchange path in `go/pkg/token`. Satisfy `spec/conformance/token-exchange.json` IDs. | pending |
| RE5.4 | 5.4-rust | feat/rust-dpop | feat/rust-token-exchange | DPoP (RFC 9449) — new `rust/src/dpop`: ES256/RS256 keypair gen, proof JWT (`typ=dpop+jwt`, `jti`/`htm`/`htu`/`iat`, `ath` for resource access, `use_dpop_nonce` challenge retry), RFC 7638 JWK thumbprint, and a `reqwest` middleware/wrapper for the nonce retry. Mirror `go/pkg/dpop`. Satisfy `spec/conformance/dpop.json` IDs. | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for workspace commands and git conventions.
2. Read `~/repos/auth/py-identity-model/CONTRIBUTING.md` for repo workflow (branching, conventional commits, the monorepo CI path-filter table, conformance loop).
3. Read the matching story's Rust decomposition in `epic-5-extended-tier.md` (RE5.1→5.1-rust, RE5.2→5.2-rust, RE5.3→5.3-rust, RE5.4→5.4-rust) — every acceptance-criteria checkbox is a requirement.

## Step 2: Determine What To Do

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/im-rustext-orch/.claude/task-state.md`).

- **Does not exist** → Pick up next task (Step 3).
- **phase is `complete`** → Mark the task `done` in the queue in THIS file, clean up the worktree, delete task-state.md, pick up next task (Step 3).
- **Any other phase** → Execute that one phase (Step 4).

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue.

- If none remain → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Determine the base branch from the queue's "Base branch" column. If that base branch's PR has already been merged to `main`, you MAY base off `main` instead (cleaner). Otherwise base off the branch as listed.
  2. Create `ORCH_WORKTREE/.claude/task-state.md` (`/tmp/im-rustext-orch/.claude/task-state.md`):
     ```
     task_id: RE5.X
     story: 5.X-rust
     repo: identity-model
     branch: <branch from queue>
     base_branch: <base branch from queue>
     worktree: /tmp/im-rustext-5X
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

**setup** — Follow `phases/setup.md`. Repo root `~/repos/auth/py-identity-model`. Create the worktree off `base_branch`: `git worktree add -b <branch> <worktree> <base_branch>` (fetch first). All Rust work happens in `<worktree>/rust`.

**analyze** — Follow `phases/analyze.md`, plus:
1. Read the matching story's Rust decomposition (5.X-rust) in `epic-5-extended-tier.md` — every acceptance-criteria checkbox is a requirement.
2. Read the **existing** conformance definition for this capability in `<worktree>/spec/conformance/<introspection|revocation|token-exchange|dpop>.json` and the fixtures in `<worktree>/spec/test-fixtures/`. **All four extended conformance files already exist** — do NOT author new conformance JSON; your job is to make Rust satisfy the existing IDs. Map each ID to a Rust test.
3. Read the **completed Go package** as the reference implementation — `go/pkg/introspection` (RE5.1), `go/pkg/revocation` (RE5.2), the RFC 8693 exchange path inside `go/pkg/token` (RE5.3), `go/pkg/dpop` (RE5.4) — same conformance IDs, same provider quirks, same public-API intent. Read the Rust scaffold you will build on: `rust/src/error.rs` (`IdentityError` variants), `rust/src/http.rs`, `rust/src/lib.rs` re-exports, `rust/src/token/mod.rs` (its client-auth + token-error-parsing patterns that introspection/revocation/exchange reuse), and the builder patterns already used across `rust/src/`.
4. **Provider support plan.** node-oidc-provider (in `infra/`) supports introspection, revocation, and DPoP via feature flags — enable the flag this task needs (keep the existing core integration jobs green). **node-oidc-provider does NOT support RFC 8693 token exchange** — RE5.3 integration tests run against a local mock (e.g. `wiremock`) implementing the fixture responses, mirroring how the Go loop used a Go `httptest` mock. Any Descope token-exchange test MUST gate on the token endpoint's actual response, not discovery — Descope discovery over-advertises token-exchange grants its endpoint rejects (E011003).
5. Plan must list: exact Rust files to create/modify, the **builder / options API surface** (mirroring the Go functional-options intent, idiomatic Rust builders), unit test cases (map each to Epic 5 ACs + conformance IDs), and the `#[ignore]`-gated integration tests against `infra/`.

**implement** — Follow `phases/implement.md`, plus:
- **Idiomatic async Rust mirroring the Go reference**: `reqwest` (rustls-tls) for HTTP via the existing `rust/src/http.rs` conventions, `tokio` runtime, `serde`/`serde_json` for models, `thiserror` (`IdentityError`) for errors, **builder patterns** for client/options config. Reuse the client-auth (`client_secret_basic`/`client_secret_post`) and token-error-parsing patterns already in `rust/src/token`. Endpoints come from the discovery document (`introspection_endpoint`, `revocation_endpoint`).
  - **RE5.1 introspection** (`rust/src/introspection`): typed response where **only `active` is guaranteed**; all other fields land in an overflow map. Wrong `token_type_hint` MUST NOT fail the request.
  - **RE5.2 revocation** (`rust/src/revocation`): any 2xx = success (revoking an unknown/already-invalid token succeeds per RFC 7009 §2.2); non-2xx parses into a typed OAuth error.
  - **RE5.3 token exchange** (extend `rust/src/token`): `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, subject/actor tokens with their token-type URIs, `issued_token_type` enforced on the response.
  - **RE5.4 DPoP** (`rust/src/dpop`): ES256/RS256 keypair generation, proof JWT (`typ=dpop+jwt`, `jti`/`htm`/`htu`/`iat`, `ath` = base64url(SHA-256(access_token)) for resource access, `use_dpop_nonce` challenge → retry with server nonce), RFC 7638 JWK thumbprint, and a `reqwest` middleware/wrapper for the nonce retry. Sign proofs with `jsonwebtoken`; use `sha2`+`base64` (already deps) for `ath` and the thumbprint; add `p256`/`rsa` as regular deps for keygen via `cargo add` if not already promoted from dev-deps.
- **Toolchain: edition 2024, MSRV `1.96` per `rust/Cargo.toml` — do NOT downgrade.** Keep `rustls-tls` (never default openssl).
- Add deps with `cargo add`; commit `Cargo.toml` **and** `Cargo.lock`.
- `cd <worktree>/rust && cargo build && cargo clippy --all-targets -- -D warnings && cargo fmt --check` clean before every commit (fix formatting with `cargo fmt`). Never `git add .` — add specific files.
- As each capability's conformance passes, flip its **Rust** column from `planned` → `implemented` in `<worktree>/spec/capabilities.md`.
- Conventional commits: `feat(rust): <description>`.

**test** — Follow `phases/test.md`, plus:
- Unit tests under `#[cfg(test)]` cover every Epic 5 AC and reference the conformance IDs in a comment (e.g. `// INTR-003`, `// DPOP-005`). Use `#[tokio::test]` for async cases; mock HTTP with the `wiremock` dev-dependency (already present). DPoP: verify `ath` and RFC 7638 thumbprint computation against the deterministic fixture pairs in `spec/test-fixtures/`.
- **Integration tests live in `rust/tests/<capability>.rs` and MUST be marked `#[ignore]`.** The unit `rust` CI job runs bare `cargo test` with **no provider running** — un-ignored provider-dependent tests would fail it. `#[ignore]` keeps that job green, while the dedicated **`rust-integration` CI job** (compose up node-oidc → `cargo test -- --ignored`) actually runs them. They gate the `conformance` job, so they MUST pass.
- Introspection/revocation/DPoP integration run against the local node-oidc-provider with the feature flag enabled; **token exchange uses a `wiremock` mock** implementing the fixture responses (node-oidc-provider does not support RFC 8693 — see analyze). Read provider config from env, reusing the repo's `TEST_*` convention (the `.env.node-oidc` profile the Makefile sources): `TEST_DISCO_ADDRESS`, `TEST_CLIENT_ID`, `TEST_CLIENT_SECRET`, `TEST_SCOPE`, etc. Skip gracefully if `TEST_DISCO_ADDRESS` is unset.
- Run integration locally: `make infra-up` (node-oidc :9000 + IdentityServer :9001) then `make test-integration-rust` (or `cd rust && cargo test -- --ignored`); `make infra-down` after.
- `cargo test` (unit, no `--ignored`) must pass before pushing.

**review** — Follow `phases/review.md`. Reviewers: **Blind Hunter + Edge Case Hunter + Acceptance Auditor** (templates in `ralph-prompts/review-agents/`). The Acceptance Auditor MUST verify every Epic 5 AC and every conformance ID for this capability is covered, and that the Rust behavior matches its Go counterpart (no security check weakened to pass a test — reject `alg:none` in DPoP proof paths, enforce `issued_token_type`, honor client auth).

**review-fix** — Follow `phases/review-fix.md`. No overrides.

**pr** — Follow `phases/pr.md`, plus:
- Repo `jamescrowley321/identity-model`. **Open with `--base <base_branch>`** (the chained parent, not main, unless the parent is already merged).
- Title: `feat(rust): <description>`. Body lists the Epic 5 story (5.X-rust), the Go reference package mirrored, ACs covered, conformance IDs, and the review summary.
- **No auto-merge flags.**

**ci** — Follow `phases/ci.md`. Repo `jamescrowley321/identity-model`. Max 3 CI fix attempts. Three gates must pass: the **`rust`** job (`cargo fmt --check` + `cargo clippy --all-targets -- -D warnings` + `cargo test`), the **`rust-integration`** job (local node-oidc provider + `cargo test -- --ignored`), and the **`conformance`** aggregation gate. CI runs on **every PR regardless of base branch**, so the stacked PRs RE5.2–RE5.4 get full CI even before the stack lands on `main` — wait for the checks and fix them like any other task; don't proceed to `complete` on red. The `changes` paths-filter runs the `rust` / `rust-integration` jobs when `rust/**` (or shared `spec/`) changed; your PRs touch `rust/`, so both run. If a lint/toolchain error fires only in CI, install the CI toolchain version locally to reproduce rather than guessing.

**complete** — **OVERRIDE: do NOT merge the PR.**
1. Mark the task `done` in the queue in THIS file.
2. `cd ~/repos/auth/py-identity-model && git worktree remove <worktree> --force`
3. Delete `.claude/task-state.md`.
4. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — fresh context prevents drift.
- NEVER commit to `main`; always feature branches in worktrees. (Do not rely on a git hook; the worktree-per-task model is what keeps `main` clean.)
- All work after setup happens in the worktree.
- **Do NOT author new conformance JSON** — the four extended files already exist as prose contracts. The implementation must satisfy the existing conformance IDs, not just compile.
- **Idiomatic async Rust mirroring the Go reference** — same conformance IDs, same provider quirks, same public-API intent: `reqwest`+`rustls`, `tokio`, `serde`, `thiserror` (`IdentityError`), builder patterns, `jsonwebtoken` (`rust_crypto`). Edition 2024, MSRV `1.96` per `Cargo.toml` (do not downgrade).
- Add deps with `cargo add`; commit `Cargo.toml` **and** `Cargo.lock`. Never `git add .` — add specific files.
- Conventional commits (`feat(rust):` / `test(rust):` / `fix(rust):`).
- Run `cargo build && cargo clippy --all-targets -- -D warnings && cargo fmt --check` before committing, `cargo test` before pushing. No `--no-verify`.
- **Integration tests are `#[ignore]`-gated** so the unit `rust` job's bare `cargo test` stays green; the `rust-integration` job runs them with the provider up. They must pass before the `pr` phase — never rationalize a red integration test as pre-existing, environmental, or out-of-scope.
- As each capability's conformance passes, flip its **Rust** column `planned` → `implemented` in `spec/capabilities.md`.
- If stuck 3+ iterations on the same phase: set the task to `blocked`, clean up the worktree, delete task-state.md, move on.
- **One workstream per repo: this loop must not run concurrently with any other identity-model loop.**
- **NEVER merge PRs — the owner reviews and merges manually.**
