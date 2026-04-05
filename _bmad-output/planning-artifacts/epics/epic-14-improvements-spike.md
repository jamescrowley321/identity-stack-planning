---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '14'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 14: Improvements Spike — Quality, Security & Examples Deep Dive

**Goal:** Time-boxed research spikes to evaluate and plan the following improvement areas. Each spike produces a recommendation document that feeds into future epics. No implementation in this epic — planning only.

## Overview

These are the known gaps that warrant investigation before committing to full epics. Each story is a spike: research, evaluate, recommend, estimate. The output of each spike is a decision document with "do it / defer it / skip it" and, if "do it", a rough story breakdown for a future epic.

---

### Story 14.1: Spike — Threat Model & Security Considerations

> **Scheduling Note:** While this story is structured as a spike within Epic 14, threat modeling for an identity/security library is a foundational concern. This story SHOULD be scheduled as a prerequisite to Core Tier implementation (Epics 1-4), not deferred to post-launch. The STRIDE analysis and attack surface mapping directly inform validation logic, error handling, and security boundaries in every language implementation.

As a **project maintainer**,
I want a STRIDE threat model of the identity-model library,
So that we identify and address security risks before they become vulnerabilities.

**Scope:**

Research and document:
- **STRIDE analysis** of every protocol operation (discovery, JWKS, validation, token flows)
- **Algorithm confusion attacks** — can a caller be tricked into accepting alg=none or HMAC when RSA expected?
- **Key confusion attacks** — can a malicious JWKS cause wrong key selection?
- **SSRF via discovery URLs** — can a crafted issuer URL cause the library to fetch internal resources?
- **Cache poisoning** — can stale/malicious discovery docs or JWKS persist in cache?
- **Claim injection** — can crafted tokens inject unexpected claims that downstream code trusts?
- **Timing attacks** — are token comparisons, HMAC verification, and signature checks constant-time?
- **RFC security sections review** — RFC 6749 §10, RFC 7519 §11, RFC 7515 §10, RFC 8725 (JWT BCP) — document which considerations we address and which we defer
- **CVE response playbook** — disclosure process, patch timeline SLAs, GHSA advisory format, backport policy

**Acceptance Criteria:**

**Given** the completed threat model
**When** reviewed against OWASP and RFC security sections
**Then** every identified threat has a status: mitigated, accepted-with-rationale, or planned-for-future

**Given** the CVE response playbook
**When** a vulnerability is reported
**Then** the team has a step-by-step process with SLA commitments

- [ ] **Deliverable:** `docs/security/threat-model.md` with STRIDE analysis
- [ ] **Deliverable:** `docs/security/rfc-security-review.md` mapping each RFC security section to our implementation
- [ ] **Deliverable:** `docs/security/cve-playbook.md` with response process
- [ ] **Recommendation:** Which findings need immediate stories vs. future work

---

### Story 14.2: Spike — Property-Based & Mutation Testing

As a **project maintainer**,
I want to evaluate advanced testing techniques,
So that we catch bugs that conventional unit tests miss.

**Scope:**

Research and evaluate per language:

**Property-based testing:**
- Python: `hypothesis` — generate random JWTs, discovery docs, JWKS, claim sets
- Node: `fast-check` — same approach for TypeScript
- Go: `rapid` or `gopter` — property tests for Go
- Rust: `proptest` or `quickcheck` — property tests for Rust
- Key properties to test: "any valid JWT signed with the right key passes validation", "any JWT with wrong issuer fails", "any expired JWT fails regardless of other claims", "discovery document round-trips correctly"

**Mutation testing:**
- Python: `mutmut` or `cosmic-ray`
- Node: `stryker-js`
- Go: `go-mutesting` or `gremlins`
- Rust: `cargo-mutants`
- Focus: JWT validation logic, claim checking, signature verification — the security-critical paths

**Evaluate:**
- CI integration feasibility (mutation testing is slow — nightly only?)
- ROI — will this actually catch bugs our current approach misses?
- Coverage thresholds — what mutation score is realistic?

**Acceptance Criteria:**

**Given** the evaluation report
**When** the team decides on adoption
**Then** there's a clear recommendation per language with estimated CI time impact

- [ ] **Deliverable:** Evaluation report with per-language tool recommendations
- [ ] **Deliverable:** Sample property tests for JWT validation in one language (proof of concept)
- [ ] **Recommendation:** Adopt / defer / skip per technique per language

---

### Story 14.3: Spike — End-to-End Example Applications

As a **project maintainer**,
I want to plan comprehensive example applications,
So that developers can see identity-model in a real context, not just code snippets.

**Scope:**

Research and plan:

**Per-language example apps:**
- Python: FastAPI app with token validation middleware, protected routes, refresh token handling
- Node: Express app with identity-model middleware, protected API, session management
- Go: Chi or Echo app with identity-model middleware, protected handlers
- Rust: Axum app with identity-model extractor/middleware, protected routes

**Multi-provider examples:**
- Same app authenticating against 3 different IdPs (Descope, Keycloak, Auth0 or Ory)
- Demonstrate that zero code changes are needed to switch providers
- Docker Compose with IdP included for each example

**Error handling cookbook:**
- Common failures: expired token, wrong issuer, rotated keys, network timeout, cache stale
- Per-language code showing how identity-model surfaces each error and how to handle it
- Troubleshooting guide format

**Evaluate:**
- Can examples double as integration tests? (run in CI against node-oidc-provider)
- How to keep examples in sync with library changes (CI that builds examples on every PR?)
- Hosted demo possibility? (GitHub Codespaces dev container that runs the example)

**Acceptance Criteria:**

**Given** the example app plan
**When** a developer looks for "how to use identity-model with FastAPI"
**Then** there's a complete, runnable example they can clone and run in <5 minutes

- [ ] **Deliverable:** Example app specification per language (scope, routes, features)
- [ ] **Deliverable:** Multi-provider demo architecture
- [ ] **Deliverable:** Error handling cookbook outline
- [ ] **Recommendation:** Prioritized list of which examples to build first

---

### Story 14.4: Spike — API Compatibility & Breaking Change Detection

As a **project maintainer**,
I want automated API compatibility checking in CI,
So that breaking changes are caught before release, not after.

**Scope:**

Research per language:

**Tools:**
- Python: `pyrefly` (already used), `griffe` for API diff, or `semgrep` custom rules
- Node: `@microsoft/api-extractor` — generates API reports, diffs between versions, blocks breaking changes
- Go: `apidiff` (golang.org/x/exp/cmd/apidiff) — compares Go API surface between commits
- Rust: `cargo-semver-checks` — lint for semver violations against published crate

**Evaluate:**
- Can these run in CI on every PR? Performance impact?
- How do they handle intentional breaking changes (major version bumps)?
- Do they catch behavioral changes or only signature changes?
- Integration with the versioning strategy (Epic 13)

**Acceptance Criteria:**

**Given** a PR that removes a public function
**When** CI runs the API compatibility check
**Then** the PR is blocked with a clear message about the breaking change

- [ ] **Deliverable:** Per-language tool evaluation with CI integration plan
- [ ] **Deliverable:** Proof of concept in one language
- [ ] **Recommendation:** Adopt / defer per language with estimated setup effort

---

### Story 14.5: Spike — OpenSSF Scorecard & Supply Chain Hardening

As a **project maintainer**,
I want to evaluate OpenSSF best practices and supply chain security,
So that identity-model meets the highest standards for open source security trust.

**Scope:**

Research and evaluate:

**OpenSSF Scorecard:**
- Run `scorecard` against the repo — what's our current score?
- What changes are needed to reach 8+/10?
- Automated scorecard in CI via `scorecard-action`

**OpenSSF Best Practices Badge:**
- Review criteria: https://www.bestpractices.dev/en/criteria/0
- Gap analysis: what do we already meet, what's missing?
- Estimate effort to reach passing, silver, gold levels

**SLSA Build Provenance:**
- npm: `--provenance` flag (SLSA L3)
- PyPI: trusted publishing via GitHub Actions OIDC
- Go: `cosign` + `sigstore` for module verification
- Rust: `cargo-vet` + `sigstore` for crate provenance
- What level can we realistically achieve per language?

**Reproducible builds:**
- Can each language produce bit-for-bit reproducible artifacts?
- What's required per ecosystem?

**Acceptance Criteria:**

**Given** the OpenSSF evaluation
**When** the team reviews the gaps
**Then** there's a prioritized roadmap to reach target score/badge level

- [ ] **Deliverable:** Current OpenSSF Scorecard results + gap analysis
- [ ] **Deliverable:** Best Practices Badge gap analysis with effort estimates
- [ ] **Deliverable:** SLSA provenance plan per language
- [ ] **Recommendation:** Target levels and timeline

---

### Story 14.6: Spike — Multi-Provider Conformance Testing

As a **project maintainer**,
I want to evaluate testing against multiple real OIDC providers,
So that we prove provider independence beyond just node-oidc-provider.

**Scope:**

Research and plan:

**Additional test providers:**
- Keycloak (Docker) — popular enterprise IdP, complex claim structures
- Ory Hydra (Docker) — lightweight, standards-compliant
- Mock "misbehaving" provider — intentionally returns bad issuer, expired JWKS, wrong kid, invalid signatures
- Cloud providers (optional, CI cost): Auth0 dev tenant, Okta dev tenant

**Evaluate:**
- Docker Compose setup for multi-provider test suite
- CI cost and time — can we run against all providers on every PR, or nightly only?
- Which providers test different edge cases? (Keycloak has non-standard claim structures, Hydra is strict)
- Chaos testing patterns — inject network failures, cache races, key rotation during validation

**Acceptance Criteria:**

**Given** the multi-provider plan
**When** implemented
**Then** every language is tested against at least 3 OIDC providers in CI

- [ ] **Deliverable:** Provider matrix (which providers test which edge cases)
- [ ] **Deliverable:** Docker Compose multi-provider architecture
- [ ] **Deliverable:** CI strategy (per-PR vs nightly vs manual)
- [ ] **Recommendation:** Which providers to add first, estimated CI cost

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 14.1 (Threat Model) | None — can start immediately, high priority |
| 14.2 (Testing) | Epic 1-4 (need code to test against) |
| 14.3 (Examples) | Epic 1-4 (need libraries to demonstrate) |
| 14.4 (API Compat) | Epic 13 (versioning strategy informs breaking change policy) |
| 14.5 (OpenSSF) | Epic 8 (security pipeline provides foundation) |
| 14.6 (Multi-Provider) | Epic 0a (test infra), Epic 1-4 (need implementations) |

## Spike Principles

1. **Time-boxed** — Each spike is 2-3 days max. Produce a recommendation, not a thesis.
2. **Decision-oriented** — Every spike ends with "do it / defer it / skip it" and rough effort estimate.
3. **Proof of concept** — Where possible, build a small PoC in one language to validate the approach.
4. **Feed the backlog** — Each "do it" recommendation becomes stories in a new epic.
