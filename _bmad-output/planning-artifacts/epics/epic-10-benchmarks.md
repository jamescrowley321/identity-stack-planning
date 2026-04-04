---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '10'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 10: Performance Benchmarks

**Goal:** Establish rigorous, reproducible performance benchmarks across all identity-model language ports, enabling cross-language comparison, regression detection, and transparent competitive analysis.

## Overview

Performance matters for identity libraries — token validation sits in the hot path of every authenticated request, and discovery/JWKS resolution latency directly impacts cold-start times. This epic delivers a benchmark specification, per-language benchmark suites in CI, a public dashboard, and fair comparison benchmarks against alternative libraries in each ecosystem.

---

### Story 10.1: Cross-Language Benchmark Specification

As a **port maintainer**,
I want a shared benchmark specification in `spec/benchmarks.md`,
So that all language ports measure the same operations with consistent methodology and comparable results.

**Scope:**

Define standard benchmarks for all identity-model operations:

| Benchmark | Metric | Notes |
|-----------|--------|-------|
| JWT validation throughput | ops/sec | RS256, ES256, EdDSA; warm cache (JWKS pre-loaded) |
| Discovery fetch latency | p50/p95/p99 ms | Cold fetch against live and mock OIDC provider |
| JWKS resolution latency | p50/p95/p99 ms | Cold fetch, warm cache hit, forced refresh |
| Token endpoint round-trip | p50/p95/p99 ms | Client credentials grant against mock provider |
| Memory footprint per operation | bytes/op | Allocation tracking per benchmark operation |

Methodology requirements:
- Warm-up iterations before measurement
- Minimum iteration count and duration thresholds
- Statistical significance requirements (confidence intervals, outlier handling)
- Machine-specification reporting (CPU, OS, runtime version)
- Isolation requirements (no network I/O for throughput benchmarks; mock servers for latency benchmarks)

**Acceptance Criteria:**

**Given** a contributor reading `spec/benchmarks.md`
**When** they implement benchmarks in any language
**Then** the benchmark names, measurement methodology, and reporting format match the spec exactly

**Given** benchmark results from two different languages
**When** displayed side by side
**Then** the metrics are directly comparable because the spec enforces identical workloads and measurement rules

- [ ] **Unit test:** Validation script checks `spec/benchmarks.md` for completeness (all operations covered, all metrics defined, methodology section present)
- [ ] **Integration test:** At least one language port's benchmark output validated against the spec schema (JSON output matches expected fields)
- [ ] **Example:** Sample benchmark report (JSON + human-readable) showing all five benchmark categories with mock data

---

### Story 10.2: Per-Language Benchmark Suites

As a **port maintainer**,
I want benchmark suites implemented in each language using idiomatic tooling,
So that I can measure performance locally and catch regressions in CI.

**Scope:**

Implement benchmarks per `spec/benchmarks.md` using each language's standard tooling:

| Language | Tool | Location |
|----------|------|----------|
| Python | `pytest-benchmark` | `packages/py/benchmarks/` |
| Node/TypeScript | `vitest bench` | `packages/node/benchmarks/` |
| Go | `testing.B` | `packages/go/benchmarks/` |
| Rust | `criterion` | `packages/rs/benches/` |

Each suite must:
- Cover all five benchmark categories from the spec
- Output results in a standardized JSON format for dashboard ingestion
- Run in CI on every PR (smoke mode — short iteration count) and nightly (full mode)
- Store baseline results for regression comparison
- Use mock OIDC provider for latency benchmarks (no external network dependency)

**Acceptance Criteria:**

**Given** a PR that introduces a 15% JWT validation throughput regression in the Python port
**When** CI runs the benchmark suite in smoke mode
**Then** the benchmark job reports the regression with before/after numbers

**Given** the nightly CI run completes
**When** benchmark results are collected
**Then** JSON output for each language contains all five benchmark categories with ops/sec, latency percentiles, and bytes/op metrics

**Given** a developer running benchmarks locally
**When** they execute the language-specific benchmark command (e.g., `pytest --benchmark-only`, `vitest bench`, `go test -bench=.`, `cargo bench`)
**Then** results display in the terminal and optionally export to JSON

- [ ] **Unit test:** Each benchmark suite runs successfully with mock data and produces valid JSON output
- [ ] **Integration test:** CI workflow runs all four language suites end-to-end and collects results
- [ ] **Example:** `docs/benchmarks/running-locally.md` — instructions for running benchmarks in each language with sample output

---

### Story 10.3: Benchmark Dashboard

As a **project consumer evaluating identity-model**,
I want a public benchmark dashboard with cross-language comparison charts and historical trends,
So that I can assess performance characteristics and track improvements over time.

**Scope:**

- Publish benchmark results to GitHub Pages or Codspeed
- Cross-language comparison charts: side-by-side bar charts for each benchmark category across all four languages
- Historical trend lines: track each metric over time per language
- CI regression gate: fail the PR if any benchmark regresses by more than 10% vs. the baseline
- Dashboard auto-updates on merge to `main` (nightly results update historical data)
- Machine/environment metadata displayed alongside results

**Acceptance Criteria:**

**Given** benchmark results from all four language ports
**When** the dashboard renders
**Then** each benchmark category shows a cross-language comparison chart with ops/sec, latency, and memory metrics side by side

**Given** a PR that causes a 12% regression in Go JWKS resolution latency
**When** CI compares against the stored baseline
**Then** the PR check fails with a clear message: "go-identity-model JWKS resolution latency regressed 12% (threshold: 10%)"

**Given** two months of nightly benchmark runs
**When** viewing the dashboard
**Then** historical trend lines show per-language performance over time with commit SHAs linked to data points

- [ ] **Unit test:** Dashboard build succeeds with fixture data and renders all expected chart components
- [ ] **Integration test:** End-to-end pipeline: benchmark run produces JSON, dashboard ingests it, CI regression check evaluates threshold
- [ ] **Example:** Screenshot or live link of the dashboard showing all four languages across all five benchmark categories

---

### Story 10.4: Comparison Benchmarks Against Alternatives

As a **developer choosing an OIDC/OAuth2 library**,
I want fair, reproducible benchmarks comparing identity-model against established alternatives in each language,
So that I can make an informed decision based on transparent performance data.

**Scope:**

Benchmark identity-model against the dominant alternative in each ecosystem:

| Language | identity-model | Alternative |
|----------|---------------|-------------|
| Python | py-identity-model | authlib |
| Node | @identity-model/node | openid-client |
| Go | go-identity-model | coreos/go-oidc |
| Rust | rs-identity-model | openidconnect-rs |

Methodology:
- Identical workloads: same JWTs, same OIDC provider mock, same key material
- Same machine, same CI runner, same benchmark run
- All five benchmark categories from the spec where the alternative supports the operation
- Pin alternative library versions for reproducibility
- Document any differences in feature scope that affect comparison fairness (e.g., one library does extra validation)
- Results published alongside the main dashboard with clear methodology notes

**Acceptance Criteria:**

**Given** a comparison benchmark run for Python
**When** py-identity-model and authlib both validate the same 1000 JWTs with RS256
**Then** the results report ops/sec, p50/p95/p99 latency, and bytes/op for both libraries under identical conditions

**Given** an alternative library that does not support a benchmark category (e.g., no built-in discovery)
**When** the comparison report renders
**Then** that category is marked "N/A" with an explanation rather than omitted silently

**Given** a new release of an alternative library
**When** a maintainer updates the pinned version and re-runs benchmarks
**Then** the comparison dashboard reflects updated numbers with version metadata

- [ ] **Unit test:** Comparison harness validates that both libraries receive identical inputs (same JWT, same keys, same mock server)
- [ ] **Integration test:** Full comparison run for at least one language pair produces valid results with both libraries in a single CI job
- [ ] **Example:** Published comparison report for one language pair with methodology notes, version pins, and caveats

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 10.1 (Benchmark Spec) | Epic 0 spec stories (operations defined) |
| 10.2 (Per-Language Suites) | 10.1, Epics 1-4 (language ports exist) |
| 10.3 (Dashboard) | 10.2 (benchmark suites produce data) |
| 10.4 (Comparison Benchmarks) | 10.2 (benchmark harness exists) |

## Design Principles

1. **Reproducibility first** — Pinned versions, fixed workloads, machine metadata, and deterministic mock servers
2. **Fair methodology** — Comparison benchmarks use identical inputs and conditions; differences in library scope are documented, not hidden
3. **CI-integrated** — Benchmarks run automatically; regressions block PRs before they land
4. **Public and transparent** — Dashboard is publicly accessible; methodology is documented; raw data is available
