---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '23'
epic_title: 'Test Hardening — Harder Test Tiers & Coverage'
date: '2026-09-03'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/epics-token-harness.md
  - _bmad-output/planning-artifacts/architecture-token-harness-load-soak.md
  - _bmad-output/planning-artifacts/epics/epic-17-fapi-attacker-model-tests.md
  - _bmad-output/planning-artifacts/epics/epic-19-mechanical-security-gates.md
  - _bmad-output/planning-artifacts/epics/epic-20-pim-parity.md
---

# Epic 23: Test Hardening — Harder Test Tiers & Coverage

## Overview

`identity-model` already has a deep unit tier (~1475 Python unit tests, `respx`-mocked) and a strong mechanical-gate story (the mutmut security gate, Epic 19). The **gaps that remain are all in the harder tiers** — the ones that exercise real providers, the OIDF suite, cross-language behaviour, and the end-to-end resource-server boundary. This epic closes those gaps. It deliberately adds **no new unit tests**; every story lands an integration, conformance, E2E-harness, or cross-language mechanical gate.

**Source of truth for the gaps:** a 2026-09-03 three-way audit of the test tiers (test-tier map + open-issue reconciliation). The findings below are the actionable decomposition of that audit.

**Goal / Definition of Done:** each of the seven gaps below is closed by a merged PR that adds a *gated* harder-tier test (CI-required or nightly-reported, never a one-off script), with the relevant tracking issue closed and the coverage matrix (Story 23.0) updated in the same PR.

### Coverage-gap matrix (what exists vs what this epic adds)

| # | Harder tier | Today | Gap this epic closes | Story | Priority |
|---|-------------|-------|----------------------|-------|----------|
| 1 | OIDF conformance | `basic`/`config`/`form-post` RP profiles gated; FAPI2 ×3, dynamic-reg, RP-init + back-channel logout have config + harness wiring **but no `run_tests.py --plan` invocation** | Wire the configured-but-unrun profiles into gated CI/nightly | **23.1** | P0 |
| 2 | Cross-language spec vectors | `spec-coverage` enforces 100% — but only `validation.json` (1 of 10 capabilities) has executable vectors | Make the other 9 capabilities executable across py/go/rust | **23.2** | P0 |
| 3 | Integration / harness (middleware) | New auth-bypass bugs #598–601 have unit reproducers only | Drive them through the booted RS (WebSocket auth, excluded-path subpath, login-router, error-text) | **23.3** | P0 |
| 4 | Integration / harness (rotation) | Injectable `discovery_policy` rotation/retry (#585) proven only at unit + mutation tier | Real-IdP key-rotation through the harness with an injected policy | **23.4** | P1 |
| 5 | E2E harness (cross-language) | Token-blaster harness + OIDF conformance are Python-RP only | Boot Go & Rust as resource servers; run the forged corpus + correctness matrix against them | **23.5** | P1 |
| 6 | Mechanical gate (cross-language) | mutmut is Python + changed-lines-only; no nightly full run; Go/Rust have no mutation gate | Nightly full-surface Python mutation + a Go/Rust security mutation gate; Go/Rust coverage floors | **23.6** | P1 |
| 7 | Real-provider breadth | Rust integration = node-oidc only; IdentityServer has no Python leg | Rust Keycloak+IdentityServer legs; Python IdentityServer leg | **23.7** | P2 |

### GitHub tracking

Epic issue **identity-model#614**. Stories: 23.1 → #607, 23.2 → #608, 23.3 → #609, 23.4 → #610, 23.5 → #611, 23.6 → #612, 23.7 → #613. (Story 23.0, the living matrix, is tracked inline on the epic.)

### Relationship to existing epics (this epic extends, it does not duplicate)

- **Token-Blaster harness (GH #462 / `epics-token-harness.md`)** — TH-1 foundation shipped (booted RS, forged corpus, correctness matrix, Locust). 23.3/23.4/23.5 build **on** that harness; they do not re-lay the foundation.
- **PIM Parity (Epic 20 / GH #573)** — adds capabilities and *unit-level* spec vectors. 23.2 supplies the **executable cross-language enforcement** the parity epic already assumes exists; 23.5/23.6 add the cross-language *harder* tiers parity leaves unaddressed.
- **Mechanical Security Gates (Epic 19 / GH #511, #592)** — established the Python mutmut gate. 23.6 extends it to nightly-full and to Go/Rust.
- **RP Certification (GH #242 / #475)** — 23.1 executes the FAPI2/logout/dynamic-reg profiles that certification needs evidence from.

## Priority ordering

P0 first: **23.1** (configured profiles we already support but never run — highest value/effort ratio), **23.3** (security-critical, covers *active* auth-bypass bugs), **23.2** (the enforcement backbone the whole parity epic leans on). Then P1: **23.4** (the freshly-found rotation gap), **23.5** (cross-language E2E — the biggest lift), **23.6** (mutation-at-scale). **23.7** (P2) is real-provider breadth, valuable but not blocking.

---

## Story 23.0: Harder-tier coverage matrix (living artifact)

### User Story

**As a** maintainer sequencing test-hardening work,
**I want** a single living matrix of harder-tier coverage (conformance profile × gated?, spec capability × executable-per-language, harness RS × language),
**So that** "is this tier actually gated?" has one source-verified answer instead of scattered CI YAML.

### Acceptance Criteria

**Given** the audit findings,
**When** the matrix is authored (e.g. `docs/security/harder-tier-coverage.md` or a section of the existing control matrix),
**Then** it lists each OIDF profile (gated / configured-only / absent), each `spec/conformance/*.json` capability (executable vectors per py/go/rust), and each harness resource server (py / go / rust), each cell linked to its make target + CI job or the story that adds it.

**Given** a harder-tier gate lands,
**When** its PR merges,
**Then** the matrix cell flips in the same PR (merge-gate artifact, not periodically reconciled).

---

## Story 23.1: Execute the configured-but-unrun OIDF conformance profiles

### User Story

**As a** certification owner,
**I want** the FAPI 2.0 (rp / mtls / message-signing), dynamic-registration, RP-initiated-logout, and back-channel-logout OIDF plans actually *run* against the suite in CI/nightly,
**So that** the profiles we ship config + harness wiring for produce real conformance evidence instead of sitting dormant.

### Acceptance Criteria

**Given** `conformance/configs/` already ships `fapi2-rp.json`, `fapi2-mtls-rp.json`, `fapi2-message-signing-rp.json`, `dynamic-rp.json`, `rpinitiated-logout-rp.json`, `backchannel-logout-rp.json` and the harness supports them (`conformance/tests/test_fapi2_flow.py`, callback handling),
**When** make targets + a workflow invoke `run_tests.py --plan` for each,
**Then** each plan create/run/export completes green against the hosted or local OIDF suite, and the exported evidence zip is uploaded as a CI artifact.

**Given** a profile is proven runnable,
**When** it is wired into the `conformance` workflow,
**Then** it runs at least nightly (report-and-upload) and the FAPI2 + logout profiles are gated on releases the same way `basic`/`config`/`form-post` already are (a red profile blocks the tag).

**Given** the correct-course reality that some profiles need secrets (mTLS keys) or the hosted suite,
**When** those preconditions are absent,
**Then** the job **skips explicitly with a logged reason** (never silent-passes), and the coverage matrix (23.0) records "configured, nightly-only" vs "release-gated".

**Depends on:** none. **Extends:** GH #471, #472, #473, #475. **Size:** L.

---

## Story 23.2: Executable cross-language spec vectors for the 9 descriptive-only capabilities

### User Story

**As a** maintainer relying on `spec-coverage` to prevent cross-language drift,
**I want** `discovery`, `jwks`, `dpop`, `userinfo`, `introspection`, `revocation`, `token-exchange`, `authorization-code`, and `client-credentials` vectors to be **executable** (not descriptive) and run by all three language runners,
**So that** the "100% coverage" gate means 100% of the capability surface, not 100% of `validation.json` alone.

### Acceptance Criteria

**Given** today only `spec/conformance/validation.json` has executable vectors (12+1 native) and the other 9 files are descriptive-only,
**When** each capability's vectors are made executable (reusing the existing `spec/test-fixtures/` corpora — esp. `dpop/`, `token-exchange/`),
**Then** the Python (`test_spec_conformance.py`), Go (`go/internal/conformance`), and Rust (`rust/tests/spec_conformance.rs`) runners each execute every executable vector id, and `tools/spec_coverage_gate.py` asserts 100% per language across **all 10 capabilities**.

**Given** a language cannot yet execute a vector,
**When** the gate runs,
**Then** it fails closed for that capability/language pair (a missing runner anchor is a red gate, not a skipped row) — so parity gaps are visible, not hidden.

**Given** the parity epic (GH #573/#574–577) adds new normative checks (duplicate-kid try-all, id-vs-access discrimination, at_hash/c_hash),
**When** those land,
**Then** their spec vectors ride this executable harness rather than each language's hand-written tests.

**Depends on:** confirm the `spec-coverage` executor is landed (memory flags CONS-1.5 / PR #549 as closed-unmerged — verify first; if the Rust executor gate is absent, re-land it as the first task of this story). **Extends:** GH #573. **Size:** L.

---

## Story 23.3: Integration + harness coverage for the middleware auth-bypass regressions

### User Story

**As a** security-conscious adopter of the FastAPI middleware,
**I want** the auth-bypass regressions (#598 WebSocket routes unauthenticated, #599 login-router blocked, #600 excluded-path subpath un-auths nested routes, #601 error-text leak) proven **through the booted resource server**,
**So that** the fixes are enforced at the ASGI boundary, not just by a unit reproducer that could drift from real middleware wiring.

### Acceptance Criteria

**Given** the token-blaster harness boots `rs_app.py` under a real uvicorn worker (`test_rs_boot.py`),
**When** WebSocket routes, nested routes under an excluded prefix, the login router, and error responses are driven with valid/forged/absent credentials,
**Then** the RS rejects unauthenticated WebSocket upgrades, does not un-auth `/{excluded}extra` sibling paths, lets the login router through as designed, and never echoes token material in error text — each asserted over the wire.

**Given** these are security regressions,
**When** the harness tests are added,
**Then** they run in the `integration-tests-*` / harness CI jobs (required), and #598–601 are closed with the proving test named in the close comment.

**Depends on:** the #598–601 fixes landing in the middleware. **Extends:** GH #470 (older-batch backfill), closes coverage for #598–601. **Size:** M.

---

## Story 23.4: Real-IdP harness coverage for injectable `discovery_policy` rotation & retry

### User Story

**As an** adopter injecting a non-default `DiscoveryPolicy` on the cached path (#585),
**I want** the key-rotation refresh and signature-failure retry proven through the harness against a real HTTP OP,
**So that** the injected policy is shown to govern *every* fetch end-to-end, not only at the unit + mutation tier.

### Acceptance Criteria

**Given** the harness `mock_op.py` can rotate its signing key on command and serve over real loopback HTTP,
**When** a validation runs through the booted RS with an injected policy that admits an endpoint the strict default would reject, and the OP rotates its key mid-flight,
**Then** the kid-miss refresh and the signature-failure retry both re-fetch under the injected policy and the rotated token validates — asserted over the wire (the unit-tier proof of this is `py/src/tests/unit/test_discovery_policy_rotation_paths.py`; this story lifts it to the real-HTTP tier).

**Given** the injected policy is stricter than the caller's `require_https` bool,
**When** the two disagree,
**Then** the harness confirms the policy wins on the rotation/retry paths (integration-level precedence proof).

**Depends on:** #585 merged. **Extends:** GH #462, #470. Relates to #585. **Size:** M.

---

## Story 23.5: Boot Go & Rust as resource servers in the token-blaster harness

### User Story

**As a** maintainer of a polyglot library,
**I want** the Go and Rust validators driven through the same E2E harness the Python RS uses (forged-token corpus + correctness matrix + cross-issuer rejection),
**So that** "the harder tiers are Python-only" stops being true and cross-language behaviour is proven at the resource-server boundary, not just by unit tests.

### Acceptance Criteria

**Given** the harness forged-token corpus (`corpus.py`) and mock OP,
**When** a minimal Go resource server and a minimal Rust resource server (each mounting that language's validation) are booted under real HTTP,
**Then** each rejects every `library_rejects` corpus entry and accepts valid tokens, run via `make test-harness-{go,rust}` and gated in CI.

**Given** the cross-issuer rejection test (`test_cross_issuer_real_idps.py`) exists for Python,
**When** the Go/Rust resource servers are added,
**Then** the same real-issuer-A-token-rejected-by-server-B assertion runs for all three languages.

**Given** the size of this lift,
**When** it is scheduled,
**Then** it may split into 23.5a (Go RS) and 23.5b (Rust RS); Go first (broader capability coverage today).

**Depends on:** 23.2 (shared vectors help scope the RS assertions). **Extends:** GH #462, #573. **Size:** XL.

---

## Story 23.6: Cross-language mutation & mechanical gates

### User Story

**As a** security owner who trusts mechanical gates over exhortation,
**I want** a nightly full-surface Python mutation run plus a Go/Rust security-module mutation gate, and a coverage floor for Go/Rust,
**So that** the "mechanical gates, all languages" posture is real and pre-existing mutation debt on untouched security lines is measured.

### Acceptance Criteria

**Given** the PR mutmut gate is changed-lines-only by design,
**When** a nightly full-surface mutmut job is added,
**Then** it runs over all `SECURITY_MODULES` (report-and-track, non-blocking), surfacing the mutation debt on lines no recent PR touched.

**Given** #576/#577 add security-relevant validators to Go/Rust with no mechanical gate,
**When** a Go mutation gate (`go-mutesting` or `gremlins`) and a Rust mutation gate (`cargo-mutants`) are piloted on the security packages,
**Then** they run in CI (at least report-only first, then gating on the security packages) mirroring the Python `security-gate` contract.

**Given** the 80% coverage floor is Python-unit-only,
**When** a Go (`go test -cover`) and Rust (`cargo llvm-cov`) floor are wired into CI,
**Then** each language enforces a documented minimum, and the coverage matrix records it.

**Depends on:** none (nightly-Python is independent; Go/Rust gates can follow #576/#577). **Extends:** GH #511, #592, #573. **Size:** L.

---

## Story 23.7: Cross-language real-provider integration breadth

### User Story

**As an** adopter choosing Rust or the Python IdentityServer path,
**I want** Rust integration to run against Keycloak and IdentityServer (not just node-oidc), and a Python IdentityServer leg,
**So that** real-provider coverage does not silently thin out by language or leave a provisioned provider untouched.

### Acceptance Criteria

**Given** Rust live integration is node-oidc-only while Go covers node-oidc + IdentityServer and Python covers five providers,
**When** Keycloak and IdentityServer legs are added to the Rust suite (reusing `infra/` docker fixtures + `.env.*` profiles),
**Then** `make test-integration-rust` exercises all three IdPs and the `integration-tests-rust` CI job runs the credential-free legs.

**Given** `infra/identityserver/` + `.env.identityserver` exist and are exercised only by Go,
**When** a `make test-integration-identityserver` Python target is added,
**Then** the Python suite validates against IdentityServer too.

**Depends on:** none. **Extends:** GH #578, #579, #573. **Size:** M.

---

## Dependencies

| Story | Depends on | Blocks |
|-------|-----------|--------|
| 23.0 matrix | — | (living; touched by all) |
| 23.1 conformance profiles | — | #242 cert evidence |
| 23.2 spec vectors executable | verify `spec-coverage` executor landed (CONS-1.5) | 23.5 |
| 23.3 auth-bypass harness | #598–601 fixes | — |
| 23.4 policy rotation harness | #585 merged | — |
| 23.5 Go/Rust RS in harness | 23.2 | — |
| 23.6 cross-language mutation | #576/#577 (for Go/Rust gates) | — |
| 23.7 provider breadth | — | — |

## Dependency graph

```
23.0 (matrix, living) ──────────────── updated by every story
                                        
P0:  23.1 ─┐   23.3 ─┐   23.2 ─┬─────► 23.5 (P1)
           │         │         │
P1:        └─► 23.4  └─►(#598-601)   23.6   23.7 (P2)
```

### Execution priority

1. **23.1** — highest value/effort: run profiles we already support.
2. **23.3** — security-critical, covers active bugs #598–601.
3. **23.2** — parity enforcement backbone (verify the executor first).
4. **23.4** — closes the freshly-found injectable-policy rotation gap.
5. **23.5** — cross-language E2E (biggest lift; split Go/Rust).
6. **23.6** — mutation-at-scale + Go/Rust gates.
7. **23.7** — real-provider breadth (P2).

## Execution

Ralph loop prompt: `_bmad-output/implementation-artifacts/ralph-prompts/pim-test-hardening.md`. It runs the stories as a **PR stack** (each story branches off the previous; owner merges bottom-up) and **never merges** — the loop opens PRs and posts review evidence only. Externally-blocked stories (23.4 needs #585 merged; 23.3 needs #598–601 fixed) sit at the top of the stack so they don't gate the independent ones. Launch recipe and merge policy are in the prompt's header. One identity-model loop at a time.

## References

- Audit (2026-09-03): test-tier map + open-issue reconciliation (this epic's `inputDocuments`).
- GH tracking issues: #462 (harness), #471–473/#475 (conformance/cert), #573–579 (parity), #511/#592 (mutation gate), #585 (injectable discovery policy), #598–601 (middleware auth-bypass).
- OIDF profiles: `conformance/configs/*.json`; runner `conformance/run_tests.py`.
- Cross-language vectors: `spec/conformance/*.json`; gate `tools/spec_coverage_gate.py`; CI `spec-vector-coverage`.
