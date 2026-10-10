# C6 — discovery REQUIRED fields + kid-less key selection

Repo: im-audit @ 1e3b6a6. Specs: scratchpad/specs/*.txt.

## Spec readings (re-verified)

- Discovery §3 (discovery.txt:392-426). REQUIRED: `issuer`, `authorization_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`. `token_endpoint`: "REQUIRED unless only the Implicit Flow is used." None of the REQUIRED fields has a default. `id_token_signing_alg_values_supported`: "The algorithm RS256 MUST be included."
- Discovery §3 OPTIONAL `grant_types_supported`: "If omitted, the default value is ["authorization_code", "implicit"]." RFC 8414 §2 uses the same default.
- The defaults cited in fapi.py come from Registration §2 client metadata. `response_types`: "If omitted, the default is that the Client will use only the code Response Type" (registration.txt:148). `id_token_signed_response_alg`: "The default, if omitted, is RS256" (registration.txt:200).
- Discovery 1.0 has no caching text at all (`grep -i cach` finds 0 hits). Core mentions caching only for request_uri (2441) and encryption-key rotation via Cache-Control max-age (3006).
- Discovery §4.3 says the issuer MUST be identical to the URL prefix. §7.2 (Impersonation Attacks) says "RPs MUST ensure that the Issuer URL ... exactly matches the value of the issuer Claim ... and ... the iss Claim value in ID Tokens".
- Core §10.1, Asymmetric Signatures (core.txt:2956): "If there are multiple keys in the referenced JWK Set document, a kid value MUST be provided in the JOSE Header. The key usage of the respective keys MUST support signing." Both are obligations on the **signer (OP)**. Core puts no MUST on the RP for a kid-less token. Core §10.1.1 and App. A.1 (4288) say only that an unknown kid means the RP should re-fetch.
- Core 1.0 (2014) vs errata set 2: I found no material change to any of these sentences.
- OIDF certification suite (gitlab openid/conformance-suite, master):
  - `oidcc-client-test-kid-absent-single-jwks`: the JWKS holds exactly one key and has no kid. The RP must "accept the ID Token".
  - `oidcc-client-test-kid-absent-multiple-jwks`: several RS256 keys, no kids. "The RP can do one of two things; reject ... Or it can just test all possible keys". The suite accepts either outcome.
  - The py RP passes both tests (conformance/results/*-rp-latest.json:42,49).

## (a) Discovery REQUIRED fields

### Instances

| file:line | text | class |
|---|---|---|
| py/src/py_identity_model/core/fapi.py:149 | "When optional metadata fields are absent, RFC 8414 §2 and OIDC Discovery §3 defaults are assumed." | DOC |
| py/.../core/fapi.py:165 | "RFC 8414 §2 default when omitted is ["authorization_code"]" (the real default is `["authorization_code","implicit"]`; the conclusion is unchanged) | DOC (adjacent) |
| py/.../core/fapi.py:171-173 | "OIDC Discovery §3 default when omitted is ["code"] — compliant"; `None` means no violation | **BEHAVIOR** |
| py/.../core/fapi.py:196-202 | "§3 default ... RS256"; `None` produces a violation, and the violation string says "OIDC Discovery default is RS256" | DOC (the user-visible violation text is wrong; the verdict is right) |
| py/src/tests/unit/test_fapi.py:368 | docstring "OIDC Discovery §3 default is RS256" | DOC |
| py/src/tests/unit/test_fapi.py:381 | "non-compliant due to RFC defaults" | DOC |
| py/src/tests/unit/test_fapi.py:404-415 | `test_response_types_none_is_compliant` encodes the invented default | **BEHAVIOR (test encodes wrong rule)** |
| spec/capabilities.md:83 | lists all 7 as required and cites §3. It is correct, but it leaves out the token_endpoint "unless implicit-only" qualifier | DOC (minor) |
| spec/vectors/discovery.json:5-13 | `required_fields` holds the same 7 | OK (library narrowing; see below) |

FAPI exists only in py. Go and Rust have no FAPI module, so there is nothing to keep in parity for the FAPI part.

### What happens when the field is absent

- **Py discovery parse**: `validate_required_parameters` (core/validators.py:81-100, called at response_processors.py:215) unconditionally requires `issuer`, `response_types_supported`, `subject_types_supported` and `id_token_signing_alg_values_supported`. It raises `DiscoveryMissingFieldsError`, which surfaces as `DiscoveryErrorKind.MISSING_FIELDS`.
  - `jwks_uri` is required only through `DiscoveryPolicy.require_key_set` (default True; response_processors.py:223-228). **A spec REQUIRED field can therefore be switched off**, which violates the "MUSTs unconditional" rule.
  - `authorization_endpoint` and `token_endpoint` are **not required** (already tracked in #771).
  - The check is `is None`, so an empty array `[]` passes.
- **Go**: go/pkg/discovery/discovery.go:90-98 requires all 7 unconditionally, with `len()>0`, so `[]` counts as missing. The result is `*MissingFieldsError`.
- **Rust**: rust/src/discovery/metadata.rs:81-104 requires all 7 unconditionally, with `is_empty()`, so `[]` counts as missing. The result is `DiscoveryError::MissingFields`.
- **Py FAPI check**: a successful `get_discovery_document` result can never have `response_types_supported` or `id_token_signing_alg_values_supported` set to None, because parsing already failed. The None branches in fapi.py are reachable only from a hand-built `DiscoveryDocumentResponse`, which is exactly what the tests do.
  - On that path, a missing `response_types_supported` is reported as **compliant**. It should be a violation, because the field is REQUIRED and has no default.

### Divergences

1. Py does not require `authorization_endpoint` or `token_endpoint`. This is #771, and DISC-008 `missing-multiple-fields` is xfail in py.
2. Py's `jwks_uri` requirement can be disabled (`require_key_set=False`). Go and Rust always require it. #771 does not mention this.
3. An empty array counts as missing in Go and Rust, but as present in py. No vector pins this.
4. All three languages require `token_endpoint` unconditionally, which is stricter than §3 for implicit-only OPs. I recommend documenting this as a deliberate library contract rather than changing it: the library targets code flow, and no target OP is implicit-only.

Should a missing REQUIRED field fail discovery? **Yes.** It is a spec REQUIRED field with no default, so the check must be unconditional with no option. Go and Rust already behave this way; py is partial.

Cognito: its discovery document advertises all 7 fields and they are non-empty (Cognito's openid-configuration includes authorization_endpoint, token_endpoint, jwks_uri, response_types_supported, subject_types_supported and id_token_signing_alg_values_supported=[RS256]). No impact.

## (b) kid-less key selection

### Instances

| file:line | text | class |
|---|---|---|
| py/src/py_identity_model/core/parsers.py:230-232 | "Per OIDC Core Section 10.1 ... exactly one key, the RP MUST use that key" | DOC (§10.1 has no RP MUST) |
| py/.../core/parsers.py:294-295 | the same claim in the deprecated `get_public_key_from_jwk` | DOC |
| py/src/tests/unit/test_parsers.py:70, :343 | "Per OIDC Core Section 10.1: use the single JWKS key" | DOC |
| py/.../core/parsers.py:198-200 | falls back to **all** keys (including `use=enc`) when none is sig/unmarked, citing "RFC 7517 §4.2" | BEHAVIOR (leniency; see open question) |
| go/pkg/jwt/jwt.go:62, go/pkg/jwks/jwks.go:127 | `ResolveKeyWithRefresh(ctx, header.Kid)` with Kid=="" does an exact match on keys whose Kid is "" | **BEHAVIOR divergence** |
| rust/src/jwt/mod.rs:66-71,163, rust/src/jwks/key.rs:209-210 | the same: `kid: String` defaults to "" and `find` matches `k.kid == ""` | **BEHAVIOR divergence** |

### Actual behavior

| case | py (`find_key_by_kid` → `_no_kid_candidates`) | go / rust |
|---|---|---|
| no kid; JWKS has 1 key **with** a kid | accept (uses it) | **reject KeyNotFound**, after a **forced JWKS refresh** (cooldown-bounded) |
| no kid; JWKS has 1 key without a kid | accept | accept (exact "" match) |
| no kid; 2+ keys; use/alg/kty narrows to one (e.g. sig RSA + enc RSA, or RSA + EC with RS256) | accept | reject if every key has a kid; otherwise **the first kid-less key, with no ambiguity check, no use filter and no alg filter** |
| no kid; 2+ indistinguishable sig keys | reject: "multiple signing keys" (prose `TokenValidationException`, untyped) | reject KeyNotFound, or pick the first kid-less key (wrong key → signature fails) |
| alg=none | rejected before selection (parsers.py:190) | rejected before resolution (jwt.go:48, mod.rs check_algorithm) |
| py refresh on kid None | none (sync/token_validation.py:361 `kid is not None`) | refresh on every kid-less token |

Go and Rust fail the first row. That row is a **compliant** OP: Core §10.1 requires a kid only when the set holds multiple keys, and the OIDF test `kid-absent-single-jwks` expects acceptance. Go and Rust pass the OIDF single-jwks test only because that fixture's key also lacks a kid. A provider that publishes one key with a kid and omits kid from the header gets rejected. This is an interop bug in Go and Rust. It is not hardening.

### Spec classification of the multi-key case

A kid-less token against a multi-key JWKS violates the **OP's** MUST. The RP has no MUST, and OIDF explicitly allows either rejecting or trying every key.
- Py's use/alg/kty narrowing is **tolerance with a fail-closed tie-break**. The signature is still verified against the chosen key, and an ambiguous set is rejected. It is neither a security hole nor hardening.
- Rejecting outright would be hardening beyond the spec. Under the project rules it would have to be opt-in and default-off. I don't recommend adding it, because nobody has asked for it.
- **Recommendation**: keep py's behavior as the reference, port it to Go and Rust, and fix the citations.

Open question for James (do not decide in the story): py falls back to `use=enc` keys when no key is sig or unmarked (parsers.py:198-200; tests test_parsers.py:163, :404). Core §10.1 says "The key usage ... MUST support signing" (an OP-side MUST). The kid path ignores `use` entirely too. Options: port the fallback as-is for parity (the default in S5 below), or drop it in all three languages in a separate story.

Cognito: ID tokens always carry `kid`, and the JWKS has 2 RSA keys with kids. The kid-less code path is never reached, so nothing changes in any language.

## (c) Debatable citations

| file:line | current | proposed |
|---|---|---|
| spec/vectors/discovery.json:48 (DISC-004), :56 (DISC-005) | `"references": ["§4"]` (caching) | No OIDC section exists. Use `[]` plus a note "library contract (capabilities.md), not spec-normative". If the TTL is header-derived, cite RFC 9111 §4.2 instead. PR #821 rewrites this file with `§4` escapes, so the change must land after it. |
| docs/security/control-matrix.md:42 | "OIDC Core §2, RFC 9207" | "OIDC Discovery 1.0 §4.3, §7.2; OIDC Core §3.1.3.7 (step 2); RFC 9207". The allowlist itself is opt-in hardening (no spec mandates it). |
| go/pkg/discovery/doc.go:30, rust/src/discovery/mod.rs:9 | "Discovery 1.0 §3, §4" for the whole package, which includes caching | fine as a package-level citation; leave it |

## Overlap

- **#771** (open), "fix(discovery): Python does not require token_endpoint or authorization_endpoint". It covers divergence 1. It does **not** cover `require_key_set` or empty arrays.
- **#821** (open PR) rewrites spec/vectors/discovery.json and capabilities.md, carries the `§4` caching refs forward, and xfails DISC-008 for py. Any doc edit to these files depends on it.
- #842 / #850 / #574: discovery issuer-match. These are adjacent to the control-matrix citation, with no conflict.
- #573 (parity epic) lists dup-kid try-all but nothing about kid-less selection. #242 is the RP cert tracker.
- **I found no existing issue** for the Go/Rust kid-less divergence or the FAPI defaults.

## Stories

### S1 — `fix(fapi): treat missing REQUIRED discovery metadata as a violation, not a default` — S
- Scope: py/src/py_identity_model/core/fapi.py (149, 165, 170-176, 195-202); py/src/tests/unit/test_fapi.py (368, 381, 404-415); docs/api/fapi.md if it mentions the defaults (grep found none).
- AC:
  - Given a `DiscoveryDocumentResponse` with `response_types_supported=None`, when `validate_fapi_discovery` runs, then `is_compliant` is False and one violation names `response_types_supported` as REQUIRED by Discovery §3.
  - Given `id_token_signing_alg_values_supported=None`, then a violation is reported whose text does not claim an RS256 default.
  - Given `grant_types_supported=None`, then it is still compliant, and the comment quotes the `["authorization_code","implicit"]` default.
- Tests: rename `test_response_types_none_is_compliant` to `..._is_non_compliant` and flip its assertion; fix the docstrings. Py-only; no vectors.
- Deps: none. No Cognito impact.

### S2 — extend **#771**: `fix(discovery): require every Discovery §3 field unconditionally in Python` — M
- Scope: py core/validators.py:81-100, core/response_processors.py:215-228, core/discovery_policy.py (`require_key_set`), the py vector xfail for DISC-008, spec/vectors/discovery.json (a new empty-array vector), spec/capabilities.md:83 (an implicit-only note).
- AC:
  - Given a document missing `authorization_endpoint` or `token_endpoint`, then `MISSING_FIELDS` is raised, listing the fields in `required_fields` order. This removes the DISC-008 xfail.
  - Given a document without `jwks_uri` and `DiscoveryPolicy(require_key_set=False)`, then `MISSING_FIELDS` is still raised.
  - Given `response_types_supported: []` (likewise `subject_types_supported` or `id_token_signing_alg_values_supported`), then py, Go and Rust all report the field as missing.
- Vectors: a new DISC-008 vector for empty arrays, which already passes in Go and Rust.
- **Decision for James**: `require_key_set=False` changes from "skip" to "no effect". It needs a deprecation (py has users) or a breaking release.
- Deps: #821 (vector runner + discovery.json rewrite). No Cognito impact.

### S3 — `docs(spec): correct discovery caching and issuer-pinning citations` — S
- Scope: spec/vectors/discovery.json DISC-004/005 references; docs/security/control-matrix.md:42; spec/capabilities.md:83 (token_endpoint qualifier; this can fold into S2).
- AC:
  - Given the vectors, then no discovery-cache vector cites an OIDC Discovery section.
  - Given control-matrix row R.9, then it cites Discovery §4.3/§7.2, Core §3.1.3.7 and RFC 9207.
  - Every vector runner stays green; references are not consumed by any runner, as grep confirmed.
- Deps: #821 (same file).

### S4 — `fix(go,rust): select the verification key for a kid-less JWT the same way as Python` — M
- Scope:
  - go/pkg/jwt/jwt.go:58-65, go/pkg/jwks/jwks.go (a new `ResolveKeyForHeader(kid, alg)` or equivalent), go/pkg/jwks/errors.go (a typed `AmbiguousKeyError`)
  - rust/src/jwt/mod.rs:161-164, rust/src/jwks/key.rs + client.rs, rust/src/error.rs (a typed `IdentityError::AmbiguousKey` variant)
  - py/src/py_identity_model/core/parsers.py:228-232, 294-295 and test_parsers.py:70, 343 (docstrings only: "Core §10.1 requires the OP to send a kid only when the set holds multiple keys; with one candidate the RP uses it, and an ambiguous set is rejected")
  - spec/vectors/validation.json or jwks.json (new vectors)
- AC:
  - Given a JWT with no kid and a JWKS of one sig key that **has** a kid, when validated in py, Go and Rust, then it is accepted and **no** JWKS refresh is made.
  - Given no kid and keys {RSA sig, RSA enc}, then the sig key is used in all three.
  - Given no kid, keys {RSA, EC} and alg RS256, then the RSA key is used.
  - Given no kid and two RSA sig keys, then all three reject with a typed ambiguous-key error. This error is distinct from key-not-found. Py adds a typed kind or subclass if it has none.
  - Given alg=none and no kid, then the token is rejected before key selection.
  - Given a token **with** a kid, then behavior is unchanged, including the refresh on a miss.
- Vectors: the 5 cases above as shared vectors, so py, Go and Rust run the same fixtures.
- Deps: none (independent of S1-S3). Cognito: no impact (always sends a kid).
- Open question attached: whether to port or drop the py fallback to `use=enc` keys (parsers.py:198-200). The default is to port it for parity and to file a separate story if it is to be dropped.
