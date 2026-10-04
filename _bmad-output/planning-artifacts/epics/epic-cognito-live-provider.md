---
workflowType: 'epic'
project_name: 'identity-stack-planning'
epic_id: 'COG'
epic_title: 'AWS Cognito as a live identity-model test provider'
date: '2026-10-03'
status: 'proposed'
dependencies:
  - identity-model/infra/descope (pattern for Terraform-provisioned provider + CI secrets)
  - identity-model#842 (Python discovery issuer match — held on this epic)
  - identity-model#574 (cross-language gaps; item 3 = issuer match)
---

# Epic COG: AWS Cognito as a live identity-model test provider

## Why

The main user of identity-model runs on AWS Cognito, and no CI job runs against it. Cognito
behaves differently from the providers we test (Descope, Ory, Keycloak, node-oidc), and the
differences hit exactly the checks discovery enforces:

- **Endpoints on a different host than the issuer.** Authorize, token, userInfo and revoke live on
  the user-pool domain (`<prefix>.auth.<region>.amazoncognito.com` or a custom domain); the issuer
  and JWKS live on `cognito-idp.<region>.amazonaws.com/<poolId>`
  ([federation endpoints](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html)).
- **Discovery on a custom domain.** "Amazon Cognito only serves the
  `/.well-known/openid-configuration` endpoint for the *custom* domain"
  ([custom domain](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html)).
  The `issuer` in that document is undocumented. If it is the `cognito-idp` issuer, a strict
  OIDC Discovery §4.3 check rejects it: Go and Rust already do, and #842 would make Python do so too.
- **Updated issuer type.** `https://issuer-cognito-idp.<region>.amazonaws.com/<poolId>` changes
  token `iss`; a replica-Region discovery URL returns the primary-Region issuer
  ([aws-jwt-verify#282](https://github.com/awslabs/aws-jwt-verify/issues/282)).
- **Client-credentials access tokens have no `aud`** (`client_id` + `token_use` instead).

Docs and issue trackers cannot settle the custom-domain question; only a real pool can.
Emulators (LocalStack, moto, cognito-local) reproduce none of the above, so they are out of scope.

## Constraints

- No probing of third-party pools. Tests run only against pools in the owner's AWS account.
- Test jobs need no AWS credentials: discovery, JWKS, `/oauth2/token` and `InitiateAuth` are public.
  Only Terraform needs AWS access, via TFC dynamic credentials (no long-lived keys).
- M2M tokens are billed ($2.25 per 1,000, no free tier): mint once per session, run on build and
  nightly only, like Descope.
- Do not break the Cognito user. No discovery behaviour change ships until COG-7 decides it from
  live evidence.

## Owner decisions needed (COG-1)

1. AWS account (or sub-account) to host the pools.
2. A domain James controls for the custom domain (ACM cert in us-east-1, parent A record, alias to
   CloudFront).
3. TFC workspace name (proposed `identity-model-cognito`).
4. How the main Cognito user configures discovery today (cognito-idp URL or custom domain), if
   known. It decides how urgent COG-6 is.

## Stories

| ID | Story | Depends on |
|---|---|---|
| COG-1 | Owner setup: AWS account, TFC workspace with AWS dynamic credentials (IAM role trust), custom-domain DNS + ACM cert | — |
| COG-2 | `infra/cognito` Terraform: pool with original issuer + prefix domain + resource server + M2M client + public client + test user; writes `COGNITO_*` GitHub Actions + Dependabot secrets | COG-1 |
| COG-3 | Custom domain on the pool; record the live discovery documents (custom domain and `cognito-idp`) as committed fixtures, answering what `issuer` the custom domain serves | COG-2 |
| COG-4 | Second pool on the updated issuer type (`awscc` / CloudFormation `IssuerConfiguration` if `hashicorp/aws` lacks it) | COG-2 |
| COG-5 | Python live integration: `make test-integration-cognito`, `integration-tests-cognito` CI job (build + nightly), `provider_matrix` row, Cognito scenario tests (discovery per URL form, endpoint authority, CC token without `aud`, id_token via `InitiateAuth`, expired token) | COG-2 |
| COG-6 | Go and Rust live integration against the same pools. Both already enforce the strict issuer match, so this is where an existing custom-domain break would show | COG-3 |
| COG-7 | Decide and implement discovery issuer-match behaviour in all three languages from COG-3/COG-4 evidence (strict, caller-supplied expected issuer, or opt-in); unblock or rework #842; update `spec/capabilities.md` and add the custom-domain document shape as a spec vector | COG-3, COG-4, COG-5, COG-6 |

## Acceptance

- CI runs Python, Go and Rust against a real Cognito pool on build and nightly.
- The custom-domain discovery `issuer` is recorded from a live pool, not inferred.
- The discovery issuer-match rule is the same in all three languages and passes every Cognito
  configuration the main user can have, or the break is an explicit, documented decision.

## Risks

- **Go/Rust may already reject custom-domain discovery** (strict since before py-v4.1.0).
  COG-6 confirms or rules it out.
- `hashicorp/aws` may not expose the issuer type: COG-4 falls back to `awscc`/CloudFormation.
- M2M token cost if runs go unbounded: cache per session, gate to build and nightly.
