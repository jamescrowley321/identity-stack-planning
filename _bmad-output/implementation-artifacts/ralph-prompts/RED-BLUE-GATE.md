# Red/Blue-Team Gate — how this workspace hardens security-critical work

This document defines the red/blue-team model layered onto the ralph harness. It exists because a
real failure happened: the FAPI 2.0 batch (py-identity-model #479–#483, v3.4.3–v3.8.0) shipped with a
**stranded** algorithm-downgrade guard, a **fail-open** mTLS cert-binding path, and conformance "green"
that **no CI job actually runs** — while the existing gate reported everything done. A fresh-context
audit on 2026-08-02 found all of it. This gate is the institutional fix.

## Why the old gate leaked (root causes)

1. **It reviewed the task branch, never the code that shipped to `origin/main`.** `phases/review.md`
   diffs `origin/<base>...HEAD` on the ralph task branch. Reviewers passed a branch that *had* the
   control; the merge was later re-authored as clean PRs and the control was dropped in the rewrite.
   Nobody ever red-teamed the shipped code. → **Detection layer** (below) fixes this.
2. **No fail-closed / mutation test was mandated.** The gate checked that *a* test file was touched,
   not that a test exists which **fails if the control line is deleted**. Stranded/unwired controls
   pass because nothing exercises their *absence*. → **Blue-team artifact** fixes this.
3. **"Conformance green" was self-attested.** Six of nine profiles are run by no CI workflow; their
   green is static local-suite JSON. → **Evidence-integrity check** fixes this.
4. **The queue drifted.** Finished tasks stayed `pending`; a gate that trusts the queue inherits the
   lie. → **Queue reconcile** fixes this.

## The model: two layers

### Prevention — inside the feature loop (per task, before merge)
- **Red team:** the existing adversarial reviewers (`review-agents/`: blind-hunter, edge-case-hunter,
  acceptance-auditor, sentinel, viper), now with a sharper Sentinel checklist for identity libraries
  (fail-open/stranded controls, RS-side sender-constraint enforcement, evidence integrity). See
  `phases/review.md` + `review-agents/sentinel.md`.
- **Blue team:** `phases/review-fix.md` fixes findings AND `phases/test.md` now mandates a **fail-closed
  test** for every security control — a test that FAILS if the control is removed (mutation-style).
  `phases/pr.md` gates on it for security-labeled tasks.

### Detection — after merge, against shipped `origin/main` (the layer that was missing)
- **`pim-shipped-audit.md`** is a standalone red/blue loop that audits the code that *actually shipped*.
  For each recently-merged security PR it spawns a fresh-context red-teamer against `origin/main` and
  confirms every claimed control is **present, wired into the public API, and fail-closed, with a
  mutation test proving it** — then blue-teams fixes as PRs. This is the institutionalized form of the
  2026-08-02 audit. Run it after every security merge batch (one workstream per repo — never in
  parallel with the feature loop).

## The red-team checklist (identity libraries)

A security control is **not** done until a red-teamer confirms, against shipped `origin/main`:
1. **Wired, not stranded** — the control is INVOKED by the public API path a normal caller uses
   (`validate_token`, middleware, the client request path), not opt-in dead code nothing calls.
2. **Fail-closed** — missing/malformed input is rejected, not silently accepted.
3. **RS-side sender-constraint enforced** — cert-binding (`cnf.x5t#S256`), DPoP (`cnf.jkt`), and
   caller algorithm/audience restrictions are enforced by `validate_token`, not just offered as helpers.
4. **Complete** — wired across all relevant grants/paths (auth-code, refresh, client-credentials) and
   both sync + async.
5. **Mutation-tested** — deleting the control line turns a test red.
6. **Evidence is real** — any "conformance/test green" is produced by a **gating** CI job or a
   hosted-suite run with provenance, not self-attested static artifacts.

## The blue-team artifact

Every confirmed red-team finding produces, in the target repo:
- the fix, and
- a **fail-closed regression test** under `src/tests/security/` (py-identity-model) that fails if the
  fix is reverted, and
- a row in `docs/security/control-matrix.md`: control → RFC → attack → the test that proves it →
  shipped status.

"Green conformance" is necessary but **never sufficient** — the control matrix + fail-closed tests are
the durable proof.

## Mechanical enforcement (the real gate)

Reviewer prose and a filename check are **not** gates — they rely on the same judgment that already failed,
and a grep is gameable. The primary defense is deterministic machinery that fails on the defect class
itself, with no agent in the loop, built in **Epic 19 (Mechanical Security Gates)** and invoked by the
phases above via `make security-gate`:

1. **Mutation testing** (mutmut) on the security modules — a surviving mutant means a control you can delete
   with no test noticing (the stranded alg-guard / mTLS-SSLContext bug), caught automatically.
2. **Custom Semgrep rules** encoding each audit anti-pattern (`algorithms=[alg]` widening, alg-from-header,
   `verify_*` disabled, trusting a header `jwk`/`x5c`/`jku`, conformance `continue-on-error`) — a tireless
   red team.
3. **Reachability check** — every declared control must be invoked from `validate_token`; a stranded
   control fails the build.
4. **Evidence-integrity check** — conformance "green" that no gating CI job produced fails.

Each gate is proven by reintroducing the exact audit finding and watching it turn red. The LLM red team
(the `review` phase, `pim-shipped-audit.md`) is the **second** layer that triages and extends the
mechanical findings — it never overrides a failing gate, and a missing gate on a security diff is a BLOCK.
