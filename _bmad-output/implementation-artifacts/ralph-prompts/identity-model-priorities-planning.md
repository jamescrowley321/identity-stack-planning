# identity-model — Priorities Reconciliation & Planning Session

You are running a **planning + reconciliation session** for the `identity-model` multi-language OIDC/OAuth2 client library (Go + Rust today; Python/`py-identity-model` is the reference). This is NOT an implementation loop — you produce a reconciled backlog and a sequenced plan, and you MAY start the single highest-priority concrete task at the end, but the deliverable is planning, not a feature.

Run this from a fresh session. Do repo work in a dedicated `/tmp` worktree, never the primary checkout. Planning artifacts land in `identity-stack-planning` (a BMAD repo — use the `identity-stack-planning:bmad-*` skills for epics/stories/PRD/architecture where they fit). All code/issue changes go through feature branches + PRs; never push `main`; no auto-merge.

## Goal

The owner wants to pause feature execution and **reconcile the planning artifacts and GitHub issues with reality**, then define and sequence work across six priorities:

1. **Conformance** — finish/solidify the OIDF conformance harness.
2. **Match py-identity-model (PIM)** — bring Go/Rust to architectural + capability + behavioral parity with the reference.
3. **Cross-platform serializer** — a language-neutral (de)serialization spec + per-language impls.
4. **Performance** — benchmarks + hot-path (cache/JWT) optimization, cross-language.
5. **Integration harness** — provider-matrix parity + a shared integration harness.
6. **Framework middlewares** — Go/Rust middleware mirroring PIM's `fastapi-identity-model`.

Produce: an updated roadmap, reconciled/created epics + GitHub issues, and a prioritized, sequenced execution plan (which items get ralph loops vs in-session PRs).

## Repos & sources of truth

- `identity-model`: `~/repos/auth/identity-model` (GitHub `jamescrowley321/identity-model`).
- `py-identity-model` (PIM, the reference): `~/repos/auth/py-identity-model` (GitHub `jamescrowley321/py-identity-model`).
- Planning (BMAD): `~/repos/auth/identity-stack-planning` — PRD 6 epics in `_bmad-output/planning-artifacts/epics/epic-*.md`, `docs/roadmap.md`, ralph prompts in `_bmad-output/implementation-artifacts/ralph-prompts/`.

## Reconciled current state (verify with fresh reads; correct anything stale)

**identity-model — merged reality (as of 2026-08-02):**
- **Go**: Core (discovery, jwks, jwt validation, token: client-credentials + auth-code + PKCE + **confidential auth-code via `WithClientSecret`** + RFC 8693 exchange, userinfo) **+ Extended** (introspection, revocation, DPoP). Package caches: `jwks`/`discovery` global TTL caches with singleflight + refresh cooldown + `ClearCache()`.
- **Rust**: Core only (discovery, jwks, jwt, token, userinfo) **+ hardening** (secret redaction, https→http redirect-downgrade defence, `azp`/clock-skew, jsonwebtoken 10 `rust_crypto`). No Extended tier.
- **Toolchains**: Go 1.26, Rust MSRV 1.96, edition 2024.
- **Conformance — TWO mechanisms coexist**: (a) the cross-language **JSON-vector** runner (`spec/conformance/*.json` + `go/internal/conformance/`, seed merged as #36 — only JWT validation is executable); (b) the **OIDF RP harness** (`conformance/` + `conformance/rp-go/`) driving the real OpenID Foundation suite — **K1 merged (#43), K2 merged/green (#44): `oidcc-client-basic-certification-test-plan` passes 13/14 + 1 expected skip against the Go RP.** Remaining harness steps K3–K6 (below). The OIDF approach was chosen as the go-forward conformance model ("match PIM") but the vector runner still sits on `main`.
- **Open GH issues** (verify with `gh issue list --repo jamescrowley321/identity-model --state open`): only 8, and mostly noise. **#23 (`azp`) and #24 (secret redaction) are STALE-OPEN — both shipped in PR #37; close them with a commit reference.** `#8–#13` are intentionally-retained **`learning`-labelled** starter tasks (they overlap already-shipped capabilities like `go/pkg/introspection`, `rust/src/token/pkce.rs`) — the label says "do not assign to ralph loops", so do NOT churn/close them without checking the label. There are **no** issues tracking priorities 3/4/5/6 or the Rust-extended parity work — that's the point of this session.
- **Open dependabot**: **#42** (cargo group, the deferred breaking `jsonwebtoken 10→11` + `base64 0.22→0.23`; #40 was its superseded predecessor).
- **Prepared-but-superseded**: planning **PR #56** carries the `identity-model-conformance-harness.md` K1–K6 ralph prompt; K1/K2 were done **in-session** (PRs #43/#44) instead of via that loop, so #56 needs reconciling (merge the doc as the K3–K6 tracking, or fold into this plan). The owner prefers in-session PRs over ralph loops for well-scoped work; reserve loops for large epics.
- **STALE LOCAL CHECKOUT — fix first.** `~/repos/auth/identity-model` `main` runs several commits behind `origin/main`; the merged `conformance/` scaffold (#43) is absent from the local tree. `git -C ~/repos/auth/identity-model fetch origin && git pull --ff-only` before reading anything, and treat `origin/main` (or a fresh worktree off it) as truth.

**PIM (the reference) — the parity target:**
- **Three-layer architecture**: `core/` (protocol-agnostic pure logic + all data models, no I/O) → thin `sync/` and `aio/` wrappers over one shared `core`. `identity-model`'s Go/Rust are flatter (`pkg/*` / `src/*`); assess whether a `core`-vs-transport split is worth adopting.
- **Request→Response + `is_successful` guarded contract**: every op is `X(XRequest) -> XResponse` where the response guards success/error field access. The natural Go/Rust expression is a `Result`/tagged-union — evaluate adopting this as the shared API shape.
- **Capability set — PIM is much broader than Go/Rust today.** PIM has (beyond what Go/Rust have): device authorization (RFC 8628), PAR (RFC 9126), JAR (RFC 9101), `private_key_jwt` client auth (RFC 7523), dynamic client registration (RFC 7591/7592), back-channel **and** RP-initiated logout, FAPI 2.0 validators, RFC 9207 authorization-response `iss` validation, and a `ClaimsPrincipal`/identity model. Go additionally lacks these; Rust lacks all of Extended + these.
- **Normative behaviors to audit Go/Rust against** (PIM source-anchored): algorithm-confusion defence via JWK `kty`↔`alg` mapping (algorithms derived from the JWK, never the header) + unconditional `alg:none` rejection; security options that **cannot** be disabled via pass-through; RFC 9207 `iss` validation; constant-time CSRF `state`; UserInfo `sub`-consistency (§5.3.4); back-channel logout token rules; **discovery endpoint-authority binding** (advertised endpoints must share the issuer authority — anti-mix-up/SSRF) with HTTPS-required + loopback exception; FAPI 2.0 profile (PS256/ES256 only, PAR + sender-constraining required); DPoP proof creation. Several are only in PIM's FastAPI RP adapter (issuer-match, nonce, userinfo-sub), not its core — decide where Go/Rust put them.
- **Serializer basis** (for priority 3): the JWK member set (RFC 7517, incl. the `x5t#S256`↔`x5t_s256` mapping), the ~45-field discovery-document schema, and the claim/constant enums (`JwtClaimTypes`, `oidc_constants`, `ConfirmationMethods`) are already language-neutral wire vocabulary. Watch two behaviors: JWK/discovery parsers **drop unknown members**, and token/introspection/userinfo responses are **loose pass-through dicts** (no typed claim model) — so extra claims round-trip but there's no schema to port there.
- **Performance reference**: PIM's JWKS/discovery cache = TTL (from `Cache-Control`/env, clamped) + **FIFO size-bounded** eviction (max entries, anti-unbounded-growth) + per-URI single-flight (striped locks) + kid-miss/signature-failure forced-refresh with a per-URI cooldown, plus JWKS size/key-count/authority hardening; `no-store`/`no-cache` deliberately ignored for JWKS. Go's cache is close (TTL + cooldown + singleflight) but **lacks the FIFO max-entries bound**; Rust's is simpler. `py-identity-model docs/performance.md` is stale — read the code.
- **Middleware reference**: `fastapi-identity-model` is a thin adapter over `aio` core: required non-empty `audience`, reject ID-tokens-presented-as-access-tokens (via `nonce`/`at_hash`/`c_hash`), a deliberate **401/403/503/500 error taxonomy** (401 invalid token, 403 missing claim/scope, 503 transient network, 500 unexpected-no-leak), and principal injection into request state; plus a full RP login router (`/login`,`/callback` GET+POST form_post,`/logout`). PIM plans `flask-identity-model` next.
- **PIM's own live direction** (context for shared roadmap, not to duplicate): FAPI 2.0 hardening epic #476 + cert #475 + RS-side DPoP verification #478; the E2E "token-blaster" harness epic #462; certification track; CLI #333; monorepo #332.

## The six priorities — scope each into epics/issues + a sequenced plan

For **each** priority: (i) confirm current state with fresh reads, (ii) write/refresh the epic(s) in `identity-stack-planning`, (iii) file/adjust GitHub issues in `identity-model` (link them to the epic), (iv) decide loop-vs-in-session and where it sits in the sequence.

1. **Conformance.** Finish the OIDF harness: **K3** Rust RP (`conformance/rp-rust`, mirror `rp-go` over the same runner), **K4** `config-rp` + `form-post-basic-rp` plans (static-client auth flow + `form_post` response mode) for both RPs, **K5** CI (`conformance.yml` Docker suite+RP jobs + a `conformance-hosted.yml` evidence workflow), **K6** integration-matrix parity. **Reconcile the two conformance mechanisms**: recommend whether the JSON-vector runner (`go/internal/conformance`, #36) stays as a fast in-CI parity check or is retired in favor of OIDF, and resolve PR #56.
2. **Match PIM.** Produce a **parity matrix** (capability × {PIM, Go, Rust} + normative-behavior rows from the audit list above) and a parity epic. Decide the architecture question (adopt PIM's `core`/transport split + `Result`-style response contract, or keep the current flat idiomatic shape) — capture the decision as an ADR/architecture doc via `bmad-create-architecture`. Note **the cross-language spec epics already exist** for the advanced capabilities — `epic-0e-spec-dynamic-registration`, `epic-0e-spec-fapi2`, `epic-0e-spec-logout`, and `epic-0f-spec-extended-tier` (S.7 introspection … S.15 RAR) — so the gap is **per-language implementation**, not spec: decompose those into Go/Rust implementation epics/issues. Concrete gaps to file:
   - **Rust — the whole Extended tier is missing** (introspection, revocation, token-exchange, DPoP — Rust is Core-only). This is the single biggest, highest-value parity gap and the natural next **ralph loop** (mirror `go/pkg/{introspection,revocation,dpop}` + the RFC 8693 exchange). Then the advanced set.
   - **Go** — the advanced/PIM-only capabilities: device-auth (RFC 8628), PAR (RFC 9126), JAR (RFC 9101), private_key_jwt (RFC 7523), dynamic registration (RFC 7591/7592), back-channel + RP-init logout, RFC 9207 `iss` validation, FAPI 2.0 validators, and the `ClaimsPrincipal`/identity model.
   - Prioritize the security-normative behaviors first (algorithm-confusion `kty`↔`alg` mapping, non-disableable verify options, discovery endpoint-authority binding, RFC 9207) — audit whether Go/Rust already enforce each, and file gap issues where not.
3. **Cross-platform serializer.** This is a genuine gap (no epic today). Scope a **language-neutral serialization spec** under `spec/` covering JWK (with `x5t#S256` mapping), the discovery document, and the claim/constant enums, plus per-language (de)serializers with round-trip conformance vectors. Decide the key design questions: preserve-vs-drop unknown members; typed claim model vs pass-through; a shared source-of-truth (JSON schema / codegen) vs hand-written per language. Consider whether this subsumes or feeds the JSON-vector conformance runner.
4. **Performance.** Reconcile epic-10 (benchmarks) with reality. Define a **cross-language benchmark harness** (Go `testing.B`, Rust `criterion`) over the hot paths PIM benchmarks (PKCE, DPoP, JWT verify baseline, JWKS parse, discovery parse). File the concrete cache-parity gap: add PIM's **FIFO size-bounded eviction** to the Go/Rust JWKS/discovery caches (max-entries anti-unbounded-growth), and audit the size/key-count/authority JWKS hardening.
5. **Integration harness.** Reconcile with PRD 3 (multi-provider test) and the conformance K6 step. Define a **shared integration harness** that runs both languages against the full provider matrix (node-oidc + IdentityServer local; Ory + Descope cloud; consider Keycloak, which PIM ships) with discovery-driven capability-gated skips (PIM's pattern) — bring Rust integration to Go's provider parity.
6. **Framework middlewares.** New epic. Mirror `fastapi-identity-model` in Go (`net/http` + gin/echo/chi adapters) and Rust (`axum`/`tower` + optional actix), each a thin adapter over the client core: required-audience, ID-vs-access-token discrimination, the 401/403/503/500 taxonomy, principal injection, and an optional RP login router. Decide the module/package layout (in-repo `middleware/` per language vs separate published crates/modules like PIM's package split).

## Session tasks (in order)

1. **Reconcile.** Read the live `gh issue list` for both repos, `docs/roadmap.md`, `task-queue.md`, every `epic-*.md`, the ralph prompts, and the merged git history (off fresh `origin/main`). **Most top-level drift was already reconciled in planning PR #59** (roadmap active-workstream, task-queue Rust-hardening status + the dangling `identity-model-rust-core.md` reference, and a COMPLETE banner on `identity-model-rust-hardening.md`) and **GH issues #23/#24 were closed** (shipped in #37). Verify those landed, then handle the **remaining** drift:
   - **Per-epic `status:` reconciliation** — 22 `epic-*.md` files carry a `status:` field, mostly stale. Advance the merged ones (`epic-3-core-go`, `epic-4-core-rust` → done; `epic-5-extended-tier` → Go-done/Rust-pending) and assess the spec epics against what's actually authored in `spec/conformance/` (core + extended vectors exist; dynamic-reg/fapi2/logout/PAR/RAR specs do not).
   - **OIDF K-series tracking** — the harness (PRs #43/#44) still has no epic/issue; create one (or reconcile PR #56's `identity-model-conformance-harness.md` prompt) as part of priority 1.
   - Leave the `#8–#13` `learning` issues alone unless the owner says otherwise.
2. **Scope each priority** into epic(s) + issues per the section above. Prefer updating existing epics (0f extended-spec, 5 extended, 6 advanced, 10 benchmarks, PRD 3) over new ones; create new epics only for genuine gaps (cross-platform serializer, framework middlewares, PIM-parity matrix).
3. **Sequence.** Produce a single prioritized execution plan across all six, honoring one-workstream-per-repo, and mark each item **in-session PR** vs **ralph loop** (loops only for large multi-task epics — e.g. Rust Extended tier, the serializer). Update `docs/roadmap.md` PRD 6 section to reflect it.
4. **Hand off.** Summarize the plan and the recommended next concrete task. You MAY start that single top task if it is well-scoped and in-session-sized; otherwise stop at the plan.

## Deliverables

- A planning PR in `identity-stack-planning`: reconciliation report + refreshed `roadmap.md` + new/updated epics (parity matrix, cross-platform-serializer, framework-middlewares, plus refreshed conformance/extended/benchmarks/integration epics).
- GitHub issues filed/closed in `identity-model`, linked to their epics.
- A prioritized, sequenced execution plan with loop-vs-in-session tags.

## Guardrails & conventions

- Work in a dedicated `/tmp` worktree; never edit the primary checkout; never push `main`; every change via a feature branch + PR; **no auto-merge** (the owner reviews/merges).
- Conventional commits. Planning repo = BMAD — use the `identity-stack-planning:bmad-*` skills for PRD/epics/architecture/stories where they fit.
- **In-session PRs for well-scoped work; ralph loops only for large epics** (the owner is tired of the loop wait/feedback cycle). One ralph workstream per repo at a time.
- Reconcile before creating: task-queues/roadmaps drift — verify against merged PRs + live `gh` before trusting any tracked status.
- Don't duplicate PIM's own roadmap (FAPI2 #476, E2E #462, CLI, cert) — reference it; this session is about the Go/Rust `identity-model`.
