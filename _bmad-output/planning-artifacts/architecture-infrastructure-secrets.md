---
stepsCompleted: ['accelerated-from-prd']
inputDocuments:
  - _bmad-output/planning-artifacts/prd-infrastructure-secrets.md
  - _bmad-output/brainstorming/research/hcp-terraform-research.md
  - _bmad-output/brainstorming/research/infisical-research.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'architecture'
project_name: 'infrastructure-secrets-pipeline'
user_name: 'James'
date: '2026-03-29'
---

# Architecture Decision Document — Infrastructure Secrets Pipeline

## 1. System Context

### Overview

This architecture covers the infrastructure secrets pipeline for the identity-stack workspace: HCP Terraform for remote state management and Infisical Cloud for centralized secrets management. Together they form a pipeline where Terraform provisions infrastructure and stores state remotely, Infisical centralizes all secrets, and applications consume secrets via CLI injection with zero code changes.

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Developer Workstation                                 │
│                                                                                 │
│  ┌─────────────────────┐    ┌──────────────────────┐    ┌────────────────────┐  │
│  │  terraform CLI       │    │  infisical CLI        │    │  docker compose    │  │
│  │  (plan/apply)        │    │  (login/secrets/run)  │    │  (up --build)      │  │
│  └────────┬────────────┘    └──────────┬───────────┘    └────────┬───────────┘  │
│           │                            │                         │               │
│           │  Bootstrap: 2 secrets      │                         │               │
│           │  (MI client_id +           │                         │               │
│           │   client_secret)           │                         │               │
└───────────┼────────────────────────────┼─────────────────────────┼───────────────┘
            │                            │                         │
            ▼                            ▼                         ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌──────────────────────┐
│   HCP Terraform       │   │   Infisical Cloud     │   │  Descope API         │
│   (app.terraform.io)  │   │   (app.infisical.com) │   │  (api.descope.com)   │
│                       │   │                       │   │                      │
│  • Encrypted state    │   │  • Secret storage     │   │  • Management API    │
│  • State locking      │   │  • Audit logging      │   │  • Project config    │
│  • Version history    │   │  • Folder structure   │   │  • Roles/perms/      │
│  • Variable sets      │   │  • Machine Identity   │   │    tenants/FGA       │
│  • Run history        │   │  • CLI injection      │   │  • Access keys       │
└───────────┬───────────┘   └───────────┬───────────┘   └──────────┬───────────┘
            │                           │                          │
            │  state read/write         │  secret fetch            │  CRUD ops
            │                           │                          │
            ▼                           ▼                          ▼
      ┌──────────────────────────────────────────────────────────────┐
      │           descope-saas-starter (identity-stack)              │
      │                                                              │
      │  infra/          backend/              frontend/             │
      │  (Terraform)     (FastAPI)             (Vite/React)          │
      │  ─ remote state  ─ infisical run       ─ infisical run       │
      │  ─ provisions    ─ os.environ          ─ build-time inject   │
      │    Descope       ─ zero code changes   ─ VITE_* env vars     │
      └──────────────────────────────────────────────────────────────┘
```

### Dependency Graph (Infrastructure Layer)

```
descope-saas-starter/infra
  └── HCP Terraform (remote state backend — cloud block in main.tf)
  └── terraform-provider-descope (provisions Descope project config)
  └── infisical/infisical TF provider (writes TF outputs to Infisical)
  └── Infisical Machine Identity (authenticates TF provider to Infisical)

descope-saas-starter/backend
  └── Infisical CLI (infisical run — injects secrets as env vars)
  └── Infisical Machine Identity (authenticates CLI to Infisical)
  └── No code changes — reads os.environ identically to .env files

descope-saas-starter/frontend
  └── Infisical CLI (infisical run -- npm run build — build-time injection)
  └── No code changes — Vite picks up VITE_* from process.env

HCP Terraform
  └── Infisical (variable set stores MI credentials for TF provider auth)
  └── No dependency on Infisical for state management (independent)

Infisical Cloud
  └── No dependency on HCP Terraform (independent)
  └── Machine Identity is the single auth mechanism for all programmatic access
```

## 2. Secret Lifecycle Flow

### End-to-End Data Flow

```
Phase 1: Provision                    Phase 2: Store                      Phase 3: Consume
─────────────────                     ────────────                        ──────────────

terraform apply                       Infisical TF provider               infisical run
  │                                     │                                   │
  │ 1. Provisions Descope              │ 3. Writes TF outputs             │ 5. CLI fetches all
  │    project config                  │    to Infisical                  │    secrets in one
  │    (roles, perms,                  │    (access key                   │    API call
  │    tenants, keys)                  │    cleartext, etc.)             │
  │                                     │                                   │ 6. Injects as env
  │ 2. Stores state in                │ 4. Tags with                    │    vars into
  │    HCP Terraform                   │    source="terraform"           │    subprocess
  │    (encrypted,                     │                                   │
  │    versioned,                      │                                   │ 7. App reads
  │    locked)                         │                                   │    os.environ
  │                                     │                                   │    (zero changes)
  ▼                                     ▼                                   ▼
┌──────────┐                       ┌──────────┐                       ┌──────────┐
│ HCP TF   │                       │Infisical │                       │ App      │
│ State    │                       │ Secrets  │                       │ Process  │
└──────────┘                       └──────────┘                       └──────────┘
```

### Secret Categories

| Secret | Source | Stored In | Consumed By | Notes |
|--------|--------|-----------|-------------|-------|
| `DESCOPE_PROJECT_ID` | Descope console | Infisical `/infra` + `/backend` | TF provider, backend | Static — set once |
| `DESCOPE_MANAGEMENT_KEY` | Descope console | Infisical `/infra` + `/backend`, HCP TF variable set | TF provider, backend | Sensitive — write-only in HCP TF |
| `DATABASE_URL` | Developer | Infisical `/backend` | Backend | `sqlite:///./data.db` for dev |
| `VITE_DESCOPE_PROJECT_ID` | Descope console | Infisical `/frontend` | Frontend build | Public value (visible in browser) |
| `VITE_DESCOPE_BASE_URL` | Descope console | Infisical `/frontend` | Frontend build | Optional |
| Access key cleartext | TF `descope_access_key` output | Infisical `/backend` (via TF provider) | Backend | TF-generated, flows automatically |
| `INFISICAL_MACHINE_IDENTITY_CLIENT_ID` | Infisical console | Host env / GitHub Actions secrets | Infisical CLI, TF provider | Bootstrap secret 1 of 2 |
| `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET` | Infisical console | Host env / GitHub Actions secrets | Infisical CLI, TF provider | Bootstrap secret 2 of 2 |

## 3. Bootstrap Secret Management

### The Bootstrap Problem

Every secrets manager requires credentials to access it — the "bootstrap secret" problem. This architecture reduces the bootstrap to exactly 2 secrets:

```
Before (N secrets in .env files):           After (2 bootstrap secrets):
─────────────────────────────────           ──────────────────────────────

DESCOPE_PROJECT_ID=P2abc...                 INFISICAL_MACHINE_IDENTITY_CLIENT_ID=xxx
DESCOPE_MANAGEMENT_KEY=key:K2abc...         INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=yyy
DATABASE_URL=sqlite:///./data.db
VITE_DESCOPE_PROJECT_ID=P2abc...            Everything else lives in Infisical.
VITE_DESCOPE_BASE_URL=https://...
```

### Bootstrap Storage by Context

| Context | How bootstrap secrets are stored | Why |
|---------|----------------------------------|-----|
| Local development | `infisical login` (interactive, stores token in `~/.infisical/`) | Developer authenticates once, CLI caches credentials |
| Docker Compose | Host environment variables or minimal `.env` with only 2 values | Injected into container via `environment:` block |
| GitHub Actions CI | GitHub Actions secrets (`INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`) | Only 2 secrets in GitHub — down from N |
| HCP TF variable set | Sensitive environment variables in "Infisical Credentials" variable set | For Infisical TF provider authentication during `terraform apply` |

### Bootstrap Flow

```
Developer first-time setup:

1. Clone repo
2. Create Infisical Cloud account (free)
3. Run `infisical login` (interactive — stores token locally)
4. Run `infisical run --env=dev --path=/backend -- make dev-backend`
   → All secrets injected, app starts

Docker Compose setup:

1. Set 2 env vars on host:
   export INFISICAL_MACHINE_IDENTITY_CLIENT_ID=xxx
   export INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=yyy
2. Run `docker compose up --build`
   → Each service uses `infisical run` as entrypoint wrapper
   → CLI authenticates with Machine Identity, fetches secrets, injects into process
```

## 4. Component Diagram

### HCP Terraform Workspace

```
Organization: jamescrowley321
└── Workspace: descope-saas-starter-dev
    │
    ├── Execution Mode: Local
    │   (runs on developer machine / CI runner,
    │    state stored in HCP Terraform)
    │
    ├── State
    │   ├── Encrypted at rest
    │   ├── Versioned (full history)
    │   ├── Locked during plan/apply
    │   └── Contains: descope_project, descope_role[],
    │       descope_permission[], descope_tenant[],
    │       descope_access_key[], github_repository
    │
    ├── Variable Set: "Descope Credentials"
    │   ├── DESCOPE_MANAGEMENT_KEY  (env var, sensitive: true, write-only)
    │   └── DESCOPE_BASE_URL        (env var, sensitive: false, optional)
    │
    └── Variable Set: "Infisical Credentials"
        ├── INFISICAL_CLIENT_ID     (env var, sensitive: true)
        └── INFISICAL_CLIENT_SECRET (env var, sensitive: true)
```

### Infisical Cloud Project

```
Project: identity-stack
│
├── Environment: dev
│   ├── /backend
│   │   ├── DESCOPE_PROJECT_ID
│   │   ├── DESCOPE_MANAGEMENT_KEY
│   │   └── DATABASE_URL
│   ├── /frontend
│   │   ├── VITE_DESCOPE_PROJECT_ID
│   │   └── VITE_DESCOPE_BASE_URL
│   └── /infra
│       ├── DESCOPE_PROJECT_ID
│       └── DESCOPE_MANAGEMENT_KEY
│
├── Environment: staging  (Growth — post-MVP)
│   └── (same folder structure, different values)
│
├── Environment: prod     (Growth — post-MVP)
│   └── (same folder structure, different values)
│
├── Machine Identity: "identity-stack-ci"
│   ├── Auth Method: Universal Auth
│   ├── client_id: (generated)
│   ├── client_secret: (generated)
│   └── Permissions: Read/Write on all environments
│
└── Audit Log
    └── All secret access logged with identity, action, timestamp, IP
```

### Terraform Provider Chain

```
infra/main.tf
│
├── terraform { cloud { ... } }          ← HCP Terraform remote state
│
├── required_providers {
│   ├── descope   = { source = "descope/descope" }
│   └── infisical = { source = "infisical/infisical" }   ← NEW
│   }
│
├── provider "descope" {
│   project_id = var.descope_project_id
│   }
│
├── provider "infisical" {                                ← NEW
│   client_id     = var.infisical_client_id
│   client_secret = var.infisical_client_secret
│   }
│
├── resource "descope_access_key" "backend" { ... }
│
├── resource "infisical_secret" "access_key" {            ← NEW
│   name        = "DESCOPE_ACCESS_KEY_CLEARTEXT"
│   value       = descope_access_key.backend.cleartext
│   folder_path = "/backend"
│   env_slug    = "dev"
│   project_id  = var.infisical_project_id
│   }
│
└── data "infisical_secrets" "infra" {                    ← NEW (optional)
    env_slug    = "dev"
    folder_path = "/infra"
    project_id  = var.infisical_project_id
    }
```

## 5. Key Architectural Decisions

### ADR-IS-1: Infisical Cloud Free Tier Over Self-Hosted

**Decision:** Use Infisical Cloud (app.infisical.com) free tier, not self-hosted Docker deployment.

**Rationale:**
- Free tier provides unlimited projects/secrets, 5 users, audit logging — sufficient for this project's scale
- Self-hosted adds 3 containers (Infisical core + PostgreSQL + Redis, ~500MB RAM overhead) and operational burden (backups, TLS, updates)
- This is a demo/POC-quality infrastructure project — self-hosted complexity is not justified
- Migration to self-hosted is straightforward if needed (data export, Docker Compose addition)

**Trade-off:** Limited audit log retention on free tier (1-3 days). Acceptable for a portfolio project.

### ADR-IS-2: CLI Injection Over SDK Integration

**Decision:** Use `infisical run` CLI injection to deliver secrets to applications, not the Infisical Python/Node SDKs.

**Rationale:**
- **Zero code changes** — the backend reads `os.environ` identically whether secrets come from `.env` files or Infisical injection. No new dependency, no application code modifications.
- The Python SDK is synchronous (Rust bindings via PyO3), requiring `asyncio.to_thread()` wrapping in the async FastAPI backend — unnecessary complexity.
- CLI injection is the PRD requirement (FR-14, FR-15) and aligns with NFR-9 (zero application code changes).
- SDK integration is a Growth feature only needed for runtime secret refresh without restarts — not an MVP requirement.

**Trade-off:** Application must be restarted to pick up changed secrets. Acceptable — secrets change infrequently in this project.

### ADR-IS-3: HCP Terraform Local Execution Mode

**Decision:** Configure the HCP Terraform workspace with execution mode set to **local** — runs execute on the developer's machine, only state is stored remotely.

**Rationale:**
- The custom `terraform-provider-descope` fork is not published to the Terraform Registry — remote execution would fail because HCP Terraform's runners cannot download unpublished providers.
- Local execution preserves the existing `dev_overrides` workflow (`make dev` in terraform-provider-descope builds locally and configures `~/.terraformrc`).
- State encryption, versioning, and locking still apply — only compute location changes.
- The `cloud` block already exists in `infra/main.tf` with `organization = "jamescrowley321"` and `workspaces { name = "descope-saas-starter-dev" }`.

**Trade-off:** CI/CD requires the custom provider binary on the runner (solved by `make dev` in the GitHub Actions workflow or future Registry publish via PR #108).

### ADR-IS-4: Folder-Based Secret Organization

**Decision:** Organize secrets in Infisical by consuming service: `/backend`, `/frontend`, `/infra` folders within each environment.

**Rationale:**
- Matches the existing separation in the codebase (backend `.env`, frontend `.env`, infra `terraform.tfvars`)
- `infisical run --path=/backend` fetches only backend secrets — no accidental exposure of infra secrets to the frontend build
- Per-folder permissions enable future RBAC: CI pipeline for frontend gets read on `/frontend` only
- Aligns with FR-10 (folder structure requirement)

### ADR-IS-5: Bidirectional Flow via Infisical TF Provider

**Decision:** Use the `infisical/infisical` Terraform provider to write TF-generated secrets to Infisical as `infisical_secret` resources, and optionally use `data "infisical_secrets"` to read secrets from Infisical into TF runs.

**Rationale:**
- Declarative — secrets flow is defined in HCL alongside the infrastructure that generates them
- Idempotent — `terraform apply` creates or updates the Infisical secret, no manual sync step
- Avoids CI scripting for secret sync (no `terraform output -json | jq | infisical secrets set` pipeline)
- `source = "terraform"` tags distinguish TF-managed secrets from manually created ones (FR-22)

**Trade-off:** The Infisical TF provider requires Machine Identity credentials in the HCP Terraform variable set — 2 additional sensitive variables. Acceptable given the automation benefit.

### ADR-IS-6: Graceful Fallback to .env Files

**Decision:** Infisical is an enhancement, not a hard dependency. The existing `env_file: .env` approach continues to work for developers who have not set up Infisical.

**Rationale:**
- NFR-10 requires existing Docker Compose deployment to continue working without Infisical
- New developers can clone and run with `.env` files immediately, then migrate to Infisical when ready
- Docker Compose can use YAML anchors or profiles to switch between `env_file:` and `infisical run` entrypoints

**Implementation:** Docker Compose uses a profile or override file:
```yaml
# docker-compose.yml — default (env_file fallback)
services:
  backend:
    env_file: .env

# docker-compose.override.infisical.yml — Infisical mode
services:
  backend:
    env_file: []
    entrypoint: infisical run --env=dev --path=/backend --
```

## 6. Migration Path from Current .env Files

### Current State

```
descope-saas-starter/
├── .env                          # Backend secrets (gitignored)
│   ├── DESCOPE_PROJECT_ID
│   ├── DESCOPE_MANAGEMENT_KEY
│   └── DATABASE_URL
├── frontend/.env                 # Frontend config (gitignored)
│   ├── VITE_DESCOPE_PROJECT_ID
│   └── VITE_DESCOPE_BASE_URL
├── infra/
│   ├── main.tf                   # cloud block exists, workspace configured
│   ├── terraform.tfstate         # Plaintext JSON on disk (if not yet migrated)
│   └── variables.tf              # var.descope_project_id, var.descope_management_key
└── docker-compose.yml            # Uses env_file: .env
```

### Target State

```
descope-saas-starter/
├── .env                          # ONLY 2 bootstrap secrets (or empty — use infisical login)
│   ├── INFISICAL_MACHINE_IDENTITY_CLIENT_ID
│   └── INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET
├── infra/
│   ├── main.tf                   # cloud block + infisical provider
│   ├── infisical.tf              # infisical_secret resources
│   ├── (no local .tfstate)       # State in HCP Terraform
│   └── variables.tf              # + var.infisical_client_id, var.infisical_client_secret, var.infisical_project_id
└── docker-compose.yml            # entrypoint: infisical run --env=dev --path=/backend --
```

### Migration Steps

1. **HCP Terraform** (Epic 1): `terraform login` → verify `cloud` block in `main.tf` → `terraform init -migrate-state` → verify → clean up local state files
2. **Infisical setup** (Epic 2): Create Cloud account → create project → create environments/folders → import secrets → create Machine Identity → install CLI → test `infisical run`
3. **Docker Compose** (Epic 2): Replace `env_file: .env` with `infisical run` entrypoint wrapper
4. **Bidirectional flow** (Epic 3): Add `infisical` provider to `main.tf` → create `infisical_secret` resources for TF outputs → verify end-to-end flow

## 7. Security Considerations

### Encryption at Rest

| Component | Encryption | Details |
|-----------|-----------|---------|
| HCP Terraform state | HashiCorp-managed encryption | State encrypted at rest, sensitive outputs redacted in UI/logs |
| Infisical secrets | AES-256-GCM | Secrets encrypted at rest in Infisical Cloud, key managed by Infisical |
| Local `.tfstate` | None (plaintext JSON) | Eliminated after migration — no local state files remain |
| `.env` files | None (plaintext) | Reduced to 2 bootstrap secrets only; all application secrets move to Infisical |

### Access Control

| Resource | Access Control | Notes |
|----------|---------------|-------|
| HCP Terraform workspace | API token (per-user) | Free tier: all users are admins (acceptable for solo/small team) |
| HCP Terraform variable sets | Workspace-scoped | Sensitive vars are write-only (cannot be read back from UI) |
| Infisical project | Machine Identity (Universal Auth) | `client_id` + `client_secret` pair, scoped to project |
| Infisical folders | Per-folder permissions | `/backend`, `/frontend`, `/infra` can have independent access policies |
| Infisical environments | Per-environment permissions | Dev/staging/prod isolation (Growth feature) |

### Audit Logging

| Component | What is logged | Retention |
|-----------|---------------|-----------|
| HCP Terraform | Run history (who, when, plan/apply output) | Indefinite on free tier |
| Infisical | All secret access (identity, action, timestamp, IP, user agent) | Limited on free tier (1-3 days) |

### Threat Model (Scoped to Infrastructure Layer)

| Threat | Mitigation | Residual Risk |
|--------|-----------|---------------|
| Plaintext state on disk | HCP Terraform encrypted remote state | None — local state eliminated |
| Secrets in git history | `.gitignore` for `.env`, `.tfstate`, `.tfvars`; Infisical replaces file-based secrets | Requires verifying no historical commits contain secrets |
| Credential sharing via Slack | Infisical CLI (`infisical login`) + Machine Identity for programmatic access | None — no manual credential sharing needed |
| Machine Identity compromise | Rotate `client_secret` in Infisical console; credentials are in exactly 2 locations (host env + HCP TF variable set) | Window of exposure between compromise and rotation |
| HCP TF token compromise | Revoke token in HCP TF User Settings; re-run `terraform login` | Window of exposure between compromise and revocation |

## 8. Non-Functional Considerations

### Performance

- **Terraform plan/apply**: No meaningful latency increase from remote state — local execution mode means compute is local, only state read/write goes to HCP Terraform over HTTPS (NFR-6)
- **Application startup**: `infisical run` adds < 3 seconds — CLI fetches all secrets in a single API call, then spawns the subprocess (NFR-7)
- **Frontend build**: `infisical run -- npm run build` adds the same < 3 second overhead at build time only, not at runtime

### Scalability

- **HCP Terraform free tier**: 500 runs/month, 1 concurrent run — project uses < 50 runs/month (NFR-11)
- **Infisical Cloud free tier**: Unlimited projects/secrets, 5 users — project has 1 user, ~10 secrets (NFR-15)
- **Growth path**: Environment-split workspaces (descope-dev, descope-staging, descope-prod) and per-environment Machine Identities when multi-environment is needed

### Compatibility

- **Existing Docker Compose**: Continues working with `env_file: .env` fallback (NFR-10, ADR-IS-6)
- **Custom TF provider fork**: Local execution mode preserves `dev_overrides` workflow (NFR-8, ADR-IS-3)
- **Application code**: Zero changes — `os.environ` reads identically from `.env` or Infisical injection (NFR-9)
