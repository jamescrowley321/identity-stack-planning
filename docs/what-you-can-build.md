---
title: "What you can build with it"
sidebar_label: "What you can build"
description: "What identity-model actually lets you do, organised by the problem you are trying to solve, with the RFC behind each and where it is available today."
status: current
last_verified: 2026-09-16
---

# What you can build with it

Capability lists are written from the library's point of view. This page is written from
yours: what are you trying to do, what does it take, and can you do it today.

**Availability** is read from
[`spec/capabilities.md`](https://github.com/jamescrowley321/identity-model/blob/main/spec/capabilities.md),
which is the authoritative source. Python carries the full surface and is the certified
reference; Go and Rust carry core and most of the extended tier. Where a row says Python
only, that is a parity gap being closed, not a design decision.

Every capability below has a runnable example in
[`py/examples/`](https://github.com/jamescrowley321/identity-model/tree/main/py/examples).

---

## Sign a person in

The ordinary case, done correctly: authorization code with PKCE, the state and nonce
checks, and issuer validation on the response so a mixed-up-provider attack fails closed.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| Authorization code + PKCE | RFC 6749 §4.1, RFC 7636 | yes | yes | yes |
| ID token validation | OIDC Core §3.1.3.7, §3.3.2.11 | yes | yes | yes |
| UserInfo | OIDC Core §5.3 | yes | yes | yes |
| Refresh | RFC 6749 §6 | yes | planned | planned |
| Authorization-response `iss` | RFC 9207 | yes | planned | planned |

## Sign in where there is no browser

A CLI, a TV app, a headless box. The device authorization flow gives the user a code to
enter somewhere else while your process polls.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| Device authorization | RFC 8628 | yes | planned | planned |

## Validate a token in your API

Discovery, JWKS retrieval with caching, signature and claim validation — and the pieces
people usually get wrong: algorithm confusion, audience, clock skew, issuer mismatch.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| Discovery | OIDC Discovery 1.0 §3–4 | yes | yes | yes |
| JWKS retrieval + caching | RFC 7517, RFC 7518 | yes | yes | yes |
| JWT validation | RFC 7519, RFC 7515 | yes | yes | yes |
| Injectable claims validators | your own rules, at the right layer | yes | yes | yes |
| Token introspection | RFC 7662 | yes | yes | yes |

For FastAPI there is a middleware package built on top of the library —
[`fastapi-identity-model`](https://github.com/jamescrowley321/identity-model/tree/main/py/packages/fastapi-identity-model)
— so route protection is a dependency rather than hand-rolled.

## Make a stolen token useless

A bearer token is a bearer token: whoever holds it, wins. Sender-constrained tokens bind
the token to a key the client proves it holds, so a token lifted from a log or a proxy is
worthless without the key.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| DPoP — proof-of-possession at the application layer | RFC 9449 | yes | yes | planned |
| mTLS + certificate-bound tokens | RFC 8705 | yes | planned | planned |

## Call another service as the user

Service-to-service calls that preserve who the original subject was, instead of every
internal hop running as one omnipotent service account.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| Token exchange | RFC 8693 | yes | yes | yes |

## Harden the request itself

Stop the authorization request being readable or tamperable in the front channel: push it
to the provider over a back channel, sign it, and take the response signed too.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| Pushed authorization requests | RFC 9126 | yes | planned | planned |
| Signed request objects | RFC 9101 | yes | planned | planned |
| Signed authorization responses | OpenID JARM | yes | planned | planned |
| `private_key_jwt` client authentication | RFC 7523 | yes | planned | planned |

## Meet a regulated profile

Where a bank, an insurer, or a regulator sets the bar, FAPI 2.0 is usually the bar. The
library ships the request and configuration validators rather than leaving you to read
the profile and hope.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| FAPI 2.0 request and configuration validators | FAPI 2.0 Security Profile | yes | planned | planned |

## End a session properly

Logging out of your application while leaving the provider session intact is the most
common half-finished logout in production.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| RP-initiated logout | OIDC RP-Initiated Logout | yes | planned | planned |
| Back-channel logout | OIDC Back-Channel Logout | yes | planned | planned |
| Token revocation | RFC 7009 | yes | yes | yes |

## Register clients at runtime

For multi-tenant products where every tenant needs its own client, without a human in a
console.

| You get | Specification | Python | Go | Rust |
|---|---|---|---|---|
| Dynamic client registration | RFC 7591, RFC 7592 | yes | planned | planned |

## Move between providers

Not a feature so much as the consequence of the others: the library talks to any
specification-compliant provider, so the code that validates a token does not know or care
who issued it.

The conformance harness runs the same suite against **Keycloak**, **IdentityServer**,
**node-oidc-provider** and **Descope** from one compose file, plus the OpenID Foundation's
hosted suite. `identity-stack` exercises the library against Descope and Ory end to end in
a real application rather than against test doubles.

---

## Not yet

Stated so the absence is deliberate rather than discovered:

| Capability | Specification | Status |
|---|---|---|
| Rich authorization requests | RFC 9396 | planned in every language |
| Client-initiated backchannel authentication | OpenID CIBA Core | planned in every language |
| Node / TypeScript implementation | — | planned |

## What is being worked on

Status lives in GitHub issues, never here — these are the workstreams, not their progress.
The [program map](roadmap.md) links each to its tracking issue.

- **Cross-language parity.** Closing the Go and Rust gaps above, in the order the
  capability matrix lists them.
- **Certification breadth.** Dynamic RP, RP-Initiated Logout and Back-Channel Logout are
  implemented and not yet certified; the hosted OIDF suite is the standing conformance
  standard. See [OIDC certification analysis](oidc-certification-analysis.md).
- **A configuration API** with one canonical key registry and precedence model across all
  three languages, specified in
  [`spec/config.md`](https://github.com/jamescrowley321/identity-model/blob/main/spec/config.md).
- **Test hardening**, because a capability that is only claimed is not a capability. See
  [the review process](review-process.md) and the mechanical gates behind it.
