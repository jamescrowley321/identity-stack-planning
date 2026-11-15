# Epic: identity-model py 5.0.0 — Conformance Coverage (Phase D3)

**Source:** `sprint-change-proposal-2026-11-15.md`. **GitHub:** [identity-model#904](https://github.com/jamescrowley321/identity-model/issues/904) (sub-issues listed below). **Blocks:** the first alpha, [identity-model#1149](https://github.com/jamescrowley321/identity-model/issues/1149) `5.0.0a1` (amendment 2026-11-15), and so also [identity-model#915](https://github.com/jamescrowley321/identity-model/pull/915) (5.0.0 final).
**Loop:** `ralph-prompts/identity-model-v5-conformance.md`, stacked on `release/v5`.

## Overview

Every OIDF RP test plan that applies to a feature py-identity-model 5.0.0 ships runs in CI against suite `release-v5.3.4`, blocks on failure, and requires each negative module to fail for a specific, typed reason that the library produced. Python and fastapi only; Go/Rust harnesses are [#1145](https://github.com/jamescrowley321/identity-model/issues/1145) in Epic 26.

Status lives in the GitHub issues. The issue's acceptance criteria win over this file.

## Shared rules

- A negative module passes only when the harness records the expected typed reason in `conformance/expected_modules.json`. A generic class (`id_token_validation`, `discovery_failed`) is never enough once a typed kind exists.
- The library performs every check. The harness never re-implements a check the library offers (nonce, `iss`, `sub`, `at_hash`).
- Every new plan has a make target, a blocking CI step, a manifest, and an expected-module count check.
- A plan that needs an unavailable precondition fails loudly. It never skips silently.

## Story D3.1: The library's nonce check is what the suite tests — [#1138](https://github.com/jamescrowley321/identity-model/issues/1138)

**Given** the harness passes the session nonce to `validate_id_token`, **when** a nonce-invalid or nonce-missing module runs, **then** the run records a `nonce` rejection that the manifest requires; and with the library's nonce comparison removed, those modules turn red.

## Story D3.2: Typed rejection reasons — [#1131](https://github.com/jamescrowley321/identity-model/issues/1131) (Python part)

**Given** `TokenValidationException` carries a typed kind (iss, aud, exp/iat, signature, key selection, alg, nonce, at_hash/c_hash) and the fastapi router exposes the discovery failure kind, **when** each negative module in basic, config, form-post, FAPI2 and their fastapi variants runs, **then** its manifest entry names one kind, and a rejection of another kind fails the run.

## Story D3.3: Dynamic and logout plans work on 5.0 — [#1139](https://github.com/jamescrowley321/identity-model/issues/1139)

**Given** suite 5.3.4 and `release/v5`, **when** the dynamic, RP-initiated logout and back-channel logout plans run, **then**:
- they pass with fresh evidence;
- `rp-init-logout-no-state` sends `state` as the suite requires, and runs;
- `dynamic-registration` and `request-uri-signed-none` have real evidence or a justified allowlist entry;
- the 2026-08-02 evidence files are gone.

## Story D3.4: Dynamic and logout plans block CI — [#607](https://github.com/jamescrowley321/identity-model/issues/607), [#473](https://github.com/jamescrowley321/identity-model/issues/473)

**Given** D3.3, **when** a PR into `release/v5` or `main` runs CI, **then** the three plans run (fastapi too, where the router supports the flow), a failure blocks the job, and the release gate requires them.

## Story D3.5: One owner per evidence file — [#1082](https://github.com/jamescrowley321/identity-model/issues/1082)

**Given** many plans write `conformance/results/*-latest.json`, **when** CI uploads artifacts, **then** each file is produced and uploaded by exactly one job, and no job uploads committed evidence as its own.

## Story D3.6: Every client auth method, and the Comprehensive plan — [#1141](https://github.com/jamescrowley321/identity-model/issues/1141)

**Given** the client auth methods in `core/client_auth_method.py`, **when** CI runs, **then** the Config plan runs once per method the suite supports (client_secret_basic, client_secret_post, private_key_jwt, tls_client_auth, self_signed_tls_client_auth), and `oidcc-client-test-plan` runs with a full manifest.

## Story D3.7: Remaining FAPI 2.0 variants — [#1142](https://github.com/jamescrowley321/identity-model/issues/1142)

**Given** the library's FAPI2 client surface, **when** CI runs, **then** these combinations run with manifests:
- SP: private_key_jwt + mTLS-bound; mTLS + DPoP;
- MS: JAR without JARM; JARM without JAR; mTLS-bound;
- `plain_oauth`;
- `fapi_client_credentials_grant`, if the suite offers client modules for it on 5.3.4. If it doesn't, record that on the issue.

## Story D3.8: Hybrid and implicit plans — [#1143](https://github.com/jamescrowley321/identity-model/issues/1143)

**Given** fragment-response parsing and `at_hash`/`c_hash` validation ship, **when** CI runs, **then** the hybrid, implicit, formpost-hybrid and formpost-implicit certification plans pass, and their `at_hash`/`c_hash` negatives require the typed kind from D3.2.

## Story D3.9: Refreshed ID token continuity — [#1144](https://github.com/jamescrowley321/identity-model/issues/1144)

**Given** OIDC Core §12.2, **when** a refresh response carries an ID token, **then**:
- the library rejects it with a typed error if `iss` or `sub` differ from the original ID token, or `aud` lacks the client;
- the refresh-token RP plan runs in CI, and its invalid-issuer and invalid-sub modules require that error.

## Story D3.10: FAPI2 invalid-alternate-alg — [#880](https://github.com/jamescrowley321/identity-model/issues/880)

**Given** D3.2, **when** `fapi2-…-invalid-alternate-alg` runs, **then** it is rejected with the alg kind. The issue is closed with the evidence.

## Owner tasks — [#1140](https://github.com/jamescrowley321/identity-model/issues/1140)

- Merge the eight open fix PRs (#1121, #1124, #1126, #1128, #1129, #1130, #1132, #1136) into `release/v5`. This is a loop precondition.
- oss-admin: make `conformance-fapi2` and the new plan checks required on main; protect `release/v5`.
- After the queue empties: run the hosted Basic / Config / Form Post suite on `release/v5` with `publish=none`, and check the rp-logs reasons.
