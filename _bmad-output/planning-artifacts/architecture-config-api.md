---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete-headless-draft'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd-config-api.md'
  - '_bmad-output/planning-artifacts/product-brief-config-api.md'
  - 'config-api-kickoff (session input, 2026-09-03)'
  - '2026-09-03 env-read inventory (session grounding: file:line sweep of identity-model py/go/rust/node/spec + identity-stack backend/frontend)'
workflowType: 'architecture'
project_name: 'identity-model config-api'
user_name: 'James'
date: '2026-09-03'
executionMode: 'headless-autonomous'
---

# Architecture Decision Document — Unified Cross-Language Configuration API

> **Execution note (HEADLESS run).** Produced by the `bmad-create-architecture` workflow run
> non-interactively over `prd-config-api.md`. Resolves the design questions the PRD deferred here:
> the per-key registry, the source-contract shape (pull vs snapshot), the exact precedence order,
> the per-language idiom mapping, and the `spec/` contract format. Grounded in the 2026-09-03
> file:line inventory of both codebases.

_This document builds through the architecture workflow steps._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (36 FRs, 8 capability areas):** contract in `spec/` (FR1–6), typed construction/validation (FR7–12), sources & composition (FR13–17), redaction (FR18–20), library integration (FR21–25), conformance & enforcement (FR26–29), identity-stack adoption (FR30–34), docs/examples (FR35–36). Architecturally this decomposes into: **one normative contract artifact** (spec), **four independent implementations** of the same small component (Config + sources + validation + redaction), **per-language integration seams** into existing client entry points, and **two CI gates** (vectors, lint).

**Non-Functional Requirements that drive the architecture:**
- NFR1–4 (backward compat) force a *parallel additive surface*: the Config path must sit beside the legacy env path, sharing the same resolution semantics so behavior is bit-identical — which is why the legacy reads migrate to route *through* the same resolver internally (FR23) rather than being re-specified.
- NFR5–7 (security) force redaction to live *in the type* (a secret wrapper type, not call-site discipline) and validation to run *after* composition (sources are untrusted raw-value suppliers).
- NFR9–12 (performance/determinism) force construction-time-only resolution, immutability, and no I/O in library sources.
- NFR13 (deps) forces stdlib-only implementations in all four languages.

**Scale & Complexity:** high conceptual precision, small code volume. Per language the deliverable is ~1 module + tests + vector runner wiring. The risk is not size — it is behavioral equivalence across four implementations and zero regression on legacy paths.

- Primary domain: cross-language library internals + spec authoring
- Complexity level: high (parity + compat constraints), low-moderate (code volume)
- Estimated architectural components: 6 (spec contract; per-language Config module ×4; consumer adoption layer)

### Technical Constraints & Dependencies

- The existing conformance machinery is a hard dependency and the enforcement backbone: `spec/conformance/*.json` (`{ capability, spec, spec_url, required_fields[], tests[] }`, tests `{ id, title, given, when, then, fixture?, references[] }`, IDs `PREFIX-NNN`), `spec/test-fixtures/{capability}/`, the `spec-vector-coverage` CI gate, and `spec/capabilities.md` (`Tier | Capability | Spec | Conformance | Python | Go | Rust` with statuses implemented/in-progress/planned/n/a).
- Existing per-language construction idioms are load-bearing and must be extended, not replaced: Rust `X::builder()…build()` builders; Go `type Option func(*config)` + `WithXxx`; Python dataclasses (precedent: `OIDCSettings.from_env(prefix="OIDC_")`); TS greenfield in `@identity-model/node`.
- Existing behavior that becomes contract: cache-cap parsing ("negative/garbage → default, `0` → unbounded"), TTL clamping `[60, 86400]`, `HTTP_RETRY_COUNT` as alias of `HTTP_RETRY_MAX_ATTEMPTS`, SSL env var precedence chain (`SSL_CERT_FILE` → `CURL_CA_BUNDLE` → `REQUESTS_CA_BUNDLE`), `allow_http`-style opt-outs.
- Node has no conformance runner; TS vectors are authored but reported per capabilities-status rules until a runner exists.

### Cross-Cutting Concerns Identified

1. **Behavioral equivalence** — every semantic must be expressible as a language-neutral vector; anything that can't be vectored can't be promised.
2. **Secret classification** — one classification in the spec drives redaction in four type systems.
3. **The legacy/typed duality** — the same resolver must serve both the implicit legacy path and the explicit typed path so there is exactly one behavior.
4. **Gate integration** — vectors, coverage, lint, and capabilities-status all hook existing CI; nothing new is invented, only extended.

## Starter Template Evaluation

Not applicable — brownfield capability inside an existing, tooled monorepo (moon tasks, per-language CI, conformance harness already in place) plus an existing consumer app. The "starter" is the repo itself; no scaffolding, generators, or new tooling are introduced. The only greenfield corner, `@identity-model/node`, deliberately inherits the monorepo's existing conventions (moon.yml already present) rather than adopting an external template.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):** D1 source contract, D2 precedence, D3 key registry, D4 dual validation modes.
**Important (shape architecture):** D5 redaction mechanism, D6 spec format, D7 module placement, D8 reusable machinery, D9 lint gate.
**Deferred (post-MVP, per PRD):** first-party source adapters; generated config reference docs; Node conformance runner.

### D1 — Source contract: library-driven bulk snapshot (not per-key pull)

```
ConfigSource::resolve(keys: [KeyId]) -> Map<KeyId, String>   // conceptual; per-language shape in idiom mapping
```

The **library** drives resolution: at construction it passes the canonical key list (from the registry) to each source once; the source returns raw string values for the subset it can supply. Sources never return typed values and never see typed values.

**Why snapshot over per-key pull:** one atomic read per source guarantees deterministic, torn-read-free resolution (NFR11); a custom secrets source makes one backend round-trip instead of N; vector fixtures become plain key→value maps; composition is a pure merge. **Why library-driven (keys passed in):** sources stay registry-agnostic — a Vault source doesn't hardcode the key set, and app-defined key groups (D8) reuse the same source unchanged.
**Consequences:** all keys resolve at construction (no lazy secrets — consistent with construct-once immutability); a source wanting "everything it has" can ignore the key list and over-return (unknown keys are discarded by the resolver, never an error — forward compat).

### D2 — Precedence: explicit overrides ⊳ consumer sources (given order) ⊳ env ⊳ spec default

Resolution per key, first hit wins:

1. **Explicit override** — values set directly in code on the builder/options/constructor (highest; they are not a "source", they short-circuit resolution for that key).
2. **Consumer-supplied sources, in the order given** — earlier in the list = higher precedence.
3. **`EnvSource`** — always implicitly last unless the consumer includes it explicitly to reposition it; the default construction (`Config::from_env()` and per-language equivalents) is simply `sources = [EnvSource]`.
4. **Spec default** — applies only when no source yields the key; required keys have no default and fail closed (strict mode).

**Aliases** (e.g. `HTTP_RETRY_COUNT` for `HTTP_RETRY_MAX_ATTEMPTS`) resolve *within* a source: a source is consulted for primary-then-alias before falling through to the next source. This preserves today's Python semantics and prevents a lower-precedence source's primary key from beating a higher source's alias.
**Multi-source conflict** is not an error — precedence is the resolution. There is no merging *within* a key (no partial strings), only whole-value wins.

### D3 — Canonical key registry (normative content of `spec/config.md`)

Logical key IDs are dotted lowercase; each maps to canonical env name(s). Existing env names, defaults, and semantics are preserved verbatim (NFR1). Registry v1:

| Logical key | Env name(s) | Type | Default | Validation / semantics | Secret |
|---|---|---|---|---|---|
| `http.timeout` | `HTTP_TIMEOUT` | float secs | 30 | > 0; garbage → default (legacy mode) | no |
| `http.retry.max_attempts` | `HTTP_RETRY_MAX_ATTEMPTS`, alias `HTTP_RETRY_COUNT` | int | 3 | ≥ 0; garbage → default | no |
| `http.retry.base_delay` | `HTTP_RETRY_BASE_DELAY` | float secs | 0.5 | ≥ 0; garbage → default | no |
| `jwks.max_size` | `MAX_JWKS_SIZE` | int bytes | 1 MiB | > 0; garbage → default | no |
| `jwks.max_keys` | `MAX_JWKS_KEYS` | int | 100 | > 0; garbage → default | no |
| `jwks.cache.ttl` | `JWKS_CACHE_TTL` | int secs | 86400 | clamp [60, 86400]; garbage → default | no |
| `discovery.cache.ttl` | `DISCO_CACHE_TTL` | int secs | 86400 | clamp [60, 86400]; garbage → default | no |
| `jwks.kid_miss_cooldown` | `KID_MISS_REFRESH_COOLDOWN` | int secs | (current default) | clamp per current impl | no |
| `jwks.cache.max_entries` | `JWKS_CACHE_MAX_ENTRIES` | int | (current default) | negative/garbage → default; `0` → unbounded | no |
| `discovery.cache.max_entries` | `DISCO_CACHE_MAX_ENTRIES` | int | (current default) | negative/garbage → default; `0` → unbounded | no |
| `tls.cert_file` | `SSL_CERT_FILE` | path | — | precedence chain `SSL_CERT_FILE` → `CURL_CA_BUNDLE` → `REQUESTS_CA_BUNDLE` (intra-group fallback, preserved) | no |
| `tls.ca_bundle` | `CURL_CA_BUNDLE` | path | — | ↑ | no |
| `tls.ca_bundle_requests` | `REQUESTS_CA_BUNDLE` | path | — | ↑ (Python-only legacy compat; other languages: recognized, unused) | no |
| `client.discovery_url` | `{prefix}DISCOVERY_URL` | URL | — | **required** in client group; https-only per existing policy | no |
| `client.id` | `{prefix}CLIENT_ID` | string | — | **required** in client group | no |
| `client.secret` | `{prefix}CLIENT_SECRET` | string | — | required iff auth method needs it (group rule) | **yes** |
| `client.scope` | `{prefix}SCOPE` | string | — | optional | no |
| `client.audience` | `{prefix}AUDIENCE` | string | — | optional | no |
| `client.redirect_uri` | `{prefix}REDIRECT_URI` | URL | — | optional; required by flows that use it (group rule) | no |
| `client.post_login_redirect` | `{prefix}POST_LOGIN_REDIRECT` | URL | — | optional | no |
| `client.post_logout_redirect` | `{prefix}POST_LOGOUT_REDIRECT` | URL | — | optional | no |
| `test.*` (registry section) | `TEST_DISCO_ADDRESS`, `TEST_CLIENT_ID`, `TEST_CLIENT_SECRET` (secret), `TEST_SCOPE`, `TEST_REQUIRE_LIVE`, `TEST_REQUIRE_HTTPS`, … | various | — | test-tier keys; same machinery, marked `tier: test`, excluded from the library's default client validation | per-key |

The client group's default env prefix is `OIDC_` (the `fastapi-identity-model` precedent); `EnvSource` takes an optional prefix parameter for the client-group keys only. Exact default values marked "(current default)" are transcribed from code when the spec contract is authored — the spec records what the code does today, not new choices.

**Deliberately NOT in the registry:** `allow_http`/insecure toggles. They remain **code-only** (builder/options flags, `DiscoveryPolicy`) — configuration sources cannot flip security gates (threat-model "downgrade via config"). The registry can never grow a key that weakens a default security posture; that rule is itself normative in `spec/config.md`.

### D4 — Dual validation modes: `legacy` (lenient) and `strict` (fail-closed)

The resolver has exactly two modes, both specified as behavior IDs:

- **`legacy`** — today's semantics, bit-for-bit: per-key garbage → default, missing → default, clamping as inventoried. This is the mode the library's *internal* migrated read-sites use (FR23) and the implicit mode when a consumer doesn't construct a Config. It exists so that internal migration is provably behavior-preserving (NFR1): the legacy semantics become vectored contract instead of accident.
- **`strict`** — the typed `Config` construction mode: missing required key → `CFG-001`; incomplete group → `CFG-002`; unparseable/out-of-domain value → `CFG-003` (no silent defaulting of *invalid* values; absent optional keys still take defaults). Fail closed, atomically: no Config value exists on any error; all errors for a construction are collected and reported together (one boot failure lists every problem — operator-friendly, and deterministic per NFR11).

Group rules (strict mode): the **client group** validates as a unit — e.g. `client.secret` required when the chosen client-auth method requires it; `client.id` without `client.discovery_url` → `CFG-002`. Group rules are enumerated in the spec, not implied.

Error taxonomy (canonical codes, `CFG-NNN` per the existing `PREFIX-NNN` convention):
`CFG-001` missing required key · `CFG-002` incomplete key group · `CFG-003` invalid value · `CFG-004` source failure (a source raised/errored — construction fails closed; sources are not silently skipped). Error objects carry logical key ID(s) + code — never values (FR9).

### D5 — Redaction: a `Secret` type owns it, per language

One mechanism per language, owned by the type system, reused by Config and available to the rest of the library:

- **Rust:** `Secret<T>` newtype; `Debug`/`Display` → `<redacted>` (reuses the existing `REDACTED` constant convention from `token/`); `serde` skip/redact if serialization is derived. Existing hand-written redacting `Debug` impls migrate to it opportunistically (additive, not required for v1).
- **Go:** `type Secret string` implementing `String()`, `GoString()`, `Format()`, `MarshalJSON()` → `<redacted>`; `Value()` accessor for intentional use. This is Go's **first** redaction guarantee (FR20); the config surface uses it everywhere a secret-classified key lands, and `token`'s `clientSecret` field adopts it.
- **Python:** reuse the existing `_secret_fields` `__repr__` pattern from `core/models.py`, formalized: Config dataclass declares `_secret_fields`; plus a `Secret` wrapper only if needed for non-dataclass surfaces. `logging_utils.redact_sensitive` remains for free-text paths.
- **TS:** `Secret` class with `toString()`/`toJSON()`/`[util.inspect.custom]`/`[Symbol.for('nodejs.util.inspect.custom')]` → `<redacted>`; `.expose()` accessor.

Redaction placeholder is normatively `<redacted>` cross-language (vectors assert placeholder presence + secret absence, FR29); Python's existing `[REDACTED]`/`***REDACTED***` strings remain on legacy free-text paths (untouched) — the *Config type's* output uses the canonical placeholder.

### D6 — Spec contract artifacts & format

- **`spec/config.md`** — the normative prose contract: registry table (D3), precedence (D2), modes + error taxonomy (D4), redaction classification + placeholder (D5), source trust boundary (NFR7), and the "no security-weakening keys" rule. Every normative statement carries a behavior ID.
- **`spec/conformance/config.json`** — vectors in the existing structure `{ capability: "configuration", spec, spec_url, required_fields, tests: [{ id: "CFG-1xx…", title, given, when, then, fixture, references }] }`. Vector families: strict fail-closed (missing/partial-group/invalid), legacy-mode equivalence (garbage→default, clamps, `0`→unbounded, alias, SSL chain), precedence/composition (override ⊳ source order ⊳ env ⊳ default), redaction (placeholder present, secret absent in rendered + serialized output), source behavior (over-returning source, erroring source → CFG-004).
- **`spec/test-fixtures/config/*.json`** — each fixture = `{ sources: [{name, values: {...}}], overrides: {...}, mode: "strict"|"legacy", expect: { config: {...} } | { error: { code, keys } } | { rendered_excludes: [...], rendered_includes: ["<redacted>"] } }`.
- **`spec/capabilities.md`** — new row, Core tier: `| Core | Configuration | — (project contract) | config.json | … per-language status … |`. Node column reports honestly per the existing status legend (no runner → `in-progress`/`planned`, never `implemented`).

### D7 — Module placement & integration seams

| Language | Config module | Integration seam |
|---|---|---|
| Rust | `rust/src/config/` (`mod.rs` = `Config` + `ConfigBuilder`; `source.rs` = `ConfigSource` trait + `EnvSource`; absorbs `src/env.rs`) | each existing `*Builder` gains `.from_config(&Config)` constructor; all current builder methods act as explicit overrides (D2 tier 1) |
| Go | `go/pkg/config/` (`Config`, `Source` interface, `EnvSource`, `Secret`) | each package gains `WithConfig(*config.Config)` option; existing `WithXxx` options are explicit overrides |
| Python | `py/src/py_identity_model/core/config.py` (`Config` dataclass, `ConfigSource` Protocol, `EnvSource`); re-exported at package root | sync/aio client constructors + module functions accept optional `config=`; `fastapi-identity-model`'s `OIDCSettings.from_env` becomes a thin veneer over `Config` (public API unchanged, FR24) |
| TS | `node/src/config/` — first real module of `@identity-model/node` (`config.ts`, `source.ts`, `secret.ts`) | future modules consume it; package exports it from day one |

### D8 — The machinery is public API; the registry is the library's

`ConfigSource`, the resolver (precedence + modes), and `Secret` are exported primitives. Consumers with their own key groups (identity-stack's `DESCOPE_*`/`ORY_*` — app keys, not library keys) build their own typed config on the same primitives instead of reinventing resolution/redaction. This is what makes identity-stack a true reference consumer rather than a special case.

### D9 — Lint gate: Semgrep rules per language (mechanical, in existing lint CI)

One rule per language, scoped precisely (allowed: the `EnvSource` file(s), tests, examples, tools):
Python `os.getenv|os.environ` · Rust `std::env::var` · Go `os.Getenv|os.LookupEnv` · TS `process.env|import.meta.env`. Lands in the existing lint workflows in the phase that migrates each language (PRD Phase 3); rule files live with each language's lint config. Semgrep chosen over bespoke greps per the mechanical-gates rule (path-scoped, AST-aware, already in the security toolchain).

### identity-stack consumer architecture (Phase 4 target state)

- **Backend:** new `app/config.py` defining an app-level typed config (Descope group: project id, management key, base URL, webhook/flow-sync secrets as `Secret`; Ory group: issuer URL + audience + require-audience with the existing group rule "audience required when issuer set unless opted out"; plus deployment-mode/infra keys) built on py-identity-model's primitives in strict mode, constructed once in the FastAPI lifespan, injected into `configure_middleware`, routers (logout handler loses its request-time `os.environ[...]`), and `build_provider_configs` (which becomes a pure function of the typed config). Startup failure = collected CFG errors, process exits non-zero.
- **Frontend:** `frontend/src/config.ts` — a contract-conformant strict-mode validation of `import.meta.env` at app init (implemented inline while `@identity-model/node` is unpublished; swap to the package later is optional). `main.tsx` consumes the validated object; on failure it renders the explicit "no identity provider configured" screen instead of mounting the auth provider. `vite-env.d.ts` types updated alongside.

### Decision Impact Analysis

**Implementation sequence dependency:** D6 (spec artifacts) encodes D2/D3/D4/D5 → must merge first (PRD Phase 1). D7 implementations depend only on the spec. D9 lands per language after its migration. Phase-4 consumer work depends on the Python implementation (backend) and the spec contract alone (frontend).
**Cross-component:** D4's `legacy` mode is what makes FR23's internal migration provable; D8 is what makes Phase 4 clean; D1+D2 together define the entire testable semantics of resolution — every vector family in D6 falls out of them.

## Implementation Patterns & Consistency Rules

Rules that keep four independent implementations (and the agents writing them) from diverging. Everything here is normative for implementation stories.

### Cross-Language Naming (fixed, non-negotiable)

| Concept | Rust | Go | Python | TS |
|---|---|---|---|---|
| Config value | `Config` | `config.Config` | `Config` | `Config` |
| Source abstraction | `ConfigSource` (trait) | `config.Source` (interface) | `ConfigSource` (Protocol) | `ConfigSource` (interface) |
| Env source | `EnvSource` | `config.EnvSource` | `EnvSource` | `EnvSource` |
| Secret wrapper | `Secret<T>` | `config.Secret` | `_secret_fields` pattern (+`Secret` if needed) | `Secret` |
| Source method | `resolve(&self, keys) -> …` | `Resolve(keys) (map, error)` | `resolve(keys) -> Mapping` | `resolve(keys): Record<…>` |
| Default construction | `Config::from_env()` | `config.FromEnv()` | `Config.from_env()` | `configFromEnv()` |
| Client seam | `Builder::from_config(&Config)` | `WithConfig(cfg)` | `config=` kwarg | ctor option `{ config }` |

Logical key IDs are exactly the D3 dotted names; env names exactly the D3 env column. No language invents additional aliases, prefixes, or key spellings.

### ID Allocation (prevents collision between error codes and vector IDs)

- **Error codes:** `CFG-001`–`CFG-099` (taxonomy in D4; new codes append, never renumber).
- **Conformance test/vector IDs:** `CFG-101`+ (strict family 1xx, legacy-equivalence 2xx, precedence 3xx, redaction 4xx, source-behavior 5xx).

### Cross-Language Value Parsing (strict mode; legacy mode preserves each key's inventoried behavior verbatim)

- **bool:** case-insensitive `true|false|1|0` accepted; anything else → `CFG-003`.
- **int/float:** decimal only; leading/trailing whitespace trimmed; anything else → `CFG-003`; range/clamp rules per registry row.
- **URL:** must parse absolute with scheme; https-gating per the existing policy of the consuming component (never weakened via config, per D3).
- **Empty string from a source = key present with invalid value** (→ `CFG-003` for typed keys; it is NOT "absent"). Absence = source did not return the key. This kills the `getenv(..., "")` ambiguity class at the contract level.
- **Whitespace-only = empty.**

### Error Message Format

`<code>: <human description> (<logical key(s)>)` — e.g. `CFG-002: incomplete key group 'client' — missing: client.secret`. Rules: logical key IDs (not env names) in the message body; env name may appear as remediation hint (`set OIDC_CLIENT_SECRET`); **never any configured value**; all construction errors collected and reported in one failure, ordered by registry order.

### Redaction Rules

- Canonical placeholder: exactly `<redacted>` (all four languages, all Config-surface output).
- Secret access is always an explicit method/accessor (`.expose()`, `.Value()`, direct field access in Rust via `expose_secret()`-style method) — never implicit coercion to string.
- A secret-classified key's value never participates in: error messages, `Debug`/`repr`/`String()`/`toString`, serialization, logging helpers, or vector `expect` fixtures (fixtures assert on placeholder).

### Structure & Test Placement (per existing repo conventions — do not invent)

- Config vector runners extend each language's existing spec-conformance harness (`py` unit `test_spec_conformance.py` pattern, `go/internal/conformance`, `rust/tests/spec_conformance.rs`); fixtures load from `spec/test-fixtures/config/`.
- Unit tests live where each language already puts them; no new test topology.
- Each implementation story = spec-vector-green before merge; the vector is written (Phase 1) before the implementation story starts.

### Process Patterns

- **Adding a config key (steady state):** edit `spec/config.md` registry + add vector(s) → implement in each in-scope language → capabilities row status updates. A PR adding a typed key without a registry row is rejected (review rule until the lint/coverage gates can catch it).
- **Migrating a legacy read-site:** confirm the key's legacy behavior ID exists (add if missing) → replace the read with a resolver call in `legacy` mode → existing tests must pass untouched.
- **Docs:** user-facing docs describe the config surface and how to use it — no migration narration, no internal process references (repo docs rule).
- **Git:** per-repo conventions as they stand (conventional commits in the monorepo; PIM release-routing rules apply — config work in `py/` is release-bearing, so PR titles/scopes follow the existing routing conventions).

### Anti-Patterns (reject in review)

- A source doing validation, typing, defaulting, or clamping (that is the resolver's job — D1).
- Per-call/per-request resolver invocation in any hot path (construction-only — NFR9).
- A language-private config knob (key without a registry row).
- Redaction via call-site string munging instead of the Secret type.
- Strict-mode behavior differences "because idiomatic" — idiom applies to surface shape, never to semantics.

## Project Structure & Boundaries

Brownfield: only the delta is shown. `[M]` = modified, everything else is new.

### identity-model monorepo

```
spec/
├── config.md                          # normative contract (D2–D5): registry, precedence, modes, errors, redaction
├── capabilities.md                [M] # + Configuration row (Core tier)
├── conformance/
│   └── config.json                    # CFG-1xx…5xx vectors
└── test-fixtures/
    └── config/
        ├── strict-missing-required.json, strict-partial-group.json, strict-invalid-value.json
        ├── legacy-garbage-default.json, legacy-clamp-ttl.json, legacy-zero-unbounded.json, legacy-alias-retry.json, legacy-ssl-chain.json
        ├── precedence-override-wins.json, precedence-source-order.json, precedence-env-last.json, precedence-default-fallback.json
        ├── redaction-debug.json, redaction-serialized.json, redaction-error-message.json
        └── source-over-return.json, source-error-failclosed.json

py/src/py_identity_model/
├── core/config.py                     # Config, ConfigSource Protocol, EnvSource, resolver (legacy+strict)
├── __init__.py                    [M] # re-exports
├── core/{http_utils,jwks_cache,ssl_config}.py [M]  # Phase 3: reads route through resolver (legacy mode)
├── sync/… aio/…                   [M] # optional config= seam
py/packages/fastapi-identity-model/fastapi_identity_model/config.py [M]  # OIDCSettings veneer over Config
py/src/tests/unit/test_config.py       # + conformance runner extension in test_spec_conformance.py [M]

go/pkg/config/
├── config.go, source.go, env.go, secret.go, errors.go
go/pkg/{discovery,jwks,token,userinfo,…}/options.go [M]  # WithConfig; cache-cap reads via resolver
go/pkg/token/{options,token}.go    [M] # clientSecret → config.Secret
go/internal/conformance/           [M] # config vector runner

rust/src/config/
├── mod.rs, source.rs, env.rs (absorbs src/env.rs), secret.rs, error.rs
rust/src/{discovery,jwks,token,userinfo}/… [M]  # from_config ctors; cap reads via resolver
rust/tests/spec_conformance.rs     [M] # config vectors

node/src/config/
├── config.ts, source.ts, env.ts, secret.ts, errors.ts, index.ts
node/package.json                  [M] # exports; still private until package ships

tools/lint (per-language Semgrep rules)  # no-ad-hoc-env-reads, wired into existing lint CI [M]
```

### identity-stack

```
backend/app/config.py                  # app-level typed config (Descope/Ory/infra groups) on PIM primitives, strict mode
backend/app/main.py                [M] # lifespan constructs config; os.environ[...] reads removed
backend/app/middleware/factory.py  [M] # takes config object, not os.getenv
backend/app/routers/{auth,protected,internal}.py [M]  # consume injected config; no request/import-time env reads
backend/tests/unit/test_config.py      # startup fail-closed + no-request-time-read regression tests
frontend/src/config.ts                 # strict validation of import.meta.env at init
frontend/src/main.tsx              [M] # consumes validated config; renders explicit failure screen when unconfigured
frontend/src/vite-env.d.ts         [M]
frontend/src/__tests__/config.test.ts  # unconfigured-env fail-closed unit test
e2e (Playwright)                   [M] # one case: unconfigured env → explicit error, no ".../undefined"
```

### Boundaries & Data Flow

- **Source boundary:** sources produce raw strings only (D1). Everything typed lives inside the resolver/Config.
- **Mode boundary:** `legacy` mode is internal-only surface area (used by migrated read-sites); `strict` is the only mode exposed on the public typed constructors. Consumers never select legacy.
- **Repo boundary:** the library owns the registry + machinery; identity-stack owns its app keys built on the machinery (D8). No app key leaks into the library registry.
- **Flow:** sources →(raw snapshot, precedence merge)→ resolver →(mode rules)→ typed Config │ error → clients/builders (explicit overrides applied) → existing runtime paths (unchanged).

### FR → Structure Mapping

| FR group | Lands in |
|---|---|
| FR1–6 (contract) | `spec/config.md`, `spec/conformance/config.json`, fixtures, `capabilities.md` |
| FR7–17 (Config/sources) | `{py core,go pkg,rust src,node src}/config/` |
| FR18–20 (redaction) | `secret.{rs,go,ts}` + Python `_secret_fields`; Go `token` adoption |
| FR21–25 (integration) | `[M]` seams above; `fastapi_identity_model/config.py` |
| FR26–29 (enforcement) | conformance runners `[M]`, Semgrep rules, CI workflows `[M]` |
| FR30–34 (identity-stack) | `backend/app/config.py`, `frontend/src/config.ts` + `[M]` consumers + regression tests |
| FR35–36 (docs/examples) | each language's `examples/` + docs sourced from `spec/config.md` |

## Architecture Validation Results

### Requirements Coverage

All 36 FRs map to decisions (see FR → Structure table): contract → D3/D6; construction/validation → D2/D4/D7; sources → D1/D2/D8; redaction → D5; integration → D7; enforcement → D6/D9; identity-stack → consumer architecture; docs → structure mapping. All 15 NFRs are addressed: compat via the legacy mode + additive seams (NFR1–4), security via source trust boundary + Secret types + registry rule against security-weakening keys (NFR5–7), performance via construction-only resolution (NFR9–10), determinism via snapshot sources + collected-error reporting (NFR11–12), deps via stdlib-only implementations (NFR8, NFR13).

### Issues Found During Validation (and their resolutions — both are now normative)

1. **Read-timing preservation in legacy mode.** Some library env reads today happen at call time (e.g. `http_utils` reads on use), not at client construction. If Phase-3 migration hoisted them to construction, a mid-process env change would behave differently — a real (if obscure) behavior change violating NFR1. **Resolution:** legacy-mode resolution is invoked *at the same call sites where the read happens today* — routing changes, timing does not. Hoisting to construction happens only on the typed (strict) path, where it is the documented contract. Vector family CFG-2xx tests semantics, not timing; timing preservation is enforced by the untouched existing test suites.
2. **Coordination with parity-plan P1.** The registry defines keys Go/Rust do not read yet (`HTTP_RETRY_*`, `HTTP_TIMEOUT`, SSL/CA keys — parity plan P1 items H3/I2/I3). **Resolution:** those registry rows are marked per-language `n/a` in vector coverage until the parity work lands — and when it lands, it MUST land as Config-surface consumption (never new ad-hoc reads; the lint gate enforces this ordering automatically once active). The Config API is thereby the delivery vehicle for P1's env surface, not a competitor to it.

### Coherence & Readiness

- Decisions are mutually consistent: D1 snapshot + D2 precedence fully determine resolution; D4 modes separate the compat path from the typed path; D5 redaction is orthogonal and type-owned; no decision conflicts with the existing builder/options idioms it extends.
- Implementation-agent readiness: naming tables, ID allocation, parsing rules, error formats, fixture schema, and per-language file placement are all pinned — the known cross-agent divergence points for this initiative are closed.
- Confidence: **high**. The single highest-risk area remains behavioral equivalence of the legacy mode, which is exactly what the CFG-2xx vector family + untouched suites are for.

### Implementation Handoff

- First implementation story: author `spec/config.md` + `config.json` + fixtures (Phase 1) — everything else depends on it.
- Agents follow this document plus the PRD; on any conflict, `spec/config.md` (once merged) is normative over both.
