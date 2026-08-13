# identity-model — Priorities Reconciliation & Sequenced Plan (2026-08-12)

**Session:** priorities reconciliation + planning (`ralph-prompts/identity-model-priorities-planning.md`), run in-session (not a ralph loop).
**Scope:** the Go + Rust `identity-model` monorepo (`jamescrowley321/identity-model`). Python (`py-identity-model` / "PIM") is the OIDF-certified reference. Node is planned, not yet started.
**Method:** every "current state" claim below was verified against merged PRs, live `gh`, and source on `origin/main` (HEAD `f9bd779`) — not the drift-prone task queue. Provenance in the appendix.

---

## 1. Verified current state

### Capability inventory (source-verified)

| Tier | Capability | Go (`go/pkg`) | Rust (`rust/src`) |
|------|-----------|:---:|:---:|
| Core | OIDC Discovery | ✅ | ✅ |
| Core | JWKS + key resolution | ✅ | ✅ |
| Core | JWT validation | ✅ | ✅ |
| Core | Token: client-credentials | ✅ | ✅ |
| Core | Token: auth-code + PKCE | ✅ | ✅ |
| Core | Token: confidential (client_secret basic/post) | ✅ | ✅ |
| Core | UserInfo (+ opt-in sub check) | ✅ | ✅ |
| Extended | Token Introspection (RFC 7662) | ✅ #25 | ❌ **absent** |
| Extended | Token Revocation (RFC 7009) | ✅ #26 | ❌ **absent** |
| Extended | Token Exchange (RFC 8693) | ✅ #27 | ❌ **absent** |
| Extended | DPoP (RFC 9449) | ✅ #28 | ❌ **absent** |

**Go = full Core + Extended. Rust = Core-only.** The four missing Rust modules (introspection, revocation, token-exchange, DPoP) are the single biggest, highest-value capability gap.

**Toolchains:** Go `1.26.0` (`go-jose/v4`); Rust `edition 2024`, `rust-version 1.96`, `jsonwebtoken 11` (rust_crypto), `reqwest` rustls-only, `tokio`, `thiserror 2`.

### Conformance — two mechanisms coexist on `main`

- **(a) JSON-vector runner** — `go/internal/conformance/` + `spec/conformance/*.json` (merged as **#36**). Only `validation.json` has executable vectors (12); the other 9 files are **prose contracts only**. Go-only executor.
- **(b) OIDF RP harness** — `conformance/` (K1 **#43** + K2 **#44** merged). `rp-go/` present and passes `oidcc-client-basic-certification-test-plan`. **`rp-rust/` is absent** (the README references it aspirationally). K3–K6 remain.

The OIDF-client suite exercises only the RP login flow (discovery, JWKS/rotation, id_token validation, auth-code/PKCE, form_post, userinfo, logout) — it does **not** cover Extended-tier client behavior.

### GitHub state

- **Open issues (6):** all `learning`-labeled ("do not assign to ralph loops"). Genuinely open: **#9** (Go refresh-token grant), **#8** (Go full-flow example). Shipped-but-still-open (close candidates, left untouched this session per the learning-label rule): **#10** introspection, **#11** revocation, **#12** rust PKCE, **#13** rust discovery example.
- **Open PRs (3):** all Dependabot, all CI-green — #49 (nanoid), #50 (base64), #51 (gh-actions). No feature PRs open.
- `#22/#23/#24` (Rust hardening) confirmed **closed** (shipped in #37).

---

## 2. PIM parity matrix — the target

PIM (`py-identity-model` 3.8.5 core + `fastapi-identity-model` 0.2.0) is much broader than Go/Rust. Full capability × language:

| Capability | PIM | Go | Rust |
|-----------|:---:|:---:|:---:|
| Discovery / JWKS / JWT / UserInfo | ✅ | ✅ | ✅ |
| Client-credentials / auth-code+PKCE / confidential | ✅ | ✅ | ✅ |
| Refresh grant | ✅ | ⚠️ issue #9 | ⚠️ |
| Introspection (RFC 7662) | ✅ | ✅ | ❌ |
| Revocation (RFC 7009) | ✅ | ✅ | ❌ |
| Token Exchange (RFC 8693) | ✅ | ✅ | ❌ |
| DPoP (RFC 9449) | ✅ | ✅ | ❌ |
| Device Authorization (RFC 8628) | ✅ | ❌ | ❌ |
| PAR (RFC 9126) | ✅ | ❌ | ❌ |
| JAR (RFC 9101) | ✅ | ❌ | ❌ |
| JARM | ✅ | ❌ | ❌ |
| private_key_jwt (RFC 7523) | ✅ | ❌ | ❌ |
| Dynamic Client Registration (RFC 7591/7592) | ✅ | ❌ | ❌ |
| RP-initiated + Back-channel logout | ✅ | ❌ | ❌ |
| mTLS client auth + cert-bound tokens (RFC 8705) | ✅ | ❌ | ❌ |
| FAPI 2.0 validators | ✅ | ❌ | ❌ |
| ClaimsPrincipal / identity model | ✅ | ❌ | ❌ |

> Not in PIM either (explicitly out of scope): JWE decryption of ID-token/UserInfo/Request-Object, CIBA, front-channel/session-management logout, SAML, DNS-rebinding SSRF.

---

## 3. Normative security-behavior audit (source-verified)

For each behavior PIM enforces, whether Go/Rust already enforce it:

| Behavior | PIM | Go | Rust |
|----------|:---:|:---:|:---:|
| `alg:none` rejection | ✅ core | ✅ | ✅ |
| Algorithm-confusion defence (`kty`↔`alg`, algorithm from key not header) | ✅ core | ✅ | ✅ |
| **RFC 9207 authorization-response `iss` validation** | ✅ core | ❌ **absent** | ❌ **absent** |
| **Discovery endpoint-authority binding** (anti-mix-up/SSRF) | ✅ core | ❌ **absent** | ❌ **absent** |
| HTTPS-required on discovery | ✅ | ✅ | ✅ |
| Automatic loopback (127.0.0.1/::1) HTTP exception | ✅ | ⚠️ opt-in flag | ⚠️ opt-in flag |
| UserInfo `sub` consistency | ✅ | ✅ opt-in | ✅ opt-in |
| Constant-time CSRF `state` compare | ✅ core | ❌ n/a¹ | ❌ n/a¹ |
| Non-disableable verify options | ✅ core | ✅² | ✅² |
| JWKS/discovery cache **max-entries bound** | ✅ LRU-64 | ❌ **absent** | ❌ **absent** |
| JWKS cache single-flight dedup | ✅ | ✅ | ❌ **absent** |

¹ Neither Go nor Rust has an authorization-request builder or callback/response parser at all — they only build request URLs (PKCE helpers). So `state`/`iss` validation has no home surface *yet*; adding callback validation is the work item.
² Enforced idiomatically: Go returns `error`, Rust returns `Result` — the allowlist is derived, not pass-through-disableable.

**Four shipped-code gaps affect BOTH languages and are security-relevant:**
1. **RFC 9207 `iss` validation** (+ callback `state` validation helper) — needs a callback-validation surface neither lib has.
2. **Discovery endpoint-authority binding** — advertised endpoints must share issuer authority (block mix-up/SSRF), with the same exemptions PIM uses (mtls aliases, `additional_endpoint_base_addresses`) and IP-literal hardening.
3. **JWKS/discovery cache max-entries LRU bound** — today all 4 caches are TTL-only maps that grow one entry per distinct URI/issuer with no ceiling → unbounded-memory DoS. PIM bounds to 64 LRU.
4. **Rust JWKS single-flight dedup** — Rust re-fetches on concurrent misses; Go already dedups.

Per the session mandate ("prioritize the security-normative behaviors first"), these jump the queue ahead of new capabilities — see the plan (§7).

---

## 4. Architecture decision (ADR) — keep the flat idiomatic shape

**Question:** adopt PIM's `core/` + `sync/` + `aio/` three-layer split and its runtime `is_successful`-guarded `X(XRequest)→XResponse` response contract, or keep Go/Rust flat and idiomatic?

**Decision: keep the flat idiomatic shape. Adopt PIM's *behavioral* parity (same normative checks, same capability set, same provider quirks), not its *structural* layering.**

**Rationale:**
- PIM's `sync/` + `aio/` split exists because Python has two disjoint runtimes. Go has one concurrency model (goroutines) and Rust is async-native (tokio) — a sync/async split would be un-idiomatic churn with no benefit.
- PIM's `_GuardedResponseMixin` (`__getattribute__` raising on wrong-state field access) is a *runtime* re-creation of what Go's `(T, error)` and Rust's `Result<T, E>` already give at the type level — Rust's is compile-time-enforced, strictly stronger. Re-expressing it as a guarded struct would be weaker and non-idiomatic.
- A `core/`-vs-transport split has marginal value (testability of pure logic) but is not worth a repo-wide refactor of shipped code; capture it as a per-module option, not a mandate.

Captured in `epic-20-pim-parity.md`. Parity is measured by the §2 matrix + §3 audit, not by mirroring Python's file layout.

---

## 5. The six priorities — scoped

| # | Priority | State | Home | Size |
|---|----------|-------|------|------|
| 1 | **Conformance** — finish OIDF harness (K3 Rust RP, K4 config+form-post, K5 CI+evidence, K6 integration parity) | K1/K2 merged; K3–K6 open; prompt exists (stale markers fixed this session) | `identity-model-conformance-harness.md`; tracking added to `epic-6`/task-queue | Loop (large) |
| 2 | **Match PIM** — parity matrix + per-language gap decomposition + ADR | matrix authored (§2/§3); ADR decided (§4) | **new `epic-20-pim-parity.md`**; Rust-extended decomposed into `epic-5` 5.1–5.4-rust | Loop (Rust ext.) + in-session (hardening) |
| 3 | **Cross-platform serializer** — spec + per-language serializers + round-trip vectors | genuine gap, no epic before now | **new `epic-21-cross-platform-serializer.md`** | Loop/medium |
| 4 | **Performance** — benchmark harness + cache hardening | cache max-entries gap pulled into §7 step 1; benchmark harness = epic-10 | `epic-10-benchmarks.md` (refreshed) | In-session (cache) + medium (benches) |
| 5 | **Integration harness** — provider-matrix parity, Rust→Go | overlaps conformance **K6** | folded into priority 1 / K6 | (in K6) |
| 6 | **Framework middlewares** — Go/Rust mirror of `fastapi-identity-model` | genuine gap, no epic before now | **new `epic-22-framework-middlewares.md`** | Loop (large), gated on §7 |

Priority 5 is not a separate workstream — it is conformance step K6. Priority 4's security-relevant slice (cache bound) is pulled forward into the hardening sweep; the benchmark dashboard is deferred.

---

## 6. Two-conformance-mechanisms resolution

**Keep both, with distinct jobs:**
- **JSON-vector runner (#36)** → becomes the fast in-CI **cross-language parity/serializer check** (its real home is `epic-21` — the serializer round-trip vectors extend the same `spec/conformance/*.json` schema it already executes for `validation.json`). Do **not** retire it.
- **OIDF RP harness (`conformance/`)** → the **certification track** (K3–K6). This is what earns the OIDF RP mark, mirroring PIM.

This supersedes the older "recommend closing `feat/conformance-runner-jwt` unmerged" note in the conformance-harness prompt — that branch already **merged** (#36), so the runner stays and is repurposed rather than removed.

---

## 7. Sequenced execution plan (one workstream per repo at a time)

Ordered by: security-normative first → biggest capability gap → validation → breadth. Each item tagged **[in-session]** or **[loop]** (loops only for large multi-task epics).

1. **Parity-hardening sweep** — **[in-session]**, security, highest priority.
   Close the four shipped-code gaps that hit both languages (§3): (1) JWKS/discovery cache max-entries LRU bound + Rust JWKS single-flight; (2) discovery endpoint-authority binding (with PIM's exemptions + IP hardening); (3) RFC 9207 `iss` + callback `state` validation helpers (adds the callback surface); done as a short stack of small in-session PRs across `go/pkg` + `rust/src`. Hardening is **opt-in / backward-compatible** where a default-on check could break a legitimate integration (endpoint-authority exemptions, loopback).
2. **Rust Extended-tier parity** — **[loop]**, biggest capability gap. `rust/src/{introspection,revocation,token-exchange,dpop}` mirroring `go/pkg/*`, base-chained RE5.1→RE5.4. Prompt authored this session: `identity-model-rust-extended.md`. **This is the recommended next big loop and the most direct answer to "keep building the Rust version."**
3. **Conformance K3–K6** — **[loop]**, validation. Rust RP harness (K3) → config+form-post plans both langs (K4) → CI + hosted evidence (K5) → integration-matrix parity incl. Rust→Go provider parity (K6). Prompt exists; K1/K2 markers fixed this session. Independent of step 2 (OIDF suite only exercises the core RP flow) — can precede or follow it.
4. **Go advanced / PIM-only capabilities** — **[loop]**, breadth. Security-relevant first: private_key_jwt (7523), PAR (9126), then device-auth (8628), JAR (9101), dynamic-reg (7591/7592), logout, FAPI2 validators, mTLS (8705), ClaimsPrincipal. Tracked in `epic-6` / `epic-20`.
5. **Cross-platform serializer** (`epic-21`) — **[loop/medium]**, cross-cutting quality.
6. **Framework middlewares** (`epic-22`) — **[loop]**, product surface. Gated: the RP-login-router stories depend on step 1's callback/`iss` surface; the resource-server middleware can start once the client core is stable.
7. **Performance benchmark harness** (`epic-10`) + **docs/launch** (`epic-6`) — later.

## 8. Recommended next task

**Start with the parity-hardening sweep (step 1), taking the JWKS/discovery cache max-entries LRU bound first** — it is the cleanest, lowest-risk, highest-value single task (a real unbounded-growth DoS gap in shipped public code, present in all four caches), in-session-sized, and touches both `go/pkg` and `rust/src`. Then RFC 9207 callback validation, then endpoint-authority binding.

**Then** launch the **Rust Extended-tier loop** (step 2) as the next big build — it's the biggest capability gap and the most direct "build the Rust version" work. Run it OR conformance K3–K6, never both at once (one workstream per repo).

---

## Appendix — drift reconciled this session

- **Epic front-matter:** `epic-3-core-go` + `epic-4-core-rust` → `done`; `epic-5-extended-tier` → Go-done/Rust-pending (with 5.1–5.4-rust decomposition); status notes added where missing.
- **task-queue.md:** the "Rust Hardening + Extended Tier — PENDING" subsection corrected (hardening #22/#23/#24/#32 shipped; only Rust Extended genuinely open); conformance K-series tracking added (K1/K2 done, K3–K6 open).
- **`identity-model-conformance-harness.md`:** K1/K2 marked done and the "Rust core-only merged" line corrected — **so the loop no longer re-does shipped work if launched** (it would previously have re-ported the merged #43 scaffold).
- **Roadmap:** PRD 6 + Phase-1b Track 3 refreshed to this plan.
- **New epics:** `epic-20-pim-parity`, `epic-21-cross-platform-serializer`, `epic-22-framework-middlewares`.
- **Left untouched (per session rules):** the six `learning`-labeled issues #8–#13 (owner triages/closes #10–#13 which are shipped).

**Recon provenance:** four parallel read-only agents on 2026-08-12 verified GitHub state (issues/PRs/labels), the PIM parity target (capabilities/architecture/normative behaviors/cache/middleware with file:line cites), Go/Rust code reality (capability inventory + normative audit from source), and planning-artifact drift (roadmap/task-queue/epics/prompts/PRs). Repo `origin/main` HEAD `f9bd779`.
