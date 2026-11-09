# identity-model 5.0 — design cleanup before release

**Date:** 2026-11-08
**Status:** Decisions D1–D3 made 2026-11-08. Stack #960→#1031 merged into `release/v5` (merge commits). #915 (`release/v5` → `main`, py 5.0.0) is held until Gate A below is clear. Gate A fixes are in progress; see **Progress** below.

## Why

A design review across the 15 stacked 5.0 PRs (owner review on #960, plus the 2026-11-08 Claude reviews and a diff read per PR) turned up 45 design findings. The stack was merged so that fixes land as stories on top of `release/v5` without restacking. Nothing publishes until #915 merges.

The rule for what blocks the release: **if fixing it after 5.0.0 would break the public API or change default behaviour, it lands before #915.** Additive and internal fixes ship in 5.x.

Finding IDs are `<PR>-<letter>`; each points to the PR where the problem was introduced.

## Owner decisions (decided 2026-11-08)

| # | Decision | Outcome |
|---|----------|---------|
| D1 | 1027-A: core `check_token_binding` returns early when `presentation is None` (`token_binding.py`), so a token with `cnf.jkt` / `x5t#S256` is accepted as plain Bearer. | **Reject, unconditionally.** A bound token with no presentation is refused with a typed error; no option. |
| D2 | Gate A scope | **All of Gate A ships in 5.0**, including the "cheap now" item. |
| D3 | 962-B / #992 empty-string semantics | **py half of #992 lands in 5.0.** Go/Rust stay in Epic 26. |

### D1 spec cross-reference
- RFC 9449 §7.2: a protected resource that supports both schemes "MUST reject a DPoP-bound access token received as a bearer token". The library supports DPoP, so this applies. The only carve-out (§7.2 para 3) describes a Bearer-only resource unaware of DPoP, which "would most presumably accept" it. That is descriptive, not a rule for a DPoP-capable verifier.
- RFC 9449 §6: resource servers "MUST be able to reliably identify whether an access token is DPoP-bound" and "MUST ensure that the public key from the DPoP proof matches the one bound to the access token".
- RFC 9449 §7.1: "The resource server MUST NOT grant access to the resource unless all checks are successful."
- RFC 8705 §3: the protected resource "MUST obtain, from its TLS implementation layer, the client certificate" and "MUST verify that the certificate matches the certificate associated with the access token"; otherwise "the resource access attempt MUST be rejected with an error" (401 `invalid_token`). The text covers a mismatch and does not mention a missing certificate. But the MUST-verify cannot be met without a certificate, so a missing certificate is rejected too.
- Project rule: spec MUSTs are unconditional, not opt-in (#574). fastapi (#1029) already always passes a presentation, so this also aligns core with the middleware.

## Gate A — lands on `release/v5` before #915

Epic: [#1057](https://github.com/jamescrowley321/identity-model/issues/1057).

Ordered by dependency. Each story is one PR based on `release/v5`.

### Progress (2026-11-08)

| Story | Issue | PR | State |
|-------|-------|----|-------|
| A1 client auth | [#1056](https://github.com/jamescrowley321/identity-model/issues/1056) | — | owner WIP (`/tmp/im-1056`) |
| A2 key floor | — | — | owner WIP (`fix/970-key-floor-bypass`) |
| A3 alg policy | [#1058](https://github.com/jamescrowley321/identity-model/issues/1058) | [#1095](https://github.com/jamescrowley321/identity-model/pull/1095) | open, awaiting review. The DPoP verify default got *wider* (RS384/512, PS*) |
| A7 RS binding | [#1062](https://github.com/jamescrowley321/identity-model/issues/1062) | [#1093](https://github.com/jamescrowley321/identity-model/pull/1093) | open, awaiting review. Scoped to access tokens (see A7) |
| A9 fastapi options | [#1064](https://github.com/jamescrowley321/identity-model/issues/1064) | [#1091](https://github.com/jamescrowley321/identity-model/pull/1091) | open, awaiting review. `AuthOptions`; PLR0913 per-file rule remains until #1049 |
| A10 empty = absent (py) | [#1065](https://github.com/jamescrowley321/identity-model/issues/1065) | [#1092](https://github.com/jamescrowley321/identity-model/pull/1092) | open, awaiting review. No spec vectors (Rust runner can't skip one); stays with #992 |
| A14 introspected `cnf` | [#1094](https://github.com/jamescrowley321/identity-model/issues/1094) | — | in progress, stacked on #1093 |
| A15 login-callback audiences | [#1099](https://github.com/jamescrowley321/identity-model/issues/1099) | — | filed; stack on / fold into #1093 |
| A4, A5, A6, A8, A11, A12, A13 | [#1059](https://github.com/jamescrowley321/identity-model/issues/1059) [#1060](https://github.com/jamescrowley321/identity-model/issues/1060) [#1061](https://github.com/jamescrowley321/identity-model/issues/1061) [#1063](https://github.com/jamescrowley321/identity-model/issues/1063) [#1066](https://github.com/jamescrowley321/identity-model/issues/1066) [#1067](https://github.com/jamescrowley321/identity-model/issues/1067) [#1068](https://github.com/jamescrowley321/identity-model/issues/1068) | — | waiting on #1056 (shared files: config, models, fapi, par_logic, token_client_logic, exceptions) |

Release-PR CI: #915's `rust-mutation-gate` failed on an equivalent mutant in `resolve_kidless` (`len() > 1` guard redundant with `narrow()`'s fallback). Fixed by [#1096](https://github.com/jamescrowley321/identity-model/pull/1096) (merged). #915 is retitled `feat(py)!: release py-identity-model 5.0.0`.

Local `make lint` needs `GOTOOLCHAIN=go1.26.10` (golangci-lint panics on Go 1.27) and `~/go/bin` on PATH (actionlint).

### A1. Client auth — [#1056](https://github.com/jamescrowley321/identity-model/issues/1056) (in progress)
- 960-A: one `ClientAuthMethod` enum (six methods), `EndpointAuthenticationMethods` deleted, explicit `client_auth_method` on all 9 requests, `CLIENT_SECRET_POST`.
- 972-A (folded in 2026-11-08): `PrivateKeyJwt` gets one `aud` field instead of `audience` + `issuer`; explicit `None` fallback, `""` rejected; drop the precedence copy in `fapi.py`.
- 976-A: `MtlsClientAuth.auth_method` → `ClientAuthMethod`, TLS methods only. (#1056 calls the class `MtlsConfig`; the real name is `MtlsClientAuth`.)
- 976-B: `FAPI2ClientProfile` sets `client_auth_method` explicitly instead of relying on precedence. Add to #1056 ACs.

### A2. Key-strength floor — in progress (`fix/970-key-floor-bypass`)
- 970-A: Go measures the converted key; py uses PyJWT's base64url decoder; Rust leaves empty material to key conversion. Follow-up check: py and Rust still measure the JWK, so the two strategies can drift.

### A3. Algorithm allowlist policy — breaking — [#1058](https://github.com/jamescrowley321/identity-model/issues/1058)
One documented policy per purpose (verify, sign, FAPI) and one meaning for `algorithms=None`.
- 970-B: `None` = default set on py discovery path, but "required" in py manual mode; Go/Rust default everywhere; Rust default lacks ES512. `DEFAULT_ALLOWED_ALGORITHMS` is an alias of the signing set, so new signing algs widen verification.
- 1027-C: DPoP verifier defaults to the client key-generation set (`dpop._SUPPORTED_ALGORITHMS`).
- 1031-A (default part): signed introspection defaults to the FAPI set even outside FAPI, so a plain RS256 AS fails.
- Count today: `SUPPORTED_SIGNING_ALGORITHMS`, `DEFAULT_ALLOWED_ALGORITHMS`, `FAPI2_ALLOWED_SIGNING_ALGORITHMS`, `dpop._SUPPORTED_ALGORITHMS`, `id_token._EDDSA_ALGS`.

### A4. Typed errors — breaking — [#1059](https://github.com/jamescrowley321/identity-model/issues/1059)
- 971-A: `FAPIValidationResult.violations` and `FAPIProfileError.violations` are `list[str]`; tests match message prefixes. → typed violation code enum + message.
- 1027-D (breaking part): `check_token_binding` raises bare `ValueError`; `CertificateBindingError` has no kind enum. (Non-breaking part — `NONCE_MISMATCH` → `use_dpop_nonce`, `REPLAY_CACHE_FULL` as a server error — can ride along.)
- Must land before the Go/Rust FAPI ports (#1012–#1014) copy the shape.

### A5. Config and cache surface — breaking — [#1060](https://github.com/jamescrowley321/identity-model/issues/1060)
- 969-A: one `Config` holds transport and cache fields; each consumer silently ignores the other's. → split into an HTTP config and a cache config.
- 969-B: `ValidationCache` exposes `disco`, `jwks`, both write locks and `kid_miss_last_attempt` as public mutable attributes. → private, plus a Protocol like `DPoPReplayCache`.
- 1027-B: DPoP replay cache defaults to a process-wide global, keyed by `jti` only; the Protocol is sync but called from async; replay is signalled by either `False` or raising. → caller-owned, one signalling path, async variant.
- 969-C: reword [#996](https://github.com/jamescrowley321/identity-model/issues/996) ACs ("clients own their caches") to match py's injected-cache direction; settle the JWKS fallback TTL (py 1 h vs Go/Rust 24 h).

### A6. Value types and PAR shape — breaking — [#1061](https://github.com/jamescrowley321/identity-model/issues/1061)
- 976-F: `PrivateKeyJwt`, `MtlsClientAuth`, `RequestObjectKey` are mutable, so the profile copies and re-checks them on every request. → frozen dataclasses; delete `_client_auth_copies` and the re-check.
- 1017-A: `PushedAuthorizationRequest` is plain-mode or signed-mode in one type; non-`None` defaults make the mixing guard unable to tell unset from default; `request=""` silently falls back. → separate signed-request type (or `None` sentinels).
- 1017-B / [#1016](https://github.com/jamescrowley321/identity-model/issues/1016): `validate_fapi_authorization_request` rejects compliant signed PARs.

### A7. Resource-server binding — D1 (spec MUST) — [#1062](https://github.com/jamescrowley321/identity-model/issues/1062)
- 1027-A: reject a token with `cnf.jkt` or `cnf["x5t#S256"]` when no presentation is passed, with a typed error (`DPoPErrorKind.NOT_BOUND`-style / a `CertificateBindingError` kind). Unconditional. Update the docstring ("With no presentation nothing is checked") and the 4→5 upgrade note.
- **Scope (decided 2026-11-08):** the check runs only on **access-token** validation (`validate_token`, fastapi middleware/WebSocket). ID tokens (OIDC Core §3.1.3.7) and logout tokens (Back-Channel Logout §2.6) are never presented to a resource server with a proof, so `validate_id_token` / `validate_logout_token` skip it; otherwise an ID token carrying `cnf` would break login.
- **Side effect:** the fastapi login callback now calls `validate_id_token`, so §3.1.3.7 step 2 applies ("MUST be rejected if … it contains additional audiences not trusted by the Client"). Multi-audience ID tokens fail login until A15 lands.

### A8. DPoP client options — breaking — [#1063](https://github.com/jamescrowley321/identity-model/issues/1063)
- 1020-A: `require_dpop_token_type` duplicates what `dpop_key` says. Flag without key fails every response; key without flag silently accepts Bearer. → derive from `dpop_key` (or one DPoP options object per request).
- 1020-B: a refused downgrade drops the token response (`token=None`), losing a rotated refresh token and leaving issued Bearer tokens unrevocable. → keep the response on the error.
- 1020-C: `DPoPKey` can only be generated, not loaded; alg is a bare `str`. → `from_pem` / `from_jwk`, alg enum. (Additive, but DPoP-on-refresh is unusable across restarts without it.)
- 1020-E / [#1019](https://github.com/jamescrowley321/identity-model/issues/1019): proof built outside the retry decorator, so retries resend the same `jti`.

### A9. fastapi settings and middleware options — breaking — [#1064](https://github.com/jamescrowley321/identity-model/issues/1064)
- 1029-A: `OIDCSettings.required_binding` has no reader; settings can't express `mtls`.
- 1029-B: middleware and `build_ws_authenticator` each grow the same argument list (`PLR0913` already suppressed); #1048–#1050 add more. → one shared options object. Coordinate with [#1049](https://github.com/jamescrowley321/identity-model/issues/1049).
- 1029-C (part): add an expected-origin option for `htu`; today it trusts `Host`.

### A10. Empty-string semantics (py) — D3 — [#1065](https://github.com/jamescrowley321/identity-model/issues/1065)
- 962-B: py/Rust treat `client_id=""` as set, Go as unset. Pull py half of [#992](https://github.com/jamescrowley321/identity-model/issues/992) forward.

### A11. FAPI validators vs profile — [#1066](https://github.com/jamescrowley321/identity-model/issues/1066)
- 976-C: `validate_fapi_client_config` accepts `mtls` + `dpop_key` and `private_key_jwt` + `mtls`; the profile refuses both and adds checks the validators skip. → validators delegate to the profile's checks, or document that they're narrower.

### A12. Signed introspection inputs — [#1067](https://github.com/jamescrowley321/identity-model/issues/1067)
- 1031-A (rest): options hold a fixed `JwksResponse` and a manual issuer (no rotation / kid-miss refresh); `introspection_signing_alg_values_supported` is parsed but unread; leeway 0; verified `iat`/`iss` discarded. Making `jwks` optional is borderline-breaking — decide shape now.

### A13. Cheap now (in scope per D2) — [#1068](https://github.com/jamescrowley321/identity-model/issues/1068)
- 971-B: PAR endpoint check is truthiness-only (`true` passes) → string check.

### A14. Introspected `cnf` — D1 (spec MUST) — [#1094](https://github.com/jamescrowley321/identity-model/issues/1094)
- Found during A7. For opaque tokens the binding arrives in the introspection response (`cnf.jkt`, RFC 9449 §6.2; `cnf["x5t#S256"]`, RFC 8705 §3.2), and py never checks it against the presentation, so a bound opaque token is accepted as a bearer token. Same rules and typed errors as A7. Stacked on #1093.

### A15. Login-callback trusted audiences — [#1099](https://github.com/jamescrowley321/identity-model/issues/1099)
- Follows from A7's side effect. The login callback is configured through `OIDCSettings` / `build_oidc_router`, so #1091's `AuthOptions` (middleware/WebSocket) is the wrong home.
- `OIDCSettings.trusted_audiences: list[str] = []` (`OIDC_TRUSTED_AUDIENCES`; `""` rejected per A10). Empty by default, so spec-strict stays the default.
- `OIDCSettings.validate_azp: bool = False`. §3.1.3.7 step 3 is a SHOULD, so it is opt-in per the hardening rule; the docs recommend turning it on with `trusted_audiences`.
- `_validate_id_token` in `rp.py` passes both to `validate_id_token`.
- Same name as #1052's per-client `trusted_audiences` mapping for the middleware ID-token path; share the validation helper.
- Ships with #1093 (stacked or folded), so the behaviour change and the setting that allows extra audiences land together.

## Gate B — 5.x (post-release) — epic [#1069](https://github.com/jamescrowley321/identity-model/issues/1069)

| ID | Issue | Finding |
|----|-------|---------|
| 962-A | [#1070](https://github.com/jamescrowley321/identity-model/issues/1070) | `validate_id_token` has no `client_id` kwarg; uses `audience` (Go `WithClientID`, Rust `.client_id()`) |
| 962-C | [#1071](https://github.com/jamescrowley321/identity-model/issues/1071) | azp misconfig checked per call, not at config build |
| 964-A | [#1072](https://github.com/jamescrowley321/identity-model/issues/1072) | Go/Rust public resolvers still return `enc` keys alongside `ResolveSigningKey` |
| 964-B | [#1073](https://github.com/jamescrowley321/identity-model/issues/1073) | "no kid" encoded as `""` in Go/Rust errors (→ #993) |
| 964-C | [#1074](https://github.com/jamescrowley321/identity-model/issues/1074) | signing-key rule ignores `key_ops` |
| 964-D | [#1075](https://github.com/jamescrowley321/identity-model/issues/1075) | `KeyNotFoundException` unpicklable (widen #927) |
| 969-D | [#1076](https://github.com/jamescrowley321/identity-model/issues/1076) | JWKS cooldown keyed by `jwks_uri`, cache by trust scope + `jwks_uri` (half in #967) |
| 969-E | [#1077](https://github.com/jamescrowley321/identity-model/issues/1077) | cache metrics process-wide and async-only |
| 969-F | [#1078](https://github.com/jamescrowley321/identity-model/issues/1078) | implicit default cache; `TrustScope` not exported |
| 970-C | [#1079](https://github.com/jamescrowley321/identity-model/issues/1079) | py EC floor rarely fires (P-192 dropped at parse); docs wording |
| 972-B | [#1080](https://github.com/jamescrowley321/identity-model/issues/1080) | no spec vector for `aud` precedence before Go/Rust `private_key_jwt` (#1000) |
| 973-A | [#1081](https://github.com/jamescrowley321/identity-model/issues/1081) | `--only-module` run writes `all_passed: true` to `*-latest.json` |
| 973-B | [#1082](https://github.com/jamescrowley321/identity-model/issues/1082) | committed conformance `*-latest.json` with dead `log_url`s; basic job uploads FAPI files |
| 976-D | [#1083](https://github.com/jamescrowley321/identity-model/issues/1083) | client auth decides sender-constraint (no `private_key_jwt` + mTLS-bound) |
| 976-E | [#1084](https://github.com/jamescrowley321/identity-model/issues/1084) | ID Token / JARM alg limits only if caller opts in; `signing_algorithms` docstring wrong |
| 1015-A | [#1085](https://github.com/jamescrowley321/identity-model/issues/1085) | profile builds when no `DPoPKey` alg matches the server's advertised DPoP algs |
| 1017-C | [#1086](https://github.com/jamescrowley321/identity-model/issues/1086) | signing ignores `request_parameter_supported`; key errors escape `FAPIProfileError` |
| 1020-D | [#1087](https://github.com/jamescrowley321/identity-model/issues/1087) | mTLS aliases applied only inside `FAPI2ClientProfile` |
| 1027-E | [#1088](https://github.com/jamescrowley321/identity-model/issues/1088) | `TokenBinding` has no "any" member |
| 1029-C | [#1089](https://github.com/jamescrowley321/identity-model/issues/1089) | fastapi re-implements challenge/scheme parsing; `NONE` challenges only `Bearer`; ID-token × binding (#1052) |
| 1031-B | [#1090](https://github.com/jamescrowley321/identity-model/issues/1090) | `error_kind` set only for signed-response refusals |

## Housekeeping (comments posted 2026-11-08)
- [#966](https://github.com/jamescrowley321/identity-model/issues/966): #969 implemented option 2 (trust-scope keying) — close or re-scope.
- [#927](https://github.com/jamescrowley321/identity-model/issues/927): add `KeyNotFoundException` and the new exception classes.
- [#996](https://github.com/jamescrowley321/identity-model/issues/996): reword ACs (A5).

## Cross-cutting themes
1. Stringly-typed errors and partial error enums (`TokenErrorKind`, `IntrospectionErrorKind`, `DPoPErrorKind`, untyped `CertificateBindingError`, FAPI `list[str]`).
2. `None` / `""` mean different things per feature and per language.
3. 5.0's new config and value types aren't finished: mixed `Config`, public cache internals, mutable value types, two-mode request types.
4. Spec MUST vs opt-in applied unevenly (1027-A, 1020-A).
5. Python is the reference for the Go/Rust parity loops (#1000, #1003, #1012–#1014, #1030): settle shapes here before they're ported.
