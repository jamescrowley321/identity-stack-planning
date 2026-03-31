---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
inputDocuments: []
session_topic: 'Infrastructure toolchain expansion, API gateway, pluggable identity providers, and identity-stack evolution'
session_goals: 'Plan HCP TF state, Infisical secrets, Tyk gateway, node-oidc-provider integration + embedded, OpenFeature flags, repo rename — produce separate PRDs per initiative'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Morphological Analysis', 'Party Mode (Multi-Agent Discussion)']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** James
**Date:** 2026-03-29

## Session Overview

**Topic:** Infrastructure toolchain expansion, API gateway auth offloading, pluggable identity providers, and the evolution of identity-stack into identity-stack.

**Goals:**
1. Plan six interrelated but distinct initiatives across the auth workspace
2. Understand interdependencies and PRD boundaries
3. Get everything out of James's head into structured plans
4. Produce enough clarity for separate PRDs per initiative

**Initiatives:**
1. **HCP Terraform State** — remote state backend (James has an account)
2. **Infisical Secrets Management** — store TF-generated secrets (local or cloud)
3. **Tyk API Gateway** — local instance, migrate auth-adjacent features from app to gateway
4. **node-oidc-provider as integration target** — second OIDC provider for py-identity-model and identity-stack
5. **node-oidc-provider as embedded OIDC server** — NestJS/Fastify wrapper, full-blown Node OIDC provider
6. **OpenFeature + deployment topology** — feature flags to toggle standalone vs gateway mode
7. **Repo rename** — identity-stack → identity-stack

**Technique flow:** Question Storming → Morphological Analysis → Party Mode (multi-agent)

---

## Key Decision: Repo Rename

**identity-stack → identity-stack**

The project is evolving beyond Descope into a multi-provider, multi-topology identity reference platform. The rename should happen early while blast radius is small.

```
~/repos/auth/
├── identity-stack/              # renamed from identity-stack
├── py-identity-model/           # unchanged (already provider-agnostic)
├── terraform-provider-descope/  # unchanged (IS Descope-specific)
└── auth-planning/               # unchanged
```

---

## Research Completed (4 parallel agents)

### Infisical Summary
- Official Terraform provider (`infisical/infisical`) — TF-generated secrets flow directly to Infisical
- CLI injection (`infisical run`) — zero code changes to existing `.env`-based FastAPI code
- Self-hosted: single container + Postgres + Redis (~500MB RAM overhead)
- Cloud free tier: 5 users, unlimited projects/secrets
- MIT licensed, significantly simpler than Vault for this use case
- Bootstrap problem reduces to 2 secrets (Machine Identity client_id + client_secret)
- Recommendation: start with Infisical Cloud free tier, CLI injection for app consumption

### HCP Terraform Summary
- Free tier: unlimited workspaces, 500 runs/month, 5 users, automatic state locking
- Migration: single `terraform init -migrate-state` after adding `cloud` block
- Local execution mode preserves compatibility with custom provider fork
- Variable sets handle `DESCOPE_MANAGEMENT_KEY` as sensitive env var
- No native Infisical integration, but bidirectional flow via providers + CI post-apply
- Recommendation: single workspace, local execution mode, CLI-driven GitHub Actions

### Tyk Gateway Summary
- Tyk OSS + Redis is sufficient (MPL 2.0, no Dashboard license needed)
- Native multi-provider OIDC: validates both Descope and node-oidc-provider JWTs simultaneously
- 5 of 6 current FastAPI middlewares can offload: JWT validation, rate limiting, CORS, security headers, proxy headers
- Authorization (tenant roles/permissions) stays in FastAPI — Descope's nested claims are domain-specific
- API definitions as JSON files in `tyk/` directory — version-controlled
- Auth/authz boundary: Tyk = "is this token valid?", FastAPI = "does this user have role Y in tenant Z?"

### node-oidc-provider Summary
- MIT licensed, certified Basic through FAPI 2.0, sole maintainer (panva) sponsored by Auth0/Okta
- Can emit Descope-style multi-tenant JWTs via `extraTokenClaims` hook
- 10x faster startup than current .NET IdentityServer (~2s vs ~60s), 3x smaller image
- In-memory adapter works out of the box — zero infrastructure for v1
- For NestJS embedding: mount via controller, BYO login UI + user store
- No built-in multi-tenancy — single issuer + tenant claims approach matches Descope model
- Phased: v1 (in-memory, static config, devInteractions) → v2 (NestJS wrapper, custom UI) → v3 (persistent adapter, key rotation)

---

## Technique Execution: Phase 1 — Question Storming (51 questions)

### Infrastructure & Secrets (HCP TF + Infisical)

- **Q1:** What's the secret lifecycle? TF creates a Descope management key → where does it go → how does FastAPI read it → how does it rotate?
- **Q2:** Is Infisical replacing `.env` files entirely, or is it a layer on top for production while `.env` stays for local dev?
- **Q3:** If TF state is in HCP and secrets are in Infisical — who's the source of truth for a Descope project ID? TF output? Infisical? Both?
- **Q4:** Does Infisical need to exist before TF runs (chicken-and-egg), or does TF bootstrap Infisical?
- **Q5:** Is the goal "no secrets in git, no secrets in `.env`" or "secrets in `.env` for local dev, Infisical for deployed"?

### API Gateway (Tyk)

- **Q6:** Which features currently in the FastAPI middleware stack belong in the gateway? Rate limiting? CORS? Security headers? JWT validation? All of them?
- **Q7:** If Tyk validates JWTs, does the FastAPI backend still validate them too (defense in depth), or does it trust Tyk's headers?
- **Q8:** Does adding Tyk break the "clone and run" developer experience? How many containers is too many for `docker compose up`?
- **Q9:** Is Tyk the gateway for both frontend→backend AND backend→Descope API, or just the inbound edge?
- **Q10:** If we offload rate limiting to Tyk, do we rip it out of FastAPI or keep it as a fallback?

### node-oidc-provider (Integration Target)

- **Q11:** Is node-oidc-provider replacing Descope in the SaaS starter, or running alongside it as a second provider option?
- **Q12:** Can py-identity-model use node-oidc-provider as a conformance test target instead of (or alongside) the OpenID conformance suite?
- **Q13:** Does node-oidc-provider's claim structure support the multi-tenant JWT format (`dct`, `tenants` map) that the SaaS starter expects?
- **Q14:** If node-oidc-provider doesn't support FGA/ReBAC natively, does the SaaS starter need a "provider capabilities" abstraction sooner than planned?

### node-oidc-provider (Embedded OIDC Server)

- **Q15:** Is the Nest/Fastify OIDC server a new repo, a new package in the auth workspace, or part of an existing repo?
- **Q16:** What's the user store? Postgres? Does it share a database with the SaaS starter backend, or is it fully separate?
- **Q17:** Is this a "build your own Auth0" project, or a controlled OIDC provider for testing and demos?
- **Q18:** How does this relate to the multi-provider abstraction from last session? Is it provider #2 instead of Ory?

### Cross-Cutting

- **Q19:** What's the Docker Compose topology now? Frontend + Backend + DB. What does it become? Frontend + Tyk + Backend + DB + Infisical + node-oidc-provider? That's 6+ containers.
- **Q20:** Is there a "minimal" and "full" compose profile? (`docker compose --profile minimal up` vs `--profile full`?)
- **Q21:** Do these initiatives have a dependency order, or can they be independent PRDs/epics?
- **Q22:** Is the portfolio story "here's a production-grade reference architecture with gateway, secrets management, remote state, and pluggable identity providers"?

### Feature Flags / Deployment Modes (OpenFeature)

- **Q23:** Is the toggle binary ("standalone" vs "gateway") or granular? E.g., could you offload rate limiting to Tyk but keep JWT validation in FastAPI?
- **Q24:** OpenFeature is a spec — what's the backend provider? Flagsmith (OSS, self-hosted)? flagd? DevCycle? Or a simple file/env-based provider for a reference arch?
- **Q25:** Does the feature flag provider become another container in Docker Compose, or is a file-based provider sufficient for a demo?
- **Q26:** Where do the flags live — evaluated at startup (middleware chain assembly) or evaluated per-request (hot toggle)?
- **Q27:** If per-request, what's the cost? Checking a flag on every request to decide "should I validate this JWT or trust Tyk's headers" adds latency.
- **Q28:** Is the right pattern actually middleware that checks "am I behind a gateway?" by looking for a trusted header (e.g., `X-Tyk-Request-ID`) rather than a feature flag?
- **Q29:** Does OpenFeature add portfolio value beyond the gateway toggle? E.g., could you use it for tenant-level feature rollout, A/B testing, or gradual feature release in the SaaS starter?
- **Q30:** Is the "standalone" mode the default and gateway mode is opt-in? Or vice versa?
- **Q31:** Does this map to `docker compose --profile standalone` vs `--profile gateway`? Profiles control which containers start, feature flags control which code paths execute?
- **Q32:** What about `--profile full` that runs everything — Tyk + Infisical + node-oidc-provider + observability?
- **Q33:** Is the real story here "here's how to progressively adopt an API gateway without rewriting your app" — feature flags as the migration strategy?
- **Q34:** Does this become a reference pattern: "Step 1: build with middleware. Step 2: add gateway with feature flags. Step 3: flip flags to offload. Step 4: remove dead middleware code"?
- **Q35:** Or do you keep both paths permanently — standalone for simple deployments, gateway for production?
- **Q36:** Does OpenFeature also toggle the identity provider? `PROVIDER=descope` vs `PROVIDER=node-oidc` vs `PROVIDER=ory`? Or is that a separate config concern?
- **Q37:** If both feature flags AND provider selection are runtime-configurable, is the SaaS starter becoming a reference platform rather than a starter kit?
- **Q38:** What's the testing matrix? Do you CI-test both profiles, or is gateway-mode tested manually?

### node-oidc-provider Scoping

- **Q39:** Is the MVP literally "node-oidc-provider + in-memory adapter + static client config + hardcoded users" — a zero-infrastructure OIDC provider that starts in 2 seconds?
- **Q40:** Does the embedded provider serve double duty — integration test fixture for py-identity-model AND the seed of the "build your own Auth0" project? Or are those separate efforts?
- **Q41:** If in-memory only, does it restart clean every time (ephemeral) or do you want seed data loaded on startup (users, clients, tenant config)?
- **Q42:** Is the login UI out of scope for v1? Just use `devInteractions` (the built-in dev-only consent screen) and focus on the protocol layer?

### Naming / Identity

- **Q43:** What's the project actually becoming? "Identity-aware SaaS reference architecture" vs "auth platform starter" vs "multi-provider identity demo"?
- **Q44:** Does the name need to signal "Descope" at all anymore, or is Descope just one pluggable provider?
- **Q45:** Does renaming apply to just the SaaS starter repo, or the whole `~/repos/auth/` workspace?
- **Q46:** Does the workspace name `auth` still work as the umbrella, with the SaaS starter getting a more specific name?
- **Q47:** Is the rename a clean break (new repo) or just `git remote set-url` + GitHub repo rename?
- **Q48:** Does the rename happen now (before more features land) or after the multi-provider abstraction is proven?
- **Q49:** Does the rename happen as a standalone task before new features, or bundled with the first new initiative?
- **Q50:** Does `py-identity-model` keep its name? It's already provider-agnostic.
- **Q51:** Does `terraform-provider-descope` keep its name? It IS Descope-specific, so that still fits.

### Key Decisions Made During Question Storming

1. **Repo rename: identity-stack → identity-stack** — happen early while blast radius is small
2. **node-oidc-provider v1: in-memory only** — no configuration management system, no persistent adapter, no custom login UI. Start with zero-infrastructure OIDC provider.
3. **Standalone mode preserved** — OpenFeature flags toggle features that behave differently behind the gateway. One codebase, two deployment modes.
4. **Docker Compose profiles** — `standalone` vs `gateway` vs `full` control which containers start; feature flags control which code paths execute.

### Identified PRD Candidates

1. **PRD: HCP Terraform + Infisical** — infrastructure secrets pipeline (may be one PRD or two)
2. **PRD: Tyk API Gateway** — auth offloading, middleware migration, deployment topology
3. **PRD: OpenFeature Integration** — feature flags, standalone/gateway toggle, deployment profiles
4. **PRD: node-oidc-provider Integration** — py-identity-model test fixture + identity-stack second provider
5. **PRD: Embedded OIDC Provider** — NestJS/Fastify wrapper, new repo in auth workspace
6. **PRD: Repo Rename** — identity-stack → identity-stack (may be a task, not a full PRD)

---

## Technique Execution: Phase 2 — Morphological Analysis

### Initiative Key

| # | Initiative | Short Name |
|---|---|---|
| I1 | HCP Terraform remote state backend | HCP TF |
| I2 | Infisical secrets management | Infisical |
| I3 | Tyk API Gateway | Tyk |
| I4 | node-oidc-provider as integration test target + identity-stack second provider | node-oidc (test) |
| I5 | Embedded node-oidc-provider in NestJS/Fastify | node-oidc (embedded) |
| I6 | OpenFeature integration | OpenFeature |
| I7 | Repo rename: identity-stack → identity-stack | Rename |

---

### Dimension 1: Initiative × Deployment Topology

How does each initiative behave across the three Docker Compose profiles?

| Initiative | `standalone` (no gateway, no extras) | `gateway` (Tyk + Redis) | `full` (everything) |
|---|---|---|---|
| **I1 HCP TF** | No runtime impact — state backend is purely IaC. Works identically in all profiles. | Same | Same |
| **I2 Infisical** | CLI injection via `infisical run` wrapping `uvicorn`. No Infisical container needed if using cloud. Self-hosted adds 3 containers (Infisical + Postgres + Redis). | Same — secrets injection is orthogonal to gateway. | Self-hosted Infisical containers included. Cloud tier: no extra containers. |
| **I3 Tyk** | **Not present.** FastAPI runs its full middleware stack (JWT validation, rate limiting, CORS, security headers). | **Core addition.** Tyk + Redis containers. Frontend points to Tyk (:8080). FastAPI middleware stripped down to CorrelationId + authorization only. | Included. |
| **I4 node-oidc (test)** | Not present at runtime — this is a test-time dependency only (Docker Compose for integration tests). | Same — test fixture, not a deployment component. | node-oidc-provider container available as a live second OIDC provider for demo purposes. |
| **I5 node-oidc (embedded)** | Separate service/container (NestJS app). Could run alongside identity-stack as a second provider. | Tyk validates JWTs from both Descope AND node-oidc-provider (multi-provider OIDC config). | Included — full multi-provider demo. |
| **I6 OpenFeature** | Flags evaluated to `standalone` profile defaults. FastAPI runs full middleware. Flag provider: file-based or env-based (no extra container). | Flags evaluated to `gateway` profile. FastAPI skips JWT validation, rate limiting, CORS, security headers (Tyk handles them). Same flag provider. | All flags enabled. May include flagd container if using OpenFeature's reference implementation. |
| **I7 Rename** | No topology impact — rename is a metadata/CI change. | Same | Same |

**Key insight:** Only I3 (Tyk), I5 (embedded node-oidc), and I6 (OpenFeature) have meaningful topology variance. I1, I2, I7 are topology-agnostic. I4 is test-only.

**Profile container counts:**
- `standalone`: Frontend + Backend + DB = 3 containers (unchanged from today)
- `gateway`: Frontend + Backend + DB + Tyk + Redis = 5 containers
- `full`: Frontend + Backend + DB + Tyk + Redis + node-oidc-provider + (optionally Infisical stack + flagd + Tyk Pump + Prometheus) = 6-12 containers

---

### Dimension 2: Initiative × Dependency Order

What blocks what? Directed acyclic graph of dependencies.

```
I7 Rename ─────────────────────────────────────────────────────────┐
  │  (do first — minimal blast radius, all later work uses new name) │
  ▼                                                                  │
I1 HCP TF ──────► I2 Infisical                                      │
  │                  │                                                │
  │  (HCP TF first   │  (Infisical stores TF outputs,               │
  │   — state must    │   so HCP TF should exist first               │
  │   be remote       │   to have outputs worth storing)             │
  │   before adding   │                                              │
  │   providers)      │                                              │
  ▼                  ▼                                               │
  ├──────────────────┤                                               │
  │                  │                                                │
  │                  ▼                                                │
  │            I3 Tyk ◄───── I6 OpenFeature                          │
  │              │             │                                      │
  │              │  (Tyk must  │ (OpenFeature gates                   │
  │              │   exist     │  standalone vs gateway;              │
  │              │   before    │  can be built alongside Tyk          │
  │              │   flags     │  or slightly after)                  │
  │              │   toggle    │                                      │
  │              │   to it)    │                                      │
  │              ▼             │                                      │
  │        I4 node-oidc (test) │                                     │
  │              │              │                                     │
  │              │  (test       │                                     │
  │              │   fixture    │                                     │
  │              │   validates  │                                     │
  │              │   multi-     │                                     │
  │              │   provider)  │                                     │
  │              ▼              │                                     │
  │        I5 node-oidc (embedded)                                   │
  │              (requires I4 proven,                                 │
  │               Tyk multi-provider working,                        │
  │               embedded is future scope)                          │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
```

**Strict dependency chain:**
1. **I7 Rename** — zero dependencies, unblocks everything (new name in all CI, docs, references)
2. **I1 HCP TF** — depends only on I7 (rename workspace references)
3. **I2 Infisical** — depends on I1 (needs TF outputs to store) but can start in parallel (cloud setup is independent)
4. **I3 Tyk** — independent of I1/I2. Can start after I7.
5. **I6 OpenFeature** — soft dependency on I3 (flags are meaningless without both modes existing). Build alongside or just after Tyk.
6. **I4 node-oidc (test)** — independent of infra initiatives. Can start anytime. Soft dependency on I3 (validates multi-provider JWT validation in Tyk).
7. **I5 node-oidc (embedded)** — depends on I4 proving the provider works + I3/I6 for multi-provider deployment topology.

**Parallelizable pairs:**
- I1 + I3 (infra vs gateway — no dependency)
- I2 + I4 (secrets vs test fixture — no dependency)
- I3 + I4 (gateway vs test fixture — complementary but independent)

---

### Dimension 3: Initiative × PRD Boundary

Should each initiative be a separate PRD, or can some be bundled?

| Initiative | PRD Recommendation | Rationale |
|---|---|---|
| **I1 HCP TF** | **Bundle with I2** as "PRD: Infrastructure Secrets Pipeline" | HCP TF and Infisical form a coherent pipeline: remote state → secrets storage → app consumption. Separate PRDs would have overlapping acceptance criteria. |
| **I2 Infisical** | **Bundle with I1** (see above) | The TF-outputs-to-Infisical flow is the core value proposition. Standalone Infisical without HCP TF is just a secrets manager swap. |
| **I3 Tyk** | **Standalone PRD: API Gateway** | Large scope — Docker Compose, API definitions, middleware migration, frontend re-pointing. Clear boundary: "move auth/cross-cutting from app to gateway." |
| **I4 node-oidc (test)** | **Bundle with I5** as "PRD: Pluggable Identity Providers" OR **standalone if I5 is deferred** | If I5 is in scope, they form a continuum (test fixture → embedded provider). If I5 is deferred to a later cycle, I4 stands alone as "PRD: Multi-Provider Test Infrastructure." |
| **I5 node-oidc (embedded)** | **Bundle with I4** (see above) OR **separate PRD if I4 ships first** | If I4 ships in an earlier sprint, I5 gets its own PRD as a follow-up. |
| **I6 OpenFeature** | **Bundle with I3** as part of "PRD: API Gateway" | OpenFeature flags are the mechanism that makes standalone/gateway coexistence work. Without OpenFeature, Tyk is an all-or-nothing change. They're architecturally coupled. |
| **I7 Rename** | **Task, not PRD** | A repo rename is a chore — GitHub rename, update CI, update cross-repo references, update CLAUDE.md files. No architectural decisions, no user stories. A single task in whatever sprint it lands in. |

**Proposed PRD structure:**

```
PRD 1: Infrastructure Secrets Pipeline (I1 + I2)
  ├── Epic 1: HCP Terraform remote state migration
  ├── Epic 2: Infisical secrets management setup
  └── Epic 3: TF → Infisical → App secret flow

PRD 2: API Gateway & Deployment Topology (I3 + I6)
  ├── Epic 1: Tyk Gateway integration (Docker Compose, API defs, JWT validation)
  ├── Epic 2: Middleware migration (offload rate limiting, CORS, security headers, JWT)
  ├── Epic 3: OpenFeature flag integration (standalone/gateway toggle)
  └── Epic 4: Docker Compose profiles (standalone, gateway, full)

PRD 3: Multi-Provider Identity (I4 + I5, or I4 standalone)
  ├── Epic 1: node-oidc-provider test fixture (py-identity-model integration tests)
  ├── Epic 2: node-oidc-provider as identity-stack second provider
  ├── Epic 3: Tyk multi-provider OIDC configuration
  └── Epic 4 (if I5 in scope): Embedded NestJS OIDC server (v1: in-memory)

Task: Repo rename identity-stack → identity-stack (I7)
```

---

### Dimension 4: Initiative × Repo Impact

Which repos does each initiative touch?

| Initiative | identity-stack (née identity-stack) | py-identity-model | terraform-provider-descope | auth-planning |
|---|---|---|---|---|
| **I1 HCP TF** | `infra/` — add `cloud` block, migrate state | — | `CLAUDE.md` reference updates | PRD, task queue |
| **I2 Infisical** | `docker-compose.yml` (CLI injection or Infisical containers), backend entrypoint, `.env` elimination | — | Provider config to pull/push Infisical secrets | PRD, task queue |
| **I3 Tyk** | `tyk/` directory (config, API defs, policies), `docker-compose.yml` (Tyk + Redis), frontend API base URL, backend middleware removal | — | — | PRD, task queue |
| **I4 node-oidc (test)** | Test fixtures if integration tests live here | `test-fixtures/node-oidc-provider/` (provider.js, Dockerfile), `docker-compose.test.yml`, integration test updates | — | PRD, task queue |
| **I5 node-oidc (embedded)** | Docker Compose (node-oidc container), Tyk multi-provider config, possibly new `providers/` directory for abstraction | May add Descope-style claim format tests | — | PRD, task queue |
| **I6 OpenFeature** | Backend `pyproject.toml` (openfeature-sdk), middleware factory, feature flag config, Docker Compose profiles | — | — | PRD, task queue |
| **I7 Rename** | GitHub repo rename, all CI references, package name, Docker image tags | Cross-ref updates in examples | — | CLAUDE.md, all cross-repo references |

**Repo touch count:**
- identity-stack: **all 7 initiatives** touch it (it's the center of gravity)
- auth-planning: **all 7** (planning artifacts)
- py-identity-model: **I4, I5** (test fixtures, multi-provider claims testing)
- terraform-provider-descope: **I1, I2** (state migration, secrets flow)

**Key observation:** identity-stack is the blast center. This reinforces the "rename early" decision — every initiative will reference this repo.

---

### Dimension 5: Initiative × Phasing (v1 → v2 → v3)

What's the minimum viable version of each, and where does it evolve?

| Initiative | v1 (MVP — ship first) | v2 (enhance) | v3 (mature) |
|---|---|---|---|
| **I1 HCP TF** | Single workspace, local execution mode, `terraform init -migrate-state`, CLI-driven. | Variable sets for multi-environment (dev/staging/prod). GitHub Actions CI with plan-on-PR, apply-on-merge. | VCS-driven runs (if provider is published to registry). Sentinel/OPA policies. |
| **I2 Infisical** | Cloud free tier. CLI injection (`infisical run`). Folders: `/backend`, `/frontend`, `/infra`. Machine Identity for CI. | TF provider integration (bidirectional secret flow). Remove all `.env` files. | Self-hosted Infisical in Docker Compose. Secret rotation for Descope keys. Infisical Agent sidecar pattern. |
| **I3 Tyk** | Tyk OSS + Redis. JWT validation for Descope. Rate limiting offload. File-based API definitions in `tyk/`. | CORS + security headers offload. Tyk Pump + Prometheus for observability. Multi-provider OIDC (Descope + node-oidc-provider). | Custom Go plugin for Descope claim extraction. API versioning. Full middleware removal from FastAPI. |
| **I4 node-oidc (test)** | Docker container with in-memory adapter, static clients, `devInteractions`, client_credentials grant. Replace .NET IdentityServer in py-identity-model integration tests. | Descope-style `dct`/`tenants` claims via `extraTokenClaims`. Multiple key types (RSA + EC). Dual-issuer testing. | Full OIDC conformance test harness. Key rotation scenarios. Token introspection + revocation test coverage. |
| **I5 node-oidc (embedded)** | NestJS wrapper, in-memory adapter, static client config, `devInteractions` login UI, zero infrastructure. HTTP only. | Custom login/consent UI. PostgreSQL adapter for persistence. Seed data on startup. | Key rotation automation. MFA support. Custom grant types. Production-grade deployment. |
| **I6 OpenFeature** | File-based or env-based provider (no extra container). Binary flag: `DEPLOYMENT_MODE=standalone|gateway`. Middleware factory reads flag at startup. | Per-feature flags (rate_limiting, cors, jwt_validation, security_headers). flagd container for hot-toggle. | Tenant-level feature rollout. A/B testing. Gradual feature release. Provider-selection flags (`IDENTITY_PROVIDER=descope|node-oidc`). |
| **I7 Rename** | GitHub repo rename + remote URL update. Update CLAUDE.md cross-references. Update CI workflows. | Update Docker image names, package references, documentation. | — (complete after v2) |

---

### Cross-Dimensional Synthesis: Key Findings

**Finding 1: Two natural sprint bundles emerge**

- **Sprint A (Infrastructure):** I7 (rename) → I1 (HCP TF) → I2 (Infisical) — sequential, small blast radius, foundational
- **Sprint B (Gateway + Multi-Provider):** I3 (Tyk) + I6 (OpenFeature) + I4 (node-oidc test) — can parallelize, larger architectural impact

I5 (embedded node-oidc) is genuinely future scope — it depends on I4 being proven and has the highest complexity.

**Finding 2: OpenFeature is architecturally necessary, not optional**

Without OpenFeature flags, adding Tyk means choosing one deployment mode. The flags are what make the `standalone`/`gateway` profiles work with a single codebase. I6 must ship with or immediately after I3.

**Finding 3: The rename has zero dependencies and low risk**

I7 should be the very first thing done. Every subsequent initiative benefits from the correct name. Delaying the rename means every PR, every doc, every CI workflow uses the old name and needs updating later.

**Finding 4: Infisical Cloud eliminates the container-count concern**

Q8 from Question Storming asked "does adding Tyk break the clone-and-run experience?" Using Infisical Cloud (not self-hosted) means secrets management adds zero containers to Docker Compose. The `standalone` profile stays at 3 containers. Only `gateway` (5) and `full` (6-12) grow.

**Finding 5: I4 (node-oidc test) serves double duty with almost no extra work**

The same Docker container used as a py-identity-model integration test fixture becomes identity-stack's second OIDC provider. The only addition is wiring it into Tyk's multi-provider config and adding it to the `full` Docker Compose profile.

**Finding 6: The v1 of every initiative is small and shippable**

No initiative requires a large v1. The heaviest v1 is I3 (Tyk) and even that is "add 2 containers + 3 config files + update frontend URL." This validates the "incremental, separate PRDs" approach over a monolithic rollout.

---

## Technique Execution: Phase 3 — Party Mode (Multi-Agent Architectural Validation)

**Participants:** Winston (Architect), John (PM), Bob (SM), Amelia (Dev), Sally (UX)

### Round 1: Validation of Morphological Analysis

#### PRD Boundaries — Validated

- **PRD 1 (I1+I2) confirmed** — HCP TF and Infisical form a pipeline, not two independent systems. Output of one feeds input of the other. One PRD, three epics.
- **PRD 2 (I3+I6) confirmed** — OpenFeature flags are architecturally load-bearing for standalone/gateway coexistence. They must ship with Tyk.
- **PRD 3: Scope sharpened** — I5 (embedded NestJS OIDC server) deferred to backlog. PRD 3 stays focused on I4: "node-oidc-provider as lightweight test fixture and second provider." I5 is a separate product effort (login UI, user stores, persistent adapters) — not an epic, a project.
- **I7 (Rename) confirmed as task, not PRD** — but must be Sprint 0 material (before Sprint 1 starts, not during).

#### Dependency Order — Softened

- I1 → I2 dependency is softer than originally drawn. Infisical Cloud setup (create project, import `.env` values, wire CLI injection) has zero dependency on HCP TF remote state. **Parallel start, converge at integration.**
- Overall dependency graph validated.

#### Phasing — v1 Scopes Validated

All v1 scopes confirmed as small and shippable:
- **I1**: One file change (`cloud {}` block) + one command (`terraform init -migrate-state`)
- **I2**: `infisical run` in compose entrypoint + 2 env vars. Zero app code changes.
- **I3**: New `tyk/` directory (3 config files) + 2 compose services + 1 env var update
- **I4**: `test-fixtures/node-oidc-provider/` with ~100 lines JS + ~5 line Dockerfile
- **I6**: ~50 lines middleware factory code. v1 may not need OpenFeature SDK at all — plain `DEPLOYMENT_MODE` env var gets 90% of value. SDK adds value for hot-toggle/per-tenant flags (v2/v3).
- **I7**: `gh repo rename` + 4-5 file reference updates

#### Docker Compose Profiles — Validated with UX Guidance

- **Default (no `--profile` flag) = `standalone`** — must give a working app. New developers should never see a broken first experience.
- Container counts: standalone (3), gateway (5), full (6-12) — acceptable.
- **Frontend API base URL should be profile-driven** via compose env var, not manually configured. Prevents developer confusion when switching profiles.

#### Risk Areas Identified

1. **Rename coordination tax** — I7 cascades: GitHub remote URL, developer re-clone, CI workflows, Docker image tags, cross-repo CLAUDE.md. 1-day task with 3-day communication tail. Do it in Sprint 0.
2. **Tyk middleware migration vs Descope feature waves** — modifying the same middleware stack simultaneously causes merge conflicts. **Decision: finish Descope feature work first, then start toolchain expansion.**
3. **Single-developer parallelism** — parallelizable pairs are theoretical. One developer means context-switching, not parallelism. **Sequence by sprint theme:** Sprint 0 (rename) → Sprint 1 (infra) → Sprint 2 (gateway) → Sprint 3 (multi-provider).

### Round 2: New Use Case — Multi-IdP Gateway Demo (PRD 4)

James introduced a new initiative during Party Mode:

**I8: Multi-IdP Gateway Demo** — A UI with multiple embedded panels, each pointing to a distinct identity provider (Descope, Ory Hydra, node-oidc-provider, Entra ID, Cognito, etc.). Each panel performs an OIDC popup flow, then makes a round-trip API call through Tyk. A Tyk Go plugin normalizes heterogeneous claims into canonical headers. The backend is fully IdP-agnostic.

#### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   identity-stack UI                       │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Descope  │ │   Ory    │ │ node-oidc│ │  Entra   │...│
│  │  Panel   │ │  Panel   │ │  Panel   │ │  Panel   │   │
│  │ [Login]  │ │ [Login]  │ │ [Login]  │ │ [Login]  │   │
│  │ popup→   │ │ popup→   │ │ popup→   │ │ popup→   │   │
│  │ IdP      │ │ Hydra    │ │ localhost│ │ login.ms │   │
│  │ ✅ Token │ │ ✅ Token │ │ ✅ Token │ │ ✅ Token │   │
│  │ ↓ API    │ │ ↓ API    │ │ ↓ API    │ │ ↓ API    │   │
│  │ {canon.} │ │ {canon.} │ │ {canon.} │ │ {canon.} │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│         │            │            │            │         │
└─────────┼────────────┼────────────┼────────────┼─────────┘
          ▼            ▼            ▼            ▼
    ┌─────────────────────────────────────────────────┐
    │              Tyk Gateway (:8080)                 │
    │                                                  │
    │  Multi-provider OIDC validation                  │
    │                                                  │
    │  ┌────────────────────────────────────────────┐  │
    │  │     Claim Normalization Plugin (Go)         │  │
    │  │                                            │  │
    │  │  Input (varies by IdP):                    │  │
    │  │    Descope: { dct, tenants.T1.roles }      │  │
    │  │    Ory:     { ext.roles, metadata }        │  │
    │  │    Entra:   { roles[], groups[], tid }      │  │
    │  │    Cognito: { cognito:groups }              │  │
    │  │    node-oidc: { dct, tenants }             │  │
    │  │                                            │  │
    │  │  Output (canonical headers):               │  │
    │  │    X-User-ID: sub                          │  │
    │  │    X-User-Email: email                     │  │
    │  │    X-IdP: descope|ory|entra|cognito|...    │  │
    │  │    X-Roles: ["admin","viewer"]             │  │
    │  │    X-Tenant: tenant-id (if applicable)     │  │
    │  └────────────────────────────────────────────┘  │
    └──────────────────┬───────────────────────────────┘
                       ▼
    ┌──────────────────────────────────────────────────┐
    │           FastAPI Backend (:8000)                  │
    │  Reads ONLY canonical headers.                    │
    │  GET /api/whoami → returns normalized identity    │
    │  Backend is fully IdP-agnostic.                   │
    └──────────────────────────────────────────────────┘
```

#### Plugin Architecture

```
tyk/plugins/claim-normalizer/
├── main.go          # Plugin entry point, PostAuth hook
├── mappers/
│   ├── mapper.go    # ClaimMapper interface
│   ├── descope.go   # Descope → canonical
│   ├── ory.go       # Ory Hydra → canonical
│   ├── entra.go     # Entra ID → canonical
│   ├── cognito.go   # Cognito → canonical
│   └── generic.go   # Fallback: standard OIDC claims only
├── go.mod
└── go.sum
```

**Plugin must be compiled against the exact Tyk version's Go toolchain** using `tykio/tyk-plugin-compiler` Docker image. Requires `build-plugin` Makefile target.

#### PRD 4 Structure

```
PRD 4: Multi-IdP Gateway Demo (I8)
  ├── Epic 1: Tyk claim normalization plugin (Go) — canonical header mapping
  ├── Epic 2: Multi-IdP UI — provider card grid, popup OIDC flow, round-trip display
  ├── Epic 3: IdP provisioning — Docker Compose for local IdPs, config for cloud IdPs
  └── Epic 4: Demo API endpoint — GET /api/whoami returning normalized identity
```

#### Phasing

- **v1**: 3 IdPs — Descope (cloud, already have), node-oidc-provider (local, zero-config), Ory Hydra (local Docker, zero-config). All work out of the box with `docker compose --profile full up`.
- **v2**: Add cloud IdPs (Entra ID, Cognito) with setup instructions. More mapper implementations.
- **v3**: Add IdentityServer (.NET), additional providers, advanced claim mapping scenarios.

#### Dependency Chain (Updated)

```
Descope feature completion (previous session waves)
  → I7 Rename (Sprint 0)
  → I1 + I2 Infrastructure (Sprint 1)
  → I3 + I6 Gateway + OpenFeature (Sprint 2)
  → I4 node-oidc test fixture (Sprint 3)
  → I8 Multi-IdP Gateway Demo (Sprint 4 — capstone)
```

I5 (embedded node-oidc NestJS server) deferred to backlog — revisit after the demo validates the multi-provider story.

#### Key Decisions from Party Mode

| Decision | Rationale |
|---|---|
| Everything stays in identity-stack repo | Plugin, UI, config — one repo, one deployment unit. Tightly coupled to gateway config. |
| PRD 4 is separate from PRD 2 | Different user story: PRD 2 = "offload middleware", PRD 4 = "demonstrate multi-IdP federation" |
| v1 OpenFeature may use plain env var | `DEPLOYMENT_MODE=standalone\|gateway` at startup. SDK adds value for hot-toggle (v2). |
| Default Docker Compose profile = standalone | No `--profile` flag = working app. Gateway is opt-in. |
| Frontend API URL is profile-driven | Compose env var, not manual config. Prevents developer confusion. |
| Finish Descope features before starting toolchain | Avoid merge conflicts in shared middleware stack. |
| Sequence sprints by theme, not parallelize | Solo developer. Context-switching is not parallelism. |

---

## Revised PRD Plan (Final)

```
Task: Repo rename identity-stack → identity-stack (I7)
  └── Sprint 0 (pre-sprint)

PRD 1: Infrastructure Secrets Pipeline (I1 + I2)
  ├── Epic 1: HCP Terraform remote state migration
  ├── Epic 2: Infisical secrets management setup (Cloud free tier)
  └── Epic 3: TF → Infisical → App bidirectional secret flow
  └── Sprint 1

PRD 2: API Gateway & Deployment Topology (I3 + I6)
  ├── Epic 1: Tyk Gateway integration (Docker Compose, API defs, JWT validation)
  ├── Epic 2: Middleware migration (rate limiting first, then CORS, security headers)
  ├── Epic 3: OpenFeature / deployment mode toggle
  └── Epic 4: Docker Compose profiles (standalone, gateway, full)
  └── Sprint 2

PRD 3: Multi-Provider Test Infrastructure (I4)
  ├── Epic 1: node-oidc-provider test fixture for py-identity-model
  ├── Epic 2: node-oidc-provider as identity-stack second provider
  └── Epic 3: Tyk multi-provider OIDC configuration
  └── Sprint 3

PRD 4: Multi-IdP Gateway Demo (I8)
  ├── Epic 1: Claim normalization plugin (Go, PostAuth hook)
  ├── Epic 2: Multi-IdP demo UI (provider card grid, popup OIDC, round-trip display)
  ├── Epic 3: Local IdP provisioning (node-oidc + Ory Hydra in Docker Compose)
  └── Epic 4: Demo API — GET /api/whoami (canonical identity response)
  └── Sprint 4 (capstone)

Backlog: Embedded OIDC Provider (I5)
  └── NestJS/Fastify wrapper — revisit after PRD 4 validates multi-provider story
```

---

## Session Summary

### Techniques Used

1. **Question Storming** — 51 questions across 7 initiative areas, 4 key decisions made
2. **Morphological Analysis** — 5-dimension matrix producing 6 key findings
3. **Party Mode (Multi-Agent Discussion)** — Architectural validation with 5 BMAD agents, new use case (I8) surfaced and integrated

### Key Achievements

- **51 strategic questions** mapped the decision space
- **5-dimensional morphological matrix** (topology, dependencies, PRD boundaries, repo impact, phasing) identified sprint bundles, soft dependencies, and container-count implications
- **Multi-agent validation** confirmed PRD boundaries, sharpened scope (I5 deferred), identified 3 scheduling risks, and surfaced the Multi-IdP Gateway Demo (PRD 4) as the capstone initiative
- **4 PRDs + 1 task** with clear dependency ordering and sprint-per-theme sequencing
- **Execution ordering settled**: Descope feature completion → rename → infra → gateway → multi-provider → multi-IdP demo

### Decisions Register

| # | Decision | Source |
|---|---|---|
| D1 | Repo rename to identity-stack (do in Sprint 0) | Question Storming |
| D2 | node-oidc-provider v1: in-memory only, no config management | Question Storming |
| D3 | Standalone mode preserved via feature flags + Docker Compose profiles | Question Storming |
| D4 | Docker Compose profiles: standalone, gateway, full | Question Storming |
| D5 | I1 (HCP TF) and I2 (Infisical) can start in parallel, converge at integration | Party Mode |
| D6 | I5 (embedded NestJS OIDC) deferred to backlog | Party Mode |
| D7 | v1 OpenFeature: plain env var, SDK in v2 | Party Mode |
| D8 | Default compose profile = standalone (no flag = working app) | Party Mode |
| D9 | Frontend API URL driven by compose profile env var | Party Mode |
| D10 | Finish Descope features before starting toolchain expansion | Party Mode |
| D11 | Sequence sprints by theme (solo developer) | Party Mode |
| D12 | Everything stays in identity-stack repo (plugin, demo UI, all config) | Party Mode |
| D13 | PRD 4 (Multi-IdP Demo) is separate PRD, not added to PRD 2 | Party Mode |
