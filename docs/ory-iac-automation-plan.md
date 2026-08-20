---
workflowType: 'planning'
doc_type: 'iac-automation-plan'
project_name: 'identity-stack'
user_name: 'James'
date: '2026-08-19'
status: 'draft'
purpose: >-
  Concrete Infrastructure-as-Code and automation plan for standing up Ory Network as a
  configurable SSO provider for identity-stack, using the ory/ory Terraform provider. Backs
  Epic 1 of epics-ory-sso-provider.md. Grounded in the existing identity-stack/infra Terraform
  Cloud setup and the Ory project py-identity-model already validates against.
---

# Ory IaC & Automation Plan

**Author:** James · **Date:** 2026-08-19 · **Status:** Draft

Backs **Epic 1 (Ory Network Provisioning)** of
`_bmad-output/planning-artifacts/epics-ory-sso-provider.md`. Read the framing in
`docs/ory-sso-provider-context.md` first: the goal is to make identity-stack's IdP configurable so
an Ory Network provider can be **configured and run** — Descope is not removed. This document is the
IaC/automation half: how the Ory OAuth2/OIDC surface gets provisioned declaratively and kept in sync.

## Objective

Provision, via Terraform, the minimum Ory Network surface identity-stack needs to run interactive
OIDC login against Ory:

1. Project OAuth2 config with the **JWT access-token strategy** (so tokens validate locally via
   py-identity-model — the strategy PIM already relies on).
2. A **public SPA OAuth2 client** (authorization_code + PKCE, redirect + post-logout URIs).
3. An **identity schema** (SCIM-aligned traits), with **Organizations gated behind a flag**
   (default off → canonical-side tenancy).

Everything else (custom domain, social/SAML upstreams, Kratos UX, Keto) is out of MVP scope.

## Ground Truth We Build On

Confirmed from the repos — this is reuse, not greenfield tooling:

| Fact | Source | Consequence for IaC |
|---|---|---|
| An **Ory Network project** already exists and issues JWT access tokens | py-identity-model CI: `make test-integration-ory`, `TEST_DISCO_ADDRESS` secret, audience `https://py-identity-model` | Reuse the **same project** (or a sibling project in the same workspace); the JWT strategy is already on |
| The project's **discovery/issuer** URL is a PIM GH secret | `TEST_DISCO_ADDRESS` = `https://<slug>.projects.oryapis.com/.well-known/openid-configuration` | Derives `issuer_url` for the `providers` registry row + middleware (Epic 2) |
| PIM exercises **client-credentials (M2M)** only, never interactive login | `ory_create_client.sh` (local Hydra fixture), `test-integration-ory` | The **public SPA client is net-new**; the M2M creds PIM holds are not the SPA client |
| identity-stack IaC = **Terraform Cloud**, org `jamescrowley321`, workspace `identity-stack-dev`, `descope` + `github` providers, `environments/{dev,prod}.tfvars` | `identity-stack/infra/main.tf`, `variables.tf`, `github.tf` | Add Ory as a **parallel root module + workspace**, matching these conventions |
| The `ory/ory` Terraform provider (Ory Network SaaS, v26.3.x) covers project config, OAuth2 clients, identity schemas, organizations, actions, custom domains | feeder doc | Terraform is the primary automation surface |

**"I have Ory cloud and creds in PIM" resolves the deployment question** (Ory Network, hosted) and
gives us discovery + M2M creds. It does **not** by itself provide a **management API token** for
Terraform (see Credentials below) — that's the one credential likely still to mint.

## Credential Model (the important part)

Three distinct credential types — do not conflate them:

| Credential | What it's for | Where it lives | Status |
|---|---|---|---|
| **Ory Network Project/Workspace API key** | Authenticates the `ory/ory` **Terraform provider** and the `ory` **CLI** for management-plane writes (create client, patch project config, define schema) | Infisical → injected as a TF Cloud workspace env var (sensitive) | **Likely net-new** — PIM doesn't need it. Mint in the Ory console. **[CONFIRM]** exact provider var name for v26.3.x (`ORY_PROJECT_API_KEY` / `api_key`) |
| **OAuth2 M2M client** (`client_id` + `client_secret`) | Client-credentials tokens (what PIM validates; audience `https://py-identity-model`). Reusable if the backend ever needs an Ory M2M token | Already a PIM secret; mirror into Infisical if identity-stack needs it | **Exists** (PIM) |
| **OAuth2 public SPA client** (`client_id`, **no secret**) | The frontend's interactive auth_code + PKCE login | **Created by Terraform** (Story 1.2); `client_id` published as app/CI config | **Net-new**, IaC-owned |

**Secrets discipline (NFR-3):** the project API key and any client secrets flow through
**Infisical** and are surfaced to Terraform as sensitive TF Cloud workspace variables. No secret is
written to `.tf`, committed, or stored in Postgres. The SPA client is public (no secret to leak).

## Repository Layout

Add a **parallel root module** rather than folding Ory into the Descope module — it isolates Ory's
create-only/no-import caveats and its own apply cadence, and keeps the Descope state untouched.

```
identity-stack/infra/
  main.tf, project.tf, tenants.tf, rbac.tf, fga.tf, github.tf   # existing — Descope, unchanged
  environments/{dev,prod}.tfvars
  ory/                          # NEW root module
    main.tf                     # terraform{} + ory/ory provider + TF Cloud workspace identity-stack-ory-dev
    project.tf                  # ory_project_config: access_token strategy = jwt, allowed_top_level_claims
    oauth2_client.tf            # ory_oauth2_client: public SPA, auth_code + PKCE, redirect + post-logout URIs
    identity_schema.tf          # ory_identity_schema: email/given_name/family_name (SCIM-aligned)
    organizations.tf            # count = var.enable_organizations ? 1 : 0  → ory_organization (+ optional ory_action)
    variables.tf                # ory_project_id, enable_organizations, spa_redirect_uris, spa_post_logout_uris, deploy_origin
    outputs.tf                  # client_id, issuer_url, discovery_url  (NO secrets)
    environments/{dev,prod}.tfvars
    README.md                   # create-only/no-import caveats + Organizations [CONFIRM] + both tenancy paths
```

Provider/workspace block mirrors the existing module:

```hcl
terraform {
  cloud {
    organization = "jamescrowley321"
    workspaces { name = "identity-stack-ory-dev" }   # -prod for prod
  }
  required_providers {
    ory = { source = "ory/ory", version = "~> 26.3" }
  }
}
# provider "ory" auth via Ory Project/Workspace API key from a sensitive TF Cloud env var — [CONFIRM] exact arg name
```

## Terraform Resource Inventory

| Resource | Purpose | MVP? | Import caveat |
|---|---|---|---|
| `ory_project_config` | Set OAuth2 `strategies/access_token = jwt`; `oauth2/allowed_top_level_claims` (empty for canonical-side default) | **Yes** | Config is patch-style / drift-managed |
| `ory_oauth2_client` (public SPA) | `grant_types=[authorization_code,refresh_token]`, `response_types=[code]`, `token_endpoint_auth_method=none`, PKCE required, redirect + post-logout URIs, scopes `openid profile email offline_access`, JWT access tokens | **Yes** | Client secrets (n/a for public) not importable |
| `ory_identity_schema` | Traits `email` (req/unique), `given_name`, `family_name` — SCIM-aligned with canonical `users` | **Yes** | **Create-only — cannot be imported** |
| `ory_organization` | B2B org ↔ canonical tenant (persist id to `tenants.external_org_id`) | **Flag-gated** (`enable_organizations`, default off) | Depends on paid tier |
| `ory_action` | Custom claim / webhook hooks (only if a downstream needs token-embedded roles) | No (default) | — |
| `ory_custom_domain` | Branded `iss` + discovery | **Deferred** | — |
| `ory_social_provider` / `ory_saml_provider` | Upstream Google/Entra/Okta/SAML SSO | Out of scope | SAML = Enterprise tier |

**Hard caveat to encode in the README (NFR-6):** identity schemas, API-key values, and secrets are
**create-only** in the `ory/ory` provider — they cannot be imported and are drift-managed. Treat the
schema as append/replace, not import-and-edit.

## State & Environments

- **Backend:** Terraform Cloud (HCP), org `jamescrowley321`, new workspaces
  `identity-stack-ory-dev` / `identity-stack-ory-prod` — same pattern as `identity-stack-dev`. State
  is remote and encrypted; never local.
- **Per-env tfvars:** `ory/environments/{dev,prod}.tfvars` carry `ory_project_id`, redirect/origin
  URIs, and `enable_organizations`. **[CONFIRM]** whether dev and prod are separate Ory projects or
  one project — if separate, each env points at its own `ory_project_id` + issuer.
- **Reuse or sibling project:** simplest MVP = reuse PIM's existing Ory project for `dev` (JWT
  strategy already on, discovery known). A dedicated identity-stack project is cleaner long-term;
  decide per-env. **[CONFIRM]**

## CI/CD Automation

Mirror the terraform-provider-descope / identity-stack Terraform Cloud pattern:

1. **Plan on PR** — a GitHub Actions job (or TF Cloud VCS-driven run) runs `terraform plan` for
   `infra/ory` on PRs touching that path; the plan is posted for review. No apply on PR.
2. **Apply on merge to main** — TF Cloud applies the approved plan (manual apply gate for prod).
3. **Publish outputs to app/CI config** — reuse the existing `github.tf` pattern (the `github`
   provider already writes CI secrets) to publish the SPA `client_id` + `issuer_url`/`discovery_url`
   as GitHub Actions secrets / app env, so Epic 2 (provider registry, middleware) and Epic 4
   (frontend `VITE_OIDC_*`) consume them without hand-copying.
4. **Drift detection** — a scheduled `terraform plan` (nightly) flags drift; because schemas/secrets
   are create-only, drift on those is surfaced as a warning to reconcile manually rather than
   auto-applied.
5. **Secrets injection** — the Ory project API key is a sensitive TF Cloud workspace env var sourced
   from Infisical; CI never sees the raw key.

## Bootstrap Sequence (MVP, `enable_organizations = false`)

1. **Mint an Ory Network Project/Workspace API key** in the Ory console; store it in Infisical.
   **[CONFIRM]** whether the same-as-PIM project or a new one.
2. Create TF Cloud workspace `identity-stack-ory-dev`; set the API key as a sensitive env var; set
   `ory_project_id` + redirect/origin vars.
3. Scaffold `infra/ory/` (Story 1.1); `terraform init`; confirm the `ory/ory` provider auth works.
4. Apply `ory_project_config` — ensure `access_token = jwt` (idempotent if already set by PIM).
5. Apply `ory_identity_schema` (Story 1.3) and the **public SPA `ory_oauth2_client`** (Story 1.2)
   with the dev + deploy redirect/post-logout URIs.
6. Read outputs: `client_id`, `issuer_url`, `discovery_url`.
7. Hand off to Epic 2/4: register the `ory` provider row (`issuer_url`, `config_ref`) and set the
   frontend `VITE_OIDC_*` vars to the outputs.
8. Verify with Epic 5's end-to-end test (reuses the py-identity-model / `TEST_DISCO_ADDRESS` path).

## Open Questions / Confirms

- **[CONFIRM] Project API key** — mint a management API key for the `ory/ory` provider; confirm the
  exact provider auth arg/env name for v26.3.x (PIM doesn't already hold this).
- **[CONFIRM] Same project vs new** — reuse PIM's Ory project (fast MVP) or a dedicated
  identity-stack project (cleaner isolation); and dev vs prod project separation.
- **[CONFIRM] Organizations tier** — is the project on a paid tier with Organizations? Default keeps
  `enable_organizations = false` (canonical-side tenancy); flip only if the tier includes it.
- **[DEFERRED] Custom domain** — branded `iss` via `ory_custom_domain` is post-MVP.
- **[CONFIRM] DPoP** — Ory Network DPoP support on the plan; default off (baseline OIDC + PKCE only,
  FAPI 2.0 not a target).

## Mapping to Epic 1

| Story | This plan |
|---|---|
| 1.1 Terraform scaffold + `ory_project_config` (JWT strategy) | Repository Layout, Bootstrap 3–4, Credential Model (project API key) |
| 1.2 Public SPA `ory_oauth2_client` (auth_code + PKCE) | Resource Inventory (client row), Bootstrap 5 |
| 1.3 Identity schema + flag-gated Organizations | Resource Inventory (schema, org), State & Environments |

Cross-repo note: this track is **separate from `terraform-provider-descope`** — that fork stays
Descope-only. The Ory track uses the upstream `ory/ory` provider and does not touch the Descope
module or its state.
</content>
