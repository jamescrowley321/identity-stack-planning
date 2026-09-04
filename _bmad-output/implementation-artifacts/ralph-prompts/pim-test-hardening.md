Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

**Epic:** identity-model #614 — *Test Hardening — harder test tiers & coverage (23.1–23.7)*.
**Plan (source of truth for scope/acceptance):** `identity-stack-planning` → `_bmad-output/planning-artifacts/epics/epic-23-test-hardening.md`.
**Focus:** the HARDER tiers only — integration, OIDF conformance, E2E harness, cross-language, mutation gates. **Add NO new unit tests**; a story that would land only unit coverage is mis-scoped — return to analyze.

## Running

Run from a **dedicated identity-model worktree**, never the primary `~/repos/auth/py-identity-model` checkout — this keeps `PROMPT.md`/`.claude/task-state.md` out of the primary checkout and `main` pristine.

```bash
# One-time: create the orchestrator worktree off main
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/pim-testhard-ralph -b ralph/test-hardening origin/main

# Run the loop from inside that worktree
cd /tmp/pim-testhard-ralph
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-test-hardening.md PROMPT.md
ralph run --idle-timeout 0        # 0 = don't SIGTERM long-quiet phases (uvicorn boots, OIDF suite runs, Docker fixtures, cargo/go builds go quiet)
```

The planning-repo copy is the source of truth; edit it there and re-`cp` if you change the workstream mid-run. Per-task work happens in its own short-lived worktree (`/tmp/pim-T23X`) created by `setup`. When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-testhard-ralph`.

**ONE identity-model loop at a time.** Do NOT run concurrently with `token-harness.md`, `pim-oidc-conformance.md`, `pim-fapi2-hardening.md`, or any other loop on this repo — they share the repo and would collide. Remove stale orchestrator worktrees first (`git worktree list`).

## Stacked PRs — merge policy (READ FIRST, non-negotiable)

This epic ships as a **PR stack**, not parallel PRs off `main`:

- Each task branches off the **previous task's branch** (its `base_branch`), not off `main`. So task N's branch contains tasks 1..N-1.
- The **owner reviews and merges the stack bottom-up.** After a bottom PR merges, the next task rebases onto the new `main` (the loop's `setup`/`ci` handles the rebase-forward).
- **The loop NEVER merges.** No `gh pr merge`, no auto-merge, no `--merge`/`--squash`/`--admin`, ever — not even on green CI. The `pr` phase opens the PR, posts review evidence, records the number, and stops. `complete` marks the task done and moves on; it does not wait for or perform a merge.
- Externally-blocked tasks sit at the **top** of the stack (T234 needs #585 merged; T233 needs #598–601 fixed) so they never gate the independent ones below.

## Task Queue

Stacked bottom→top. `base_branch` is the branch this task builds on. Owner merges bottom-up.

| Task | Issue · Story | Branch | base_branch | Description | Status |
|------|---------------|--------|-------------|-------------|--------|
| T231 | #607 · 23.1 | test/conformance-run-profiles | main | Execute the configured-but-unrun OIDF plans (FAPI2 ×3, dynamic-reg, RP-init + back-channel logout) via `run_tests.py --plan` + make targets + nightly/release CI wiring; upload evidence; explicit skip when secrets/hosted-suite absent | pending |
| T232 | #608 · 23.2 | test/spec-vectors-executable | test/conformance-run-profiles | Make the 9 descriptive-only `spec/conformance/*.json` capabilities executable across py/go/rust; extend the 3 runners + `tools/spec_coverage_gate.py` to enforce 100% over all 10 capabilities, fail-closed. **First verify the cross-language executor gate is landed** (CONS-1.5 / PR #549 closed-unmerged); re-land if absent | pending |
| T236 | #612 · 23.6 | test/xlang-mutation-gates | test/spec-vectors-executable | Nightly full-surface Python mutmut over all `SECURITY_MODULES` (report-only); pilot Go (`gremlins`/`go-mutesting`) + Rust (`cargo-mutants`) mutation gates on the security packages; Go/Rust coverage floors | pending |
| T235 | #611 · 23.5 | test/go-rust-rs-harness | test/xlang-mutation-gates | Boot minimal Go + Rust resource servers in the token-blaster harness; run the forged corpus + correctness matrix + cross-issuer rejection against them; `make test-harness-{go,rust}` gated. May split T235a (Go) / T235b (Rust) | pending |
| T237 | #613 · 23.7 | test/xlang-provider-breadth | test/go-rust-rs-harness | Rust Keycloak + IdentityServer integration legs; Python IdentityServer leg (`make test-integration-identityserver`) | pending |
| T234 | #610 · 23.4 | test/policy-rotation-harness | test/xlang-provider-breadth | Real-IdP harness coverage for injectable `discovery_policy` rotation/retry via `mock_op.py` key-rotation. **Blocked until #585 merges** — set `blocked` if unmerged | pending |
| T233 | #609 · 23.3 | test/middleware-authbypass-harness | test/policy-rotation-harness | Drive the middleware auth-bypass regressions (#598–601: WS auth, excluded-path subpath, login-router, error-text) through the booted RS. **Blocked until #598–601 fixes land** — set `blocked` if absent | pending |

**Story 23.0 (living coverage matrix)** is not a task — every task flips its matrix cell (`docs/security/harder-tier-coverage.md`) in the same PR (see `pr` phase).

### Sequencing notes
- **T231 first** — highest value/effort (profiles already supported), and it establishes the conformance-CI pattern the epic builds on.
- **T232 before T235** — the Go/Rust RS assertions (T235) reuse the executable shared vectors.
- **T234/T233 gate on external work** (#585, #598–601). If their precondition isn't met when reached, set `blocked`, clean up, and stop the loop for owner input rather than building on an unmerged dependency.

## Routing

Repo: `~/repos/auth/py-identity-model`

Read `~/repos/auth/py-identity-model/.claude/task-state.md`.

- **Does not exist** → Pick first `pending` task, create state (with `base_branch` from the queue), execute setup
- **phase is `complete`** → Update status to `done` in this file, clean up worktree, delete state, pick next `pending`
- **Any other phase** → Read phase file and execute

Phase order: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

## New Task Setup

Create `~/repos/auth/py-identity-model/.claude/task-state.md`:
```
task_id: T23X
branch: <branch from queue>
base_branch: <base_branch from queue>     # main for the bottom of the stack; the previous task's branch otherwise
worktree: /tmp/pim-T23X
phase: setup
```

The `setup` phase must create the worktree off `base_branch` (`git worktree add <worktree> -b <branch> origin/<base_branch>` when base is `main`, else off the local stacked branch tip). The `pr` phase reads `base_branch` and opens the PR against it (chained-PR path).

If all done: `<promise>LOOP_COMPLETE</promise>`

## Phase Instructions

Read the current phase file:
```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```
All work after setup happens in the worktree — `cd <worktree>` first.

## Task-Specific Analysis Guidance

Read the matching story in `epic-23-test-hardening.md` (Given/When/Then acceptance) and the linked GH issue when the analyze phase runs:

- **T231 (#607, conformance):** Configs already exist in `conformance/configs/` (`fapi2-rp`, `fapi2-mtls-rp`, `fapi2-message-signing-rp`, `dynamic-rp`, `rpinitiated-logout-rp`, `backchannel-logout-rp`); harness supports them (`conformance/tests/test_fapi2_flow.py`). Wire `run_tests.py --plan` per profile into make targets + the `conformance` workflow (nightly report+upload; release-gate FAPI2 + logout like basic/config/form-post). Secrets/hosted-suite absent → skip with a logged reason, never silent-pass.
- **T232 (#608, spec vectors):** Only `spec/conformance/validation.json` has executable vectors today. Make the other 9 executable reusing `spec/test-fixtures/` (esp. `dpop/`, `token-exchange/`); extend runners `unit/test_spec_conformance.py`, `go/internal/conformance`, `rust/tests/spec_conformance.rs` + `tools/spec_coverage_gate.py`. **Verify the executor gate is landed first.**
- **T236 (#612, mutation):** Nightly full-surface mutmut is Python-only + independent. Go/Rust security-package gates (`gremlins`/`cargo-mutants`) should mirror the `make security-gate` fail-closed contract; can start report-only. Add Go (`go test -cover`) + Rust (`cargo llvm-cov`) floors.
- **T235 (#611, Go/Rust RS):** Mirror the Python harness (`src/tests/harness/rs_app.py`, `corpus.py`, `mock_op.py`, real-uvicorn boot). Minimal Go + Rust resource servers mounting each lib's validation; run the `library_rejects` corpus + correctness matrix + cross-issuer rejection. Split Go first.
- **T237 (#613, provider breadth):** Reuse `infra/` docker fixtures + `.env.*`. Add Rust Keycloak + IdentityServer legs; add Python `make test-integration-identityserver`.
- **T234 (#610, rotation):** Lift `unit/test_discovery_policy_rotation_paths.py` to the real-HTTP tier: `mock_op.py` rotate-key-on-command through the booted RS with an injected policy admitting an endpoint the strict default rejects; assert refresh + retry re-fetch under the injected policy and the injected policy wins over the `require_https` bool.
- **T233 (#598–601, auth-bypass):** Drive through the booted RS (`test_rs_boot.py`): WS upgrade auth, nested routes under an excluded prefix, login-router pass-through, error-text non-leak — valid/forged/absent creds, asserted over the wire.

## Rules

- ONE phase per iteration, then end.
- **NEVER merge any PR** — no `gh pr merge`, no auto-merge, not on green CI. The owner reviews and merges the stack bottom-up. Violating this is a hard failure of the loop.
- **Stacked PRs only.** Branch off `base_branch` (the previous task's branch), open the PR against `base_branch`. Never open a story PR directly off `main` except the bottom of the stack (T231).
- Never commit to `main` — worktree branches only.
- **Harder tiers only** — integration / OIDF-conformance / E2E-harness / cross-language / mutation. A change whose only new coverage is unit-level is mis-scoped; return to analyze.
- Tests must exercise real flows/providers/suites, not mocks (the harness `mock_op.py` over real loopback HTTP is fine; `respx` unit mocks are not this epic's tier).
- The `pr` phase mechanical security gate (`make security-gate`) and review-evidence gate are hard blocks — a security/conformance PR does not advance without them.
- Externally-blocked task (T234/T233) with an unmet precondition → set `blocked`, clean up the worktree, and stop for owner input. Do not build on an unmerged dependency.
- If stuck 3+ iterations: set `blocked`, clean up, move on.
