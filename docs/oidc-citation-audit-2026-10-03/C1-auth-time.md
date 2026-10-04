# C1-auth-time — auth_time/max_age miscited as "§3.1.3.7 step 12"

**Verdict:** the problem is in the documentation only. The code is correct and behaves the same in all three languages. One sweep fixes it, in a single `docs:` PR (size S). No behavior change, so Cognito is not affected.

## 1. What the spec says (Core 1.0 errata set 2, `specs/openid-connect-core-1_0.txt`)

- `:1043` step 11 is nonce (MUST). The existing "step 11" citations are correct.
- `:1044` step 12: "If the **acr** Claim was requested, the Client SHOULD check that the asserted Claim Value is appropriate."
- `:1045` step 13: "If the **auth_time** Claim was requested, either through a specific request for this Claim or by using the max_age parameter, the Client **SHOULD** check the auth_time Claim value and request re-authentication if it determines too much time has elapsed..."
- `:450` §2 auth_time: "When a max_age request is made or when auth_time is requested as an Essential Claim, then this Claim is **REQUIRED**; otherwise, its inclusion is OPTIONAL."
- `:673` §3.1.2.1 max_age: "When max_age is used, the ID Token returned **MUST** include an auth_time Claim Value."

So the presence requirement is an OP MUST (§2, §3.1.2.1). An RP that rejects a token missing auth_time is enforcing that MUST. The freshness reject is the RP's SHOULD in step 13.

**1.0 (2014) vs errata 2:** both editions number the steps the same way (11 nonce, 12 acr, 13 auth_time), and the §2 and §3.1.2.1 wording is the same. Nothing about this cluster changed between them.

## 2. Is enforcement opt-in? Does it fit the policy?

Yes. Every check is gated on the caller passing max_age:
- py `core/id_token_logic.py:210` `if max_age is not None:`
- go `idtoken.go:92` `if cfg.maxAgeSet`
- rust `id_token.rs:323` `if let Some(max_age) = options.max_age`

No library code path passes max_age implicitly. The only callers are the public `sync/aio id_token.py:86` pass-throughs, and the `conformance/` RP app never uses it. The default is off.

How this fits the brief's policy:
- The freshness reject puts a SHOULD into practice when the caller asks for it. That is opt-in hardening, default off, which is consistent.
- The missing-auth_time reject enforces the §2/§3.1.2.1 MUST, and that MUST only exists once max_age has been sent. "Requested max_age" is exactly the caller passing max_age, so gating on it is not an off-switch on a MUST. Consistent.

**Cognito:** behavior is unchanged. Cognito ID tokens carry auth_time anyway.

## 3. Do the names, reasons or vectors encode "step 12"?

No.
- Reason labels are `auth_time_stale` and `auth_time_missing` (go `errors.go:28,31`, vector `id-token.json:405,426`, py `test_id_token_conformance.py:61-62`, rust `tests/spec_conformance_id_token.rs:116`). They name the rule, not a step.
- The vector ID is `IDT-006`, and its `references` entry is just "OIDC Core 1.0 §3.1.3.7".
- The only machine-readable artifact with "step 12" in it is the `then` prose at `spec/vectors/id-token.json:340`. None of the runners read `then`: I grepped the py, go and rust runners and found no access. Fixing it is a text change only, and no runner or vector outcome changes.

## 4. Every instance (28 citations of "step 12"), all DOC-ONLY

| Lang | file:line |
|---|---|
| py src | `py/src/py_identity_model/sync/id_token.py:61`, `aio/id_token.py:61`, `core/id_token_logic.py:16,167,209` |
| py tests | `py/src/tests/unit/test_id_token_validation.py:207,214,222,238`; `py/src/tests/integration/test_id_token_validation.py:41`; `py/src/tests/integration/conftest.py:1023` |
| go | `go/pkg/idtoken/doc.go:14`; `errors.go:27,29-30`; `idtoken.go:91,147`; `options.go:30,123,133`; `idtoken_test.go:177`; `idtoken_integration_test.go:25,223` |
| rust | `rust/src/jwt/id_token.rs:13,157,322`; `rust/tests/id_token_validation.rs:55` |
| spec | `spec/vectors/id-token.json:340` (`§3.1.3.7 step 12`) |
| docs/node/conformance | none. `docs/api/id-token.md:13` says "must be present and recent enough" with no citation, which is fine |

The "MUST be present" docstrings sit next to the citation and also fold the SHOULD freshness check into a MUST:
- py `sync/aio id_token.py:60-61`, `id_token_logic.py:166-167`
- go `options.go:122-123`
- rust `id_token.rs:156-157`
- vector `:340`

Replacement text: "auth_time required when max_age is requested (Core §2, §3.1.2.1); freshness `now - auth_time <= max_age + leeway` per §3.1.3.7 step 13 (SHOULD), enforced only when max_age is passed."

## 5. Cross-language parity

The behavior matches: missing or non-numeric (including bool) auth_time is rejected, and stale is `>`. A minor note: rust truncates float auth_time/now to integer seconds (`numeric_seconds`, `id_token.rs:239-247`), while py and go compare in floats. With integer max_age+leeway the verdicts are the same, so no vector diverges. This does not need fixing.

## 6. Existing issues and PRs

- No existing issue covers the citation problem.
- [#652](https://github.com/jamescrowley321/identity-model/issues/652) (open) covers rust surviving mutants, including the `>`/`>=` boundary at `id_token.rs:332`. It touches the same lines but is behavior and test work, not citations. There is a possible merge conflict on `id_token.rs`; whichever lands second rebases.
- Origin PRs: [#629](https://github.com/jamescrowley321/identity-model/pull/629) (py), [#630](https://github.com/jamescrowley321/identity-model/pull/630) (vectors), [#631](https://github.com/jamescrowley321/identity-model/pull/631) (rust), [#632](https://github.com/jamescrowley321/identity-model/pull/632) (go).

## 7. Story

**S1: `docs: cite auth_time/max_age as Core §2/§3.1.2.1 (presence) + §3.1.3.7 step 13 (freshness)`** (size S, no dependencies)
- **Scope:** the 28 sites in section 4, plus the MUST-wording docstrings. Comments, docstrings and the vector `then` text only.
- **AC1:** Given the repo, when I run `grep -rnE 'step 12' py go rust spec`, then no hit refers to auth_time or max_age.
- **AC2:** Given `spec/vectors/id-token.json` IDT-006, when I read `then`, then it cites §2/§3.1.2.1 for presence and step 13 for freshness, and every vector's `expect` is byte-identical to before.
- **AC3:** Given unit, conformance and integration in all three languages, when they run, then they pass with no test logic changed.
- **Tests:** none added. This is a doc-only diff.
- **Optional:** fold into the same PR as the C-azp sibling cluster (audit items 2-4), since that cluster touches the same files. Coordinate with whichever agent owns it.

## Surprises (outside this cluster, for other cluster owners)

1. In the same functions, azp is cited as "steps 4-6" and "step 6". The spec has azp at steps 4-5; step 6 is TLS. These are audit items 2-3, owned by another cluster.
2. **Typed-errors rule:** py (`IdTokenValidationException`) and rust (`IdentityError::IdTokenValidation(String)`) carry no reason enum. Their conformance runners map each reason label to a message substring (py `test_id_token_conformance.py:52-63`, rust `spec_conformance_id_token.rs:116`), which is the magic-string coupling the policy forbids. Only go has the `Reason*` constants, and those are strings, not an enum type. This is a candidate for a separate behavior or API story and is not part of C1.
3. No spec vector pins the exact boundary `now - auth_time == max_age + leeway` (accept). #652 found the same gap for rust only. Adding that vector would pin it in all three languages. It belongs to #652, not C1.
