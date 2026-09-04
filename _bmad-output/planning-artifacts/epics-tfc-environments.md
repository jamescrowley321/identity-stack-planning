---
stepsCompleted: ['step-01-scope-current-state', 'step-02-target-topology', 'step-03-epic-story-breakdown', 'step-04-gates-and-risks']
inputDocuments:
  - identity-stack/infra/main.tf
  - identity-stack/infra/variables.tf
  - identity-stack/infra/github.tf
  - identity-stack/infra/ory/versions.tf
  - identity-stack/infra/ory/main.tf
  - identity-stack/infra/ory/README.md
  - _bmad-output/planning-artifacts/architecture-infrastructure-secrets.md
  - _bmad-output/planning-artifacts/epics-infrastructure-secrets.md
companionEpics:
  - VAULT — secrets → HCP Vault Secrets migration (identity-stack #398)
---

# Terraform Cloud — dev + prod Environments — Epic Breakdown

## Overview

Establish isolated **dev** and **prod** environments in **Terraform Cloud** (HCP Terraform,
org `jamescrowley321`) for the two deployable Terraform roots ("stacks") in `identity-stack`:

- **Descope stack** — `infra/*.tf`. Manages the Descope project
  `P36PkOh8CsTfqzMjJlCjaeatp3xK`, access keys, FGA, RBAC, tenants, and GitHub Actions secrets.
  Providers: `jamescrowley321/descope ~>1.0` (fork), `integrations/github ~>6.0`,
  `hashicorp/local ~>2.5`. Today: TFC workspace `identity-stack-dev`.
- **Ory stack** — `infra/ory/`. Wraps the reusable `modules/ory-oidc-app`; provisions an Ory
  Network OIDC project. Today: **local state** (no `cloud{}` block); live dev project in the
  free-tier Ory workspace `auth-stack`.

`terraform-provider-descope` (a provider) and `py-identity-model` / `identity-model` (libraries)
have **no** deployable infra and are out of scope; at most they take a dev-only, free-tier Ory
integration project later via the convergence pattern. `adversarial-review` is a GitHub Action —
no TFC footprint.

**Design constraint (explicit owner decision):** environments are named **`dev`** and **`prod`**
so the existing `identity-stack-dev` TFC workspace and `environments/dev.tfvars` are kept — **no
renames of any existing resource or workspace**. The switch to tag-based workspace selection is
achieved by *adding tags* to the existing workspace, not renaming it.

**Companion:** this epic is a peer of the **VAULT** secrets-migration epic (identity-stack #398).
All provider auth and secret-valued inputs source from the single secrets source-of-truth that
VAULT establishes (HCP Vault Secrets); this epic must not re-entrench hand-set empty TFC vars.

Target: **2 stacks × 2 environments = 4 TFC workspaces**, hard-isolated (a separate Descope
project and a separate Ory project per environment).

## Target topology

| TFC workspace (org `jamescrowley321`) | Stack | Env | Backend | Exec | Run trigger | Manages |
|---|---|---|---|---|---|---|
| `identity-stack-dev` **(kept, tagged)** | Descope | dev | TFC (tags) | remote | VCS → PR plan / merge apply | Descope dev project + access keys / FGA / RBAC / tenants + GH env secrets |
| `identity-stack-prod` (new) | Descope | prod | TFC (tags) | remote | VCS, **manual apply** | Descope prod project (new) + same resources |
| `identity-stack-ory-dev` (new) | Ory | dev | TFC (tags) | remote | VCS → PR plan / merge apply | Ory dev project (adopts current local state) |
| `identity-stack-ory-prod` (new) | Ory | prod | TFC (tags) | remote | VCS, **manual apply** | Ory **prod** project in a **paid** Ory workspace |

Naming is asymmetric by design — the Descope stack keeps the plain `identity-stack-{dev,prod}`
names (so the existing workspace is untouched); the Ory stack carries the `-ory-` qualifier. This
is the accepted trade for zero renames.

### Environment model

Tag-based workspace selection (`cloud { workspaces { tags = [...] } }`) so one config maps to two
workspaces, env chosen at run time via `TF_WORKSPACE`. Descope tags `["identity-stack","descope"]`;
Ory tags `["identity-stack","ory"]`. The existing `identity-stack-dev` workspace only needs those
tags added in the TFC UI/API — name, state, and VCS connection stay intact.

## Requirements inventory

### Functional

- FR-1: Descope root `cloud{}` switched from `name = "identity-stack-dev"` to `tags`; existing
  workspace tagged; `terraform init` reattaches with no state move.
- FR-2: `descope_project_id` promoted to a declared, validated variable (currently referenced but
  undeclared).
- FR-3: CI secrets scoped per environment — GitHub Environments `dev`/`prod` +
  `github_actions_environment_secret` replacing repo-level `github_actions_secret`.
- FR-4: `environment` variable (`dev`/`prod`) drives per-env resource behavior and secret scoping.
- FR-5: Ory root gets a `cloud{}` tag block; local state migrated to `identity-stack-ory-dev` via
  `terraform init -migrate-state` (no resource churn).
- FR-6: Descope **prod** project + `identity-stack-prod` workspace provisioned with per-env vars.
- FR-7: Ory **prod** project provisioned in a paid Ory Production workspace +
  `identity-stack-ory-prod`.
- FR-8: TFC variable sets (`auth-org-common`, `descope-auth`, `ory-auth`) wired to the VAULT
  secrets source-of-truth; exposed Ory workspace key rotated.

### Non-functional

- NFR-1 (Safety): Every dev-adoption step is a **0-change plan** (adoption, not recreation).
- NFR-2 (Safety): `prevent_destroy` on `descope_project` (both envs) and on prod Ory
  `ory_project` / `ory_oauth2_client`.
- NFR-3 (Safety): No workspace var can push an **empty** secret — `validation` on inputs +
  `precondition` on `github_actions_environment_secret`.
- NFR-4 (Isolation): dev and prod are separate Descope projects and separate Ory projects; no
  shared state, no shared CI secret scope.
- NFR-5 (Governance): prod workspaces are manual-apply; dev may auto-apply on merge.
- NFR-6 (Compliance): Ory prod on a paid Production workspace before any real PII (Develop tier
  forbids PII and Organizations).

## Epic & story breakdown

All stories target `[IS]` = `jamescrowley321/identity-stack`. Each story is one PR.

**Dependency order:** TFCENV-1 → (TFCENV-2, TFCENV-3, TFCENV-4 in parallel) →
(TFCENV-5 needs 1+3; TFCENV-6 needs 4's pattern) → TFCENV-7 aligns with VAULT (#398).

### TFCENV-1 — Descope root: tag-based TFC workspaces (no rename)
Switch `infra/main.tf` `cloud{}` from `name` to `tags = ["identity-stack","descope"]`; add those
tags to the existing `identity-stack-dev` workspace in TFC; `terraform init` reattaches to the
same workspace. **Acceptance:** `TF_WORKSPACE=identity-stack-dev terraform plan
-var-file=environments/dev.tfvars` = 0 changes; workspace name/state/VCS link unchanged.
**Rollback:** revert cloud block to `name`; leftover tags are harmless.

### TFCENV-2 — GitHub Environments + `environment` variable (fix CI-secret stomp)
`github.tf` writes **repo-level** secrets to one repo (`var.github_repository`), so two envs would
overwrite each other. Add `variable "environment"` (`dev`/`prod`); add
`github_repository_environment` for `dev` and `prod`; convert each `github_actions_secret` →
`github_actions_environment_secret` keyed by `environment`; update the identity-stack CI workflow
to select `environment: dev|prod`. **Acceptance:** dev CI reads env-scoped secrets; no repo-level
Descope secrets remain. **Note:** the repo-secret → env-secret migration is the one intended diff
on dev — review the plan and coordinate the workflow cutover.

### TFCENV-3 — Declare `descope_project_id` + destroy/empty-secret guardrails
Add `variable "descope_project_id"` with `validation { length > 0 }`; add matching validation to
`descope_management_key` and other secret inputs; add a `precondition` on the environment-secret
resources so a blank secret fails the plan instead of clobbering a live value with `""`; add
`lifecycle { prevent_destroy = true }` to `descope_project`. **Acceptance:** empty project id /
mgmt key fails `plan`; `terraform plan -destroy` refuses to destroy the project.

### TFCENV-4 — Ory root: TFC backend + migrate local state to dev
Add the `cloud { workspaces { tags = ["identity-stack","ory"] } }` block to
`infra/ory/versions.tf`; create the `identity-stack-ory-dev` workspace (tagged); set `ory-auth`
vars; run `terraform init -migrate-state` to upload existing local state. **Acceptance:**
`plan -var-file=environments/dev.tfvars` = 0 changes; local `terraform.tfstate` backed up then
removed; `.gitignore` still excludes state. **Rollback:** restore local state backup; revert
versions.tf.

### TFCENV-5 — Descope prod: project + `identity-stack-prod` workspace
Create the prod Descope project (**gate:** confirm tier allows a 2nd project); create the
`identity-stack-prod` workspace (tagged); set per-env vars (`descope_project_id` = new prod id,
`environment = prod`, `descope_project_name = "identity-stack"`); apply from
`environments/prod.tfvars`; confirm `prevent_destroy` live. **Acceptance:** prod project + access
keys / FGA / RBAC / tenants created; prod GitHub `prod` environment secrets populated; workspace is
manual-apply.

### TFCENV-6 — Ory prod: paid Production workspace + `identity-stack-ory-prod`
**Gate (paid, console-only):** create a paid Ory Production workspace in the Ory Console
(`ory_workspace` cannot be Terraform-created), capture its id + a fresh workspace API key. Create
the `identity-stack-ory-prod` TFC workspace; set prod `ory-auth` overrides; add a prod
`modules/ory-oidc-app` instantiation (prod redirect/logout URIs, real audience,
`enable_organizations` per tier); apply. **Acceptance:** prod Ory project + SPA client created;
issuer/discovery captured for backend/frontend prod config; workspace is manual-apply.

### TFCENV-7 — Wire variable sets to the secrets source-of-truth + rotate keys
Create TFC variable sets `auth-org-common` (all 4 workspaces), `descope-auth` (2 Descope
workspaces: `DESCOPE_MANAGEMENT_KEY`, GitHub token), `ory-auth` (2 Ory workspaces:
`ORY_WORKSPACE_API_KEY`, `ORY_WORKSPACE_ID`), all sourced from the VAULT secrets pipeline (#398).
Rotate the current `ory_wak_` key (README flags it as exposed) via
`infra/ory/scripts/rotate-workspace-key.sh`. Remove any hand-set empty workspace vars.
**Acceptance:** no secret is hand-typed into a TFC workspace; per-env values resolve from the
source-of-truth; old Ory key deleted.

## Variables & auth (source of truth)

| Variable | Category | Sensitive | Source of truth |
|---|---|---|---|
| `DESCOPE_MANAGEMENT_KEY` | env | yes | VAULT → `descope-auth` var set (per env) |
| GitHub token (github provider) | env | yes | VAULT → `descope-auth` var set |
| `descope_project_id` | terraform | no* | workspace var (dev = `P36PkOh8CsTfqzMjJlCjaeatp3xK`; prod = new) |
| `google/github_oauth_client_secret` | terraform | yes | VAULT, per env |
| `ORY_WORKSPACE_API_KEY` | env | yes | VAULT → `ory-auth` (per env; rotate current key) |
| `ORY_WORKSPACE_ID` | env | no | `ory-auth` (dev `1a710b61-…`; prod = new) |
| `environment` | terraform | no | workspace var (`dev`/`prod`) |
| SPA URIs, audience, token expirations, names | terraform | no | `environments/<env>.tfvars` in VCS |

\* not secret, but currently undeclared/uncommitted — TFCENV-3 makes it explicit.

## Manual / paid gates & risks

1. **Descope prod project** — may require a paid Descope plan for a 2nd project (TFCENV-5).
2. **Ory Production workspace** — paid, EU/PII-capable, **console-only** creation (TFCENV-6).
3. **Ory workspace key rotation** — current `ory_wak_` treated as exposed; rotate before wiring
   into TFC (TFCENV-7).
4. **GitHub Environments cutover** — repo-secret → environment-secret is the one place CI can
   break; coordinate the workflow `environment:` selection (TFCENV-2).
5. **VAULT dependency** — assumes #398 lands; if not, secrets fall back to sensitive per-env
   workspace vars but must **not** re-entrench hand-set empty vars.

## Deferred

- Convergence repos (`py-identity-model`, `identity-model`, `~/repos/gis`) getting their own Ory
  dev workspaces off `modules/ory-oidc-app` — not required for the dev/prod split.
- A distinct `staging` environment — add later as an extra module block / tfvars inside the dev
  workspace, not a 5th workspace.
