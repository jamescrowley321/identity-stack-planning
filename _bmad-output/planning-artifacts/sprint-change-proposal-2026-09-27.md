# Sprint Change Proposal — Replace the Configuration API with Injected Config

**Date:** 2026-09-27
**Trigger:** Owner (James) reviewing identity-model#734 (bounded HTTP env-var parsing): the patch is sound, but it adds another hand-written environment parser to a library that should not be reading the environment at all. Configuration grew one variable at a time and was never designed.
**Mode:** Batch
**Scope Classification:** Major — the Configuration API epic (identity-model#616) is replaced, not amended.
**Status:** Approved (owner direction, 2026-09-27)

---

## 1. Issue Summary

The library reads environment variables from inside its own code, and each reader parses and validates in its own way:

| Where | What it reads |
|---|---|
| `py/src/py_identity_model/core/http_utils.py` | `HTTP_TIMEOUT`, `HTTP_RETRY_*`, `MAX_JWKS_SIZE`, `MAX_JWKS_KEYS` |
| `py/src/py_identity_model/core/jwks_cache.py` | `JWKS_CACHE_TTL`, `DISCO_CACHE_TTL`, `JWKS_CACHE_MAX_ENTRIES` |
| `py/src/py_identity_model/ssl_config.py` | `SSL_CERT_FILE`, `CURL_CA_BUNDLE`, `REQUESTS_CA_BUNDLE` |
| `fastapi-identity-model` `OIDCSettings.from_env` | `OIDC_*` client settings |
| `go/pkg/{discovery,jwks}/options.go`, `rust/src/env.rs` | cache max-entries |

A caller cannot hand the library its settings and have it stop looking at the environment.

The previous fix, the Configuration API epic (#616), made this bigger rather than smaller:
- It added a source registry, a legacy-resolution mode, and about 450 lines of spec, test vectors and fixtures with invented case IDs (`CFG-001`…).
- Its spec made the environment impossible to switch off: `EnvSource` was "implicitly last", and legacy reads stayed at their original call sites.
- The typed `Config` it shipped (`core/config.py`, 685 lines) has **zero production call sites**.

## 2. Impact Analysis

### Epics and issues

| Item | Impact |
|---|---|
| identity-model#616 epic, #617–#620 stories | **Closed, not planned.** Replaced by Epic 25 / identity-model#751. |
| identity-model#729 (spec amendment) | **Closed, not planned.** Its goal, no env access once config is injected, is now the whole design. |
| identity-model#734 (bounded env parsing) | **Closed unmerged.** |
| identity-model#728 (negative retry count sends no request) | **Stays open**, and is fixed by Story 25.2: the value is rejected when a `Config` is created. |
| identity-stack#406, #407 (app-side config) | **Unchanged, stay open.** Their goal (build config once at startup, pass it in) matches the new design. |
| TypeScript (#620) | **Dropped.** Not re-planned here. |

### Artifact conflicts

| Artifact | Action |
|---|---|
| `product-brief-config-api.md`, `prd-config-api.md`, `architecture-config-api.md`, `epics-config-api.md` | Archived (`_archive/README.md`). The PRD listed "no removal of the env-var default path" as a non-goal, which is the opposite of the new direction. |
| identity-model `spec/config.md`, `spec/vectors/config.json`, `spec/test-fixtures/config/` | Replaced by one short plain-English page (Story 25.4). |
| identity-model `core/config.py` registry and sources | Replaced by a plain `Config` (Story 25.1). |

### Technical impact

This is a breaking change and needs a major version. Setting `HTTP_TIMEOUT` and the other variables no longer does anything; callers build a `Config` and pass it in. The owner judges that nobody depends on the implicit reads.

## 3. Recommended Approach

**Selected: replace (rollback plus a new, smaller epic).** Amending #616 would keep the registry, the source protocol and the case-ID spec, which are the complexity being removed.

The design:
1. **Settings are passed in.** A plain, frozen `Config` with defaults. Clients and entry points take `config=`. No `config` means defaults, not the environment.
2. **The library never reads `os.environ`.** Validation happens once, when a `Config` is created.
3. **Loading is entirely the caller's job.** The dependency is fully inverted: the library ships no loaders (no `from_env`, no `from_mapping`). Callers read environment variables, `.env` files, YAML or a secrets manager in their own code and construct a typed `Config`. The docs show a short example.
4. **The spec is one plain page:** the settings, their types and defaults, and a statement that the library does not read the environment. No case IDs.

**Effort:** small to medium. Python is most of it; Go and Rust each have a single env read.
**Risk:** low, given the owner's call on usage.

## 4. Detailed Change Proposals

See `epics/epic-25-injected-config.md` for the stories.

## 5. Implementation Handoff

- **Scope:** Major (replan), already executed at the planning level. The epic is ready for development.
- **Developer:** Stories 25.1 → 25.5 in Python, as stacked PRs merged bottom-up by the owner. Then 25.6 (Go) and 25.7 (Rust) independently.
- **Success criteria:**
  - No library code in any language reads the process environment.
  - Every setting is reachable by passing a `Config` (or the language's equivalent options).
  - A gate fails if an environment read is reintroduced.
