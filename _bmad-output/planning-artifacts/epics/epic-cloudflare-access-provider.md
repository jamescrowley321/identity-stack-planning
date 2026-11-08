---
workflowType: 'epic'
project_name: 'identity-stack-planning'
epic_title: 'Cloudflare Access as an OIDC provider, and Workers as a runtime'
date: '2026-10-29'
dependencies:
  - identity-model/infra/descope (pattern for a Terraform-provisioned provider + CI secrets)
  - identity-stack/infra/ory (pattern for a per-provider Terraform root)
  - identity-stack#377 (provider-agnostic frontend)
---

# Epic: Cloudflare Access as an OIDC provider, and Workers as a runtime

**GitHub tracking:**

- identity-model [#1033](https://github.com/jamescrowley321/identity-model/issues/1033) (epic), stories #1034–#1038
- identity-stack [#531](https://github.com/jamescrowley321/identity-stack/issues/531) (epic), stories #532–#535

## Why

The free-tier deployment idea in [`docs/ideas.md`](../../../docs/ideas.md) got an answer on
2026-10-29: **Cloudflare only.** Supabase is dropped. The first consumer is the owner's own app,
which is private and so not named here. It moves to Cloudflare hosting and **dogfoods this stack
for auth**:

- the SPA logs in against an OIDC provider;
- a Worker in front of the app verifies tokens with identity-model.

The provider requirement is "OIDC-compliant," nothing more. Cloudflare Access can do this through
**Access for SaaS**, a generic OIDC application, which keeps the whole deployment on one vendor.
That gives both tracks a real job:

- **Track 1:** a provider and a runtime that identity-model has never been tested against.
- **Track 2:** a third configured provider, testing the claim in
  `identity-stack/backend/app/middleware/providers.py` that adding one is "configuration, not new
  validation code."

The tracks still don't gate each other. Track 2 can use recorded fixtures until Track 1's live
app exists.

## Evidence

Read from the
[generic OIDC SaaS docs](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/saas-apps/generic-oidc-saas/)
on 2026-10-29. Nothing has been measured against a live app yet.

| Claim | What the docs say | Settled by |
|---|---|---|
| Issuer | Per client: `https://<team>.cloudflareaccess.com/cdn-cgi/access/sso/oidc/<client-id>`. Discovery, `jwks`, `authorization`, `token` and `userinfo` sit beneath it | identity-model#1036 |
| PKCE | Optional, set per app | — |
| Refresh tokens | Supported; not in hybrid or implicit flows | identity-model#1038 |
| Signing algorithm | Not stated | identity-model#1036 |
| `end_session_endpoint`, revocation, introspection | Not stated | identity-model#1036 |
| Machine-to-machine grant | None described; logins are browser-only | identity-model#1038 |
| Claims | `openid`, `email`, `profile`, `groups`, plus custom claims mapped from the upstream login method | identity-model#1036 |
| Free plan includes a generic OIDC app | Not stated. The Zero Trust free plan is ≤50 seats per Cloudflare's pricing page | identity-model#1034 (owner, in dashboard) |
| Workers can verify a token within the free plan's 10 ms CPU | Unmeasured. RSA verification takes a few ms natively; WebAssembly and Pyodide are slower | identity-model#1037 |

## Constraints

- **Free plan only.** That means Zero Trust free (≤50 seats) and the Workers free plan (10 ms CPU
  per invocation). A design that needs a paid tier is a finding, not a plan.
- **Terraform is the source of truth.** Cloudflare credentials live in HCP Terraform workspace
  variables, following the variable-set decision in [`roadmap.md`](../../../docs/roadmap.md)
  Track 3.
- **No probing of other people's Access teams.** Tests run only against the owner's organization.
- **No behaviour change from recorded facts alone.** If the live documents show identity-model
  needs to change (issuer matching, for example), that becomes its own issue.

## Owner decisions needed (identity-model#1034)

1. A Zero Trust organization, and its team name.
2. Confirmation in the dashboard that the free plan allows a generic OIDC app.
3. A login method. One-time PIN is built in; GitHub or Google also work.
4. The HCP Terraform workspace name (proposed `identity-model-cloudflare`) and a scoped API token.

## Stories

### identity-model

| Issue | Story | Depends on |
|---|---|---|
| #1034 | Owner setup: Zero Trust org, free-plan check, login method, HCP Terraform workspace + token | — |
| #1035 | `infra/cloudflare` Terraform: Access OIDC app (PKCE, refresh), allow policy, CI secrets | #1034 |
| #1036 | Record live discovery + JWKS fixtures; run discovery in Python, Go and Rust; answer the open rows above | #1035 |
| #1037 | Spike: verify an Access token in a Worker within 10 ms CPU (Rust→wasm via `workers-rs` vs Pyodide); dated write-up + follow-up issue | — (fixture is enough) |
| #1038 | Decide how CI gets a token without a browser login | #1035 |

### identity-stack

| Issue | Story | Depends on |
|---|---|---|
| #532 | `infra/cloudflare/` Terraform root for the SPA's Access OIDC app | identity-model#1034 |
| #533 | Backend `ProviderTokenConfig` for Access; `groups` → canonical roles; logout behaviour | identity-model#1036 (fixtures) |
| #534 | Frontend: log in, refresh and log out against Access via `VITE_OIDC_*` | identity-stack#377, #532 |
| #535 | End-to-end proof against live Access | #533, #534 |

## Acceptance

- Python, Go and Rust discovery and JWKS pass against a live Access app on build and nightly.
- The live documents are committed as fixtures.
- #1037 has produced numbers for cold and warm verification inside a Worker, and a filed
  follow-up for the path that fits. If neither fits, the write-up says so.
- identity-stack logs in, resolves `/api/identity` and logs out against Access from
  Terraform-managed config, with no Access-specific frontend code.

## Out of scope

- Deploying identity-stack itself to Cloudflare. It stays a proving ground (see
  [`roadmap.md`](../../../docs/roadmap.md) Track 2). That would be a new goal.
- A storage adapter for the canonical identity store on D1. Nothing here needs it.
- The consumer app's own integration. It lives in that app's repository.
