---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'EPIC-18-LOAD-SOAK'
epic_title: 'Load & Soak Testing — Prove Behavior Under Real Concurrency'
date: '2026-08-02'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/epics/epic-10-benchmarks.md
  - _bmad-output/planning-artifacts/epics/epic-16-audit-remediation.md
---

# Epic 18: Load & Soak Testing

## Overview

Everything is currently tested single-shot and functional — **zero evidence under concurrency, throughput,
or sustained load**. The 2026-08-02 audit flagged the exact place this matters: the JWKS/disco cache's
cross-loop/cross-thread locking (RT4-F6) is *correct by reading* but never proven under real load, and the
`fastapi-identity-model` middleware (the production surface) has never been driven at scale. This epic makes
performance and concurrency-correctness first-class, with a baseline, SLOs, and a nightly regression gate.

It realizes the load/soak portion of the E2E token-blaster epic (**#462–#474**, esp. **#474** — Locust
load/soak, TH-1.5) and extends the benchmark work in epic-10. Services are provisioned via **docker-compose**
(not in-code test containers).

## Stories

---

### Story L.1: Load-test harness & baseline

```yaml
story_id: L.1
title: "Locust + micro-benchmark harness and a committed baseline"
epic: EPIC-18-LOAD-SOAK
status: draft
priority: high
estimation: M
```

**User Story**

> As the maintainer,
> I want a repeatable load-test harness and a committed baseline,
> so that every later change can be compared against known throughput/latency numbers.

**Deliverables**

- A Locust suite driving the `fastapi-identity-model` middleware end-to-end (auth'd requests validated by the
  library), and a `pytest-benchmark` micro-harness for the hot library functions (`validate_token`, JWKS
  fetch/cache, DPoP proof build).
- `make load-test` / `make soak-test`; a committed `docs/perf/baseline.md` (env, versions, numbers).
- docker-compose environment (mock OP or a real IdP; a JWKS server that can rotate).

**Acceptance Criteria**

- **AC-L.1.1** Given `make load-test`, when run against the compose stack, then it produces p50/p95/p99
  latency and throughput for `validate_token` and the middleware, written to a report.
- **AC-L.1.2** Given the baseline, when committed, then it records environment + version + numbers so it is
  reproducible.

---

### Story L.2: JWKS/disco cache under concurrency (RT4-F6 validation)

```yaml
story_id: L.2
title: "Prove the JWKS/disco cache under concurrent multi-issuer load, rotation, and stampede"
epic: EPIC-18-LOAD-SOAK
status: draft
priority: high
estimation: L
audit_refs: [RT4-F6]
```

**User Story**

> As the maintainer,
> I want the JWKS/disco cache proven under real concurrency,
> so that the reentrant-lock correctness the audit accepted "by reading" is demonstrated — no contention,
> deadlock, stale-key acceptance, or cache-miss stampede.

**Deliverables**

- Concurrency tests: N threads + M event loops validating tokens from **many issuers** simultaneously
  (multi-tenant LRU pressure); **key rotation mid-flight** (rotate the JWKS while requests are in flight);
  **cache-miss stampede** (cold cache, burst of concurrent misses → assert single-flight, no thundering herd).
- Assertions: no deadlock/contention on `_CACHE_STRUCTURE_LOCK`; no stale/wrong key validates a token; correct
  per-issuer/per-tenant isolation under load.

**Acceptance Criteria**

- **AC-L.2.1** Given a burst of concurrent cold-cache validations for the same issuer, when run, then the
  JWKS endpoint is hit at most once (single-flight) and all validations succeed.
- **AC-L.2.2** Given key rotation while requests are in flight, when run, then no request accepts a stale key
  and post-rotation tokens validate.
- **AC-L.2.3** Given sustained multi-issuer concurrency, when run, then no deadlock/timeout on the cache lock.

---

### Story L.3: `validate_token` throughput & sync/async parity

```yaml
story_id: L.3
title: "Throughput and sync vs async parity for the validation hot path"
epic: EPIC-18-LOAD-SOAK
status: draft
priority: medium
estimation: M
```

**User Story**

> As the maintainer,
> I want throughput numbers for the validation hot path in both sync and async,
> so that crypto/verification cost is known and the two APIs are proven at parity.

**Deliverables**

- Benchmarks for `validate_token` (sync + async) across algorithms (RS256/ES256/PS256), cache-hit vs
  cache-miss; a mixed workload (valid/expired/forged) reflecting real traffic.

**Acceptance Criteria**

- **AC-L.3.1** Given the benchmark, when run, then sync and async throughput are reported and within a
  documented tolerance of each other.

---

### Story L.4: Soak test — memory, leaks, LRU under pressure

```yaml
story_id: L.4
title: "Multi-hour soak: memory stability and LRU eviction under pressure"
epic: EPIC-18-LOAD-SOAK
status: draft
priority: medium
estimation: M
```

**User Story**

> As the maintainer,
> I want a multi-hour soak test,
> so that memory growth, leaks, and LRU eviction behavior under sustained many-issuer load are known before
> production.

**Deliverables**

- A soak scenario (hours) with many issuers exceeding the LRU capacity; RSS/heap sampled over time; assert no
  unbounded growth and that eviction behaves (miss → re-fetch, no corruption).

**Acceptance Criteria**

- **AC-L.4.1** Given a multi-hour soak exceeding LRU capacity, when run, then RSS stabilizes (no unbounded
  growth) and no errors from eviction/re-fetch.

---

### Story L.5: Middleware under load with real tokens (token-blaster tie-in)

```yaml
story_id: L.5
title: "Blast the fastapi-identity-model middleware with real tokens from all IdPs"
epic: EPIC-18-LOAD-SOAK
status: draft
priority: high
estimation: L
depends_on: ["#462"]
```

**User Story**

> As the maintainer,
> I want the production middleware driven at scale with real tokens from every integration IdP,
> so that load behavior reflects real issuers/JWKS/rotation, not a mock in a vacuum.

**Deliverables**

- Integrate the load harness with the E2E token-blaster (#462–#474): real tokens from Descope/Auth0/Entra/
  Cognito/Keycloak/Ory minted and blasted at the middleware under concurrency; measure end-to-end.

**Acceptance Criteria**

- **AC-L.5.1** Given real tokens from the integration IdPs, when blasted at the middleware under load, then
  latency/throughput/error-rate are reported per IdP and meet the SLOs from L.6.

---

### Story L.6: SLOs + nightly perf-regression gate

```yaml
story_id: L.6
title: "Define SLOs and gate performance regressions nightly"
epic: EPIC-18-LOAD-SOAK
status: draft
priority: medium
estimation: M
```

**User Story**

> As the maintainer,
> I want SLOs and a nightly perf-regression gate,
> so that a change that halves throughput or leaks memory is caught automatically.

**Deliverables**

- SLOs derived from the L.1 baseline (p95 validation latency, min throughput, max RSS growth, cache hit-ratio).
- A nightly CI job running the load/soak suite and failing on regression beyond a tolerance; results published.

**Acceptance Criteria**

- **AC-L.6.1** Given a synthetic regression (e.g. disable the cache), when the nightly gate runs, then it
  fails against the SLOs.

---

## Requirements (shared)

- Services via **docker-compose**, not in-code test containers.
- Load/soak are **nightly / on-demand**, not per-PR (except a fast smoke benchmark).
- Concurrency-correctness assertions (L.2) are real tests, not just timing — they assert no stale key / no
  deadlock, complementing the audit's read-only acceptance of RT4-F6.

## Dependencies

- Extends epic-10 (benchmarks) and the E2E token-blaster epic (#462–#474, esp. #474). L.5 depends on #462.
- L.2 validates the audit's RT4-F6 (JWKS-cache locking) under real concurrency.

## References

- [Locust](https://locust.io) · [pytest-benchmark](https://pytest-benchmark.readthedocs.io)
- Related issues: #474 (Locust load/soak, TH-1.5), #462–#474 (E2E token-blaster epic), epic-10-benchmarks
