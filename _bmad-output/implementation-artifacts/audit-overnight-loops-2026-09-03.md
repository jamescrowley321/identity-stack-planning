# Audit Plan — Overnight Ralph Loops (run night of 2026-09-02; audit 2026-09-03+)

> **For a fresh session.** Two ralph loops ran overnight. This plan verifies what they produced, triages the PRs, decides merges, and resumes the loops to completion. **Every snapshot value below is point-in-time (2026-09-03) — RE-VERIFY it first (step 0); the loops/PRs may have moved.** Don't trust green CI alone — run the tests/conformance yourself.

## What ran

1. **identity-model — Rust Extended tier** (Go/Rust conformance). Prompt: `ralph-prompts/identity-model-rust-extended.md`. Orchestrator worktree `/tmp/im-rustext-orch` (branch `ralph/rust-extended`). Builds Rust Introspection/Revocation/Token-Exchange/DPoP to **parity with the already-shipped Go Extended tier**, satisfying `spec/conformance/*.json`. **Stacked PRs** — each story bases on the previous. Repo: `~/repos/auth/py-identity-model` (GitHub `identity-model`).
2. **identity-stack — Ory Epic 4/5** (provider-agnostic frontend + logout + E2E). Prompt: `ralph-prompts/ory-frontend-logout.md`. Runs from `~/repos/auth/identity-stack`; per-story worktrees `/tmp/is-ory-<story>`. Independent PRs off `main`. Auth-critical → RED/BLUE review gate.

## Snapshot (2026-09-03 — VERIFY FRESH, do not trust)

**Loop 1 (identity-model)** — did NOT reach LOOP_COMPLETE:
- RE5.1 Token Introspection (RFC 7662) = **done → PR #584** (`feat/rust-introspection`)
- RE5.2 Token Revocation (RFC 7009) = **in-progress** (worktree `/tmp/im-rustext-52`, branch `feat/rust-revocation`, stacked on `feat/rust-introspection`)
- RE5.3 Token Exchange (RFC 8693) = pending · RE5.4 DPoP (RFC 9449) = pending

**Loop 2 (identity-stack)** — did NOT reach LOOP_COMPLETE:
- ORY-4.2 provider-driven oidcConfig = **done → PR #391** (reported 28/28 checks green)
- ORY-4.3 useRBAC/useTenants from `GET /api/identity` = **done → PR #392** (reported 28/28)
- ORY-5.1 provider-aware logout = **in-progress at `pr` phase** (worktree `/tmp/is-ory-ORY-5.1`, branch `feat/ory-provider-aware-logout`)
- ORY-5.2 E2E validation = pending

Leftover worktrees: `/tmp/im-rustext-orch`, `/tmp/im-rustext-52`, `/tmp/is-ory-ORY-5.1`. (Unrelated: `~/repos/auth/pim-*` worktrees — out of scope.)

## Step 0 — Refresh state (trust this, not the snapshot)
```bash
gh pr list -R jamescrowley321/identity-model  --state open
gh pr list -R jamescrowley321/identity-stack  --state open
grep -A20 'Task Queue' /tmp/im-rustext-orch/PROMPT.md          # Loop 1 queue statuses
grep -A10 'Task Queue' ~/repos/auth/identity-stack/PROMPT.md    # Loop 2 queue statuses
cat /tmp/im-rustext-*/.claude/task-state.md 2>/dev/null
cat ~/repos/auth/identity-stack/.claude/task-state.md 2>/dev/null
git -C ~/repos/auth/py-identity-model worktree list
git -C ~/repos/auth/identity-stack   worktree list
/ralph-status
```

## Step 1 — Per-PR correctness audit (DON'T just trust green CI)
For every OPEN PR (#584; #391; #392; plus any new ones from RE5.2 / ORY-5.1):
- **Read the diff** (`gh pr diff <n>`) against the story's acceptance criteria (Loop 1: the queue rows in `identity-model-rust-extended.md`; Loop 2: `planning-artifacts/epics-ory-sso-provider.md` + `docs/ory-sso-provider-context.md`).
- **Run tests/conformance locally** (CI green ≠ correct):
  - *Rust:* on the PR branch/worktree — `cd rust && cargo test && cargo clippy -- -D warnings && cargo deny check`. Run the shared conformance vectors for the capability and confirm Rust passes the **same IDs** Go passes (`spec/conformance/{introspection,revocation,token-exchange,dpop}.json`). Hunt for shortcuts: skipped/`#[ignore]`d IDs, TODOs, hardcoded fixtures, MSRV/edition downgrade, openssl creeping in (must stay rustls-only).
  - *identity-stack:* `make test-up` then `make test-unit`, `make test-frontend`, `make test-e2e` (Playwright).
- **Regression / safety gates:**
  - *identity-stack (auth-critical):* the **Descope path MUST NOT regress** — fail-closed on validation/audience/logout preserved; the change is backward-compatible (`VITE_OIDC_*` with `VITE_DESCOPE_*` fallback). Confirm the **RED/BLUE gate actually ran and passed** (PR reviews/comments), per `ralph-prompts/RED-BLUE-GATE.md`.
  - *Rust:* mirrors the Go behavior (same conformance IDs), no new advisories.
- **No-auto-merge respected:** confirm NO PR merged itself (all should be OPEN awaiting the owner). If any auto-merged → investigate the loop's `complete` phase.
- **Stacked-PR integrity (Loop 1):** `feat/rust-introspection`(#584) ← `feat/rust-revocation` ← `feat/rust-token-exchange` ← `feat/rust-dpop`. Verify each PR's base is correct; plan to merge **#584 first**, then rebase/merge up the stack. Watch for base-branch drift after any merge.

## Step 2 — Why did the loops stall? (neither hit LOOP_COMPLETE)
Check each orchestrator's ralph logs + `task-state.md` phase: iteration cap (100), consecutive-failure cap (5), terminal closed, or a `blocked` story. Note whether RE5.2 / ORY-5.1 was mid-phase or genuinely blocked, and any story stuck 3+ iterations.

## Step 3 — Adversarial / quality pass (recommended)
- Run `/code-review` (or `/bmad-code-review`) fresh-context on each PR diff — especially the auth-critical identity-stack PRs and the crypto-touching Rust **DPoP** once it lands.
- `/ralph-audit` for token/efficiency waste across the two runs.

## Step 4 — Triage each PR → decide
Per PR: **merge** (AC met, tests pass *locally*, no regression, gate passed) / **request-changes** (list gaps → feed the `fix-review-findings.md` loop) / **hold**.
- Loop 1 merge order: **#584 first** (stack base), then RE5.2→5.4 in stack order as verified.
- Loop 2: #391 and #392 are independent off `main` — merge when verified; ORY-5.1 (logout) after its PR verifies; **ORY-5.2 (E2E) validates the whole thing last** (run it after the frontend/logout PRs are merged).

## Step 5 — Resume the loops to finish (owner-launched)
Both are incomplete. Decide **merge-then-resume** vs. finish-the-stack-then-merge (Loop 1 is stacked; Loop 2's E2E validates merged frontend/logout).
```bash
# Loop 1 — continues RE5.2 → 5.3 → 5.4
cd /tmp/im-rustext-orch && ralph run
# Loop 2 — continues ORY-5.1 → 5.2
cd ~/repos/auth/identity-stack && ralph run
```
If `/tmp` was wiped since the run, recreate Loop 1's orchestrator worktree (recipe in the prompt header) and re-mark completed stories `done` in the fresh `PROMPT.md`. **One workstream per repo** — don't start a second loop on the same repo.

## Step 6 — Cleanup (after merges / completion)
- Remove finished per-story worktrees: `git -C ~/repos/auth/py-identity-model worktree remove /tmp/im-rustext-52`; `git -C ~/repos/auth/identity-stack worktree remove /tmp/is-ory-ORY-5.1`.
- After both LOOP_COMPLETE: remove `/tmp/im-rustext-orch`; delete the scratch `~/repos/auth/identity-stack/PROMPT.md`.
- Leave the unrelated `~/repos/auth/pim-*` worktrees unless confirmed stale.

## Step 7 — Update planning docs (reconcile plan ⇄ reality)
- Mark ORY-4.2/4.3 (and 5.1/5.2 when done) `done` in `epics-ory-sso-provider.md` + `task-queue.md`.
- Update the `identity-model` capability matrix (`spec/capabilities.md`) as each Rust Extended capability lands — but **regenerate from the conformance runners, don't hand-edit** (that column drifts).
- Reconcile the `open-identity` PRD/epics: Epic A is confirmed largely done via the merged Ory feeder; the swap-invariant + E2E-swap-CI delta (A.11/A.12) remains as an OPTIONAL capstone — decide keep-or-drop.

## Acceptance-criteria references
- Rust: `ralph-prompts/identity-model-rust-extended.md` (queue + capability defs), `~/repos/auth/py-identity-model/spec/capabilities.md`, `spec/conformance/*.json`.
- Ory: `ralph-prompts/ory-frontend-logout.md`, `planning-artifacts/epics-ory-sso-provider.md`, `docs/ory-sso-provider-context.md`.
