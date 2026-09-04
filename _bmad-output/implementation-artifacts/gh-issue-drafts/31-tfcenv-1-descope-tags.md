# [TFCENV-1] Descope root: tag-based TFC workspaces (no rename)

**Labels:** terraform, phase-6 · **Epic:** TFC-ENV · **Depends on:** none

## Context
`infra/main.tf` pins `cloud { workspaces { name = "identity-stack-dev" } }`. Moving to a per-env
model needs tag-based selection so one config maps to dev + prod — without renaming the existing
workspace or moving its state.

## Tasks
- [ ] Change `infra/main.tf` `cloud{}` to `workspaces { tags = ["identity-stack", "descope"] }`.
- [ ] Add tags `identity-stack` + `descope` to the existing `identity-stack-dev` workspace in TFC.
- [ ] `terraform init` and confirm it reattaches to the same workspace (no new workspace, no state move).

## Acceptance
- `TF_WORKSPACE=identity-stack-dev terraform plan -var-file=environments/dev.tfvars` → **0 changes**.
- Workspace name, state, and VCS connection unchanged.

## Rollback
Revert the cloud block to `name = "identity-stack-dev"`; leftover tags are harmless.
