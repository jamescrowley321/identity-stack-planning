# [TFCENV-5] Descope prod: project + `identity-stack-prod` workspace

**Labels:** terraform, phase-6 · **Epic:** TFC-ENV · **Depends on:** TFCENV-1, TFCENV-3

## Gate
Confirm the Descope tier allows a **second project** (may require a paid plan) before starting.

## Context
The `descope` provider is project-scoped (`project_id = var.descope_project_id`), so prod is a
separate Descope project with its own id, in its own TFC workspace.

## Tasks
- [ ] Create the prod Descope project (Console or `descope_project`), capture its project id.
- [ ] Create the `identity-stack-prod` TFC workspace (tags `identity-stack`,`descope`), **manual apply**.
- [ ] Set per-env workspace vars: `descope_project_id` = prod id, `environment = prod`,
      `descope_project_name = "identity-stack"`.
- [ ] Apply from `environments/prod.tfvars`; confirm `prevent_destroy` (TFCENV-3) is live.

## Acceptance
- Prod Descope project + access keys / FGA / RBAC / tenants created.
- Prod GitHub `prod` environment secrets populated (via TFCENV-2).
- `identity-stack-prod` is manual-apply.
