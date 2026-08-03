---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'EPIC-17-ATTACKER-MODEL'
epic_title: 'FAPI 2.0 Attacker-Model Adversarial Test Suite & Controls'
date: '2026-08-02'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/epics/epic-16-audit-remediation.md
  - _bmad-output/planning-artifacts/epics/epic-19-mechanical-security-gates.md
  - _bmad-output/implementation-artifacts/ralph-prompts/RED-BLUE-GATE.md
---

# Epic 17: FAPI 2.0 Attacker-Model Adversarial Test Suite & Controls

## Overview

Today's tests answer "does the happy path work." This epic answers "does the library defend against an
attacker with each capability the [FAPI 2.0 Attacker Model](https://openid.net/specs/fapi-2_0-attacker-model.html)
grants." The suite is organized **one test class per attacker capability**; each test *is* an attack; the
2026-08-02 red/blue audit (round 1 + round 2) already tells us which defenses hold and which are missing, so
this epic both **codifies the attacks as permanent regressions** and **introduces the missing controls**.

It builds on Epic 16 (which fixes the confirmed gaps) and is enforced by Epic 19 (mutation testing proves
each attack test is real). All tests live under `src/tests/security/attacker_model/`, and a coverage matrix
`docs/security/attacker-model-coverage.md` (attacker capability → attack → control → proving test → status)
replaces non-reproducible conformance "green" as the definition of "FAPI-secure."

### Attacker capabilities → coverage map

| Capability (FAPI 2.0 Attacker Model) | Attack vs the library | Control | Audit status |
|---|---|---|---|
| Leaked/stolen access token | Replay a sender-constrained token as plain bearer | RS enforces `cnf.x5t#S256`/`cnf.jkt` | ❌ (R.2) |
| Token forgery | alg confusion (RS↔HS, `none`, downgrade), signature bypass | alg pinned to allowlist by the library; sig unconditional | ⚠ alg (R.1); sig SOLID |
| Cross-tenant / mix-up | Validly-signed token from attacker's own tenant/issuer | `allowed_issuers` pinning + RFC 9207 `iss` | ❌ pinning (R.9); iss SOLID |
| Subject substitution | Token for `sub` X used where Y expected / no `sub` | `subject` match + `require_sub` | ✅ match; ❌ require (R.10) |
| Auth-response leak / code injection | Code injection; JARM tamper | PKCE S256, `iss`, nonce, `dpop_jkt`, JARM sig | ✅ mostly; ⚠ `dpop_jkt` non-PAR |
| Replay | Long-lived/no-`exp` token; response replay | `require exp`, max lifetime, `state`/`jti` | ❌ require exp (R.3); no max-lifetime |
| Network / endpoint | HTTP downgrade; header-embedded key; `jku` SSRF | HTTPS-enforced, authority-pinned, no header keys | ✅ SOLID (add tests) |
| Front-channel leak | Request params in logs/referrer | PAR keeps request off front channel | ✅ (add test) |

## Stories

---

### Story A.1: Leaked-token attacker — sender-constraint enforcement tests

```yaml
story_id: A.1
title: "Attacker with a leaked token cannot replay it unbound"
epic: EPIC-17-ATTACKER-MODEL
status: draft
priority: high
estimation: M
depends_on: [EPIC-16.R.2]
```

**User Story**

> As a red-team test author,
> I want tests proving a leaked cert-bound / DPoP-bound token cannot be replayed as a plain bearer,
> so that the sender-constraint control (Epic 16 R.2) is permanently guarded against regression.

**Deliverables**

- `test_leaked_token_replay.py`: cert-bound token presented without the matching cert → rejected;
  DPoP-bound token with a mismatched proof key (`cnf.jkt`) → rejected; a bound token stripped to a bare
  bearer at an RS configured to require binding → rejected.

**Acceptance Criteria**

- **AC-A.1.1** Given a `cnf`-bound token and no/mismatched sender proof, when validated with binding
  required, then rejection; the test fails if R.2 enforcement is reverted (verified by Epic 19 mutation).

---

### Story A.2: Token-forgery attacker — alg confusion, downgrade, signature & header-key spoof

```yaml
story_id: A.2
title: "Attacker cannot forge a token via alg confusion, downgrade, or header-embedded keys"
epic: EPIC-17-ATTACKER-MODEL
status: draft
priority: critical
estimation: M
depends_on: [EPIC-16.R.1]
```

**User Story**

> As a red-team test author,
> I want the classic forgery vectors codified as attacks,
> so that RS↔HS confusion, `alg:none`, allowlist downgrade, unsigned tokens, and header-embedded keys are
> permanently rejected by the library itself.

**Deliverables**

- `test_forgery.py`: RS→HS confusion (HMAC-signed with the OP RSA public key) → rejected by the library
  (not just PyJWT); `alg:none` → rejected; caller allowlist downgrade → rejected; token-header
  `jwk`/`jku`/`x5u`/`x5c` → ignored (regression lock for the SOLID behavior); tampered signature → rejected.

**Acceptance Criteria**

- **AC-A.2.1** Given each forgery vector, when validated, then rejection with `TokenValidationException`;
  each test fails if the corresponding R.1 control is reverted.

---

### Story A.3: Cross-tenant / mix-up attacker — issuer pinning

```yaml
story_id: A.3
title: "Attacker's own tenant token is rejected under issuer pinning"
epic: EPIC-17-ATTACKER-MODEL
status: draft
priority: critical
estimation: M
depends_on: [EPIC-16.R.9]
```

**User Story**

> As a red-team test author working in a multi-tenant (Descope) context,
> I want tests proving a validly-signed token from an unapproved issuer/tenant is rejected,
> so that the cross-tenant confusion footgun (RT-SPOOF-F1) is closed and guarded.

**Deliverables**

- `test_cross_tenant.py`: token minted at attacker tenant B, presented to an RS with `allowed_issuers={A}`
  (or resolving discovery from the untrusted `iss`) → rejected; RFC 9207 `iss` mix-up (two AS) → rejected;
  `verify_iss:False` cannot suppress a configured issuer check; same-`sub` different-tenant token → rejected
  when tenant scoping is configured.

**Acceptance Criteria**

- **AC-A.3.1** Given `allowed_issuers={A}` and a validly-signed token from B whose own discovery verifies
  the signature, when validated, then rejection; the test fails if R.9 pinning is reverted.

---

### Story A.4: Auth-response leak / code-injection attacker

```yaml
story_id: A.4
title: "Attacker cannot inject a code or tamper the authorization response"
epic: EPIC-17-ATTACKER-MODEL
status: draft
priority: high
estimation: M
```

**User Story**

> As a red-team test author,
> I want code-injection and response-tamper attacks codified,
> so that PKCE, `iss`, nonce, `dpop_jkt`, and JARM signature binding are proven and any missing binding
> (the non-PAR `dpop_jkt`) is added as a control.

**Deliverables**

- `test_code_injection.py`: injected/swapped `code` without matching PKCE verifier → rejected; JARM with a
  tampered signature / wrong `iss`/`aud` → rejected; mix-up via `iss` → rejected.
- **New control:** emit/verify `dpop_jkt` on the non-PAR auth-code+DPoP flow (RT3-F10), with a test that a
  code not bound to the DPoP key is rejected where the flow requires it.

**Acceptance Criteria**

- **AC-A.4.1** Given a code-injection attempt without the PKCE verifier, when the token request is built,
  then rejection.
- **AC-A.4.2** Given the non-PAR auth-code+DPoP flow, when the URL is built, then `dpop_jkt` is present.

---

### Story A.5: Replay attacker — expiry, max-lifetime, single-use

```yaml
story_id: A.5
title: "Attacker cannot replay stale or non-expiring tokens/responses"
epic: EPIC-17-ATTACKER-MODEL
status: draft
priority: high
estimation: M
depends_on: [EPIC-16.R.3]
```

**User Story**

> As a red-team test author,
> I want replay windows codified,
> so that a no-`exp` token, an over-long-lived token/response, and a replayed `state` are rejected.

**Deliverables**

- `test_replay.py`: token with no `exp` → rejected (R.3 / R.10 require); expired token → rejected;
  JARM/response with an implausibly long lifetime → rejected by a **new max-lifetime control**; replayed
  `state` → rejected.
- **New control:** configurable max token/response lifetime (RT2 hardening note).

**Acceptance Criteria**

- **AC-A.5.1** Given a token whose `exp` exceeds the configured max lifetime, when validated, then rejection.
- **AC-A.5.2** Given a no-`exp` token, when validated, then rejection.

---

### Story A.6: Network / endpoint attacker + front-channel leak

```yaml
story_id: A.6
title: "Transport-downgrade, SSRF, and front-channel-leak resistance"
epic: EPIC-17-ATTACKER-MODEL
status: draft
priority: medium
estimation: M
```

**User Story**

> As a red-team test author,
> I want transport/SSRF and front-channel attacks codified,
> so that the currently-SOLID (but untested-in-conformance) HTTPS enforcement, authority pinning, and PAR
> confidentiality are permanently guarded.

**Deliverables**

- `test_transport_ssrf.py`: `http://` discovery/JWKS with `require_https=True` → rejected; `file://`/`jku`
  SSRF → rejected; discovery advertising a JWKS on a foreign authority → rejected (authority pinning).
- `test_front_channel.py`: PAR keeps the request off the front channel (no sensitive params in the redirect).
- Also add a **JARM response-mode-downgrade guard** (RT2-LOW): reject a plain callback when JARM was required.

**Acceptance Criteria**

- **AC-A.6.1** Given `require_https=True` and an `http://` JWKS, when discovery runs, then rejection.
- **AC-A.6.2** Given a discovery doc pointing `jwks_uri` at a foreign authority, when processed, then
  rejection.

---

### Story A.7: Attacker-model coverage matrix & harness

```yaml
story_id: A.7
title: "Coverage matrix, Hypothesis fuzzing, and the attacker-model harness"
epic: EPIC-17-ATTACKER-MODEL
status: draft
priority: high
estimation: M
depends_on: [EPIC-19.G.6]
```

**User Story**

> As the maintainer,
> I want a single coverage matrix and a property-fuzzed harness,
> so that "FAPI-secure" is a traceable, mechanically-verified claim, not a green screenshot.

**Deliverables**

- `docs/security/attacker-model-coverage.md`: every capability → attack → control → proving test → status.
- Hypothesis strategies (from Epic 19 G.6) generating hostile tokens across `alg`/`kid`/`iss`/`aud`/`sub`/
  `exp` permutations, asserting the invariant "no token violating a configured restriction is ever accepted."
- CI: the attacker-model suite runs in `make test` and is covered by mutation testing (Epic 19 G.1).

**Acceptance Criteria**

- **AC-A.7.1** Given the coverage matrix, when reviewed, then every FAPI 2.0 Attacker-Model capability has at
  least one attack test with a linked control and status.
- **AC-A.7.2** Given the Hypothesis suite, when a fail-open is reintroduced, then it finds a falsifying case.

---

## Dependencies & Sequencing

- A.2/A.3 depend on Epic 16 R.1/R.9 (fix first, then lock with attack tests). A.1/A.5 depend on R.2/R.3.
- A.7 depends on Epic 19 G.6 (Hypothesis) + G.1 (mutation).
- This epic is the durable replacement for non-reproducible conformance evidence and feeds `#475`/`#242`.

## Spec References

- [FAPI 2.0 Attacker Model](https://openid.net/specs/fapi-2_0-attacker-model.html)
- [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-2_0-security-profile.html)
- [RFC 9207 iss](https://datatracker.ietf.org/doc/html/rfc9207), [RFC 9449 DPoP](https://datatracker.ietf.org/doc/html/rfc9449), [RFC 8705 mTLS](https://datatracker.ietf.org/doc/html/rfc8705), [RFC 9126 PAR](https://datatracker.ietf.org/doc/html/rfc9126)
- Related: Epic 16 (remediation), Epic 19 (gates), #476, #475, #242
