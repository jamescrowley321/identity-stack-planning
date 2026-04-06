---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-6'
epic_title: 'Advanced Tier + Documentation + Launch'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-5-extended-tier.md
---

# Epic 6: Advanced Tier + Documentation + Launch

Implement PAR (RFC 9126) and RAR (RFC 9396) across all languages, build a unified cross-language documentation site, publish all packages to their respective registries, and execute launch activities.

## Story 6.1: Pushed Authorization Requests / PAR (RFC 9126) — All Languages

### User Story

**As a** developer building high-security OAuth2 flows (e.g., FAPI 2.0 compliant applications),
**I want** to push authorization request parameters directly to the authorization server's PAR endpoint and receive a `request_uri` to use in the authorization redirect,
**So that** sensitive authorization parameters are not exposed in the browser URL, request integrity is maintained, and I can comply with security profiles that mandate PAR.

### Acceptance Criteria

**Given** a valid OAuth2 client and a set of authorization request parameters,
**When** I call the PAR method,
**Then** the library sends a POST request to the pushed authorization request endpoint conforming to [RFC 9126 §2.1](https://www.rfc-editor.org/rfc/rfc9126#section-2.1), including all parameters that would normally appear in the authorization URL (e.g., `response_type`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method`) along with client authentication.

**Given** the PAR endpoint accepts the request,
**When** the response is received,
**Then** the library parses the response per [RFC 9126 §2.2](https://www.rfc-editor.org/rfc/rfc9126#section-2.2), returning the `request_uri` and `expires_in` values.

**Given** a successful PAR response with a `request_uri`,
**When** I build the authorization URL,
**Then** the library constructs the authorization redirect URL containing only `client_id` and the `request_uri` (no other authorization parameters), per [RFC 9126 §4](https://www.rfc-editor.org/rfc/rfc9126#section-4).

**Given** the PAR endpoint is discovered via OIDC discovery,
**When** the discovery document contains a `pushed_authorization_request_endpoint` field,
**Then** the library automatically uses that endpoint without requiring manual configuration.

**Given** the PAR request fails,
**When** an error response is received,
**Then** the library returns a structured OAuth2 error with error code, description, and URI.

**Given** any language SDK,
**When** PAR is implemented,
**Then** the implementation includes:
- Unit tests covering successful PAR requests, error responses, `request_uri` expiration handling, parameter serialization, and client authentication methods (client_secret_basic, client_secret_post, private_key_jwt)
- Integration tests against at least one real or simulated authorization server demonstrating the full PAR flow (push parameters, receive request_uri, build authorization URL, complete authorization code exchange)
- A working example in each language demonstrating PAR with PKCE as part of a secure authorization code flow

### RFC References

- [RFC 9126 §2 — Pushed Authorization Request Endpoint](https://www.rfc-editor.org/rfc/rfc9126#section-2)
- [RFC 9126 §2.1 — PAR Request](https://www.rfc-editor.org/rfc/rfc9126#section-2.1)
- [RFC 9126 §2.2 — PAR Response](https://www.rfc-editor.org/rfc/rfc9126#section-2.2)

---

## Story 6.2: Rich Authorization Requests / RAR (RFC 9396) — All Languages

### User Story

**As a** developer building applications that require fine-grained authorization beyond OAuth2 scopes (e.g., payment initiation, account access, or API-specific permissions),
**I want** to include structured `authorization_details` in my authorization and token requests,
**So that** I can express rich, typed authorization semantics that the authorization server and resource servers can enforce, moving beyond flat scope strings.

### Acceptance Criteria

**Given** an authorization request that requires fine-grained permissions,
**When** I construct the request with `authorization_details`,
**Then** the library serializes the `authorization_details` parameter as a JSON array of objects per [RFC 9396 §2](https://www.rfc-editor.org/rfc/rfc9396#section-2), where each object contains at minimum a `type` field and may contain `locations`, `actions`, `datatypes`, `identifier`, and `privileges` fields plus arbitrary extension fields.

**Given** an authorization or token response containing `authorization_details`,
**When** the response is parsed,
**Then** the library deserializes the `authorization_details` JSON array and exposes it as typed objects, preserving all standard and extension fields.

**Given** RAR is used in combination with PAR (RFC 9126),
**When** PAR is available,
**Then** the library supports sending `authorization_details` in the PAR request body, avoiding URL length constraints.

**Given** the authorization server advertises RAR support via discovery,
**When** the discovery document contains `authorization_details_types_supported` per [RFC 9396 §7](https://www.rfc-editor.org/rfc/rfc9396#section-7),
**Then** the library parses and exposes this metadata field.

**Given** any language SDK,
**When** RAR is implemented,
**Then** the implementation includes:
- Unit tests covering serialization/deserialization of `authorization_details` with all standard fields, custom extension fields, multiple authorization detail objects, and edge cases (empty array, missing type)
- Integration tests against at least one real or simulated authorization server demonstrating an end-to-end RAR flow (request with authorization_details, receive enriched token response)
- A working example in each language demonstrating RAR for a payment initiation scenario (or equivalent domain-specific authorization)

### RFC References

- [RFC 9396 §2 — The `authorization_details` Parameter](https://www.rfc-editor.org/rfc/rfc9396#section-2)
- [RFC 9396 §7 — Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc9396#section-7)

---

## Story 6.3: Cross-Language Documentation Site

### User Story

**As a** developer evaluating identity-model or onboarding onto a new language SDK,
**I want** a unified documentation site that covers all four language SDKs with consistent structure, an RFC coverage matrix, and getting-started guides per language,
**So that** I can quickly understand what is supported, find language-specific examples, and trust that the project has production-grade documentation.

### Acceptance Criteria

**Given** the documentation site is deployed,
**When** a developer visits the landing page,
**Then** the site displays a clear project overview, links to all four language SDKs, and a visual RFC coverage matrix showing which RFCs are implemented in which languages.

**Given** a developer selects a specific language (Python, Node/TypeScript, Go, or Rust),
**When** navigating to that language's section,
**Then** the site provides:
- A getting-started guide with installation, basic configuration, and a working code example
- API reference documentation generated from source (e.g., Sphinx for Python, TypeDoc for Node/TS, GoDoc for Go, rustdoc for Rust)
- Per-feature guides for each implemented RFC capability (Discovery, Token Validation, Introspection, Revocation, Token Exchange, DPoP, PAR, RAR)

**Given** the RFC coverage matrix,
**When** a developer views it,
**Then** each row is an RFC (with link to the RFC) and each column is a language, with status indicators (implemented, in progress, planned, not applicable).

**Given** the documentation needs to stay current,
**When** the documentation source is structured,
**Then** it uses a static site generator (e.g., MkDocs, Docusaurus, or mdBook) with source files in the repository, and can be built and previewed locally.

**Given** this story,
**When** documentation is delivered,
**Then** the deliverable includes:
- Unit tests or linting for documentation build (e.g., broken link checker, markdown linting)
- Integration tests verifying all code examples in the documentation compile/run successfully (doc-tests or extracted snippet tests)
- At least one complete example project per language linked from the getting-started guide

### RFC References

All RFCs covered in Epics 5 and 6 are referenced in the coverage matrix:
- [RFC 7662 — Token Introspection](https://www.rfc-editor.org/rfc/rfc7662)
- [RFC 7009 — Token Revocation](https://www.rfc-editor.org/rfc/rfc7009)
- [RFC 8693 — Token Exchange](https://www.rfc-editor.org/rfc/rfc8693)
- [RFC 9449 — DPoP](https://www.rfc-editor.org/rfc/rfc9449)
- [RFC 9126 — PAR](https://www.rfc-editor.org/rfc/rfc9126)
- [RFC 9396 — RAR](https://www.rfc-editor.org/rfc/rfc9396)

---

## Story 6.4: Registry Publishing — PyPI, npm, crates.io, Go Modules

### User Story

**As a** developer who wants to use identity-model in my project,
**I want** each language SDK published to its canonical package registry with automated CI/CD release pipelines,
**So that** I can install the library via standard tooling (`pip install`, `npm install`, `cargo add`, `go get`) and receive updates through normal dependency management workflows.

### Acceptance Criteria

**Given** the Python SDK is ready for release,
**When** a release tag is pushed,
**Then** CI/CD builds and publishes the package to PyPI with correct metadata (name, version, description, classifiers, license, homepage), the package is installable via `pip install identity-model`, and the PyPI project page links to documentation and source.

**Given** the Node/TypeScript SDK is ready for release,
**When** a release tag is pushed,
**Then** CI/CD builds and publishes the package to npm with correct `package.json` metadata, TypeScript type declarations included, the package is installable via `npm install @identity-model/oidc` (or chosen scope/name), and the npm page links to documentation and source.

**Given** the Rust SDK is ready for release,
**When** a release tag is pushed,
**Then** CI/CD builds and publishes the crate to crates.io with correct `Cargo.toml` metadata, the crate is installable via `cargo add identity-model`, and the crates.io page links to docs.rs documentation.

**Given** the Go SDK is ready for release,
**When** a release tag is pushed following Go module versioning conventions,
**Then** the module is available via `go get` with a proper `go.mod` file, tagged versions follow semver, and the Go module proxy indexes the release.

**Given** all registries,
**When** CI/CD pipelines are configured,
**Then** each pipeline includes:
- Unit tests and linting gates that must pass before publishing
- Integration tests that run against the built package (install from local artifact, run smoke tests)
- An example CI workflow file in each language SDK demonstrating the release process

**Given** release automation,
**When** versioning is managed,
**Then** all four SDKs follow semantic versioning, and a coordinated release process exists to publish aligned versions across languages when shared features ship.

### RFC References

Not directly RFC-linked. This story enables distribution of all RFC implementations from Epics 5 and 6.

---

## Story 6.5: Launch — README, CHANGELOG, Blog Post, GitHub Releases

### User Story

**As a** project maintainer preparing to publicly launch identity-model,
**I want** polished READMEs, CHANGELOGs, a blog post template, and GitHub Releases configured for all SDKs,
**So that** the project makes a strong first impression, developers can discover it via GitHub and search engines, and the release history is transparent and navigable.

### Acceptance Criteria

**Given** each language SDK repository,
**When** the README is finalized,
**Then** each README includes: project name and tagline, badges (CI status, latest version, license, RFC compliance), a feature overview with links to supported RFCs, quick-start installation and usage (code snippet), links to full documentation site, contributing guidelines, and license information.

**Given** each language SDK repository,
**When** the CHANGELOG is finalized,
**Then** each CHANGELOG follows [Keep a Changelog](https://keepachangelog.com/) format with sections for Added, Changed, Deprecated, Removed, Fixed, and Security, and includes entries for all features shipped in Epics 5 and 6.

**Given** the launch is prepared,
**When** the blog post template is created,
**Then** it includes: the problem statement (fragmented identity libraries), the vision (cross-language identity-model), key differentiators (RFC compliance breadth, consistent API across languages, DPoP/PAR/RAR support), a feature comparison table vs. existing libraries per language, and call-to-action links to each SDK and the documentation site.

**Given** each language SDK repository,
**When** the initial GitHub Release is created,
**Then** each release includes: a semver tag, release notes summarizing all features, links to registry packages (PyPI/npm/crates.io/Go proxy), links to the documentation site, and SHA256 checksums for any binary artifacts.

**Given** launch readiness,
**When** all launch artifacts are delivered,
**Then** the deliverable includes:
- Unit tests or linting for all markdown artifacts (broken link checker, markdown lint)
- Integration tests verifying quick-start code snippets from each README compile and run successfully
- A complete example project per language that is linked from the README and blog post, demonstrating at least Discovery + Token Validation + one Extended Tier feature (Introspection, Revocation, Exchange, or DPoP)

### RFC References

All RFCs covered across the project are referenced in launch materials:
- [RFC 7662 — Token Introspection](https://www.rfc-editor.org/rfc/rfc7662)
- [RFC 7009 — Token Revocation](https://www.rfc-editor.org/rfc/rfc7009)
- [RFC 8693 — Token Exchange](https://www.rfc-editor.org/rfc/rfc8693)
- [RFC 9449 — DPoP](https://www.rfc-editor.org/rfc/rfc9449)
- [RFC 9126 — PAR](https://www.rfc-editor.org/rfc/rfc9126)
- [RFC 9396 — RAR](https://www.rfc-editor.org/rfc/rfc9396)

---

## Story 6.6: OpenID Foundation Certification Submission

### User Story

**As a** project maintainer building trust with enterprise adopters,
**I want** to submit identity-model for OpenID Foundation certification across all four language SDKs,
**So that** users can rely on an independent, industry-recognized verification that the libraries are spec-compliant, and the project appears in the OpenID Foundation's certified implementations directory.

### Background

The [OpenID Foundation](https://openid.net/certification/) offers certification programs for Relying Party (RP) libraries. Relevant profiles for identity-model:

- **Basic RP** — OIDC Core discovery, ID token validation, UserInfo
- **Config RP** — Dynamic discovery of provider configuration
- **Dynamic RP** — Dynamic client registration (RFC 7591)
- **FAPI 2.0 RP** — Financial-grade security profile (DPoP, PAR, JARM)

Certification involves running the Foundation's [conformance test suite](https://openid.net/certification/testing/) against each language SDK and submitting the results. Python should certify first (existing codebase), then Node/Go/Rust as they reach Core Tier completion.

### Acceptance Criteria

**Given** the Python SDK has passed all internal conformance tests (DISC-*, JWK-*, VAL-*, CC-*, AUTHZ-*, UI-*),
**When** the OpenID Foundation conformance suite is run against py-identity-model,
**Then** the library passes all required tests for the Basic RP and Config RP profiles, and the results are submitted to the Foundation for certification.

**Given** each additional language SDK (Node, Go, Rust) reaches Core Tier completion,
**When** the Foundation conformance suite is run against that SDK,
**Then** the library passes Basic RP and Config RP certification, and results are submitted.

**Given** the Extended Tier (DPoP, PAR) is implemented in any SDK,
**When** FAPI 2.0 RP conformance tests are run,
**Then** the library passes the FAPI 2.0 RP profile, and results are submitted for certification.

**Given** certification is achieved,
**When** the Foundation publishes the results,
**Then** each certified SDK's README, documentation site, and registry page display the OpenID Certified badge with a link to the certification results.

**Given** any language SDK,
**When** certification is pursued,
**Then** the deliverables include:
- A CI job that runs the OpenID Foundation conformance suite on every release candidate
- Documentation of the certification submission process (repeatable for future versions)
- Conformance test result artifacts archived in the repository

### Certification Phasing

| Phase | SDK | Profile | Prerequisite |
|-------|-----|---------|-------------|
| 1 | Python | Basic RP, Config RP | Epic 1 complete |
| 2 | Node | Basic RP, Config RP | Epic 2 complete |
| 2 | Go | Basic RP, Config RP | Epic 3 complete |
| 2 | Rust | Basic RP, Config RP | Epic 4 complete |
| 3 | All | Dynamic RP | Epic 0E-REG (Dynamic Registration) implemented |
| 4 | All | FAPI 2.0 RP | Epic 5 (DPoP) + Epic 6.1 (PAR) complete |

### References

- [OpenID Foundation Certification](https://openid.net/certification/)
- [OpenID Conformance Testing Suite](https://openid.net/certification/testing/)
- [Certified OpenID Connect Implementations](https://openid.net/developers/certified-openid-connect-implementations/)
- [OIDC Certification Analysis (py-identity-model)](../../docs/oidc-certification-analysis.md)
