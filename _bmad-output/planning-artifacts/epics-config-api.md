---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'complete-headless-draft'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd-config-api.md'
  - '_bmad-output/planning-artifacts/architecture-config-api.md'
  - '_bmad-output/planning-artifacts/product-brief-config-api.md'
executionMode: 'headless-autonomous'
project_name: 'identity-model config-api'
---

# Configuration API — Epic Breakdown

## Overview

Epic and story breakdown for the unified cross-language Configuration API, decomposing `prd-config-api.md` (36 FRs, 15 NFRs) and `architecture-config-api.md` (decisions D1–D9) into implementable stories. Repo tags: `[OIM]` = identity-model monorepo, `[IS]` = identity-stack.

> **Execution note (HEADLESS run).** Produced non-interactively. Per the kickoff, decomposition is per-language, mirroring the Go-reference → Rust parity pattern. Epic structure maps to the PRD's phased roadmap: Epic A = Phase 1 (contract); Epics B–E = Phases 2+3 per language (implementation + internal migration + lint gate, so each language epic is standalone-complete); Epics F–G = Phase 4 (reference consumer). Conventions honored: dependent work = stacked PRs, no auto-merge, integration tests mandatory, zero existing-test changes (NFR2) on every story.

## Requirements Inventory

### Functional Requirements

FR1–FR6 (spec contract: key registry, precedence, error taxonomy, redaction guarantees, capabilities row, legacy-behavior capture) · FR7–FR12 (typed construction: idiomatic Config, fail-closed once, key-naming secret-free errors, immutability, env-free construction, cross-language identical semantics) · FR13–FR17 (sources: raw-value abstraction, EnvSource default, dependency-free custom sources, composition, no gate bypass) · FR18–FR20 (redaction: all native representations, type-owned, Go gains redaction) · FR21–FR25 (integration: config seam on every entry point, bit-identical default path, internal read migration, OIDCSettings alignment, node bootstrap) · FR26–FR29 (enforcement: config vectors, coverage gate, lint gate, redaction vectors) · FR30–FR34 (identity-stack: startup-built backend config, boot-fail on misconfig, frontend fail-closed init, regression tests, worked example) · FR35–FR36 (examples per language, spec-sourced docs). Full text: PRD §Functional Requirements.

### NonFunctional Requirements

NFR1–NFR4 (backward compat: bit-identical default behavior, zero existing-test modifications, additive-only, minor semver) · NFR5–NFR8 (security: no secret in any output, absolute fail-closed, source trust boundary, no new deps) · NFR9–NFR10 (performance: construction-only resolution, negligible startup cost) · NFR11–NFR12 (determinism: identical outcomes, side-effect-free) · NFR13–NFR15 (stdlib-only, permanent gates, spec as single source of truth). Full text: PRD §Non-Functional Requirements.

### Additional Requirements (from Architecture)

- AR1: Legacy-mode resolution keeps today's read *timing* — migrated read-sites call the resolver where the read happens now; no hoisting (Architecture validation finding 1).
- AR2: Registry keys not yet consumed by a language (Go/Rust `HTTP_*`, SSL) are vector-`n/a` until parity-plan P1 lands them — and P1 must land them via the Config surface (finding 2).
- AR3: ID allocation — error codes `CFG-001`–`099`; vector IDs `CFG-101`+ (1xx strict, 2xx legacy, 3xx precedence, 4xx redaction, 5xx source).
- AR4: Fixed cross-language naming, parsing rules (bool/int/URL/empty-string-is-invalid), error-message format, `<redacted>` placeholder — Architecture §Implementation Patterns is normative for every story.
- AR5: `allow_http`-class flags stay code-only; the registry may never contain a security-weakening key.
- AR6: Fixture schema `{ sources, overrides, mode, expect }` in `spec/test-fixtures/config/`.
- AR7: User-facing docs describe the surface; no migration/process narration.

### UX Design Requirements

None — developer library; the only UI touch (Epic G) is an explicit unconfigured-provider failure state, specified in its stories.

### FR Coverage Map

FR1–FR6, FR26 (vector authoring), AR3, AR6 → **Epic A** · FR7–FR19, FR21–FR24, FR27–FR29, FR35 per language → **Epics B (Python), C (Go), D (Rust)**; FR20 → **Epic C**; FR25 → **Epic E** · FR30, FR31, FR33a, FR34 → **Epic F** · FR32, FR33b → **Epic G** · FR36 → closing story in each language epic. NFRs 1–15 bind every story; NFR2 is an explicit acceptance criterion everywhere.

## Epic List

### Epic A: The Configuration Contract `[OIM]`
Consumers, contributors, and agents get one normative definition of configuration behavior — registry, precedence, validation, redaction — as `spec/config.md` + `config.json` vectors + fixtures + capabilities row. Standalone value: the "no shared definition" problem is fixed and every later epic implements against a merged contract.
**FRs covered:** FR1–FR6, FR26; AR3, AR5, AR6.

### Epic B: Python Configuration API `[OIM]`
Python consumers construct a typed, fail-closed, secret-redacting Config with pluggable sources; the Python library's ad-hoc env reads route through the resolver; the lint gate holds it. Python is the reference implementation for the ports.
**FRs covered:** FR7–FR19, FR21–FR24, FR27–FR29, FR35–FR36 (py); AR1, AR4.

### Epic C: Go Configuration API `[OIM]`
Go consumers get the same contract (Go-idiomatic), plus Go's first secret-redaction guarantee. Go serves as the template for Rust (parity pattern).
**FRs covered:** FR7–FR19, FR20, FR21–FR23, FR27–FR29, FR35–FR36 (go); AR1, AR2, AR4.

### Epic D: Rust Configuration API `[OIM]`
Rust consumers get the contract (builder-idiomatic, edition 2024/MSRV 1.96, rustls-only), with redaction centralized on `Secret<T>`.
**FRs covered:** FR7–FR19, FR21–FR23, FR27–FR29, FR35–FR36 (rust); AR1, AR2, AR4.

### Epic E: TypeScript Configuration Bootstrap `[OIM]`
`@identity-model/node` gains its first implemented module: contract-conformant Config/sources/redaction with zero runtime deps, honest capabilities status (no runner yet).
**FRs covered:** FR7–FR19, FR25, FR35 (ts); AR4.

### Epic F: identity-stack Backend Adoption `[IS]`
The reference consumer's backend builds one typed strict-mode config at startup; request-time and import-time env reads leave the auth path; misconfigured deploys fail at boot with collected CFG errors.
**FRs covered:** FR30, FR31, FR33(a), FR34; uses Epic B's primitives (D8).

### Epic G: identity-stack Frontend Fail-Closed Config `[IS]`
The frontend validates provider config once at init and renders an explicit failure instead of `authority: ".../undefined"`; E2E pins it.
**FRs covered:** FR32, FR33(b), FR34; contract-conformant inline per Architecture (node package unpublished).

**Dependencies:** A blocks all. B, C, D, E independent after A (sequenced B→C→D→E per PRD, Go templates Rust). F needs B. G needs only A (contract). No epic requires a later epic.

---

Every story implicitly carries: **NFR2 gate** (zero existing tests modified to keep passing), **no auto-merge** (owner reviews), **integration tests where behavior touches live flows**, and Architecture §Implementation Patterns (AR4) as normative. Stacked PRs for dependent stories within an epic.

## Epic A: The Configuration Contract `[OIM]`

Deliver the normative configuration contract so every implementation targets one behavior definition.

### Story A.1: Author the configuration contract (`spec/config.md`)

As a monorepo contributor,
I want a normative spec defining the config key registry, precedence, validation modes, error taxonomy, and redaction guarantees,
So that all four languages implement one behavior instead of four accidents.

**Acceptance Criteria:**

**Given** the Architecture D2–D5 decisions and the 2026-09-03 env-read inventory
**When** `spec/config.md` is authored
**Then** it contains the full key registry (logical ID, env name(s) incl. `HTTP_RETRY_COUNT` alias, type, default, validation/clamp semantics, secret flag) with every "(current default)" transcribed from code with file references (FR1, FR6)
**And** the precedence total order (override ⊳ sources-in-order ⊳ env ⊳ default) and alias-within-source rule are normative (FR2)
**And** both resolver modes are specified — `legacy` preserving each key's inventoried behavior verbatim including read-timing (AR1), `strict` with collected-error fail-closed semantics (FR3, FR8)
**And** error codes `CFG-001`–`004` are defined with the message format and no-values rule (FR3, FR9); client-group rules are enumerated explicitly
**And** secret classification and the `<redacted>` placeholder are normative (FR4), and the "no security-weakening registry keys" rule is stated (AR5)
**And** every normative statement carries a behavior ID per AR3.

### Story A.2: Author config conformance vectors and fixtures

As a monorepo contributor,
I want executable vectors for every contract behavior,
So that parity is a red/green gate, not review vigilance.

**Acceptance Criteria:**

**Given** the merged (or stacked-parent) `spec/config.md`
**When** `spec/conformance/config.json` and `spec/test-fixtures/config/*.json` are authored
**Then** vectors follow the existing conformance JSON structure with IDs `CFG-101`+ in the AR3 families (1xx strict, 2xx legacy-equivalence, 3xx precedence, 4xx redaction, 5xx source behavior) (FR26)
**And** fixtures follow the AR6 schema `{ sources, overrides, mode, expect }` and no fixture contains real secret material in `expect` (redaction fixtures assert placeholder/absence)
**And** every behavior ID in `spec/config.md` is exercised by at least one vector, checked by a mapping table in the PR description
**And** legacy family covers at minimum: garbage→default, TTL clamp `[60,86400]`, `0`→unbounded caps, retry alias, SSL chain fallback.

### Story A.3: Register the capability and wire the coverage gate

As a monorepo maintainer,
I want configuration tracked in `capabilities.md` and enforced by `spec-vector-coverage`,
So that language status is honest and drift is mechanically caught.

**Acceptance Criteria:**

**Given** the vectors from A.2
**When** the capability row and gate wiring land
**Then** `spec/capabilities.md` has a Core-tier row `Configuration` referencing `config.json` with all language statuses `planned` (flipped by later epics; Node per honesty rule) (FR5)
**And** `spec-vector-coverage` counts the config vectors for each language runner, with per-language `n/a` marks only for AR2 keys (Go/Rust `HTTP_*`/SSL) documented inline (FR27)
**And** CI is green with all implementations absent (vectors pending/`n/a`, never silently skipped).

## Epic B: Python Configuration API `[OIM]`

The reference implementation: typed fail-closed Config for Python consumers, internal reads unified, gate active.

### Story B.1: Python `Config`, `ConfigSource`, `EnvSource`, strict resolver

As a Python consumer,
I want to construct a typed, immutable, fail-closed Config from env or custom sources,
So that misconfiguration stops my service at startup with a precise, secret-free error.

**Acceptance Criteria:**

**Given** `core/config.py` implementing the contract (frozen dataclass `Config`, `ConfigSource` Protocol with `resolve(keys)`, `EnvSource` with client-group prefix support, strict-mode resolver)
**When** the Python conformance runner is extended to execute config vectors
**Then** CFG-1xx, 3xx, and 5xx vectors pass (FR7–FR13, FR16, FR17)
**And** construction with an in-process source and no environment access passes (FR11, NFR12: no import-time reads — asserted by test importing the module with a poisoned environ)
**And** all construction errors are collected into one exception listing every offending logical key, registry-ordered, valueless (FR9)
**And** implementation is stdlib-only (NFR13) and `make lint` + all existing suites pass untouched (NFR2).

### Story B.2: Python redaction on the Config surface

As a security reviewer,
I want secret-classified config values unprintable by accident,
So that debug output and serialization can never leak `client_secret`.

**Acceptance Criteria:**

**Given** the `_secret_fields` repr pattern applied to `Config` (and a `Secret` wrapper only if a non-dataclass surface needs it)
**When** CFG-4xx vectors run
**Then** `repr`/`str` and any serialization of Config show exactly `<redacted>` for secret-classified keys and never the value (FR18, FR19, FR29, NFR5)
**And** secret access is an explicit accessor, not implicit str coercion (AR4)
**And** error messages from B.1 paths are covered by a 4xx vector (no value in message).

### Story B.3: Python legacy mode + internal read migration

As a monorepo maintainer,
I want the library's ad-hoc env reads routed through the resolver in legacy mode,
So that today's behavior becomes vectored contract instead of scattered accident.

**Acceptance Criteria:**

**Given** the legacy-mode resolver and the read sites in `ssl_config.py`, `core/http_utils.py`, `core/jwks_cache.py`
**When** each site resolves through the resolver at its current call location (AR1 — no hoisting)
**Then** CFG-2xx vectors pass in Python (FR6, FR23)
**And** every existing unit/integration/conformance test passes with zero modifications (NFR1, NFR2)
**And** env key names, defaults, clamps, alias, and SSL-chain fallback are bit-identical (verified by the untouched suites + 2xx vectors)
**And** integration tests run green locally before the PR opens (repo rule).

### Story B.4: Python client seams (`config=`) and `OIDCSettings` alignment

As a Python consumer,
I want every client entry point to accept my typed Config while existing code keeps working,
So that adoption is additive and the `OIDC_*` group has one definition.

**Acceptance Criteria:**

**Given** sync/aio clients and module functions gaining an optional `config=` parameter
**When** a Config is supplied
**Then** its values apply with explicit per-call arguments winning as overrides (D2 tier 1), and when omitted, behavior is bit-identical to today (FR21, FR22, NFR1)
**And** `fastapi-identity-model`'s `OIDCSettings` is backed by core Config with its public API and package tests unchanged (FR24, NFR2)
**And** an integration test exercises a client construct-from-Config flow end-to-end against the test IdP (repo rule: integration tests mandatory)
**And** no per-request resolver work appears on any hot path (NFR9).

### Story B.5: Python lint gate, examples, docs, status flip

As a monorepo maintainer,
I want the no-ad-hoc-env-reads invariant permanent and the surface documented,
So that the defect class cannot return and consumers can adopt without reading source.

**Acceptance Criteria:**

**Given** the migrated Python library
**When** the Semgrep rule (py: `os.getenv`/`os.environ` outside `core/config.py`, tests, examples, tools) lands in the existing lint CI
**Then** the gate is required and red on a seeded violation (demonstrated in the PR, then reverted) (FR28, NFR14)
**And** `examples/` gains the four journey examples (env-default, fail-closed handling, custom source, composition) that run in CI (FR35)
**And** docs document keys/precedence/errors/redaction sourced from `spec/config.md` without duplicating the registry, with no process narration (FR36, NFR15, AR7)
**And** the capabilities row flips Python to `implemented` per the status rules.

## Epic C: Go Configuration API `[OIM]`

The same contract in Go idiom, plus Go's first redaction guarantee. Template for Rust.

### Story C.1: Go `config` package with strict resolver

As a Go consumer,
I want `config.FromEnv()` / `config.New(WithSources(...))` producing a validated immutable Config,
So that my service fails closed at startup with canonical errors.

**Acceptance Criteria:**

**Given** `go/pkg/config` (`Config`, `Source` interface `Resolve(keys)`, `EnvSource`, functional options, collected `CFG-*` errors)
**When** the Go conformance runner executes config vectors
**Then** CFG-1xx, 3xx, 5xx pass (FR7–FR13, FR16, FR17); AR2 keys are `n/a`-marked, not skipped
**And** stdlib-only (NFR13); `gofmt`, `make lint`, and all existing tests pass untouched (NFR2)
**And** cross-language parsing rules (bool/int/URL/empty-string-invalid) match AR4 exactly (FR12).

### Story C.2: Go secret redaction (`config.Secret`) — first guarantee

As a security reviewer,
I want Go to stop printing secrets in `%v`/JSON/string conversions,
So that the language with zero redaction today gains the same guarantee as the others.

**Acceptance Criteria:**

**Given** `type Secret string` implementing `String()`, `GoString()`, `Format()`, `MarshalJSON()` → `<redacted>` with explicit `Value()` accessor
**When** CFG-4xx vectors run in Go
**Then** all rendered/serialized forms of Config secrets show `<redacted>` and never the value (FR18–FR20, FR29, NFR5)
**And** `token`'s `clientSecret` config field adopts `config.Secret` with the package's public constructors unchanged and existing tests untouched (FR20, NFR2).

### Story C.3: Go legacy migration + seams (`WithConfig`)

As a Go consumer and maintainer,
I want existing env reads routed through the resolver and every package accepting `WithConfig(cfg)`,
So that adoption is additive and internal behavior is contract-proven.

**Acceptance Criteria:**

**Given** the cache-cap reads in `discovery/options.go` and `jwks/options.go`
**When** they resolve via legacy mode at their current call sites (AR1)
**Then** applicable CFG-2xx vectors pass; existing tests untouched (FR23, NFR1, NFR2)
**And** each package (`discovery`, `jwks`, `token`, `userinfo`, `introspection`, `revocation`, `jwt`) gains `WithConfig` with existing `WithXxx` options acting as overrides (FR21, FR22)
**And** an integration test (`TEST_REQUIRE_LIVE` harness) exercises construct-from-Config end-to-end (repo rule).

### Story C.4: Go lint gate, examples, docs, status flip

As a monorepo maintainer,
I want the Go invariants permanent and documented,
So that Go stays converged.

**Acceptance Criteria:**

**Given** the migrated Go library
**When** the Semgrep rule (go: `os.Getenv`/`os.LookupEnv` outside `pkg/config`, tests, examples, internal test harness) lands in lint CI
**Then** the gate is required and demonstrated red-then-green (FR28, NFR14)
**And** the four journey examples exist under `go/examples/` and compile in CI (FR35)
**And** docs reference the spec registry without duplication, no process narration (FR36, NFR15, AR7)
**And** capabilities row flips Go to `implemented`.

## Epic D: Rust Configuration API `[OIM]`

The contract in Rust idiom — builders preserved, redaction centralized, guardrails intact.

### Story D.1: Rust `config` module with strict resolver

As a Rust consumer,
I want `Config::from_env()` / `Config::builder().sources(...).build()` returning `Result<Config, ConfigError>`,
So that invalid deploys fail closed before any client exists.

**Acceptance Criteria:**

**Given** `rust/src/config/` (`Config`, `ConfigSource` trait, `EnvSource`, `ConfigBuilder`, collected `CFG-*` error type)
**When** `rust/tests/spec_conformance.rs` executes config vectors
**Then** CFG-1xx, 3xx, 5xx pass; AR2 keys `n/a`-marked (FR7–FR13, FR16, FR17)
**And** edition 2024 / MSRV 1.96 / rustls-only / zero new deps hold (NFR13); all existing tests pass untouched (NFR2)
**And** the existing `unsafe`-set_var constraint is respected (env reads only through the source; tests use fixture sources, not env mutation).

### Story D.2: Rust `Secret<T>` centralization

As a security reviewer,
I want redaction owned by one newtype instead of per-struct hand-written `Debug` impls,
So that new secret-bearing fields are safe by construction.

**Acceptance Criteria:**

**Given** `Secret<T>` with redacting `Debug`/`Display` (canonical `<redacted>`) and explicit `expose_secret()`-style accessor
**When** CFG-4xx vectors run in Rust
**Then** all rendered/serialized Config secret output is `<redacted>` (FR18, FR19, FR29, NFR5)
**And** `TokenClient`/`TokenClientBuilder`/`TokenResponse` hand-written redacting Debug impls migrate to `Secret<T>` with their rendered output and existing tests unchanged (additive refactor; NFR2).

### Story D.3: Rust legacy migration + builder seams (`from_config`)

As a Rust consumer and maintainer,
I want cache-cap env reads routed through the resolver and every builder constructible from Config,
So that Rust matches the contract end-to-end.

**Acceptance Criteria:**

**Given** `src/env.rs` absorbed into `config/` and the call sites in `discovery/client.rs` + `jwks/client.rs`
**When** they resolve via legacy mode at current call sites (AR1)
**Then** applicable CFG-2xx vectors pass ("negative/garbage → default, `0` → unbounded" preserved verbatim); existing tests untouched (FR6, FR23, NFR1, NFR2)
**And** `DiscoveryClientBuilder`, `TokenClientBuilder`, `JwksClientBuilder`, `UserInfoClientBuilder`, `ValidationOptionsBuilder` gain `from_config(&Config)` with all current builder methods acting as overrides (FR21, FR22)
**And** an integration test (`TEST_REQUIRE_LIVE`) exercises construct-from-Config end-to-end.

### Story D.4: Rust lint gate, examples, docs, status flip

As a monorepo maintainer,
I want Rust's invariants permanent and documented,
So that Rust stays converged.

**Acceptance Criteria:**

**Given** the migrated Rust crate
**When** the Semgrep rule (rust: `std::env::var` outside `src/config/`, tests, examples) lands in lint CI
**Then** the gate is required and demonstrated red-then-green (FR28, NFR14)
**And** the four journey examples exist under `rust/examples/` and compile in CI (FR35)
**And** docs reference the spec registry, no process narration (FR36, NFR15, AR7)
**And** capabilities row flips Rust to `implemented`.

## Epic E: TypeScript Configuration Bootstrap `[OIM]`

`@identity-model/node`'s first real module — the package's env-hygiene pattern from line one.

### Story E.1: TS `Config`, `ConfigSource`, `EnvSource`, `Secret`

As a TS consumer (and the future node library itself),
I want a contract-conformant Config module with zero runtime deps and no top-level env reads,
So that the node package starts life converged instead of retrofitted.

**Acceptance Criteria:**

**Given** `node/src/config/` (`Config` factory, `ConfigSource` interface, `EnvSource` reading `process.env`/`import.meta.env` only inside `resolve`, `Secret` with `toString`/`toJSON`/inspect → `<redacted>`, collected `CFG-*` errors)
**When** its unit tests load fixtures directly from `spec/test-fixtures/config/` (no runner exists yet)
**Then** the strict, precedence, redaction, and source families all pass against the shared fixtures (FR7–FR19, FR25)
**And** zero runtime dependencies (NFR13); importing the module with a poisoned env performs no reads (NFR12)
**And** package exports expose the module; `private` stays until the package itself ships.

### Story E.2: Node capability status + examples

As a monorepo maintainer,
I want Node's status reported honestly and the module documented,
So that capabilities.md never lies about Node.

**Acceptance Criteria:**

**Given** no Node conformance runner exists
**When** the capabilities row updates
**Then** Node's Configuration status follows the existing legend truthfully (`in-progress` with a fixture-driven test note — not `implemented` until a runner executes vectors) (FR5, PRD Node-honesty rule)
**And** runnable TS examples for the four journeys exist and are type-checked in CI (FR35)
**And** the TS Semgrep rule (`process.env`/`import.meta.env` outside `src/config/`, tests, examples) lands in the node package's lint task so the hygiene pattern is enforced from the package's first line (FR28)
**And** the follow-up "Node conformance runner" is filed as a tracked issue (growth scope), not silently absorbed.

## Epic F: identity-stack Backend Adoption `[IS]`

The reference consumer's backend: one startup-built typed config, no request/import-time env reads on the auth path.

### Story F.1: App-level typed config (`app/config.py`) with boot-time fail-closed

As the identity-stack maintainer,
I want all Descope/Ory/infra settings resolved into one strict-mode typed config at startup,
So that a misconfigured deploy crash-loops with a precise error instead of serving broken auth.

**Acceptance Criteria:**

**Given** `backend/app/config.py` defining app key groups (Descope: project id, management key/base URL/webhook + flow-sync secrets as secret-classified; Ory: issuer/audience/require-audience preserving the existing "audience required when issuer set unless opted out" rule; infra: deployment mode, trusted proxies, frontend URL) built on py-identity-model's exported primitives (D8), pinned to the release from Epic B
**When** the FastAPI lifespan constructs it
**Then** a fully-valid env yields one immutable config object; any missing/partial/invalid state exits non-zero listing every CFG error (FR30, FR31)
**And** secret-classified values render `<redacted>` in logs/errors (NFR5)
**And** unit tests cover valid, missing-required, partial-Ory-group, and invalid-value states
**And** existing backend tests pass untouched (NFR2).

### Story F.2: Consume the config everywhere on the auth path

As the identity-stack maintainer,
I want middleware, routers, and provider building to consume the injected config,
So that request-time and import-time env reads leave the auth path for good.

**Acceptance Criteria:**

**Given** the config object from F.1
**When** `configure_middleware`, `build_provider_configs`, `routers/auth.py` (logout), `routers/protected.py`, and `routers/internal.py` consume it via injection
**Then** the logout handler's request-time `os.environ["DESCOPE_PROJECT_ID"]`/`getenv` reads and `protected.py`'s import-time `DISCO_ADDRESS` construction are gone (FR30)
**And** a regression test asserts no environment access occurs during request handling on the auth path (FR33a) — e.g. poisoned-environ request-cycle test
**And** all existing unit/integration/E2E suites pass untouched (NFR2); integration tests run green locally pre-PR (repo rule)
**And** the PR description documents the before/after as the consumer worked example (FR34, AR7 applies to user-facing docs only).

## Epic G: identity-stack Frontend Fail-Closed Config `[IS]`

The frontend refuses to guess: explicit failure instead of `.../undefined`.

### Story G.1: Frontend config module with init-time validation

As an identity-stack operator,
I want the frontend to validate provider configuration once at app init,
So that an unconfigured deployment shows a clear error instead of a nonsense authority.

**Acceptance Criteria:**

**Given** `frontend/src/config.ts` implementing contract-conformant strict validation over `import.meta.env` (inline per Architecture; `@identity-model/node` unpublished), with `vite-env.d.ts` updated
**When** `main.tsx` consumes the validated config
**Then** with `VITE_DESCOPE_PROJECT_ID` unset, the app renders an explicit "no identity provider configured" failure state and never constructs an authority or client_id containing `undefined` (FR32)
**And** with valid env, behavior is pixel/behavior-identical to today (NFR1); all existing frontend tests pass untouched (NFR2)
**And** unit tests cover unset, empty-string (invalid per AR4, not absent), and valid states (FR33b)
**And** no `import.meta.env` access remains at module top level outside `config.ts` (NFR12).

### Story G.2: E2E pin for the unconfigured state

As the identity-stack maintainer,
I want the fail-closed frontend behavior pinned by E2E,
So that the `.../undefined` regression class is dead permanently.

**Acceptance Criteria:**

**Given** the Playwright suite
**When** an E2E case boots the frontend with no provider env
**Then** the explicit failure state is asserted and no network request to an `undefined`-containing URL occurs (FR33b)
**And** the standard configured-path E2E suite passes unchanged (NFR2)
**And** the frontend adoption is documented as the TS worked example (FR34).

---

## Final Validation

- **FR coverage:** all 36 FRs map to at least one story with an AC naming them; sweep performed FR-by-FR. One gap found and fixed during validation: FR28's per-language lint gate lacked TS coverage → added to Story E.2.
- **NFR coverage:** NFR2 (zero existing-test changes) is an explicit AC on every implementation story; NFR1/5/9/12/13 appear as ACs where they bind; the rest are structural (gates, spec source-of-truth) and land via A.3/B.5/C.4/D.4/E.2.
- **Dependency check:** no story depends on a later story. Within-epic chains are strictly sequential (stacked-PR-friendly). Epic independence holds: A alone fixes the no-contract problem; each language epic is standalone-complete (impl + migration + gate + docs); F needs only B's shipped release; G needs only A.
- **No big-bang setup:** no story creates surface ahead of need; A.3 wires gates in `planned`/`n/a` state so CI is green before any implementation exists.
- **Story sizing:** 23 stories, each scoped to a single-agent PR (largest: B.1/C.1/D.1 core modules — bounded by the fixed contract and existing harness wiring).
- **Sequencing for execution:** A (stacked A.1→A.2→A.3) → B → C → D → E in order (Go templates Rust); F after B's release; G anytime after A. One workstream per repo at a time per repo convention.
