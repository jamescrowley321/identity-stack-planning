# identity-model 5.0 — design cleanup before release

**Date:** 2026-11-08
**Status:** Stack #960→#1031 merged into `release/v5` (merge commits). #915 (`release/v5` → `main`, py 5.0.0) is held until Gate A below is clear.

## Why

A design review across the 15 stacked 5.0 PRs (owner review on #960, plus the 2026-11-08 Claude reviews and a diff read per PR) turned up 45 design findings. The stack was merged so that fixes land as stories on top of `release/v5` without restacking. Nothing publishes until #915 merges.

The rule for what blocks the release: **if fixing it after 5.0.0 would break the public API or change default behaviour, it lands before #915.** Additive and internal fixes ship in 5.x.

Finding IDs are `<PR>-<letter>`; each points to the PR where the problem was introduced.

## Owner decisions

| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | 1027-A: core `check_token_binding` accepts a token with `cnf.jkt` / `x5t#S256` as plain Bearer when no presentation is passed. RFC 9449 §7.1 / RFC 8705 §3 make the binding check a MUST. | Spec MUST → unconditional: a bound token with no presentation is rejected. Matches fastapi (#1029), which always passes a presentation. |
| D2 | Gate A is ~12 stories. Ship all of it in 5.0, or cut? | Keep every item marked *breaking*; the "cheap-now" items are optional. |
| D3 | 962-B / #992: empty `client_id` / `kid` / `use` mean different things per language; #992 is parked in Epic 26 (post-5.0). | Pull the **py** half of #992 into 5.0. Go/Rust stay in Epic 26. |

## Gate A — lands on `release/v5` before #915

Ordered by dependency. Each story is one PR based on `release/v5`.

### A1. Client auth — [#1056](https://github.com/jamescrowley321/identity-model/issues/1056) (in progress)
- 960-A: one `ClientAuthMethod` enum (six methods), `EndpointAuthenticationMethods` deleted, explicit `client_auth_method` on all 9 requests, `CLIENT_SECRET_POST`.
- 972-A (folded in 2026-11-08): `PrivateKeyJwt` gets one `aud` field instead of `audience` + `issuer`; explicit `None` fallback, `""` rejected; drop the precedence copy in `fapi.py`.
- 976-A: `MtlsClientAuth.auth_method` → `ClientAuthMethod`, TLS methods only. (#1056 calls the class `MtlsConfig`; the real name is `MtlsClientAuth`.)
- 976-B: `FAPI2ClientProfile` sets `client_auth_method` explicitly instead of relying on precedence. Add to #1056 ACs.

### A2. Key-strength floor — in progress (`fix/970-key-floor-bypass`)
- 970-A: Go measures the converted key; py uses PyJWT's base64url decoder; Rust leaves empty material to key conversion. Follow-up check: py and Rust still measure the JWK, so the two strategies can drift.

### A3. Algorithm allowlist policy — breaking
One documented policy per purpose (verify, sign, FAPI) and one meaning for `algorithms=None`.
- 970-B: `None` = default set on py discovery path, but "required" in py manual mode; Go/Rust default everywhere; Rust default lacks ES512. `DEFAULT_ALLOWED_ALGORITHMS` is an alias of the signing set, so new signing algs widen verification.
- 1027-C: DPoP verifier defaults to the client key-generation set (`dpop._SUPPORTED_ALGORITHMS`).
- 1031-A (default part): signed introspection defaults to the FAPI set even outside FAPI, so a plain RS256 AS fails.
- Count today: `SUPPORTED_SIGNING_ALGORITHMS`, `DEFAULT_ALLOWED_ALGORITHMS`, `FAPI2_ALLOWED_SIGNING_ALGORITHMS`, `dpop._SUPPORTED_ALGORITHMS`, `id_token._EDDSA_ALGS`.

### A4. Typed errors — breaking
- 971-A: `FAPIValidationResult.violations` and `FAPIProfileError.violations` are `list[str]`; tests match message prefixes. → typed violation code enum + message.
- 1027-D (breaking part): `check_token_binding` raises bare `ValueError`; `CertificateBindingError` has no kind enum. (Non-breaking part — `NONCE_MISMATCH` → `use_dpop_nonce`, `REPLAY_CACHE_FULL` as a server error — can ride along.)
- Must land before the Go/Rust FAPI ports (#1012–#1014) copy the shape.

### A5. Config and cache surface — breaking
- 969-A: one `Config` holds transport and cache fields; each consumer silently ignores the other's. → split into an HTTP config and a cache config.
- 969-B: `ValidationCache` exposes `disco`, `jwks`, both write locks and `kid_miss_last_attempt` as public mutable attributes. → private, plus a Protocol like `DPoPReplayCache`.
- 1027-B: DPoP replay cache defaults to a process-wide global, keyed by `jti` only; the Protocol is sync but called from async; replay is signalled by either `False` or raising. → caller-owned, one signalling path, async variant.
- 969-C: reword [#996](https://github.com/jamescrowley321/identity-model/issues/996) ACs ("clients own their caches") to match py's injected-cache direction; settle the JWKS fallback TTL (py 1 h vs Go/Rust 24 h).

### A6. Value types and PAR shape — breaking
- 976-F: `PrivateKeyJwt`, `MtlsClientAuth`, `RequestObjectKey` are mutable, so the profile copies and re-checks them on every request. → frozen dataclasses; delete `_client_auth_copies` and the re-check.
- 1017-A: `PushedAuthorizationRequest` is plain-mode or signed-mode in one type; non-`None` defaults make the mixing guard unable to tell unset from default; `request=""` silently falls back. → separate signed-request type (or `None` sentinels).
- 1017-B / [#1016](https://github.com/jamescrowley321/identity-model/issues/1016): `validate_fapi_authorization_request` rejects compliant signed PARs.

### A7. Resource-server binding — D1
- 1027-A per D1.

### A8. DPoP client options — breaking
- 1020-A: `require_dpop_token_type` duplicates what `dpop_key` says. Flag without key fails every response; key without flag silently accepts Bearer. → derive from `dpop_key` (or one DPoP options object per request).
- 1020-B: a refused downgrade drops the token response (`token=None`), losing a rotated refresh token and leaving issued Bearer tokens unrevocable. → keep the response on the error.
- 1020-C: `DPoPKey` can only be generated, not loaded; alg is a bare `str`. → `from_pem` / `from_jwk`, alg enum. (Additive, but DPoP-on-refresh is unusable across restarts without it.)
- 1020-E / [#1019](https://github.com/jamescrowley321/identity-model/issues/1019): proof built outside the retry decorator, so retries resend the same `jti`.

### A9. fastapi settings and middleware options — breaking
- 1029-A: `OIDCSettings.required_binding` has no reader; settings can't express `mtls`.
- 1029-B: middleware and `build_ws_authenticator` each grow the same argument list (`PLR0913` already suppressed); #1048–#1050 add more. → one shared options object. Coordinate with [#1049](https://github.com/jamescrowley321/identity-model/issues/1049).
- 1029-C (part): add an expected-origin option for `htu`; today it trusts `Host`.

### A10. Empty-string semantics (py) — D3
- 962-B: py/Rust treat `client_id=""` as set, Go as unset. Pull py half of [#992](https://github.com/jamescrowley321/identity-model/issues/992) forward.

### A11. FAPI validators vs profile
- 976-C: `validate_fapi_client_config` accepts `mtls` + `dpop_key` and `private_key_jwt` + `mtls`; the profile refuses both and adds checks the validators skip. → validators delegate to the profile's checks, or document that they're narrower.

### A12. Signed introspection inputs
- 1031-A (rest): options hold a fixed `JwksResponse` and a manual issuer (no rotation / kid-miss refresh); `introspection_signing_alg_values_supported` is parsed but unread; leeway 0; verified `iat`/`iss` discarded. Making `jwks` optional is borderline-breaking — decide shape now.

### Cheap now, optional
- 971-B: PAR endpoint check is truthiness-only (`true` passes) → string check.

## Gate B — 5.x (post-release), file as issues

| ID | Finding |
|----|---------|
| 962-A | `validate_id_token` has no `client_id` kwarg; uses `audience` (Go `WithClientID`, Rust `.client_id()`) |
| 962-C | azp misconfig checked per call, not at config build |
| 964-A | Go/Rust public resolvers still return `enc` keys alongside `ResolveSigningKey` |
| 964-B | "no kid" encoded as `""` in Go/Rust errors (→ #993) |
| 964-C | signing-key rule ignores `key_ops` |
| 964-D | `KeyNotFoundException` unpicklable (widen #927) |
| 969-D | JWKS cooldown keyed by `jwks_uri`, cache by trust scope + `jwks_uri` (half in #967) |
| 969-E | cache metrics process-wide and async-only |
| 969-F | implicit default cache; `TrustScope` not exported |
| 970-C | py EC floor rarely fires (P-192 dropped at parse); docs wording |
| 972-B | no spec vector for `aud` precedence before Go/Rust `private_key_jwt` (#1000) |
| 973-A | `--only-module` run writes `all_passed: true` to `*-latest.json` |
| 973-B | committed conformance `*-latest.json` with dead `log_url`s; basic job uploads FAPI files |
| 976-D | client auth decides sender-constraint (no `private_key_jwt` + mTLS-bound) |
| 976-E | ID Token / JARM alg limits only if caller opts in; `signing_algorithms` docstring wrong |
| 1015-A | profile builds when no `DPoPKey` alg matches the server's advertised DPoP algs |
| 1017-C | signing ignores `request_parameter_supported`; key errors escape `FAPIProfileError` |
| 1020-D | mTLS aliases applied only inside `FAPI2ClientProfile` |
| 1027-E | `TokenBinding` has no "any" member |
| 1029-C | fastapi re-implements challenge/scheme parsing; `NONE` challenges only `Bearer`; ID-token × binding (#1052) |
| 1031-B | `error_kind` set only for signed-response refusals |

## Housekeeping
- [#966](https://github.com/jamescrowley321/identity-model/issues/966): #969 implemented option 2 (trust-scope keying) — close or re-scope.
- [#927](https://github.com/jamescrowley321/identity-model/issues/927): add `KeyNotFoundException` and the new exception classes.
- [#996](https://github.com/jamescrowley321/identity-model/issues/996): reword ACs (A5).

## Cross-cutting themes
1. Stringly-typed errors and partial error enums (`TokenErrorKind`, `IntrospectionErrorKind`, `DPoPErrorKind`, untyped `CertificateBindingError`, FAPI `list[str]`).
2. `None` / `""` mean different things per feature and per language.
3. 5.0's new config and value types aren't finished: mixed `Config`, public cache internals, mutable value types, two-mode request types.
4. Spec MUST vs opt-in applied unevenly (1027-A, 1020-A).
5. Python is the reference for the Go/Rust parity loops (#1000, #1003, #1012–#1014, #1030): settle shapes here before they're ported.
