---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '25'
epic_title: 'Injected Config — the library stops reading the environment'
date: '2026-09-27'
status: 'ready'
inputDocuments:
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-09-27.md
---

# Epic 25: Injected Config — the library stops reading the environment

## Overview

Settings are passed in; the library never reads the process environment itself. Callers build settings however they like — small helpers cover environment variables and any dict of strings (a parsed `.env` file, YAML, a secrets manager). Replaces the Configuration API epic (identity-model#616); see `sprint-change-proposal-2026-09-27.md` for why.

**Goal / Definition of Done:** no library code in Python, Go or Rust reads the process environment; every setting is reachable through an injected `Config` (or the language's existing options); a gate fails if an environment read comes back.

### GitHub tracking

Epic issue **identity-model#751**. Story issues are sub-issues of #751.

### Settings

The settings are the ones the library reads from the environment today:

| Group | Settings |
|---|---|
| HTTP | `http_timeout`, `http_retry_max_attempts`, `http_retry_base_delay`, SSL verify / CA bundle path |
| JWKS | `jwks_max_size`, `jwks_max_keys`, `jwks_cache_ttl`, `jwks_kid_miss_cooldown`, `jwks_cache_max_entries` |
| Discovery | `discovery_cache_ttl`, `discovery_cache_max_entries` |
| Client (FastAPI package) | discovery URL, client ID, client secret, scope, audience, redirect URIs, excluded paths |

Defaults stay as they are today.

## Priority ordering

The Python stories are stacked in order: 25.1 → 25.2 → 25.3, with 25.4 and 25.5 alongside 25.2. Go (25.6) and Rust (25.7) are independent and can go at any time.

---

## Story 25.1: Plain Python `Config`

**As a** library caller,
**I want** a plain, frozen `Config` with defaults and two small loaders,
**So that** I decide where settings come from.

### Acceptance Criteria

**Given** `Config()`,
**Then** every setting has today's default, and no environment access happens.

**Given** an invalid value (e.g. a negative retry count, a non-positive timeout),
**When** a `Config` is created,
**Then** it raises one error naming every invalid setting.

**Given** `Config.from_mapping({...})` with string values,
**Then** values are parsed and validated the same way; unknown keys are ignored.

**Given** `Config.from_env(prefix=...)`,
**Then** it is exactly `from_mapping` over `os.environ`. It is the only place in the library allowed to touch `os.environ`.

**And** the registry, `ConfigSource`, `EnvSource`, `MappingSource` and legacy-resolution code in `core/config.py` are deleted. `Secret` is kept if the client secret still needs redaction.

---

## Story 25.2: Wire the Python clients; delete the env readers

**As a** library caller,
**I want** to pass `config=` to clients and entry points,
**So that** the library uses my settings and nothing else.

### Acceptance Criteria

**Given** a client or entry point (sync and async HTTP clients, managed clients, discovery, JWKS, token validation),
**Then** it accepts `config: Config | None`. `None` means `Config()` defaults, not the environment.

**And** `get_retry_config`, `get_timeout`, `get_max_jwks_size`, `get_max_jwks_keys` (`core/http_utils.py`), the env TTL/entry readers (`core/jwks_cache.py`) and `get_ssl_verify` (`ssl_config.py`) are removed or take a `Config`.

**And** a negative retry count can no longer reach the retry loop (closes identity-model#728).

**And** the release is a major version, and the changelog says that environment variables only take effect via `Config.from_env()`.

---

## Story 25.3: FastAPI package uses the same helpers

**Given** `OIDCSettings.from_env(prefix)`,
**Then** it builds through the library's loaders and is the only environment read in the package. `build_oidc_router(settings, ...)` and `TokenValidationMiddleware` pass the settings through to the library.

---

## Story 25.4: One plain spec page

**Given** `spec/config.md`, `spec/vectors/config.json` and `spec/test-fixtures/config/`,
**Then** they are replaced by one short page that lists the settings, their types and defaults, and states that the library does not read the environment. No case IDs.

**And** `docs/api/config.md` and the Configuration row in `spec/capabilities.md` match it.

---

## Story 25.5: Gate against environment reads coming back

**Given** a Python unit test that replaces `os.environ` with an object that fails on any access,
**When** a client operation runs with an injected `Config`,
**Then** it passes. Reverting any one wiring change from 25.2 makes it fail.

**And** ruff's banned-API rule (`TID251`) forbids `os.getenv` / `os.environ` in library code outside `Config.from_env`.

---

## Story 25.6: Go — drop the cache-size env read

**Given** `go/pkg/discovery/options.go` and `go/pkg/jwks/options.go`,
**Then** the max-cache-entries value comes only from options, with today's default. `os.Getenv` no longer appears in `go/pkg/`.

---

## Story 25.7: Rust — drop the cache-size env read

**Given** `rust/src/env.rs` and its callers in the discovery and JWKS clients,
**Then** the max-cache-entries value comes only from the client builder, with today's default, and `env.rs` is deleted. `std::env::var` no longer appears in `rust/src/`.
