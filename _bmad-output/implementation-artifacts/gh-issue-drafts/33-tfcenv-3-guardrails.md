# [TFCENV-3] Declare `descope_project_id` + destroy/empty-secret guardrails

**Labels:** terraform, phase-6, security · **Epic:** TFC-ENV · **Depends on:** none

## Context
`descope_project_id` is referenced across `infra/*.tf` but **not declared** in `variables.tf`
(passed ad hoc via `TF_VAR_`). Nothing prevents an empty secret from being pushed, and the imported
Descope project has no destroy protection.

## Tasks
- [ ] Add `variable "descope_project_id"` with `validation { condition = length(var.descope_project_id) > 0 }`.
- [ ] Add the same non-empty `validation` to `descope_management_key` and other secret inputs.
- [ ] Add a `precondition` on the `github_actions_environment_secret` resources so a blank value
      fails the plan instead of clobbering a live secret with `""`.
- [ ] Add `lifecycle { prevent_destroy = true }` to `descope_project`.

## Acceptance
- An empty `descope_project_id` or `descope_management_key` fails `terraform plan`.
- `terraform plan -destroy` refuses to destroy `descope_project`.
