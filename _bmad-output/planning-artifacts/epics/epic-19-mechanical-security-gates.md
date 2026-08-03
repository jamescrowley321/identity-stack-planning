---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'EPIC-19-MECHANICAL-GATES'
epic_title: 'Mechanical Security Gates — Deterministic, Non-Gameable Enforcement'
date: '2026-08-02'
status: 'draft'
inputDocuments:
  - _bmad-output/implementation-artifacts/ralph-prompts/RED-BLUE-GATE.md
  - _bmad-output/planning-artifacts/epics/epic-16-audit-remediation.md
---

# Epic 19: Mechanical Security Gates

## Overview

The 2026-08-02 audit found security controls that had **passed an adversarial LLM review** — because the
review saw the task branch (not shipped `main`) and nothing mechanically required a test that fails when a
control is deleted. The first attempt to "harden the gate" added reviewer-checklist prose and a
grep-for-a-filename check. **Both are shallow**: prose relies on the same LLM judgment that already
failed, and a filename grep is gameable (an empty test file passes it).

This epic builds **deterministic, non-gameable gates that fail on the defect class itself**, with no agent
judgment required. The ralph phases (`RED-BLUE-GATE.md`) *invoke* these gates; the LLM red team is a
**second** layer on top, never the primary defense. **Every gate story must be proven by reintroducing the
exact audit finding and demonstrating the gate turns red** — a gate that can't catch the bug it exists for
is theater.

### Grounding — current tooling (2026-08-02)

`Makefile`: `lint` (ruff + pyrefly + coverage), `test`, `conformance-*`, `pre-push`. CI: **`codeql.yml`
already present**, plus `ci.yml`, `conformance.yml`. Ruff `S` (flake8-bandit) rules are on. **Absent:**
mutation testing, Semgrep, reachability/evidence checks. Semgrep adoption is already planned in the FOSS
security migration (planning#49) — this epic gives it teeth with custom rules.

### The gate suite → `make security-gate`

| Gate | Tool | Catches (audit ref) |
|------|------|---------------------|
| G.1 Mutation | mutmut | stranded/untested control — surviving mutant (F0, RT1-F2, RT4 all) |
| G.2 Semgrep rules | semgrep | known bad patterns (RT4-F1/F2/F3, RT1-F1, RT5-F15/F16, spoof header-key) |
| G.3 Reachability | AST / import-linter | fail-open stranded control not wired to `validate_token` (RT1-F1, #478) |
| G.4 Evidence integrity | script | "green theater" — un-gated / static / fabricated results (RT5-F13/F14/F15/F16/F17) |

## Stories

---

### Story G.1: Mutation testing on security-critical modules

```yaml
story_id: G.1
title: "Mutation testing gate for security modules (mutmut)"
epic: EPIC-19-MECHANICAL-GATES
status: draft
priority: critical
estimation: L
```

**User Story**

> As the maintainer,
> I want a mutation-testing gate over the security-critical modules,
> so that any control whose removal no test catches — a stranded or fake-tested control — fails the build
> automatically, instead of relying on a reviewer to notice.

**Description**

Mutation testing mechanically enforces the fail-closed-test rule: it deletes/alters each control line and
checks whether a test fails ("kills the mutant"). A **surviving mutant** on a security line is exactly the
2026-08-02 failure (the stranded alg-downgrade guard, the mTLS SSLContext test that passes with
`load_cert_chain` deleted). Scope: `src/py_identity_model/core/{token_validation_logic,parsers,jwt_helpers,
mtls,dpop,jarm,client_auth}.py`. Run per-PR scoped to **changed** security files (fast); full nightly.

**Deliverables**

1. `mutmut` (or `cosmic-ray`) config scoped to the security modules; `make mutation-security` running it and
   failing on any surviving mutant (or mutation score < 100% on those files).
2. A CI job (per-PR, changed-files-scoped) + a nightly full run; results published as an artifact.
3. Docs in `RED-BLUE-GATE.md`/CONTRIBUTING on reading and killing survivors.

**Acceptance Criteria (Given/When/Then)**

- **AC-G.1.1** Given `algorithms=[alg]` is reintroduced in `build_resolved_config` (the F0/RT4-F1 bug),
  when `make mutation-security` runs, then a mutant survives and the gate fails.
- **AC-G.1.2** Given `load_cert_chain(...)` is removed from `build_mtls_ssl_context` (RT1-F2), when the
  gate runs, then a mutant survives and the gate fails.
- **AC-G.1.3** Given the current `main` security tests, when the gate runs after Epic 16 lands, then zero
  mutants survive on the scoped modules.
- **AC-G.1.4** Given a PR that changes only a non-security module, when CI runs, then the mutation gate is
  scoped to changed files and does not block on unrelated survivors.

---

### Story G.2: Custom Semgrep security ruleset

```yaml
story_id: G.2
title: "Custom Semgrep rules encoding the audit failure classes"
epic: EPIC-19-MECHANICAL-GATES
status: draft
priority: critical
estimation: M
```

**User Story**

> As the maintainer,
> I want custom Semgrep rules that flag the specific anti-patterns the audit found,
> so that a reintroduction of any of them fails CI deterministically — a red team that never gets tired.

**Description**

`.semgrep/identity-security.yml` with rules for each confirmed defect class. Runs in CI as a required
check and via `make semgrep-security`. Complements the existing CodeQL job; realizes the Semgrep adoption
already planned (planning#49).

**Deliverables — rules (each with a test case that must fire):**

1. `pyidm-alg-widening` — assigning `algorithms=[<single-resolved-alg>]` without intersecting the caller
   allowlist (RT4-F1).
2. `pyidm-alg-from-header` — resolving the signing alg from the decoded token header (RT4-F2).
3. `pyidm-verify-disabled` — `options={... "verify_*": False ...}` in non-test code, and a
   `_ENFORCED_VERIFICATION_OPTIONS` set literal missing `verify_aud` (RT4-F3).
4. `pyidm-jwt-decode-no-algorithms` — a PyJWT `decode(...)` call without an explicit caller-bound
   `algorithms=`.
5. `pyidm-header-key-trust` — trusting a `jwk` / `x5c` / `jku` / `x5u` value read from the token header
   (spoof / SSRF-to-attacker-key).
6. `pyidm-insecure-transport` — `require_https=False` / `verify=False` outside `tests/` and `conformance/`.
7. `pyidm-conformance-continue-on-error` — `continue-on-error: true` on a conformance workflow profile step
   (RT5-F15).
8. `pyidm-passing-statuses` — `PASSING_STATUSES` containing `WARNING`/`SKIPPED` (RT5-F16).

**Acceptance Criteria (Given/When/Then)**

- **AC-G.2.1** Given each rule, when Semgrep runs against a fixture containing the anti-pattern, then the
  rule fires (rule unit tests via `semgrep --test`).
- **AC-G.2.2** Given clean `main` (post-Epic-16), when `make semgrep-security` runs, then zero findings.
- **AC-G.2.3** Given the ruleset, when wired into CI, then it is a required check that fails the build on
  any finding.

---

### Story G.3: Stranded-control reachability gate

```yaml
story_id: G.3
title: "Every declared control must be reachable from the public entrypoint"
epic: EPIC-19-MECHANICAL-GATES
status: draft
priority: high
estimation: M
```

**User Story**

> As the maintainer,
> I want a check that every declared security control is actually invoked from `validate_token` (or the
> relevant public entrypoint),
> so that a fail-open stranded control — one that exists but nothing calls — fails the build.

**Description**

`validate_certificate_binding` existed but `validate_token` never called it (RT1-F1); DPoP `cnf.jkt` is the
same (#478). A reachability/call-graph check catches this class. Also flag dead security symbols (e.g.
`build_httpx_cert`) that create false coverage impressions.

**Deliverables**

1. `scripts/check_control_reachability.py` (AST/call-graph) or an `import-linter` contract asserting each
   registered control (a small declared registry: cert-binding, DPoP `cnf.jkt`, strict-aud, alg-allowlist,
   `sub` enforcement) is transitively reachable from its public entrypoint.
2. A "no unreferenced security symbol" check (vulture-style, scoped to the security modules).
3. `make reachability-security`; CI wiring.

**Acceptance Criteria (Given/When/Then)**

- **AC-G.3.1** Given the pre-Epic-16 state (cert-binding not wired to `validate_token`), when the check
  runs, then it fails naming the stranded control.
- **AC-G.3.2** Given the R.2 fix (binding wired), when the check runs, then it passes.
- **AC-G.3.3** Given a dead security symbol, when the check runs, then it is flagged.

---

### Story G.4: Conformance evidence-integrity gate

```yaml
story_id: G.4
title: "Reject 'green theater' — un-gated, static, or unprovenanced conformance results"
epic: EPIC-19-MECHANICAL-GATES
status: draft
priority: high
estimation: M
```

**User Story**

> As the maintainer,
> I want a check that conformance "green" is backed by a gating CI run,
> so that static committed local-suite JSON can never again pass as evidence.

**Description**

Six of nine profiles were green via static committed JSON that no CI job runs, in a repo with a documented
fabricated-results precedent (RT5-F13/F14). This gate makes committed evidence prove itself.

**Deliverables**

1. `scripts/check_conformance_evidence.py`: fail if a `conformance/results/*-latest.json` marks a profile
   passing without a corresponding **gating** CI job that produced it; fail on `continue-on-error` on a
   profile step; fail if `PASSING_STATUSES` counts `WARNING`/`SKIPPED`; verify provenance (`suite_url` +
   CI run id, not a hand-committed local run).
2. `make evidence-integrity`; CI wiring. (Coordinates with Epic 16 R.7, which makes the profiles gating.)

**Acceptance Criteria (Given/When/Then)**

- **AC-G.4.1** Given the current static local-suite result files with no gating job, when the check runs,
  then it fails listing the un-gated profiles.
- **AC-G.4.2** Given profiles CI-gated per R.7, when the check runs, then it passes.
- **AC-G.4.3** Given a `continue-on-error` reintroduced on a profile step, when the check runs, then it
  fails.

---

### Story G.5: `make security-gate` aggregate + CI required check + ralph wiring

```yaml
story_id: G.5
title: "Aggregate the gates, make them a required CI check, and wire ralph to invoke them"
epic: EPIC-19-MECHANICAL-GATES
status: draft
priority: critical
estimation: M
```

**User Story**

> As the maintainer,
> I want one `make security-gate` that runs G.1–G.4 and is a required CI check that ralph invokes,
> so that no security change — by a human or a loop — can merge without passing deterministic gates.

**Description**

Aggregate G.1–G.4 behind `make security-gate` (accepting a `BASE`/changed-files scope for per-PR speed),
add it as a **required** GitHub status check, and rewire the ralph `test`/`pr` phases (`RED-BLUE-GATE.md`)
to invoke it — superseding the interim filename gate shipped in planning PR #58.

**Deliverables**

1. `make security-gate` (composes G.1–G.4; per-PR changed-files scope + full nightly).
2. Required-status-check config in CI; branch protection references it.
3. Update `phases/pr.md` + `phases/test.md` in identity-stack-planning to invoke `make security-gate` and
   fail the phase on non-zero (replaces the grep gate).

**Acceptance Criteria (Given/When/Then)**

- **AC-G.5.1** Given a security PR that fails any sub-gate, when CI runs, then the required check is red and
  the PR cannot merge.
- **AC-G.5.2** Given the ralph `pr` phase on a security diff, when it runs, then it invokes
  `make security-gate` and returns to `test` on failure.
- **AC-G.5.3** Given a non-security PR, when CI runs, then `make security-gate` is a no-op / fast pass.

---

### Story G.6: Property-based fuzzing seed (Hypothesis)

```yaml
story_id: G.6
title: "Hypothesis property tests over the validation path to feed the gates"
epic: EPIC-19-MECHANICAL-GATES
status: draft
priority: medium
estimation: M
```

**User Story**

> As the maintainer,
> I want property-based fuzzing of the token-validation path,
> so that the mutation and coverage gates are fed by inputs a human wouldn't hand-write (permutations of
> `alg`, `kid`, `iss`, `aud`, `sub`, `exp`), surfacing fail-open corners.

**Description**

Add Hypothesis strategies generating malformed/hostile tokens and JWKS across the claim/header space; assert
the invariant "no token that violates a configured restriction is ever accepted." Feeds G.1 (more killed
mutants) and links to the FAPI attacker-model suite (Epic 17).

**Acceptance Criteria (Given/When/Then)**

- **AC-G.6.1** Given the Hypothesis suite, when run, then it explores `alg`/`kid`/`iss`/`aud`/`sub`/`exp`
  permutations and asserts the fail-closed invariant, with a fixed seed for CI reproducibility.
- **AC-G.6.2** Given a reintroduced fail-open (e.g. RT4-F3 `verify_aud`), when the suite runs, then it
  finds a falsifying example.

---

## Shared Requirements

- **Regression demonstration (every gate).** Each gate story's PR MUST show the gate catching the exact
  audit finding it targets (reintroduce → red → revert → green), recorded in the PR body. A gate that
  cannot catch its bug is rejected.
- **Performance.** Per-PR gates scope to changed files; full runs are nightly. `make security-gate` must
  complete in CI budget for a typical security PR.
- **Second-layer LLM review.** The ralph `review` phase and `pim-shipped-audit.md` consume these gate
  reports as inputs; a clean LLM review never overrides a failing mechanical gate, and a missing gate on a
  security diff is itself a BLOCK.

## Dependencies & Sequencing

- G.1–G.4 are independent and can land as separate PRs. **G.5 depends on G.1–G.4.** G.6 augments G.1.
- G.4 coordinates with Epic 16 R.7 (profiles must be gating for the evidence check to pass).
- G.5 supersedes the interim gates in planning PR #58.

## Spec / Tool References

- mutmut — https://mutmut.readthedocs.io ; cosmic-ray (alt) — https://cosmic-ray.readthedocs.io
- Semgrep — https://semgrep.dev/docs/ ; `semgrep --test` for rule unit tests
- import-linter — https://import-linter.readthedocs.io ; vulture (dead code)
- Hypothesis — https://hypothesis.readthedocs.io
- Related: planning#49 (FOSS security migration — Semgrep/CodeQL), Epic 16 (remediation), RED-BLUE-GATE.md
