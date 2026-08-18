# Planning Prompt — Consolidate `py-identity-model` + `identity-model` (Go/Rust) to kill duplicated test-harness work

> **Status:** planning brief (not yet executed) · **Created:** 2026-08-17
> **Purpose:** a self-contained prompt to drive a detailed design + migration plan for removing the duplicated test-harness / conformance / fixture infrastructure across the Python and Go/Rust identity-model repos.
> **How to run:** drop into a fresh planning session, a BMAD architect/analyst workflow, or a ralph planning loop. It produces a design + phased plan + decision log — it does **not** perform the migration.
> **Prior artifacts to build on (this repo):** `product-brief-identity-model-monorepo.md`, `architecture-token-harness-load-soak.md`, `epics-token-harness.md`, `oss-security-tooling-migration.md`.

---

## Mission
Design and produce a detailed, phased plan to eliminate the **duplicated test-harness, conformance, and fixture infrastructure** across two repos:
- `jamescrowley321/py-identity-model` — Python OIDC/OAuth2 lib (core + `packages/fastapi-identity-model`), **OIDF-CERTIFIED** (Basic/Config/Form-Post-Basic RP), python-semantic-release → PyPI.
- `jamescrowley321/identity-model` — polyglot monorepo: **Go** (Core+Extended) + **Rust** (Core-only), with its own conformance infra (K3–K6).

The driver is **maintenance pain from duplicated harness work**, not a desire to merge for its own sake. Optimize the plan to remove that duplication with the least risk, then decide how far to go on repo consolidation.

## Prior decisions already made (GIVENS — build on these; only reopen if the harness-pain driver genuinely changes the calculus, and if so say why)
These were decided in earlier planning (see the prior artifacts above and the reconciliation doc `docs/identity-model-reconciliation-2026-08-12.md`). Treat them as the baseline, not open questions:
1. **End-state direction: PIM moves INTO the `identity-model` monorepo as `python/`**, beside `go/`/`rust/`. identity-model is the purpose-built polyglot shell (`spec/` cross-language contract + `infra/` shared fixtures) and already anticipates this. Monorepo stays — **no repo split**. Naming `{py,go,rs}-identity-model`.
2. **Conformance/testing infra is built ONCE**, not per-language: a single source in `spec/` — language-neutral vectors + fixtures + expected outcomes keyed by **canonical error codes** (not per-language type names) — with a **thin per-language executor** that maps vectors → its API/errors, plus a coverage gate (every language executes every vector id). Go+Rust adopt it in the monorepo now; Python's thin executor drops onto the SAME vectors at consolidation.
3. **PIM's `conformance/` external OIDF-cert harness is a *different kind* of testing** (black-box certification vs. internal white-box vectors). Keeping it is NOT the duplication to eliminate — do not conflate the two.
4. **PIM is the behavioral source of truth** (features AND implementation); Go/Rust mirror its behavior. Divergence is *structural only* (flat idiomatic Go/Rust layout, not PIM's core/sync/aio shape) — never behavioral.
5. **Go module path stays `.../identity-model/go`** (already the case; don't break it).

## What is genuinely NEW / open for this plan to decide
- **Timing.** The prior trigger was "when identity-model is more mature" / "when PIM hits maintenance mode." The owner now wants to tackle this **head-on now**, because the duplicated *test-harness* work (not just conformance vectors) is a live maintenance drag. Assess do-it-now vs. a defined freeze window, and recommend.
- **Scope of "harness."** The settled `spec/` decision covers conformance *vectors*. This plan must extend the "build once" principle to the rest of the duplicated harness: the **mock-OP / booted-RS**, the **IdP docker fixtures**, the **golden token corpus**, and the **load/soak harness** — deciding which become shared language-neutral assets now vs. at consolidation.
- **Sequencing stepping-stone.** Since full PIM-into-monorepo migration is the end state but may be heavy to do amid active epics, evaluate whether **extracting the shared harness first** (as language-neutral fixtures/vectors + an HTTP-level load harness consumable by all three, possibly before the repos physically merge) delivers the pain relief faster and de-risks the eventual merge — i.e. treat "shared harness now, physical merge later" as a candidate phase-1, not a competing end-state.

## The concrete duplication (verify + quantify this first)
| Harness component | PIM (Python) | identity-model (Go/Rust) |
|---|---|---|
| Conformance runner + OP | `conformance/` + `conformance/docker-compose.yml` (OIDF hosted RP) | `conformance/`, `spec/conformance`, `go/internal/conformance` (K3–K6) |
| Mock OP / booted RS | `src/tests/harness/{mock_op,mock_op_server,rs_app,rs_server,token_source,corpus}.py` | Go/Rust equivalents (locate) |
| IdP docker fixtures | `test-fixtures/{node-oidc-provider,keycloak}/docker-compose.yml` + Descope/Ory | `infra/docker-compose.yml` |
| Golden token corpus / vectors | `corpus.py` / `token_source.py` (the ~15 token classes) | Go/Rust testdata (locate) |
| Load/soak harness | `src/tests/load/` (Locust: runner, scenarios, resource_sampler, capacity/soak) | (locate — likely absent or ad hoc) |

## The sequencing decision to recommend (end-state is already the monorepo — this is about HOW to get there)
The end-state is a given (PIM into the monorepo as `python/`, no repo split). The real choice is the path and phasing:
- **Path 1 — Merge-first.** Physically migrate PIM into the monorepo now (git history + release pipelines + CI), then converge the harness in-repo.
- **Path 2 — Shared-harness-first (stepping-stone).** Extract the language-neutral harness assets (IdP docker fixtures, golden JWT/JWKS/discovery vectors, an HTTP-level load/soak harness that boots any language's RS) into shared form consumed by both repos *before* the physical merge; do the repo merge as a later, de-risked step.
- **Path 3 — Hybrid / partial.** Merge the libs but keep some assets/pipelines staged.

Weigh against real costs — monorepo CI complexity, release-pipeline entanglement, OIDF cert continuity, migration risk, disruption to active epics. Give a **recommendation with rationale and a concrete phase ordering**, not a menu.

## Hard questions the plan MUST answer (don't hand-wave)
1. **Go module-path breakage.** Moving the Go module changes its import path → breaking for every Go consumer unless handled (subdir `go.mod` keeping the module path, or a documented consumer migration). Specify exactly how import stability is preserved.
2. **Release pipelines, kept independent.** PIM = python-semantic-release with scope-routed parser (`tools/release_parsers.py`) + the `(fastapi)` sub-package pipeline + PyPI trusted publishing; Go = tags/GoReleaser; Rust = cargo-release/crates.io. Design path-filtered, change-detected, independently-versioned release workflows in one repo (or across two).
3. **OIDF certification continuity.** PIM holds a CERTIFIED mark tied to a codebase + submission process (hosted conformance token, submission zips). Confirm a repo move does **not** invalidate the mark and define the re-attestation/submission steps if it does.
4. **Git history + tags preserved.** Specify the mechanism (git-filter-repo / subtree merge) that brings history into the target layout with blame and all release tags intact.
5. **CI matrix + secrets.** One docker IdP matrix brought up once and shared across py/go/rust suites; change-detection so only affected languages run; secret consolidation (Descope mgmt key, conformance token, publish OIDC).
6. **Shared-harness contract.** How do 3 languages consume shared fixtures/vectors? (golden vectors as JSON data + thin per-language adapters; a conformance driver; an HTTP-level load harness that's language-agnostic by construction.)
7. **In-flight work sequencing.** PIM epics #462 (E2E harness) + #476 (FAPI2) and identity-model's Rust-Extended loop + conformance K3–K6 are ACTIVE. Define freeze windows or a migrate-then-continue sequence that doesn't strand active ralph loops.
8. **Timing.** Prior thinking was "consolidate when PIM hits maintenance mode"; the owner now wants it head-on. Assess do-it-now (amid active epics) vs. a defined freeze, and recommend.

## Deliverables
1. **Duplication inventory** — component × repo × language, with rough LoC / maintenance-cost and a "shareable?" verdict per item.
2. **Target architecture** — chosen path + phase ordering, shared-harness design, monorepo layout diagram.
3. **Release & CI design** — per-language pipelines, change-detection, the Go module-path solution, secret management.
4. **Phased migration plan** — dependency-ordered steps, each independently landable & reversible, with a dry-run and explicit rollback, plus a cert-continuity checkpoint.
5. **Risk register** — OIDF cert, Go import breakage, release entanglement, in-flight epics, conformance-token rotation — each with a mitigation.
6. **Decision log + open questions** surfaced back to the owner.

## Constraints
Open-source repos; preserve full git history + all release tags; do not break published import paths (esp. the Go module path) without a documented consumer migration; do not invalidate OIDF certification; keep **independent release cadence per language**; do not strand active ralph loops/epics; naming convention `{py,go,rs}-identity-model`.

## Method (suggested)
Parallel readers inventory each repo's harness/conformance/release infra → a design phase that scores Paths 1/2/3 and recommends a phase ordering → a migration-sequencing phase. **This is planning only — produce the design + plan + decision points. Do NOT move code, change repos, or start the migration.**
