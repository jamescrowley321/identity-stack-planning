# [TFCENV-4] Ory root: TFC backend + migrate local state to dev

**Labels:** terraform, phase-6 · **Epic:** TFC-ENV · **Depends on:** none (pattern mirrors TFCENV-1)

## Context
`infra/ory/` has **no `cloud{}` block** — it runs on local state. Bring it under Terraform Cloud
without recreating the live dev Ory project (`identity-stack-dev` in Ory workspace `auth-stack`).

## Tasks
- [ ] Add `cloud { organization = "jamescrowley321"; workspaces { tags = ["identity-stack","ory"] } }`
      to `infra/ory/versions.tf`.
- [ ] Create the `identity-stack-ory-dev` TFC workspace (tagged).
- [ ] Set `ORY_WORKSPACE_API_KEY` (sensitive) + `ORY_WORKSPACE_ID` as workspace env vars.
- [ ] `terraform init -migrate-state` to upload the existing local state.
- [ ] Back up then remove the local `terraform.tfstate*`; confirm `.gitignore` still excludes state.

## Acceptance
- `terraform plan -var-file=environments/dev.tfvars` → **0 changes** (adoption, not recreation).

## Rollback
Restore the local state backup; revert `versions.tf`.
