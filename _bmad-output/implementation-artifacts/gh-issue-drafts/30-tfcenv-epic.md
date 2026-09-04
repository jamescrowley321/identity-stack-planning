# [TFC-ENV] Epic: dev + prod environments across identity-stack stacks (Descope + Ory)

**Labels:** epic, terraform, phase-6
**Planning:** `_bmad-output/planning-artifacts/epics-tfc-environments.md` (identity-stack-planning)
**Companion epic:** VAULT — secrets → HCP Vault Secrets migration (#398)

## Goal

Establish isolated **dev** and **prod** environments in **Terraform Cloud** (org
`jamescrowley321`) for the two deployable Terraform roots in this repo:

- **Descope stack** — `infra/*.tf` (workspace `identity-stack-dev` today)
- **Ory stack** — `infra/ory/` (local state today)

Environment names are **`dev`/`prod`** so the existing `identity-stack-dev` workspace and
`environments/dev.tfvars` are **kept — no renames**. Tag-based workspace selection is achieved by
*adding tags* to the existing workspace.

## Target topology (4 TFC workspaces)

| Workspace | Stack | Env | Notes |
|---|---|---|---|
| `identity-stack-dev` (kept, tagged) | Descope | dev | tags `identity-stack`,`descope` |
| `identity-stack-prod` (new) | Descope | prod | new Descope project, manual apply |
| `identity-stack-ory-dev` (new) | Ory | dev | adopts current local state |
| `identity-stack-ory-prod` (new) | Ory | prod | paid Ory Production workspace, manual apply |

## Stories (one PR each)

- [ ] TFCENV-1 — Descope root: tag-based TFC workspaces (no rename)
- [ ] TFCENV-2 — GitHub Environments + `environment` variable (fix CI-secret stomp)
- [ ] TFCENV-3 — Declare `descope_project_id` + destroy/empty-secret guardrails
- [ ] TFCENV-4 — Ory root: TFC backend + migrate local state to dev
- [ ] TFCENV-5 — Descope prod: project + `identity-stack-prod` workspace
- [ ] TFCENV-6 — Ory prod: paid Production workspace + `identity-stack-ory-prod`
- [ ] TFCENV-7 — Wire TFC variable sets to secrets source-of-truth + rotate keys

**Order:** 1 → (2,3,4 parallel) → (5 needs 1+3; 6 needs 4's pattern) → 7 aligns with #398.

## Manual / paid gates

1. Descope prod project may need a paid Descope plan (TFCENV-5).
2. Ory Production workspace is paid + **console-only** to create (TFCENV-6).
3. Rotate the exposed `ory_wak_` key before wiring to TFC (TFCENV-7).
4. GitHub Environments cutover is the one place CI can break (TFCENV-2).
5. Depends on/aligns with the VAULT secrets pipeline (#398).
