# auth-planning

Planning hub for a multi-repo identity platform built on Descope, demonstrating how AI orchestration can coordinate planning and implementation across multiple repositories at scale.

## The Problem

Building a production identity platform means juggling OIDC/OAuth2 libraries, Terraform infrastructure-as-code, and a full-stack application — each with their own repo, language, and release cycle. Traditional planning tools don't bridge the gap between "what we decided" and "what got built." AI-generated code compounds this: you need rigorous review processes that don't share context with the implementation.

## What We're Building

A vertically integrated identity platform spanning three application repositories, with this repo as the planning and orchestration layer:

**[py-identity-model](https://github.com/jamescrowley321/py-identity-model)** — Production OIDC/OAuth2.0 Python library providing JWT decoding, token validation, and discovery with dual sync/async APIs. Implements 15+ RFCs including PKCE, DPoP, PAR, JAR, Device Authorization, Token Exchange, Introspection, Revocation, and FAPI 2.0 security profiles. Used as the token validation foundation for the identity-stack backend.

**[terraform-provider-descope](https://github.com/jamescrowley321/terraform-provider-descope)** — Terraform provider for Descope (Go) managing project infrastructure: roles, permissions, tenants, SSO, access keys, FGA, and password settings. Published to the Terraform Registry.

**[identity-stack](https://github.com/jamescrowley321/identity-stack)** — Full-stack SaaS starter kit with a FastAPI backend, Vite/React frontend (shadcn/ui + Tailwind), and Terraform infrastructure. Features multi-tenant RBAC, fine-grained authorization (ReBAC), social login, passkeys, structured logging, rate limiting, and an admin portal.

### Data Flow

```
terraform-provider-descope            py-identity-model
  (provisions Descope infra)            (validates tokens at runtime)
         |                                       |
         |  roles, permissions,                  |  OIDC discovery, JWKS,
         |  tenants, SSO, keys                   |  JWT decode & validate
         v                                       v
                    identity-stack
         +--------------------------------------------+
         |  React frontend    |  FastAPI backend       |
         |  react-oidc-context |  TokenValidation-     |
         |  OAuth2 code flow  |  Middleware uses       |
         |  Descope hosted    |  py-identity-model     |
         |  login             |                        |
         +--------------------------------------------+
```

## What We've Accomplished

**py-identity-model** — All 16 protocol features shipped and published (v2.17.1). Full review cycle complete across 100+ merged PRs. Integration test harness deployed using node-oidc-provider for RFC-compliant validation.

**terraform-provider-descope** — 15 resources and 4 data sources implemented. Published to Terraform Registry (v1.1.x). All review fix cycles complete across 65+ merged PRs.

**identity-stack** — Core platform operational: session management, tenant management, RBAC, custom attributes, access keys, admin portal, FGA/ReBAC, social login, passkeys. Security hardening complete (headers, rate limiting, audit logging, structured logging, health checks, retry logic). UI migrated to shadcn/ui + Tailwind CSS v4. 44+ merged PRs.

## What's Next

**Canonical Identity Domain Model (PRD 5)** — Postgres-backed identity layer beneath the existing Descope API surface. 4 epics, 19 stories covering database schema, Alembic migrations, error models, OpenTelemetry integration, inbound sync from Descope via webhooks, and multi-IdP identity linking.

**py-identity-model Integration Tests** — RFC-compliant test suites running against a live OIDC provider (node-oidc-provider). Core flows and token management tests in progress; advanced request patterns, alternative grants, and FAPI 2.0 compliance validation planned.

**Planned PRDs** — API gateway (Tyk), infrastructure secrets pipeline (Infisical), multi-provider test infrastructure, and multi-IdP gateway demo.

## Architecture

### Provider Abstraction Tiers

Capabilities are classified by cross-provider mapping feasibility. This determines what gets abstracted vs what stays provider-specific:

```
+------------------------------------------------------------------+
|                     Tier 1: Abstract                              |
|  (similar shape across providers — common interface)              |
|                                                                   |
|   User CRUD    ReBAC/Authz    SSO/Federation    Session Mgmt     |
|   M2M Keys     Token Validation                                  |
+------------------------------------------------------------------+
|                     Tier 2: Translate                             |
|  (interface + provider-specific adapters)                         |
|                                                                   |
|   RBAC Roles/Permissions         Password Policy                 |
+------------------------------------------------------------------+
|                     Tier 3: Provider-Specific                     |
|  (don't abstract — too divergent)                                |
|                                                                   |
|   Multi-Tenancy    Flows/Orchestration    Connectors    JWTs     |
+------------------------------------------------------------------+
```

### Canonical Identity Domain Model (PRD 5)

Inverts the current architecture: the backend owns a canonical Postgres store, with IdPs becoming sync targets instead of the source of truth.

```
                        API Request
                            |
                            v
                    +---------------+
                    |  FastAPI       |
                    |  Router        |
                    +-------+-------+
                            |
                            v
                  +-------------------+
                  | IdentityService   |  <-- ABC interface
                  | (Postgres impl)   |
                  +--------+----------+
                           |
              +------------+------------+
              |                         |
              v                         v
     +----------------+     +------------------------+
     |  PostgreSQL 16  |     | IdentityProviderAdapter |  <-- ABC
     |  (canonical     |     |   +-- DescopeSyncAdapter |
     |   source of     |     |   +-- NoOpSyncAdapter    |
     |   truth)        |     |   +-- (future: Ory, etc) |
     +----------------+     +------------------------+
                                       |
                              write-through sync
                              (never rollback on
                               sync failure)
                                       |
                                       v
                              +----------------+
                              |  Descope API   |
                              |  (or other IdP)|
                              +----------------+
```

**Schema** (8 tables, SCIM-aligned):

```
users ──────< idp_links >────── providers
  |
  +──< user_tenant_roles >──+
  |                          |
tenants              roles ──< role_permissions >── permissions
```

**Write-through sync pattern**: Postgres write first, IdP sync second. Sync failures are logged and warned but never rolled back — a reconciliation job catches up asynchronously.

### Deployment Topology (PRD 2)

Two deployment modes coexist in a single codebase, toggled by `DEPLOYMENT_MODE` at startup:

```
STANDALONE MODE (default)              GATEWAY MODE (--profile gateway)
========================               ==============================

React SPA (:3000)                      React SPA (:3000)
     |                                      |
     | /api/*                               | /api/*
     v                                      v
FastAPI (:8000)                        Tyk Gateway (:8080)
  - JWT validation (pim)                 - JWT validation (JWKS/RSA)
  - Rate limiting (SlowAPI)              - Rate limiting (Redis)
  - Security headers                     - Header forwarding
  - CORS                                 - CORS
  - Authorization                             |
  |                                           v
  v                                    FastAPI (:8000)
Descope API                              - Security headers
                                         - Authorization only
                                         - (no JWT/rate limit -
                                         -  offloaded to Tyk)
                                         |
                                         v
                                    Descope API
                                         |
                                    Redis (:6379)
```

**Key boundary**: Tyk handles authentication ("is this token valid?"), FastAPI handles authorization ("does user X have role Y in tenant Z?"). Descope JWTs contain nested multi-tenant claims that gateways cannot enforce.

### Secrets Pipeline (PRD 3)

Reduces N secrets in `.env` files down to 2 bootstrap credentials:

```
Developer Workstation
  |
  |  2 bootstrap secrets:
  |    INFISICAL_MACHINE_IDENTITY_CLIENT_ID
  |    INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET
  |
  +--------+-----------+-----------+
  |        |           |           |
  v        v           v           v

HCP         Infisical       Descope       identity-stack
Terraform   Cloud           API           (consumer)
  |           |               |               |
  |  state    |  secrets      |  provisions   |  infisical run
  |  locking  |  audit log    |  roles/perms  |  injects env vars
  |  history  |  folders      |  tenants/keys |  zero code changes
  |           |               |               |
  +-----------+---------------+---------------+
              |
              v
       terraform apply
         1. Provision Descope config
         2. Write outputs to Infisical
         3. App reads via `infisical run`
```

### Ralph Loop Execution Model

Each ralph iteration completes one phase, then exits. State persists to disk for crash recovery:

```
ralph run
  |
  v
Iteration 1    Iteration 2    Iteration 3      ...     Iteration N
+---------+    +---------+    +---------+              +---------+
| analyze |    |  plan   |    |implement|              |complete |
| phase   |--->| phase   |--->| phase   |--- ... ----->| phase   |
+---------+    +---------+    +---------+              +---------+
     |              |              |                        |
     v              v              v                        v
  .claude/       .claude/       .claude/                 delete
  task-state.md  task-state.md  task-state.md            task-state
  (persisted)    (updated)      (updated)                mark done

                    |
                    |  Review phases spawn independent agents:
                    |
                    +---> Blind Hunter    (fresh context, diff only)
                    +---> Edge Case Hunter (fresh context, full repo)
                    +---> Acceptance Auditor (fresh context, spec + repo)
                    +---> Sentinel         (fresh context, security lens)
                    +---> Viper            (conditional, auth changes only)
```

## How It's Built — Agentic Development

This workspace uses three layers of AI-driven tooling to plan, implement, and review code autonomously:

### BMAD-METHOD (Planning)

[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) v6 provides structured planning with 9 specialized agent personas — Architect, Developer, Product Manager, Business Analyst, QA Engineer, Scrum Master, UX Designer, Tech Writer, and Quick Flow Solo Dev. Each agent has an activation protocol, interactive menu, and Claude Code skill integration. Available as `/bmad-*` commands.

### Ralph Orchestrator (Execution)

[Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) drives autonomous task execution across repos. A single task queue in this repo tracks cross-repo dependencies and priority. Ralph loops execute one phase per iteration — analysis, plan, implement, test, review, docs, CI — persisting state between iterations for crash recovery and manual inspection.

### Independent Review Agents (Quality)

Multi-persona adversarial review system where each reviewer runs in a fresh context with zero access to the implementation plan:

- **Blind Hunter** — Cynical diff-only review (logic errors, security holes, dead code)
- **Edge Case Hunter** — Exhaustive path tracer (unhandled branches, boundary conditions)
- **Acceptance Auditor** — Requirements traceability (spec compliance, test coverage mapping)
- **Sentinel** — Auth-domain security specialist (tenant isolation, JWT attacks, IDOR)
- **Viper** — Red team offensive security (5-stage pipeline from recon through remediation)

## Repository Structure

```
auth-planning/
  _bmad/                          # BMAD-METHOD v6 installation
    bmm/                          # Agents, workflows, config
  _bmad-output/
    planning-artifacts/           # PRDs, architecture docs, epics
      prd.md                      # Main PRD — unified platform vision
      prd-canonical-identity.md   # PRD 5 — canonical identity domain model
      prd-api-gateway.md          # Planned — Tyk API gateway
      prd-infrastructure-secrets.md
      prd-multi-provider-test.md
      prd-multi-idp-demo.md
      architecture.md             # System architecture + ADRs
      epics.md                    # Epics with story breakdowns
    implementation-artifacts/
      task-queue.md               # Cross-repo task tracker
      sprint-plan.md              # Prioritized sprint plan
      ralph-prompts/              # Loop prompts for autonomous execution
        run-next-task.md          # General task execution
        fix-review-findings.md    # Review fix loop
        canonical-identity.md     # PRD 5 story loop
        pim-adversarial-review.md # Full codebase security review
        review-agents/            # Independent reviewer templates
      ralph-runner-guide.md       # Guide for running ralph loops
    brainstorming/
      research/                   # Technical research (Tyk, Infisical, HCP Terraform, node-oidc-provider)
  docs/                           # Project knowledge base
    descope-data-model.md         # OAuth 2.0/OIDC mapping for Descope
    oidc-certification-analysis.md
    ralph-planning/               # Orchestrator analysis + integration plans
  .claude/
    skills/                       # 45 BMAD skills + ralph-status
```

## Quick Start

All BMAD skills are available as `/bmad-*` commands in Claude Code:

```
/bmad-help                      # Contextual guidance on what to do next
/bmad-pm                        # Product Manager agent
/bmad-architect                 # Architect agent
/bmad-create-prd                # Create a Product Requirements Document
/bmad-create-architecture       # Design system architecture
/bmad-create-epics-and-stories  # Break down work into stories
/bmad-sprint-planning           # Generate sprint plan
/bmad-code-review               # Multi-layer adversarial code review
/ralph-status                   # Monitor active ralph loops across workspace
```

Running a ralph loop:

```bash
cd ~/repos/auth/identity-stack
cp ~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/canonical-identity.md PROMPT.md
ralph run
```

## Documentation

| Document | Description |
|----------|-------------|
| [Descope Data Model](docs/descope-data-model.md) | OAuth 2.0/OIDC endpoint mapping, JWT claims, tenant model |
| [OIDC Certification Analysis](docs/oidc-certification-analysis.md) | OpenID Foundation certification readiness for py-identity-model |
| [Orchestrator Comparison](docs/ralph-planning/orchestrator-comparison.md) | Chief Wiggum vs Ralph Orchestrator analysis |
| [BMAD Integration Plan](docs/ralph-planning/ralph-bmad-integration-plan.md) | Security agents, skills, and Ralph hat topology |
| [Ralph Runner Guide](_bmad-output/implementation-artifacts/ralph-runner-guide.md) | Running and monitoring ralph loops |

## License

Planning artifacts only — no application code. See individual sibling repos for their licenses.
