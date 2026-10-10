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

**GitHub tracking:** identity-model [#843](https://github.com/jamescrowley321/identity-model/issues/843) (epic) with stories #844–#850 (COG-1 … COG-7).

## Why

The main user of identity-model runs on AWS Cognito, and no CI job runs against it. Cognito
behaves differently from the providers we test (Descope, Ory, Keycloak, node-oidc), and the
differences hit exactly the checks discovery enforces:

- **Endpoints on a different host than the issuer.** Authorize, token, userInfo and revoke live on
  the user-pool domain (`<prefix>.auth.<region>.amazoncognito.com` or a custom domain); the issuer
  and JWKS live on `cognito-idp.<region>.amazonaws.com/<poolId>`
  ([federation endpoints](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html)).
- **Discovery only on the `cognito-idp` host.** Discovery is served at
  `https://cognito-idp.<region>.amazonaws.com/<poolId>/.well-known/openid-configuration`, and its
  `issuer` is that base, so it passes a strict OIDC Discovery §4.3 match. Prefix and custom domains
  serve no discovery document. With a custom domain, the endpoint URLs *inside* the document point
  to the custom domain
  ([custom domain](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html)).
  Discovery-URL endpoint authority checks therefore see endpoints on a foreign host.
- **Updated issuer type.** `https://issuer-cognito-idp.<region>.amazonaws.com/<poolId>` changes
  token `iss`; a replica-Region discovery URL returns the primary-Region issuer
  ([aws-jwt-verify#282](https://github.com/awslabs/aws-jwt-verify/issues/282)).
- **Client-credentials access tokens have no `aud`** (`client_id` + `token_use` instead).

Docs and issue trackers settle the discovery location; a real pool is still needed to record the
document shapes (custom-domain endpoints, updated issuer type) as evidence rather than inference.
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
4. Confirm the main Cognito user's discovery address is the `cognito-idp` form, and whether the
   pool uses the updated issuer type or multi-Region replication.

## Stories

| ID | Story | Depends on |
|---|---|---|
| COG-1 | Owner setup: AWS account, TFC workspace with AWS dynamic credentials (IAM role trust), custom-domain DNS + ACM cert | — |
| COG-2 | `infra/cognito` Terraform: pool with original issuer + prefix domain + resource server + M2M client + public client + test user; writes `COGNITO_*` GitHub Actions + Dependabot secrets | COG-1 |
| COG-3 | Custom domain on the pool; record the live `cognito-idp` discovery document (endpoints on the custom domain) as a committed fixture, and confirm the prefix and custom domains serve no discovery document | COG-2 |
| COG-4 | Second pool on the updated issuer type (`awscc` / CloudFormation `IssuerConfiguration` if `hashicorp/aws` lacks it) | COG-2 |
| COG-5 | Python live integration: `make test-integration-cognito`, `integration-tests-cognito` CI job (build + nightly), `provider_matrix` row, Cognito scenario tests (discovery per URL form, endpoint authority, CC token without `aud`, id_token via `InitiateAuth`, expired token) | COG-2 |
| COG-6 | Go and Rust live integration against the same pools. Both already enforce the strict issuer match; this proves it and endpoint authority against custom-domain endpoints | COG-3 |
| COG-7 | Decide and implement discovery issuer-match behaviour in all three languages from COG-3/COG-4 evidence (strict, caller-supplied expected issuer, or opt-in); unblock or rework #842; update `spec/capabilities.md` and add the custom-domain endpoint document shape as a spec vector | COG-3, COG-4, COG-5, COG-6 |

## Acceptance

- CI runs Python, Go and Rust against a real Cognito pool on build and nightly.
- The `cognito-idp` discovery documents (custom-domain endpoints, updated issuer type) are recorded
  from a live pool, not inferred.
- The discovery issuer-match rule is the same in all three languages and passes every Cognito
  configuration the main user can have, or the break is an explicit, documented decision.

## Risks

- **Updated issuer type + multi-Region replication**: a replica's discovery returns the primary
  Region's issuer (aws-jwt-verify#282), which a strict match rejects. COG-4 covers the issuer type;
  replication is out of scope (paid plan + KMS).
- `hashicorp/aws` may not expose the issuer type: COG-4 falls back to `awscc`/CloudFormation.
- M2M token cost if runs go unbounded: cache per session, gate to build and nightly.
