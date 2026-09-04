# Review & Audit Prompt — Overnight Ralph Loops (run night of 2026-09-02)

You are a **skeptical, fresh-context reviewer** auditing two autonomous ralph loops that ran overnight. **Green CI is not proof of correctness** — verify by reading diffs and running the tests/conformance yourself. **Recommend only; never merge anything.** Prefer evidence (command output) over assertion; if you cannot run something, say so and mark the verdict provisional.

Companion checklist (read it): `_bmad-output/implementation-artifacts/audit-overnight-loops-2026-09-03.md`.

## Context — VERIFY, do not trust these values (point-in-time 2026-09-03)
Two loops ran; neither reached `LOOP_COMPLETE`.
- **identity-model — Rust Extended tier** (Go/Rust conformance). Repo `~/repos/auth/py-identity-model` (GitHub `identity-model`). **Stacked PRs** off `feat/rust-introspection`. Snapshot: RE5.1 Introspection → **PR #584** (done); RE5.2 Revocation in-flight; RE5.3 Exchange, RE5.4 DPoP pending. Prompt: `ralph-prompts/identity-model-rust-extended.md`. Contract: `spec/conformance/{introspection,revocation,token-exchange,dpop}.json`, `spec/capabilities.md`.
- **identity-stack — Ory Epic 4/5** (provider-agnostic frontend + logout + E2E). Repo `~/repos/auth/identity-stack`. Independent PRs off `main`; auth-critical (RED/BLUE gate). Snapshot: ORY-4.2 → **#391**, ORY-4.3 → **#392** (done); ORY-5.1 logout at `pr`; ORY-5.2 E2E pending. Prompt: `ralph-prompts/ory-frontend-logout.md`. AC: `planning-artifacts/epics-ory-sso-provider.md`, `docs/ory-sso-provider-context.md`.

## Step 1 — Establish ground truth (trust this, not the snapshot)
```bash
gh pr list -R jamescrowley321/identity-model --state open
gh pr list -R jamescrowley321/identity-stack --state open
grep -A20 'Task Queue' /tmp/im-rustext-orch/PROMPT.md; grep -A10 'Task Queue' ~/repos/auth/identity-stack/PROMPT.md
cat /tmp/im-rustext-*/.claude/task-state.md ~/repos/auth/identity-stack/.claude/task-state.md 2>/dev/null
git -C ~/repos/auth/py-identity-model worktree list; git -C ~/repos/auth/identity-stack worktree list
/ralph-status
```
Build the actual list of OPEN PRs these two loops produced. Everything below operates on that verified list.

## Step 2 — Adversarial per-PR review (parallelize — one subagent per PR)
For EACH open loop PR, review independently and produce **evidence-backed** findings. Spawn a subagent per PR, or apply the reviewers in `ralph-prompts/review-agents/` (blind-hunter, edge-case-hunter, acceptance-auditor; +sentinel/viper for auth-critical). Cover:

- **Acceptance** — does the diff meet the story's AC? (Rust: the queue row in `identity-model-rust-extended.md` + the conformance IDs; Ory: `epics-ory-sso-provider.md`.)
- **Correctness — RUN IT, don't trust CI green:**
  - *Rust* (on the PR branch/worktree): `cd rust && cargo test && cargo clippy -- -D warnings && cargo deny check`. Run the shared conformance vectors and confirm Rust passes the **same IDs Go passes**. Flag: skipped / `#[ignore]`d IDs, TODOs, stubbed or hardcoded fixtures, MSRV/edition downgrade, any openssl (must stay rustls-only), missing `use_dpop_nonce` retry / thumbprint edge cases (DPoP).
  - *identity-stack*: `make test-up` then `make test-unit test-frontend test-e2e`.
- **Regression / safety:**
  - identity-stack is **auth-critical** — prove the **Descope path is NOT regressed** (fail-closed on validation / audience / logout preserved); the change is backward-compatible (`VITE_OIDC_*` with `VITE_DESCOPE_*` fallback); confirm the **RED/BLUE gate actually ran and passed** in the PR's reviews (`ralph-prompts/RED-BLUE-GATE.md`).
  - Rust behavior mirrors the Go reference implementation.
- **Process integrity:** confirm **no PR auto-merged** (all OPEN, owner-gated — the loops are `--no-auto-merge`); verify **stacked-PR bases** are correct (Loop 1 merge order: `#584` → RE5.2 → RE5.3 → RE5.4; watch for base drift after any merge).
- Optionally run `/code-review` fresh-context on each diff for a second opinion — prioritize the **DPoP crypto** and the auth-critical identity-stack PRs.

## Step 3 — Loop-execution audit
Both loops stopped short of `LOOP_COMPLETE`. Determine **why** from the ralph logs + `task-state.md` phase (iteration cap 100, consecutive-failure cap 5, terminal closed, or a `blocked` story; anything stuck 3+ iterations). Run `/ralph-audit` for token/efficiency waste. **Flag any hallucinated "done"** — a story marked `done` in the queue whose AC is not actually met.

## Step 4 — Output: ONE structured findings report
1. **Executive summary** — per loop: completed / in-flight / pending, and overall health (ship-ready? or needs fixes?).
2. **Per-PR verdict table** — `PR # | story | verdict (MERGE / REQUEST-CHANGES / HOLD) | one-line reason | evidence (tests you ran + result)`.
3. **Findings** — each with severity, `file:line`, why it's wrong, and the fix. (REQUEST-CHANGES items are the input to the `fix-review-findings.md` loop.)
4. **Recommended merge order** — respecting the Loop-1 stack and running Loop-2 **E2E last** (after frontend/logout merge).
5. **Resume plan** — exact commands to finish both loops (from the audit plan) + a merge-then-resume vs. finish-then-merge recommendation.
6. **Cleanup + doc reconciliation** — leftover worktrees to remove; capability matrix (regenerate from runners, don't hand-edit); `epics-ory-sso-provider.md` + `task-queue.md` statuses; and the `open-identity` Epic A A.11/A.12 keep-or-drop call.

**Do not merge. Do not auto-fix.** This pass produces the review; fixing is a separate `fix-review-findings.md` loop the owner launches.
