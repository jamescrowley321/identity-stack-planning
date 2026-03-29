---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-all-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prd-infrastructure-secrets.md
  - _bmad-output/planning-artifacts/architecture-infrastructure-secrets.md
  - _bmad-output/brainstorming/research/hcp-terraform-research.md
  - _bmad-output/brainstorming/research/infisical-research.md
---

# Infrastructure Secrets Pipeline — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Infrastructure Secrets Pipeline (PRD 1), decomposing the requirements from the PRD and Architecture into implementable stories across two repositories: `[TFP]` terraform-provider-descope (infra config) and `[IS]` descope-saas-starter (identity-stack). Each story is scoped to a single PR.

## Requirements Inventory

### Functional Requirements

**Epic 1 — HCP Terraform Remote State Migration**

- FR-1: Authenticate Terraform CLI with HCP Terraform via `terraform login`
- FR-2: Configure HCP Terraform workspace `descope-saas-starter-dev` with local execution mode
- FR-3: Configure variable set "Descope Credentials" with `DESCOPE_MANAGEMENT_KEY` as sensitive env var
- FR-4: Migrate local state to HCP Terraform via `terraform init -migrate-state`
- FR-5: Verify migration — `terraform state list` + `terraform plan` shows no drift
- FR-6: Back up and remove local state files after verification
- FR-7: Update `.gitignore` for state artifacts

**Epic 2 — Infisical Secrets Management Setup**

- FR-8: Create Infisical Cloud account and project
- FR-9: Create three environments: dev, staging, prod
- FR-10: Create folder structure: `/backend`, `/frontend`, `/infra`
- FR-11: Import existing secrets from `.env` files into Infisical
- FR-12: Create Machine Identity with Universal Auth
- FR-13: Install Infisical CLI and verify authentication
- FR-14: Update Docker Compose backend to use `infisical run` entrypoint
- FR-15: Update frontend build to use `infisical run` for build-time injection
- FR-16: Document the 2-secret bootstrap

**Epic 3 — Bidirectional Secret Flow**

- FR-17: Add `infisical/infisical` Terraform provider to `infra/main.tf`
- FR-18: Create `infisical_secret` resources for TF outputs (access key cleartext)
- FR-19: Verify bidirectional flow end-to-end
- FR-20: Store Infisical MI credentials in HCP Terraform variable set
- FR-21: Create `data "infisical_secrets"` data source to read secrets into TF
- FR-22: Tag `infisical_secret` resources with `source = "terraform"` metadata

### Non-Functional Requirements

**Security**

- NFR-1: **[TFP]** Terraform state encrypted at rest — no plaintext `.tfstate` on disk
- NFR-2: **[TFP]** Sensitive outputs redacted in HCP Terraform UI and logs
- NFR-3: **[IS]** No secrets in git history, committed `.env` files, or Docker image layers
- NFR-4: **[IS]** Machine Identity credentials are the only secrets outside Infisical
- NFR-5: **[IS]** All secret access logged in Infisical audit log

**Performance**

- NFR-6: **[TFP]** `terraform plan`/`apply` latency not meaningfully increased by remote state
- NFR-7: **[IS]** Application startup < 3 seconds additional from `infisical run`

**Compatibility**

- NFR-8: **[TFP]** Local execution mode preserves custom provider fork compatibility
- NFR-9: **[IS]** CLI injection requires zero application code changes
- NFR-10: **[IS]** Existing Docker Compose works without Infisical via `env_file:` fallback
- NFR-11: **[TFP]** HCP Terraform free tier limits sufficient (< 50 runs/month)

### FR Coverage Map

| FR | Epic | Story | Description |
|----|------|-------|-------------|
| FR-1 | Epic 1 | 1.1 | Authenticate TF CLI with HCP Terraform |
| FR-2 | Epic 1 | 1.1 | Configure workspace with local execution mode |
| FR-3 | Epic 1 | 1.2 | Configure "Descope Credentials" variable set |
| FR-4 | Epic 1 | 1.3 | Migrate local state to HCP Terraform |
| FR-5 | Epic 1 | 1.3 | Verify migration — no drift |
| FR-6 | Epic 1 | 1.3 | Back up and remove local state files |
| FR-7 | Epic 1 | 1.4 | Update `.gitignore` for state artifacts |
| FR-8 | Epic 2 | 2.1 | Create Infisical Cloud account and project |
| FR-9 | Epic 2 | 2.1 | Create environments: dev, staging, prod |
| FR-10 | Epic 2 | 2.1 | Create folder structure |
| FR-11 | Epic 2 | 2.2 | Import secrets from `.env` files |
| FR-12 | Epic 2 | 2.3 | Create Machine Identity with Universal Auth |
| FR-13 | Epic 2 | 2.3 | Install CLI and verify authentication |
| FR-14 | Epic 2 | 2.4 | Docker Compose backend — `infisical run` entrypoint |
| FR-15 | Epic 2 | 2.5 | Frontend build — `infisical run` injection |
| FR-16 | Epic 2 | 2.6 | Document 2-secret bootstrap |
| FR-17 | Epic 3 | 3.1 | Add Infisical TF provider |
| FR-18 | Epic 3 | 3.2 | Create `infisical_secret` resources |
| FR-19 | Epic 3 | 3.3 | Verify bidirectional flow end-to-end |
| FR-20 | Epic 3 | 3.1 | Store MI credentials in HCP TF variable set |
| FR-21 | Epic 3 | 3.2 | Create `data "infisical_secrets"` data source |
| FR-22 | Epic 3 | 3.2 | Tag secrets with `source = "terraform"` |

## Epic List

### Epic 1: HCP Terraform Remote State Migration
Infrastructure engineers can run `terraform plan` and `terraform apply` with encrypted, versioned, locked remote state — eliminating plaintext `.tfstate` files and concurrent state corruption risk.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7

### Epic 2: Infisical Secrets Management Setup
Developers can run the application without manually creating `.env` files — all secrets are sourced from Infisical via CLI injection, with a 2-secret bootstrap replacing N scattered credentials.
**FRs covered:** FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16

### Epic 3: Bidirectional Secret Flow
Terraform-generated secrets (access key cleartext) automatically flow to Infisical, and Infisical secrets can be read into Terraform runs — creating a single source of truth with full lifecycle management.
**FRs covered:** FR-17, FR-18, FR-19, FR-20, FR-21, FR-22

---

## Epic 1: HCP Terraform Remote State Migration

Infrastructure engineers can run `terraform plan` and `terraform apply` with encrypted, versioned, locked remote state — eliminating plaintext `.tfstate` files and concurrent state corruption risk.

### Story 1.1: HCP Terraform Account Setup and Workspace Configuration

As an infrastructure engineer,
I want the HCP Terraform organization and workspace configured with local execution mode,
So that Terraform state is stored remotely with encryption, versioning, and locking while runs execute locally (preserving custom provider fork compatibility).

**Implements:** FR-1, FR-2

**Acceptance Criteria:**

- [ ] **Given** the HCP Terraform organization `jamescrowley321` exists
  **When** `terraform login` is run on the development machine
  **Then** the API token is stored in `~/.terraform.d/credentials.tfrc.json` and the CLI can authenticate to HCP Terraform

- [ ] **Given** the workspace `descope-saas-starter-dev` is configured in HCP Terraform
  **When** checking the workspace settings
  **Then** execution mode is set to **Local** (runs on developer machine, state stored remotely)

- [ ] **Given** the `cloud` block already exists in `infra/main.tf` with `organization = "jamescrowley321"` and `workspaces { name = "descope-saas-starter-dev" }`
  **When** reviewing the Terraform configuration
  **Then** no changes to the `cloud` block are needed — the existing configuration is correct

- [ ] **Given** the workspace is set to local execution mode
  **When** `terraform init` is run from `infra/`
  **Then** Terraform initializes successfully and connects to HCP Terraform for state storage without attempting remote execution

### Story 1.2: Variable Set Configuration

As an infrastructure engineer,
I want `DESCOPE_MANAGEMENT_KEY` stored as a sensitive environment variable in an HCP Terraform variable set,
So that the credential is encrypted, write-only (not readable from UI), and automatically available to all Terraform runs in the workspace.

**Implements:** FR-3

**Acceptance Criteria:**

- [ ] **Given** the HCP Terraform workspace `descope-saas-starter-dev` exists
  **When** a variable set named "Descope Credentials" is created
  **Then** it is scoped to the `descope-saas-starter-dev` workspace

- [ ] **Given** the "Descope Credentials" variable set exists
  **When** `DESCOPE_MANAGEMENT_KEY` is added as a variable
  **Then** it is configured as category=Environment Variable, sensitive=true (write-only — cannot be read back from the HCP Terraform UI)

- [ ] **Given** the variable set is applied to the workspace
  **When** `terraform plan` is run from the developer machine
  **Then** the Descope provider authenticates successfully using the management key from the variable set (no local `TF_VAR_descope_management_key` or `.tfvars` file needed)

- [ ] **Given** the sensitive variable is set
  **When** viewing the variable in the HCP Terraform UI
  **Then** the value is redacted and cannot be read — only overwritten

### Story 1.3: State Migration and Verification

As an infrastructure engineer,
I want existing local Terraform state migrated to HCP Terraform with verification that no drift occurred,
So that I can confirm the migration is lossless and safely remove local state files.

**Implements:** FR-4, FR-5, FR-6

**Acceptance Criteria:**

- [ ] **Given** a local `terraform.tfstate` file exists in `infra/`
  **When** `cp terraform.tfstate terraform.tfstate.backup-pre-migration-$(date +%Y%m%d)` is run
  **Then** a dated backup of the local state file exists before migration begins

- [ ] **Given** the backup is created and the workspace is configured
  **When** `terraform init -migrate-state` is run and the copy prompt is answered "yes"
  **Then** the local state is uploaded to HCP Terraform and the migration completes without errors

- [ ] **Given** the state migration is complete
  **When** `terraform state list` is run
  **Then** the output shows the same resources as before migration (descope_project, descope_role, descope_permission, descope_tenant, descope_access_key, github resources)

- [ ] **Given** the state is now remote
  **When** `terraform plan` is run
  **Then** the output shows "No changes. Your infrastructure matches the configuration." — confirming zero drift

- [ ] **Given** migration is verified with no drift
  **When** local state files are removed (`rm terraform.tfstate terraform.tfstate.backup`)
  **Then** the dated pre-migration backup is preserved, but working state files are gone — all state operations use HCP Terraform

### Story 1.4: Gitignore Hardening for State Artifacts

As an infrastructure engineer,
I want `.gitignore` updated to prevent accidental commit of Terraform state files, lock files, and variable files containing secrets,
So that plaintext state and credentials never enter git history.

**Implements:** FR-7

**Acceptance Criteria:**

- [ ] **Given** the repository `.gitignore` file
  **When** it is updated with Terraform-specific patterns
  **Then** the following patterns are present: `*.tfstate`, `*.tfstate.backup`, `.terraform/`, `*.tfvars` (if containing secrets)

- [ ] **Given** the updated `.gitignore`
  **When** `git status` is run with a `terraform.tfstate` file present in `infra/`
  **Then** the state file does not appear in untracked or modified files

- [ ] **Given** existing `.gitignore` entries
  **When** the Terraform patterns are added
  **Then** no existing entries are removed or modified — patterns are appended

---

## Epic 2: Infisical Secrets Management Setup

Developers can run the application without manually creating `.env` files — all secrets are sourced from Infisical via CLI injection, with a 2-secret bootstrap replacing N scattered credentials.

### Story 2.1: Infisical Cloud Project and Environment Setup

As a developer,
I want an Infisical Cloud project with environments and folder structure matching the application architecture,
So that secrets are organized by consuming service and environment from the start.

**Implements:** FR-8, FR-9, FR-10

**Acceptance Criteria:**

- [ ] **Given** a free-tier Infisical Cloud account at app.infisical.com
  **When** a project named "identity-stack" is created
  **Then** the project is accessible and ready for secret storage

- [ ] **Given** the "identity-stack" project exists
  **When** environments are configured
  **Then** three environments exist: `dev`, `staging`, `prod`

- [ ] **Given** each environment exists
  **When** the folder structure is created
  **Then** each environment contains three folders: `/backend`, `/frontend`, `/infra`

- [ ] **Given** the folder structure is in place
  **When** navigating the Infisical UI
  **Then** the organization matches the application architecture: backend secrets in `/backend`, frontend config in `/frontend`, infrastructure credentials in `/infra`

### Story 2.2: Secret Import from .env Files

As a developer,
I want all existing secrets from `.env` files imported into the correct Infisical folders,
So that Infisical becomes the single source of truth for all application configuration.

**Implements:** FR-11

**Acceptance Criteria:**

- [ ] **Given** the existing backend `.env` file contains `DESCOPE_PROJECT_ID`, `DESCOPE_MANAGEMENT_KEY`, `DATABASE_URL`
  **When** secrets are imported into Infisical
  **Then** the `dev` environment `/backend` folder contains all three secrets with correct values

- [ ] **Given** the existing frontend `.env` file contains `VITE_DESCOPE_PROJECT_ID`, `VITE_DESCOPE_BASE_URL`
  **When** secrets are imported into Infisical
  **Then** the `dev` environment `/frontend` folder contains both secrets with correct values

- [ ] **Given** infrastructure credentials need to be accessible to Terraform
  **When** secrets are imported into Infisical
  **Then** the `dev` environment `/infra` folder contains `DESCOPE_PROJECT_ID` and `DESCOPE_MANAGEMENT_KEY`

- [ ] **Given** all secrets are imported
  **When** comparing Infisical values against the original `.env` files
  **Then** every secret matches exactly — no typos, no missing values, no extra secrets

### Story 2.3: Machine Identity and CLI Authentication

As a developer,
I want a Machine Identity created for programmatic access and the Infisical CLI installed and authenticated,
So that Docker Compose, CI/CD, and local development can access secrets without interactive login.

**Implements:** FR-12, FR-13

**Acceptance Criteria:**

- [ ] **Given** the "identity-stack" Infisical project exists
  **When** a Machine Identity named "identity-stack-ci" is created with Universal Auth login method
  **Then** a `client_id` and `client_secret` pair is generated for programmatic access

- [ ] **Given** the Machine Identity exists
  **When** its permissions are configured
  **Then** it has read/write access to all environments and folders in the "identity-stack" project

- [ ] **Given** the Infisical CLI is not yet installed
  **When** the CLI is installed on the development machine
  **Then** `infisical --version` returns a version number and `infisical login` authenticates successfully

- [ ] **Given** the Machine Identity credentials are available as environment variables (`INFISICAL_MACHINE_IDENTITY_CLIENT_ID`, `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET`)
  **When** `infisical run --env=dev --path=/backend -- env` is executed
  **Then** the output includes `DESCOPE_PROJECT_ID`, `DESCOPE_MANAGEMENT_KEY`, and `DATABASE_URL` with correct values from Infisical

### Story 2.4: Docker Compose Backend Integration

As a developer,
I want the Docker Compose backend service to use `infisical run` as its entrypoint wrapper,
So that the backend receives secrets via environment injection with zero code changes, while preserving `env_file:` fallback for developers without Infisical.

**Implements:** FR-14

**Acceptance Criteria:**

- [ ] **Given** the current `docker-compose.yml` backend service uses `env_file: .env`
  **When** the service is updated to use `infisical run --env=dev --path=/backend --` as the entrypoint wrapper
  **Then** the backend starts successfully with secrets injected from Infisical

- [ ] **Given** the backend uses `infisical run` for secret injection
  **When** the FastAPI application starts
  **Then** `os.environ["DESCOPE_PROJECT_ID"]`, `os.environ["DESCOPE_MANAGEMENT_KEY"]`, and `os.environ["DATABASE_URL"]` are populated with correct values from Infisical — identical to the previous `.env` file behavior

- [ ] **Given** a developer has not set up Infisical
  **When** `env_file: .env` is used instead of the `infisical run` entrypoint (via Docker Compose override or profile)
  **Then** the application starts successfully using the local `.env` file — Infisical is not a hard dependency (NFR-10)

- [ ] **Given** the Infisical CLI runs inside the Docker container
  **When** only `INFISICAL_MACHINE_IDENTITY_CLIENT_ID` and `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET` are passed as host environment variables
  **Then** the CLI authenticates with Infisical and fetches all other secrets — only 2 bootstrap values are needed

- [ ] **Given** the backend starts with `infisical run`
  **When** measuring startup time
  **Then** the additional latency from secret fetching is < 3 seconds (NFR-7)

### Story 2.5: Frontend Build-Time Secret Injection

As a developer,
I want the frontend build process to use `infisical run` for build-time secret injection,
So that `VITE_*` environment variables are sourced from Infisical instead of `.env` files.

**Implements:** FR-15

**Acceptance Criteria:**

- [ ] **Given** the frontend build currently reads `VITE_*` variables from a local `.env` file or environment
  **When** the build command is changed to `infisical run --env=dev --path=/frontend -- npm run build`
  **Then** the Vite build picks up `VITE_DESCOPE_PROJECT_ID` and `VITE_DESCOPE_BASE_URL` from Infisical-injected environment variables

- [ ] **Given** the frontend build uses `infisical run`
  **When** the build completes
  **Then** `import.meta.env.VITE_DESCOPE_PROJECT_ID` is correctly embedded in the compiled JavaScript bundle — identical to the previous `.env` file behavior

- [ ] **Given** the Docker Compose frontend service builds with `infisical run`
  **When** `docker compose build frontend` is run with Machine Identity credentials available
  **Then** the build succeeds and the resulting image contains the correct Descope configuration

- [ ] **Given** a developer has not set up Infisical
  **When** `VITE_DESCOPE_PROJECT_ID` is provided via a local `.env` file or shell environment variable
  **Then** the build succeeds — `infisical run` is not required for local development (NFR-10)

### Story 2.6: Bootstrap Documentation

As a developer,
I want clear documentation of the 2-secret bootstrap process,
So that new developers can set up their environment quickly and understand the secrets architecture.

**Implements:** FR-16

**Acceptance Criteria:**

- [ ] **Given** a new developer cloning the repository
  **When** they read the setup documentation
  **Then** it clearly states that only 2 secrets are needed: `INFISICAL_MACHINE_IDENTITY_CLIENT_ID` and `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET`

- [ ] **Given** the documentation exists
  **When** it describes the bootstrap flow
  **Then** it covers: (1) `infisical login` for interactive development, (2) Machine Identity env vars for Docker Compose, (3) GitHub Actions secrets for CI/CD

- [ ] **Given** the documentation exists
  **When** it describes the fallback path
  **Then** it explains how to use `.env` files as a fallback for developers who have not set up Infisical (NFR-10)

- [ ] **Given** the documentation exists
  **When** reviewing its location
  **Then** it is in the repository README or a clearly linked setup guide (not buried in a planning artifact)

---

## Epic 3: Bidirectional Secret Flow

Terraform-generated secrets (access key cleartext) automatically flow to Infisical, and Infisical secrets can be read into Terraform runs — creating a single source of truth with full lifecycle management.

### Story 3.1: Infisical Terraform Provider Setup

As an infrastructure engineer,
I want the `infisical/infisical` Terraform provider added to the infrastructure configuration and authenticated via Machine Identity,
So that Terraform can read and write secrets in Infisical declaratively.

**Implements:** FR-17, FR-20

**Acceptance Criteria:**

- [ ] **Given** the current `infra/main.tf` has a `required_providers` block with `descope` and `github`
  **When** the `infisical/infisical` provider is added
  **Then** the `required_providers` block includes `infisical = { source = "infisical/infisical" }` with a version constraint

- [ ] **Given** the Infisical provider is declared
  **When** a `provider "infisical"` block is configured
  **Then** it authenticates via `client_id` and `client_secret` variables (not hardcoded values)

- [ ] **Given** the Infisical provider needs credentials during `terraform apply`
  **When** the HCP Terraform variable set "Infisical Credentials" is created
  **Then** it contains `INFISICAL_CLIENT_ID` and `INFISICAL_CLIENT_SECRET` as sensitive environment variables, scoped to the `descope-saas-starter-dev` workspace

- [ ] **Given** the provider and variable set are configured
  **When** `terraform init` is run
  **Then** the Infisical provider is downloaded and initialized alongside the Descope and GitHub providers

- [ ] **Given** `terraform plan` is run
  **When** the Infisical provider authenticates
  **Then** it connects to Infisical Cloud successfully using the Machine Identity credentials from the variable set

### Story 3.2: Terraform Outputs to Infisical Secrets

As an infrastructure engineer,
I want Terraform-generated sensitive outputs (access key cleartext) automatically stored in Infisical as managed secrets,
So that the application can consume TF-generated credentials from Infisical without manual copy-paste.

**Implements:** FR-18, FR-21, FR-22

**Acceptance Criteria:**

- [ ] **Given** a `descope_access_key` resource exists that outputs a cleartext access key
  **When** an `infisical_secret` resource is created referencing the cleartext output
  **Then** `terraform apply` creates the Descope access key AND writes its cleartext value to Infisical `/backend` folder in the `dev` environment

- [ ] **Given** the `infisical_secret` resource is created
  **When** inspecting it in the Infisical UI
  **Then** it has metadata or naming convention indicating `source = "terraform"` to distinguish it from manually created secrets (FR-22)

- [ ] **Given** a `data "infisical_secrets"` data source is configured for `/infra`
  **When** `terraform plan` is run
  **Then** Terraform can read secrets from Infisical (e.g., `DESCOPE_MANAGEMENT_KEY`) — enabling Infisical as the single source of truth for provider credentials (FR-21)

- [ ] **Given** the Infisical secrets are managed by Terraform
  **When** `terraform plan` is run after an out-of-band change in Infisical
  **Then** Terraform detects drift on managed `infisical_secret` resources and proposes to restore the expected values

- [ ] **Given** the infrastructure configuration includes both Descope and Infisical resources
  **When** reviewing `terraform state list`
  **Then** both `descope_*` and `infisical_secret.*` resources are visible in the remote state

### Story 3.3: End-to-End Flow Verification

As an infrastructure engineer,
I want to verify the complete bidirectional secret flow from Terraform provisioning through Infisical storage to application consumption,
So that I can confirm the pipeline works end-to-end with no manual steps.

**Implements:** FR-19

**Acceptance Criteria:**

- [ ] **Given** the full infrastructure configuration with both providers
  **When** `terraform apply` is run
  **Then** Descope resources are provisioned, sensitive outputs are written to Infisical, and the apply completes without errors

- [ ] **Given** Terraform has written secrets to Infisical
  **When** `infisical run --env=dev --path=/backend -- env` is executed
  **Then** the output includes Terraform-generated secrets (e.g., `DESCOPE_ACCESS_KEY_CLEARTEXT`) alongside manually imported secrets (`DESCOPE_PROJECT_ID`, `DATABASE_URL`)

- [ ] **Given** all secrets are in Infisical
  **When** the full application stack is started via `docker compose up --build`
  **Then** the backend starts successfully with all required secrets injected by `infisical run`, including both manually imported and Terraform-generated values

- [ ] **Given** the bidirectional flow is verified
  **When** the complete secret lifecycle is documented
  **Then** the flow is: `terraform apply` → Descope resources provisioned → sensitive outputs written to Infisical via `infisical_secret` → `infisical run` injects secrets into application → application reads `os.environ`

- [ ] **Given** the pipeline is operational
  **When** comparing the pre-migration state (N secrets in `.env` files, plaintext `.tfstate` on disk)
  **Then** the post-migration state has: 0 `.env` application secrets (only 2 bootstrap values), 0 local `.tfstate` files, all secrets in Infisical with audit logging, and state encrypted in HCP Terraform

---

## Epic Dependencies

```
Epic 1: HCP Terraform Remote State     Epic 2: Infisical Secrets Setup
  (can start immediately)                (can start immediately)
         │                                        │
         │  State must be remote                  │  Secrets must be in Infisical
         │  before TF provider                    │  before bidirectional flow
         │  writes to Infisical                   │  can be verified
         │                                        │
         └───────────────┬────────────────────────┘
                         │
                         ▼
               Epic 3: Bidirectional Flow
                 (depends on both 1 and 2)
```

Epics 1 and 2 are fully independent and can be executed in parallel. Epic 3 depends on both being complete.

## Story Dependency Order

### Epic 1 (sequential)
1.1 → 1.2 → 1.3 → 1.4

### Epic 2 (mostly sequential, 2.4/2.5 parallelizable)
2.1 → 2.2 → 2.3 → { 2.4, 2.5 } → 2.6

### Epic 3 (sequential)
3.1 → 3.2 → 3.3
