---
title: 'Secrets architecture — HCP Vault Dedicated + GitHub/HCP-Terraform OIDC'
status: 'proposed'
supersedes: 'HVS target in epic-secrets-vault-migration.md (VAULT epic #398)'
date: '2026-09-04'
verifiedBy: 'two independent web-research passes (see Sources); flags noted inline'
---

# Secrets architecture: HCP Vault Dedicated + OIDC federation

## Correct-course: why the HVS target is dead

The VAULT epic (#398) chose **HCP Vault Secrets (HVS)** as the single source-of-truth. That
product is **end-of-life**:

- HashiCorp put HVS **end-of-sale in 2025-06** and **EOL in 2025-08 (PAYG) / by ~2026-07**, after
  which HVS apps are deleted; guidance is to move to **HCP Vault Dedicated** or self-managed Vault.
- Corroborated in tooling: the `hashicorp/hcp` Terraform provider (current `v0.114.x`) has
  **removed every `hcp_vault_secrets_*` resource and data source**. There is no supported
  Terraform path to manage HVS today. Only `hcp_vault_cluster` (Dedicated) and `vaultradar` remain.

**Decision (owner, in-session):** target **HCP Vault Dedicated (HVD)** — managed by HashiCorp (no
self-managed ops, consistent with the epic's non-goal), TF-provisionable, and a first-class OIDC
relying party for both GitHub Actions and HCP Terraform.

## Target architecture

**HVD is the single source-of-truth.** Every consumer authenticates by **OIDC / workload
identity** — no long-lived Vault token stored anywhere. Secret *values* live only in Vault KV-v2;
consumers read at runtime.

Four trust flows:

| # | Consumer → target | Mechanism | Static secret? |
|---|---|---|---|
| 1 | **GitHub Actions → Vault** | `hashicorp/vault-action@v3`, `method: jwt`; Vault `jwt` auth backend trusts GitHub's OIDC issuer; role bound to `repository`/`ref`/`environment` claims | **None** (only non-secret `VAULT_ADDR`/`VAULT_NAMESPACE` in GitHub) |
| 2 | **HCP Terraform run → Vault** | HCP Terraform *Dynamic Provider Credentials* (Terraform Workload Identity) for the `vault` provider; run reads KV via `data "vault_kv_secret_v2"` | **None** (`TFC_VAULT_*` workspace env vars) |
| 3 | **HCP Terraform run → HCP** (to manage the HVD cluster) | Dynamic Provider Credentials for the `hcp` provider (`TFC_HCP_PROVIDER_AUTH` + a `hcp_iam_workload_identity_provider` trusting `app.terraform.io`) | **None** |
| 4 | **Human / local dev → Vault** | HCP SSO session, then `vault login -method=oidc` / read KV | Short-lived SSO session only |

### What does NOT exist (guardrails against wrong assumptions)

- **You cannot OIDC-federate *into* HCP Terraform's own API.** GitHub → HCP Terraform is still a
  **static `TF_API_TOKEN`** team token. HCP Terraform is an OIDC *issuer* (for flows 2 & 3), never a
  relying party for GitHub OIDC. Mitigation = a narrowly-scoped, rotated team token, not "OIDC".
- **Descope *management* keys have no create/rotate API.** Console-only, expiry 30/60/90/never.
  They are *stored* in Vault and pulled via OIDC (never at rest in GitHub), but **rotation stays a
  manual human step**. (Descope *access* keys ARE API-rotatable — different, narrower scope.)
- **`hcp_vault_secrets_*` Terraform resources are gone** — do not plan around them.

## Terraform layout

Two roots, two providers:

1. **`infra/vault/cluster` — provision HVD** (`hashicorp/hcp` provider): `hcp_hvn` +
   `hcp_vault_cluster` (paid), outputs `vault_public_endpoint_url` + namespace. Gate: this
   **provisions a paid cluster** — owner approves the first apply.
2. **`infra/vault/config` — configure Vault** (`hashicorp/vault` provider): `vault_mount` (kv-v2,
   e.g. `kv/`), `vault_jwt_auth_backend` (path `jwt-github`, `oidc_discovery_url =
   https://token.actions.githubusercontent.com`), one `vault_jwt_auth_backend_role` **per repo ×
   env** (bound_claims on `repository`/`ref`/`environment`, `bound_audiences`, `token_policies`,
   short `token_ttl`), and least-privilege `vault_policy` per KV path. Secret *values* are seeded
   out-of-band (VAULT-1), not committed.

Both are new TFC workspaces (tag-based, per [[project_tfc_dev_prod_environments]] convention):
`identity-stack-vault-{dev,prod}` or a shared `auth-vault` — decide during VAULT-0.

## GitHub Actions pattern (replaces static CI secrets)

```yaml
permissions:
  contents: read
  id-token: write            # mints the GitHub OIDC token
steps:
  - uses: hashicorp/vault-action@v3
    with:
      url: ${{ vars.VAULT_ADDR }}          # non-secret repo variable
      namespace: ${{ vars.VAULT_NAMESPACE }} # HVD namespace (e.g. admin)
      method: jwt
      path: jwt-github
      role: identity-stack-ci              # Vault role bound to this repo + env
      secrets: |
        kv/data/identity-stack/${{ env.ENV }} DESCOPE_MANAGEMENT_KEY | DESCOPE_MANAGEMENT_KEY
```

Vault-side role (in `infra/vault/config`):

```hcl
resource "vault_jwt_auth_backend" "github" {
  path               = "jwt-github"
  oidc_discovery_url = "https://token.actions.githubusercontent.com"
  bound_issuer       = "https://token.actions.githubusercontent.com"
}

resource "vault_jwt_auth_backend_role" "identity_stack_ci" {
  backend         = vault_jwt_auth_backend.github.path
  role_name       = "identity-stack-ci"
  role_type       = "jwt"
  user_claim      = "repository"
  bound_audiences = ["https://github.com/jamescrowley321"]
  bound_claims_type = "string"
  bound_claims = {
    repository = "jamescrowley321/identity-stack"
    # add ref/environment to scope to prod deploys, e.g.:
    # environment = "prod"
  }
  token_policies = ["identity-stack-ci-read"]
  token_ttl      = 900
}
```

Note: some Vault versions still require `bound_audiences` even when `bound_claims` is set — always
set it.

## Bootstrap sequence (owner gates marked 🔑)

1. 🔑 **Provision HVD** — apply `infra/vault/cluster` (paid). Capture Vault addr + namespace.
2. 🔑 **Init Vault + admin token** — one-time, to apply `infra/vault/config`.
3. Apply `infra/vault/config` — kv-v2 mount, `jwt-github` backend, roles, policies (codified; no
   secret values yet).
4. 🔑 **Seed secret values (VAULT-1)** — the single controlled human moment. **Rotate the stale
   Descope management key first**, load only the new value into Vault.
5. Set non-secret repo variables `VAULT_ADDR` / `VAULT_NAMESPACE`; add `id-token: write` + the
   `vault-action` step to CI (VAULT-3). Verify a job reads a test secret.
6. Wire HCP Terraform Dynamic Credentials (flows 2 & 3); switch the Descope root to read the mgmt
   key via `data "vault_kv_secret_v2"` and drop the hand-set TFC var (VAULT-2). **This is what makes
   the identity-stack E2E gate (#396) go green** — `github.tf` stops blanking `DESCOPE_MANAGEMENT_KEY`.
7. Retire old GH secrets only after HVD-sourced CI is proven green (VAULT-3); then scrub host
   (VAULT-5) and rotate + set cadence (VAULT-6).

## Impact on the current red CI

The repo-wide E2E `401`s are the empty/rotted `DESCOPE_MANAGEMENT_KEY`. This design fixes it
durably at step 6. If the queue must go green **before** HVD stands up, the only bridge is to
rotate the Descope mgmt key and set it once (the mechanism #410 uses) — a stopgap this epic then
retires.

## Sources (verified 2026-09-04)

- HVS EOL: support.hashicorp.com HVS End-Of-Life + Decommissioning articles; developer.hashicorp.com/hcp/docs/vault-secrets/migrate-vault
- `hashicorp/hcp` provider — HVS resources removed (verified against provider `main`/v0.114.x)
- HCP Terraform Dynamic Provider Credentials (HCP + Vault): developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials/{hcp,vault}-configuration
- GitHub→Vault OIDC: developer.hashicorp.com/validated-patterns/vault/retrieve-vault-secrets-from-github-actions; github.com/hashicorp/vault-action; developer.hashicorp.com/vault/docs/auth/jwt
- GitHub→HCP Terraform is static `TF_API_TOKEN`: developer.hashicorp.com/terraform/tutorials/automation/github-actions
- Descope management keys (Console-only): docs.descope.com/management
