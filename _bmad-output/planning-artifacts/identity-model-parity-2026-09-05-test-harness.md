# Test-Harness Parity Audit — identity-model monorepo (main @ ba30926)

Note: spec/vectors/ is the literal on-disk path post-#641. infra/ contains a FOURTH live provider the brief omitted — Duende IdentityServer (infra/identityserver/, .NET) — and node/ is a release-scope stub only (zero code/tests).

## 1. Harness inventory per language

### Python (py/) — 7 distinct systems, ~2,140 test functions total
| Harness | Location | Fakes vs proves live | Tests riding on it |
|---|---|---|---|
| respx-mocked unit suite | py/src/tests/unit/ (98 files) | All HTTP mocked (respx); includes 4 spec-vector runners | 1,632 test fns |
| Mock-OP "token-blaster" (TH-1.x) | py/src/tests/harness/: mock_op.py (551 loc controllable ASGI OP: known signing key, injected latency/429+Retry-After/5xx, key-rotation-on-command, Cache-Control, empty/oversized JWKS), corpus.py (forged negatives), rs_app.py+rs_server.py (fastapi-identity-model RS booted under real uvicorn), token_source.py, mock_op_server.py | Fakes the OP, proves the real shipped RS middleware over real HTTP/WS | Riders: integration/test_rs_boot.py (TH-1.2), test_correctness_matrix.py (TH-1.3, forged corpus + node-oidc leg), test_ws_correctness.py (#598/#600, real websockets handshake), test_cross_issuer_real_idps.py, entire load suite; unit/test_mock_op.py. All importorskip-gated on fastapi_identity_model/uvicorn (need --all-packages) |
| Live-provider integration suite | py/src/tests/integration/ (39 files) | Real IdPs via --env-file=../.env.*; discovery-driven capability skips (RFC 8414) in conftest.py; provider_matrix.py prints capability matrix | 190 test fns |
| Security suite | py/src/tests/security/ | Offline; includes mutation-gate meta-test test_mutation_gate.py; 8 xfails documenting accepted gaps (test_response_size_limits.py ×2, test_sub_presence.py ×2, test_duplicate_kid.py, test_issuer_pinning_discovery.py, test_azp_validation.py, test_discovery_ssrf.py) | 121 test fns |
| Load/soak/capacity suite | py/src/tests/load/ (real out-of-process Locust vs booted RS + mock OP) | Proves RS+client caches under real HTTP load | 60 test fns |
| Benchmarks | py/src/tests/benchmarks/test_benchmarks.py | pytest-benchmark, local-only | 16 |
| Mutation gate | py/tools/mutation_security.py (mutmut, changed-line-scoped, fail-closed; waivers in mutation_security_allowlist.txt) | Mechanical test-quality gate on security modules | CI job security-gate |
| OIDF conformance harness | conformance/ — dockerized OIDF suite + RP harnesses app.py (core) and app_fastapi.py (real build_oidc_router), run_tests.py, 12 plan configs | Proves RP behavior against the official OIDF suite | plus fastapi package tests: 103 test fns (make test-fastapi) |

### Go (go/) — 3 systems, 256 test functions
| Harness | Location | Fakes vs proves live | Tests |
|---|---|---|---|
| httptest in-package unit fixtures | 15 of go/pkg/**/*_test.go use net/http/httptest; race-enabled in CI | Fakes OP endpoints per-test | 226 unit test fns |
| Integration harness | go/internal/integrationtest/: integrationtest.go (TEST_* env profile, default = infra node-oidc localhost:9010; only node-oidc provisions the opaque-token client), skip.go (SkipUnreachable → fails under TEST_REQUIRE_LIVE=1), authcode.go (headless auth-code/PKCE driver) | Real IdPs | 30 //go:build integration test fns across 12 files in 9 go/pkg/* dirs |
| Vector conformance | go/internal/conformance/ (spec.go loader w/ DisallowUnknownFields, mint.go runtime-minted JWS, validation_test.go, idtoken_conformance_test.go) + go/pkg/jwt/claims_validation_conformance_test.go | Offline, network-free | 3 runner fns driving 13+11+19 cases, each with in-test full-coverage assertions |

### Rust (rust/) — 3 systems, ~250 test functions
| Harness | Location | Fakes vs proves live | Tests |
|---|---|---|---|
| wiremock unit tests | inline in rust/src/** (~209 fns; wiremock 0.6.5) + offline fns in rust/tests/ | Fakes OP | ~222 offline |
| Live suite | rust/tests/*.rs — 15 #[ignore]-gated tests; skip_or_fail() panics under TEST_REQUIRE_LIVE=1 | Real IdP via TEST_DISCO_ADDRESS | 15 |
| Vector conformance | rust/tests/spec_conformance.rs (rust_native_tests() anchor map, panics on missing anchor), spec_conformance_id_token.rs, claims_validation_conformance.rs — none #[ignore]-gated | Offline | 3 runner fns |

## 2. Provider × language matrix

CI = ci.yml (reusable; called by build.yml on every PR + main push with run-descope-integration/run-example-tests/run-build: true, by release.yml, and by nightly.yml with run-native-tests: true).

| Provider | Python | Go | Rust | CI job / gating |
|---|---|---|---|---|
| mock-OP (py harness) | ✅ in-process + uvicorn-booted | ❌ | ❌ | integration-tests-ws (ci.yml:240), load-smoke (ci.yml:337), nightly load-soak/load-capacity. No secrets |
| node-oidc-provider (infra/node-oidc-provider/, :9010; only provider with opaque-token client) | ✅ CI every PR | ✅ CI (default profile, change-gated) | ✅ CI (change-gated, sources .env.node-oidc) | Go+Rust legs set TEST_REQUIRE_LIVE=1. Docker fixture, no secrets |
| IdentityServer (Duende, infra/identityserver/) | ⚠️ local-only possible (.env.identityserver exists; no CI job) | ✅ CI — second leg of integration-tests-go (ci.yml:393-396) | ⚠️ local-only possible | Go-only in CI |
| Keycloak (infra/keycloak/) | ✅ CI: integration-tests-keycloak + integration-tests-cross-issuer (node-oidc↔Keycloak real-token rejection) | ⚠️ local-only | ⚠️ local-only | No secrets |
| Ory (cloud) | ✅ CI: integration-tests-ory (secrets TEST_*) | ❌ (integrationtest.go docstring claims Ory support via TEST_*, never wired) | ❌ | Python-only |
| Descope (cloud) | ✅ CI: integration-tests-descope (DESCOPE_* secrets ×7; per-PR via build.yml:23) | ❌ | ❌ | Python-only |
| OIDF conformance suite | ✅ core RP + fastapi RP: conformance.yml (PR + daily cron + release gate); plans basic-rp, config-rp (continue-on-error — known signing-key-rotation timeout), form-post-basic-rp + fastapi-* variants; configs for dynamic/backchannel/rpinitiated-logout/fapi2* exist but NOT in any workflow; conformance-hosted.yml manual | ❌ | ❌ | Python-only; certified RP (Basic/Config/Form Post) |

## 3. Vector-runner parity

| Vector source | Cases | py | go | rust | Gate-enforced? |
|---|---|---|---|---|---|
| spec/vectors/validation.json | 13 (12 vectored + JWT-010 native) | test_spec_conformance.py | validation_test.go | spec_conformance.rs | YES — tools/spec_coverage_gate.py (CI spec-vector-coverage, never change-gated): 100% per language + native-anchor existence |
| spec/vectors/id-token.json | 11 (IDT-001..011), all vectored | test_id_token_conformance.py | idtoken_conformance_test.go | spec_conformance_id_token.rs | NO — cross_language_coverage_gate: "pending" (skipped at spec_coverage_gate.py:90-91); runners carry own in-test all-cases assertions |
| spec/test-fixtures/claims-validation/vectors.json | 19 | test_claims_validation_conformance.py | claims_validation_conformance_test.go | claims_validation_conformance.rs | NO — outside gate inventory (gate only scans spec/vectors/*.json) |
| spec/test-fixtures/config/*.json | 28 fixtures | test_config_conformance.py — skips legacy-*.json (6) + strict-bool cases | ❌ (Go Config in open PRs #594/#596/#597) | ❌ | Python-only |
| Other 10 spec/vectors/*.json | 6-33 prose cases each, 0 vectors | — | — | — | Prose-only; gate has loud-fail guard if 2nd capability gains vectors without per-capability reports (spec_coverage_gate.py:126-137) |

Skips/xfails: py spec runners no xfails; Go t.Skipf native cases naming anchor; Rust panics on missing anchor. The 8 py xfails live in the security suite.

## 4. Test-category asymmetries

| Category | Exists in | Judgment |
|---|---|---|
| Security suite (121 tests: alg-confusion, SSRF, issuer pinning, duplicate-kid, size limits, cache-fetch, basic-auth encoding, sub-presence, azp) | py only | REAL GAP. SSRF pinning, duplicate-kid, size limits, kid-miss guard implementation-specific HTTP/cache code Go/Rust reimplement. Vectors can't express these |
| Mutation gate | py only | Real-but-proportional; matters as native libs grow |
| E2E forgery harness (corpus.py: alg_none, wrong_alg RS256→HS256 public-key-HMAC, tampered_sig, unknown_kid, expired, nbf_future, wrong_iss, wrong_aud, oversized, multi_aud_untrusted, id_as_access, cnf_bound) | py only | Split: RS-policy classes = fastapi scaffolding; library-level classes not yet vectored (oversized, multi-aud-untrusted, real HMAC-confusion construction) = genuine Go/Rust proof gap |
| Cross-issuer real-token rejection | py only | Real gap, CHEAP for Go: Go CI leg already boots two issuers (node-oidc + IdentityServer) yet never cross-presents tokens |
| Load/soak/capacity (Locust) | py only | Python-specific scaffolding — don't port |
| OIDF certification | py only | Assurance gap but requires full RP harness per language — large; defer |
| Race/concurrency | Go -race in CI; py thread-safety tests | Rust: no loom — low risk given ownership model |
| Benchmarks | py only, local-only | Ignore |

## 5. Gap list (tiered by Go/Rust behavioral-confidence lift)

Tier 1 — direct proof lifts, mostly wiring
1. [S] Flip id-token.json to gate-enforced + extend spec_coverage_gate.py to per-capability reports (all 3 runners exist and pass). Epic 23 story 23.2.
2. [S] Pull claims-validation vectors.json (19 cases, 3 runners live) into the coverage gate.
3. [M] Vectorize library-level forged-corpus classes from corpus.py into validation.json: real RS256→HS256 confusion, oversized token, multi-aud-with-untrusted-member. Go/Rust prove them offline for free.
4. [S] Go cross-issuer rejection test (both IdPs already up in integration-tests-go). [M] same for Rust (needs second fixture in its CI leg).

Tier 2 — provider breadth + security depth
5. [M] Keycloak legs for Go/Rust (.env.keycloak exists; Make targets + CI matrix entries). Highest-value real-IdP delta already free in Docker.
6. [M] Nightly-only Ory/Descope legs for Go/Rust — integrationtest.go already TEST_*-driven; secrets exist.
7. [M-L] Port vector-inexpressible security behaviors to Go/Rust package tests: duplicate-kid, response-size limits, discovery issuer pinning/SSRF, kid-miss cooldown (httptest/wiremock).
8. [L] Go/Rust Config API conformance runners — blocked on Config implementations landing.

Tier 3 — parity of gates, not behavior
9. [L] Mutation testing for Go/Rust (in flight as #638).
10. [L] OIDF RP harness for Go (needs an RP layer first); defer.
11. Explicit non-goal: porting the load suite.
