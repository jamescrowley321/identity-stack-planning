# [TFCENV-2] GitHub Environments + `environment` variable (fix CI-secret stomp)

**Labels:** terraform, phase-6 · **Epic:** TFC-ENV · **Depends on:** TFCENV-1

## Context
`infra/github.tf` writes **repo-level** GitHub Actions secrets to a single repo
(`var.github_repository`). With two environments, dev and prod would overwrite each other's
`DESCOPE_PROJECT_ID`, `DESCOPE_CLIENT_SECRET`, etc. Fix by scoping secrets to GitHub Environments.

## Tasks
- [ ] Add `variable "environment"` (allowed `dev`/`prod`).
- [ ] Add `github_repository_environment` resources for `dev` and `prod`.
- [ ] Convert each `github_actions_secret` → `github_actions_environment_secret` keyed by
      `environment = var.environment`.
- [ ] Update the identity-stack CI workflow(s) to select `environment: dev|prod` on jobs that read
      these secrets.

## Acceptance
- dev CI reads env-scoped secrets under environment `dev`; no repo-level Descope secrets remain.
- Plan on dev shows the intended repo-secret → env-secret migration and nothing else.

## Notes
This is the one cutover that can break CI — coordinate the workflow `environment:` change with the apply.
