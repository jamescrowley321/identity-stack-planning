## Task: Refactor py-identity-model integration tests to be provider-agnostic

**Target repo:** `~/repos/auth/py-identity-model`
**Branch:** `test/integration-core-flows-v2` (PR #281, already open)
**Goal:** Eliminate the separate `test_node_oidc_core_flows.py` file. Make all integration tests provider-agnostic so the same suite runs against any OIDC provider (Ory, Descope, node-oidc-provider, identity server) via `--env-file`.

### Problem

`test_node_oidc_core_flows.py` (541 lines, 23 tests) is a provider-specific test file that only runs against the local node-oidc-provider Docker fixture. This breaks the project's established pattern where integration tests are generic and provider selection happens via `--env-file`. It forced a marker hack (`-m "integration and not node_oidc"`) in the Makefile to prevent these tests from running in Ory/Descope CI jobs.

The correct pattern — used by the identity server example tests — is: boot provider → run the same test suite → tear down.

### What test_node_oidc_core_flows.py covers that the generic suite doesn't

The existing generic integration tests cover: discovery, JWKS, client_credentials token requests, token validation (basic + enhanced + async + caching), userinfo, and model validation for auth_code/introspection/revocation/refresh/device_auth/dpop/par/jar/fapi.

The node-oidc file adds **live protocol flow tests** that exercise real HTTP against a running provider:

1. **Client credentials with resource param** — gets JWT access token (vs opaque)
2. **Custom claims verification** — Descope-style `dct`/`tenants` in tokens
3. **Auth code + PKCE flow** — full browser-like flow (confidential + public client)
4. **Auth code state validation** — round-trip state parameter verification
5. **Token validation variants** — manual key, leeway, custom claims validator, wrong issuer, wrong audience, expired token, auth code token validation
6. **Refresh token** — success, new access token, invalid token, scope downscope

### Architecture for the refactor

#### 1. Conftest: provider-capability detection

The conftest already loads config from `--env-file` and fetches the discovery document. Add capability detection based on what the discovery document advertises and what env vars are set:

The discovery document already advertises what a provider supports (RFC 8414). Derive capabilities from it — no `TEST_PROVIDER` env var needed:

```python
@pytest.fixture(scope="session")
def provider_capabilities(discovery_document):
    """Detect provider capabilities from its discovery document (RFC 8414)."""
    caps = set()
    grants = set(discovery_document.grant_types_supported or [])

    if discovery_document.authorization_endpoint:
        caps.add("authorization_code")
    if "refresh_token" in grants:
        caps.add("refresh_token")
    if discovery_document.introspection_endpoint:
        caps.add("introspection")
    if "urn:ietf:params:oauth:grant-type:device_code" in grants:
        caps.add("device_authorization")
    if "urn:ietf:params:oauth:grant-type:token-exchange" in grants:
        caps.add("token_exchange")

    # Check raw discovery JSON for fields not yet in DiscoveryDocumentResponse
    # (revocation_endpoint, pushed_authorization_request_endpoint, etc.)
    # Store the raw JSON in the fixture or fetch it separately.

    # devInteractions: provider supports automated browser-like auth code flow.
    # Detect by trying the interaction endpoint — if the provider returns an
    # HTML form at the authorization URL (instead of requiring a real browser),
    # it supports automated flows. Alternatively, check for a non-HTTPS issuer
    # on localhost (only local test fixtures have devInteractions).
    issuer = discovery_document.issuer or ""
    if issuer.startswith("http://localhost") or issuer.startswith("http://127.0.0.1"):
        caps.add("dev_interactions")

    return caps
```

Tests use a `requires_capability` helper or fixture-level skip:

```python
def requires(capability):
    """Decorator to skip tests when provider lacks a capability."""
    return pytest.mark.usefixtures("provider_capabilities")
    # Actual skip logic is in the fixture that provides the data, e.g.:

@pytest.fixture(scope="session")
def auth_code_result(provider_capabilities, discovery_document, test_config):
    """Perform auth code + PKCE flow. Skips if provider lacks dev_interactions."""
    if "dev_interactions" not in provider_capabilities:
        pytest.skip("Provider does not support automated auth code flow (no devInteractions)")
    if "authorization_code" not in provider_capabilities:
        pytest.skip("Provider does not advertise authorization_endpoint")
    return perform_auth_code_flow(
        discovery=discovery_document,
        client_id=test_config["TEST_AUTH_CODE_CLIENT_ID"],
        redirect_uri=test_config["TEST_AUTH_CODE_REDIRECT_URI"],
        client_secret=test_config.get("TEST_AUTH_CODE_CLIENT_SECRET"),
    )
```

When a test requests a fixture like `auth_code_result` and the provider doesn't support it, pytest automatically skips the test — no marker filtering needed.

#### 2. Conftest: discovery-driven raw JSON fixture

The `DiscoveryDocumentResponse` model doesn't include all RFC 8414 fields yet (e.g., `revocation_endpoint`, `pushed_authorization_request_endpoint`, `device_authorization_endpoint`). Add a raw discovery fixture:

```python
@pytest.fixture(scope="session")
def raw_discovery(test_config):
    """Raw discovery JSON for capability fields not yet in the typed model."""
    import httpx
    resp = httpx.get(test_config["TEST_DISCO_ADDRESS"], timeout=10.0)
    return resp.json() if resp.status_code == 200 else {}
```

Then `provider_capabilities` can check `raw_discovery.get("revocation_endpoint")`, etc.

#### 3. Conftest: auth code flow helper

The `perform_auth_code_flow()` function uses devInteractions (POST login/consent forms). It stays in conftest as a helper, called by the `auth_code_result` fixture which skips when the provider doesn't support automated flows.

#### 3. Move tests into existing generic files

Map each test from `test_node_oidc_core_flows.py` to the appropriate generic file:

| Node-oidc test | Target file | Notes |
|---|---|---|
| `test_discovery_from_node_oidc` | `test_discovery.py` | Already covered by `test_get_discovery_document_is_successful` — DUPLICATE, delete |
| `test_jwks_from_node_oidc` | `test_jwks.py` | Already covered by `test_get_jwks_is_successful` — DUPLICATE, delete |
| `test_client_credentials_jwt_token` | `test_token_client.py` | Add test for token request with `resource` param (JWT format). Skip if provider doesn't support `resource`. |
| `test_client_credentials_jwt_has_custom_claims` | `test_token_client.py` or `test_token_validation.py` | Skip if `custom_claims` not in capabilities. |
| `test_client_credentials_token_without_resource` | `test_token_client.py` | Already covered by `test_request_client_credentials_token_is_successful` — DUPLICATE, delete |
| `test_client_credentials_invalid_client` | `test_token_client.py` | Already covered by `test_request_client_credentials_token_fails_invalid_credentials` — DUPLICATE, delete |
| `test_auth_code_pkce_confidential_client` | `test_auth_code_pkce.py` | Add live flow test. Skip if `auth_code_flow` not in capabilities. |
| `test_auth_code_pkce_public_client` | `test_auth_code_pkce.py` | Add live flow test. Skip if `auth_code_flow` not in capabilities. |
| `test_auth_code_callback_state_validation` | `test_authorize_callback.py` | Add live round-trip test. Skip if `auth_code_flow` not in capabilities. |
| `test_auth_code_callback_state_mismatch` | `test_authorize_callback.py` | Add live round-trip test. Skip if `auth_code_flow` not in capabilities. |
| `test_auth_code_invalid_code_verifier` | `test_auth_code_pkce.py` | Add live error test. Skip if `auth_code_flow` not in capabilities. |
| `test_validate_jwt_manual_key` | `test_token_validation.py` | Generic — works with any JWT token. |
| `test_validate_jwt_with_leeway` | `test_enhanced_token_validation.py` | May already be covered by `test_leeway_with_real_token` — check for duplication. |
| `test_validate_jwt_custom_claims_validator` | `test_enhanced_token_validation.py` | Generic — works with any provider that returns claims. |
| `test_validate_jwt_claims_validator_rejects` | `test_enhanced_token_validation.py` | Generic. |
| `test_validate_wrong_issuer` | `test_token_validation.py` | Generic. |
| `test_validate_auth_code_jwt_token` | `test_token_validation.py` | Skip if `auth_code_flow` not in capabilities. |
| `test_validate_expired_token` | `test_token_validation.py` | May already be covered by `test_token_validation_expired_token`. |
| `test_validate_wrong_audience` | `test_token_validation.py` | Generic. |
| `test_refresh_token_success` | `test_refresh_token.py` | Add live flow test. Skip if `refresh_token` not in capabilities. |
| `test_refresh_token_returns_new_access_token` | `test_refresh_token.py` | Skip if `refresh_token` not in capabilities. |
| `test_refresh_token_invalid` | `test_refresh_token.py` | Skip if `refresh_token` not in capabilities. |
| `test_refresh_token_scope_downscope` | `test_refresh_token.py` | Skip if `refresh_token` not in capabilities. |

#### 4. Revert Makefile marker hack

Change all targets back to plain `-m integration`:

```makefile
test-integration-local:
	uv run pytest src/tests -m integration --env-file=.env.local -v -n auto -p no:benchmark

test-integration-ory:
	uv run pytest src/tests -m integration -v -n auto -p no:benchmark

test-integration-descope:
	uv run pytest src/tests -m integration $(if $(wildcard .env.descope),--env-file=.env.descope) -v -n auto -p no:benchmark
```

The node-oidc target stays as-is (boots docker, runs `-m integration --env-file=.env.node-oidc`, tears down).

#### 5. Update .env.node-oidc

Add auth code flow config (no `TEST_PROVIDER` needed — capabilities are discovery-driven):

```
TEST_DISCO_ADDRESS=http://localhost:9010/.well-known/openid-configuration
TEST_JWKS_ADDRESS=http://localhost:9010/jwks
TEST_CLIENT_ID=test-client-credentials
TEST_CLIENT_SECRET=test-client-credentials-secret
TEST_SCOPE=openid
TEST_AUDIENCE=
TEST_REQUIRE_HTTPS=false
TEST_AUTH_CODE_CLIENT_ID=test-auth-code
TEST_AUTH_CODE_CLIENT_SECRET=test-auth-code-secret
TEST_AUTH_CODE_REDIRECT_URI=http://localhost:8080/callback
TEST_PKCE_PUBLIC_CLIENT_ID=test-pkce-public
TEST_PKCE_PUBLIC_REDIRECT_URI=http://localhost:8080/callback
```

Client IDs and secrets come from env, not hardcoded constants in conftest.

#### 6. Remove node_oidc marker

- Delete `pytestmark = pytest.mark.node_oidc` — no longer needed
- Remove `"node_oidc: marks tests requiring..."` from `pyproject.toml` markers
- Remove the `node_oidc` marker registration from anywhere it appears

#### 7. Delete test_node_oidc_core_flows.py

After all tests are migrated to generic files.

### Fixtures to keep in conftest.py

The node-oidc-specific fixtures stay in conftest.py but become capability-gated:

- `node_oidc_provider` → rename to just being part of the generic fixture chain. The `_wait_for_provider()` helper is only needed for local Docker fixtures. For the node-oidc CI job, the `docker compose --wait` in CI already ensures the container is healthy before tests run. For Ory/Descope, there's no container to wait for.
- `perform_auth_code_flow()` — stays as a helper, used by the `auth_code_token` fixture. Only called when provider supports it.
- `node_oidc_cc_jwt_token` → becomes a generic `jwt_access_token` fixture that requests a token with `resource` param. Skip if provider doesn't support resource-based JWT format.
- `node_oidc_cc_opaque_token` → the existing `client_credentials_token` fixture already does this.
- `node_oidc_discovery`, `node_oidc_jwks` → DELETE — the generic `discovery_document` and `jwks_response` fixtures already exist and work when `TEST_REQUIRE_HTTPS=false`.
- `node_oidc_auth_code_result`, `node_oidc_public_auth_code_result` → become generic `auth_code_result` / `public_auth_code_result` fixtures gated on `dev_interactions` + `authorization_code` capabilities (detected from discovery document).
- `node_oidc_provider` → DELETE. Container health is ensured by `docker compose --wait` in CI and Makefile. The generic `discovery_document` fixture already validates the provider is reachable.

### Key constraints

- **Read CLAUDE.md** at `~/repos/auth/py-identity-model/CLAUDE.md` and `~/repos/auth/CLAUDE.md` before starting. Follow conventional commits, run `make lint` before committing.
- **Work on the existing branch** `test/integration-core-flows-v2` — this is PR #281.
- **Do NOT create a new branch or PR.** Push to the existing branch.
- **Run `make lint` and `make test-unit`** before every commit.
- **The node-oidc fixture must be running** to test locally: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml up -d --build --wait`
- **Run the full integration suite** against node-oidc after the refactor: `make test-integration-node-oidc`
- **Verify Ory/Descope compatibility**: `uv run pytest src/tests -m integration --collect-only` should show all tests, with node-oidc-capability tests present but ready to skip at runtime.
- The generic `discovery_document` fixture uses the library's own `get_discovery_document()` with `DiscoveryPolicy(require_https=False)` when `TEST_REQUIRE_HTTPS=false` — this already works for node-oidc.
- Node-oidc constants (`CC_CLIENT_ID`, `AUTH_CODE_CLIENT_ID`, etc.) should come from `test_config` / env vars, not hardcoded in conftest. Add them to `.env.node-oidc`.

### Verification checklist

- [ ] `test_node_oidc_core_flows.py` deleted
- [ ] `node_oidc` marker removed from pyproject.toml and all files
- [ ] Makefile uses plain `-m integration` for all targets (no `and not node_oidc`)
- [ ] `make lint` passes
- [ ] `make test-unit` passes (863+ tests, 80%+ coverage)
- [ ] `make test-integration-node-oidc` passes (boots docker, runs all integration tests including auth code / refresh / validation, tears down)
- [ ] `uv run pytest src/tests -m integration --collect-only` — all tests collect; auth code/refresh/capability-gated tests present (they skip at runtime when provider lacks capability, not via marker exclusion)
- [ ] No hardcoded `localhost:9010` or node-oidc client IDs outside of `.env.node-oidc`
- [ ] Provider capabilities derived from discovery document, not env vars
- [ ] CI workflow unchanged (the existing job structure already boots docker → runs tests → tears down)
- [ ] All commits follow conventional commit format
- [ ] Tests that need auth code flow skip gracefully with clear message when provider doesn't support devInteractions
- [ ] `make provider-matrix` target works and outputs a readable feature support matrix

### Bonus task: Provider capability matrix skill

After the refactor, create a CLI tool / Makefile target that probes all configured providers and outputs a feature support matrix. This makes it immediately visible which tests will run (or skip) against each provider.

#### Implementation

Create `src/tests/integration/provider_matrix.py` — a standalone script (not a test) that:

1. Reads all `.env*` files matching the integration test pattern (`.env`, `.env.node-oidc`, `.env.descope`, `.env.local`, etc.)
2. For each env file, fetches the discovery document at `TEST_DISCO_ADDRESS`
3. Parses the raw discovery JSON to detect capabilities:
   - **Endpoints**: `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `introspection_endpoint`, `revocation_endpoint`, `device_authorization_endpoint`, `pushed_authorization_request_endpoint`, `registration_endpoint`
   - **Grant types**: `authorization_code`, `client_credentials`, `refresh_token`, `urn:ietf:params:oauth:grant-type:device_code`, `urn:ietf:params:oauth:grant-type:token-exchange`, `urn:ietf:params:oauth:grant-type:jwt-bearer`
   - **Features**: `code_challenge_methods_supported` (PKCE), `dpop_signing_alg_values_supported` (DPoP), `request_parameter_supported` (JAR), `require_pushed_authorization_requests` (PAR enforcement), `tls_client_certificate_bound_access_tokens` (mTLS)
   - **Signing algorithms**: `id_token_signing_alg_values_supported`, `token_endpoint_auth_methods_supported`
   - **devInteractions**: localhost issuer heuristic (automated auth code flow possible)
4. Outputs a table like:

```
Provider Capability Matrix
==========================

                              node-oidc   ory         descope     identity-server
                              ---------   ---         -------     ---------------
authorization_code            ✓           ✓           ✓           ✓
client_credentials            ✓           ✓           ✓           ✓
refresh_token                 ✓           ✓           ✓           ✓
introspection                 ✓           ✓           ✗           ✓
revocation                    ✓           ✓           ✗           ✓
device_authorization          ✓           ✗           ✗           ✗
token_exchange                ✓           ✗           ✗           ✗
PKCE (S256)                   ✓           ✓           ✓           ✓
DPoP                          ✓           ✗           ✗           ✗
JAR (request param)           ✓           ✗           ✗           ✗
PAR                           ✓           ✗           ✗           ✗
devInteractions               ✓           ✗           ✗           ✗
userinfo                      ✓           ✓           ✓           ✓

Tests that will SKIP:         0/85        12/85       15/85       12/85
```

5. If a provider is unreachable, shows `[offline]` instead of the column.

#### Makefile target

```makefile
.PHONY: provider-matrix
provider-matrix:
	uv run python src/tests/integration/provider_matrix.py
```

#### Why this matters

- Makes test coverage gaps visible at a glance
- Helps decide which provider to add next for better coverage
- Documents which RFC features each provider supports without reading their docs
- Useful for the T126 (IdentityServer gap documentation) task — the matrix IS the gap document
