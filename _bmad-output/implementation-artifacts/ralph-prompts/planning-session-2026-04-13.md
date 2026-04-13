# Planning Session — Auth Workspace State & Next Steps

## Date Context
Today is 2026-04-13. This prompt captures workspace state for a fresh planning session.

## Workspace Overview

Four repos at `~/repos/auth/`, each with its own git history:

| Repo | Latest | Status |
|------|--------|--------|
| **py-identity-model** | v2.19.2 (47a86ed) | Active — OIDC conformance nearly complete |
| **terraform-provider-descope** | v1.1.4 (e425de4) | Stable — only blocked SSO task remaining |
| **identity-stack** | (ffbc8db) | Active — backend fixes ongoing |
| **identity-stack-planning** | (1a6dc83) | This repo — planning hub |

## py-identity-model — Current State

### Conformance Results (as of PR #362 merged 2026-04-12)
- **Basic RP:** 13/13 PASS + 1 SKIP (sig-none) — **COMPLETE**
- **Form Post Basic RP:** 13/13 PASS + 1 SKIP (sig-none) — **COMPLETE**
- **Config RP:** 4/5 PASS + 1 SKIP + 1 TIMEOUT (signing-key-rotation) — **1 test remaining**

### Completed conformance work (T140-T144, T160-T163, T165, T176)
- Library: kid fallback, UserInfo sub validation, JWKS TTL cache + forced refresh on sig failure
- Harness: FastAPI RP app, API-driven test runner, Docker Compose, form post support
- Infra: SSL cert sharing (cert-init), cache clearing between tests, hosted workflow, Makefile refactor

### What's left for certification
1. **T145** — Config RP `signing-key-rotation` timeout. The double-flow test drives two sequential auth flows to test key rotation. The second flow times out. Likely needs the runner to clear caches between the two flows or the retry logic needs tuning.
2. **T146** — Fix any remaining failures after T145
3. **T164** — Apply for OIDF OSS certification fee waiver (manual, owner-driven)

### Open security issues (#300 umbrella, #347-#357)
- **Critical:** #347 (options pass-through allows disabling signature verification) — NOT yet fixed
- **High:** #349 (algorithm confusion via legacy get_public_key_from_jwk), #350 (SSRF via redirect following), #351 (disco cache poisoning via None key), #352 (JWT decode cache returns stale results for expired tokens)
- **Medium:** #353 (no JWKS size limit), #354 (endpoint authority validation skipped), #355 (JWKS Content-Type validation skipped), #356 (validate_https_url fallback permits HTTP), #357 (async cleanup lock race)
- **CodeQL:** #360 (7 open alerts in conformance harness — stack trace exposure + sensitive data logging)

### Product roadmap (from product brief)
The monorepo evolution plan (#332, #333, #334):
1. **T170** — Restructure into uv workspace monorepo
2. **T171** — `py-identity-model-cli` — RFC 8252 loopback CLI login tool
3. **T172** — `fastapi-identity-model` — FastAPI middleware for OIDC auth

User noted: the UserInfo sub mismatch enforcement currently lives in the conformance harness (app.py) rather than in middleware. When building fastapi-identity-model, this validation should move into the middleware layer where it belongs.

## identity-stack — Current State

Backend fixes ongoing. All prior epics complete (T14-T26, T64-T75, T80-T84, T90-T98, T117-T119).

### Pending features
- T71: CI/CD pipeline
- T76: Magic Link auth for invitations
- T77: Step-Up auth for sensitive ops
- T78: Descope Audit Trail integration
- T79: JWT Template customization demo

## terraform-provider-descope — Stable

All tasks complete except T6 (SSO application resource — blocked on enterprise license). Releases v1.1.0-v1.1.4 published.

## Key Decisions Needed

1. **Conformance finish vs product work**: T145 (Config RP key rotation) is the last conformance test. Fix it and apply for certification (#T164)? Or pivot to product work (CLI + middleware)?

2. **Security issues priority**: 12 open security issues from adversarial review. Some are critical (options pass-through, unbounded caching — #348 now closed). Address before or after monorepo restructure?

3. **Monorepo timing**: The product brief proposes restructuring into a uv workspace before building CLI and middleware packages. This is a large refactor (T170). Worth doing now while conformance CI is green, or defer?

4. **identity-stack next phase**: Backend fixes are active but pending features (T76-T79) are untouched. Should these wait for py-identity-model middleware (T172) since the stack depends on it?

## File References

| Purpose | Path |
|---------|------|
| Task queue | `_bmad-output/implementation-artifacts/task-queue.md` |
| Product brief | `_bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md` |
| Conformance analysis | `~/repos/auth/py-identity-model/docs/oidc-certification-analysis.md` |
| Security issues | py-identity-model GH issue #300 (umbrella) |
| Certification tracking | py-identity-model GH issue #242 |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| PRD | `_bmad-output/planning-artifacts/prd.md` |

## Available BMAD Skills

Use `/bmad-help` for contextual guidance. Key skills:
- `/bmad-sprint-planning` — generate sprint plan from current state
- `/bmad-correct-course` — handle significant scope changes
- `/bmad-pm` — product manager agent for prioritization
- `/bmad-architect` — architecture agent for technical decisions
