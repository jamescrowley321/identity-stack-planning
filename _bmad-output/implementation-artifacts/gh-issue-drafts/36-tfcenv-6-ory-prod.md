# [TFCENV-6] Ory prod: paid Production workspace + `identity-stack-ory-prod`

**Labels:** terraform, phase-6 · **Epic:** TFC-ENV · **Depends on:** TFCENV-4 (pattern)

## Gate (paid, console-only)
Create a **paid Ory Production workspace** in the Ory Console — `ory_workspace` cannot be
Terraform-created. Develop/free tier forbids PII and Organizations, so prod real users require the
paid tier. Capture the new workspace id + a fresh workspace API key.

## Context
Prod is a separate Ory project (separate SPA client, issuer, discovery) in the paid workspace.
Ory identity schemas / API-key values / secrets are create-only (no import) — treat prod as
greenfield.

## Tasks
- [ ] Create the paid Ory Production workspace (Console); capture id + fresh `ory_wak_` key.
- [ ] Create the `identity-stack-ory-prod` TFC workspace (tags `identity-stack`,`ory`), **manual apply**.
- [ ] Set prod `ORY_WORKSPACE_ID` / `ORY_WORKSPACE_API_KEY` overrides on that workspace.
- [ ] Add a prod `modules/ory-oidc-app` instantiation: prod redirect/post-logout URIs, real
      audience, `enable_organizations` per tier.
- [ ] Apply; capture issuer + discovery for backend/frontend prod config.

## Acceptance
- Prod Ory project + SPA client created; issuer/discovery recorded.
- `identity-stack-ory-prod` is manual-apply.
