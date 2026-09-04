---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - 'config-api-kickoff (session input, 2026-09-03 — carries the overnight-loop audit findings)'
  - '_bmad-output/planning-artifacts/identity-model-parity-reconciliation-plan.md'
  - '_bmad-output/planning-artifacts/identity-model-feature-parity-report-2026-08-29.md'
  - '_bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md (format precedent)'
workflowType: 'product-brief'
project_name: 'identity-model config-api'
date: '2026-09-03'
author: 'James'
status: 'complete-headless-draft'
executionMode: 'headless-autonomous'
---

# Product Brief — Unified Cross-Language Configuration API (identity-model)

**Author:** James
**Date:** 2026-09-03
**Status:** Draft

> **Execution note (HEADLESS run).** Produced by the `bmad-create-product-brief` workflow run
> non-interactively from the 2026-09-03 kickoff (which carries the overnight-loop audit findings).
> Scope decisions were pre-answered in the kickoff and treated as locked; grounding claims were
> verified against the live code in `identity-model` (py/ go/ rust/ node/ spec/) and `identity-stack`.
> Two kickoff claims were corrected against source: the backend's per-request *provider rebuild* is
> already fixed (startup-built since the middleware refactor) though request-time env reads persist in
> `routers/auth.py`, and the frontend `VITE_OIDC_*` fallback is planned (ORY-4.2), not yet implemented —
> the unguarded `.../undefined` authority is current behavior in `main.tsx`. `node/` is an empty
> placeholder package.

## Executive Summary

The identity-model monorepo ships production-grade OIDC/OAuth2 client libraries in four languages (`py/`, `go/`, `rust/`, `node/`) with a shared conformance spec — yet **configuration is the one capability none of them treats as a capability**. Every language, and the reference consumer identity-stack, reads configuration ad-hoc from the environment: stringly-typed `getenv` calls scattered per module, no single validation point, secret redaction and https-only gating re-implemented per capability (Go has none at all), and — in identity-stack — request-time env reads on the auth path plus an unvalidated frontend authority that degrades to `.../undefined`.

This initiative delivers a **unified Configuration API**: a typed, validated `Config` value in all four languages that validates once at construction and **fails closed** on missing/partial/invalid config, redacts secrets centrally, and reads from environment variables by default through a pluggable `ConfigSource` abstraction (Rust trait / Go interface / Python Protocol / TS interface) — so consumers can resolve values from Vault, AWS SSM, files, or in-process structs without the library depending on any secrets backend. The behavior is defined once as a prose contract in `spec/` with behavior IDs, tracked in `spec/capabilities.md`, and enforced by the same cross-language conformance machinery as every other capability. Adoption is **100% backward-compatible and opt-in**: the existing env-var path stays the default, and no existing unit/integration/E2E/conformance test changes behavior.

---

## Core Vision

### Problem Statement

Configuration in the identity-model ecosystem is an unowned, unspecified, per-module concern. The 2026-09-03 overnight-loop audit surfaced the same defect class independently in every layer:

- **Python (identity-stack consumer):** the audit's worst finding — a per-request `os.getenv` provider rebuild — has since been fixed for the *middleware* path (providers are built once in `factory.py` → middleware `__init__` → `build_provider_configs()`), but the defect class it exemplifies persists: the logout handler still reads `os.environ["DESCOPE_PROJECT_ID"]` **per request** (KeyError-on-missing at request time), and env access is a mix of hard-fail `os.environ[...]` and silently-defaulting `os.getenv(..., "")` scattered across `main.py`, `factory.py`, `routers/auth.py`, and `routers/protected.py` — with no central config module anywhere in the backend (`find app -iname config.py` → none).
- **Rust / Go (library):** library env reads are few but pattern-less per module (`DISCO_CACHE_MAX_ENTRIES`/`JWKS_CACHE_MAX_ENTRIES` via `rust/src/env.rs` and each Go package's `options.go`); the ~14 Python library knobs (`SSL_*`, `HTTP_RETRY_*`, `MAX_JWKS_*`, `*_CACHE_TTL`, …) are read ad-hoc in 4 modules; `TEST_*` harness config is per-module in every language. Secret redaction is re-implemented per type where it exists at all — Rust hand-writes redacting `Debug` impls per struct, Python per-class `__repr__` + `logging_utils` helpers, and **Go has no secret redaction whatsoever** (`clientSecret` is a plain string field). Https-only gating is enforced per capability in every language.
- **Frontend (identity-stack):** `main.tsx` builds `authority: `${baseUrl}/${projectId}`` from `import.meta.env.VITE_DESCOPE_PROJECT_ID` with **no validation that any provider is configured** — an unset env yields `authority="https://api.descope.com/undefined"` and `client_id: undefined`, fail-closed only by accident (the IdP rejects the nonsense authority). The planned `VITE_OIDC_*`→`VITE_DESCOPE_*` fallback (ORY-4.2) will widen this surface without a validation layer to land on.
- **Node (`node/`):** an empty placeholder package — meaning the TS implementation is a greenfield bootstrap where Config can be foundational from the first module, not a retrofit.

There is no typed configuration value (the one exception — the `OIDCSettings` dataclass in the fastapi-identity-model package, `OIDC_*` prefix — proves the pattern works but covers only that package), no single construction-time validation point, no shared definition of config keys or precedence, and no way to source configuration from anything other than the process environment.

### Problem Impact

- **Security — fail-open by construction.** Per-request env re-reads mean the validation config the app *enforces* can silently diverge from the config it *booted* with. Missing keys degrade to `None`/empty-string/`undefined` values that flow into authority URLs and validation options instead of stopping the process at startup.
- **Security — secrets in debug output.** Redaction of `client_secret`/tokens is a per-module convention, not a guarantee. Every new capability re-implements it; any one that forgets leaks secrets into logs, error messages, and `Debug`/`repr` output.
- **Parity drift.** Each language invents its own env-var names, fallback rules, and validation behavior. There is no contract, so behavior diverges exactly the way `spec/capabilities.md` existed to prevent — and per the parity reconciliation plan, anything not enforced by spec vectors drifts.
- **Adoption ceiling.** Consumers who keep secrets in Vault/SSM/files today must copy values into environment variables — the library offers no seam. The reference consumer (identity-stack) demonstrates the resulting workarounds in production code.
- **Maintenance tax.** Every env-read fix (the KeyError class, the `.../undefined` class) is discovered and patched per file, per language, forever, because there is no central place to fix it once.

### Why Existing Solutions Fall Short

- **General-purpose config frameworks** (viper for Go, figment/config-rs for Rust, pydantic-settings for Python, convict/dotenv for Node) are per-language, bring their own dependency weight and opinions, and give **zero cross-language behavioral parity** — four frameworks means four sets of precedence rules, error semantics, and redaction behaviors. The Rust guardrails (edition 2024, rustls-only, no heavyweight deps) and the library's minimal-dependency posture rule out most of them outright.
- **Secrets-vendor SDKs** (Vault, AWS SSM) solve sourcing but couple the library to a backend — an explicit non-goal. An identity *protocol* library must not carry a secrets-vendor dependency tree.
- **The status quo** (ad-hoc env reads) is the thing being replaced; it has no validation point, no typing, no redaction guarantee, and no seam for alternative sources.
- **Nothing existing is spec-enforceable.** The monorepo's differentiator is behavior defined once in `spec/` and proven per language by a coverage-gated conformance suite. No off-the-shelf framework can participate in that contract; a purpose-built, minimal Configuration API can.

### Proposed Solution

A **Configuration capability**, designed once and implemented idiomatically four times:

1. **Typed `Config` value per language** — Rust `Config` struct (keeping the existing builder pattern), Go `Config` struct with functional options, Python typed Config (dataclass/pydantic) with a `ConfigSource` Protocol and no import-time env reads, TS `Config` object with no top-level `import.meta.env` reads.
2. **Construct-time validation, fail closed** — missing/partial/invalid configuration is an error at construction with a canonical error code, never a silent `undefined` authority or per-request re-read.
3. **Centralized secret redaction** — `client_secret`, tokens, and keys are redacted in `Debug`/`Display`/`repr`/`toString` and serialized output by the Config type itself, once per language, never per module.
4. **`ConfigSource` abstraction, `EnvSource` default** — the library core stays source-agnostic; environment variables remain the zero-config default; Vault/SSM/file/in-process sources are consumer-side implementations of a small interface.
5. **One shared prose contract in `spec/`** — config keys, precedence/fallback rules, validation errors, and redaction guarantees defined as behavior IDs, with a `spec/capabilities.md` row, so all four languages satisfy the *same* behavior and the conformance machinery catches drift.
6. **identity-stack adopts it as reference consumer** — `providers.py` moves to a startup-built typed config, the frontend `VITE_*` fallback gains real validation, proving the migration path is non-breaking.

### Key Differentiators

- **Parity is enforced, not aspirational.** Config behavior gets behavior IDs in `spec/` and rides the existing coverage-gate machinery — the same mechanism that keeps every other capability honest across four languages. No general-purpose framework can offer this.
- **Security posture as API contract.** Fail-closed validation and redaction are *guarantees of the type*, not conventions — eliminating the two audit-confirmed defect classes (fail-open env divergence, accidental-only fail-closed frontend) by construction.
- **Opt-in per the hardening-as-optional-config rule.** The existing env-var behavior remains the default path; adopting typed Config or a custom source is additive. Zero behavior change for existing integrations — the project's proven pattern for shipping hardening without breaking anyone.
- **Source-agnostic core.** The `ConfigSource` seam gives Vault/SSM/file sourcing without a single vendor dependency in the library — deliberately *not* a general-purpose config framework, just the minimal surface an identity client needs.
- **A live reference consumer.** identity-stack's migration is part of the initiative, so the design is validated against real production wiring, not hypothetical adopters.

---

## Target Users

### Primary Users

**1. The integrating backend engineer (library consumer, any of the four languages).**
Builds a service that validates tokens or drives an OIDC flow with identity-model. Today they read provider settings from the environment themselves, invent their own "is this configured?" checks, and either hand-roll secret masking or leak `client_secret` into debug logs. If their platform keeps secrets in Vault/SSM, they must copy values into env vars because the library offers no other seam. Success for them: construct a `Config` at startup, get one canonical, secret-free error if anything is missing or invalid, and plug in their platform's secret store by implementing one small interface.

**2. The identity-stack maintainer (reference consumer — the audit's ground zero).**
Owns the FastAPI backend + React frontend that exhibit the audit's defect class: request-time `os.environ["DESCOPE_PROJECT_ID"]` in the logout handler, hard-fail-vs-silent-default env access diverging across `main.py`/`factory.py`/`routers/*`, no central config module, and the frontend's unguarded `authority: ".../undefined"` when `VITE_DESCOPE_PROJECT_ID` is unset. Success for them: all provider/auth config is built once at startup as a typed value, a misconfigured deploy fails at boot with a clear error instead of serving requests against a drifted or nonsense configuration, and the frontend refuses to render an auth flow with no provider configured.

**3. The monorepo maintainer/contributor (cross-language capability author).**
Implements each capability four times and currently re-implements env reads, secret-redacting `Debug`/`repr`, and https-only gating per capability per language. Success for them: config behavior is defined once in `spec/` with behavior IDs, the Config type provides redaction and validation as reusable guarantees, and the coverage gate — not review vigilance — catches any language that drifts.

### Secondary Users

- **Platform/ops engineers** deploying identity-model consumers: author `ConfigSource` implementations for Vault/AWS SSM/files once per organization; deployment misconfiguration surfaces at boot (crash-loop with a named missing key) instead of as runtime 401s/500s.
- **Security reviewers/auditors** (including the project's own red/blue and adversarial-review passes): fail-closed construction and centralized redaction turn two recurring audit findings into type-level guarantees they can verify in one place instead of per module.
- **The conformance/test harness** is itself a config consumer (`TEST_*` keys read per module today); it adopts the same typed surface, and config behaviors join the cross-language conformance suite it runs.

### User Journey

1. **Zero-change baseline:** an existing consumer upgrades the library; nothing changes — env-var behavior is the default path and all existing tests pass untouched.
2. **Opt-in:** they construct the typed `Config` at startup (explicitly, or via the default `EnvSource`). Misconfiguration now fails at construction with a canonical, secret-free error naming the missing/invalid key.
3. **The "aha" moment:** a deploy with a missing `client_secret` (or an unset provider entirely) crash-loops at boot with a precise error — instead of serving traffic that fails open, 500s on first login, or redirects to `https://idp.example/undefined`.
4. **Composition:** they add their platform's secrets backend by implementing `ConfigSource` and composing it with env/overrides under documented precedence rules — no new library dependencies.
5. **Steady state:** new capabilities consume config through the typed surface; contributors never write another ad-hoc `getenv`; the spec vectors keep all four languages behaviorally identical.

---

## Success Metrics

Success is defined mechanically wherever possible (per the project's mechanical-gates rule): each metric is a gate, a grep, or a test — not a judgment call.

### User Success Metrics

- **Fail-closed misconfiguration:** with typed Config adopted, every missing/partial/invalid-config scenario in the shared vector set produces the canonical error at construction time — in all four languages. Measured by the config conformance vectors passing per language.
- **No secret leakage:** debug/display/repr/toString and serialized forms of Config never contain secret material. Measured by dedicated redaction vectors (assert secret absent, placeholder present) in all four languages.
- **Source pluggability:** a consumer can supply a custom `ConfigSource` (in-process/file-backed) without any new library dependency. Measured by a per-language integration test using a non-env source end-to-end.
- **Reference-consumer outcomes (identity-stack):** all auth-path configuration is startup-built via typed Config (eliminating the remaining request-time env reads, e.g. the logout handler's `os.environ["DESCOPE_PROJECT_ID"]`, and the mixed hard-fail/silent-default access patterns); a fully-unconfigured frontend env renders an explicit "no provider configured" failure rather than an `.../undefined` authority. Each is proven by a regression test.

### Business Objectives

- **Close the audit finding class.** The 2026-09-03 audit's config findings (per-request rebuild, KeyError-vs-getenv divergence, accidental fail-closed frontend) are resolved in the reference consumer and made unrepresentable in the library surface — this is a security-posture objective, in line with the project's fail-closed direction.
- **Extend spec-enforced parity to configuration.** Config becomes a tracked capability (`spec/capabilities.md` row + behavior IDs + vectors) so the four languages cannot drift — the same objective the parity reconciliation plan sets for every other capability.
- **Remove the secrets-backend adoption blocker** for Vault/SSM/file-based platforms without adding a single vendor dependency — widening the library's viable consumer base.
- **Zero regression for existing integrations.** The initiative ships as opt-in, default-unchanged behavior; no existing unit/integration/E2E/conformance test changes. (Hard constraint, not aspiration — it gates every PR.)

### Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| Config behavior IDs specified in `spec/` | Full key set + precedence + validation + redaction covered | Spec contract merged; vectors exist per behavior ID |
| Languages passing config conformance vectors | 4/4 | `spec-vector-coverage` + conformance CI (required checks) |
| Ad-hoc env reads in library (non-test, non-EnvSource) code | 0 at completion; enforced thereafter | Lint/CI grep gate per language (added as part of the epic) |
| Secret-material leaks in Config debug/serialized output | 0 | Redaction vectors, all languages |
| Existing tests modified to keep passing | 0 | PR review + CI (suites untouched and green) |
| identity-stack per-request env reads on the auth path | 0 (startup-built config) | Backend regression test + code review of `providers.py` |
| Frontend unconfigured-env behavior | Explicit fail-closed error, no `undefined` authority | Frontend unit test + E2E case |
| `spec/capabilities.md` row for configuration | Present with per-language status | Generated capabilities table (per reconciliation plan §5) |

---

## MVP Scope

### Core Features

1. **Shared config contract in `spec/`** (prose, like the conformance JSONs' companion docs): canonical config keys per capability (discovery, client auth, scopes, base URLs, timeouts, `TEST_*`), precedence/fallback rules, validation error semantics (canonical error codes), and redaction guarantees — each as a behavior ID. Plus the `spec/capabilities.md` row.
2. **Typed `Config` + `ConfigSource` + default `EnvSource` in all four languages**, idiomatic per language: Rust struct + trait (existing builder pattern preserved; edition 2024 / MSRV 1.96; rustls-only; no new heavyweight deps), Go struct + interface (functional options), Python typed Config + Protocol (no import-time env reads), TS object + interface (no top-level `import.meta.env` reads).
3. **Construct-time fail-closed validation** with canonical, secret-free errors — the same missing/partial/invalid outcomes in every language.
4. **Centralized secret redaction** in `Debug`/`Display`/`repr`/`toString`/serialization, owned by the Config type.
5. **Source composition** with documented precedence (explicit overrides > custom source > env default, exact order settled in architecture) — enough to compose env + in-process overrides + a consumer-supplied secrets source.
6. **Config conformance vectors** covering missing-key fail-closed, redaction, and precedence/fallback — wired into the existing `spec-vector-coverage` gate.
7. **Library-internal migration**: per-module env reads in `py/ go/ rust/ node/` routed through the Config surface (behavior-preserving; the env keys and defaults stay identical).
8. **identity-stack reference adoption**: backend auth-path config startup-built via typed Config (no request-time env reads; `main.py`/`factory.py`/`routers/auth.py`/`routers/protected.py` unified on one config module); frontend `VITE_*` handling validated fail-closed. Phased and non-breaking.

### Out of Scope for MVP

- **Vendor source implementations** (Vault, AWS SSM, cloud KMS) — the seam ships; adapters are consumer-side or future optional packages. The library core never gains a secrets-vendor dependency (permanent non-goal, not just MVP).
- **General-purpose config-framework features**: file-format parsing (YAML/TOML/JSON config files), profiles/environments, hot-reload/watch semantics, hierarchical merging beyond the documented precedence rules.
- **On-the-wire OIDC/OAuth behavior changes** — this is wiring, not protocol (permanent non-goal).
- **Removing the env-var default path or deprecating any existing configuration behavior** — opt-in forever until an explicitly-planned major.
- **Dynamic/runtime re-configuration** of a constructed client (Config values are immutable once validated; refresh semantics stay where they already exist, e.g. JWKS/discovery TTLs).

### MVP Success Criteria

The KPI table above is the gate set. MVP is done when: the spec contract + capabilities row are merged; all four languages pass the config vectors under the coverage gate; redaction vectors pass 4/4; identity-stack's backend and frontend regressions are covered by tests; and every PR in the initiative landed without modifying an existing test to keep it passing.

### Future Vision

- **First-party optional source adapters** (separate opt-in packages/crates — e.g. Vault, SSM, dotenv-file) built on the stable `ConfigSource` seam, once real consumer demand exists.
- **Generated configuration reference docs** — per-language config-key documentation emitted from the spec contract, so docs can't drift from behavior (mirrors the generated `capabilities.md` direction).
- **Lint enforcement as permanent CI** — the "no ad-hoc env reads" gate becomes a standing per-language check, making the defect class unrepresentable for future capabilities.
- **Config surface for future capabilities by default** — new capabilities (FAPI epic, gateway work) define their keys in the spec contract first, implementations consume the typed surface only.
