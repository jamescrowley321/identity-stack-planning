---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation (skipped — incremental execution of known patterns; spec-parity angle covered in differentiators)', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: 'complete-headless-draft'
classification:
  projectType: 'developer library / cross-language SDK capability (+ reference-consumer app migration)'
  domain: 'identity & access management — security-critical auth infrastructure'
  complexity: 'high (security-sensitive, 4-language parity, conformance-gated, hard backward-compat constraint)'
  projectContext: 'brownfield'
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-config-api.md'
  - 'config-api-kickoff (session input, 2026-09-03 — overnight-loop audit findings)'
  - '_bmad-output/planning-artifacts/identity-model-parity-reconciliation-plan.md'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 1
workflowType: 'prd'
project_name: 'identity-model config-api'
executionMode: 'headless-autonomous'
---

# Product Requirements Document — Unified Cross-Language Configuration API (identity-model)

**Author:** James
**Date:** 2026-09-03

> **Execution note (HEADLESS run).** Produced by the `bmad-create-prd` workflow run non-interactively
> over `product-brief-config-api.md` and the 2026-09-03 kickoff. Brownfield: requirements are grounded
> in the live code of the `identity-model` monorepo (`py/ go/ rust/ node/ spec/`) and `identity-stack`.
> Scope decisions pre-answered in the kickoff were treated as locked.

## Executive Summary

Configuration is the one cross-cutting concern the identity-model monorepo has never treated as a capability: every language (`py/ go/ rust/ node/`) and the reference consumer identity-stack reads it ad-hoc from the environment — stringly-typed, unvalidated, with secret redaction and https-only gating re-implemented per module. The 2026-09-03 overnight-loop audit surfaced the resulting defect classes in production code, and 2026-09-03 source verification confirms what remains live today: identity-stack's logout handler reads `os.environ["DESCOPE_PROJECT_ID"]` **per request** (KeyError at request time), env access diverges between hard-fail `os.environ[...]` and silently-defaulting `os.getenv` across `main.py`/`factory.py`/`routers/*` with no central config module, and the frontend builds `authority` from unvalidated `import.meta.env` — an unset `VITE_DESCOPE_PROJECT_ID` yields `authority="https://api.descope.com/undefined"`, fail-closed only by accident. (The audit's per-request *provider rebuild* has since been fixed for the middleware path — proof the defect class recurs until the surface is fixed, not just the instances.)

This PRD specifies a **unified Configuration API**: a typed `Config` value implemented idiomatically in all four languages that validates once at construction, **fails closed** with canonical secret-free errors, redacts secrets centrally in all debug/serialized output, and reads from environment variables by default via a pluggable `ConfigSource` abstraction — letting consumers source values from Vault/SSM/files/in-process structs without the library depending on any secrets backend. Config behavior is defined once as a prose contract with behavior IDs in `spec/`, gains a `spec/capabilities.md` row, and is enforced across languages by the existing conformance/coverage machinery. identity-stack adopts it as the reference consumer. Everything is **opt-in and 100% backward-compatible**: the env-var path stays the default and no existing test changes behavior.

### What Makes This Special

- **Spec-enforced cross-language parity** — config behaviors get vectors under the `spec-vector-coverage` gate, the mechanism that already keeps every other capability from drifting across four languages. No off-the-shelf config framework can participate in that contract.
- **Security guarantees as type properties** — fail-closed construction and centralized redaction eliminate two audit-confirmed defect classes by construction rather than convention.
- **Source-agnostic minimalism** — a small `ConfigSource` seam instead of a config framework; zero vendor dependencies; the Rust guardrails (edition 2024, rustls-only, no heavyweight deps) stay intact.
- **Proven-safe adoption model** — the project's hardening-as-optional-config rule, applied to configuration, with a live reference consumer (identity-stack) validating the migration path.

## Project Classification

**Project Type:** Developer library / cross-language SDK capability, plus reference-consumer app migration
**Domain:** Identity & access management — security-critical auth infrastructure
**Complexity:** High — security-sensitive, 4-language behavioral parity, conformance-gated, hard backward-compat constraint
**Project Context:** Brownfield — extends the live `identity-model` monorepo and `identity-stack`

## Success Criteria

Success is defined mechanically (per the project's mechanical-gates rule): every criterion below is a gate, a grep, or a test — not a judgment call.

### User Success

- A consumer constructing a typed `Config` gets **exactly one construction-time outcome** for any configuration state: a validated immutable value, or a canonical secret-free error naming the missing/invalid key. Never a partially-valid config, never a runtime surprise.
- A consumer can supply a custom `ConfigSource` (secrets backend, file, in-process struct) by implementing one small interface, with **zero new library dependencies**.
- An existing consumer who does nothing sees **zero behavior change** across upgrade.

### Business Success

- The 2026-09-03 audit's configuration finding class is closed in the reference consumer and made unrepresentable through the library surface (fail-open per-request env reads, KeyError-vs-getenv divergence, accidental-only fail-closed frontend).
- Configuration becomes a spec-tracked capability with enforced 4-language parity — extending the parity-reconciliation-plan model (contract in `spec/`, drift caught by the coverage gate, not review).
- The Vault/SSM/file-sourcing adoption blocker is removed without adding a vendor dependency.

### Technical Success

- All four languages pass the config conformance vectors under the existing `spec-vector-coverage` gate.
- Redaction vectors prove secret material never appears in `Debug`/`Display`/`repr`/`toString`/serialized output — 4/4 languages.
- Library-internal env reads (non-test, outside `EnvSource`) reach zero and are held there by a per-language lint/CI gate.
- identity-stack: provider config is startup-built (regression test proves no per-request env read on the auth path); frontend fails closed with an explicit error on an unconfigured environment (unit + E2E case).

### Measurable Outcomes

| Outcome | Target | Measurement |
|---|---|---|
| Config behavior IDs specified in `spec/` | Key set + precedence + validation + redaction fully covered | Spec contract merged; vector per behavior ID |
| Languages passing config vectors | 4/4 | `spec-vector-coverage` + conformance CI (required checks) |
| Ad-hoc env reads in library code (non-test, non-EnvSource) | 0, then enforced | Per-language lint/CI grep gate |
| Secret leaks in Config debug/serialized output | 0 | Redaction vectors, all languages |
| Existing tests modified to keep passing | 0 | PR review + CI (suites untouched, green) |
| identity-stack per-request env reads on auth path | 0 | Backend regression test |
| Frontend unconfigured-env behavior | Explicit fail-closed error; no `undefined` authority | Frontend unit test + E2E case |
| `spec/capabilities.md` configuration row | Present, per-language status | Generated capabilities table |

## Product Scope

### MVP - Minimum Viable Product

1. **Shared config contract in `spec/`** — canonical keys per capability (discovery, client auth, scopes, base URLs, timeouts, `TEST_*`), precedence/fallback rules, canonical validation error semantics, redaction guarantees; each a behavior ID; plus the `spec/capabilities.md` row.
2. **Typed `Config` + `ConfigSource` + default `EnvSource` in all four languages**, idiomatic: Rust struct + trait (builder preserved; edition 2024 / MSRV 1.96; rustls-only; no new heavyweight deps), Go struct + interface (functional options), Python typed Config + Protocol (no import-time env reads), TS object + interface (no top-level `import.meta.env` reads).
3. **Construct-time fail-closed validation** with canonical secret-free errors, identical outcomes across languages.
4. **Centralized secret redaction** owned by the Config type.
5. **Source composition** under documented precedence (exact order settled in architecture).
6. **Config conformance vectors** (missing-key fail-closed, redaction, precedence/fallback) wired into `spec-vector-coverage`.
7. **Library-internal migration** of per-module env reads through the Config surface — behavior-preserving (same keys, same defaults).
8. **identity-stack reference adoption** — backend startup-built typed config (middleware factory, `routers/auth.py` logout handler, `routers/protected.py` unified on one config module), frontend `VITE_*` validation fail-closed. Phased, non-breaking.

### Growth Features (Post-MVP)

- First-party optional source adapters (Vault, SSM, dotenv-file) as separate opt-in packages/crates on the stable `ConfigSource` seam — only on demonstrated consumer demand.
- Generated per-language configuration reference docs emitted from the spec contract (docs that cannot drift).
- The no-ad-hoc-env-reads lint gate as permanent, per-language CI for all future capabilities.

### Vision (Future)

- Every new capability (FAPI epic, gateway work) defines its config keys in the spec contract first and consumes only the typed surface — configuration drift becomes structurally impossible across the four languages.

### Explicit Non-Goals (permanent, not just MVP deferral)

- No general-purpose config framework: no YAML/TOML/JSON file parsing, no profiles, no hot-reload/watch, no hierarchical merging beyond documented precedence.
- No secrets-vendor dependency in the library core, ever.
- No change to on-the-wire OIDC/OAuth behavior — wiring, not protocol.
- No removal or deprecation of the env-var default path.
- No dynamic re-configuration of a constructed client (Config immutable post-validation; existing refresh semantics like JWKS/discovery TTLs are untouched).

## User Journeys

Journeys use the brief's role personas. All are developer workflows; each ends with the requirement class it reveals.

**J1 — Library consumer, happy path (opt-in adoption).** A Go engineer upgrades the library: nothing changes (env default path intact). She then constructs `Config` at service startup with the default `EnvSource`, passes it to the client via functional options, and deletes her hand-rolled "check the env vars exist" helper. Her service now refuses to start when a deploy forgets `CLIENT_SECRET` — with an error naming the key and not the secret. *Reveals:* typed construction API per language, EnvSource defaults, canonical validation errors, opt-in wiring into existing client constructors.

**J2 — Library consumer, misconfiguration edge case (fail closed).** A deploy ships with `ISSUER` set but client auth half-configured (id without secret). Construction fails with a partial-config error identifying the incomplete group — instead of the old behavior: boot fine, then 401/500 on first token call, or worse, run with validation silently weakened. On-call reads the boot error, fixes the deploy var, done. *Reveals:* validation semantics for required/optional/grouped keys; error taxonomy (missing / partial-group / invalid-value); no partial Config can escape construction.

**J3 — Platform engineer, custom source (secrets backend).** An org keeps `client_secret` in Vault. Their platform engineer implements the `ConfigSource` interface (~a dozen lines wrapping their existing Vault client), composes it with env for non-secret keys under the documented precedence, and never copies a secret into an env var again. The library gained no Vault dependency. *Reveals:* source abstraction contract, composition/precedence rules, secret-vs-non-secret key handling across mixed sources.

**J4 — identity-stack maintainer, reference migration.** James replaces the backend's scattered env access (request-time `os.environ["DESCOPE_PROJECT_ID"]` in the logout handler; hard-fail-vs-silent-default divergence across `main.py`, `factory.py`, `routers/auth.py`, `routers/protected.py`; import-time module-level reads) with one startup-built typed Config consumed everywhere — the existing once-at-startup `build_provider_configs()` wiring becomes a consumer of it rather than a parallel bespoke path. On the frontend, provider config is validated once at app init: a fully-unconfigured env renders an explicit "no identity provider configured" failure instead of `main.tsx`'s current `authority: "https://api.descope.com/undefined"`. All existing E2E and integration tests pass unchanged. *Reveals:* backend adoption pattern (startup construction, DI), frontend validation surface (TS Config from `import.meta.env` passed explicitly), regression tests for both audit findings, phased non-breaking migration.

**J5 — Monorepo contributor, new capability (steady state).** A contributor adding a capability with new knobs first adds the keys + precedence + validation rules to the spec contract, then consumes them through each language's Config. Redaction and https-gating come free from the type. The lint gate blocks the PR if any `os.getenv`/`std::env::var`/`process.env` sneaks into library code; the coverage gate blocks it if any language skips the new config vectors. *Reveals:* spec-first key registration process, extensibility of the Config surface, lint + vector gates as permanent CI.

### Journey Requirements Summary

| Journey | Requirement classes |
|---|---|
| J1 | Per-language typed Config, EnvSource default, opt-in client wiring, canonical errors |
| J2 | Validation taxonomy (missing/partial/invalid), fail-closed guarantee, secret-free errors |
| J3 | ConfigSource contract, source composition + precedence, zero vendor deps |
| J4 | Consumer migration patterns (backend + frontend), regression coverage of audit findings, backward compat |
| J5 | Spec-first key contract, redaction/https centralization, lint gate, conformance vectors |

## Domain-Specific Requirements

### Compliance & Regulatory

- **OpenID certification must be undisturbed.** The Python library is a certified RP (Basic/Config/Form Post); the conformance suites are part of the "no existing test changes behavior" constraint. Config work is wiring and must not alter certified protocol behavior.
- **RFC alignment without protocol change.** Config keys map onto protocol concepts (issuer, client auth method, scopes, endpoints) but the initiative changes no on-the-wire behavior. Where a key gates an existing RFC-mandated check (e.g. https-only issuer), the check's semantics are preserved and centralized, not redefined.

### Technical Constraints (project rules that bind this initiative)

- **Hardening-as-optional-config rule:** security hardening in identity libs ships as opt-in optional config, default-off/unchanged, backward-compatible — it must work perfectly or it breaks integrations. The Configuration API is itself subject to the rule it generalizes.
- **Mechanical gates rule:** parity and hygiene are enforced by CI gates (spec vectors, coverage gate, lint gate), never by review vigilance or gameable greps.
- **Dependency posture:** no secrets-vendor deps; Rust stays edition 2024 / MSRV 1.96 / rustls-only / no heavyweight deps; Python/Go/Node additions must justify themselves (prefer stdlib/existing deps).
- **12-factor compatibility:** environment variables remain the zero-config default — the typed Config formalizes env behavior; it must not punish env-based deployment.
- **Secret hygiene:** gitleaks and the security workflows stay green; no secret material in logs, errors, debug output, serialized forms, or test fixtures.

### Threat Model (config-specific)

| Threat | Requirement it drives |
|---|---|
| Secret leakage via `Debug`/`repr`/`toString`/serialization or error messages | Centralized redaction owned by the Config type; canonical errors name keys, never values |
| Fail-open drift: runtime env diverges from validated startup state | Construct-once immutable Config; no per-request re-reads on the auth path |
| Silent misconfiguration: missing keys degrade to `None`/empty/`undefined` flowing into authorities and validation options | Fail-closed construction; no partial Config escapes |
| Downgrade via config: http issuer/endpoints smuggled in through a custom source | Validation (incl. https-only gating) runs on the *composed, resolved* config regardless of source; sources cannot bypass it |
| Malicious/compromised custom source | Sources supply raw values only; all validation/typing happens in the library after resolution; documented trust boundary |
| Precedence confusion: consumer believes an override applies when it doesn't | Single documented precedence order in the spec contract, enforced by vectors in all four languages |

### Risk Mitigations

- **Behavioral regression risk (highest):** phased, behavior-preserving internal migration; every phase gated on untouched existing suites; env keys and defaults bit-identical.
- **Cross-language divergence risk:** contract-first (spec before code), vectors before/with implementations, coverage gate required.
- **Scope-creep risk (config frameworks are a tar pit):** the permanent non-goals list is normative; anything resembling file parsing, profiles, or hot-reload is out.

## Developer-Tool Specific Requirements

### Language Matrix

| Language | Package | Today's config state | Config-API scope |
|---|---|---|---|
| Python | `py-identity-model` (PyPI, v3.11.x, certified RP) | ~16 library env-read sites across `ssl_config.py`, `core/http_utils.py`, `core/jwks_cache.py`; typed `OIDCSettings` (`OIDC_*` prefix) exists only in the `fastapi-identity-model` sub-package | Full: Config + `ConfigSource` Protocol + EnvSource; absorb the ad-hoc reads; align/absorb `OIDCSettings` |
| Go | `identity-model` Go module | 2 library env-read sites (cache caps in `discovery/options.go`, `jwks/options.go`); functional options per package; **no secret redaction at all** | Full: Config struct + `ConfigSource` interface + EnvSource; add redaction (new guarantee for Go) |
| Rust | `rs-identity-model` (crates.io, 0.0.1) | 1 isolated env reader (`src/env.rs`, cache caps); per-struct redacting `Debug` impls; per-client `allow_http` builder flags | Full: Config struct + `ConfigSource` trait + EnvSource; builders take/derive from Config; centralize redaction |
| Node/TS | `@identity-model/node` (private placeholder, unimplemented) | No code | Bootstrap: Config + `ConfigSource` interface + EnvSource ships as the package's **first implemented module**; conformance status tracked per `capabilities.md` rules (no runner yet → status reflects reality, no fake `implemented`) |

Reference consumer (identity-stack, not a library): backend FastAPI app (~28 env-read sites, 8 DESCOPE_*/ORY_* vars, no config module) + Vite/React frontend (3 `VITE_*` reads, unvalidated).

### Installation Methods

No new packages for Python/Go/Rust — the Config API ships inside the existing library at each language's existing distribution point (PyPI / Go module / crates.io) as a minor, backward-compatible release. Node's Config lands in the existing `@identity-model/node` placeholder package (still unpublished until the package itself ships). No new dependencies in any language.

### API Surface (per-language shape; idiom detail belongs to architecture)

- **Rust:** `Config` struct; `trait ConfigSource`; `EnvSource` default; existing `*Builder`s gain `from_config(&Config)`-style construction while keeping every current method unchanged.
- **Go:** `Config` struct; `type ConfigSource interface`; `EnvSource` default; new `WithConfig(cfg)` functional option per package alongside existing `WithXxx` options.
- **Python:** typed `Config` (dataclass in core; pattern proven by `OIDCSettings`); `ConfigSource` Protocol; `EnvSource` default; sync+async clients accept an optional `config=` — no import-time env reads introduced or retained.
- **TS:** `Config` object + `ConfigSource` interface; `EnvSource` default reads `process.env`/`import.meta.env` only inside the source, never at module top level.

### Code Examples

Each language ships runnable examples mirroring the journeys: (a) default env construction, (b) fail-closed missing-key error handling, (c) custom `ConfigSource` (in-process struct), (d) composition with precedence. Examples live in each language's existing `examples/` convention and double as documentation.

### Migration Guide

Two audiences, both non-breaking:
1. **Library internals:** each ad-hoc env read site migrates to the Config surface behavior-preserving (same key, same default, same clamping — e.g. the existing cross-language cache-cap contract "negative/garbage → default, 0 → unbounded" is preserved verbatim and becomes a spec behavior ID).
2. **Consumers:** "do nothing" is a valid migration (env default path); opt-in guide shows startup construction, DI into clients, custom sources. identity-stack's migration PRs serve as the worked example for both backend and frontend.

### Skipped Sections

Visual design and store compliance: n/a (developer library).

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** contract-first problem-solving MVP. The spec contract is the product; language implementations are conformers. This mirrors the parity reconciliation plan's proven model (define behavior once in `spec/`, enforce with vectors) and the Go-reference→Rust pattern used for the Extended tier.
**Resources:** solo maintainer + agent loops. Phases sized for in-session stacked PRs where well-scoped (per the prefer-in-session convention); per-language implementation phases are loop-eligible (one workstream per repo at a time; owner merges).

### Phased Roadmap

**Phase 1 — Contract (spec/):** config-key registry for the existing surface (the ~14 Python knobs, cache caps, `OIDC_*` settings group, `TEST_*` harness keys), precedence/fallback rules, validation-error taxonomy with canonical codes, redaction guarantees. Conformance vectors (`config.json` + fixtures) for missing-key fail-closed, partial-group, invalid-value, precedence, redaction. `capabilities.md` row. *Exit: contract merged; vectors exist; no implementation yet.*

**Phase 2 — Library implementations (per language, sequenced):** Python first (richest existing key set; absorbs/aligns `OIDCSettings`), then Go (adds redaction — its first secret-redaction guarantee), then Rust (Go as template per the Extended-tier pattern), then TS bootstrap in `node/`. Each lands Config + `ConfigSource` + `EnvSource` + vector green for that language. *Exit per language: config vectors pass; zero existing-test changes.*

**Phase 3 — Internal migration + permanent gates:** route each library's ad-hoc env reads through Config behavior-preserving; land the per-language no-ad-hoc-env-reads lint gate in CI. *Exit: library env-read count (non-test, non-EnvSource) = 0; gate red on reintroduction.*

**Phase 4 — Reference consumer (identity-stack):** backend config module (startup-built typed Config; logout handler + routers unified; regression test for request-time reads), frontend fail-closed validation (unit + E2E for the `.../undefined` case). *Exit: audit regression tests green; existing suites untouched.*

Phases 2–4 per-language/per-repo items are independent after Phase 1; Phase 1 blocks everything (the contract is the dependency).

### Risk Mitigation Strategy

- **Behavioral regression (highest):** before migrating any env read, its current behavior (key, default, clamp rules — e.g. "negative/garbage → default, `0` → unbounded") is captured as a spec behavior ID + vector; migration PRs prove bit-identical behavior. Existing suites are the tripwire and must stay untouched.
- **Certified-RP risk:** Python conformance/certification suites run unchanged in CI on every phase; any diff to them fails the initiative's ground rule.
- **Cross-language drift:** no implementation before its vector; coverage gate required per language.
- **Node honesty:** `node/` has no conformance runner yet — its capabilities row reports real status (no fake `implemented`); TS vectors activate when the runner exists.
- **Solo-resource contingency:** phases are independently shippable; stopping after any phase leaves the repo strictly better (contract alone already fixes the "no shared definition" problem).

## Functional Requirements

The capability contract. "All four languages" = Python, Go, Rust, TS (TS lands as the `node/` bootstrap module; its conformance status is reported honestly per the capabilities rules until a Node runner exists).

### Configuration Contract (spec/)

- FR1: The spec defines a canonical registry of configuration keys covering the existing surface — HTTP/retry/timeout knobs, JWKS/discovery cache TTLs and caps, SSL/CA-bundle keys, the client-settings group (discovery URL, client id/secret, scopes, audience, redirect URIs), and `TEST_*` harness keys — each with type, default, and validation rule.
- FR2: The spec defines precedence/fallback rules for resolving a key across multiple sources, as a single total order all languages implement.
- FR3: The spec defines a validation-error taxonomy (missing required key, incomplete key group, invalid value) with canonical error codes, following the existing `PREFIX-NNN` behavior-ID convention.
- FR4: The spec defines redaction guarantees: which keys are secret-classified and the requirement that their values never appear in any debug, display, error, log, or serialized representation.
- FR5: Configuration appears as a capability row in `spec/capabilities.md` with per-language status, subject to the same status rules as every other capability.
- FR6: Existing cross-language config behavior that already forms a de-facto contract (e.g. cache-cap parsing: negative/garbage → default, `0` → unbounded) is captured verbatim as behavior IDs before any implementation migrates.

### Typed Configuration Construction & Validation

- FR7: A consumer can construct a typed, immutable `Config` value in each language via that language's idiom (Rust builder, Go functional options, Python dataclass constructor, TS object factory).
- FR8: Construction validates the complete configuration exactly once and fails closed: any missing required key, incomplete key group, or invalid value yields a canonical error and no `Config` value.
- FR9: Validation errors identify the offending key(s) and error class without including any configured value (secret or not) in the error.
- FR10: A constructed `Config` cannot be mutated; changed configuration requires constructing a new value.
- FR11: A consumer can construct `Config` without touching the process environment at all (fully explicit/in-process configuration).
- FR12: Validation semantics (which states fail, with which error codes) are identical across all four languages for the same input state, proven by shared vectors.

### Configuration Sources & Composition

- FR13: Each language exposes a `ConfigSource` abstraction (trait / interface / Protocol / TS interface) that supplies raw key values; all typing and validation happen in the library after resolution, regardless of source.
- FR14: A default `EnvSource` reads the canonical environment variables; it is the zero-configuration path and requires no consumer code.
- FR15: A consumer can implement a custom source (secrets backend, file, in-process struct) without the library gaining any dependency; the source contract is small enough to implement against documented behavior alone.
- FR16: A consumer can compose multiple sources (e.g. explicit overrides + custom source + env) with resolution following the spec's precedence order (FR2).
- FR17: A custom source cannot bypass validation or security gating: https-only and all other checks run on the composed, resolved configuration (the source trust boundary is documented).

### Secret Redaction & Safe Output

- FR18: The `Config` type redacts secret-classified values in every language-native debug/display representation (`Debug`/`Display`, `String()`, `repr`/`str`, `toString`/`inspect`) and in any serialization the type offers.
- FR19: Redaction is a property of the Config/secret type, not per-consumer convention — new fields classified secret in the spec are redacted without per-module code.
- FR20: Go gains secret redaction as part of this initiative (it currently has none), applied at least to configuration and token-bearing types the Config surface touches.

### Library Integration (opt-in wiring + internal migration)

- FR21: Every existing client/builder/options entry point in each language accepts a `Config` (e.g. `from_config`, `WithConfig`, `config=`) while every existing construction path continues to work unchanged.
- FR22: When no `Config` is supplied, behavior is bit-identical to today (env default path) — opt-in is purely additive.
- FR23: All library-internal ad-hoc environment reads (non-test, outside `EnvSource`) are migrated to resolve through the Config surface, preserving each key's current name, default, and clamping behavior.
- FR24: The Python `fastapi-identity-model` `OIDCSettings` surface is aligned with (or backed by) the core Config so the `OIDC_*` key group has one definition; its public API remains compatible.
- FR25: The TS implementation ships as the first module of `@identity-model/node`, establishing the package's no-top-level-env-reads pattern from its first line of code.

### Conformance & Enforcement

- FR26: Config conformance vectors exist for: missing-key fail-closed, incomplete-group, invalid-value, precedence/fallback resolution, and redaction — wired into `spec/conformance/` with fixtures per the existing structure.
- FR27: The `spec-vector-coverage` gate enforces the config vectors for every language with a conformance runner; languages cannot silently skip a vector.
- FR28: A per-language lint/CI gate fails any PR that introduces a direct environment read in library code outside the `EnvSource` implementation and test code.
- FR29: Redaction vectors assert both the absence of secret material and the presence of the language's redaction placeholder in rendered output.

### Reference Consumer Adoption (identity-stack)

- FR30: The backend has a single startup-built typed configuration consumed by all auth-path code (middleware factory, logout handler, protected/internal routers); no request-time or import-time environment reads remain on the auth path.
- FR31: Backend misconfiguration fails at startup with a canonical error naming the missing/invalid key (replacing today's mix of request-time `KeyError` and silent `""` defaults).
- FR32: The frontend validates provider configuration once at app init and fails closed with an explicit user-visible/developer-visible error when no provider is configured — an `authority` containing `undefined` is unrepresentable.
- FR33: Regression tests pin both audit findings: (a) no env read on the request path, (b) unconfigured frontend env produces the explicit failure, not `.../undefined`.
- FR34: The identity-stack migration serves as the documented worked example for consumer adoption (backend + frontend patterns).

### Documentation & Examples

- FR35: Each language ships runnable examples for: env-default construction, fail-closed error handling, custom source, and composed sources — in its existing `examples/` convention.
- FR36: The library documentation documents the config keys, precedence, error codes, and redaction guarantees from the spec contract (no per-language drifting copies of key lists).

## Non-Functional Requirements

Only categories that matter for this product. Accessibility and scalability are n/a (developer library, no serving surface of its own).

### Backward Compatibility (the binding constraint)

- NFR1: With no consumer code change, every observable behavior is bit-identical to the prior release: same env keys, same defaults, same clamping, same error behavior on the legacy paths.
- NFR2: Zero existing unit/integration/E2E/conformance/certification tests are modified to keep passing, in any repo touched, across every PR of the initiative.
- NFR3: All new surface is additive; no deprecation warnings, no renamed keys, no changed defaults. (Deprecations, if ever, are a future explicitly-planned major — out of scope here.)
- NFR4: Each language's public-API compatibility tooling/conventions (semver discipline per package) treat the release as minor.

### Security

- NFR5: No secret material (values of secret-classified keys, tokens, private keys) appears in errors, logs, debug/display output, serialized forms, fixtures, or CI output — enforced by redaction vectors and gitleaks staying green.
- NFR6: Fail-closed is absolute at the Config boundary: there is no configuration state that yields a constructed-but-degraded Config. (Explicit opt-outs like `allow_http` remain what they are today: visible, named, default-off flags — carried through Config unchanged, not widened.)
- NFR7: The `ConfigSource` trust boundary is documented; a hostile source can at worst supply values that validation rejects or accepts per spec — it cannot suppress validation, gating, or redaction.
- NFR8: The initiative adds no new dependency in any language's default build (dev/test dependencies per repo convention are fine).

### Performance

- NFR9: Configuration resolution and validation happen at construction only; zero per-request/per-call config work is added to any existing hot path (token validation, JWKS/discovery fetch paths are untouched at runtime).
- NFR10: Construction cost is negligible for service startup (single-digit milliseconds order; no network I/O in the library's own sources — a consumer's custom source may do I/O, which is their documented tradeoff).

### Reliability & Determinism

- NFR11: Config resolution is deterministic: identical source states produce identical Config values and identical errors, in every language (property proven by shared vectors).
- NFR12: Construction is side-effect-free: no writes to the environment, no global state mutation, no import-time reads (Python) or module-top-level reads (TS).

### Maintainability & Portability

- NFR13: Rust: edition 2024, MSRV 1.96, rustls-only, no new heavyweight deps; Go: stdlib-only for the config surface; Python: stdlib dataclasses (no pydantic requirement in core); TS: zero runtime deps.
- NFR14: The no-ad-hoc-env-reads lint gate and the config vectors are required CI checks after their phase lands, keeping the invariants permanent rather than snapshot.
- NFR15: One source of truth: key definitions, precedence, error codes, and redaction classification live in `spec/` and are referenced — never re-declared divergently — by language docs and implementations.

## Kickoff Design Questions — Disposition

The five questions the kickoff required the design session to answer, with their resolution status:

1. **Canonical key set + precedence/fallback rules** — *answered at PRD level* (FR1, FR2, FR6: registry covering the inventoried surface — HTTP/retry, cache TTLs/caps, SSL/CA, client-settings group, `TEST_*`; single total precedence order). Exact per-key table → **architecture** (it is the spec contract's content).
2. **Pull-based `get(key)` vs one-shot typed Config from a source** — *constrained here, resolved in architecture*: FR13 fixes the boundary (sources supply raw values; typing/validation always in the library), which rules out sources returning pre-typed Configs. Whether the source contract is per-key pull or bulk snapshot → **architecture**.
3. **Source composition + precedence order** — *answered in principle* (FR16: explicit overrides > custom source(s) > env default, exact order and multi-custom-source semantics → **architecture**, recorded in the spec contract as behavior IDs).
4. **Migration path (identity-stack + library internals)** — *answered* (Phased Roadmap; FR21–FR25, FR30–FR34): phase-gated, behavior-preserving, opt-in; identity-stack is the worked example.
5. **Cross-language conformance/parity testing for config** — *answered* (FR26–FR29: vectors for fail-closed/partial/invalid/precedence/redaction under `spec-vector-coverage`; lint gate for env-read hygiene; Node status honesty until a runner exists).
