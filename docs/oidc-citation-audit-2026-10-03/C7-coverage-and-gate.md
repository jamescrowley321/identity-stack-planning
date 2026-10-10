# C7: coverage gaps and a mechanical citation gate

Repo: im-audit @ 1e3b6a6. Specs: scratchpad/specs/*.txt (Core = errata set 2).
Prototype gate: `scratchpad/c7/proto/check_oidc_citations.py` (136 lines) and `scratchpad/c7/proto/*.tsv` (section index with anchors, 10 specs). Run output: `scratchpad/c7/proto/gate_run_1e3b6a6.txt`.

## Part 1: completeness

### How the sweep was done
- I diffed `allrefs.txt` against `oidc_cand.txt`. 576 lines were excluded from the candidates. I checked every excluded line for an OIDC spec name, a Core-only section number (3.1.3.x, 3.3.2.x, 5.3.x, 10.1), or a bare § line with no RFC named. **Nothing OIDC was lost by the RFC filter.** Every excluded line cites an RFC, JARM, FAPI or a design doc. Multi-line citations, where "OIDC Core 1.0" ends one line and "§x" starts the next, were all in the candidate list.
- Non-grepped file types (sh, yml, yaml, txt, html, Makefile, conf, tf, cs, Dockerfile; 95 files): **no OIDC section citations.** The only `.js` citation is provider.js:134 (Core §9), which was already in the candidate list. `node/` holds only package.json, moon.yml and README; it has no citations. Rust doc comments are `.rs` files and were already covered.
- No-§ forms ("Core 5.3.4", "Discovery 4.3", "Core 1.0, 5.3"), `§` in JSON, openid.net `#anchor` links, and continuation lines of the form "step N": I used a regex sweep plus the prototype gate.
- Other OIDC-family specs: Front-Channel, Session Management, Prompt Create, Form Post and Multiple Response Types are **named only, never cited by section** (for example validators.py:116 "Multiple Response Types 1.0", fastapi rp.py:16 `form_post`). FAPI text never cites an OIDC section, except conformance/app.py:1303 "FAPI 2.0 / OIDC Core 1.0 §3.1.3.7", which is correct (step 3, extra untrusted audiences). Registration code cites RFC 7591/7592 only. RP-Initiated §2/§3 citations (logout_logic.py:10,38,119,132; exceptions.py:112; models.py:600; response_processors.py:401; conformance/app.py:316,1798,1807,1847; run_tests.py:326) are all correct. Nit: `end_session_endpoint` is defined in §2.1, but citing the parent §2 is acceptable.

### Missed citations: incorrect
| # | file:line | text | spec reading | maps to audit item |
|---|---|---|---|---|
| M1 | go/pkg/idtoken/errors.go:30 | "(§3.1.3.7 ⏎ step 12)" auth_time_missing | step 13 is auth_time/max_age; 12 is acr | #1. The audit lists :29, but the wrong token is on :30 |
| M2 | py/src/tests/integration/conftest.py:1023 | "auth_time/max_age freshness (step 12)" | step 13 | #1. The audit says :1024, which is off by one. :1023 "step 11" for nonce is correct |
| M3 | go/pkg/idtoken/idtoken.go:140 | "// Step 6: when present, azp MUST identify this client." | step 5, SHOULD | #3 |
| M4 | py/src/py_identity_model/core/id_token_logic.py:192 | "# Step 6: when present, ``azp`` MUST identify this client." | step 5, SHOULD | #3 |
| M5 | rust/src/jwt/id_token.rs:302 | "// Step 6: a present `azp` ... MUST identify this client." | step 5, SHOULD | #3 |
| M6 | go/pkg/idtoken/idtoken.go:135 | "// Step 4: with multiple audiences an azp claim MUST be present." | errata-2 step 4 is about extensions, SHOULD; it has no multi-aud rule (the 2014 text had a multi-aud SHOULD) | #4 |
| M7 | rust/src/jwt/id_token.rs:293 | "// Step 4: with multiple audiences an `azp` claim MUST be present" | same | #4 |
| M8 | py/src/tests/security/test_azp_validation.py:7 | "OIDC Core 3.1.3.7 says a multi-audience token's `azp` MUST identify the party" | §3.1.3.7 step 5 says SHOULD. Core §2 azp says "If present, it MUST contain the OAuth 2.0 Client ID of this party", which is where a MUST can be sourced | #3/#4 (DOC-ONLY; the xfail is on the `validate_token` path and is legitimate) |
| M9 | py/src/py_identity_model/core/logout_logic.py:81,89,96,103 | "# Step 2 required claims", "# Step 5 nonce", "# Step 3 sub/sid", "# Step 4 events" | Back-Channel §2.6: sub/sid = step 5, events = step 6, nonce = step 7, iss/aud/iat/exp = step 4. "Required claims" is §2.4 (a claim list, not a step) | #8. The audit lists only docstring :61-71 |
| M10 | py/src/py_identity_model/core/fapi.py:149 | "RFC 8414 §2 and OIDC Discovery §3 defaults are assumed" | Discovery §3: `response_types_supported` and `id_token_signing_alg_values_supported` are REQUIRED with no default ("The algorithm RS256 MUST be included") | #12 |
| M11 | py/src/py_identity_model/core/fapi.py:201 | runtime violation string "OIDC Discovery default is RS256, which FAPI 2.0 prohibits" | same. This is a **user-visible message**. Tests only assert the substring "RS256" (test_fapi.py:378,389), so rewording is safe | #12 |
| M12 | docs/changelog.md:1792, py/CHANGELOG.md:1792 | "sub claim mismatch validation per OIDC Core 5.3.4" | §5.3.2 | #7. **Do not edit**: release history is PSR-generated. The gate excludes CHANGELOGs |

Adjacent to #12 (RFC, not OIDC, out of scope; noting it only): fapi.py:165 "RFC 8414 §2 default when omitted is ["authorization_code"]". Both RFC 8414 §2 and Discovery §3 give the default as `["authorization_code", "implicit"]`. The behavior is unaffected because the check is only "contains authorization_code".

### Missed citations: verified correct (no action)
- fastapi rp.py:285 "OIDC Core 5.3.2 `sub` match": §5.3.2 says "The sub Claim in the UserInfo Response MUST be verified to exactly match the sub Claim in the ID Token".
- tests/security/test_sub_presence.py:7 "(OIDC Core 2)", sub REQUIRED: correct.
- fastapi CHANGELOG.md:105 "Discovery 1.0 §4.3": correct.
- changelogs :1800 "per OIDC Core Section 10.1" (missing kid): this is historical. §10.1 implies a single-key JWKS needs no kid, so it is defensible. Leave it.
- go/pkg/idtoken/options.go:81 "§3.1.3.7 ⏎ step 2" for issuer: correct.
- conformance/app.py:1303 §3.1.3.7, the extra-audience rejection (step 3): correct.
- All 9 openid.net anchors resolve to the section their label names (capabilities.md:82,83,84,100,110; id-token.json:4; userinfo.json:4; discovery.json:4), **except** capabilities.md:111 (label §5.3.4, anchor #UserInfoResponse = §5.3.2), which is already audit #7.

### Debatable items: keep or fix
| Item | Verdict | Why |
|---|---|---|
| §3.3.2.11 listed as a validation source (id-token.json:3, capabilities.md:21, docs/api/id-token.md:5-6, module docstrings) | **KEEP** in source lists. **FIX** only where it is cited as the *rule* that at_hash/c_hash MUST match (already audit #5) | §3.3.2.11 is where the hybrid at_hash/c_hash claims are defined, so listing it as a source is fair. The hybrid validation section is §3.3.2.12; adding it is scope creep |
| go/pkg/idtoken/doc.go:16 "authorization-code flows (§3.3.2.11)" | **FIX**, fold into the #5 story | code-flow at_hash is §3.1.3.6 (OPTIONAL) and §3.1.3.8 (MAY validate). §3.3.2.11 is hybrid |
| "sub REQUIRED (§2 / §3.1.3.7)" (py id_token_logic.py:11,175; test_id_token_validation.py:136; rust id_token.rs:8,273; go errors.go:18, idtoken.go:73, idtoken_test.go:109, doc.go:9) | **FIX**, fold into the #1-#3 step story (same lines and files) | §3.1.3.7 has no sub rule. Drop "/ §3.1.3.7" and keep §2 |
| Basic draft-32 links (jwt_claim_types.py:34,73; http://...basic-1_0-32.html) | **FIX** (2 lines) | Point them at final Core `#ClaimStability` (§5.7) and `#AddressClaim` (§5.1.1) over https. The draft URL still returns 200 but it is a superseded draft |
| conformance/app.py:1698 "§2.4/§2.5" for POST + validate + 200/400 | **FIX**, fold into #8/#11 (same file as :1755) | §2.5 is right for the POST. Validation is §2.6 and the response is §2.8. Make it "§2.5/§2.6/§2.8" |
| spec/vectors/discovery.json:48,56 caching "references": ["§4"] | **FIX** | Discovery has no caching text at all (grep "cach" finds 0 hits). TTL caching is library behavior. Use "references": [] or a non-section note. These vectors are normative rationale, so wrong text spreads to all 3 languages |
| docs/security/control-matrix.md:42 issuer pinning "OIDC Core §2" | **FIX** | Use Discovery §4.3 and Core §3.1.3.7 step 2. Core §2 only defines `iss` |
| spec/capabilities.md:110 "MUST GET with Bearer" | **KEEP** | capabilities.md states the *library's* contract ("Implementations MUST"), not the spec's. §5.3.1 RECOMMENDS GET. Optional wording nit only |
| spec/capabilities.md:83 token_endpoint listed as required | **KEEP** | Discovery §3: "REQUIRED unless only the Implicit Flow is used". The library is a code-flow RP, so this is a deliberate contract. No Cognito impact (Cognito advertises token_endpoint) |
| fastapi middleware.py:41 "nonce/at_hash/c_hash (Core §2, §3.1.3.6)" | **FIX** (1 line) | c_hash only appears in §3.3.2.11 (and §3.3.2.10). Make it "§2, §3.1.3.6, §3.3.2.11" |

## Part 2: mechanical gate

### What the prototype checks (single script, no per-line waivers)
1. **Section existence.** A citation that names its spec on the same line ("OIDC Core §x", "Core 5.3.4", "Discovery 1.0 §4.3", "Back-Channel Logout 1.0 §2.6", "Section 9", chained "§2 / §3.1.3.7", or a spec name ending one line with §x starting the next) must name a section in the vendored index for that spec. This covers 10 specs: Core, Discovery, Registration, RP-Initiated, Front-Channel, Back-Channel, Session, Prompt Create, Multiple Response Types and Form Post. Bare §x with no spec name is skipped, because it is ambiguous with RFCs. The one exception is §3.1.3.7, which only Core has.
2. **Anchors.** An openid.net `#Anchor` must exist in the indexed spec. A markdown link `[…§X…](…#Anchor)` must have X equal to the anchor's section.
3. **Step binding.** "§3.1.3.7 step N" or "steps N-M", on the citation line or the next line, needs N in 1..13 and the step's topic keyword within ±1 line. Back-Channel §2.6 works the same way with steps 1..11. "step" cited against any other section fails with "has no numbered steps". A bare "§X step N" (X ≠ 3.1.3.7) must name its spec on the line.
   Topic allowlist: Core 3.1.3.7 = {1 decrypt|encrypt, 2 iss|issuer, 3 aud, 4 azp, 5 azp, 6 signature|TLS|JWS, 7 alg|RS256, 8 HS256|MAC|client_secret, 9 exp, 10 iat, 11 nonce, 12 acr, 13 auth_time|max_age}. Back-Channel 2.6 = {1 decrypt, 2 signature, 3 alg|none, 4 iss|aud|iat|exp, 5 sub|sid, 6 events, 7 nonce, 8 jti, 9 iss, 10 sub, 11 sid}.
4. Excluded files: `*.lock`, `go.sum`, `CHANGELOG.md`/`changelog.md` (generated history), and binaries. This list lives in the script; there are no inline waivers, consistent with the no-noqa rule.

### Measured on 1e3b6a6 (1.7 s, whole repo)
- **48 violations, 0 false positives**:
  - 44 are exactly audit items #1-#3. The gate also corrects the audit's line numbers to errors.go:30 and conftest.py:1023.
  - 3 are the logout "§2.4 step" lines (#8): logout_logic.py:31,53 and test_logout_token_validation.py:138.
  - 1 is the capabilities.md:111 label/anchor mismatch (#7).
- Synthetic cases: 10/10 bad cases fail and 8/8 good cases pass. The good cases include "RFC 7519 §4.1.3", "Discovery 1.0 document", the "§3.1.3.7 ⏎ step 13" continuation, and "RFC 6749 §2.3.1 / OIDC Core §9".
- **Earlier iterations show the false-positive risk.** I first attributed a bare § to "the last spec named in the file". That produced 15 to 60 false positives from bare RFC 7662/7009/7519 continuation lines, such as introspection §2.2 being read as Core. Restricting bare-§ attribution to §3.1.3.7 removed them. Keep that restriction.

### What it cannot catch (be honest)
- The **section-existence check would have caught 0 of the 13 audit findings**, because every cited number exists. Its value is only as a guard against future typos.
- The gate does not catch **topic misattribution with a real number**: §5.3.4 vs §5.3.2, §2.4 vs §2.6 without "step", Discovery §3 "defaults", §10.1, or §3.3.2.11 vs §3.2.2.9. That covers 10 of the 13 findings by type. Catching these needs a per-claim allowlist (section → keywords), which grows without bound. **Do not build it.**
- It does not catch **MUST/SHOULD strength** (#3, #4, #9), or step comments with no § on or next to the line ("// Step 6: azp…", M3-M5, M9).
- Net effect: it pins the most-replicated class of error (step numbers copied across 3 languages and the vectors, about 45 of roughly 100 bad lines), plus anchors.
- Gameability: the only way to pass a step check is to put the step's actual topic word next to it. That is a deliberate act, not an accident, and there is no waiver mechanism.

### Wiring (no workflow edits)
- `tools/check_oidc_citations.py` (about 150 lines) and `tools/tests/test_check_oidc_citations.py`. The test file holds the synthetic table, plus one test that runs the checker over `git ls-files` and asserts zero violations.
- That runs under the existing `make test-tools`, which is the CI `tools-tests` job. That job is ungated (it has no `changes` filter) and is in `ci-complete`'s needs, so it runs on every PR. Do not add a pre-commit hook: the CI lint job runs only `make lint-py`, so a hook would add a local-only path.
- **Index location: `spec/oidc-sections/<spec-file>.tsv`**, with columns `section`, `title` and `anchors` (comma-separated). About 450 lines across 10 files, roughly 18 KB. The step-topic table stays as a constant in the script (24 entries), because it encodes judgment, not spec structure.
- **Regeneration:** `make oidc-section-index` runs `tools/check_oidc_citations.py --regen`. It fetches the 10 final HTML specs from openid.net and parses two formats:
  - xml2rfc v2 `<a name>` + `<hN>` for 9 specs;
  - xml2rfc v3 `id="section-N"` / `id="name-…"` for Prompt Create.
  
  It rewrites the TSVs, and the diff is reviewed. CI never fetches. The specs are final; Core errata set 2 dates from Dec 2023, so a regen is only needed on a new errata set.

### Recommendation
Worth **one S story**, landed **last** in the stack, on top of the fix stories, so it goes green on arrival with no baseline file. Cost: about 150 LOC plus an 18 KB index; 1.7 s in an existing job; 0 false positives on the current tree. If James wants to cut further, drop the existence check and keep only the step binding and the anchor/label check, which caught every true positive. Do not extend it to topic allowlists for non-step sections.

## Stories

**C7-S1: fold the missed lines into the existing fix stories** (no new story).
- #1 story: add go errors.go:30 and conftest.py:1023 (in place of :1024 and :29); also drop "/ §3.1.3.7" from the "sub REQUIRED" lines listed above.
- #3 story: add go idtoken.go:140, py id_token_logic.py:192, rust id_token.rs:302, and test_azp_validation.py:7.
- #4 story: add go idtoken.go:135 and rust id_token.rs:293.
- #5 story: add go doc.go:16 and fastapi middleware.py:41.
- #8/#11 story: add logout_logic.py:81,89,96,103 and conformance/app.py:1698.
- #12 story: add fapi.py:149 and the :201 runtime string.
- Plus a small `docs:` sweep: jwt_claim_types.py:34,73; discovery.json:48,56; control-matrix.md:42.

**C7-S2 `ci(tools): gate OIDC section/step citations against a vendored spec index`**, size S.
- Scope:
  - `tools/check_oidc_citations.py` (new)
  - `tools/tests/test_check_oidc_citations.py` (new)
  - `spec/oidc-sections/*.tsv` (new, 10 files)
  - `Makefile` (`oidc-section-index` target)
- Acceptance criteria:
  - Given a line "OIDC Core §3.1.3.14", when `make test-tools` runs, then it fails naming file:line and "core: no section 3.1.3.14".
  - Given "auth_time (§3.1.3.7 step 12)", then it fails with "step 12 needs /acr/". Given "auth_time (§3.1.3.7 ⏎ step 13)", it passes.
  - Given "[§5.3.4](…core-1_0.html#UserInfoResponse)", then it fails with "label §5.3.4 but #UserInfoResponse is §5.3.2".
  - Given "Back-Channel Logout 1.0 §2.4 step 2", then it fails with "has no numbered steps".
  - Given "RFC 7519 §4.1.3" or "OpenID Connect Discovery 1.0 document", it passes.
  - Given the repo at the head of the fix stack, the whole-repo test reports 0 violations.
  - Given `make oidc-section-index` with the network up, the TSVs regenerate byte-identically.
- Tests: the synthetic table (≥ 18 cases) plus the whole-repo assertion. No mutation-gate surface, because tools/ is not in the security surface.
- Depends on: the #1, #3, #4 and #8 fix stories and the capabilities.md:111 fix (#7). Without them the whole-repo test is red.

No behavior change in this cluster. M11 is a message string only, and Cognito is unaffected.
