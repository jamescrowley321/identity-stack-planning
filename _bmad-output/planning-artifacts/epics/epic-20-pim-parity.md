---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '20'
epic_title: 'PIM Parity — Capability Matrix, Gap Decomposition & Architecture Decision'
date: '2026-08-12'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - docs/identity-model-reconciliation-2026-08-12.md
  - _bmad-output/planning-artifacts/epics/epic-5-extended-tier.md
---

# Epic 20: PIM Parity — Capability Matrix, Gap Decomposition & Architecture Decision

## Overview

`py-identity-model` (PIM) is the OIDF-certified reference implementation and **the source of truth — for both the feature set and the implementation**. This epic brings the Go and Rust ports of `identity-model` to **behavioral** parity with PIM — the same capability set, the same normative security checks, the same provider quirks — measured by an explicit capability matrix and a normative-behavior audit, decomposed into per-language implementation gaps.

> **Consolidation (deferred):** PIM will eventually merge into this monorepo as `python/` to avoid duplicating conformance/integration test infra, collapsing to one harness across `{python, go, rust}`. That is deliberately deferred until identity-model is more mature; until then PIM stays its own repo and remains the reference.

It does **not** mandate mirroring PIM's Python file layout (see the Architecture Decision below). Full verified state, the matrix, and the audit live in [`docs/identity-model-reconciliation-2026-08-12.md`](../../../docs/identity-model-reconciliation-2026-08-12.md); this epic is the actionable decomposition.

## Architecture Decision (ADR) — keep the flat idiomatic shape

**Decision:** adopt PIM's *behavioral* parity, not its *structural* layering. Do **not** port PIM's `core/` + `sync/` + `aio/` three-layer split or its runtime `is_successful`-guarded `X(XRequest)→XResponse` response contract into Go/Rust.

This decision is **narrow and structural only** — PIM remains the source of truth for features and implementation behavior (see Overview). The ports diverge from PIM *solely* in file/module layout, never in what they do or which checks they enforce.

**Rationale:**
- PIM's `sync/`+`aio/` split exists only because Python has two disjoint runtimes. Go has one concurrency model; Rust is async-native (tokio). A sync/async split would be un-idiomatic churn.
- PIM's `_GuardedResponseMixin` runtime guard re-creates at runtime what Go's `(T, error)` and Rust's `Result<T, E>` give at the type level (Rust's at compile time — strictly stronger). Re-expressing it as a guarded struct would be weaker and non-idiomatic.
- A `core/`-vs-transport split has marginal testability value but is not worth a repo-wide refactor of shipped code; leave it as a per-module option.

Parity is measured by the matrix (Story 20.1) + the normative audit (Story 20.2), not by Python-layout mirroring.

## Priority ordering

Security-normative behaviors (Story 20.2) come first — they are gaps in already-shipped, public code. Then the biggest capability gap, Rust Extended tier (decomposed in Epic 5 as stories 5.1-rust … 5.4-rust; loop prompt `identity-model-rust-extended.md`). Then Go's PIM-only advanced capabilities (Story 20.4).

---

## Story 20.1: Capability Parity Matrix (living artifact)

### User Story

**As a** maintainer sequencing cross-language work,
**I want** a single living capability × {PIM, Go, Rust} matrix kept in `spec/`,
**So that** every planning decision references one verified source of truth instead of drift-prone task queues.

### Acceptance Criteria

**Given** the verified capability inventory,
**When** the matrix is authored in `spec/parity-matrix.md` (or merged into `spec/capabilities.md`),
**Then** it lists every Core/Extended/Advanced capability as a row with a per-language status (`implemented` / `planned` / `n/a`), matches the source-verified reconciliation report, and links each cell to its module or tracking issue.

**Given** a capability ships in any language,
**When** its PR merges,
**Then** the matrix cell is flipped in the same PR (the matrix is a merge-gate artifact, not a periodically-reconciled one).

**Given** any reader,
**When** they consult the matrix,
**Then** the Extended-tier Rust gap (introspection, revocation, token-exchange, DPoP) and the advanced PIM-only gaps (device-auth, PAR, JAR, JARM, private_key_jwt, dynamic-reg, logout, FAPI2, mTLS, ClaimsPrincipal) are visible at a glance.

---

## Story 20.2: Normative Security-Behavior Parity (Go + Rust)

### User Story

**As a** security-conscious adopter,
**I want** the Go and Rust ports to enforce every normative security behavior PIM enforces,
**So that** choosing a language does not silently downgrade my security posture.

### Acceptance Criteria

**Given** the normative-behavior audit (four gaps found in both languages),
**When** the hardening work lands,
**Then** each of the following is enforced in **both** Go and Rust, with tests, and is opt-in / backward-compatible where a default-on check could break a legitimate integration:

1. **RFC 9207 authorization-response `iss` validation** + constant-time callback `state` validation — introduces a callback-validation surface (`ValidateCallback`/equivalent) that neither library has today; a present `iss` is always validated; present-but-empty is rejected; absent fails when `authorization_response_iss_parameter_supported` or the caller requires it.
2. **Discovery endpoint-authority binding** — every advertised endpoint must share authority with the issuer/fetch-URL, with PIM's exemptions (mTLS aliases per RFC 8705 §5, `additional_endpoint_base_addresses`) and IP-literal hardening (reject private/loopback/link-local/metadata `169.254.169.254`/reserved targets). Authority compare case-folded per RFC 3986 §3.2.2.
3. **JWKS/discovery cache max-entries LRU bound** — bound each cache (default 64, env-configurable), evicting LRU, pruning any sidecar state in lockstep; closes the unbounded-growth DoS.
4. **Rust JWKS single-flight dedup** — dedupe concurrent misses for the same URI (Go already does; Rust does not).

**Given** the behaviors already present (`alg:none` rejection, algorithm-confusion `kty`↔`alg` defence, UserInfo `sub` consistency, non-disableable verify options),
**When** the audit is re-run,
**Then** they are confirmed still-enforced and covered by regression tests (no regressions introduced by the hardening).

### RFC References

- [RFC 9207 — Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207)
- [RFC 8414 §2 — AS Metadata](https://www.rfc-editor.org/rfc/rfc8414#section-2)
- [RFC 8705 §5 — mTLS Endpoint Aliases](https://www.rfc-editor.org/rfc/rfc8705#section-5)
- [RFC 3986 §3.2.2 — Host](https://www.rfc-editor.org/rfc/rfc3986#section-3.2.2)

---

## Story 20.3: Rust Extended-Tier Parity (pointer)

### User Story

**As a** Rust adopter,
**I want** introspection, revocation, token-exchange, and DPoP in the Rust port,
**So that** Rust reaches capability parity with the shipped Go Extended tier.

### Acceptance Criteria

**Given** the Rust Extended-tier gap,
**When** the work is executed,
**Then** it follows the decomposition in `epic-5-extended-tier.md` (stories 5.1-rust … 5.4-rust) via the loop prompt `ralph-prompts/identity-model-rust-extended.md`, mirroring `go/pkg/{introspection,revocation,dpop}` + the RFC 8693 exchange path, satisfying the existing `spec/conformance/{introspection,revocation,token-exchange,dpop}.json` prose contracts, and flipping the Rust column in the matrix as each lands.

*(This story is a pointer; the detail lives in Epic 5 and the loop prompt. It is the single biggest parity gap and the recommended next large loop.)*

---

## Story 20.4: Go Advanced / PIM-only Capabilities (decomposition)

### User Story

**As a** maintainer closing the PIM-parity gap for Go,
**I want** the PIM-only advanced capabilities decomposed into sequenced Go implementation stories,
**So that** Go can progress toward full PIM parity after the Rust Extended tier lands.

### Acceptance Criteria

**Given** the advanced gap (Go lacks all of these),
**When** decomposed,
**Then** each becomes a tracked story/issue, security-relevant ones first:

- **First:** private_key_jwt client auth (RFC 7523), PAR (RFC 9126), RFC 9207 `iss` (shared with 20.2), FAPI 2.0 validators.
- **Then:** device authorization (RFC 8628), JAR (RFC 9101), JARM, dynamic client registration (RFC 7591/7592), RP-initiated + back-channel logout, mTLS client auth + cert-bound tokens (RFC 8705), a `ClaimsPrincipal`/identity model.

**Given** the cross-language spec epics already exist (`epic-0e-spec-dynamic-registration`, `epic-0e-spec-fapi2`, `epic-0e-spec-logout`, `epic-0f-spec-extended-tier`),
**When** these Go stories are scoped,
**Then** they reference those spec epics as the behavior contract — the gap is per-language implementation, not specification.

### RFC References

- [RFC 7523 — JWT Client Auth & Authorization Grants](https://www.rfc-editor.org/rfc/rfc7523)
- [RFC 9126 — PAR](https://www.rfc-editor.org/rfc/rfc9126) · [RFC 9101 — JAR](https://www.rfc-editor.org/rfc/rfc9101)
- [RFC 8628 — Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628)
- [RFC 7591 — Dynamic Client Registration](https://www.rfc-editor.org/rfc/rfc7591) · [RFC 7592 — Management](https://www.rfc-editor.org/rfc/rfc7592)
- [RFC 8705 — mTLS / Certificate-Bound Tokens](https://www.rfc-editor.org/rfc/rfc8705)

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 20.1 (Matrix) | reconciliation report (done) |
| 20.2 (Normative hardening) | none — starts immediately, in-session |
| 20.3 (Rust Extended) | Epic 5 decomposition + `identity-model-rust-extended.md` (done) |
| 20.4 (Go advanced) | 0E/0F spec epics (authored); sequence after 20.2 + 20.3 |
