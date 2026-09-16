# Idea — open-identity

**Status:** parked idea, not planned work · **Decisions locked:** 2026-09-02 · **Parked:** 2026-09-15

A rebrand and repositioning of this workspace around provider-portable identity. The
thinking was done properly in September 2026 — market research, a product brief, a PRD, an
architecture with ten ADRs, a 32-story epic breakdown, naming and trademark diligence —
and then nothing was built.

This is the whole of it, condensed. It stays because the research cost real effort and the
conclusions are still sound; it is not a plan, and nothing here is scheduled.

> **The seven source documents are in git history**, retired 2026-09-15. To read one:
> ```
> git show 9919887:_bmad-output/planning-artifacts/prd-open-identity.md
> ```
> Others: `product-brief-open-identity-2026-09-02.md`, `architecture-open-identity.md`,
> `epics-open-identity.md`, `research/market-open-identity-research-2026-09-02.md`,
> `research/brand-trademark-diligence-open-identity-2026-09-02.md`,
> `../brainstorming/brainstorming-open-identity-naming-2026-09-02.md`.

---

## The thesis

Swap or add an identity provider by implementing **one adapter**, not by rewriting the
application — with **zero RBAC migration**.

Three pillars were proposed:

- **open-identity-model** — the polyglot, OpenID-certified client library (one SDK surface
  across Python, Go, Rust). Leading use case: OIDC/OAuth for AI agents and MCP.
- **open-identity** — a reference implementation demonstrating a live Descope ⇄ Ory swap
  with users, roles, and tenants intact.
- **"The brain"** — a public provider capability matrix plus a cross-language conformance
  spec, as the canonical artifact everything validates against.

## What the research actually concluded

The market work returned a **conditional go** and was deliberately unflattering in two
places. Both corrections are the durable part of this document.

**1. The routing metaphor was wrong and is retired.** The pivot began as "OpenRouter for
identity" — real-time provider arbitrage. Identity is stateful and single-homed; login
routing is deterministic Home Realm Discovery, not arbitrage. Sell **portability and
federation ("identity fabric for developers")**, never routing. This framing was dropped
entirely and should not be resurrected.

**2. A bare OIDC SDK is commodity.** The login flow is already portable because OIDC
standardized it. Lock-in lives in the **management plane** that standards leave
proprietary: users, orgs, roles, permissions, tenants, claims. That is where
differentiation has to sit, and it is the layer incumbents structurally will not compete
on, because abstracting it dissolves their lock-in.

Supporting findings: inbound B2B SSO federation (WorkOS, Scalekit, SSOReady) is crowded;
**outbound vendor portability at developer altitude is open** — only Strata occupies it,
and that is enterprise-IT altitude, not SaaS-developer. Lock-in pain is real and
documented (Auth0's 2023 pricing change, Rules/Hooks EOL 2026-11-18, the sso.tax markups).

Research confidence: medium-high on competitive positioning and rename mechanics; **low on
all market-size figures**. Three corrections it captured are worth keeping: Twilio acquired
**Stytch**, not WorkOS; the SuperTokens "$120M / $1.92B valuation" figure circulating in
AI-summarized results is **false** (YC seed only); Auth0 Rules/Hooks went read-only
2024-11-18 with full EOL 2026-11-18.

## Naming and trademark

Checked 2026-09-02. `open-identity-model` is free on PyPI, crates.io, npm, and as a GitHub
org. `open-identity` is free on PyPI, crates.io, and npm; the GitHub org handle is held by
a dormant, unrelated 2019 placeholder.

**No blocking live US trademark** on "Open Identity" in the identity classes (Nice 9/42).
ForgeRock's "Open Identity Stack" was a retired marketing brand, never a registration; the
bare OPEN IDENTITY application (OIX, 2011) is dead, and OIX itself closed in 2024. The risk
is **crowding and SEO against a weak descriptive mark, not a legal blocker**. Live marks to
respect: OpenID and OpenID Certified (OIDF) — the certification mark may be used within the
Foundation's conditions, without implying endorsement.

Caveat recorded at the time: USPTO TESS/TSDR were unreachable, so the trademark findings
rest on secondary indexes. **Confirm in TESS/TSDR before any commercial or funded launch.**
This is diligence, not legal advice.

## The ten locked decisions

Locked 2026-09-02. Numbering preserved so the retired documents still cross-reference
correctly.

1. **Composes, does not replace.** open-identity was scoped as a PRD that composes the
   canonical-identity and library work rather than rewriting them. *(The PRD numbering it
   referenced has since been retired in favour of the four-track model.)*
2. **"Zero RBAC migration" means canonical-authoritative.** Postgres is the RBAC
   system-of-record; providers are projections. A swap re-projects; canonical rows never
   move, and CI asserts a 0-row diff across the swap. It explicitly does **not** migrate
   Descope-FGA to Ory-Keto authorization data.
3. **Conformance bar.** Python holds its OpenID certification with no regression; Go passes
   the core-flow / basic-RP bar. Management-plane conformance runs as fixtures (PR-gating)
   plus nightly live. The Rust extended tier is an acknowledged gap, not a blocker.
4. **MVP languages: Python + Go.** Rust is a stated target, descoped from MVP.
5. **Names reserved, not adopted.** Reserve on GitHub, PyPI, and crates.io; brand at the
   repo/org/marketing layer only. Do not publish renamed releases; do not change the Go
   module path.
6. **Agent/MCP depth: client flows plus one example.** Client-side OAuth 2.1 plus one
   runnable MCP example in Python. DPoP is a parity target, not a gate. Server-side
   resource protection, Dynamic Client Registration (RFC 7591), and Protected Resource
   Metadata (RFC 9728) are out of scope. The agent is a protocol-plane profile of the
   client, **not** a new canonical principal.
7. **Capability matrix v1.** Nine providers documented and source-cited, with live
   conformance only for the runnable subset (Descope, Ory, node-oidc-provider). Every cell
   labelled *documented* or *conformance-verified*.
8. **The brain is split across two homes.** The executable conformance spec lives in the
   identity-model monorepo under `spec/` where CI runs it; the planning repo publishes and
   indexes the public capability matrix.
9. **No external-validation gate.** Solo project, so the rename trigger is the author's
   judgement, guarded only by technical readiness checks: swap green in CI, conformance
   parity, and the OpenID re-certification path confirmed with the Foundation.
10. **Readiness was overstated, and this is the correction.** See below.

## The readiness correction — the most useful thing here

The brief and the research both claimed "it already exists — this is naming and
finishing." Two successive code audits proved that wrong, then partly wrong in the other
direction. The lesson generalises beyond this idea.

**First audit (2026-09-02)** found the adapter interface was **outbound-sync only**
(`sync_*`/`delete_*`, not get/create/list); the adapter-*selection* registry did not exist
(Descope was hardcoded in `dependencies/identity.py`); claim normalization was a hardcoded
`to_principal(claims, "Descope")` with Descope's own `dct`/`tenants` shape standing in for
"canonical"; and Ory was an enum value with no adapter, client, claim mapping, CI, or
compose. `DEPLOYMENT_MODE` swapped the middleware stack, not the IdP.

**Second audit (2026-09-03)** found the first one had been reading a **local checkout 19
commits behind origin/main**. The Ory feeder epics had already merged: `OrySyncAdapter`,
provider-driven token validation with Ory as a configured OIDC provider, a provider router,
an Ory seed script, migrations, JIT provisioning, a canonical `GET /api/identity`, and a
live Ory Network project. Most of the "net-new" work was already done.

**The lesson, which cost two corrections to learn:** always fetch and verify sibling repos
against origin before grounding a plan on them. Local checkouts in this workspace go stale,
and the drift is invisible until it has already shaped a document. Ground on source, never
on another planning artifact or a capability table.

## What the epics contained

Four epics, 32 stories, retired with the rest. Summarised because the shape is the
reusable part:

- **Epic A — Descope ⇄ Ory swap demo (12 stories).** Largely superseded by the merged Ory
  feeder work above. The genuine remainder was the swap demo itself, the
  zero-RBAC-migration invariant assertion, and end-to-end swap CI.
- **Epic B — agent/MCP OAuth 2.1 client (8 stories).** Mostly verification: auth-code+PKCE,
  token exchange (RFC 8693), and DPoP (RFC 9449) already shipped in Python and Go. Genuine
  net-new was the runnable MCP example and per-language quickstarts.
- **Epic C — "the brain" (capability matrix + management-plane conformance).** Genuinely
  net-new; `spec/management/` did not exist.
- **Epic D — brand at the cheap layer, name reservation, renames gated.**

The architecture carried ten ADRs, of which the load-bearing ones were: the canonical store
as RBAC system-of-record; the two-plane split between commodity protocol and moat
management; adapters declaring conformance against a versioned contract; and a governed
capability namespace rather than a free-form string list.

## If this is ever picked up

The cheap, reversible half was always the brand and name reservation. The expensive,
one-way half is the package renames, the Go module path, and OpenID re-certification —
which is exactly why decision 5 separated them.

Before restarting: re-verify the name availability and the trademark position (both were
checked in September 2026 and both are perishable), re-audit the sibling repos against
origin rather than trusting this document, and re-read the two research corrections above
before writing any positioning copy.
