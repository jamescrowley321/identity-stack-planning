---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'CIBA'
epic_title: 'OpenID Connect Client-Initiated Backchannel Authentication (CIBA Core 1.0) — client support in Python, Go and Rust'
date: '2026-10-28'
---

# Epic CIBA: Client-Initiated Backchannel Authentication

Tracking issue: [identity-model#217](https://github.com/jamescrowley321/identity-model/issues/217) (open since 2026-03-24; to be promoted to the epic, with sub-issues per story below).

## Why

CIBA decouples the device that starts authentication (a call-centre agent, a POS terminal) from the device where the user authenticates (their phone). It is the basis of FAPI-CIBA and common in banking.

No language implements it. Python only defines constants: the `urn:openid:params:grant-type:ciba` grant type and the `backchannel_*` discovery field names (`py/src/py_identity_model/oidc_constants.py`). `spec/capabilities.md` marks CIBA `planned` everywhere.

## Scope

The client (RP) side: send the backchannel authentication request, then get the result by poll, ping or push. All three languages per story, one commit per language, shared `spec/vectors` cases.

Out of scope: the OP side (consent, §8), and serving the client notification endpoint as an HTTP server. The library provides framework-agnostic validators the caller wires into their own endpoint. FastAPI wiring may follow as a separate story.

## Spec map (CIBA Core 1.0)

| Section | Topic |
|---|---|
| §4 | Discovery metadata (`backchannel_authentication_endpoint`, `backchannel_token_delivery_modes_supported`, `backchannel_authentication_request_signing_alg_values_supported`, `backchannel_user_code_parameter_supported`) and client registration metadata |
| §5 | Poll, ping and push modes |
| §7.1 | Authentication request; exactly one of `login_hint_token`, `id_token_hint`, `login_hint`; `binding_message`, `user_code`, `requested_expiry`, `client_notification_token` |
| §7.1.1 | Signed authentication request |
| §7.3, §7.4 | Acknowledgement (`auth_req_id`, `expires_in`, `interval`) and its validation |
| §9 | Client notification endpoint (bearer `client_notification_token`) |
| §10.1, §10.1.1 | Token request with the CIBA grant; successful response |
| §10.2 | Ping callback |
| §10.3, §10.3.1 | Push callback; token delivery, ID Token `urn:openid:params:jwt:claim:auth_req_id`, `at_hash`, `urn:openid:params:jwt:claim:rt_hash` |
| §11 | Token errors (`authorization_pending`, `slow_down`, `expired_token`, `access_denied`, …) |
| §12 | Push error payload |
| §13 | Authentication error response |

## Stories

| # | Story | Languages | Depends on |
|---|---|---|---|
| CIBA-1 | **Metadata.** Typed discovery fields (§4) with delivery modes as an enum; DCR carries the CIBA client metadata. | py, go, rust | DCR parity for go/rust |
| CIBA-2 | **Authentication request.** Builder enforcing exactly one hint (§7.1), optional `binding_message`/`user_code`/`requested_expiry`, `client_notification_token` required for ping/push. Sent with the configured client auth. Acknowledgement parsed and validated (§7.3, §7.4); §13 errors typed. | py, go, rust | CIBA-1; client auth (private_key_jwt/mTLS) parity for go/rust |
| CIBA-3 | **Signed authentication request** (§7.1.1). Request object signed with the client key; alg checked against the advertised list. | py, go, rust | CIBA-2; JAR signing parity for go/rust |
| CIBA-4 | **Poll mode.** Token request with the CIBA grant (§10.1). Poller honours `interval` (default 5 s when absent, §7.3), adds at least 5 s on `slow_down` for all later requests (§11), stops on `expired_token`/`access_denied`/`expires_in` (§11). Sync + async in Python. Injectable clock/sleep so tests don't sleep (see the mocked-sleep hang trap). ID Token validated with the existing ID-token validator. | py, go, rust | CIBA-2 |
| CIBA-5 | **Ping mode.** Validator for the ping callback (§10.2): bearer token equals `client_notification_token` (constant-time), body carries the expected `auth_req_id`; then one token request. | py, go, rust | CIBA-4 |
| CIBA-6 | **Push mode.** Validator for the push payload (§10.3.1): notification-token check, ID Token with `auth_req_id` claim matching, `at_hash` and `rt_hash` verified; push error payload typed (§12). | py, go, rust | CIBA-4 |
| CIBA-7 | **Integration + docs.** Live tests against node-oidc-provider with CIBA enabled (`infra/` fixture change), an example per language, capability-matrix row flipped by the runners. | py, go, rust, infra | CIBA-1..6 |

## Test provider

node-oidc-provider has a `ciba` feature (poll and ping). It does not do push, so CIBA-6 is proven with data vectors only unless another fixture supports it. Verify against the pinned `infra/node-oidc-provider` version before CIBA-7.

## Owner decisions (open)

1. **When.** After the Go/Rust parity loop (CIBA needs private_key_jwt/mTLS, JAR and DCR in Go/Rust), or Python-first?
2. **Push mode.** FAPI-CIBA forbids push, and the fixture can't exercise it. Ship push (data-vector-proven), or poll + ping only?
3. **Certification.** Pursue OIDF certification for the CIBA/FAPI-CIBA RP profile (needs a hosted conformance plan), or library support only?
4. **FastAPI.** Notification-endpoint router in `fastapi-identity-model`, or leave wiring to callers?
5. **Release.** Additive → py 5.x minor.
