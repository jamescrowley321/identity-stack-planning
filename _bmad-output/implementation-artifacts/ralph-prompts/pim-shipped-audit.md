Self-referential loop. ONE phase of ONE target per iteration, then end. Fresh context each iteration — persist all state to files.

**Red/Blue-Team DETECTION loop.** This audits the code that ACTUALLY SHIPPED to `origin/main`, not a task branch — the gap that let the FAPI2 batch ship a stranded control, a fail-open mTLS path, and non-reproducible conformance green (see `RED-BLUE-GATE.md`). Run this after every security merge batch. It is the institutionalized form of the 2026-08-02 audit.

**One workstream per repo at a time — never run this in parallel with a feature loop on the same repo.**

## Running

Run from a **dedicated worktree**, never the main checkout:

```bash
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/pim-shipped-audit -b audit/shipped-redblue origin/main
cd /tmp/pim-shipped-audit
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-shipped-audit.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/pim-shipped-audit`. Blue-team fixes happen in per-target worktrees `/tmp/pim-audit-<slug>`. When the loop finishes: `git worktree remove /tmp/pim-shipped-audit`.

## Target Queue

Audit each recently-merged security-relevant PR/feature against shipped `origin/main`. Seed the queue by
listing merges that touched security paths since the last audit tag:

```bash
gh pr list --state merged --limit 30 --repo jamescrowley321/py-identity-model \
  --json number,title,mergedAt,files --jq \
  '.[] | select(.files[].path | test("token_validation|mtls|dpop|jarm|jwt|jwks|par|client_auth|conformance")) | "\(.number)\t\(.title)"'
```

Maintain the queue in `ORCH_WORKTREE/.claude/audit-queue.md` (one row per target: `feature | shipped_version | status`). Status flows `pending → audited → fixing → verified → done`. A target is `done` only when its controls are **verified present + wired + fail-closed + mutation-tested on origin/main**, or its confirmed findings have merged blue-team PRs.

## Routing

Read `ORCH_WORKTREE/.claude/audit-state.md`.
- **Does not exist** → build the target queue (above), create state for the first `pending` target, phase `redteam`.
- **phase is `complete`** → mark target `done` in audit-queue.md, delete state, pick next `pending`.
- **Any other phase** → execute that phase.

If all targets done: `<promise>AUDIT_COMPLETE</promise>`.

## Phases (per target): `redteam → triage → blue-fix → verify-shipped → pr → complete`

### redteam
Spawn **fresh-context** red-teamers via the `Agent` tool (`subagent_type: general-purpose`), one assistant turn.
Do NOT review in-context. Each red-teamer prompt MUST:
- State: "Audit the SHIPPED code on `origin/main` — the working tree may be stale. Assume the control is broken until proven otherwise. A prior security control shipped stranded here."
- Give the tools: `git -C <repo> show origin/main:<path>`, `gh pr diff <N> -R jamescrowley321/<repo>`, `git -C <repo> grep -n <pat> origin/main`. **Read-only — no edits.**
- Enforce the **red-team checklist** from `RED-BLUE-GATE.md`: (1) wired-not-stranded — is the control INVOKED by the public API a normal caller uses, or opt-in dead code? (2) fail-closed on missing/malformed input; (3) RS-side sender-constraint enforced (`cnf.x5t#S256`, `cnf.jkt`, caller alg/aud restrictions) inside `validate_token`, not just offered as helpers; (4) complete across grants (auth-code/refresh/client-creds) + sync/async; (5) mutation-tested — does deleting the control line turn a test red?; (6) evidence real — is any "conformance green" produced by a GATING CI job / hosted run, or self-attested static artifacts?
- Require each finding: severity, `file:line` on origin/main, a CONCRETE exploit/failure scenario, verdict CONFIRMED (verified/reproduced) or PLAUSIBLE, and — where feasible — runnable exploit code proving it.
- Write findings to `ORCH_WORKTREE/.claude/audit-<target>-<persona>.md`.
Use ≥2 lenses for security-critical targets (e.g. correctness + protocol-compliance). Verify subagents ran (files exist, >100 bytes). Then phase → `triage`.

### triage
Read all `.claude/audit-<target>-*.md`. Keep only CONFIRMED (and HIGH PLAUSIBLE) findings. For each, decide: **code fix**, **new control** (missing defense — record for the FAPI attacker-model backlog), or **evidence fix** (CI-gate / hosted run). If zero survive → write `## Audit: <target> CLEAN` to state, phase → `pr` (post the clean report), skip blue-fix. Else phase → `blue-fix`.

### blue-fix
In a per-target worktree (`git worktree add /tmp/pim-audit-<slug> -b fix/audit-<slug> origin/main`):
- Fix each CONFIRMED finding, **fail-closed**.
- For EVERY fix add a **fail-closed / mutation test** under `src/tests/security/` that FAILS if the fix is reverted (delete the fix line locally, confirm the test goes red, restore).
- Add/append a row to `docs/security/control-matrix.md`: control → RFC → attack → the test that proves it → shipped status.
- `make lint` (single command) + `make test` — all pass. Commit (conventional). Phase → `verify-shipped`.

### verify-shipped
Re-spawn a fresh red-teamer against the FIX BRANCH tip (not main) to confirm each finding is now closed and no regression. If any CONFIRMED finding survives after 3 blue-fix iterations → set target `blocked`, write remaining findings, end. Else phase → `pr`.

### pr
Push; `gh pr create --base main` linking the audited PR(s) + the finding IDs, body listing each finding → fix → mutation test. Post the red-team reports as PR comments. **Never merge** (`gh pr merge`/`--auto`/merge-queue forbidden — owner reviews and merges). Record PR # in state. Phase → `complete`.

### complete
Mark target `done` in audit-queue.md, remove the per-target worktree, delete audit-state.md. `<promise>TARGET COMPLETE</promise>`.

## Rules
- Audit SHIPPED `origin/main`, never a feature branch. Read-only in `redteam`; edits only in `blue-fix` worktrees.
- Every confirmed finding gets a fix AND a fail-closed regression test AND a control-matrix row — no exceptions.
- "Conformance/test green" is NOT evidence unless a gating CI job or hosted-suite run produces it.
- Run `make lint` as a single command; never `--no-verify`. All unit + integration tests must pass — never rationalize a red test.
- Never auto-merge. One workstream per repo. If stuck 3+ iterations: mark `blocked`, clean up, move on.
