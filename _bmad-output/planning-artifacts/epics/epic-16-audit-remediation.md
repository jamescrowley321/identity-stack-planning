---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'EPIC-16-AUDIT-REMEDIATION'
epic_title: 'Audit Remediation — Blue-Team Fixes for the 2026-08-02 Red/Blue Audit'
date: '2026-08-02'
status: 'draft'
inputDocuments:
  - _bmad-output/implementation-artifacts/ralph-prompts/RED-BLUE-GATE.md
  - _bmad-output/implementation-artifacts/ralph-prompts/pim-fapi2-hardening.md
---

# Epic 16: Audit Remediation — Blue-Team Fixes

## Overview

A fresh-context red/blue audit of **shipped** `py-identity-model` `origin/main` (v3.8.0) on 2026-08-02
confirmed a cluster of live security gaps that the feature loop reported as "done". The root cause was
process (the gate reviewed the task branch, never the code that shipped, and mandated no fail-closed
test — see `RED-BLUE-GATE.md`), addressed separately. **This epic is the code remediation**: each
CONFIRMED finding gets a fix, a **fail-closed / mutation test** under `src/tests/security/` that fails
if the fix is reverted, and a row in `docs/security/control-matrix.md`.

This epic **gates the paused hosted OIDF certification** (RP cert tracking #242, FAPI2 cert #475): we do
not certify code we do not trust. It corresponds to tasks T256–T263 in `pim-fapi2-hardening.md` and the
FAPI 2.0 hardening epic #476.

**Recurring theme (Theme A):** the library sender-constrains well on the *client* side but under-enforces
on the *resource-server* validation path (`validate_token`). Several stories close that path.

## Stories

---

### Story R.1: Algorithm-confusion & downgrade hardening

```yaml
story_id: R.1
task_id: T257
title: "Algorithm-confusion & downgrade hardening in token validation"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: critical
estimation: M
audit_refs: [RT4-F1, RT4-F2, F0]
```

**User Story**

> As a resource server relying on py-identity-model to validate tokens,
> I want the library itself to reject algorithm confusion and downgrade — not delegate that to PyJWT —
> so that a caller's algorithm restriction is enforced and an RS↔HS / `alg:none` confusion cannot become an authentication bypass if the crypto dependency changes.

**Description**

Three related, CONFIRMED defects in `src/py_identity_model/core/`:

1. **Downgrade — allowlist silently void in discovery mode.** `build_resolved_config`
   (`token_validation_logic.py:203`, line 225 `algorithms=[alg]`) discards the caller's
   `original_config.algorithms`; proven end-to-end (caller `['ES256']` + OP RSA/RS256 token → accepted).
2. **Alg taken from the attacker-controlled token header** in the single-key / no-`kid` branch
   (`parsers.py:192`), and `_ALG_TO_KTY` (`parsers.py:17-31`) has **no `HS256/384/512`→`oct` and no
   `none` entries**, so `_validate_key_alg_consistency` gives zero protection against symmetric/`none`
   confusion. Today an RS→HS forgery is blocked **only** by PyJWT's internal `PyJWK` guard.
3. **Blocking exceptions unwrapped** — `InvalidKeyError` / `NotImplementedError` are not wrapped in the
   library's `TokenValidationException` hierarchy, so a caller catching the documented exception sees an
   uncaught error.

**Deliverables**

1. In `build_resolved_config`: if `original_config.algorithms` is set, the resolved `alg` MUST be a
   member; otherwise raise `TokenValidationException` (fail closed). The resolved `algorithms` passed to
   PyJWT is the caller's allowlist intersected with the key's `alg`, never a widened `[alg]`.
2. Add `HS256/HS384/HS512`→`oct` and `none`→(reject) to the confusion map; never resolve `alg` from the
   token header — resolve from the key, and reject if key `alg` conflicts with the caller allowlist.
3. Wrap the dependency exceptions in `TokenValidationException`.
4. **Fail-closed tests** (`src/tests/security/test_alg_confusion.py`): allowlist honored in discovery
   mode; RS→HS confusion rejected *by the library* (mock/stub PyJWT if needed to prove the library, not
   the dependency, rejects); `alg:none` rejected; exception type is `TokenValidationException`.
5. Control-matrix rows.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.1.1** Given `TokenValidationConfig(perform_disco=True, algorithms=['ES256'])` and an OP whose
  JWKS key resolves to `RS256`, when an RS256-signed token is validated, then validation raises
  `TokenValidationException` (not accepted).
- **AC-R.1.2** Given an OP JWKS RSA key with no `alg` and a token header `{"alg":"HS256"}` HMAC-signed
  with the RSA public key, when validated, then the **library** rejects it before key construction (test
  must demonstrate rejection independent of PyJWT's internal guard).
- **AC-R.1.3** Given `{"alg":"none"}`, when validated, then rejection with `TokenValidationException`.
- **AC-R.1.4** Given each control above, when its guard line is deleted locally, then at least one test
  in `src/tests/security/` fails (mutation check recorded in the PR).
- **AC-R.1.5** Given `docs/security/control-matrix.md`, when reviewed, then rows exist for allowlist
  enforcement, RS/HS confusion, and `none`, each linking the RFC and the proving test.

---

### Story R.2: Resource-server sender-constraint & strict-audience enforcement

```yaml
story_id: R.2
task_id: T256
title: "Enforce sender-constraints and strict audience in validate_token"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: critical
estimation: L
audit_refs: [RT1-F1, RT5-F18, "#478"]
```

**User Story**

> As a resource server,
> I want `validate_token` to enforce certificate-binding, DPoP binding, and strict audience when I
> configure them,
> so that a stolen sender-constrained token cannot be replayed as a plain bearer token and a token minted
> for another audience is rejected.

**Description**

`validate_certificate_binding` (`core/mtls.py:113`) is correct but **nothing calls it**; `validate_token`
has no `cnf`/cert parameter (`cnf`/`x5t` appear nowhere in `token_validation_logic.py`). DPoP `cnf.jkt`
verification is the same gap (#478). And FAPI2 secondary-audience rejection currently lives in
**harness glue** (`conformance/app.py:1299-1322`), not the library — PyJWT only checks `client_id ∈ aud`,
so an untrusted secondary audience slips through the public API.

**Deliverables**

1. Extend the validation entrypoint with an opt-in, **fail-closed** confirmation input: when a peer
   certificate is supplied, enforce `cnf.x5t#S256`; when a DPoP proof/key is supplied, enforce `cnf.jkt`
   (RFC 9449 §6.1); when a cert/DPoP is required but absent, reject.
2. Add strict-audience enforcement: reject a token carrying any audience not in the configured allowed
   set (not merely "client_id present").
3. **Fail-closed tests** (`src/tests/security/test_rs_sender_constraint.py`, `test_strict_audience.py`):
   cert-bound token replayed without cert → rejected; `cnf.jkt` mismatch → rejected; secondary untrusted
   `aud` → rejected. Each must fail if the enforcement is removed.
4. Move the harness-only secondary-`aud` check into the library and have the conformance RP call the
   library (coordinated with R.7 / T262).
5. Control-matrix rows; update README to stop claiming "FAPI 2.0 — Done" until this ships.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.2.1** Given a `cnf.x5t#S256`-bound access token and a request presenting **no** client cert (or
  a non-matching one), when validated with binding required, then rejection.
- **AC-R.2.2** Given a `cnf.jkt`-bound token and a DPoP proof whose key thumbprint differs, when
  validated, then rejection (RFC 9449 §6.1).
- **AC-R.2.3** Given `audience="api-a"` and a token with `aud=["api-a","untrusted-b"]`, when validated
  with strict audience, then rejection.
- **AC-R.2.4** Given each enforcement, when its line is deleted, then a `src/tests/security/` test fails.
- **AC-R.2.5** Given the conformance RP, when it validates the `invalid-secondary-aud` module, then the
  rejection comes from the library's public API, not harness glue.

---

### Story R.3: Enforce `verify_aud` / `verify_iss` and require `exp`

```yaml
story_id: R.3
task_id: T258
title: "Make verify_aud & verify_iss non-disableable (when configured) and require exp"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: high
estimation: S
audit_refs: [RT4-F3, RT4-F4, RT-SPOOF-F2]
```

**User Story**

> As a resource server,
> I want audience and issuer verification to be non-disableable when I have configured them, and `exp` to
> be required,
> so that a caller cannot footgun audience/issuer confusion and a token with no expiry is never accepted.

**Description**

`_ENFORCED_VERIFICATION_OPTIONS` (`core/jwt_helpers.py:29-36`) protects `verify_signature/exp/nbf/iat`
but **omits `verify_aud` and `verify_iss`**, so `options={"verify_aud": False}` accepts a token minted for
another audience (proven) and `options={"verify_iss": False}` silently drops the issuer guardrail
(RT-SPOOF-F2). Separately, no `require=['exp']` is set, so a token with no `exp` claim never expires
(proven).

**Deliverables**

1. Add `verify_aud` and `verify_iss` to `_ENFORCED_VERIFICATION_OPTIONS` **when an audience / issuer is
   configured** (cannot be silently disabled via `options`).
2. Set PyJWT `require=['exp']` (and consider `iat`) so missing `exp` fails closed.
3. **Fail-closed tests**: `options={"verify_aud":False}`/`{"verify_iss":False}` still reject a wrong
   `aud`/`iss`; token with no `exp` rejected. Control-matrix rows.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.3.1** Given `options={"verify_aud": False}` with `audience` set and a token for a different
  audience, when validated, then rejection.
- **AC-R.3.2** Given `options={"verify_iss": False}` with `issuer` set and a token from a different issuer,
  when validated, then rejection.
- **AC-R.3.3** Given a token with no `exp` claim, when validated, then rejection.
- **AC-R.3.4** Given each control, when removed, then a `src/tests/security/` test fails.

---

### Story R.4: DPoP on refresh-token & client-credentials grants

```yaml
story_id: R.4
task_id: T259
title: "Thread DPoP proofs through refresh and client-credentials grants"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: high
estimation: M
audit_refs: [RT3-F7, RT3-F8]
```

**User Story**

> As a DPoP client,
> I want DPoP proofs on the refresh-token and client-credentials grants,
> so that my key-bound session survives past the first token and service-to-service clients can obtain
> sender-constrained tokens (no silent downgrade to bearer).

**Description**

`RefreshTokenRequest` and `ClientCredentialsTokenRequest` have no `dpop_key`; their `prepare_*` paths
(`token_client_logic.py:220`, `:59`) attach no proof/nonce. RFC 9449 §5 requires a proof on the refresh
request for a DPoP-bound refresh token; without it a compliant AS rejects the refresh or silently issues
a non-bound token.

**Deliverables**

1. Add `dpop_key` to both request models; attach a fresh proof + nonce-retry (mirror the auth-code path)
   in both **sync and async**.
2. **Fail-closed / behavior tests** + integration coverage against the node-oidc-provider DPoP config.
   Control-matrix rows.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.4.1** Given a DPoP-configured refresh request, when built, then it carries a valid DPoP proof
  (`htm=POST`, correct `htu`, fresh `jti`/`iat`) and handles `use_dpop_nonce` with exactly one retry.
- **AC-R.4.2** Given a DPoP-configured client-credentials request, when built, then it carries a valid
  proof; sync and async are at parity (asserted).
- **AC-R.4.3** Given the proof-attachment removed, then a test fails.

---

### Story R.5: Basic-auth percent-encoding correctness

```yaml
story_id: R.5
task_id: T260
title: "Prove/guard the Basic-auth percent-encoding change"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: medium
estimation: S
audit_refs: [RT3-F9]
```

**User Story**

> As a confidential client with reserved characters in my secret,
> I want the library's Basic-auth encoding proven against a non-form-decoding AS,
> so that the #482 change to `quote(..., safe="")` (`client_auth.py:24`) does not silently break my
> client authentication.

**Description**

#482 now percent-encodes all confidential Basic-auth credentials. Justified by RFC 6749 §2.3.1, but
general HTTP Basic (RFC 7617) treats userid:password as raw UTF-8; an AS that does not additionally
form-decode will see a mangled secret (e.g. `a+b/c%d` → `a%2Bb%2Fc%25d`) and return 401. No integration
test proves the round-trip; the change governs token/PAR/introspection/revocation/device auth.

**Deliverables**

1. Integration test proving Basic auth succeeds against a server following RFC 6749 §2.3.1 form-encoding,
   with a secret containing `% + / : space`.
2. Decision + doc note (and, if warranted, config) on RFC 6749 vs RFC 7617 behavior; regression test
   locking the chosen behavior. Control-matrix row.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.5.1** Given a confidential client whose secret contains reserved chars, when it authenticates
  against the (form-decoding) test AS, then auth succeeds and the decoded secret round-trips.
- **AC-R.5.2** Given the encoding behavior, when changed, then a test fails (behavior is locked).

---

### Story R.6: mTLS endpoint-alias routing & real cert-presentation test

```yaml
story_id: R.6
task_id: T261
title: "Auto-apply mtls_endpoint_aliases and test cert presentation for real"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: medium
estimation: M
audit_refs: [RT1-F2, RT1-F3]
```

**User Story**

> As an mTLS client talking to an AS that segregates mTLS onto aliased endpoints,
> I want requests routed to `mtls_endpoint_aliases` automatically and cert presentation actually tested,
> so that cert-bound issuance happens and a regression that stops loading the cert is caught.

**Description**

`resolve_mtls_endpoint` (`core/mtls.py:222`) exists but no request path calls it. And
`test_returns_ssl_context_with_client_cert_loaded` only asserts `isinstance(SSLContext)` — deleting
`load_cert_chain` keeps it green (the integration test that would catch it is skipped).

**Deliverables**

1. Route token/PAR/introspection/revocation through `mtls_endpoint_aliases` when mTLS is configured and
   the alias is advertised.
2. A **fail-closed** cert-presentation test (assert the built context actually presents the client cert /
   `load_cert_chain` was called) + an integration path against an mTLS-capable fixture, or a documented
   gap per the IdentityServer-gap precedent. Control-matrix rows. Remove dead `build_httpx_cert`.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.6.1** Given mTLS configured and `mtls_endpoint_aliases.token_endpoint` advertised, when a token
  request is issued, then it targets the alias.
- **AC-R.6.2** Given `load_cert_chain` removed from `build_mtls_ssl_context`, then a test fails.

---

### Story R.7: Conformance evidence integrity

```yaml
story_id: R.7
task_id: T262
title: "Make new-profile conformance real: gating, honest pass, library-side checks"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: critical
estimation: L
audit_refs: [RT5-F13, RT5-F14, RT5-F15, RT5-F16, RT5-F17, RT5-F18, RT5-F19]
```

**User Story**

> As the maintainer,
> I want the new profiles' conformance "green" to be produced by a gating CI job (or a hosted run),
> so that "green" is reproducible evidence a control works, not static local JSON.

**Description**

Six of nine profiles run in **no** CI workflow — their green is static committed local-suite JSON
(`results/*-latest.json`), in a repo with a documented fabricated-results precedent (`4bfe2dd`).
`config-rp` is `continue-on-error`; `PASSING_STATUSES` counts `WARNING`/`SKIPPED` as pass
(`run_tests.py:1045`); `request-uri-signed-none` is force-skipped in the harness; and a real library gap
(secondary-`aud`) is patched in harness glue.

**Deliverables**

1. CI-gate `backchannel-logout-rp`, `rpinitiated-logout-rp`, `dynamic-rp`, `fapi2-rp`,
   `fapi2-message-signing-rp`, `fapi2-mtls-rp` (or clearly label them "local-only, not evidence").
2. Remove `config-rp` `continue-on-error` (or scope the exemption to the one flaky test, not the profile).
3. Drop `WARNING`/`SKIPPED` from `PASSING_STATUSES`; make declared non-support explicit and out of the
   pass count.
4. Move harness-only library checks (secondary-`aud`, per R.2) into the library.
5. Regenerate result artifacts from a gated run; document provenance.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.7.1** Given a deliberately introduced regression in a FAPI2/logout/dynamic control, when CI
  runs, then the build goes red (proving the profile is gated).
- **AC-R.7.2** Given a `config-rp` failure, when CI runs, then the build fails (no `continue-on-error`
  masking the whole profile).
- **AC-R.7.3** Given `PASSING_STATUSES`, when reviewed, then `WARNING`/`SKIPPED` are not counted as pass.

---

### Story R.8: Blue-team artifacts — security test suite & control matrix

```yaml
story_id: R.8
task_id: T263
title: "Establish src/tests/security/ and docs/security/control-matrix.md"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: high
estimation: S
audit_refs: []
```

**User Story**

> As the maintainer,
> I want a dedicated fail-closed security test package and a control matrix,
> so that "green conformance" is never the only proof — every control has a mutation test and a
> traceable row.

**Description**

Establish the durable blue-team artifacts referenced by every other story: `src/tests/security/`
(fail-closed / mutation tests, wired into `make test`) and `docs/security/control-matrix.md`
(control → RFC → attack → proving test → shipped status). This story creates the scaffolding + CI wiring;
R.1–R.7 populate it.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.8.1** Given `make test`, when run, then `src/tests/security/` is collected and executed.
- **AC-R.8.2** Given `docs/security/control-matrix.md`, when reviewed, then every control from R.1–R.7 has
  a row linking its RFC and its proving test, with a shipped-status column.

---

### Story R.9: First-class issuer pinning / allowed-issuer allowlist (multi-tenant spoof defense)

```yaml
story_id: R.9
task_id: T264
title: "Enforce an approved-issuer allowlist before trusting discovery"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: high
estimation: M
audit_refs: [RT-SPOOF-F1]
```

**User Story**

> As a multi-tenant resource server,
> I want to pin an approved issuer (or set) that is checked before the library trusts a discovery document,
> so that an attacker who stands up their own tenant/issuer and mints a validly-signed token cannot pass
> validation simply because my middleware resolved discovery from the token's own `iss`.

**Description**

Round-2 spoof finding (RT-SPOOF-F1) — the strongest answer to the "tokens for different subs/tenants +
spoofed tokens" concern. The library binds `iss` to whatever discovery the caller points `disco_doc_address`
at (`token_validation_logic.py:133-140`, sync/aio), but offers **no approved-issuer set**. The idiomatic
multi-tenant pattern (read `iss` from the untrusted token → build `disco_doc_address` → `validate_token`)
lets an attacker mint a perfectly-signed token at `https://api.descope.com/v1/apps/ATTACKER`; the library
fetches the attacker's discovery + JWKS, `iss` matches, the signature verifies, and validation **succeeds**.
Only the app's own `iss`→authorization mapping stands between that and cross-tenant access. Given this
project's Descope multi-tenant context (two issuer formats, `dct`/`tenants` claims), this is a live footgun.

**Deliverables**

1. Add `allowed_issuers` (or a required-issuer allowlist) to `TokenValidationConfig`, checked against
   `disco_doc_response.issuer` **before** trusting the discovery result in discovery mode; reject when the
   resolved issuer is not in the allowlist — fail closed.
2. Refuse (or loudly warn) when `disco_doc_address` is derived from the untrusted token without an
   `allowed_issuers` guard.
3. Prominent security docs + a worked **safe multi-tenant** example (allowlist the tenant issuers; never
   trust the token's `iss` to select discovery unchecked).
4. **Fail-closed tests** (`src/tests/security/test_cross_tenant_issuer.py`): a validly-signed token from an
   attacker issuer not in `allowed_issuers` is rejected even though signature + `iss`-vs-own-discovery would
   otherwise pass.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.9.1** Given `allowed_issuers={A}` and a validly-signed token from issuer B (attacker tenant) whose
  own discovery/JWKS verify the signature, when validated, then rejection.
- **AC-R.9.2** Given `allowed_issuers` enforcement removed, then a `src/tests/security/` test fails.
- **AC-R.9.3** Given the docs, when reviewed, then they show the safe multi-tenant allowlisting pattern and
  warn against deriving discovery from the untrusted `iss`.

---

### Story R.10: Require `sub` presence on the ID-token surface

```yaml
story_id: R.10
task_id: T265
title: "Require sub by default when validating ID tokens"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: medium
estimation: S
audit_refs: [RT-SUB-F1]
```

**User Story**

> As a resource server validating ID tokens,
> I want `sub` required by default,
> so that a token with no `sub` is rejected (OIDC Core requires `sub` on ID tokens).

**Description**

Round-2 subject finding (RT-SUB-F1). Subject *matching* is solid and wired, but the low-level
`validate_token` does **not require `sub` to be present** by default — the check is gated on
`subject is not None` and no default `require` is set, so a token with no `sub` is accepted (proven). The
FastAPI RP already sets `require: ["sub","iat","exp"]`; the gap is the bare core validator.

**Deliverables**

1. Add `require_sub: bool = True` to `TokenValidationConfig` (or default `require: ["sub"]` on the ID-token
   path) so a missing `sub` fails closed.
2. Update `test_subject_none_skips_validation`, which currently **locks in** the permissive behavior.
3. **Fail-closed test**: a token with no `sub` is rejected under default config. Control-matrix row.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.10.1** Given default config (`require_sub=True`) and a token with no `sub`, when validated, then
  rejection.
- **AC-R.10.2** Given `require_sub` removed, then a `src/tests/security/` test fails.

---

### Story R.11: Reject or exhaustively try duplicate/colliding `kid`

```yaml
story_id: R.11
task_id: T266
title: "Handle duplicate kid safely (no silent first-match-wins)"
epic: EPIC-16-AUDIT-REMEDIATION
status: draft
priority: low
estimation: S
audit_refs: [RT-SPOOF-F3]
```

**User Story**

> As a resource server,
> I want colliding `kid`s in a JWKS handled deterministically,
> so that a legitimate key is never skipped (availability) and no weaker colliding key can be silently
> preferred.

**Description**

Round-2 spoof finding (RT-SPOOF-F3). `find_key_by_kid` (`parsers.py:204-213`) picks `filtered_keys[0]` on a
`kid` match and never iterates — if the first fails, the legitimate second key is never tried. Fail-closed
for honest tokens (availability), a forgery vector only if an attacker can land a colliding-`kid` key ahead
of the legit one in the trusted JWKS.

**Deliverables**

1. On duplicate `kid`: either reject with an explicit error, or try all colliding candidates that pass
   alg-consistency until one verifies — never silently pick index 0.
2. Negative test for simultaneous duplicate-`kid`. Control-matrix row.

**Acceptance Criteria (Given/When/Then)**

- **AC-R.11.1** Given a JWKS with two keys sharing a `kid` where only the second validates the token, when
  validated, then it verifies (try-all) or the duplicate is explicitly rejected — never a silent index-0-only
  failure.
- **AC-R.11.2** Given the behavior, when regressed to first-match-only, then a test fails.

---

## Unit Test Requirements (shared)

- Every story adds at least one **mutation-style fail-closed test** under `src/tests/security/` that
  fails if the fix is reverted. The PR records the mutation check (delete guard → test red → restore).
- No shallow constructor/dataclass tests count toward a control's coverage.

## Integration Test Requirements (shared)

- Sender-constraint (R.2), DPoP grants (R.4), Basic-auth (R.5), and mTLS routing (R.6) require real
  protocol round-trips against the node-oidc-provider fixture (or a documented gap). Services via
  docker-compose, not in-code.

## Dependencies & Sequencing

- Priority: **R.8 (scaffolding) → R.1 → R.9 → R.2 → R.3 → R.7 → R.6 → R.4 → R.10 → R.5 → R.11.**
  R.1 (alg-confusion) and R.9 (multi-tenant issuer pinning) are the highest-impact spoof/forgery defenses.
- R.2 and R.7 are coupled (secondary-`aud` moves from harness to library).
- Gates hosted OIDF certification (#242, #475) — cert stays paused until R.1–R.3, R.7, R.9 land.
- Prefer in-session **stacked PRs** for R.1/R.3/R.8/R.10/R.11; larger clusters (R.2/R.7/R.9) may use `pim-shipped-audit.md`.
- Mechanical enforcement of every R.x fail-closed test is delivered by **Epic 19** (`make security-gate`).

## Spec and RFC References

- [RFC 8705 mTLS](https://datatracker.ietf.org/doc/html/rfc8705) §3 (certificate-bound tokens)
- [RFC 9449 DPoP](https://datatracker.ietf.org/doc/html/rfc9449) §5 (grants), §6.1 (`cnf.jkt`)
- [RFC 9126 PAR](https://datatracker.ietf.org/doc/html/rfc9126) §5 (endpoint discovery)
- [RFC 9207 iss](https://datatracker.ietf.org/doc/html/rfc9207)
- [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) §2.3.1 (Basic auth encoding) / [RFC 7617](https://datatracker.ietf.org/doc/html/rfc7617)
- [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-2_0-security-profile.html)
- Related issues: #476 (FAPI2 hardening epic), #478 (RS-side DPoP), #242 (RP cert tracking), #475 (FAPI2 cert)
