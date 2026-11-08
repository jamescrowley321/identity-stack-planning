---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'RAR'
epic_title: 'Rich Authorization Requests (RFC 9396) — client support in Python, Go and Rust'
date: '2026-10-28'
supersedes: 'epic-6-advanced-tier.md Story 6.2'
---

# Epic RAR: Rich Authorization Requests (RFC 9396)

Tracking issue: [identity-model#220](https://github.com/jamescrowley321/identity-model/issues/220) (open since 2026-03-24; to be promoted to the epic, with sub-issues per story below).

Supersedes Story 6.2 of `epic-6-advanced-tier.md`. That story cites the AS metadata as RFC 9396 §7. §7 is the Token Response; the metadata is defined in §10.

## Why

Scopes are flat strings. RAR adds `authorization_details`, a JSON array of typed objects (payment initiation, account access, document signing and so on). Open Banking/FAPI deployments rely on it, and it pairs with PAR, which all three languages will have once the Go/Rust parity work lands.

No language implements it today. Python has no `authorization_details` support (`spec/capabilities.md` marks RAR `planned` everywhere).

## Scope

Client (RP) side and resource-server helpers. All three languages per story: one commit per language (`feat(py)`, `feat(go)`, `feat(rust)`) so release routing sees each, and a shared `spec/vectors` case so parity is gated mechanically.

Out of scope: authorization-server behavior (comparing details on refresh, §6.1 is AS-side), JSON-Schema validation of type-specific fields (§11.3; callers own their types).

## Spec map (RFC 9396)

| Section | Topic |
|---|---|
| §2, §2.1, §2.2 | `authorization_details` parameter, `type`, common fields (`locations`, `actions`, `datatypes`, `identifier`, `privileges`) |
| §3, §3.1, §3.2 | Authorization request; relationship to `scope` and `resource` |
| §5 | `invalid_authorization_details` error |
| §6 | Token request carries `authorization_details` |
| §7, §7.1 | Token response returns (possibly enriched) `authorization_details` |
| §9.1, §9.2 | JWT access token claim and introspection member |
| §10 | AS metadata `authorization_details_types_supported`; client metadata `authorization_details_types` |
| §11.4 | Large requests: use PAR |

## Stories

| # | Story | Languages | Depends on |
|---|---|---|---|
| RAR-1 | **Model + serialization.** Typed `AuthorizationDetail` (required `type`, common §2.2 fields, extension fields preserved verbatim on round-trip). Reject an entry without `type` or a non-array value. Shared vectors: round-trip, extension fields, multiple entries, empty array, missing `type`. | py, go, rust | — |
| RAR-2 | **Discovery + registration metadata.** Parse `authorization_details_types_supported` (§10). DCR request/response carries `authorization_details_types`. Optional pre-flight: a request type not advertised → typed error, opt-in. | py, go, rust | RAR-1; DCR parity for go/rust |
| RAR-3 | **Authorization request + PAR.** Authorization URL and PAR body carry `authorization_details` (§3, §11.4). Under the FAPI 2.0 profile it goes through PAR only. | py, go, rust | RAR-1; PAR parity for go/rust |
| RAR-4 | **Token request + response.** `authorization_details` on auth-code, refresh, client-credentials and token-exchange requests (§6); parsed from the token response (§7, §7.1). `invalid_authorization_details` parsed as a typed OAuth error (§5, §6). | py, go, rust | RAR-1; typed OAuth errors (#791) |
| RAR-5 | **Resource-server side.** Read `authorization_details` from a validated JWT access token (§9.1) and from an introspection response (§9.2), typed. | py, go, rust | RAR-1 |
| RAR-6 | **Integration + docs.** Live test against node-oidc-provider with RAR enabled (fixture change in `infra/`), an example per language (payment initiation), capability-matrix row flipped by the vector runners. | py, go, rust, infra | RAR-1..5 |

## Test provider

node-oidc-provider has an experimental `richAuthorizationRequests` feature. Verify the version pinned in `infra/node-oidc-provider` supports it before RAR-6; if not, HTTP vectors against the mock OP cover RAR-3/4.

## Owner decisions (open)

1. **When.** After the Go/Rust parity loop (RAR-2/3 need DCR and PAR in Go/Rust), or Python-first now with Go/Rust ports folded into the parity loop?
2. **Release.** Additive → py 5.x minor. Confirm it does not need to ride 5.0.0.
3. **Pre-flight check (RAR-2).** Opt-in (default off, per the hardening rule) or skip it entirely?
4. **RS helpers (RAR-5).** In scope, or client-only first?
