---
workflowType: 'epic'
project_name: 'identity-stack'
epic_id: 'VAULT'
epic_title: 'Secrets → HCP Vault Secrets migration (single source-of-truth)'
date: '2026-09-04'
status: 'planned'
inputDocuments:
  - identity-stack/infra/PROVIDERS.md   # PR jamescrowley321/identity-stack#397
ghIssues:
  epic: 'jamescrowley321/identity-stack#398'
  stories: 'jamescrowley321/identity-stack#399 … #405'
---

# Epic VAULT: Secrets → Vault migration (target: HCP Vault Dedicated)

> **⚠️ CORRECT-COURSE (2026-09-04): target changed HVS → HCP Vault Dedicated (HVD).**
> HCP Vault Secrets is end-of-life (end-of-sale 2025-06; the `hashicorp/hcp` Terraform provider has
> removed all `hcp_vault_secrets_*` resources/data sources). The design of record is now
> **`architecture-vault-oidc.md`**. Read "HVS" below as **HVD** unless noted; the OIDC / single-
> source-of-truth intent is unchanged. Verified caveats: no OIDC *into* HCP Terraform (static
> `TF_API_TOKEN` stays); Descope *management* keys have no rotation API (manual Console rotation).

## Overview

Move **every** secret the auth workspace uses into **HCP Vault Dedicated (HVD)** as
the single source-of-truth, **off the local host**, with each consumer (HCP
Terraform, GitHub Actions, the running backend, and local dev) pulling via
**OIDC / workload identity** — no long-lived Vault tokens stored anywhere.

**Motivation.** A Terraform `var` with `default = ""` (`var.descope_management_key`)
silently overwrote the live `DESCOPE_MANAGEMENT_KEY` GitHub secret with an empty
string on `apply` (last synced 2026-03-31). As a result identity-stack's
authenticated E2E/UI Playwright suite — 164 of ~220 tests — has been skipping
for ~5 months while the required `E2E Tests` check stayed green. The class is
general: any credential sourced from a defaulted TF variable, hand-set TFC
workspace var, or on-disk `.env` can rot or leak silently. The root fix is one
source-of-truth with fail-loud guards.

Nothing ships to end users from this epic — it changes how credentials are
stored and delivered. Provider/credential inventory of record:
**`identity-stack/infra/PROVIDERS.md`** (PR #397). Guarded by **#396** (TF
preconditions on empty secrets + a CI coverage gate).

## Target state

- **HVD = single source-of-truth.** Consumers pull via OIDC / SSO; no long-lived
  Vault tokens committed anywhere.
- The only credential artifact left on the host is a **short-lived HCP SSO
  session** — no secret material at rest.
- Every synced secret keeps a **fail-loud guard** (empty ⇒ fail, never silently
  blank).

## Decisions (resolved 2026-09-04)

- **Store** — ~~HVS~~ **HCP Vault Dedicated** (HVS is EOL; HVD keeps "managed, no self-managed
  ops"). Provisioned via `hcp_hvn` + `hcp_vault_cluster` — a **paid cluster** (owner gate).
- **GitHub delivery** — **runtime OIDC pull** via `hashicorp/vault-action` (`method: jwt`) against
  HVD's `jwt` auth backend. No secret at rest in GitHub (only non-secret `VAULT_ADDR` /
  `VAULT_NAMESPACE`). (The old HVS→GitHub native sync is gone with HVS.)
- **HCP Terraform delivery** — Dynamic Provider Credentials (Terraform Workload Identity) for the
  `vault` + `hcp` providers; runs read KV via `data "vault_kv_secret_v2"`.
- **Structure** — Vault KV-v2 paths per repo × env (`kv/identity-stack/{dev,prod}`,
  `kv/terraform-provider-descope`, `kv/py-identity-model`, `kv/adversarial-review`, `kv/shared`);
  one `jwt` role per repo × env, least-privilege policy per path.
- **Cost/tier** — HVD is a paid cluster (unlike free-tier HVS); confirm tier at provisioning.

## Non-goals

- Local **mock-IdP fixtures** (`.env.node-oidc` / `.env.keycloak` /
  `.env.identityserver`) — local test config, not real secrets.
- **docker-compose** local test passwords (`POSTGRES_PASSWORD`, Redis `changeme`).
- Standing up **self-managed Vault / OpenBao** — HVD is the managed target.

## Stories

Filed as GitHub issues on `identity-stack` (epic #398). Sequenced; verify +
rollback each; old secrets stay one phase behind as rollback.

---

### Story VAULT-0 — Stand up HVD + OIDC/SSO auth + consumer wiring (#399)

**User Story**
> As the platform owner, I want HCP Vault Dedicated provisioned with OIDC/SSO-based
> access for every consumer, so that secrets have a single home and nothing needs
> a long-lived Vault token.

**Description**
Provision the HVD cluster (`hcp_hvn` + `hcp_vault_cluster`) and configure Vault (kv-v2 mount,
`jwt-github` auth backend, one role per repo × env with claim-bound least-privilege policies, an
audit device). Wire GitHub Actions OIDC → Vault (`vault-action` jwt), HCP Terraform → Vault via
Dynamic Provider Credentials, and human SSO (`vault login -method=oidc`). Establish the bootstrap
so each consumer authenticates with no stored token. See `architecture-vault-oidc.md`.

**Acceptance Criteria**
- [ ] HVD cluster provisioned; kv-v2 paths per repo × env; least-privilege policies + audit device.
- [ ] `jwt-github` backend + per-repo/env roles trust GitHub's OIDC issuer (claim-bound).
- [ ] GitHub Actions reads a test secret from Vault via OIDC (no static token).
- [ ] An HCP Terraform workspace reads a test secret from Vault via Dynamic Provider Credentials.
- [ ] A human reads a test secret locally after SSO login (no stored token).
- [ ] Bootstrap documented; no long-lived Vault token committed anywhere.

---

### Story VAULT-1 — Seed HVS + rotate stale credentials (#400)

**User Story**
> As the owner, I want the authoritative secret values loaded into HVS (rotating
> anything stale/exposed), so that HVS becomes the source-of-truth in one
> controlled operation.

**Description**
Load every in-scope secret (#397 inventory) into its HVS path — the single
controlled moment a human handles secret material. Rotate the stale/exposed ones
first (the Descope management key is stale locally). Do not cut consumers over yet.

**Acceptance Criteria**
- [ ] Every in-scope secret from #397 present in HVS at its documented path.
- [ ] Stale Descope management key rotated; new value only in HVS (+ provider).
- [ ] No consumer wiring changed yet (rollback = existing live secrets untouched).
- [ ] Values smoke-verified without printing them.

---

### Story VAULT-2 — HCP Terraform ← HVS variable sets (#401)

**User Story**
> As the owner, I want HCP Terraform to source its variables from HVS instead of
> hand-set workspace vars, so that the empty-secret class that blanked
> `DESCOPE_MANAGEMENT_KEY` becomes impossible.

**Description**
Replace hand-set TFC workspace variables/env (`descope_management_key`,
`e2e_test_email`, `DESCOPE_MANAGEMENT_KEY` provider auth, `GITHUB_TOKEN`,
`ORY_WORKSPACE_API_KEY`) with HVS-sourced values. Collapse the divergence
between provider auth and `github.tf`'s `var.descope_management_key`.

**Acceptance Criteria**
- [ ] `terraform apply` runs with zero hand-set secret variables in the workspace.
- [ ] `github.tf` syncs `DESCOPE_MANAGEMENT_KEY` / `E2E_TEST_EMAIL` from HVS; #396 precondition passes.
- [ ] The identity-stack E2E coverage gate (#396) goes GREEN — the 164 tests run.
- [ ] Provider auth + secret-sync share one HVS-sourced value (no divergence).

---

### Story VAULT-3 — GitHub Actions ← HVS, repo by repo (#402)

**User Story**
> As the owner, I want each repo's CI to source secrets from HVS, so that no
> secret is hand-set or drifts per repo.

**Description**
Per repo (`identity-stack` → `terraform-provider-descope` → `py-identity-model`
→ `adversarial-review`), move CI secrets to HVS delivery (recommended: runtime
OIDC pull; alt: HVS→GitHub sync). Retire TF-pushed / manual GH secrets now
sourced from HVS (`OPENROUTER_API_KEY`, `CARGO_REGISTRY_TOKEN`, `DESCOPE_*`,
`E2E_*`).

**Acceptance Criteria**
- [ ] Each repo's CI green sourcing secrets only from HVS.
- [ ] `OPENROUTER_API_KEY` + `CARGO_REGISTRY_TOKEN` sourced from HVS, not manual GH secrets.
- [ ] Delivery pattern (OIDC pull vs sync) documented + applied consistently.
- [ ] Old GH secrets removed only after HVS-sourced CI proven green.

---

### Story VAULT-4 — Runtime backend ← HVS + bring the 3 unmanaged `/internal` secrets in (#403)

**User Story**
> As the owner, I want the running backend to get its secrets from HVS and the
> currently-unmanaged `/internal` secrets brought under management, so that
> nothing is provisioned by hand at deploy time.

**Description**
Wire the backend to read from HVS (local via `hcp vault-secrets run`; deployed
via workload identity). Generate `DESCOPE_WEBHOOK_SECRET`,
`DESCOPE_FLOW_SYNC_SECRET`, `INTERNAL_IDENTITY_KEY` into HVS (no source today).
Source `ORY_ISSUER_URL` / `ORY_AUDIENCE` from HVS/Ory outputs; de-fragilise
`DESCOPE_EXPIRED_TOKEN`.

**Acceptance Criteria**
- [ ] Backend starts locally + deployed with all secrets from HVS (no real-secret `.env`).
- [ ] `DESCOPE_WEBHOOK_SECRET` / `DESCOPE_FLOW_SYNC_SECRET` / `INTERNAL_IDENTITY_KEY` generated, stored in HVS, delivered.
- [ ] `ORY_ISSUER_URL` / `ORY_AUDIENCE` sourced from HVS (no manual copy).
- [ ] `DESCOPE_EXPIRED_TOKEN` generation de-fragilised (no `local-exec` curl).

---

### Story VAULT-5 — Scrub the local host (#404)

**User Story**
> As the owner, I want all real secret material removed from my local host, so
> that a compromised laptop leaks nothing.

**Description**
Delete the real secret-bearing files found in the on-disk scan; confirm
`.gitignore`; replace the `.env` dev workflow with `hcp vault-secrets run --`.
Keep only non-secret local fixtures. Verify nothing sensitive at rest.

**Acceptance Criteria**
- [ ] Real-cred files removed: `identity-stack/.env` + `backend/.env`, `terraform-provider-descope/.env`, `py-identity-model/.env` + `.env.local` + `.env.descope`, `identity-model-legacy/.env.*`.
- [ ] Local dev runs via `hcp vault-secrets run`; no real-secret `.env` recreated.
- [ ] A host scan finds no live cloud secret.
- [ ] Mock-IdP fixtures retained (not secrets).

---

### Story VAULT-6 — Rotate migrated secrets + rotation cadence + keep guardrails (#405)

**User Story**
> As the owner, I want every migrated secret rotated and a rotation cadence set,
> so that anything that ever touched disk is invalidated and future rot is caught.

**Description**
Rotate all secrets that were previously on disk / at rest. Set a rotation cadence
and automate where supported. Keep the fail-loud TF preconditions (#396) + CI
coverage gate as permanent acceptance checks.

**Acceptance Criteria**
- [ ] Every previously-on-disk secret rotated post-migration.
- [ ] Rotation cadence documented (+ automated where supported).
- [ ] #396 TF preconditions + CI coverage gate retained as permanent guards.
- [ ] Audit log confirms no unexpected HVS access.
