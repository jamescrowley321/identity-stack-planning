---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-open-identity-2026-09-02.md
  - _bmad-output/planning-artifacts/research/market-open-identity-research-2026-09-02.md
session_topic: 'External naming, taglines, and positioning language for open-identity / open-identity-model (provider-agnostic portability framing)'
session_goals: 'Generate (a) headline taglines, (b) one-liner positioning statements, (c) per-persona messaging, (d) off-brand phrasings to avoid, (e) a light naming-collision check — all on a PORTABILITY + FEDERATION / "identity fabric for developers" frame, never a real-time "router" frame.'
selected_approach: 'AI-recommended multi-technique divergent run (headless)'
techniques_used: [First Principles Thinking, Analogical Thinking / Cross-Pollination, What If Scenarios, Metaphor Mapping, Reversal / Anti-Solution, Persona Journey / Role Playing, SCAMPER]
ideas_generated: 120+
context_file: ''
mode: 'headless (no user; run divergent techniques then converge)'
date: 2026-09-02
author: James
project: open-identity
---

# Brainstorming Session Results — open-identity Naming & Positioning

**Facilitator:** James (run headless by the analyst/facilitator agent)
**Date:** 2026-09-02

**Session frame (hard constraints, from the market research + brief):**

- **External frame is PORTABILITY + FEDERATION / "identity fabric for developers"** — a provider-agnostic identity layer, *not* a real-time-routing/arbitrage play. Identity is stateful and single-homed; login routing is deterministic Home Realm Discovery, not competitive per-request arbitrage.
- **Differentiation to convey:** (1) swap provider = **one adapter, zero RBAC migration**; (2) **management/RBAC-plane portability** (the proprietary layer where lock-in lives); (3) **verifiable openness** — OpenID-certified reference + a public cross-language conformance matrix; (4) **agent/MCP-ready** (polyglot OIDC/OAuth client aligned to MCP's OAuth 2.1 baseline).
- **Two brand pillars:** `open-identity` (full-stack reference / control plane — leads with the live provider-swap + zero-RBAC-migration demo) and `open-identity-model` (polyglot certified client-library layer — leads with OIDC/OAuth for AI agents & MCP).

---

## Recommended Shortlist for Main Session

> This section is placed at the top intentionally. It is the converged output; the full divergent set and technique work are below.

### Top 3 taglines (ranked)

**1. "Swap your identity provider. Keep your app."**
The single strongest headline. It is concrete, benefit-forward, and immediately legible to the highest-intensity persona (the Burned Migrator). It states the exact promise the market articulates unprompted ("your routes call `getUser`, not the vendor SDK; migrate by rewriting one file"), it is verb-first and memorable, and it structurally *cannot* be read as "router/arbitrage." Lifted almost verbatim from research §5's endorsed frame. Use as the primary org/repo/site headline.

**2. "One adapter, any provider — zero RBAC migration."**
The technical-credibility headline and the "aha" in one line. It names the precise differentiator that no competitor offers (management/RBAC-plane portability), it filters *for* the audience that feels the pain (they know exactly what "RBAC migration" costs), and it pairs naturally with the live Descope↔Ory swap demo. Best as the immediate sub-headline / hero-supporting line under #1.

**3. "Open identity. Provably open."**
The category + trust headline, and the one that earns the name. It converts the brand word ("open") from a claim into a *verifiable* asset — the OpenID-certified reference plus the public conformance matrix ("the brain"). It differentiates against both closed incumbents *and* nominally-open OSS providers (Keycloak/Ory/Zitadel) that still ship non-portable management models. Best as the trust/credibility banner and the anchor for "the brain."

### Recommended one-liner positioning statement

> **open-identity is the open, verifiable identity layer that lets developers swap or federate identity providers behind a single adapter — keeping users, roles, and tenants portable, with zero RBAC migration.**

Why this one: it leads with the category noun the research endorses ("identity layer" / portability-fabric), names *both* motions the product actually serves (swap = outbound portability; federate = run-multiple), foregrounds the real moat (users/roles/tenants = the management/RBAC plane), bakes in the proof word ("verifiable"), speaks at the **developer** altitude (differentiating from Strata's enterprise-IT identity orchestration), and never implies real-time routing. It is one sentence and reads cleanly as a GitHub org description or hero paragraph.

**Pillar-level split (recommended lead lines):**
- **open-identity** (reference/control plane): *"See a live provider swap with your roles and tenants intact."*
- **open-identity-model** (polyglot certified client library): *"Certified OIDC/OAuth for your apps and your agents — in Python, Go, and Rust."*

### Naming-collision flags for the main session to resolve

Recalled from prior knowledge; **not** the product of fresh exhaustive research (per instruction). Verify before any package/cert rename (these are the "one-way doors").

1. **HIGH — "Open Identity Platform" (github.com/OpenIdentityPlatform).** An active OSS community project that continues ForgeRock's formerly-open stack (OpenAM / OpenIDM / OpenDJ / OpenIG) after ForgeRock closed its source. This is a **direct, same-domain (open-source identity) collision** with `open-identity`. Highest-priority flag — verify current activity, trademark posture, and how strongly it owns the "open identity" phrase in developer search.
2. **HIGH — "IdentityModel" (Duende Software / Dominick Baier & Brock Allen) + `Microsoft.IdentityModel.*`.** "IdentityModel" is a very well-known .NET OSS OIDC/OAuth **client** library (and `IdentityModel.OidcClient`), and `Microsoft.IdentityModel.Tokens` is the ubiquitous .NET token namespace. `open-identity-model` sits in the *exact same category* (OIDC/OAuth client library) — the `-model` pillar is the closest collision of all. Flag hard for the client-library brand specifically.
3. **MEDIUM — "OpenID" / OpenID Connect / the OpenID Foundation.** "open-identity" literally reads as "Open Identity," which is what **OpenID** expands to. Double-edged: thematically apt (we're OpenID-*certified*), but risks being heard as a claim of affiliation with the standard/Foundation. Keep clear separation in copy ("OpenID-certified" as a proof point, never as identity). Confirm the Foundation is comfortable with the usage during the cert re-path conversation.
4. **MEDIUM — ForgeRock "Open Identity Stack."** ForgeRock historically shipped its OSS bundle under the **"Open Identity Stack"** brand; the sibling repo is literally named `identity-stack`. Legacy/dormant brand, but it lingers in identity-industry memory. Low active-conflict risk, worth a mention.
5. **LOW — "Open Identity Exchange" (OIX).** A real nonprofit / trade body for identity trust frameworks. Different altitude (policy/trust frameworks, not a dev product), but shares the "Open Identity" word pair. Low collision risk; note only.
6. **LOW — "OpenIddict."** A popular .NET OIDC/OAuth **server** library; phonetic proximity to "open-identity" only. Low risk; note for completeness.

**Net read:** `open-identity` (the org/reference brand) is *strong and largely clear* except for the "Open Identity Platform" OSS project (#1) and the OpenID phrase-overlap (#3). `open-identity-model` (the client-library brand) carries a **real, in-category** collision with the .NET "IdentityModel" family (#2) and should be pressure-tested — differentiate hard on "polyglot / Python-Go-Rust" (the .NET incumbents don't cover those) and consider whether the published *package* names need a distinguishing token even if the GitHub/marketing brand stays.

---

## Session Setup

**Approach:** AI-recommended, multi-technique, headless divergent run. Because no user is present, the workflow's interactive "one element at a time, wait for user" protocol is replaced with: run seven complementary ideation techniques back-to-back, deliberately pivoting creative domain to fight semantic clustering (per the workflow's Anti-Bias Protocol), generate a broad divergent set (120+ fragments/candidates), then converge to the ranked shortlist above and the curated lists below.

**Techniques selected (and why):**
1. **First Principles Thinking** — strip to what is literally, provably true so taglines survive a skeptic ("that's not how identity works").
2. **Analogical Thinking / Cross-Pollination** — borrow naming patterns from adjacent portability/BYO/fabric products (Terraform, Stripe, Kubernetes, ORMs, USB-C, ports & adapters).
3. **What If Scenarios** — break framing constraints to find surprising angles.
4. **Metaphor Mapping** — extend the endorsed "fabric/layer" metaphor and stress-test it.
5. **Reversal / Anti-Solution** — deliberately generate the *off-brand* phrasings to produce deliverable (d).
6. **Persona Journey / Role Playing** — voice each persona to produce deliverable (c).
7. **SCAMPER** — systematically transform strong candidates into variants.

---

## Technique Execution Results

### Technique 1 — First Principles Thinking (what is provably true?)

Grounding the language in claims that survive scrutiny, so no tagline overpromises.

- **[Truth #1] Login is already portable by standard.** OIDC/OAuth make a compliant client point at any compliant IdP. → *Do not* sell "we make login work across providers" (the standards already did). Sell what standards *don't* cover.
- **[Truth #2] Lock-in lives above the protocol.** Users, orgs, roles, permissions, tenants, claim shapes, admin/provisioning APIs are proprietary per vendor. → The honest headline is about the **management/RBAC plane**, not the login flow.
- **[Truth #3] Identity is stateful and single-homed.** Credentials/sessions/MFA live in one authoritative place. → Never imply real-time routing, arbitrage, "cheapest provider this second," or automatic failover.
- **[Truth #4] The economic hook is optionality at renewal.** "Keep users + roles portable so you can *re-quote* at renewal without a 3-month rewrite." → Insurance framing is defensible; "save money now" is not.
- **[Truth #5] "Open" must be earned.** Certified + public conformance matrix turns "open" from adjective to evidence. → "Provably/verifiably open" is a claim we can actually back.
- **[Truth #6] Two open OSS providers are no more swappable than two closed ones.** → We differentiate even against Keycloak/Ory/Zitadel, not just Auth0/Okta.

*Distilled first-principles positioning seeds:* "portability of the layer standards left proprietary"; "provider optionality as insurance"; "open, and able to prove it"; "swap without re-modeling."

### Technique 2 — Analogical Thinking / Cross-Pollination (borrowed naming patterns)

Transferring naming DNA from products that successfully sold portability/abstraction without overclaiming.

- **[Ports & Adapters / Hexagonal architecture]** → "adapter" is already the mental model devs trust. Lean into it: *"Ports and adapters for identity."* / *"Your app talks to a port, not a vendor."*
- **[ORM / database drivers]** → "We're the ORM for identity providers" — an abstraction over interchangeable backends *without* pretending they run simultaneously per-query. → *"An ORM for your identity provider."* (analogy line, not headline).
- **[Terraform "write once, provision anywhere"]** → *"Write your auth once. Run it on any provider."*
- **[USB-C / one connector]** → *"One connector for every identity provider."* (careful: connector can read as inbound-federation; keep "for your app's own provider").
- **[Stripe minimalism — verb + object]** → short imperative lines: *"Swap providers. Keep everything."*
- **[LLVM/JVM "one target, many backends"]** → *"One identity model. Any provider backend."*
- **[Git remotes / "portable by design"]** → *"Your identity, versioned and portable."*
- **[Kubernetes "no lock-in to a cloud"]** → *"No lock-in to an identity vendor."*
- **[Rosetta Stone / lingua franca]** → *"One canonical identity model every provider speaks."*
- **[Insurance / hedge]** → *"Auth insurance for the next renewal."* / *"Hedge your identity vendor."*

### Technique 3 — What If Scenarios (break the frame)

- **[What if the headline sold *the day you leave*?]** → *"Built for the day you switch providers."* / *"Ready for the renewal you can't predict."*
- **[What if we never said "provider" at all, only "your app"?]** → *"Your app owns your users. Your vendor is a detail."*
- **[What if "open" were the whole promise, proven?]** → *"Open by standard. Open by certification. Open by proof."*
- **[What if agents were the front door, not a footnote?]** → *"Identity for your apps and your agents — one library, any provider."*
- **[What if we named the fear directly?]** → *"Never rewrite your app for an auth vendor again."*
- **[What if we sold to the architect doing due diligence?]** → *"Check the conformance matrix before you bet on a provider."*
- **[What if the tagline were a test you could run?]** → *"Swap Descope for Ory. Watch your roles survive."*

### Technique 4 — Metaphor Mapping (extend "fabric / layer" — and its limits)

Endorsed metaphor from research: **portability + federation control plane = "identity fabric for developers."** Mapping the metaphor:

- *Fabric = woven from many threads (providers) into one cloth (your app-facing model).* → *"Identity, woven to be portable."* / *"One fabric over every provider."*
- *Layer = sits above providers, stable interface below churn.* → *"The portability layer for identity."* / *"A stable identity layer over a shifting vendor market."*
- *Plane = control plane vs data plane.* → *"The identity control plane you own."*
- **Metaphor stress-test / caution:** "identity fabric" is partly claimed by **Strata (Maverics)** at the *enterprise-IT/workforce* altitude. Differentiate by always appending **"for developers"** or "at the developer altitude." Do not let "fabric" alone become the headline — it invites the "isn't that Strata?" and "that's enterprise IT" reactions. Use "layer" (cleaner, developer-native) as the primary category noun; keep "fabric" as supporting texture.
- *Fabric that doesn't tear when you pull a thread* → *"Pull a provider out. Nothing tears."* (vivid zero-migration image.)

### Technique 5 — Reversal / Anti-Solution (generating the OFF-BRAND list on purpose)

Deliberately generating the phrasings we must **avoid**, and why — this *is* deliverable (d). (See the curated "Avoid these" section below for the finalized set with rationale.)

- Router/arbitrage words: "router," "route your logins," "cheapest provider," "real-time," "failover," "arbitrage," "bidding," "load-balance identity."
- Overclaim words: "any provider works instantly with zero effort," "no migration ever," "one-click switch" (RBAC-state migration is real work; the *demo* is zero-migration for the modeled case, not a universal magic button).
- Category-miscue words: "SSO for your customers," "connect your customers' IdPs" (that's Axis (a) / WorkOS territory — the opposite of our thesis).
- Standing-army words: "another auth provider," "yet another CIAM," "replace Auth0" (we are the *portability layer*, not a new vendor to be locked into).
- Vague-open words: unqualified "open" with nothing behind it (must always be paired with the proof).

### Technique 6 — Persona Journey / Role Playing (voicing each buyer)

This produced deliverable (c) directly — see the curated "Per-Persona Messaging" section below. Divergent lines captured here:

- **Burned Migrator (Priya):** "You already got the 3× renewal email. Next time, re-quote instead of rebuild." / "Your migration insurance policy." / "Keep your users and roles; change your mind about the vendor."
- **Multi-IdP Org (Marcus):** "Two directories from the merger, one interface for your app." / "Run every provider you inherited behind one model — and consolidate on your schedule." / "Region-specific IdPs, one canonical identity."
- **Agent/MCP Builder (Dana):** "Certified OIDC/OAuth for agents, in Python, Go, and Rust." / "MCP OAuth 2.1, not vendor-locked agent auth." / "Give your agents identity without betting on one vendor's agent product."

### Technique 7 — SCAMPER (transform the strongest candidates)

- **Substitute:** "Swap your identity *vendor*. Keep your app." (vendor vs provider — "vendor" sharpens the lock-in/economic read; "provider" is more neutral/technical). Keep both variants.
- **Combine:** merge #1 + #2 → *"Swap your provider behind one adapter — with zero RBAC migration."*
- **Adapt:** adapt the ORM analogy → *"The identity layer that treats providers like drivers."*
- **Modify/Magnify:** magnify proof → *"The only identity layer with a public conformance matrix."*
- **Put to other use:** aim at architects → *"Due-diligence-grade provider portability."*
- **Eliminate:** cut to two words → *"Portable identity."* / *"Open. Certified."*
- **Reverse:** state the anti-promise → *"No rewrite. No re-hash. No re-modeling."*

---

## Idea Organization — Curated Divergent Set

### (a) Headline Taglines — candidate set (15 curated, grouped by angle)

Grouped so the main session can pick a primary + supporting mix. The top 3 (starred) are the recommended shortlist above.

**Portability / swap (benefit-forward — lead with these):**
1. ⭐ **Swap your identity provider. Keep your app.**
2. **Swap your identity vendor. Keep everything.** *(sharper, more economic; "vendor" variant)*
3. **Write your auth once. Run it on any provider.**
4. **Change providers, not your codebase.**

**The differentiator / "aha" (technical credibility):**
5. ⭐ **One adapter, any provider — zero RBAC migration.**
6. **Swap the provider behind one adapter. Keep your roles and tenants.**
7. **No rewrite. No re-hash. No re-modeling.**

**Verifiable openness (trust / earns the name):**
8. ⭐ **Open identity. Provably open.**
9. **The only identity layer with a public conformance matrix.**
10. **Open by standard. Certified by proof.**

**Category / layer (positioning):**
11. **The provider-agnostic identity layer for developers.**
12. **The portability layer for identity.**
13. **The open identity fabric for developers.** *(use "fabric" only with "for developers")*

**Insurance / optionality (emotional hook for the Burned Migrator):**
14. **Your migration insurance for the next renewal.**
15. **Auth you can walk away from.**

### (b) One-Liner Positioning Statements (candidate set)

1. ⭐ **(RECOMMENDED)** open-identity is the open, verifiable identity layer that lets developers swap or federate identity providers behind a single adapter — keeping users, roles, and tenants portable, with zero RBAC migration.
2. open-identity is a provider-agnostic identity layer: implement one adapter to swap or run multiple identity providers without rewriting your app or migrating your RBAC.
3. A developer-facing portability layer over the identity management plane — normalize users, roles, and tenants once, and treat every provider (Descope, Ory, and beyond) as a swappable backend.
4. The open, OpenID-certified identity layer that turns "we support many providers" into a verifiable, testable claim — and turns switching vendors from a multi-month migration into a config change.
5. Identity portability and federation for developers: one canonical model, per-provider adapters, and a public conformance matrix that proves the portability is real.
6. *(agent-forward variant)* Certified, polyglot OIDC/OAuth for your apps and your agents — provider-agnostic across Python, Go, and Rust, aligned to MCP's OAuth 2.1 baseline.

### (c) Per-Persona Messaging

**Persona 1 — The Burned Migrator ("Priya," staff eng, Series-B B2B SaaS).**
*Pain:* 3× Auth0 renewal + Rules→Actions deprecation; dreading the password-hash migration; hand-rolling an anti-lock-in wrapper.
- **Headline for her:** *"You already got the 3× renewal email. Next time, re-quote — don't rebuild."*
- **Sub-line:** *"Keep your users, roles, and tenants in your own model. When a vendor triples the price, swapping is one adapter, not a three-month rewrite."*
- **Proof point:** *"Watch a live Descope→Ory swap with roles and tenants intact — zero RBAC migration."*
- **CTA:** *"Make your auth portable before your next renewal."*
- *Frame:* insurance / optionality, not ideology. This is the lead persona.

**Persona 2 — The Structurally Multi-IdP Org ("Marcus," platform lead, post-M&A).**
*Pain:* two inherited directories, region-specific IdPs for sovereignty; needs one app-facing interface + a path to consolidate without freezing features.
- **Headline for him:** *"Run every identity provider you inherited behind one model."*
- **Sub-line:** *"One canonical identity for your app; the merger's two directories and your region-specific IdPs sit behind adapters. Consolidate incrementally, on your schedule."*
- **Proof point:** *"Federate multiple providers today; migrate between them with your RBAC intact."*
- **CTA:** *"Unify now; consolidate when you're ready."*
- *Frame:* federation + incremental migration, not rip-and-replace.

**Persona 3 — The Agent/MCP Builder ("Dana," agent platform).**
*Pain:* needs OIDC/OAuth clients across Python/Go/Rust runtimes, aligned to MCP OAuth 2.1; doesn't want to bet on one vendor's agent product.
- **Headline for her:** *"Certified OIDC/OAuth for your agents — in Python, Go, and Rust."*
- **Sub-line:** *"Token acquisition, validation, discovery, PKCE, and proof-of-possession, aligned to MCP's OAuth 2.1 baseline — provider-agnostic, so your agents aren't tied to one vendor's agent stack."*
- **Proof point:** *"An OpenID-certified reference implementation and a working MCP OAuth 2.1 example per language."*
- **CTA:** *"Give your agents identity that isn't vendor-locked."*
- *Frame:* right-timed frontier wedge; lead here for `open-identity-model`.

### (d) Avoid These / Off-Brand Phrasings (with rationale)

1. **"the auth router" / "route your logins" / "identity router" / "real-time provider routing."**
   *Why avoid:* the entire reframe. Routing implies real-time, per-request selection among fungible backends. Identity is stateful and single-homed; login selection is deterministic Home Realm Discovery, not routing. Invites the credibility-killing "that's not how identity works."
2. **"Real-time provider arbitrage" / "cheapest provider per login" / "automatic failover between IdPs" / "load-balance your identity."**
   *Why avoid:* same root error as #1, and factually impossible — only one provider holds a given user's credentials. Promises the domain cannot deliver.
3. **"Zero migration, ever" / "one-click provider switch" / "migrate with no effort."**
   *Why avoid:* overclaim. The demo proves *zero RBAC/role/tenant migration* for the modeled case; password-hash portability and full data sync are still real work (and SCIM/provisioning is explicitly out of scope). Say "zero **RBAC** migration" — the precise, defensible claim — never bare "zero migration."
4. **"Connect your customers' identity providers" / "SSO for your app's customers" / "add SAML/SCIM for the enterprises you sell to."**
   *Why avoid:* that is Axis (a) — inbound B2B SSO federation (WorkOS/Scalekit/SSOReady). It is the *opposite* of our outbound-portability thesis and a crowded, funded lane. Miscategorizes us and picks a fight we don't want.
5. **"The last auth provider you'll ever need" / "replace Auth0" / "yet another CIAM."**
   *Why avoid:* frames us as *a provider to be locked into* — contradicting the whole "portability, not another vendor" position. We sit *above* providers; we don't replace one lock-in with another.
6. **Unqualified "open" / "the open identity platform" as a bare boast.**
   *Why avoid:* (i) empty unless paired with the proof (certified + conformance matrix); (ii) collides head-on with the existing **"Open Identity Platform"** OSS project (see flags). Always attach the evidence ("provably open," "certified," "public conformance matrix").

### (e) Naming-Collision Check (light, from recall — see top section for the full flag list)

Summary of what to verify before spending any one-way door (package/cert rename):
- `open-identity` core brand: mostly clear **except** the active OSS **"Open Identity Platform"** (ForgeRock-lineage) project and the phrase-overlap with **OpenID**. Verify both.
- `open-identity-model` client-library brand: **in-category** collision with the .NET **"IdentityModel"** family (Duende / `Microsoft.IdentityModel.*`). Differentiate on polyglot Python/Go/Rust; pressure-test the *published package* names specifically.
- Historical/low: ForgeRock **"Open Identity Stack,"** **Open Identity Exchange (OIX),** **OpenIddict.**

---

## Divergent Idea Log (raw quantity — for traceability)

Kept deliberately raw and unpolished to honor the "quantity before quality" mandate; the curated lists above are the distillation. ~120 fragments across domains:

**Swap/portability fragments:** swap the provider not the app · change vendors not code · keep your app, change your auth · one adapter to swap them all · portable by design · your users don't move when your vendor does · bring your own provider · BYO-IdP · vendor-swappable identity · the auth you can take with you · providers are pluggable · rip out a provider, keep the roles · migrate by editing one file · switch without a rewrite · your identity, not your vendor's.

**Adapter/interface fragments:** one adapter, any provider · ports and adapters for identity · your app talks to a port · providers behind adapters · the adapter pattern, for auth vendors · one interface, many backends · a driver model for identity providers · normalize once, swap forever.

**Management/RBAC-plane fragments:** zero RBAC migration · your roles survive the swap · portable users, roles, and tenants · keep the management plane, change the vendor · we abstract the layer standards left proprietary · roles and tenants, intact · the RBAC you own · migration without re-modeling · no role re-mapping · your permission model is yours.

**Verifiable-openness fragments:** provably open · certified open · open, and we can prove it · the public conformance matrix · verifiable portability · OpenID-certified reference · turn "we support many providers" into a test · conformance as a feature · due-diligence-grade openness · the brain: a public capability matrix · openness you can grep.

**Category/layer/fabric fragments:** the provider-agnostic identity layer · the portability layer for identity · identity fabric for developers · a control plane you own · the open identity layer · a stable layer over a shifting vendor market · identity, woven to be portable · one fabric over every provider · developer-altitude identity portability.

**Insurance/optionality fragments:** migration insurance · re-quote at renewal · hedge your identity vendor · built for the day you switch · optionality as a feature · negotiate from strength at renewal · the exit you hope you never need · price-shock insurance · never marry a vendor blind.

**Agent/MCP fragments:** identity for apps and agents · certified OIDC/OAuth for agents · MCP OAuth 2.1, not vendor-locked · polyglot agent auth · Python, Go, Rust — one client surface · give your agents portable identity · non-human identity without the lock-in · the certified client for the agent era.

**Anti-lock-in emotional fragments:** never rewrite for a vendor again · no re-hash, no re-model, no regret · the vendor is a detail · own your users · lock-in dissolved · walk away whenever · your data, your rules, any provider · the anti-lock-in identity layer.

**Alien-anthropologist / outsider fragments (fresh eyes):** "why is switching auth vendors a 3-month project when login is a standard?" · "why do your roles belong to your vendor?" · "why buy identity you can't take with you?" · make the weird thing (non-portable RBAC) visibly weird.

**Reversal fragments (what NOT to be):** not a router · not another vendor · not inbound SSO · not a magic button · not zero-effort · (used to seed the avoid-list).

---

## Session Highlights & Facilitation Narrative

**Creative journey:** Run headless, the session leaned on First Principles early to fence off every overclaim the market research warned about (router/arbitrage/zero-everything), which made the later divergence *safe to push* — every wild fragment could be checked against six known-true constraints. The most productive pivots were Analogical Thinking (the ports-and-adapters and ORM/driver analogies gave the "one adapter" line its credibility) and Reversal (generating the off-brand list on purpose sharpened the on-brand list by contrast).

**Breakthrough moments:**
- Recognizing that the market *states the value proposition unprompted* ("routes call `getUser`, not the vendor SDK") — so the strongest tagline is nearly a transcription of the buyer's own words → "Swap your provider. Keep your app."
- Converting "open" from an adjective into a *proof* ("provably open" backed by the conformance matrix) — the one move that both earns the name and differentiates from nominally-open OSS providers.
- Surfacing that the `-model` pillar's biggest risk isn't positioning but a **name collision** with .NET's "IdentityModel" — a finding the main session needs before it touches package names.

**Energy flow:** high-divergence throughout; converged only at the end into the ranked shortlist. Quantity target met (120+ fragments) before organization.

---

## Recommended Next Steps

1. **Main session:** adopt the top-3 taglines + recommended one-liner as the working headline set; A/B the primary headline ("Swap your identity provider. Keep your app.") against the differentiator line for the hero.
2. **Resolve collisions (before any rename):** verify **"Open Identity Platform"** (OSS) and the .NET **"IdentityModel"** overlap; confirm OpenID Foundation comfort with "open-identity" usage during the cert re-path conversation (research §7). These gate the irreversible package/cert renames.
3. **Pillar copy:** write two landing narratives — `open-identity` leads with the live swap demo; `open-identity-model` leads with certified polyglot agent/MCP auth.
4. **Feed the brief/PRD:** flow this language into `/bmad-create-prd` or a `/bmad-correct-course` sprint-change-proposal so positioning lands in the MVP messaging.

_This is a planning/brainstorming artifact only. No repositories, packages, or certifications were renamed. Local session; not committed._
