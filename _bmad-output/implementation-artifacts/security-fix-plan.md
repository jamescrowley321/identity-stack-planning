# Security Fix Plan — py-identity-model

**Created:** 2026-04-12
**Tracking issue:** #300 (umbrella)
**Status:** In progress

## Overview

12 open security findings from adversarial review, grouped into 6 implementation batches to minimize CI wait time. Small, related fixes share a branch.

## Batches

### Batch 1 — Caching overhaul
**Branch:** `fix/cache-overhaul`
**Issues:** #351, #352
**Scope:** Remove all caches except HTTP-header-aware discovery and JWKS caches.

Changes:
- Remove `_decode_jwt_cached` lru_cache (PR #363 in progress)
- Remove `_get_pyjwk` lru_cache
- Replace discovery `lru_cache`/`alru_cache` with TTL-based cache respecting `Cache-Control` headers
- Add `cache_control` field to `DiscoveryDocumentResponse`
- Generalize `jwks_cache.py` into shared `http_cache.py` module
- Validate `disco_doc_address` is not None before cache lookup
- Add cross-user cache pollution test (50+ distinct subs)
- Add TTL expiry regression tests

**After this batch, the only caches are:**
| Cache | TTL Source | Eviction |
|-------|-----------|----------|
| Discovery | Cache-Control max-age > `DISCO_CACHE_TTL` env > 3600s default | TTL-based |
| JWKS | Cache-Control max-age > `JWKS_CACHE_TTL` env > 86400s default | TTL-based |

### Batch 2 — Options allowlist (critical)
**Branch:** `fix/options-allowlist`
**Issues:** #347
**Scope:** Prevent callers from disabling signature verification or expiration checks via options pass-through.

Changes:
- Allowlist permitted `options` keys: `require`, `verify_aud`, `verify_iss`
- Block: `verify_signature`, `verify_exp`, `verify_nbf` — always enforced
- Raise `ConfigurationException` if blocked keys are passed
- Audit `TokenValidationConfig` for unchecked pass-through

**Breaking change:** Callers passing `verify_signature: False` will get an error. Intentional — they have a vulnerability.

### Batch 3 — HTTP security hardening
**Branch:** `fix/http-hardening`
**Issues:** #350, #354, #355, #356
**Scope:** Harden all HTTP interactions — redirects, authority, content-type, HTTPS enforcement.

Changes:
- Disable `follow_redirects` on all httpx clients (#350)
- Derive authority from issuer when `policy.authority` not set (#354)
- Validate JWKS `Content-Type` header (#355)
- Remove HTTP URL fallback, require HTTPS by default (#356)
- Add `allow_http` opt-in for development/localhost

### Batch 4 — Algorithm confusion
**Branch:** `fix/algorithm-confusion`
**Issues:** #349
**Scope:** Enforce key type / algorithm consistency.

Changes:
- Validate `kty` matches `alg` family (RSA→RS/PS, EC→ES)
- Check key's `alg` field matches JWT header `alg`
- Audit `find_key_by_kid` for same issue

### Batch 5 — Resource limits + concurrency
**Branch:** `fix/resource-limits`
**Issues:** #353, #357
**Scope:** Add response size limits and fix async race condition.

Changes:
- Add configurable max JWKS response size (default 512KB) (#353)
- Fix async cleanup lock race in `aio/http_client.py` (#357)

### Batch 6 — CodeQL harness fixes
**Branch:** `fix/codeql-harness`
**Issues:** #360
**Scope:** Fix 7 CodeQL alerts in conformance harness (not library code).

Changes:
- Remove stack trace exposure in HTTP error responses
- Redact sensitive data from log statements

## Execution Order

1. **Batch 1** (caching) — foundational; other batches touch HTTP/validation code that may interact with caching
2. **Batch 2** (#347 critical) — highest severity, standalone
3. **Batch 3** (HTTP hardening) — 4 related issues, single branch
4. **Batch 4** (algorithm) — standalone, lower dependency
5. **Batch 5** (limits + concurrency) — independent
6. **Batch 6** (CodeQL) — lowest priority, harness-only

Batches 2-6 can be parallelized after Batch 1 lands since they're independent. Batch 1 goes first because it changes caching infrastructure that other batches' tests may depend on.

## PR Strategy

- Each batch = one PR (except Batch 1 which supersedes PR #363)
- Small changes within a batch share a single commit where possible
- Each PR references the relevant issue numbers with `Closes #NNN`
- All PRs target `main` with conventional commit titles
