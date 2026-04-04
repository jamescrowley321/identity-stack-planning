---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-12'
epic_title: 'Competitive Analysis & Market Research'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 12: Competitive Analysis & Market Research

## Overview

Before committing resources to a multi-language OIDC/OAuth2 client library monorepo, we need a rigorous understanding of the competitive landscape, our upstream reference (Duende IdentityModel), the addressable market, developer experience expectations, and licensing economics. This epic produces five research deliverables that inform positioning, prioritization, and go-to-market strategy for identity-model across Python, Node/TypeScript, Go, and Rust.

identity-model's design philosophy is ported from Duende's IdentityModel (.NET). The competitive analysis must respect that lineage while identifying where identity-model can differentiate — particularly through cross-language consistency, modern RFC support (DPoP, PAR, RAR), and superior developer experience.

## Stories

---

### Story 12.1 — Deep Competitive Analysis Per Language Ecosystem

**User Story**

> As the product owner of identity-model,
> I want a detailed competitive analysis of all significant OIDC/OAuth2 libraries in each target language ecosystem,
> so that I can identify gaps in the market, understand where incumbents are strong or weak, and position identity-model's value proposition per language.

**Description**

For each of the four target language ecosystems, produce a comprehensive comparison of existing OIDC/OAuth2 client libraries. The analysis must go beyond feature checklists to evaluate real-world viability: maintenance health, community trust, and security posture.

**Libraries to evaluate:**

- **Python:** authlib, PyJWT, python-jose, oauthlib, requests-oauthlib
- **Node/TypeScript:** openid-client, jose, oidc-client-ts, passport-openidconnect, next-auth
- **Go:** coreos/go-oidc, golang.org/x/oauth2, zitadel/oidc, ory/fosite
- **Rust:** openidconnect-rs, oauth2-rs, jsonwebtoken, josekit

**Per-library evaluation dimensions:**

- Feature matrix (OIDC Discovery, JWKS, JWT validation, token flows, DPoP, PAR, RAR, FAPI support)
- API ergonomics (builder patterns, error handling, async support, type safety)
- Maintenance health (commit frequency over last 12 months, median issue response time, bus factor, release cadence)
- Adoption metrics (download stats from PyPI/npm/Go modules/crates.io, GitHub stars, dependent repos)
- RFC coverage (which RFCs are implemented, which are missing)
- Security track record (CVE history, responsible disclosure process, audit history)

**Acceptance Criteria**

- **AC-12.1.1** Given the analysis is complete, when the report is reviewed, then it contains a per-language section with a comparison matrix covering all six evaluation dimensions for every library listed above.
- **AC-12.1.2** Given the feature matrix, when reviewed, then it uses a consistent rating system (full/partial/none) across all libraries and languages, with footnotes explaining partial ratings.
- **AC-12.1.3** Given the maintenance health data, when reviewed, then it includes quantitative metrics (commit counts, issue response times, release dates) with data collection dates noted for reproducibility.
- **AC-12.1.4** Given each language section, when reviewed, then it concludes with a competitive positioning statement identifying identity-model's opportunity in that ecosystem (underserved niche, head-to-head replacement, complementary layer, or "ecosystem is well-served — differentiate on X").
- **AC-12.1.5** Given the security track record section, when reviewed, then it documents known CVEs (or their absence) and whether each library has a published security policy or disclosure process.

**Verification (Given/When/Then)**

- Given the competitive analysis is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the comparison matrices, when reviewed, then every library listed in the description appears with a complete row of data — no placeholders or TBDs.
- Given the positioning statements, when reviewed, then each one references specific data points from the analysis (not unsupported assertions).

**Deliverable**

Research report with per-language comparison matrices and positioning statements, stored at `docs/research/competitive-analysis-per-language.md`.

---

### Story 12.2 — Duende IdentityModel Feature Mapping

**User Story**

> As the architect of identity-model,
> I want a detailed 1:1 feature mapping between Duende's IdentityModel (.NET) and identity-model's planned capabilities,
> so that I can ensure we carry forward the design decisions that make IdentityModel successful while identifying where we intentionally diverge or extend.

**Description**

Duende IdentityModel is the upstream reference for identity-model's design philosophy. This story produces a thorough feature-by-feature mapping that documents what Duende does, what we plan to replicate, what we skip (and why), and where we go beyond Duende.

**Areas to map:**

- Discovery and provider metadata handling
- JWKS retrieval and key management
- Token request/response abstractions (client credentials, authorization code, refresh, device code, CIBA)
- Token introspection and revocation
- UserInfo endpoint support
- DPoP (Demonstrating Proof of Possession)
- PAR (Pushed Authorization Requests)
- RAR (Rich Authorization Requests)
- HTTP abstraction layer (BackChannelHandler patterns)
- Caching strategies (discovery cache, JWKS cache)
- Error model and exception hierarchy
- Extension points and customization surface

**Acceptance Criteria**

- **AC-12.2.1** Given the feature mapping is complete, when reviewed, then every public API surface area from Duende IdentityModel (v7.x or latest stable) is accounted for with a status of: **replicated**, **planned**, **skipped** (with rationale), or **not applicable** (cross-language concern).
- **AC-12.2.2** Given the "beyond Duende" section, when reviewed, then it documents capabilities identity-model offers that IdentityModel does not — specifically cross-language consistency, modern RFC support (DPoP/PAR/RAR where Duende lacks them), and multi-runtime async patterns.
- **AC-12.2.3** Given the mapping, when a feature is marked "skipped", then the rationale references either a language ecosystem difference, an architectural decision, or a deliberate scope boundary — not simply "not yet planned."
- **AC-12.2.4** Given the mapping, when reviewed, then it includes version pinning (which Duende IdentityModel version was analyzed) and links to source files or docs for each mapped feature.
- **AC-12.2.5** Given the mapping, when reviewed, then it identifies at least three features or patterns from Duende that are not yet in our planning artifacts but should be considered for inclusion.

**Verification (Given/When/Then)**

- Given the feature mapping is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the Duende feature list, when cross-referenced with identity-model's epic backlog, then every "planned" item traces to a specific epic or story.
- Given the "beyond Duende" section, when reviewed, then each claim is substantiated with references to Duende's documentation or source code confirming the gap.

**Deliverable**

Feature mapping document with traceability to identity-model epics, stored at `docs/research/duende-feature-mapping.md`.

---

### Story 12.3 — Market Sizing & Positioning

**User Story**

> As the product owner of identity-model,
> I want data-driven market sizing and a positioning strategy,
> so that I can prioritize language implementations by market opportunity and craft messaging that resonates with each developer audience.

**Description**

Research the addressable market for a multi-language OIDC/OAuth2 client library. Quantify developer populations, library adoption, and identity market trends. Produce a positioning framework that maps identity-model's strengths to market needs.

**Research areas:**

- Developer population estimates per language (Python, Node/TypeScript, Go, Rust) from credible surveys (Stack Overflow, JetBrains, GitHub Octoverse, SlashData)
- OIDC/OAuth2 library download statistics: PyPI (monthly downloads for authlib, PyJWT, etc.), npm (openid-client, jose, etc.), Go module proxy stats, crates.io downloads
- Identity market trends: passwordless adoption, passkey rollout (FIDO2/WebAuthn), FAPI adoption in financial services, decentralized identity / verifiable credentials, zero-trust architecture patterns
- Enterprise vs. OSS consumption patterns: who uses identity libraries and in what contexts (microservices, BFF patterns, serverless, mobile backends)
- Geographic and vertical distribution: where is identity library usage concentrated (cloud-native startups, fintech, healthcare, government)

**Acceptance Criteria**

- **AC-12.3.1** Given the market sizing is complete, when reviewed, then it includes developer population estimates per language with source attribution and date of data collection.
- **AC-12.3.2** Given the download statistics, when reviewed, then they cover the top 3 libraries per language ecosystem with monthly/weekly download numbers and 12-month trend direction (growing, stable, declining).
- **AC-12.3.3** Given the market trends section, when reviewed, then it covers at least passwordless/passkeys, FAPI, and decentralized identity — with an assessment of how each trend affects demand for OIDC/OAuth2 client libraries.
- **AC-12.3.4** Given the positioning framework, when reviewed, then it includes a per-language positioning statement and a cross-language umbrella positioning statement, each grounded in data from the market sizing.
- **AC-12.3.5** Given the market sizing, when reviewed, then it includes a recommended language prioritization order with quantitative justification.

**Verification (Given/When/Then)**

- Given the market sizing report is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the download statistics, when spot-checked against public registries, then the reported numbers are within reasonable tolerance (collected within the last 30 days).
- Given the positioning statements, when reviewed, then each one identifies a specific unmet need that identity-model addresses.

**Deliverable**

Market sizing and positioning report, stored at `docs/research/market-sizing-and-positioning.md`.

---

### Story 12.4 — Developer Experience Audit

**User Story**

> As the DX lead for identity-model,
> I want a systematic evaluation of the developer experience offered by top competing libraries in each language,
> so that I can identify DX patterns to adopt, antipatterns to avoid, and specific areas where identity-model can differentiate through superior ergonomics.

**Description**

Evaluate the developer experience of the top 2-3 competitors in each language ecosystem using a consistent scorecard. The audit focuses on the practical experience of a developer trying to validate a token or complete an OAuth2 flow for the first time.

**DX evaluation dimensions:**

- Time to first token validation (from `pip install`/`npm install`/`go get`/`cargo add` to a working validation call, measured in minutes and lines of code)
- Documentation quality (getting started guide, API reference completeness, example coverage, search quality)
- Error message clarity (are errors actionable? do they suggest fixes? do they include context like which claim failed validation?)
- Type safety and IDE experience (TypeScript types quality, Python type hints, Go interface design, Rust trait ergonomics, IDE autocomplete accuracy)
- Configuration ergonomics (sensible defaults, builder patterns, environment-based config, minimal boilerplate)
- Debugging experience (logging hooks, token inspection utilities, verbose mode)

**Libraries to audit:**

- **Python:** authlib, PyJWT
- **Node/TypeScript:** openid-client, jose
- **Go:** coreos/go-oidc, zitadel/oidc
- **Rust:** openidconnect-rs, oauth2-rs

**Acceptance Criteria**

- **AC-12.4.1** Given the DX audit is complete, when the scorecard is reviewed, then each library is rated on all six dimensions using a consistent 1-5 scale with written justification for each score.
- **AC-12.4.2** Given the "time to first token validation" dimension, when reviewed, then it includes actual code samples showing the minimal code required for each library, with line counts and setup steps documented.
- **AC-12.4.3** Given the error message evaluation, when reviewed, then it includes at least three real error messages per library (e.g., expired token, wrong audience, invalid signature) with commentary on clarity and actionability.
- **AC-12.4.4** Given the audit, when reviewed, then it concludes with a "DX differentiation opportunities" section listing at least five specific, actionable improvements identity-model should prioritize.
- **AC-12.4.5** Given the DX scorecard, when reviewed, then it includes a composite score per library and a visual summary (table or chart description) enabling quick cross-library comparison.

**Verification (Given/When/Then)**

- Given the DX audit is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the code samples, when executed against a test OIDC provider, then they produce the described results (or the report notes version-specific caveats).
- Given the DX differentiation opportunities, when reviewed, then each one traces to a specific weakness observed in the audit — not generic aspirations.

**Deliverable**

DX audit report with scorecards and differentiation recommendations, stored at `docs/research/developer-experience-audit.md`.

---

### Story 12.5 — Licensing & Sustainability Analysis

**User Story**

> As the project lead for identity-model,
> I want an analysis of licensing models and sustainability strategies used by competing identity libraries,
> so that I can make an informed decision about identity-model's license choice and long-term funding strategy.

**Description**

Compare how competing OIDC/OAuth2 libraries are licensed and funded. Evaluate the tradeoffs between permissive open source, copyleft, dual-licensing, and commercial models. Pay particular attention to Duende's licensing evolution (from MIT IdentityServer to RPL/commercial Duende IdentityServer) as a case study in OSS sustainability.

**Research areas:**

- License inventory: document the license of every library from Story 12.1 (MIT, Apache 2.0, RPL, AGPL, commercial, etc.)
- Duende case study: timeline of IdentityServer's license changes, community reaction, revenue model, impact on adoption. What lessons apply to identity-model?
- Sustainability models in the identity space: donations (OpenCollective, GitHub Sponsors), commercial dual-license (Duende, Ory), consulting/support contracts, SaaS offerings (Auth0, Clerk, WorkOS — how do their OSS libraries fit their business model?), foundation backing (OpenID Foundation, CNCF)
- License compatibility: which licenses are compatible with identity-model's potential choices? What happens if a dependency changes its license?
- Corporate adoption friction: which licenses create legal review friction for enterprise consumers? (AGPL red flags, RPL restrictions, patent clauses)

**Acceptance Criteria**

- **AC-12.5.1** Given the license inventory is complete, when reviewed, then every library from Story 12.1 appears with its SPDX license identifier, a summary of key restrictions, and a compatibility assessment with MIT and Apache 2.0.
- **AC-12.5.2** Given the Duende case study, when reviewed, then it includes a timeline, quantitative adoption data (NuGet downloads before/after license change if available), community sentiment summary, and at least three lessons applicable to identity-model.
- **AC-12.5.3** Given the sustainability models section, when reviewed, then it covers at least four distinct models (permissive OSS + donations, dual-license, commercial, foundation-backed) with real-world examples from the identity space and an honest assessment of revenue potential for each.
- **AC-12.5.4** Given the recommendation section, when reviewed, then it proposes a specific license (with SPDX identifier) and a sustainability strategy for identity-model, with a decision matrix showing how the recommendation was reached.
- **AC-12.5.5** Given the corporate adoption analysis, when reviewed, then it identifies which license choices would create friction for enterprise legal teams and which would maximize adoption in regulated industries (financial services, healthcare, government).

**Verification (Given/When/Then)**

- Given the licensing analysis is delivered, when it is checked against this story's acceptance criteria, then all five ACs are satisfied.
- Given the license inventory, when spot-checked against repository LICENSE files, then all reported licenses are accurate.
- Given the recommendation, when reviewed, then it addresses both short-term adoption goals and long-term sustainability — not just one or the other.

**Deliverable**

Licensing and sustainability analysis with recommendation, stored at `docs/research/licensing-and-sustainability.md`.
