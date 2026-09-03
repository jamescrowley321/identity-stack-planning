---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'market'
research_topic: 'Open Identity — provider-agnostic rebrand & positioning pivot'
research_goals: 'Decision-support to determine whether to commit to the rebrand/positioning pivot: assess the competitive landscape, whether a provider-portability / identity-aggregation market gap genuinely exists, target customer segments, differentiation, and the risks — including rename blast-radius across published/certified package identities.'
user_name: 'James'
date: '2026-09-02'
web_research_enabled: true
source_verification: true
---

# Research Report: market

**Date:** 2026-09-02
**Author:** James
**Research Type:** Market Research

---

## Research Overview

This report is a **go/no-go decision instrument** for rebranding the auth workspace into **open-identity-model** (a polyglot, OpenID-certified client-library layer) and **open-identity** (a full-stack reference/control plane), under the working thesis that *provider swap = one adapter, zero RBAC migration* — with the planning repo as "the brain." Findings are drawn from six parallel, source-cited web-research streams (commercial CIAM vendors, open-source identity platforms, incumbents & the migration wave, market sizing & trends, lock-in pain & analogy transfer, and rename mechanics), all as of 2025–2026.

**Headline finding:** the *architecture is already latent and validated*, the *positioning lane is genuinely open*, and the *pain is primary-source-documented* — **but a real-time-routing/arbitrage analogy is the wrong external frame** for a stateful, single-homed, already-standardized domain, and a *bare OIDC SDK is commoditized*. The defensible value lives in the **management/RBAC plane** (which standards deliberately leave proprietary) and rides the **AI-agent/MCP** tailwind. The recommendation is a **Conditional GO**: commit to the brand and provider-agnostic positioning, **lead with a portability / "identity fabric" frame** (not real-time routing), anchor differentiation on management-plane abstraction + cross-language parity + agent/MCP, and **stage the rename** so the irreversible package/cert renames are deferred behind cheap repo/brand adoption until the positioning proves out. Full reasoning and the go/no-go framework are in §5 and §10.

---

<!-- Content appended through research workflow steps 1–6 -->

# Market Research: Open Identity — Provider-Agnostic Rebrand & Positioning Pivot

## Research Initialization

### Research Understanding Confirmed

**Topic**: A unified, provider-agnostic identity abstraction layer, delivered as a rebrand of the existing auth workspace into two brand pillars:
- **open-identity-model** — the polyglot, OpenID-certified client-library layer (one SDK surface across languages that speaks OIDC/OAuth2 to any provider). Umbrella over the existing `identity-model` monorepo, with `py-identity-model` as its certified Python reference that folds in.
- **open-identity** — a full-stack reference implementation / control plane demonstrating live provider-swapping.
- The planning repo becomes **"the brain"** — canonical spec + provider capability matrix + conformance.

**Core thesis**: Swapping or adding an identity provider (Descope, Ory, Auth0, Okta, WorkOS, Keycloak, Stytch, Clerk, Zitadel, etc.) should mean implementing **one adapter, not rewriting the application** — *provider swap = zero RBAC migration*.

**Goals**: Decision-support to determine whether to commit to this rebrand/positioning pivot (competitive landscape, gap existence, target segments, differentiation, risks incl. rename blast-radius).

**Research Type**: Market Research
**Date**: 2026-09-02

### Research Scope

Market size & dynamics of CIAM/developer-identity; customer segments & lock-in pain; competitive landscape with explicit attention to whether "provider abstraction / identity portability" is occupied or open; plus three pivot-specific decision factors — **rename blast-radius**, **differentiation defensibility**, and **naming/positioning viability** (does a real-time-routing/aggregation analogy transfer to a domain governed by OIDC/OAuth2 standards).

**Research Methodology:** Current web data (2025–2026) with source verification; multiple independent sources for critical claims; confidence-level assessment; grounded in the existing auth-workspace architecture (adapter ABCs, provider registry, canonical identity model, cross-provider claim normalization, multi-provider CI).

**Research Status**: Scope confirmed by user on 2026-09-02 — autonomous run authorized (no per-step gating). Six parallel research streams executed and cross-corroborated.

---

# Open Identity: A Market & Positioning Decision Report

## Executive Summary

The auth workspace is contemplating a rebrand to **open-identity** / **open-identity-model** under a **provider-agnostic portability** thesis — one adapter to swap any provider, zero RBAC migration. This research tests that thesis against the 2025–2026 market and returns a nuanced, actionable verdict.

**What's true and encouraging:**

1. **The architecture is already there.** The workspace has adapter ABCs, a provider registry that already knows Ory, a Postgres canonical identity model, cross-provider claim normalization, provider-agnostic OpenID-certified token validation, and multi-provider CI. The pivot promotes an *existing* engineering thesis to a brand — it does not require inventing the product.
2. **The positioning lane is open.** No vendor markets a provider-agnostic vendor-swap SDK / outbound identity-portability layer at the developer altitude. The naming space is unclaimed (high confidence).
3. **The pain is real and primary-source-documented.** Auth0's post-Okta pricing (Nov 2023: per-MAU ~2×, overage +300%, B2B moved to sales-only; Rules→Actions EOL Nov 2026), the "SSO tax," and concrete migrations (e.g. a company leaving Auth0 at 350k MAU saving ~$200k/yr) are the demand wedge.
4. **The best-timed piece is agent/MCP identity.** MCP standardized on OAuth 2.1 (Mar 2025, tightened Nov 2025); non-human identity is the fastest-growing, least-consolidated segment (~20–25% CAGR, directional). A polyglot OIDC/OAuth client layer maps directly onto it.

**What's cautionary and must reshape the plan:**

5. **The real-time-routing analogy misleads.** Real-time LLM routers work because LLM tokens are fungible, stateless, and interchangeable — enabling real-time price/latency arbitrage. **Identity is stateful and single-homed**: credentials/sessions/MFA live in exactly one place, and login routing is deterministic Home Realm Discovery, not competitive bidding. The honest, stronger frame is **portability + federation control plane** ("identity fabric"), a real funded category (Strata Maverics) — a real-time-routing/arbitrage promise, used as the *external* frame, would set expectations the domain can't and needn't meet.
6. **A bare OIDC SDK is commoditized.** Every mature language already has OIDC libraries; the login/token flow is *already portable* by standard. Defensibility must come from the **management/RBAC plane** (user store, roles/permissions models, admin/SCIM provisioning, normalized claims) — the layer standards deliberately leave proprietary and where every migration horror story lives.
7. **The neighbors are well-funded and moving up-stack.** WorkOS ($100M Series C at $2B, Mar 2026), Clerk ($50M Series C, Anthropic-backed), Stytch (acquired by Twilio, Nov 2025), Auth0/Okta, plus a crowded inbound-federation lane (Scalekit, SSOJet, SSOReady). Their entire retention model *is* the lock-in this layer would dissolve — so none will build it, but all can out-market a thin entrant.
8. **The rename is M–L effort and partly irreversible.** GitHub renames are cheap (auto-redirect); PyPI/crate names are *permanently consumed* and need shims; the **Go module-path change is a hard breaking change with an uncontrollable downstream tail**; OpenID re-certification is an open question. Renaming published, certified artifacts speculatively is a one-way door.

**Recommendation — CONDITIONAL GO** (see §10 for the framework): commit to the **open-identity / open-identity-model** brand and the provider-agnostic *portability* positioning; **lead externally with the portability / "identity fabric" frame, not a real-time-routing analogy**; anchor the product on **management-plane abstraction + cross-language parity + first-class agent/MCP**, not a bare SDK; and **stage the rename** — adopt the brand at the repo/org/marketing layer now, reserve the new package names defensively, and defer the breaking/irreversible package + certification renames behind a proof-of-positioning gate with a long deprecation window.

---

## Table of Contents

1. Introduction & Methodology
2. Market Analysis & Dynamics (sizing, trends, consolidation)
3. Customer Insights: Segments, Lock-In Pain & Decision Drivers
4. Competitive Landscape & Positioning (the two-axis map)
5. Why the Real-Time-Routing Analogy Fails for Identity (analogy transfer & positioning)
6. Strategic Recommendations (positioning, differentiation, go-to-market)
7. Rename Blast-Radius Assessment (pivot-specific decision factor)
8. Risk Assessment & Mitigation
9. Future Outlook & Opportunities
10. Go / No-Go Decision Framework & Recommendation
11. Implementation Roadmap
12. Methodology, Sources & Confidence Notes

---

## 1. Introduction & Methodology

**Why now:** Identity is simultaneously *growing* (IAM ~10–15% CAGR) and *consolidating* (Palo Alto Networks→CyberArk ~$25B; Twilio→Stytch), while a new frontier — identity for AI agents / MCP — is fragmenting across every vendor. Auth0's post-Okta pricing has produced a documented churn narrative. Into this, the workspace holds an unusual asset: a working, provider-agnostic architecture and an OpenID-certified client library. The question is whether to *name and position* that asset as a category play.

**Method:** Six parallel, source-cited research streams — (A) commercial dev/B2B CIAM vendors, (B) open-source identity platforms, (C) incumbents & the migration wave + the provider-portability category search, (D) market sizing & trends, (E) lock-in pain & routing-analogy transfer, (F) rename mechanics. Each stream was instructed to cite primary sources, flag vendor-authored/low-confidence claims, and steelman counter-arguments. Findings below are cross-corroborated; disagreements and confidence levels are called out.

**Grounding in existing assets** (from the workspace itself): `IdentityProviderAdapter` ABC + Descope/no-op adapters; a provider registry with an `ory` `ProviderType`; a Postgres canonical identity domain model; `idp_links` multi-provider identity linking; `ClaimMapper` (Descope/Ory/GenericOIDC) claim normalization; `py-identity-model` v3.11.3 (OpenID-certified, provider-agnostic); multi-provider CI (local + Ory + Descope). Ory is an active second provider (Epics 1–3 merged).

---

## 2. Market Analysis & Dynamics

### 2.1 Market Size & Growth

| Segment | 2024/25 base | Projection / CAGR | Confidence |
|---|---|---|---|
| IAM (overall) | ~$20–27B | ~$42.6B (2030) – $62.9B (2033); **10.4–15.3% CAGR** | Medium (multiple MR firms, consistent base, divergent tail) |
| CIAM | ~$12–20B | up to ~$51B (2035); **9.7–18% CAGR** | Low (≈60% spread in the 2025 base alone) |
| Auth / auth-as-a-service | ~$2.3–9.6B | **8–19.5% CAGR** | Low (definitions non-comparable; not a tier-1-tracked category) |
| Non-Human Identity (incl. AI agents) | ~$10.84B (2025) | ~$70.6B (2035); **~21.7% CAGR** (agent sub-segment ~25%) | Low on absolute $, but *direction* agreed across sources |

_Sources: MarketsandMarkets, Grand View, Fortune Business Insights, Mordor, Precedence, SNS Insider (all single-firm estimates — directional). Gartner "Magic Quadrant for Access Management," Nov 11 2025 (Leaders: Okta, Microsoft, IBM, Ping, Transmit Security) is the highest-confidence anchor._

**Read:** a real, low-double-digit-growth market; no source calls it flat. But the bare-SDK/auth slice is the smallest, most fragmented, and least analyst-tracked — a weak place to plant a flag. The growth and attention are at the **agent/NHI frontier** and in **fine-grained authorization**.

### 2.2 Trends

- **Passkeys / passwordless — mainstreamed:** 87% of enterprises deploying or piloting FIDO2 passkeys (HID/FIDO Alliance 2025 survey); 69% of consumers have ≥1 passkey, 48% of top-100 sites support them (FIDO Alliance, World Passkey Day 2025). *Table-stakes, not a land-grab.*
- **B2B "enterprise-readiness" (SSO + SCIM):** SSO/SCIM are now deal-blockers when selling upmarket; WorkOS's whole business proves the demand ($30M ARR Oct 2025 → $100M Series C at $2B, Mar 2026). Note: SSO is an OIDC/OAuth problem an SDK can serve; **SCIM provisioning is a separate protocol** an OIDC-client play does *not* cover.
- **AI agents / non-human identity / MCP — the clearest emerging category:** MCP adopted OAuth 2.1 as the remote-server authz baseline (Mar 2025, tightened Nov 2025 with proof-of-possession). Shipping products, not blog posts: Okta/Auth0 "Auth for GenAI" (Apr 2025), Microsoft Entra Agent ID, Clerk's Anthropic-backed "Agent Identity" ($50M Series C), Frontegg.ai + MCP AgentLink, Scalekit/WorkOS agent auth. **This is the single strongest tailwind for a polyglot OIDC/OAuth client layer.**
- **Fine-grained authorization (ReBAC/FGA):** a distinct, growing, open-source-led space — OpenFGA (CNCF), SpiceDB (AuthZed; used by OpenAI for ChatGPT Enterprise connectors), Oso, Cerbos, OPA, Ory Keto, Casbin. Being pulled forward by agent authorization needs.

### 2.3 Consolidation (2024–2026)

PANW→CyberArk ~$25B (announced Jul 2025); CyberArk→Venafi $1.6B (Oct 2024); CyberArk→Zilla ≤$175M (Feb 2025); Okta→Axiom (PAM); **Twilio→Stytch** (announced Oct 30 2025, closed ~Nov 14 2025 — consolidation reaching *developer CIAM*); SailPoint re-IPO (~$1.38B, Feb 2025). Structural theme: **AM + PAM + IGA + machine-identity converging into platforms.** The money and the moat are moving *up-stack*, away from thin client libraries.

---

## 3. Customer Insights: Segments, Lock-In Pain & Decision Drivers

### 3.1 Is provider lock-in a real, felt pain? — Yes, but located precisely

- **Password hashes are the hard wall.** Hashes are one-way; migration is "lazy re-hash on login" stretched over *months* (~20k hashes/hour; one documented case reached only 77% of active users after 2 months) — and only works if the old vendor lets you export hashes at all (several gate that behind enterprise tiers — a deliberate lock-in lever). _Source: WorkOS password-hash & Auth0-migration docs._
- **Migration is a re-modeling project, not a protocol swap.** War stories cite multi-role schema mismatches, deprecated permissions with no equivalent, dozens-to-hundreds of app integrations to re-test, and one Fortune-500 migration that "locked out 40% of the workforce." _Source: guptadeepak.com (vendor-adjacent, anecdotal)._
- **Concrete migrations (destinations matter):** Auth0 → MojoAuth at 350k MAU (~$200k/yr saved, 3-day migration); Auth0 → Supabase Auth (125k users). Repeatedly cited destinations: Clerk, Supabase, Better Auth, WorkOS, Keycloak, Ory, SuperTokens.
- **The "SSO tax" is the emotional anchor:** sso.tax "wall of shame"; GitHub ~525% and HubSpot ~5,000% SSO markups; the "seatbelt vs sunroof" debate. Adjacent to CIAM lock-in but it primes the "identity vendors gouge you" narrative the pivot can sell against.

### 3.2 The skeptic (steelmanned)

Most teams **never switch** their initial auth choice; self-serve CIAM is month-to-month (no *contractual* lock-in — the HN Auth0 thread's own commenters conceded the vendor was "in the right"); the login flow is *already* standard (OIDC/OAuth/SAML), so a standards-compliant provider + keeping your own user/authz data does most of the anti-lock-in work; and lazy re-hash means even passwords have a trodden path. **A heavyweight abstraction is genuine YAGNI for a small team on a standards-compliant provider.** The addressable pain is therefore *insurance for buyers who got burned or are structurally multi-IdP*, not a universal need.

### 3.3 Target segments (ranked by pain intensity)

1. **Burned migrators** — teams hit by an Auth0-style renewal shock who now want provider optionality as insurance. *Hottest, primary-sourced.*
2. **Structurally multi-IdP orgs** — B2B platforms, M&A directory consolidation, regulated/sovereignty-driven multi-region deployments.
3. **Agent/MCP builders** — need OIDC/OAuth clients across many languages/runtimes; least served, fastest growing.
4. **Anti-lock-in-by-principle developers** — already wrap auth behind an interface; the audience for an open, provider-agnostic library.

### 3.4 Decision drivers

Cost predictability (escape per-MAU/per-connection shocks) > data & RBAC ownership > standards-compliance/portability > DX > breadth of provider adapters. Notably, the pattern experienced teams already recommend — *"your routes call `getUser`, not the vendor SDK; migrate by rewriting one file"* — **is exactly the open-identity-model value proposition, stated by the market unprompted.**

---

## 4. Competitive Landscape & Positioning

### 4.1 The central insight: two different meanings of "multiple providers"

The market conflates — and only serves — one of two axes:

- **Axis (a) — inbound B2B SSO federation:** "let *your app* connect to *your customers'* many IdPs (Okta, Entra, Google…) behind one integration." **Crowded & well-capitalized.**
- **Axis (b) — outbound vendor portability:** "let *you* swap *your own* auth vendor (Auth0 ↔ Cognito ↔ Descope ↔ Ory) with one adapter, zero rewrite." **This is the pivot's thesis — and it is essentially OPEN at the developer/CIAM layer.**

### 4.2 Competitor map

| Player / category | What they abstract | Axis | Threat to the thesis |
|---|---|---|---|
| **WorkOS** ($2B, Mar 2026) | Customers' IdPs (SAML/OIDC/SCIM inbound) + AuthKit/FGA/agent | (a) | You get locked *into* WorkOS; not a swap layer |
| **Stytch** (→ Twilio, Nov 2025) | API-first auth primitives + B2B SSO inbound | (a) | Single provider; now inside Twilio |
| **Clerk** ($50M Series C) | Drop-in React user management + orgs | single provider | High UI-level lock-in |
| **Frontegg / Kinde / Descope** | Multi-tenant CIAM, flows, RBAC | single provider | Deep management-plane lock-in (the moat) |
| **Auth0 / Okta** ($6.5B; MQ Leader 9 yrs) | Incumbent CIAM; Rules→Actions | single provider | The *source* of the pain, not the cure |
| **Open-source: Keycloak (36.5k★), Authentik (25.3k★), Ory (17.5k★), Zitadel (14.9k★, now AGPL), SuperTokens (15.3k★), FusionAuth (closed core)** | Self-hostable IdP; "identity brokering" federates IdPs *in* | (a) + self-host | Solve "leave the host," not "swap A for B"; two OSS providers are no more swappable than two closed ones |
| **Inbound-federation infra: Scalekit ($5.5M), SSOJet, SSOReady (OSS, 1.5k★)** | Customers' IdPs (WorkOS-style) | (a) | Crowded lane; not the thesis |
| **Auth libraries: Auth.js (28.4k★, 80+ providers), Passport (23.5k★, 500+ strategies), Better Auth (13k★, MIT)** | *Login sources* (Google/GitHub/SAML) behind one interface — **login/session only** | pattern-adjacent | Prove the "many behind one interface" pattern is loved — but "provider" = login source, not swappable *vendor*; no management plane |
| **Identity Orchestration / "identity fabric": Strata (Maverics)** | **Abstraction layer over apps + IdPs; migrate between IdPs, run multiple, no app rewrite** | **(b)!** | **The closest real occupant of the thesis** — but targets *enterprise IT / workforce IdPs* (e.g. Kroger 300+ apps SiteMinder→Entra), **not SaaS-developer CIAM.** Different buyer, different altitude. |

### 4.3 Verdict on the gap

- The **exact naming/positioning** ("provider-agnostic identity SDK / outbound vendor-portability layer") is **unclaimed** (high confidence).
- Axis (a) is **taken and funded** — do not enter head-on.
- Axis (b) at the **developer/CIAM layer is open**; the only real occupant (Strata) sits in enterprise-IT identity orchestration, validating the *pattern and the pain* while leaving the *developer altitude* free.
- The **deepest moat and the true white space is the management/RBAC plane.** OIDC already makes login portable; what's *not* standardized — user/org/role/permission models, Rules/Actions pipelines, admin/SCIM APIs, provider claims — is where lock-in lives, and no one offers a normalized-model + RBAC-migration layer over multiple vendors. (Watch: AuthZEN and Shared Signals/CAEP are standards creeping into the authz-*query* side — they could erode the query moat, but how roles/permissions are *defined & stored* stays vendor-specific longer.)

---

## 5. Why the Real-Time-Routing Analogy Fails for Identity

**Why real-time LLM routing works:** a single OpenAI-compatible endpoint over 400+ models / 60+ providers, one key & billing, real-time **price/latency arbitrage** (default weighting ∝ inverse-square of price), automatic failover, ~5.5% fee. Value exists because LLM APIs are **proprietary/non-standardized** *and* the underlying good (tokens for a model) is **fungible and stateless** — any provider can serve request N with no memory of N-1.

**Where the analogy breaks for identity:**

1. **Login is already a standard.** OIDC/OAuth/SAML mean a compliant client points at any compliant IdP. The "unify proprietary APIs" value that a real-time LLM router creates is *already delivered by the standards bodies* for the login/token flow. Little aggregation value remains in the standardized part.
2. **Identity is stateful & single-homed.** A user's credentials, sessions, MFA enrollments, and directory record live authoritatively in **one** place. Provider selection at login is **Home Realm Discovery** — deterministic, domain/tenant-based routing to the user's *own* IdP — **not** price/latency arbitrage. You cannot send login N to "whichever IdP is cheapest this second"; only one holds that user's credentials.
3. **So the value is portability + federation, not live routing.** The correct analog is **identity orchestration / identity fabric** (Strata) — a control plane to *migrate between* and *federate across* providers behind a stable app-facing interface — a migration/composition layer, not a per-request cost router.

**The one arbitrage-flavored angle that *does* transfer:** vendor optionality at the **control plane, at renewal time** — "keep your users + roles portable so you can *re-quote* your CIAM provider without a 3-month migration." That is the credible economic hook, and it's precisely what SSO-tax/Auth0 anger is primed to buy.

**Positioning conclusion:** The provider-agnostic thesis is right (*one interface, BYO-provider*), but **do not ship a real-time-routing/arbitrage promise as the external frame** — it implies routing the domain can't and needn't deliver, inviting "that's not how identity works" objections. External frame options (all portability/fabric-shaped):
- *"Swap your identity provider. Keep your app."*
- *"The provider-agnostic identity layer."*
- *"Identity portability & federation for developers."*
- *"One adapter, any provider — zero RBAC migration."*

---

## 6. Strategic Recommendations

1. **Adopt the brand; lead with portability.** `open-identity` / `open-identity-model` are strong, credible, collision-free names that signal exactly the right thing (open, provider-agnostic). Lead with a portability/fabric narrative, not a real-time-routing analogy.
2. **Anchor on the management/RBAC plane + agent/MCP — not a bare OIDC SDK.** The login library is table-stakes and commoditized. The defensible product is: a **normalized users/orgs/roles/permissions model with per-provider adapters + RBAC-state migration tooling**, plus **first-class OIDC/OAuth for agents/MCP** across languages. Lead `open-identity-model`'s external story with *polyglot OIDC/OAuth client for agents & MCP* (best-timed, least-consolidated); lead `open-identity` with a **live provider-swap + zero-RBAC-migration demo** (the "wow" that proves the thesis).
3. **Make "the brain" a real, differentiating artifact.** A public **provider capability matrix + cross-language conformance spec** (which the planning repo already trends toward) is a credibility moat competitors won't replicate — it turns "we support many providers" into a verifiable, testable claim.
4. **Sell insurance, not ideology.** Go-to-market to *burned migrators* and *structurally multi-IdP* buyers with a concrete "re-quote your CIAM without a rewrite" message; ride the Auth0/SSO-tax narrative rather than arguing abstract portability to teams that will never switch.
5. **Don't fight Axis (a) head-on.** Position as complementary to / above WorkOS-style federation, not as another SSO-as-a-service.

---

## 7. Rename Blast-Radius Assessment (pivot-specific)

Ranked cheapest → hardest; the rename is doable but **partly irreversible**, effort **M–L**, dominated by the Go module path and the external-consumer tail.

| Surface | Nature | Redirect? | Effort |
|---|---|---|---|
| **GitHub repos** | Auto-redirects web + git + issues/stars | Yes — *but old name is burned* (reusing it kills redirects); **Pages & Actions refs NOT redirected** | **S** |
| **PyPI** (`py_identity_model`) | No in-place rename; publish-new + **dependency-shim** final release so `pip install old` still resolves | Partial — `pip install` redirects; **`import` name does NOT** auto-redirect | **S–M** |
| **crates.io** (`rs-identity-model`) | No rename, no transparent shim; consumers edit `Cargo.toml` + `use`; `pub use` re-export eases it; `cargo yank` old | Weak (docs + yank only) | **S–M** |
| **Go module path** | **Hard breaking change** — every importer edits every import; `retract`/`replace`/`// Deprecated:` are advisory only, not redirects | **No** | **M–L** (L if external importers exist) |
| **OpenID Certification** | Entries are dated, self-declared, name-bound records; a rename almost certainly means a **new/updated submission** under the new name | Unknown | **S–M paperwork** ⚠️ low confidence — confirm with `certification@oidf.org` |

**Irreversible / one-way:** PyPI + crate **names are permanently consumed**; crate **published versions** can never be reused; a burned GitHub name; the old OpenID listing stays as a historical record. **Reversible:** `cargo yank --undo`, GitHub rename-back, a further Go release — but none *un-break* consumers who already migrated.

**Sequencing:** (1) **reserve** new PyPI/crate/GitHub names defensively *now*; (2) rename GitHub repos (fix Pages/Actions); (3) treat the Go rename like a new major version — publish the new path, consider a **vanity import path** (`go.<domain>/…`) to insulate against future renames, ship `// Deprecated:` + migration guide; (4) PyPI/crate new names + shims + yank in parallel; (5) update all docs/badges/cross-repo pins (e.g. `identity-stack`'s dependency) together; (6) OpenID re-cert last, after confirming the process.

**De-risking move (recommended):** **decouple brand adoption from package rename.** Adopt `open-identity` at the repo/org/product/marketing layer immediately (cheap, redirecting), reserve the new package names, and **defer the breaking/irreversible PyPI/crate/Go/cert renames** until the positioning proves out. This buys the brand upside without spending the one-way doors prematurely.

---

## 8. Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| **Analogy backfire** — a real-time-routing framing invites "that's not how identity works" | High | Lead with portability/fabric externally (§5); avoid routing/arbitrage claims |
| **Commodity trap** — ships as yet-another OIDC SDK vs. funded incumbents | High | Anchor on management/RBAC-plane abstraction + agent/MCP + conformance matrix (§6); don't rebrand for a bare SDK |
| **Rename irreversibility** — spend one-way doors on an unproven pivot | Med–High | Stage the rename; reserve names; defer package/cert renames behind a proof gate (§7) |
| **Execution capacity** — management-plane abstraction + cross-language parity is the *hard* part | High | Be honest about whether the team can sustain it; if not, the pivot is cosmetic |
| **Incumbent out-marketing** — well-capitalized neighbors, some Anthropic/Twilio-backed | Med | Compete on openness + verifiable conformance + a niche (agent/MCP portability), not on breadth or spend |
| **Moat erosion** — AuthZEN / Shared Signals standardize the authz-query side | Med (slow) | Moat is in role/permission *modeling + migration*, which stays vendor-specific longer; track the standards |
| **Small addressable pain** — most teams never switch (YAGNI) | Med | Target burned/multi-IdP/agent segments, not the universal market; sell insurance |
| **Consolidation** — market rolling up-stack | Med | Play the fragmenting frontier (agent/MCP), not the consolidating core |

---

## 9. Future Outlook & Opportunities

- **Near-term (1–2 yr):** agent/MCP identity fragments across every vendor — *strengthening* the case for a provider-agnostic client layer. Auth0-style pricing events keep producing migrators.
- **Medium-term (3–5 yr):** SCIM + AuthZEN + Shared Signals push standards up into the management plane; the portability layer's value migrates from "protocol shim" toward "role/permission modeling + migration + policy." Whoever owns the **conformance/capability spec** ("the brain") has a durable, hard-to-copy asset.
- **Opportunity:** be the **open, verifiable, polyglot portability + agent-identity layer** — the piece the consolidating platforms structurally *won't* build because it dissolves their lock-in.

---

## 10. Go / No-Go Decision Framework & Recommendation

Decide **GO** if the team can commit to all three:
- [ ] **Frame** — lead externally with a portability/fabric frame, not a real-time-routing analogy.
- [ ] **Anchor up-stack** — build/sustain the **management-plane abstraction + cross-language parity + agent/MCP**, not just a login SDK.
- [ ] **Stage the rename** — brand now, reserve names, defer irreversible package/cert renames behind a proof-of-positioning gate.

Decide **NO-GO / DEFER** if:
- The pivot would be *cosmetic* (rename without the management-plane investment) → you'd spend one-way doors to become a commodity SDK against funded incumbents.
- The team can't sustain cross-language parity + the conformance spec (the actual moat).

**Recommendation: CONDITIONAL GO.** The brand is strong and unclaimed, the positioning lane is open, the architecture already exists, and the pain is real — *provided* the metaphor is reframed, the product is anchored on the management/RBAC + agent/MCP layer, and the rename is staged so the irreversible steps wait for validation. Committing to the *brand and positioning* is low-regret and reversible-enough; committing to the *published-package rename* should be gated on early positioning traction.

---

## 11. Implementation Roadmap (if GO)

**Phase 0 — Decide & protect (days):** ratify the reframed positioning; **reserve** `open-identity` / `open-identity-model` on GitHub org, PyPI, crates.io (placeholder holds); confirm OpenID cert rename process with the Foundation.
**Phase 1 — Brand at the cheap layer (1–2 wk):** rename GitHub repos/org (fix Pages/Actions/badges); update the planning repo ("the brain") README + positioning; publish the provider capability matrix + conformance spec as the public artifact. *No package renames yet.*
**Phase 2 — Prove the thesis (weeks):** ship the `open-identity` **live provider-swap + zero-RBAC-migration demo** (Descope↔Ory, leveraging the existing adapter/registry/claim-mapper); publish the `open-identity-model` **agent/MCP OIDC client** story across languages.
**Phase 3 — Gate & (maybe) rename packages:** if positioning gains traction, execute the staged package rename (Go vanity path + shims + yank + long deprecation) and OpenID re-cert. If not, keep the brand at the product layer and skip the irreversible spend.

_This roadmap is a research recommendation, not an execution authorization. No renames or destructive changes have been made._

---

## 12. Methodology, Sources & Confidence Notes

**Confidence tiers:** *High* — Gartner MQ (Leaders), documented M&A (Okta/Auth0 $6.5B, Twilio/Stytch, PANW/CyberArk), Auth0's own Nov-2023 pricing post, sso.tax markups, password-hash one-wayness, HRD/federation mechanics, real-time LLM-routing/aggregator docs, GitHub-star counts & OSS licenses (primary), package-rename mechanics (official docs). *Medium* — vendor ARR/valuation estimates, migration destinations, pricing tiers. *Low* — all market-size dollar figures (single-firm estimates, wide spreads), passkey-adoption percentages (alliance surveys), "60% of Fortune 500 run production agents," OpenID-cert rename process.

**Corrections captured during research:** (a) Twilio acquired **Stytch**, *not* WorkOS (WorkOS is independent) — vendor blogs got this wrong. (b) SuperTokens raised a **YC seed only** — the "$120M / $1.92B valuation" figure circulating in AI-summarized results is **false**. (c) Auth0 Rules/Hooks went **read-only Nov 18 2024**; full **EOL is Nov 18 2026** (not "stopped working in 2024").

**Key sources (representative):** WorkOS Series C & pricing; Twilio–Stytch acquisition; Clerk Series C; Descope $88M seed; Auth0 pricing-change blog & Rules/Hooks EOL docs; sso.tax; HN Auth0 pricing threads; guptadeepak migration write-ups; FusionAuth "avoid lock-in"; Strata Maverics identity-orchestration + Microsoft/Kroger case; Passport.js / Auth.js / Better Auth repos; Ory/Keycloak/Zitadel/SuperTokens/Authentik/FusionAuth repos & licenses; Gartner MQ (Okta reprint); FIDO Alliance passkey stats; MCP OAuth 2.1 spec posts; OpenFGA/SpiceDB; PyPI/PEP 423, Go modules reference, Cargo publishing/yank docs, GitHub rename docs, OpenID Foundation certification pages.

---

## Conclusion

The pivot's instincts are right: the workspace already *is* a provider-agnostic identity stack, the positioning lane is genuinely open, the naming is unclaimed, and the lock-in pain is real and documented. The research's job was to keep the enthusiasm honest — and it surfaces two disciplines the pivot must adopt to succeed: **reframe the metaphor** (identity is stateful and standardized; sell portability/fabric, not real-time routing) and **anchor the product up-stack** (management/RBAC-plane abstraction + cross-language parity + agent/MCP, not a commodity SDK). Do those, stage the rename to protect the irreversible steps, and the rebrand is a low-regret, well-timed bet on the one part of identity the consolidating incumbents structurally cannot serve.

---

**Market Research Completion Date:** 2026-09-02
**Research Period:** 2025–2026 current market analysis
**Source Verification:** All material claims cited; confidence flagged
**Overall Confidence:** Medium-High on competitive/positioning findings and rename mechanics; Low on absolute market-size figures

_Decision-support research artifact for the open-identity / open-identity-model rebrand & positioning pivot. No repositories, packages, or certifications were renamed or modified in producing this report._
