> ⚠️ **SUPERSEDED / ARCHIVED (2026-08-10).** This stacked-PR bottom-up loop produced PR #489 (SC0–SC3), which was **closed as an unreviewable tangle**. The gate foundation (Epic 19), SC1 alg-confusion, and SC2 issuer pinning were instead re-cut clean and merged in-session (#510, #507, #512); the mutation gate is now real + changed-function-scoped. Remaining SC work (SC3–SC9) is tracked live in `py-identity-model/docs/security/control-matrix.md` and should be done as **standalone in-session PRs off `main`**, not this stacked loop (which the audit showed accretes fail-open/unreviewed residue). Retained for provenance only — do not run.

Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

**Workstream:** py-identity-model audit remediation — **security + conformance fixes** from the 2026-08-02 red/blue audit. Implements **Epic 16** (audit remediation) + the **Epic 19** gate foundation, in dependency order.

**This is a STACKED-PR loop.** Each task branches off the **previous task's branch**, not `origin/main`. The owner reviews and merges **bottom-up** (SC0 first). Never auto-merge. GitHub auto-retargets the next PR to `main` when its base merges.

**One workstream per repo at a time** — do NOT run this concurrently with any other py-identity-model ralph loop.

## Running

Run from a **dedicated orchestrator worktree**, never the main `~/repos/auth/py-identity-model` checkout.

```bash
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/pim-secconf-ralph -b ralph/security-conformance origin/main

cd /tmp/pim-secconf-ralph
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-security-conformance-stack.md PROMPT.md
ralph run --idle-timeout 0        # 0 = never idle-timeout (long cargo/pytest/mutmut builds); see reference_ralph_idle_timeout
```

`ORCH_WORKTREE` = `/tmp/pim-secconf-ralph`. Per-task work happens in its own worktree `/tmp/pim-<task>`. When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-secconf-ralph`.

## Task Queue (STACKED — `base` is the branch this task builds on)

Sequenced so the highest-severity, foundational fixes are at the **bottom** of the stack (merged first). Every task's detail — user story, deliverables, acceptance criteria — lives in the referenced epic story; the `analyze` phase reads it.

| Task | Branch | Base branch | Epic story | Description | Status |
|------|--------|-------------|-----------|-------------|--------|
| SC0 | `chore/security-gate-foundation` | `origin/main` | Epic19 G.1/G.5 + Epic16 R.8 | `src/tests/security/` package + `docs/security/control-matrix.md`; `mutmut` config scoped to the security modules; `make mutation-security` + a `make security-gate` that runs it; wire into CI. **Base of the stack — everything above is gated by this.** | pending |
| SC1 | `fix/alg-confusion-downgrade` | `chore/security-gate-foundation` | Epic16 R.1 | Honor caller `algorithms` allowlist in discovery mode; add HS*/`none` to `_ALG_TO_KTY`; never resolve alg from the token header; wrap `InvalidKeyError`/`NotImplementedError` in `TokenValidationException`. | pending |
| SC2 | `feat/issuer-allowlist` | `fix/alg-confusion-downgrade` | Epic16 R.9 | First-class `allowed_issuers` pinning checked before trusting discovery (multi-tenant spoof defense) + safe-pattern docs. | pending |
| SC3 | `feat/rs-sender-constraint` | `feat/issuer-allowlist` | Epic16 R.2 | Enforce `cnf.x5t#S256` (mTLS) + `cnf.jkt` (DPoP, #478) + strict audience in `validate_token`; move harness-only secondary-aud check into the library. | pending |
| SC4 | `fix/enforce-verify-iss-aud-exp` | `feat/rs-sender-constraint` | Epic16 R.3 | Add `verify_aud`/`verify_iss` to `_ENFORCED_VERIFICATION_OPTIONS` when configured; set PyJWT `require=['exp']`. | pending |
| SC5 | `fix/require-sub` | `fix/enforce-verify-iss-aud-exp` | Epic16 R.10 | `require_sub: bool=True` (or default `require:['sub']`) on the ID-token surface; update the test that locks the permissive behavior. | pending |
| SC6 | `fix/duplicate-kid` | `fix/require-sub` | Epic16 R.11 | Duplicate/colliding `kid`: reject or try-all-candidates, never silent first-match. | pending |
| SC7 | `ci/conformance-evidence-integrity` | `fix/duplicate-kid` | Epic16 R.7 (+ Epic19 G.4) | **Conformance:** CI-gate the 6 un-gated profiles (or label local-only); remove `config-rp` `continue-on-error`; drop `WARNING`/`SKIPPED` from `PASSING_STATUSES`; stop counting harness-side skips; regenerate result artifacts from a gated run with provenance. | pending |
| SC8 | `fix/mtls-alias-cert-test` | `ci/conformance-evidence-integrity` | Epic16 R.6 | Auto-apply `mtls_endpoint_aliases` in the request path; add a real cert-presentation fail-closed test (current one passes with `load_cert_chain` deleted); remove dead `build_httpx_cert`. | pending |
| SC9 | `feat/dpop-refresh-clientcreds` | `fix/mtls-alias-cert-test` | Epic16 R.4 | Thread DPoP proofs through refresh-token and client-credentials grants (RFC 9449 §5), sync + async. | pending |
| SC10 | `test/basic-auth-encoding` | `feat/dpop-refresh-clientcreds` | Epic16 R.5 | Prove/guard the #482 Basic-auth percent-encoding change with an integration round-trip against a form-decoding AS. | pending |

**Reference docs (read from the planning repo as needed):**
`_bmad-output/planning-artifacts/epics/epic-16-audit-remediation.md`,
`epic-19-mechanical-security-gates.md`,
`_bmad-output/implementation-artifacts/ralph-prompts/RED-BLUE-GATE.md`.

## Sequencing

Strict linear SC0 → SC10 — a stacked chain, **cannot be parallelized**. SC0 must land first because every
task above it adds fail-closed tests that `make security-gate` (built in SC0) enforces. SC1 (alg-confusion)
and SC2 (issuer pinning) are the two highest-impact spoof/forgery fixes; SC7 is the conformance-evidence fix.

## Routing

Repo: `~/repos/auth/py-identity-model` (the loop's CWD is `ORCH_WORKTREE` = `/tmp/pim-secconf-ralph`).

Read `ORCH_WORKTREE/.claude/task-state.md`.

- **Does not exist** → pick the first `pending` task in queue order; **before creating state, VERIFY the gap
  still exists on `origin/main`** (read the file:line in the epic story; if the fix already shipped, mark the
  task `done` and move to the next — see [[feedback_verify_queue_before_launch]]); then create state, execute `setup`.
- **phase is `complete`** → set status `done` in this file, clean up the task worktree, delete state, pick next.
- **Any other phase** → read the phase file and execute.

Phase pipeline: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`.
- `docs` for these tasks = CHANGELOG entry + control-matrix row (+ usage example only for feature tasks SC2/SC3/SC9).

If all done: `<promise>LOOP_COMPLETE</promise>`.

## New Task Setup (STACKED)

Create `ORCH_WORKTREE/.claude/task-state.md`:
```
task_id: SCx
branch: <branch from queue>
base_branch: <BASE branch from queue>     # previous task's branch, NOT main (except SC0 = main)
worktree: /tmp/pim-SCx
phase: setup
```

The `setup` phase creates the task worktree **off the base branch**:
```
git worktree add /tmp/pim-SCx -b <branch> <base_branch>
```
For SC0, `<base_branch>` is `origin/main`. For SC1+, it is the **previous task's local branch** (already
pushed by that task's `pr` phase — if the base branch is missing on remote, the previous task did not finish;
STOP and set this task `blocked`).

## Phase Instructions

Read the current phase file:
`~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md`

All work after `setup` happens in the task worktree — `cd /tmp/pim-SCx` first. The **`review` phase**
selects Blind + Edge + Acceptance + Sentinel + Viper for these token/JWT/OIDC diffs, and the merged
**red/blue gate** applies (see `RED-BLUE-GATE.md`): the `pr` phase runs `make security-gate` and the `test`
phase requires a **fail-closed / mutation-style test** for every control (verified by `make mutation-security`,
built in SC0).

## Rules

- ONE phase per iteration, then end. Run from `ORCH_WORKTREE`, never the main checkout. Never commit to main.
- **Stacked PRs:** each PR's base is its `base_branch` (chained), NOT main. Set `base_branch` in task-state so
  `phases/pr.md` targets it. The owner merges bottom-up; **never** `gh pr merge`, `--auto`, or merge-queue.
- **Every security control needs a fail-closed test** under `src/tests/security/` that fails if the control is
  deleted — enforced mechanically by `make security-gate` / `make mutation-security` (built in SC0), not
  self-attested. A control with no killed mutant is not done. See [[feedback_mechanical_gates]].
- **Fix the library, never loosen a test or the conformance harness** to go green (SC7 makes evidence real; it
  does not weaken it).
- Feature tasks (SC2, SC3, SC9) MUST add integration tests (`src/tests/integration/`) AND a usage example
  (`examples/`). Run `make test-integration-node-oidc` locally before `pr`.
- Run `make lint` as a single command before every commit; never `--no-verify`. All unit AND integration tests
  must pass — never rationalize a red test as pre-existing/environmental/out-of-scope.
- Conventional-commit PRs, each linking its Epic 16/19 story + the epic #476 and the audit. Body notes the
  mutation check (delete control → test red → restore).
- If stuck 3+ iterations on one task: set it `blocked`, clean up the worktree, move on (do NOT skip ahead in a
  stack lightly — a blocked base leaves the tasks above it unmergeable; note the break in the queue).
- If all tasks done: `<promise>LOOP_COMPLETE</promise>`.

## Not in this loop (follow-ups)

- **Epic 17** (FAPI attacker-model adversarial suite) — build AFTER these fixes land; it locks the new controls
  with attack tests. Its own loop/PRs.
- **Epic 18** (load & soak) — separate track (ties to #474 / #462).
- Full **Epic 19** beyond the SC0 foundation (custom Semgrep ruleset G.2, reachability G.3, evidence-integrity
  script G.4 beyond SC7, required-check wiring) — fold into SC0 if cheap, else a follow-up.
