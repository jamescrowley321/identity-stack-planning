---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0B'
epic_title: 'Ecosystem Research — Language Library Audits'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-1-core-python.md
  - _bmad-output/planning-artifacts/epics/epic-3-core-go.md
  - _bmad-output/planning-artifacts/epics/epic-4-core-rust.md
---

# Epic 0B: Ecosystem Research — Language Library Audits

## Overview

This is an addendum to Epic 0. Before building (or restructuring) language-specific implementations, we need to audit the existing open-source ecosystem for each target language (Python, Go, Rust, and Node/TypeScript). The goal is to make informed build-vs-wrap-vs-integrate decisions for every major dependency area: OIDC discovery, JOSE/JWT, OAuth2 flows, HTTP transport, and framework middleware.

Each story produces a structured research report with a comparison matrix and a per-library recommendation (build from scratch, wrap/extend an existing library, integrate as a dependency, or replace our current approach). These reports directly inform the implementation strategies for Epics 1, 2, 3, and 4.

## Stories

---

### Story 0B.1 — Research: Python Ecosystem Audit

**User Story**

> As the architect planning the identity-model monorepo,
> I want a thorough audit of the Python identity/auth library ecosystem,
> so that I can make an informed decision about what py-identity-model should build from scratch versus wrapping or depending on existing libraries.

**Description**

Before finalizing py-identity-model's position in the monorepo, audit the Python identity ecosystem. Evaluate each library for API quality, maintenance health, license compatibility (MIT/Apache-2.0), feature coverage, and alignment with our conformance spec.

Libraries to evaluate:

- [`authlib`](https://github.com/lepture/authlib) — comprehensive but monolithic. Can we interop or borrow patterns?
- [`PyJWT`](https://github.com/jpadilla/pyjwt) — we already depend on this. Confirm it is the right JOSE layer.
- [`python-jose`](https://github.com/mpdavis/python-jose) — alternative JOSE implementation. Compare with PyJWT.
- [`cryptography`](https://github.com/pyca/cryptography) — we already depend on this. Audit our usage patterns.
- [`httpx`](https://github.com/encode/httpx) — we already use this. Confirm async HTTP approach is correct.
- [`oauthlib`](https://github.com/oauthlib/oauthlib) — low-level OAuth. Useful as a dependency?
- FastAPI/Starlette/Django/Flask middleware patterns — survey what auth middleware already exists in these frameworks.

**Acceptance Criteria**

- **AC-0B.1.1** Given the research is complete, when the report is reviewed, then it documents the research methodology including: selection criteria, evaluation rubric, and how each library was tested or assessed.
- **AC-0B.1.2** Given the set of evaluated libraries, when the comparison matrix is reviewed, then it includes columns for: license, maintenance status (last release, commit frequency, bus factor), feature coverage relative to our conformance spec, API ergonomics, async support, and dependency footprint.
- **AC-0B.1.3** Given each library in the matrix, when the recommendation column is reviewed, then it contains one of: **build** (write from scratch), **wrap** (use internally behind our API), **integrate** (depend on directly in public API), or **replace** (swap out our current dependency) — with a written rationale for the choice.
- **AC-0B.1.4** Given the framework middleware survey, when reviewed, then it covers at least FastAPI, Starlette, Django, and Flask — documenting existing auth middleware packages, their limitations, and how identity-model could complement or replace them.
- **AC-0B.1.5** Given the final report, when reviewed by the team, then it includes a risk assessment for each "integrate" or "wrap" recommendation (maintenance abandonment, API breakage, license change).

**Verification (Given/When/Then)**

- Given the Python ecosystem audit is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the comparison matrix, when it is reviewed, then every library listed in the description appears with a complete row of data.
- Given the recommendation section, when a "build" recommendation is made, then it includes justification for why no existing library is suitable.

**Deliverable**

Research report with build/wrap/integrate/replace recommendation for each library, stored at `docs/research/python-ecosystem-audit.md`.

---

### Story 0B.2 — Research: Go Ecosystem Audit

**User Story**

> As the architect planning the identity-model monorepo,
> I want a thorough audit of the Go identity/auth library ecosystem,
> so that I can make an informed decision about whether go-identity-model should build from scratch, fork, or wrap existing Go libraries.

**Description**

Before building go-identity-model, audit the Go identity ecosystem. Evaluate each library for API quality, maintenance health, license compatibility (MIT/Apache-2.0), feature coverage, idiomatic Go patterns, and alignment with our conformance spec.

Libraries to evaluate:

- [`coreos/go-oidc`](https://github.com/coreos/go-oidc) (v3) — most popular Go OIDC library. Can we fork, extend, or wrap?
- [`golang.org/x/oauth2`](https://pkg.go.dev/golang.org/x/oauth2) — stdlib-adjacent OAuth2. Use as foundation?
- [`go-jose/go-jose`](https://github.com/go-jose/go-jose) (v4) — JOSE/JWK library. Use as our JOSE layer?
- [`golang-jwt/jwt`](https://github.com/golang-jwt/jwt) (v5) — JWT library. Compare with go-jose for our needs.
- [`zitadel/oidc`](https://github.com/zitadel/oidc) — Zitadel's OIDC library (client + server). Evaluate.
- [`ory/fosite`](https://github.com/ory/fosite) — Ory's OAuth2 framework. Server-side but has client patterns.
- Echo/Gin/Chi middleware patterns — survey what auth middleware already exists in these frameworks.

**Acceptance Criteria**

- **AC-0B.2.1** Given the research is complete, when the report is reviewed, then it documents the research methodology including: selection criteria, evaluation rubric, and how each library was tested or assessed.
- **AC-0B.2.2** Given the set of evaluated libraries, when the comparison matrix is reviewed, then it includes columns for: license, maintenance status (last release, commit frequency, bus factor), feature coverage relative to our conformance spec, API ergonomics, idiomatic Go patterns, and dependency footprint.
- **AC-0B.2.3** Given each library in the matrix, when the recommendation column is reviewed, then it contains one of: **build** (write from scratch), **wrap** (use internally behind our API), **integrate** (depend on directly in public API), or **fork** (fork and extend) — with a written rationale for the choice.
- **AC-0B.2.4** Given the framework middleware survey, when reviewed, then it covers at least Echo, Gin, and Chi — documenting existing auth middleware packages, their limitations, and how identity-model could complement or replace them.
- **AC-0B.2.5** Given the final report, when reviewed by the team, then it includes a risk assessment for each "integrate", "wrap", or "fork" recommendation (maintenance abandonment, API breakage, license change, fork drift).

**Verification (Given/When/Then)**

- Given the Go ecosystem audit is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the comparison matrix, when it is reviewed, then every library listed in the description appears with a complete row of data.
- Given the recommendation section, when a "build" recommendation is made, then it includes justification for why no existing library is suitable.

**Deliverable**

Research report with build/wrap/integrate/fork recommendation for each library, stored at `docs/research/go-ecosystem-audit.md`.

---

### Story 0B.3 — Research: Rust Ecosystem Audit

**User Story**

> As the architect planning the identity-model monorepo,
> I want a thorough audit of the Rust identity/auth library ecosystem,
> so that I can make an informed decision about whether rs-identity-model should build from scratch, wrap, or integrate existing Rust crates.

**Description**

Before building rs-identity-model, audit the Rust identity ecosystem. Evaluate each crate for API quality, maintenance health, license compatibility (MIT/Apache-2.0), feature coverage, idiomatic Rust patterns (trait design, error handling, async runtime compatibility), and alignment with our conformance spec.

Libraries to evaluate:

- [`openidconnect-rs`](https://github.com/ramosbugs/openidconnect-rs) — the main Rust OIDC library. Fork, wrap, or start fresh?
- [`jsonwebtoken`](https://github.com/Keats/jsonwebtoken) — JWT library. Use as JOSE layer?
- [`josekit`](https://github.com/nickel-org/josekit-rs) — alternative JOSE implementation. Compare with jsonwebtoken.
- [`reqwest`](https://github.com/seanmonstar/reqwest) — HTTP client. Confirm as our choice.
- [`oauth2-rs`](https://github.com/ramosbugs/oauth2-rs) — OAuth2 client. Evaluate as foundation.
- `axum`/`actix-web`/`rocket` middleware patterns — survey what auth middleware already exists in these frameworks.

**Acceptance Criteria**

- **AC-0B.3.1** Given the research is complete, when the report is reviewed, then it documents the research methodology including: selection criteria, evaluation rubric, and how each crate was tested or assessed.
- **AC-0B.3.2** Given the set of evaluated crates, when the comparison matrix is reviewed, then it includes columns for: license, maintenance status (last release, commit frequency, bus factor), feature coverage relative to our conformance spec, API ergonomics, async runtime compatibility (tokio vs async-std), trait design quality, and dependency footprint.
- **AC-0B.3.3** Given each crate in the matrix, when the recommendation column is reviewed, then it contains one of: **build** (write from scratch), **wrap** (use internally behind our API), **integrate** (depend on directly in public API), or **fork** (fork and extend) — with a written rationale for the choice.
- **AC-0B.3.4** Given the framework middleware survey, when reviewed, then it covers at least axum, actix-web, and rocket — documenting existing auth middleware crates, their limitations, and how identity-model could complement or replace them.
- **AC-0B.3.5** Given the final report, when reviewed by the team, then it includes a risk assessment for each "integrate", "wrap", or "fork" recommendation (maintenance abandonment, API breakage, license change, MSRV compatibility, fork drift).

**Verification (Given/When/Then)**

- Given the Rust ecosystem audit is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the comparison matrix, when it is reviewed, then every crate listed in the description appears with a complete row of data.
- Given the recommendation section, when a "build" recommendation is made, then it includes justification for why no existing crate is suitable.

**Deliverable**

Research report with build/wrap/integrate/fork recommendation for each crate, stored at `docs/research/rust-ecosystem-audit.md`.

---

### Story 0B.4 — Research: Node/TypeScript Ecosystem Audit

**User Story**

> As the architect planning the identity-model monorepo,
> I want a thorough audit of the Node/TypeScript identity/auth library ecosystem,
> so that I can make an informed decision about what @identity-model/node should build from scratch versus wrapping or depending on existing libraries.

**Description**

Before building @identity-model/node, audit the Node/TypeScript identity ecosystem. Evaluate each library for API quality, maintenance health, license compatibility (MIT/Apache-2.0), feature coverage, TypeScript support quality, and alignment with our conformance spec.

Libraries to evaluate:

- [`openid-client`](https://github.com/panva/openid-client) — OIDC Relying Party. Can we wrap or extend?
- [`jose`](https://github.com/panva/jose) — JOSE/JWT/JWK/JWS/JWE. Use as our JOSE layer?
- [`oidc-client-ts`](https://github.com/authts/oidc-client-ts) — Browser-focused OIDC. Evaluate scope overlap.
- [`next-auth`](https://github.com/nextauthjs/next-auth) — Next.js auth. Framework integration patterns.
- [`passport`](https://github.com/jaredhanson/passport) — Express auth middleware ecosystem. Integration patterns.
- NestJS, Next.js, Express, Fastify middleware patterns — survey existing auth middleware.

**Acceptance Criteria**

- **AC-0B.4.1** Given the research is complete, when the report is reviewed, then it documents the research methodology including: selection criteria, evaluation rubric, and how each library was tested or assessed.
- **AC-0B.4.2** Given the set of evaluated libraries, when the comparison matrix is reviewed, then it includes columns for: license, maintenance status (last release, commit frequency, bus factor), feature coverage relative to our conformance spec, API ergonomics, TypeScript support quality, and dependency footprint.
- **AC-0B.4.3** Given each library in the matrix, when the recommendation column is reviewed, then it contains one of: **build** (write from scratch), **wrap** (use internally behind our API), **integrate** (depend on directly in public API), or **replace** (swap out) — with a written rationale for the choice.
- **AC-0B.4.4** Given the framework middleware survey, when reviewed, then it covers at least NestJS, Next.js, Express, and Fastify — documenting existing auth middleware packages, their limitations, and how identity-model could complement or replace them.
- **AC-0B.4.5** Given the final report, when reviewed by the team, then it includes a risk assessment for each "integrate" or "wrap" recommendation (maintenance abandonment, API breakage, license change).

**Verification (Given/When/Then)**

- Given the Node/TypeScript ecosystem audit is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the comparison matrix, when it is reviewed, then every library listed in the description appears with a complete row of data.
- Given the recommendation section, when a "build" recommendation is made, then it includes justification for why no existing library is suitable.

**Deliverable**

Research report with build/wrap/integrate/replace recommendation for each library, stored at `docs/research/node-ecosystem-audit.md`.

---

### Story 0B.5 — Research: Cross-Language Conformance Strategy

**User Story**

> As the architect planning the identity-model monorepo,
> I want a strategy for maximizing code reuse and minimizing redundant work across all four language implementations,
> so that conformance testing, test fixtures, and specification artifacts can be shared rather than duplicated per language.

**Description**

Research how to ensure consistency and reduce duplication across Python, Node.js, Go, and Rust implementations. Investigate shared test infrastructure, code generation from specs, and conformance test tooling.

Areas to investigate:

- Can conformance test definitions (e.g., YAML/JSON test cases) drive code generation or at minimum serve as shared acceptance criteria?
- Are there OpenAPI or JSON Schema specs for OIDC endpoints (discovery, token, userinfo, JWKS) that we can use to generate models or validate responses?
- [OpenID Foundation conformance suite](https://openid.net/certification/testing/) — can we run it against all four language implementations? What does integration look like?
- Shared test fixtures — what format (JSON, YAML, TOML) maximizes reuse across Python, Node.js, Go, and Rust test runners?
- OIDC test providers beyond node-oidc-provider: [Keycloak](https://www.keycloak.org/), [Ory Hydra](https://github.com/ory/hydra), mock servers, or hosted sandboxes. Which should we test against?

**Acceptance Criteria**

- **AC-0B.5.1** Given the research is complete, when the report is reviewed, then it documents the research methodology including: what tools, specs, and test suites were evaluated and how feasibility was assessed.
- **AC-0B.5.2** Given the code generation investigation, when reviewed, then it includes a feasibility assessment with concrete examples of what could be generated (models, test stubs, validation logic) and what cannot.
- **AC-0B.5.3** Given the OpenAPI/JSON Schema investigation, when reviewed, then it lists all discovered specs with links, evaluates their completeness, and recommends which (if any) to adopt.
- **AC-0B.5.4** Given the OpenID Foundation conformance suite evaluation, when reviewed, then it documents: setup requirements, per-language integration effort estimate, and any limitations or gaps.
- **AC-0B.5.5** Given the shared test fixture investigation, when reviewed, then it recommends a fixture format with rationale, includes a sample fixture structure, and documents how each language's test runner would consume it.
- **AC-0B.5.6** Given the OIDC test provider survey, when reviewed, then it includes a comparison matrix of at least three providers (node-oidc-provider, Keycloak, Ory Hydra) covering: ease of setup, protocol coverage, CI integration feasibility, and licensing.
- **AC-0B.5.7** Given the final strategy document, when reviewed by the team, then it contains a prioritized list of recommendations with effort estimates and dependencies.

**Verification (Given/When/Then)**

- Given the cross-language conformance strategy is delivered, when it is checked against this story's acceptance criteria, then all seven ACs are satisfied.
- Given the recommendations, when a "adopt" recommendation is made for a tool or spec, then it includes a proof-of-concept description or link demonstrating feasibility.
- Given the strategy document, when reviewed, then it addresses all five investigation areas listed in the description.

**Deliverable**

Strategy document with prioritized recommendations, stored at `docs/research/cross-language-conformance-strategy.md`.
