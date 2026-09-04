# [TFCENV-7] Wire TFC variable sets to secrets source-of-truth + rotate keys

**Labels:** terraform, phase-6, security · **Epic:** TFC-ENV · **Aligns with:** VAULT (#398)

## Context
Provider auth is hand-set today. Consolidate it into TFC variable sets sourced from the single
secrets source-of-truth the VAULT epic (#398) establishes, and rotate the exposed Ory key.

## Tasks
- [ ] Create variable set `auth-org-common` → all 4 workspaces (Vault link, org-wide settings).
- [ ] Create variable set `descope-auth` → the 2 Descope workspaces: `DESCOPE_MANAGEMENT_KEY`
      (env, sensitive) + GitHub token.
- [ ] Create variable set `ory-auth` → the 2 Ory workspaces: `ORY_WORKSPACE_API_KEY` (env,
      sensitive) + `ORY_WORKSPACE_ID`.
- [ ] Source all secret values from the VAULT pipeline (#398); remove hand-set empty workspace vars.
- [ ] Rotate the current exposed `ory_wak_` key via `infra/ory/scripts/rotate-workspace-key.sh`;
      delete the old key.

## Acceptance
- No secret is hand-typed into a TFC workspace; per-env values resolve from the source-of-truth.
- Old Ory workspace key deleted; new key authenticates.
