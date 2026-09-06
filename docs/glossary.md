# Glossary

Definitions for terms used across identity-stack-planning documents. Grouped for quick lookup; acronym expansions link to source documents.

---

## Code index

Planning documents use short codes for requirements, decisions and tasks. Every family in current use is
listed here. **If a code is not in this table, it is legacy — find the document that introduced it, or
replace it with plain words.**

Two rules keep this table honest, and they are in `CLAUDE.md`:

1. **Expand a code the first time a document uses it** — `CONS-1 (the first polyglot-consolidation epic)`,
   not a bare `CONS-1`. A reader should never have to leave the page to parse a sentence.
2. **One prefix, one meaning, repo-wide.** `D-1` used to mean an architecture decision in
   `system-architecture.md` *and* an unrelated sign-off item in the parity report. That collision is why this
   table exists; the architecture series was renamed `ADR-CANON-n` and the parity codes were deleted in favour
   of plain names.

### Requirements

| Code | Means | Owned by |
|---|---|---|
| `FR-<SUB>-n` | Functional requirement, numbered per sub-system | `planning-artifacts/prd*.md` |
| `NFR-<SUB>-n` | Non-functional requirement (performance, security, operability) | `planning-artifacts/prd*.md` |
| `AC-<story>-n` | Acceptance criterion for a story | the story's epic document |

`<SUB>` is the repo tag: **PIM** = `py-identity-model` (the Python package), **SSS** = `identity-stack` (the
SaaS starter), **TFP** = `terraform-provider-descope`, **CROSS** = spans repos.

### Decisions

| Code | Means | Owned by |
|---|---|---|
| `ADR-n` | Architecture decision, platform-wide | `architecture.md` |
| `ADR-GW-n` | …for the API gateway | `architecture-api-gateway.md` |
| `ADR-IS-n` | …for infrastructure + secrets | `architecture-infrastructure-secrets.md` |
| `ADR-CANON-n` | …for the canonical identity model | `architecture-canonical-identity.md` |
| `ADR-OI-n` | …for the open-identity work | `architecture-open-identity.md` |
| `OD-n` | Open decision, later resolved and locked | `architecture-open-identity.md` |

### Epics and their stories

| Code | Means | Tracking |
|---|---|---|
| `CONS-1..3` | Polyglot consolidation: merge, reorganise, rename | identity-model #535 / #536 / #537 |
| `TH-n.n` | Token-blaster harness stories | identity-model #462 (#463–#474) |
| `RE5.n` | Rust extended tier: introspection, revocation, token-exchange, DPoP | identity-model |
| `LP-n` | Load-suite correct-course tasks | identity-model #543–#546 |
| `K1..K6` | OIDF conformance harness tasks | identity-model #242 |
| `DS-n.n` | Design-system stories | identity-stack |
| `VAULT-n` | Secrets-to-Vault migration stories | identity-stack #398 (#399–#405) |
| `TFCENV-n` | Terraform Cloud dev/prod environment stories | identity-stack #411 (#412–#418) |

### Findings and controls

| Code | Means | Owned by |
|---|---|---|
| `RT<n>-F<n>` | Red-team audit round *n*, finding *n* | the round's audit report |
| `F-nn` | Finding from the 2026-08 red/blue security audit | same |
| `SC<n>` | Security control | `identity-model` → `py/docs/security/control-matrix.md` |
| `T<nnn>` | Legacy task ID used by ralph loop prompts | the prompt that defines it |

`T<nnn>` is the weakest of these: the numbers were assigned by whichever prompt needed them and carry no
global meaning. Prefer the GitHub issue number.

**ADR (Architecture Decision Record)** — A short record of an architectural decision, its context, and its consequences. See the workspace’s [system architecture and ADR index](system-architecture.md).

**Acceptance Auditor** — Review agent persona that verifies spec compliance. For each acceptance criterion, checks whether it's implemented, tested, and matches intent. Reports PASS / FAIL / PARTIAL / SCOPE CREEP. See [review process](review-process.md).

**Authorization Server (AS)** — The OAuth server that authenticates a client or resource owner and issues authorization grants or access tokens. Defined by [RFC 6749 §1.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1).

**AI (Artificial Intelligence)** — A broad term for machine-based systems that perform tasks associated with human intelligence; in this workspace it includes delegated agents that call protected resources. See the [NIST AI glossary](https://www.nist.gov/artificial-intelligence/glossary).

**Blind Hunter** — Review agent persona that reviews code diffs with zero project context. Sees only the diff, assumes the worst about every line. Catches logic errors, security holes, dead code, and resource leaks. See [review process](review-process.md).

**BMAD-METHOD** — AI-driven agile planning framework (v6) providing structured agent personas, workflows, and skill integration. Installed at `_bmad/` in identity-stack-planning. See [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD).

**Canonical identity** — The Postgres-backed identity model that serves as the source of truth for users, tenants, roles, and permissions. Identity providers (Descope, Ory, etc.) become sync targets rather than the source of truth. Defined in PRD 5. See [system architecture](system-architecture.md#canonical-identity-data-model-prd-5).

**Claim normalization** — The process of mapping provider-specific JWT claims into a uniform format. Descope uses `dct` and `tenants` claims; Ory uses `realm_access.roles`; Entra uses `groups`. A Tyk Go plugin normalizes these into headers (`X-User-ID`, `X-User-Email`, `X-User-Roles`, `X-Tenant-ID`). Defined in PRD 4.

**ClaimMapper** — Go interface in the Tyk claim normalization plugin. Each identity provider has a concrete implementation (`DescopeMapper`, `OryMapper`, `GenericOIDCMapper`) that extracts user identity from provider-specific JWT structures. Defined in the PRD 4 architecture.

**DEPLOYMENT_MODE** — Environment variable (`standalone` | `gateway`) evaluated once at FastAPI startup. Controls which middleware is active: standalone mode runs JWT validation in FastAPI; gateway mode offloads it to Tyk. See ADR-GW-4 and ADR-GW-5.

**DPoP (Demonstrating Proof of Possession)** — An OAuth mechanism that binds a token to a client-held key and proves possession on each request. Defined by [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449.html).

**Edge Case Hunter** — Review agent persona that traces every branching path and boundary condition. Reports only genuinely unhandled paths where code will fail, crash, or produce wrong results. See [review process](review-process.md).

**FAPI (Financial-grade API)** — OpenID Foundation security profiles for high-risk OAuth deployments, adding requirements beyond the base OAuth/OIDC specifications. See the [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-security-profile-2_0.html).

**FGA (Fine-Grained Authorization)** — Authorization based on relationships among principals and resources, usually evaluated by a relationship engine. In this workspace FGA is an adapter boundary, not an identity-stack-owned engine. See [OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts).

**Identity Provider (IdP)** — A service that authenticates a subject and issues identity or authorization tokens to relying parties and clients. See [OpenID Connect Core §1.2](https://openid.net/specs/openid-connect-core-1_0.html#Terminology).

**IETF (Internet Engineering Task Force)** — The standards organization that publishes the RFC series used by the protocol contracts in this workspace. See the [IETF standards process](https://www.ietf.org/standards/process/).

**HTTP (Hypertext Transfer Protocol)** — The application protocol used for the resource-server and authorization-server interfaces in these plans. Defined by [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html).

**JSON Web Key Set (JWKS)** — A JSON document containing a set of JSON Web Keys used to publish signing or encryption keys. Defined by [RFC 7517 §5](https://www.rfc-editor.org/rfc/rfc7517.html#section-5).

**JSON Web Token (JWT)** — A compact, URL-safe representation of claims that can be signed and/or encrypted. Defined by [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html).

**IdentityProviderAdapter** — Abstract base class (ABC) defining the interface for syncing canonical identity operations to an external identity provider. Implementations: `DescopeSyncAdapter` (production), `NoOpSyncAdapter` (testing). Defined in PRD 5 architecture.

**IdentityService** — Abstract base class (ABC) defining the core contract for canonical identity operations (create_user, assign_role, create_tenant, etc.). Methods return `Result[T, IdentityError]` — never raise exceptions. The concrete implementation is `PostgresIdentityService`. Defined in PRD 5 architecture.

**idp_links** — Database table linking a canonical user to their identity at a specific provider. Contains `external_sub` (the provider's subject identifier), `provider_id`, and JSONB metadata. Enables one user to authenticate through multiple providers.

**Infisical** — Secrets management platform chosen over HashiCorp Vault for right-sized complexity. Used for centralized secret storage, audit logging, and runtime injection via `infisical run`. See PRD 1.

**MCP (Model Context Protocol)** — A protocol for connecting AI applications to tools and context providers. See the [MCP authorization specification](https://modelcontextprotocol.io/specification/latest/basic/authorization).

**Mutual TLS (mTLS)** — Mutual Transport Layer Security, in which both sides of a TLS connection authenticate with certificates. OAuth certificate-bound tokens and client authentication are defined by [RFC 8705](https://www.rfc-editor.org/rfc/rfc8705.html).

**MVP (Minimum Viable Product)** — The smallest product scope intended to validate a defined set of user outcomes. The open-identity MVP scope is recorded in [`prd-open-identity.md`](../_bmad-output/planning-artifacts/prd-open-identity.md).

**OAuth 2.0** — The authorization framework for obtaining limited access to protected resources. Defined by [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html).

**OAuth 2.1** — The current IETF consolidation profile for OAuth 2.0 security best practices, including authorization code with PKCE and removal of legacy flows. Track the [OAuth 2.1 IETF draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) for the normative status of this evolving specification.

**OIDC (OpenID Connect)** — An identity layer on top of OAuth 2.0 that allows a client to verify the end-user’s identity and obtain claims. Defined by [OpenID Connect Core §1](https://openid.net/specs/openid-connect-core-1_0.html#Introduction).

**OIDF (OpenID Foundation)** — The standards and certification organization responsible for OpenID Connect and related profiles. See the [OpenID Foundation specifications](https://openid.net/developers/specs/).

**OpenFGA** — An open-source relationship-based authorization service. In this workspace it is a possible binding for the relationship authorization port; it is not the authority for tokens, credentials, or policy. See [OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts).

**PAR (Pushed Authorization Requests)** — An OAuth endpoint through which a client sends an authorization request directly to the authorization server before redirecting the user. Defined by [RFC 9126](https://www.rfc-editor.org/rfc/rfc9126.html).

**PHI (Protected Health Information)** — Individually identifiable health information protected by the HIPAA Privacy Rule when held or transmitted by a covered entity or business associate. See the [U.S. HHS HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html).

**PII (Personally Identifiable Information)** — Information that can be used to distinguish or trace an individual’s identity, alone or combined with other linked information. See the [NIST glossary](https://csrc.nist.gov/glossary/term/personally_identifiable_information).

**PKCE (Proof Key for Code Exchange)** — An OAuth extension that protects the authorization-code flow by binding the exchange to a verifier held by the client. Defined by [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html).

**Phase** — A single unit of work within a ralph loop iteration. Each iteration completes one phase, then exits. Common phases: `analyze`, `plan`, `implement`, `test`, `review-blind`, `review-edge`, `review-acceptance`, `review-security`, `review-fix`, `docs`, `ci`, `complete`. See [ralph loop process](ralph-loop-process.md).

**Problem Detail** — RFC 9457 standard error response format. Used by the canonical identity service. Includes `type` (URI), `title`, `status`, `detail`, `instance` (request path), and `traceId` (OpenTelemetry). Content-Type: `application/problem+json`.

**PRD (Product Requirements Document)** — A planning artifact that records product problem, scope, requirements, and success criteria. See [`prd-open-identity.md`](../_bmad-output/planning-artifacts/prd-open-identity.md).

**Provider abstraction tiers** — Classification system for identity capabilities by cross-provider mapping feasibility:
- **Tier 1 (Abstract)** — Similar shape across providers; abstract with a common interface. Examples: User CRUD, ReBAC/authz, SSO/Federation, session management.
- **Tier 2 (Translate)** — Requires translation; interface + provider-specific adapters. Examples: RBAC roles/permissions, password policy.
- **Tier 3 (Provider-specific)** — Too divergent to abstract. Examples: multi-tenancy model, flows/orchestration, connectors, JWT claim structure.
See ADR-3 in [system architecture](system-architecture.md).

**RBAC (Role-Based Access Control)** — Access control in which permissions are assigned to roles and users or other principals receive permissions through role assignments. See the [NIST RBAC project](https://csrc.nist.gov/projects/role-based-access-control).

**ReBAC (Relationship-Based Access Control)** — Access control that evaluates relationships between a principal and a resource, such as “viewer of document A.” See [OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts).

**RAR (Rich Authorization Requests)** — An OAuth extension for expressing structured authorization details beyond a flat scope string. Defined by [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396.html).

**Ralph loop** — An autonomous execution cycle driven by Ralph Orchestrator. Reads the task queue, picks the next pending task, executes one phase per iteration, persists state to `.claude/task-state.md`, and signals completion. See [ralph loop process](ralph-loop-process.md).

**Ralph Orchestrator** — External autonomous AI agent orchestration tool. Rust-based, hat-based pub/sub architecture. Configured via `ralph.yml` in each application repo. See [mikeyobrien/ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator).

**Result[T, E]** — Functional error handling pattern used by canonical identity services. Methods return `Ok(value)` on success or `Error(IdentityError)` on failure. Routers map Results to HTTP responses via `result_to_response()`. Replaces `raise HTTPException` pattern.

**RFC (Request for Comments)** — The publication series used by the IETF to record Internet protocol specifications and related standards. See [RFC 7322](https://www.rfc-editor.org/rfc/rfc7322.html).

**Resource Server (RS)** — The OAuth component that hosts protected resources and accepts access tokens from clients. Defined by [RFC 6749 §1.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1).

**RLS (Row-Level Security)** — A database feature that restricts which rows a database user can access or modify. See the [PostgreSQL row security documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

**Review gate** — Quality checkpoint in the ralph loop. After all reviewers produce findings, the loop enters a fix phase. Blocking findings (MUST FIX, BLOCK, FAIL) must be resolved before the PR can be created. Maximum 3 fix iterations; unresolved findings block the PR. See [review process](review-process.md).

**Sentinel** — Review agent persona: pragmatic security auditor focused on the identity/auth domain. Reviews for tenant isolation, authorization bypass, injection, JWT validation gaps, and credential exposure. Reports only genuinely exploitable vulnerabilities with concrete attack scenarios. See [review process](review-process.md).

**SSRF (Server-Side Request Forgery)** — A vulnerability in which an attacker causes a server to make unintended requests, often to internal or metadata endpoints. Discovery and federation onboarding must defend against it. See the [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

**Task queue** — GitHub issues. Each repo's open issues are the work queue; ralph loops read them with `gh issue list` and per-workstream prompts carry their own embedded queue. The former markdown tracker (`_bmad-output/implementation-artifacts/task-queue.md`) was retired on 2026-09-05 for chronic drift; `implementation-artifacts/status.md` records the artifact → issue map.

**Task-state file** — Per-loop state persistence at `.claude/task-state.md` (or `task-state-<name>.md` for parallel loops). Contains current task ID, phase, branch, worktree path, implementation plan, and review findings. Enables crash recovery and manual inspection between phases.

**Viper** — Review agent persona: offensive red team specialist. Activated only for changes touching auth, middleware, token, or infrastructure code. Runs a 3-stage pipeline: Recon → Vulnerability Analysis → Exploit Validation. Scores findings with CVSS v3.1. See [review process](review-process.md).

**Worktree** — Git worktree used for filesystem isolation in story-based ralph loops. Each story gets its own worktree (e.g., `/tmp/sss-canonical-story-1.3`) so multiple loops can run in parallel without interference. Cleaned up when the story completes.

**Write-through sync** — Data consistency pattern used by the canonical identity model. API-originated writes go to Postgres first (source of truth), then sync to the identity provider. Sync failures are logged and warned but never rolled back — a reconciliation job catches up asynchronously. See ADR-CANON-7 in [system architecture](system-architecture.md).

**VC (Verifiable Credential)** — A tamper-evident credential that represents claims about a subject and can be presented for verification. Credential evidence is distinct from an authorization decision. See the [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/).

**VP (Verifiable Presentation)** — A presentation of one or more verifiable credentials, optionally bound to a holder, for a verifier to evaluate. Verification produces evidence; it does not by itself grant access. See the [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/).

**W3C (World Wide Web Consortium)** — The standards organization that develops open Web standards, including the Verifiable Credentials Data Model. See [W3C standards](https://www.w3.org/standards/).

**Zanzibar** — Google’s globally distributed authorization system and the design commonly associated with relationship tuples and consistent authorization checks. See the [Google Research paper](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/).
