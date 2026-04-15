# Security Fix Plan — py-identity-model

**Created:** 2026-04-12
**Updated:** 2026-04-14 (re-audit results)
**Tracking issue:** #300 (umbrella)
**Status:** Phase 1 complete, Phase 2 open

## Overview

The original adversarial review (2026-04-12) identified 12 findings. Fixes were implemented across PRs #364–#372. A re-audit (2026-04-14) verified 10 of 12 fixes and identified 8 new findings (3 high, 5 medium).

## Phase 1 — Original Findings (COMPLETE)

All 6 batches merged via PRs #364–#372. Status:

| Batch | Issues | PRs | Status |
|-------|--------|-----|--------|
| 1 — Caching overhaul | #351, #352 | #364 | Done |
| 2 — Options allowlist | #347 | #366 | Done |
| 3 — HTTP hardening | #350, #354, #355, #356 | #367 | Done |
| 4 — Algorithm confusion | #349 | #370 | Done |
| 5 — Resource limits + concurrency | #353, #357 | #371 | Done |
| 6 — CodeQL harness | #360 | #372 | Done |

### Re-Audit Verification

| Finding | Fix Status | Notes |
|---------|-----------|-------|
| C-1 (#347) Options bypass | **FIXED** | `_sanitize_options` blocklist effective |
| C-2 (#348) Unbounded caching | **FIXED** | TTL-based caching with kid-miss refresh |
| H-1 (#349) Algorithm confusion | **PARTIAL** | Main path fixed; `get_public_key_from_jwk` still mutates → #375 |
| H-2 (#350) SSRF redirects | **FIXED** | `follow_redirects=False` on all 4 clients + `check_no_redirect()` |
| H-3 (#351) None cache poisoning | **FIXED** | Early rejection in sync/async |
| H-4 (#352) Stale decode cache | **FIXED** | Decode caching removed entirely |
| M-1 (#353) JWKS size limit | **NOT FIXED** | No size limit implemented → #376 |
| M-2 (#354) Endpoint authority | **FIXED** | `_validate_endpoint_authority` validates all endpoints |
| M-3 (#355) JWKS Content-Type | **FIXED** (caveat) | Missing Content-Type is warning only → #379 |
| M-4 (#356) HTTPS enforcement | **FIXED** | Strict by default via `DiscoveryPolicy` |
| M-5 (#357) Async cleanup race | **PARTIAL** | Safe in event loop; TOCTOU with test reset → #382 |
| CodeQL (#360) | **FIXED** | All 7 alerts resolved |

## Phase 2 — Re-Audit Findings (OPEN)

8 new findings from the 2026-04-14 re-audit.

### Batch 7 — Unfixed residuals (high priority)

**Issues:** #375, #376
**Scope:** Two original findings that were closed without full remediation.

Changes:
- **#375**: Deprecate `get_public_key_from_jwk` — add `DeprecationWarning`, remove from `__all__`, stop mutating `key.alg` from JWT header
- **#376**: Add JWKS response size limit — check Content-Length, cap at 512KB, limit to 100 keys max

### Batch 8 — API correctness

**Issues:** #377
**Scope:** Dead `require_https` field on `TokenValidationConfig`.

Changes:
- **#377**: Either wire `require_https` through to `DiscoveryPolicy` in `_discover_and_resolve_key`, or deprecate the field

### Batch 9 — Defense-in-depth hardening

**Issues:** #378, #379, #380
**Scope:** Cache stampede prevention, stricter Content-Type handling, JWKS scheme validation.

Changes:
- **#378**: Add single-flight cache refresh to prevent thundering herd on TTL expiry
- **#379**: Reject JWKS responses with missing Content-Type (or add `KeyError` guard on `response_json["keys"]`)
- **#380**: Add pre-flight URL scheme validation to `get_jwks()` matching the discovery pattern

### Batch 10 — Harness + test-only fixes

**Issues:** #381, #382
**Scope:** Conformance harness XSS and async test cleanup.

Changes:
- **#381**: Escape all interpolated values in conformance harness HTML responses with `html.escape()`
- **#382**: Eagerly initialize async cleanup lock at module load time, or guard `_reset` against concurrent close

## Execution Order (Phase 2)

1. **Batch 7** (residuals) — highest priority, two unfixed findings
2. **Batch 8** (API correctness) — standalone
3. **Batch 9** (hardening) — 3 related defense-in-depth improvements
4. **Batch 10** (harness/test) — lowest priority

Batches 7-10 are independent and can be parallelized.

## PR Strategy

- Each batch = one PR with conventional commit title
- Each PR references issue numbers with `Closes #NNN`
- All PRs target `main`
