---
generated: 2026-09-02
last_updated: 2026-09-02
project: open-identity
project_key: NOKEY
tracking_system: file-system
story_location: _bmad-output/implementation-artifacts
workflowType: 'sprint-planning'
executionMode: 'headless-autonomous'
sequencing_policy: 'identity-stack-first (Epic A front-loaded; Epic B/C deferred)'
author: James
source_epics: _bmad-output/planning-artifacts/epics-open-identity.md
source_prd: _bmad-output/planning-artifacts/prd-open-identity.md
source_architecture: _bmad-output/planning-artifacts/architecture-open-identity.md
status: 'headless-draft-ralph-ready'
---

# open-identity MVP — Sequenced Sprint / Execution Plan

> **Execution note (HEADLESS run; no user).** Produced by the `bmad-sprint-planning` workflow run
> non-interactively over `epics-open-identity.md` (32 stories, 4 epics). All grounding inputs were treated as
> **LOCKED/fixed** — Resolved Decisions were not re-opened. This plan sequences the *existing* epics/stories
> into dependency-respecting waves a Ralph loop can execute; it does **not** re-decompose, re-estimate, or
> modify any story, and it does **not** touch the existing cross-repo `sprint-plan.md`. Unresolved forks are
> in **Open Decisions for Main Session** below. Not an execution authorization; no sibling repos, packages, or
> certifications were modified.

> **Sequencing policy — IDENTITY-STACK FIRST.** Per the main-session priority, **Epic A (the `[IS]`
> Descope⇄Ory provider-swap demo) is the front-loaded primary track**: it owns the earliest waves (1–6) as
> the sole build focus, not merely the critical path running in parallel with everything. **Epic B (library /
> `py-identity-model`) and Epic C ("the brain" / `spec/management/`) are deferred to later waves** (7–12)
> rather than fully parallelized with A — their hard dependencies on Epic A are satisfied by then anyway.
> **Epic D (brand/reservation)** is cheap and independent, so it slots into the early waves *opportunistically*
> but is **not** the focus. Narrative order: **identity-stack → library → brain → gate close.**

---

## Resolved Decisions (locked 2026-09-02)

Resolved-upstream forks are **baked in** (see "Locked facts honored"). The four genuine forks that remained
after applying the locked facts are now **resolved (locked 2026-09-02)** — each carries its resolution inline
below. None blocked starting Wave 1; each was annotated at the story where it bites.
References to "Open Decision #N" elsewhere in this doc map to the numbered resolutions below.

1. **PRD 4 (inbound Tyk gateway) ↔ Epic A (outbound management plane) collision — bites Story A.4 (Wave 3).**
   Resolved Decision #1 defers PRD 4 ↔ Epic A reconciliation to a later `/bmad-correct-course` pass. A.4
   modifies `GatewayClaimsMiddleware` (gateway mode). **Fork:** (a) confirm A.4's config-driven validation
   does not conflict with PRD 4's planned Go claim-mapper gateway plugin, or (b) scope A.4 to **standalone
   mode** for MVP and leave gateway-mode Ory to the correct-course pass. Recommend (b) for a clean MVP.
   **→ Resolved (2026-09-02): scope A.4 to standalone mode for MVP; defer gateway-mode Ory + PRD-4
   reconciliation to a later `/bmad-correct-course` pass.**

2. **Where the provider-neutral ClaimMapper lives — bites Story A.5 (Wave 4) and Story C.2 fixtures.**
   ADR-OI-5 profiles (`Descope`/`Ory`/`GenericOIDC`) vs today's `py_identity_model.to_principal(...)`
   (`[OIM]`). A.5 places the abstraction in `identity-stack` (`[IS]`). **Fork:** add `Ory`/`GenericOIDC`
   profiles to `py_identity_model.to_principal` (making part of A.5 an Epic B `[OIM]` story) vs wrap in an
   `identity-stack` abstraction that calls the library. **Decides which repo owns the `claims-normalize`
   conformance fixtures** (A.5 → C.2 hand-off). Settle before A.5 starts.
   **→ Resolved (2026-09-02): keep it app-side. The claim-normalization abstraction, the `Ory`/`GenericOIDC`
   profiles, and the `claims-normalize` conformance fixtures live in `identity-stack` (`[IS]`). Do NOT extend
   `py_identity_model.to_principal` with Ory/GenericOIDC for MVP — the library keeps only its existing Descope
   `to_principal` primitive. Story A.5 stays entirely `[IS]` (it does NOT split into an Epic B `[OIM]` story).
   Future option (post-MVP): promote the profiles into the library once stable.**

3. **Governed-namespace ordering vs Ory registration — bites Story A.2 (Wave 2) vs Story C.1 (Wave 7).**
   Because Epic C is now deferred, **C.1's governed `capability-namespace.yaml` lands *after* A.2 registers
   Ory.** Assumption taken (already in the epics doc, now reinforced by the deferral): **A.2 uses capability
   strings aligned to the intended namespace, and C.1 tightens them to the validated set later** — a
   backward-compatible cleanup, not a rework. Confirm; do **not** block A.2 on C.1 (that would break the
   identity-stack-first policy).
   **→ Resolved (2026-09-02): A.2 uses capability strings aligned to the intended namespace; C.1 tightens them
   to the validated set later (a backward-compatible cleanup). Do NOT block A.2 on C.1.**

4. **DPoP depth in the MCP example — bites Story B.5 (Wave 9), scope of B.3.**
   FR-B2 marks DPoP a **parity-target, not a gate**, yet MCP's Nov-2025 tightening added proof-of-possession.
   **Fork:** must the runnable MCP example (B.5) *demonstrate* DPoP end-to-end (Python), or may it ship with
   DPoP available-but-not-exercised? Recommend "demonstrate if cheap, else available-but-noted" (DPoP already
   ships in Python).
   **→ Resolved (2026-09-02): DPoP is a parity-target, not an MVP gate. The MCP example demonstrates the core
   OAuth 2.1 flow and does not require end-to-end DPoP for MVP; DPoP remains a stretch/parity item.**

**Locked facts honored (forks closed upstream — recorded so they are not re-opened):**

- **Ory CI target (was epics-doc Open Decision #4; re-resolved 2026-09-02, supersedes the earlier
  "self-hosted Ory" resolution):** the **existing cloud Ory Network (managed) — for now**. The Descope⇄Ory
  swap + integration run against that Ory Network project, configured via **Terraform** (Ory project config)
  with Ory Network credentials wired as a **CI secret / local env**. **CI split:** the FULL Descope⇄Ory swap
  E2E is **not** secret-free — it runs on **nightly / protected-branch CI** (where the Ory Network secret is
  available) and **locally**, not on fork PRs (A.1, A.12, C.4). **Secret-free PR-gating uses
  `node-oidc-provider`** as the second-provider stand-in to exercise the adapter-selection registry,
  claim-normalization, and the zero-RBAC-migration invariant without live Ory (A.12 PR-gate, C.3).
  **Self-hosted Ory (docker-compose Kratos/Hydra/Keto) is deferred/optional** — revisit only if secret-free
  full-swap-on-PRs later becomes a requirement.
- **Demo RBAC dataset (was epics-doc Open Decision #6):** the swap-demo user (A.10/A.11) uses **only the flat
  portable floor** (`roles`/`permissions`/`role_permissions`/`user_tenant_roles`); `roles.hierarchy` etc.
  stay `n/a` so the 0-row-diff invariant is clean.
- **Canonical-authoritative RBAC (ADR-OI-1/AR1):** Postgres is the RBAC system-of-record; a swap
  **re-projects** and asserts a **0 canonical-RBAC-row diff** (A.11) — no authorization-data migration.
- **Brand/reservation now, irreversible renames gated (Epic D):** reserve names + brand at the cheap layer in
  MVP; **0 irreversible renames**; the Rename Gate trigger stays author discretion (D.5 records readiness only).
- **Repo targets:** Epic A → `identity-stack` `[IS]`; Epic B → `py-identity-model` (Python ref) +
  `identity-model/go` `[OIM]`; Epic C spec/runner → `identity-model` `spec/management/` `[OIM]`, public matrix
  (C.6) → this planning repo `[BRAIN]`; Epic D → this planning repo `[BRAIN]` + all repos.

---

## Overview & honest sizing

**Totals:** Epic A = 12, Epic B = 8, Epic C = 7, Epic D = 5 → **32 stories**, sequenced into **12 waves**
grouped into **3 phases** (identity-stack → library/brain → gate close).

**Epic A (`[IS]`) is the front-loaded primary build and the real weight** — the entire net-new provider-swap
seam (adapter-selection registry, Ory adapter + inbound validation, claim-normalization abstraction,
zero-migration CI). **A.1 (Ory infra) is the long pole — but it shrinks** now that A.1 connects/configures
the **existing cloud Ory Network** project (Terraform + wire credentials) instead of standing up a container
stack. Epic A owns Waves 1–6 as the sole focus.

**Epic C (`[OIM]`/`[BRAIN]`) is the other real build, deferred to Phase 2** — `spec/management/` is **empty
today**; the namespace, conformance defs, runner, live matrix, and coverage report are net-new. Its **live**
conformance (C.3/C.4/C.5) hard-depends on Epic A's Python management-plane impl (A.5 claim fixtures, A.11
swap-invariant fixtures) and Ory infra (A.1) — all delivered in Phase 1, so deferring C loses nothing.

**Epic B (`[OIM]`) is deliberately light — corrected sizing, deferred to Phase 2.** Verified against live
`py-identity-model` (remote `identity-model`) on 2026-09-02: **auth-code+PKCE, token-exchange, and DPoP
already ship in BOTH Python and Go.** So **B.1/B.2/B.3 are conformance *verification*, not flow builds**, and
**B.6 is Go parity *confirmation***. The only genuinely net-new Epic B deliverable is **B.5 (the MCP OAuth 2.1
example**, assembling existing primitives), plus **B.8 (maintain Python OpenID cert, no regression)**. Rust is
**stretch only** (gaps: token-exchange + DPoP) — tracked in the matrix, never gating.

**Epic D (`[BRAIN]`/all) is cheap-layer + gated, slotted early opportunistically** — reserve/brand/positioning
in Waves 1–2; the D.5 gate record closes in Phase 3.

### Track legend

| Tag | Repo | MVP role |
|---|---|---|
| `[IS]` | `identity-stack` | Reference app — provider-swap demo (Epic A) — **primary track** |
| `[OIM]` | `py-identity-model` (Python ref) + `identity-model` (Go/Rust + shared `spec/`) | Polyglot client + conformance machinery (Epics B, C) — **deferred** |
| `[BRAIN]` | `identity-stack-planning` (this repo) | Public capability matrix + positioning + name reservation (Epics C, D) |

---

## Wave sequence (at a glance)

Each wave = a dependency layer whose hard prerequisites are satisfied by prior waves. **Phase 1 (Waves 1–6) is
identity-stack only** (plus opportunistic brand); **Phase 2 (Waves 7–11) runs the deferred library and brain
tracks in parallel with each other**; **Phase 3 (Wave 12) closes governance + gate.** Waves may be collapsed
into calendar sprints by capacity; the **ordering** is what Ralph must respect.

| Phase | Wave | Theme | Stories | Count | `[IS]` | `[OIM]` | `[BRAIN]` |
|---|---|---|---|---|---|---|---|
| **1 — identity-stack first** | **1** | Epic A kickoff: Ory infra (+ opportunistic brand) | A.1, D.1, D.3, D.4 | 4 | A.1 | — | D.1, D.3, D.4 |
| | **2** | Epic A: provider registration (+ brand adoption) | A.2, D.2 | 2 | A.2 | — | D.2 |
| | **3** | Epic A: selection seam & inbound validation | A.3, A.4 | 2 | A.3, A.4 | — | — |
| | **4** | Epic A: adapter, normalization, resolution, logout | A.5, A.6, A.7, A.9 | 4 | A.5, A.6, A.7, A.9 | — | — |
| | **5** | Epic A: canonical surface & invariant | A.8, A.11 | 2 | A.8, A.11 | — | — |
| | **6** | Epic A: visible swap + E2E swap CI **(Epic A complete)** | A.10, A.12 | 2 | A.10, A.12 | — | — |
| **2 — library, then brain** | **7** | Deferred tracks kick off | B.1, C.1 | 2 | — | B.1, C.1 | — |
| | **8** | Client verification + spec definitions | B.2, B.3, B.4, C.2 | 4 | — | B.2, B.3, B.4, C.2 | — |
| | **9** | MCP example + conformance runner + matrix | B.5, C.3, C.6 | 3 | — | B.5, C.3 | C.6 |
| | **10** | Go parity + cert guard + nightly live | B.6, B.8, C.4 | 3 | — | B.6, B.8, C.4 | — |
| | **11** | Quickstarts + coverage report | B.7, C.5 | 2 | — | B.7, C.5 | — |
| **3 — gate close** | **12** | Contribution/spec-pin + Rename-safety gate | C.7, D.5 | 2 | — | C.7 | D.5 |
| | | **Total** | | **32** | 12 | 15 | 5 |

> Two stories carry a **finalize checkpoint** in a later wave without being re-counted:
> **C.2** authoring begins Wave 8 and imports the A.5 (`claims-normalize`) + A.11 (`swap-invariants`) fixtures
> that already exist from Phase 1; **C.6** is published *doc-first* in Wave 9 and *finalized (links to coverage
> report C.5)* in Wave 12.

---

## Phase 1 — Identity-Stack First (Epic A) — Waves 1–6

The sole build focus. Epic A is inherently a mostly-sequential spine at the start (A.1 → A.2 → {A.3,A.4}),
which is exactly why it is front-loaded and de-risked before anything else begins. Markers: **[CP]** critical
path · **[LP]** long pole · **[PR-gate/secret-free]** · **[nightly-live]**.

### Wave 1 — Epic A kickoff: Ory infrastructure (+ opportunistic brand)
- **[IS] A.1 — Ory provider infrastructure** `[CP][LP]` — **connect & configure the existing cloud Ory
  Network project** (Terraform for Ory project config + SPA PKCE client + identity schema); issues **JWT**
  access tokens. Ory Network credentials wired as a **CI secret / local env**; the full swap runs
  **[nightly-live]/local** against the cloud Ory Network, while **`node-oidc-provider` is the secret-free
  PR-gate stand-in** (no live Ory on fork PRs). **Self-hosted Kratos/Hydra/Keto (docker-compose) is
  deferred/optional.** This **shrinks the Wave-1 long pole — no container stack to build.** Secrets in
  Infisical via `config_ref` (NFR13). *(deps: none)*
- **[BRAIN] D.1 — Reserve package/org names** *(opportunistic; not focus)* — GitHub org, PyPI, crates.io
  placeholders; no renamed release. *(deps: none)*
- **[BRAIN] D.3 — Rewrite positioning/READMEs** *(opportunistic)* — portability / "identity fabric for
  developers"; no routing/arbitrage analogy. *(deps: none)*
- **[BRAIN] D.4 — Investigate OpenID cert rename/re-cert path** *(opportunistic)* — record answer as
  Rename-Gate criterion **G-R3**; submit nothing. *(deps: none)*

### Wave 2 — Epic A: provider registration (+ brand adoption)
- **[IS] A.2 — Register the `ory` provider** `[CP]` — `Provider` row (type=ory, issuer, capabilities,
  `config_ref`); `config_ref` stripped from responses. *(deps: A.1)* — see Open Decision #3.
- **[BRAIN] D.2 — Adopt brand at repo/org layer + redirects** *(opportunistic)* — Pages/Actions/badges fixed;
  no package/module/cert change. *(deps: D.1)*

### Wave 3 — Epic A: selection seam & inbound validation
- **[IS] A.3 — Adapter-selection registry (Descope-only)** `[CP]` — `ProviderType`→adapter factory; Descope
  boots unchanged (NFR3); unknown provider fails fast (AR11). Scoped Descope-only to avoid forward-dep on A.6. *(deps: A.2)*
- **[IS] A.4 — Config-driven inbound validation + Ory OIDC branch** `[CP]` — issuer/JWKS/aud from registry;
  Descope dual-issuer + `dct` **unchanged**; Ory = standard OIDC, absence of `dct`/`tenants` not an error. *(deps: A.2)* — see Open Decision #1.

### Wave 4 — Epic A: adapter, normalization, resolution, logout
- **[IS] A.5 — Claim-normalization abstraction (ClaimMapper)** `[CP]` — profiles `Descope`/`Ory`/`GenericOIDC`
  → one canonical principal; Descope profile reproduces `middleware/claims.py` exactly. **Emits
  `claims-normalize` fixtures consumed later by C.2.** *(deps: A.4)* — see Open Decision #2.
- **[IS] A.6 — OrySyncAdapter (G1 outbound) + Ory mgmt client** `[CP]` — mirrors users/tenants to Ory;
  roles/permissions stay canonical (declared `n/a`); `Result[...]`, keyword-only, OTel spans, `config_ref`. *(deps: A.3, A.1)*
- **[IS] A.7 — Cross-provider resolution + JIT via `idp_links`** — Ory `sub` resolves/JIT-provisions to one
  canonical user; either provider → same RBAC. *(deps: A.4, A.2)*
- **[IS] A.9 — Provider-aware RP-initiated logout** — Descope Management vs Ory end-session, config-selected. *(deps: A.3, A.4)*

### Wave 5 — Epic A: canonical surface & invariant
- **[IS] A.8 — Canonical `/me` + provider-neutral frontend** — `{user, roles, tenant_memberships,
  linked_idps}`; UI stops decoding provider claims; frontend OIDC config provider-driven. *(deps: A.5, A.7)*
- **[IS] A.11 — Zero-RBAC-migration invariant + `swap-invariants` fixtures** `[CP]` — byte-identical RBAC rows
  pre/post swap (**0 rows migrated**); before/after principal equality; deterministic. **Emits
  `swap-invariants` fixtures consumed later by C.2.** Uses **flat-floor** demo dataset (locked). *(deps: A.5, A.7, A.6)*

### Wave 6 — Epic A: visible swap + E2E swap CI (Epic A COMPLETE)
- **[IS] A.10 — Visible, reproducible swap flow** — before/after roles+tenants intact across a config-only
  switch; **flat-floor** dataset (locked); documented for a reviewer. *(deps: A.3, A.5, A.7, A.8)*
- **[IS] A.12 — Automated E2E provider-swap CI** `[CP]` — authenticates via each provider, swaps, asserts
  A.11; deterministic; red blocks merge. **Green = G-D1 + Rename-Gate G-R1.** The **full Descope⇄Ory swap
  E2E runs against the cloud Ory Network (secret) on nightly / protected-branch CI and locally
  [nightly-live]**, not on fork PRs; the **secret-free PR-gate uses `node-oidc-provider`** as the
  second-provider stand-in to exercise the swap seam + invariant without live Ory [PR-gate/secret-free].
  *(deps: A.11, A.1)*

> **End of Phase 1: Epic A is complete and G-D1 is met.** The Python management-plane impl (A.5, A.11) and
> CI-reachable Ory (A.1/A.6) now exist — every hard dependency the deferred brain track needs is in place.

---

## Phase 2 — Library, then Brain (deferred `[OIM]`) — Waves 7–11

Now that identity-stack is de-risked, the two deferred `[OIM]` tracks spin up **in parallel with each other**
(library = Epic B; brain = Epic C). Neither depends on the other; both consume Phase-1 outputs. Markers add
**[net-new]** (genuinely new build) and **[verify]** (conformance-verification of already-shipped capability).

### Wave 7 — Deferred tracks kick off
- **[OIM] B.1 — Python auth-code+PKCE** `[verify][PR-gate/secret-free]` — confirm existing flow vs RFC 6749
  §4.1 / 7636 vectors; matrix cell confirmed by CI, not hand-edit. *(deps: none — deferred by policy)*
- **[OIM] C.1 — Capability namespace + canonical-model schema** `[PR-gate/secret-free]` — `spec/management/
  capability-namespace.yaml` (dotted, tiered), `canonical-model.schema.json`, establish `mp-1.0.0`. *(deps: none — deferred by policy)*

### Wave 8 — Client verification + spec definitions
- **[OIM] B.2 — Python token-exchange (RFC 8693)** `[verify][PR-gate/secret-free]` — confirm `act` claim path. *(deps: B.1)*
- **[OIM] B.3 — Python DPoP (RFC 9449)** `[verify][PR-gate/secret-free]` — confirm PoP proof path; depth per Open Decision #4. *(deps: B.1)*
- **[OIM] B.4 — Normative client security behaviors (Python + Go)** `[PR-gate/secret-free]` — RFC 9207 `iss`,
  discovery authority-binding, bounded caches, redirect-downgrade, `azp`/skew, secret redaction. *(deps: B.1)*
- **[OIM] C.2 — Management-plane conformance definitions + fixtures** `[PR-gate/secret-free]` — authors the
  `{given,when,then,references,vectors}` files; **imports the A.5 `claims-normalize` + A.11 `swap-invariants`
  fixtures already produced in Phase 1** (no wait — the deferral means the fixtures pre-exist). *(deps: C.1; fixtures ← A.5, A.11)* — see Open Decision #2.

### Wave 9 — MCP example + conformance runner + matrix
- **[OIM] B.5 — Runnable MCP OAuth 2.1 example (Python)** `[net-new]` — the one genuinely net-new Epic B
  deliverable; assembles B.1/B.2/B.3 primitives; names the MCP profile for reuse by B.6. *(deps: B.1, B.2, B.3)*
- **[OIM] C.3 — Python reference conformance runner (fixtures mode)** `[PR-gate/secret-free]` — runs
  management-plane conformance against the Phase-1 Python impl using recorded contracts/fakes; gates every PR;
  a cell is `implemented` only on a passing run. *(deps: C.2, A.5, A.11)*
- **[BRAIN] C.6 — Public capability matrix (9 providers), doc-first** `[PR-gate/secret-free]` — portable vs
  proprietary labels; documented vs conformance-verified. **Finalized in Wave 12** (links to C.5). *(deps: C.1; refs C.5)*

### Wave 10 — Go parity + cert guard + nightly live
- **[OIM] B.6 — Go core-flow parity verification** `[verify][PR-gate/secret-free]` — Go passes named MCP
  profile subset via CI; Rust gaps (token-exchange + DPoP) shown honestly, not gating. *(deps: B.5, B.1–B.3)*
- **[OIM] B.8 — Maintain Python OpenID certification (no regression)** — guard after B.5 lands; no
  speculative re-cert (defers to Rename Gate). *(deps: B.1–B.4)*
- **[OIM] C.4 — Nightly live conformance matrix** `[nightly-live]` — same defs vs real providers (**managed
  Ory Network**, Descope test project via secret, node-oidc-provider); failures = fixtures drift, non-blocking. *(deps: C.3, A.1/A.6)*

### Wave 11 — Quickstarts + coverage report
- **[OIM] B.7 — Per-language quickstarts, < 30 min TTFT** — Python + Go; links to MCP example. *(deps: B.1, B.6)*
- **[OIM] C.5 — Generated coverage report (providers × languages × capabilities)** — cells
  `implemented/in-progress/planned/n/a` from passing runs; records `mp-<semver>`; documented vs
  conformance-verified; reproducible. **= G-D3 (with C.6).** *(deps: C.3, C.4)*

---

## Phase 3 — Governance & Gate Close — Wave 12

### Wave 12 — Contribution/spec-pin + Rename-safety gate
- **[OIM] C.7 — Contribution process + spec-version pinning** — add-a-provider/language guide; CI pins
  `mp-<semver>`; additive-within-major + deprecation-window policy. *(deps: C.2, C.5)*
- **[BRAIN] D.5 — Rename-safety gate record** — confirms **0** package renames / **0** module-path changes /
  **0** re-cert submissions; aggregates Rename-Gate inputs G-R1 (A.12 green), G-R2 (Epic C parity), G-R3 (D.4)
  — trigger stays author discretion. **= G-D4.** *(deps: D.1–D.4; refs A.12, Epic C)*
- *Checkpoint:* **C.6 finalize** — public matrix now links to the C.5 coverage report (two artifacts, one narrative).

---

## Critical path

**Headline (Epic A → green swap CI) — the front-loaded long pole, Phase 1:**

```
A.1 [LP] → A.2 → A.4 → A.5 → A.11 → A.12
(Ory infra) (register) (dual-validation) (claim-norm) (0-row invariant) (E2E swap CI)
 Wave 1      Wave 2      Wave 3           Wave 4        Wave 5             Wave 6
```

- Equal-length Epic-A spurs feed A.11: `A.3 → A.6` and `A.2 → A.7`. A.3 was deliberately scoped Descope-only
  so it does **not** forward-depend on the Ory adapter (A.6 plugs Ory in later).
- **A.10 (visible swap) is the human-demo deliverable, alongside A.12 in Wave 6** — A.11/A.12 (the machine
  invariant + CI) do **not** depend on A.10.

**Extended (full-MVP incl. "the brain" + gate close), Phases 1→3:**

```
[Phase 1 spine] A.1→A.2→A.4→A.5→A.11  →  [Phase 2 brain] C.2→C.3→C.4→C.5  →  [Phase 3] { C.7, D.5 }
   Waves 1–5                                 Waves 8–11                          Wave 12
```

Because Epic C is deferred, its live-conformance tail starts only after Phase 1 lands — but it loses no time,
since C.3/C.4/C.5 hard-depend on A.5/A.11 (Wave 5) and Ory (Wave 1) which are already done. `B.6` reuses the
**existing protocol-plane** spec, so **Epic B has no dependency on Epic C** and the library track can run
fully in parallel with the brain track through Phase 2.

---

## Parallel tracks (swimlane)

```
            PHASE 1 — identity-stack first          PHASE 2 — library + brain            PHASE 3
Wave:     1       2      3         4          5         6      7     8         9       10      11      12
[IS]  ─ A.1[LP]─ A.2 ─ A.3,A.4 ─ A.5,A.6, ─ A.8,A.11 ─ A.10, ─ (Epic A complete) ───────────────────────
                                  A.7,A.9              A.12
[OIM] ─ ────────────────────────────────────────────────────── B.1 ─ B.2,B.3, ─ B.5 ─── B.6,B.8 ─ B.7 ─ C.7
                                                               C.1   B.4,C.2    C.3      C.4      C.5
                                                                                C.6(doc)
[BRAIN]─ D.1,D.3,─ D.2 ─ ─────────────────────────────────────────────────────────────────────────── D.5,
         D.4                                                                                          C.6(final)
```

- **Phase 1 (Waves 1–6) is identity-stack only** — Epic A is the primary track, run to completion first. The
  only companions are the cheap, independent Epic D brand stories (Waves 1–2), which are opportunistic, not focus.
- **Phase 2 (Waves 7–11) runs the deferred library (Epic B) and brain (Epic C) tracks in parallel with each
  other.** Epic B is light (mostly `[verify]`; only B.5 is `[net-new]`); Epic C is the real Phase-2 build.
- **Phase 3 (Wave 12)** closes the contribution/spec-pin (C.7) and the Rename-safety gate record (D.5).

---

## Cross-repo dependencies (the hand-offs Ralph must honor)

Because Epic A runs first, every producer→consumer hand-off flows **forward in time** — the deferral makes the
brain track strictly easier to sequence (its inputs already exist when it starts).

| Producer (repo) | Artifact | Consumer (repo) | When available → when needed |
|---|---|---|---|
| A.5 `[IS]` | `claims-normalize` claim fixtures (Descope/Ory/GenericOIDC) | C.2 `[OIM]` `spec/management/fixtures/` | W4 → W8 ✓ |
| A.11 `[IS]` | `swap-invariants` assertion encoding (row-diff == ∅ + principal equality) | C.2 `[OIM]` `swap-invariants.json` | W5 → W8 ✓ |
| A.5, A.11 `[IS]` | Python management-plane implementation | C.3 `[OIM]` fixtures-mode runner | W4/W5 → W9 ✓ |
| A.1 / A.6 `[IS]` | CI-reachable Ory (managed nightly) | C.4 `[OIM]` nightly live matrix | W1/W4 → W10 ✓ |
| C.1 `[OIM]` | governed capability namespace | A.2 `[IS]` declared capabilities | **A.2 (W2) precedes C.1 (W7)** — see Open Decision #3 (A.2 uses aligned strings; C.1 tightens later) |
| C.5 `[OIM]` | coverage report | C.6 `[BRAIN]` public matrix | W11 → W12 finalize ✓ |
| A.12 green, Epic C parity, D.4 | Rename-Gate inputs (G-R1/G-R2/G-R3) | D.5 `[BRAIN]` gate record | W6/W11/W1 → W12 ✓ |

**Only inversion introduced by the identity-stack-first policy:** A.2 (W2) declares Ory capabilities *before*
C.1's governed namespace (W7). This is intentional and backward-compatible — A.2 uses strings aligned to the
intended namespace; C.1 later validates/tightens them. It must **not** be resolved by blocking A.2 on C.1
(that would violate the front-loading policy). See Open Decision #3.

---

## MVP Delivery-Gate mapping (G-D1..G-D4) + Rename Gate

| Gate | Meaning | Satisfied by | Lands |
|---|---|---|---|
| **G-D1** | Provider swap green in CI (zero RBAC migration) | **A.12** (asserting **A.11**) | **Wave 6** (end of Phase 1) |
| **G-D2** | Polyglot agent/MCP client shipped & parity-backed | **B.5** + **B.6** (+ **B.8** cert maintained) | **Wave 10** |
| **G-D3** | Portability verifiable — matrix + conformance coverage | **C.5** + **C.6** (built on **C.1/C.2**) | **Wave 11** (C.6 finalize W12) |
| **G-D4** | Brand at cheap layer, **0 irreversible renames** | **D.1** + **D.2** + **D.3** + **D.5** | **Wave 12** |

**Rename Gate (discretion-based — recorded, not pulled, in MVP):**

| Rename-Gate input | Source story | Wave |
|---|---|---|
| **G-R1** — swap CI green | A.12 | 6 |
| **G-R2** — cross-language conformance parity | Epic C (C.5/C.6) | 11 |
| **G-R3** — OpenID cert rename/re-cert path answered | D.4 | 1 |
| **Aggregated readiness record (trigger = author discretion)** | D.5 | 12 |

Per the locked facts and FR-D5, **no irreversible rename is executed in MVP**; D.5 records readiness only.
Note **G-D1 (the headline swap claim) is met at the end of Phase 1 (Wave 6)** — the identity-stack-first
sequencing delivers the marquee deliverable earliest.

---

## Secret-free / PR-gating vs nightly-live

| Posture | Stories | Notes |
|---|---|---|
| **PR-gating, secret-free** | A.12 (`node-oidc-provider` second-provider stand-in for the swap seam), B.1, B.2, B.3, B.4, B.6, C.1, C.2, C.3, C.6, and all `[BRAIN]`/`[IS]` non-provider stories | Every PR; no secrets. Default gate. `node-oidc-provider` stands in for the second provider to exercise the adapter-selection registry, claim-normalization, and the zero-RBAC-migration invariant without live Ory. |
| **Nightly-live / local (needs provider secrets)** | A.1 + A.12 full Descope⇄Ory swap E2E (cloud **Ory Network** via secret), C.4 (cloud **Ory Network** + Descope test project + node-oidc-provider) | Ory Network credentials wired as a CI secret / local env (NFR13); runs on nightly / protected-branch CI and locally, not on fork PRs; live-run failures = fixtures drift, non-blocking to PRs. |

`node-oidc-provider` keeps the swap seam (A.12 PR-gate) and the conformance runner (C.3) green on every PR
without secrets; the full Descope⇄Ory swap against the **cloud Ory Network** runs nightly / on protected
branches and locally (A.12, C.4) to prove the swap and the fixtures still match reality. Self-hosted Ory
(docker-compose Kratos/Hydra/Keto) is deferred/optional — revisit only if secret-free full-swap-on-PRs later
becomes a requirement.

---

## Ralph execution guidance

- **Work Phase 1 (Waves 1–6, identity-stack) to completion first.** It is the primary track and the marquee
  deliverable (G-D1). Do not spin up the deferred `[OIM]` tracks (Epic B/C) until Phase 1 is essentially done
  — that is the point of the identity-stack-first policy. The one allowed early companion is Epic D's cheap,
  independent brand work (Waves 1–2).
- **Work waves in order; within a wave, stories are independent** (no intra-wave hard deps) — safe to fan out
  across worktrees, one story per dev-agent session. In Phase 1 that fan-out is mostly within `[IS]`; in
  Phase 2 it is across the parallel `[OIM]` library and brain sub-tracks.
- **Do not start a story until its listed deps are `done`.** The two finalize checkpoints (C.2 fixtures import
  @ W8, C.6 link @ W12) rely on upstream producers (A.5/A.11 from Phase 1; C.5 from W11).
- **Respect the locked facts** (cloud Ory Network is the Ory target for now, with the full swap E2E on
  nightly/protected-branch + local and `node-oidc-provider` as the secret-free PR-gate stand-in; self-hosted
  Ory deferred/optional; flat-floor demo dataset; 0 renames).
- **Surface the four Open Decisions** at the stories where they bite (A.4 @ W3, A.5/C.2 @ W4/W8, A.2 @ W2,
  B.5 @ W9) before coding those stories — a wrong default on #1 (gateway mode) or #2 (ClaimMapper repo) causes
  rework.
- Per-story Given/When/Then acceptance criteria and full context live in
  `_bmad-output/planning-artifacts/epics-open-identity.md` — this plan sequences, it does not restate them.

---

## Appendix A — `development_status` (sprint-status format, for tooling)

All items start `backlog`; retrospectives `optional`. Ordered epic → stories → retrospective. Update as work
progresses (never downgrade).

```yaml
generated: 2026-09-02
last_updated: 2026-09-02
project: open-identity
project_key: NOKEY
tracking_system: file-system
story_location: _bmad-output/implementation-artifacts

development_status:
  epic-a: backlog
  a-1-ory-provider-infrastructure: backlog
  a-2-register-ory-provider: backlog
  a-3-adapter-selection-registry: backlog
  a-4-config-driven-inbound-validation-ory-branch: backlog
  a-5-claim-normalization-abstraction: backlog
  a-6-orysyncadapter-outbound-sync: backlog
  a-7-cross-provider-resolution-jit: backlog
  a-8-canonical-me-endpoint-frontend: backlog
  a-9-provider-aware-rp-initiated-logout: backlog
  a-10-visible-reproducible-swap-flow: backlog
  a-11-zero-rbac-migration-invariant: backlog
  a-12-automated-e2e-provider-swap-ci: backlog
  epic-a-retrospective: optional

  epic-b: backlog
  b-1-python-auth-code-pkce-conformance: backlog
  b-2-python-token-exchange-conformance: backlog
  b-3-python-dpop-conformance: backlog
  b-4-normative-client-security-behaviors: backlog
  b-5-mcp-oauth21-client-example-python: backlog
  b-6-go-core-flow-parity-verification: backlog
  b-7-per-language-quickstarts-ttft: backlog
  b-8-maintain-python-openid-certification: backlog
  epic-b-retrospective: optional

  epic-c: backlog
  c-1-governed-capability-namespace-schema: backlog
  c-2-management-plane-conformance-definitions: backlog
  c-3-python-conformance-runner-fixtures-mode: backlog
  c-4-nightly-live-conformance-matrix: backlog
  c-5-generated-coverage-report: backlog
  c-6-public-capability-matrix-9-providers: backlog
  c-7-contribution-process-spec-pinning: backlog
  epic-c-retrospective: optional

  epic-d: backlog
  d-1-reserve-package-org-names: backlog
  d-2-adopt-brand-repo-org-redirects: backlog
  d-3-rewrite-positioning-readmes: backlog
  d-4-investigate-openid-cert-rename-path: backlog
  d-5-rename-safety-gate-record: backlog
  epic-d-retrospective: optional
```

---

## Coverage validation

- **Epics:** 4/4 present (A, B, C, D). **Stories:** 32/32 sequenced (A=12, B=8, C=7, D=5), each in exactly one
  wave (C.2 and C.6 carry a later finalize checkpoint, not a second placement).
- **Retrospectives:** one per epic in the status block.
- **Sequencing policy:** Epic A (identity-stack) occupies Phase 1 (Waves 1–6) as the sole build focus; Epic B
  and Epic C are deferred to Phase 2 (Waves 7–11); Epic D is opportunistic-early (Waves 1–2) + gate close
  (Wave 12). Hard dependencies intact — Epic C live-conformance still lands after Epic A's Python impl + Ory
  infra (which it does, in Phase 2).
- **Dependency integrity:** every story's deps resolve to an equal-or-earlier wave. The only forward-in-catalog
  inversion (A.2 declaring capabilities before C.1's namespace) is intentional, backward-compatible, and
  tracked as Open Decision #3.
- **FR coverage:** unchanged from the epics doc — all 28 FRs (FR-A1..A9, FR-B1..B7, FR-C1..C7, FR-D1..D5)
  remain covered; this plan sequences, it does not alter coverage.
