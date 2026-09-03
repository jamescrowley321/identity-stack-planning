> **STATUS: COMPLETE — 2026-08-02. This loop was NOT run; all four tasks were done in-session and merged.** R1 #24 (secret redaction), R2 #22 (redirect-downgrade), R3 #23 (`azp`/clock-skew) shipped in **PR #37**; R4 jsonwebtoken 9→10 shipped in **PR #39** (feature `rust_crypto`). Both merged, CI green; issues #23/#24 closed 2026-08-02. The embedded task table below is historical and its `pending` markers / "MSRV 1.91" text are stale (MSRV is now 1.96). Kept for provenance; the next identity-model track is `identity-model-priorities-planning.md`.

Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

## Running

Run the loop from a **dedicated identity-model worktree**, never from the main `~/repos/auth/py-identity-model` checkout — this keeps `PROMPT.md`/`.claude/task-state.md` out of the primary checkout and keeps `main` pristine.

```bash
# One-time: create the orchestrator worktree off main
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/im-rust-ralph -b ralph/rust-hardening origin/main

# Run the loop from inside that worktree, idle-timeout 0 so cargo builds
# aren't SIGTERM'd during long quiet phases
cd /tmp/im-rust-ralph
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/identity-model-rust-hardening.md PROMPT.md
ralph run --idle-timeout 0
```

`ORCH_WORKTREE` below refers to `/tmp/im-rust-ralph`. **The prompt must live inside the orchestrator worktree as `PROMPT.md` for the whole run** — ralph re-reads `PROMPT.md` from the worktree's CWD each iteration, so it must be copied in (as above) before `ralph run` and remain there until the loop completes. The planning-repo copy at `ralph-prompts/identity-model-rust-hardening.md` is the source of truth; edit it there and re-`cp` if you change the workstream mid-run. Per-task implementation happens in its own short-lived worktree (`/tmp/im-RX`) created by the `setup` phase — the orchestrator worktree only hosts the loop, never task branches. When the loop finishes, remove it: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/im-rust-ralph`.

## Task Queue

All Rust work lives under `rust/` (crate `identity-model`, imported as `identity_model`; edition 2024, MSRV 1.91). Each task is an independent PR off `main`.

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| R1 | fix/rust-redact-secrets | #24 redact bearer tokens + client secrets from Debug/error output | pending |
| R2 | fix/rust-redirect-downgrade | #22 forbid https→http redirect downgrade in discovery/jwks fetch | pending |
| R3 | fix/rust-azp-skew | #23 verify `azp` for multi-audience ID tokens + clock-skew (OIDC Core §3.1.3.7) | pending |
| R4 | chore/rust-jsonwebtoken-10 | #32 migrate jsonwebtoken 9→10 (verified breaking; keep all JWT tests green) | pending |

**Order is intentional.** R1 and R2 are isolated (token/error types; discovery/jwks fetch) — quick wins first. R3 and R4 **both edit `rust/src/jwt/mod.rs`**, so they are sequenced: do R3 (azp/skew) first, then R4 (jsonwebtoken migration). **R4 must branch off `main` only after R3 has merged; if R3 is not yet merged when R4 starts, branch R4 off the `fix/rust-azp-skew` branch instead** and note the base in the PR. This is the one cross-task dependency.

## Routing

Repo: `~/repos/auth/py-identity-model` (the loop's CWD is `ORCH_WORKTREE` = `/tmp/im-rust-ralph`).

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/im-rust-ralph/.claude/task-state.md`).

- **Does not exist** → Pick first `pending` task, create state, execute setup
- **phase is `complete`** → Update status to `done` in this file, clean up the task worktree, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order (all four use the fix pipeline): `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`. These are hardening/migration fixes, not user-facing features — the `docs` phase is changelog + doc-comment only (no `examples/` entry required unless the change alters the public API surface, in which case update the affected example).

## New Task Setup

Create `ORCH_WORKTREE/.claude/task-state.md` (`/tmp/im-rust-ralph/.claude/task-state.md`):
```
task_id: RX
branch: <branch from queue>
worktree: /tmp/im-RX
phase: setup
```

The `setup` phase creates the task worktree with `git worktree add /tmp/im-RX -b <branch> <base>` (run from `ORCH_WORKTREE`). `<base>` is `origin/main` for R1/R2/R3; for R4 see the ordering note above.

If all done: `<promise>LOOP_COMPLETE</promise>`

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

All work after setup happens in the task worktree — `cd /tmp/im-RX/rust` first (the Rust crate root). The phase files are language-neutral; the Rust-specific commands are in the Rules section below.

## Task-Specific Analysis Guidance

Include these notes when the analyze phase reads the issue. Confirm exact line numbers against the live code — the crate has evolved since these were filed.

- **R1 (#24 redact secrets from Debug):**
  - Any type that holds a bearer token, `client_secret`, `refresh_token`, `access_token`, `id_token`, or a `DPoP`/private key must NOT expose it via `#[derive(Debug)]`. Sweep `rust/src/token`, `rust/src/dpop` (if present), and any config/request structs.
  - Replace derived `Debug` with a hand-written `impl std::fmt::Debug` that prints the field as `"<redacted>"` (or the struct with sensitive fields masked). Same for any `Display` or error variants (`IdentityError`) that interpolate a token/secret into their message.
  - Add a unit test per redacted type asserting `format!("{:?}", value)` does **not** contain the secret material and **does** contain a redaction marker. This is the acceptance criterion.

- **R2 (#22 forbid https→http redirect downgrade):**
  - The discovery and JWKS clients fetch over HTTPS via `reqwest`. A malicious/misconfigured server can 3xx-redirect to an `http://` URL; the fetch must refuse to follow a redirect that downgrades the scheme.
  - Configure the `reqwest::Client` with a custom `redirect::Policy` that inspects each hop and errors when the previous URL was `https` and the next is `http` (a downgrade). Do not globally disable redirects — only block the downgrade. Apply consistently to discovery (`rust/src/discovery`) and jwks (`rust/src/jwks`) client construction; factor a shared client-builder helper if both construct their own.
  - Tests: a `wiremock` server that 302-redirects https→http is rejected with a clear error; a same-scheme redirect (https→https) still succeeds. Keep deterministic.

- **R3 (#23 azp + clock-skew):**
  - `rust/src/jwt/mod.rs` validates ID tokens. Two gaps per OIDC Core §3.1.3.7:
    - **azp:** when the token's `aud` is an array with more than one audience, the `azp` (authorized party) claim MUST be present and MUST equal the client's `client_id`. Single-audience tokens don't require `azp`, but if `azp` is present it must equal `client_id`.
    - **clock-skew:** `exp`/`nbf`/`iat` checks should allow a small configurable leeway (default e.g. 60s) rather than an exact wall-clock compare. Wire the leeway through `ValidationOptions` (`rust/src/jwt/options.rs`).
  - Add unit tests: multi-aud without azp rejected; multi-aud with wrong azp rejected; multi-aud with correct azp accepted; token just inside/outside the skew window. Keep the existing 100+ jwt tests green.

- **R4 (#32 jsonwebtoken 9→10 migration):**
  - **Verified breaking (2026-07-22):** bumping `jsonwebtoken = "10"` builds and passes clippy but **6 JWT-validation tests fail** — `accepts_valid_rsa_token`, `accepts_valid_ec_token`, `rejects_tampered_signature`, `rejects_disallowed_algorithm`, `rejects_expired_token_end_to_end`, `tolerates_skew_end_to_end` — panicking in `jsonwebtoken-10.4.0/src/crypto/mod.rs:124`. v10 changed key/crypto handling.
  - The goal is a clean migration: bump the dep, then rework `rust/src/jwt/mod.rs` (and `options.rs` if needed) to v10's `DecodingKey`/`Validation`/`decode` API so **all** JWT tests pass again. Read the jsonwebtoken 10 changelog/migration notes first (v10 reworked how EC/RSA keys are constructed and how algorithm validation is expressed).
  - Do NOT weaken any security check to make a test pass — signature verification, algorithm allow-listing, and expiry must remain enforced. The 6 failing tests are the acceptance gate; the other ~107 must stay green.
  - If R3 already merged, branch off `main`; otherwise branch off `fix/rust-azp-skew` (both edit jwt/mod.rs) and set the PR base accordingly.

## Rules

- ONE phase per iteration, then end.
- Run the loop from `ORCH_WORKTREE` (`/tmp/im-rust-ralph`), never from the main checkout. Never commit to main — task work happens in `/tmp/im-RX` worktree branches.
- Rust checks run from the crate root (`cd /tmp/im-RX/rust`). Before every commit, run all three as CI does — `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` — and do NOT use `--no-verify`. The security workflow (`cargo-audit` + `cargo-deny` + semgrep + gitleaks) also runs in CI; keep `deny.toml`'s advisory/license policy satisfied (add a justified `ignore` only for an unfixable advisory).
- All unit AND integration tests must pass. `make test-integration-rust` (from repo root, brings up the node-oidc-provider compose stack) must be green before the `pr` phase for any task that touches request/validation behavior (R2, R3, R4). Never rationalize a red test as pre-existing, environmental, or out-of-scope.
- Conventional-commit PRs against `main` (or the noted base for R4). Never auto-merge — the owner reviews and merges every PR manually (no `gh pr merge`, `--auto`, or merge-queue commands).
- If stuck 3+ iterations on one task: set it to `blocked`, clean up the worktree, move on. R4 is the most likely to block — if the jsonwebtoken-10 rework can't keep the security checks intact, block it and leave #32 for a human.
- If all tasks done: `<promise>LOOP_COMPLETE</promise>`
