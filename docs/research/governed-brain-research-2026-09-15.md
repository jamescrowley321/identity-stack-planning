---
title: "Governed Brain — Research Findings"
sidebar_label: "Research findings"
description: "Four independent research passes against the governed-brain documents, with six lane reports beside them."
last_verified: 2026-09-16
workflowType: 'research'
research_type: 'technical'
research_topic: 'Governed brain — standards prior art, relationship authorization, agent-memory landscape, receipts and audit'
research_goals: 'Test the governed-brain concept, authorization model, and implementation plan against the current state of the relevant standards, the deployed relationship-authorization field, the agent-memory market, and consent-receipt prior art — so the design reuses what exists, drops what it overclaims, and knows which of its own gates it cannot currently meet.'
user_name: 'James'
date: '2026-09-15'
web_research_enabled: true
source_verification: true
status: proposed
---

# Governed Brain — Research Findings

**Date:** 2026-09-15
**Subject:** `docs/governed-brain-concepts.md`, `docs/governed-brain-authorization.md`,
`docs/governed-brain-implementation-plan.md`

Four independent research passes, each run in its own context against the three
documents, plus two relayed sub-passes. Every pass was given the same
constraints: verify current status on the web rather than from memory, cite a
URL and a section number for anything normative, and distinguish a published
standard from an active draft from an expired one. The lane reports sit beside
this file and carry the full evidence; this document is the synthesis.

## How to read this

- **Verified here** means the primary text was fetched and read during this
  session. Only the Phase 1 sequencing items below carry that label; the
  correction they produced is already committed.
- **Reported** means a lane pass fetched and cited it. The URL and date are in
  that lane's report. Treat these as good but unaudited.
- **Unverified** is listed explicitly at the end. Nothing in that list should be
  cited into a document without checking it first.

Nothing in the lane reports names an organization, product, deployment, or
regulated domain belonging to this workspace, and the whole set was scanned
before it was committed.

## Verdicts

| Lane | Verdict | In one sentence |
|---|---|---|
| Standards prior art | **Sound, but re-invents three things and mis-argues its own gate** | The thesis and layering survive; the `brain_access` detail, the federation section, and the brain descriptor each duplicate something that reached Final or Proposed Standard since the source material was written |
| Relationship authorization | **Sound with caveats — one item actively wrong** | The provider-neutral port is how the field actually deploys this, but its API cannot express the guarantee the design depends on, and no safe bulk filter exists anywhere |
| Agent-memory landscape | **Partly closed — the headline claim fails** | Actor, class-of-record and freshness all ship today; what is genuinely unoccupied is *acting for this subject* and *for this purpose*, and the composition of all five |
| Receipts and audit | **No profile to adopt — one to assemble** | Four bodies of prior art each cover a third of the problem, and nothing in `BR-REQ-01..16` makes a receipt verifiable by anyone |

## What changes the design

Five findings are load-bearing. Each invalidates something the documents
currently assert or assume, rather than merely improving it.

### 1. Phase 5's data boundary has no supported implementation

The plan's policy-composition phase assumes authorization can pre-filter the
candidate set. No relationship-authorization engine supports that at scale.
Zanzibar has no list API at all. OpenFGA's `ListObjects` truncates at 1,000
results or 3 seconds — **silently**. SpiceDB's own advisory (GHSA-m54h-5x5f-5m6r)
states `LookupResources` "should not be used for access-control decisions," with
two further partial-result advisories behind it.

The universal answer in the field is a change-stream-fed materialized projection
— Zanzibar's Leopard, OpenFGA's changes endpoint, AuthZed's Materialize (early
access, commercial). That is an architectural layer the design does not have.
The correct shape is a projection that **may only ever narrow** the candidate
set, never widen it.

Ordering matters independently of the mechanism: a TrustNLP 2026 paper with this
proposal's exact premise measured retrieve-then-filter exposing unauthorized
context in **86.1% of queries**. The security invariant should require the
authorization predicate to constrain the candidate set *before* any learned
component runs, not merely that it runs.

### 2. Phase 6's gate is unmeetable as written

Phase 6's done-when says a disclosure "produces a **verifiable** receipt."
Nothing in `BR-REQ-01..16` makes a receipt verifiable by anyone. `BR-REQ-13`
asks for "correlated audit evidence," which a row in the operator's own database
satisfies; `BR-REQ-14` protects messages in transit, not the receipt artifact.
A signature alone gives authenticity but not non-repudiation — equivocation,
omission, and backdating all survive it, and the verifier would be the disputed
party.

The assembled answer: a signed receipt plus **permissioned** append-only
transparency anchoring over digests, using RFC 9942 (COSE Receipts) and RFC 9943
(SCITT), both Standards Track as of June 2026. RFC 9943 §8 explicitly permits
retaining cryptographic metadata rather than complete signed statements, and
§8.2 keeps the service inside the confidentiality boundary — unlike RFC 9162
Certificate Transparency, whose §4 pushes operators toward unrestricted
retrieval. For exactly two authorities, mutual witnessing needs no public log
and no third party.

Rejected with reasons: verifiable credentials as the receipt envelope (built for
holder presentation, drags in DID resolution and status lists whose herd privacy
needs 131,072 entries, and receipts are never revoked — only superseded); a
plain signed audit record (omission undetectable, fails portability); public
ledger anchoring (EDPB Guidelines 02/2025 v2.0, adopted 2026-07-07, advises
against personal data on immutable structures even when hashed).

### 3. The port's API cannot express the guarantee it depends on

`consistency_requirement` as a scalar cannot abstract over the candidate
engines. SpiceDB's contract is `(mode, ZedToken)`; OpenFGA's is a two-valued
enum with no token; **Ory Keto declares `snaptoken` and `latest` in its Check
proto and annotates both "This field is not implemented yet and has no effect."**
A scalar silently resolves to the weakest member, and Keto proves an engine can
silently downgrade underneath it.

Worse, the zookie is a **bidirectional protocol, not a parameter**. Zanzibar
requires a content-change check at write time, returning a token the application
stores *atomically with the content*, replayed on every later check. A port whose
only operation is `check()` cannot implement it — which means the new-enemy
problem is unaddressable and the design's own negative test, "stale permission
survives revocation," cannot pass.

Measured numbers the design should carry instead of adjectives: Zanzibar's
Table 2 gives Check Safe at 9.46ms p95 against Check Recent at 60.0ms — roughly
6× for freshness — and ~99% of Google's checks run deliberately ≥10s stale.
Cache hit rate is ~10%: caches shed hot spots, they do not serve traffic.
Revocation windows, as reported: OpenFGA 10s; SpiceDB ≈20.6s derived, ~40s on
hot keys; OPA 60–120s bundle polling; CAEP session-revoked events up to 15
minutes upstream. A standing agent grant can outlive a revocation by all of
that, which is an argument for local grant state as the authority rather than an
upstream check.

### 4. `brain_access` has no comparison algorithm, and that is a hard blocker

RFC 9396 §6.1 states there is **no standardized comparison mechanism** for
authorization details and delegates it to the type definition. Without one, the
authorization server cannot decide when a request is covered by an existing
grant and when re-consent is required. Five further defects in the same detail:
`"type":"brain_access"` ignores §2.1's RECOMMENDED collision-resistant URI
namespace (a multi-authority design is exactly that case); `"version"` is not an
RFC field and belongs folded into the type URI; `brain`/`collections`/`record_ids`
reinvent the §2.2 common fields `locations`/`datatypes`/`identifier`; §3.1 grants
scope and authorization details as a merged union, so the documents must state
that scope MUST NOT confer brain access; and §7/§7.1 make only the *granted*
(possibly enriched) detail authoritative, which the security invariant does not
currently distinguish. There is no IANA registry of RAR types (§10, §14), so no
status can be claimed for the name.

### 5. Purpose cannot be proven — only declared, bounded, and recorded

This is the one place all four lanes converge, and the design currently treats
purpose as if it were verifiable.

- Only **provenance** is attestable. Cedar has no cryptographic operators at
  all; OPA has `io.jwt.decode_verify`. NIST SP 800-162 and XACML both place
  attribute truthfulness outside the engine and outside the spec.
- The only production purpose-binding found anywhere is a sector profile in a
  regulated domain (out of scope here, and deliberately unnamed): a required
  purpose member inside a signed client JWT, valued from a governed code set,
  where the governing procedure states that including the code is an
  **attestation** that the transaction complies. Asserted, not proven; enforced
  by contract.
- Transaction Tokens carry no purpose claim — the draft says "the scope claim
  captures, as narrowly as possible, the purpose of this particular
  transaction."
- W3C DPV 2.3 (2026-02-25) supplies the purpose taxonomy the documents require
  but never name. Its standing must be stated honestly: a Final **Community
  Group** Report that says outright it "is not a W3C Standard nor is it on the
  W3C Standards Track."

So the defensible rule is a three-way split — vocabulary (adopt DPV), provenance
(who declared it, signed), truth (out of reach) — plus an entitlement to declare
a given purpose, absence treated as deny, and the declared purpose recorded in
the receipt as an attestation rather than a fact.

## What to reuse instead of invent

| In the documents | Already exists | Status as reported |
|---|---|---|
| `BrainDescriptor` (BR-REQ-01, BR-REQ-15) | RFC 9728 Protected Resource Metadata — `resource`, `authorization_servers`, `jwks_uri`, `signed_metadata`, `WWW-Authenticate: resource_metadata` | Published, April 2025 |
| Hand-rolled "Federation metadata" | OpenID Federation 1.0 — entity statements, trust chains, trust marks, cascading metadata policy that cannot be made more permissive | **Final 2026-02-17**; 1.1 and Federation-for-OIDC 1.1 Final 2026-05-06 |
| The relationship-authorization port's request shape | AuthZEN Authorization API 1.0 — subject/action/resource/context, `/.well-known/authzen-configuration` | **OpenID Final Specification, 2026-01-11** |
| The broker/token-exchange step, derived from RFC 8693 alone | OAuth Identity Chaining | draft-17 (2026-07-19), awaiting RFC Editor |
| Cross-service propagation of subject + purpose in Phase 5 | Transaction Tokens | draft-11 (2026-07-30), Waiting for Write-Up; **no purpose claim** |
| Onward-delegation control (BR-REQ-07) | `may_act` (RFC 8693 §4.4) | Published |
| Revocation observability (BR-REQ-09) | OpenID Shared Signals / CAEP | SSF/CAEP 1.0 Final, 2025-09-02 |
| Receipt integrity | RFC 9942 COSE Receipts, RFC 9943 SCITT | Both Standards Track, June 2026 |
| Purpose vocabulary (BR-REQ-06) | W3C DPV 2.3 | Final CG Report 2026-02-25 — **not** a W3C Standard |

Two caveats on adoption. **AuthZEN standardizes only a boolean decision**, with
reasons and obligations explicitly out of scope, defines no PDP-failure
behavior, makes Search advisory, and is not implemented by SpiceDB — so
portability and causal correctness currently point at different engines. The
recommendation is an AuthZEN-shaped request and context with a richer local
response type, and the mapping documented. And **"federation" now collides**:
OpenID Federation means trust establishment, these documents mean cross-brain
disclosure. They compose — 1.1 defines no authorization grants — but the
vocabulary has to be disambiguated in Phase 0 or every later conversation pays
for it.

Two concepts worth stealing without their protocols: **GNAP** (RFC 9635, October
2024) models grant as a first-class addressable object, but its working group
concluded in 2024 and there is no production AS support. **UMA 2.0** (Kantara
Recommendation, 2018-01-07) had precisely this problem statement and lost; the
design currently repeats three of its failure reasons — a heavy smart-resource-
server contract, bespoke semantics living only in one project's prose, and an
assumed shared broker. Its permission ticket (deny-with-a-handle), claims-pushing
versus gathering, and persisted claims token are all worth reusing.

## What to stop claiming

The agent-memory pass is blunt about this, and it is right: **"nobody is doing
the authorization half" is false and will not survive an informed reviewer.**
Decomposed into five terms, occupancy differs sharply — *this actor* and *this
class of record* are shipping (Zep ABAC, Cognee's fail-closed 403s at read,
Auth0's `FGARetriever`, Azure AI Search claim-based pre-filtering, Elastic DLS);
*right now* ships with documented staleness (Glean's connector ACL lag reported
at up to one month); only *acting for this subject* and *for this purpose* are
unmodelled anywhere.

The thesis is not unique either — three groups published it in 2026. The
proposal is early to the *composition* and late to the observation. What is
defensible:

> Permission-aware retrieval is solved for identity × document; a governed brain
> is the portable contract for the rest of the decision — which actor, acting
> for which subject, may obtain which class of record, under which declared
> purpose, and whether that is still true right now — over records that keep
> their own source authority and provenance.

Three further honesty corrections. `BR-REQ-04` — the actor / effective-subject /
data-subject split — is the single term the entire stack leaves unmodelled
(ID-JAG "does not define normative processing requirements for `actor_token`";
A2A carries no principal in the payload and its `actorChain` proposal is
unadopted; `draft-ietf-wimse-aims-00`, published the same day as this research,
declares mission→authorization translation out of scope in §10.1). It is
currently row 4 of 16 and should be promoted. **No standards status can be
claimed for `brain_access`** — there is no registry. And the documents use
"receipt" for the *issuer-side* record, inverting every prior art's usage, where
a receipt is the thing the subject gets.

## Consolidated change requests

65 change requests across the four lanes, each naming a file and a section:
22 standards, 18 relationship-authorization, 14 receipts, 11 agent-memory. They
are not restated here — the lane reports carry them with their evidence. The
ranking below is the order they should be worked, and the count above is the
honest total, not a curated subset.

**P0 — the design does not currently work without these**

| # | Lane refs | Target |
|---|---|---|
| 1 | rel-authz CR-1, CR-2, CR-7 | Port: typed consistency carrying a token, reject-never-downgrade; add the write-side content-change leg; distinguish failure classes |
| 2 | rel-authz CR-3, CR-4, CR-5, CR-10 | Add the permission-projection layer and re-scope Phases 2 and 5 around it; correct the search/index row |
| 3 | standards CR-1, CR-17 | Define the `brain_access` comparison algorithm, the type URI, and the common-field mapping in Phase 0 |
| 4 | receipts CR-1, CR-3, CR-12 | Split audit evidence from verifiable receipts; add the anchoring requirement; make the Phase 6 gate meetable |
| 5 | rel-authz CR-13, CR-14 · receipts CR-9 · agent-memory CR-3 | The purpose rule: vocabulary, provenance, truth; entitlement to declare; absence is deny |
| 6 | rel-authz CR-17 · standards CR-12 · receipts CR-6, CR-7 | Local revocation as a hard requirement; revocation itself receipted; provable status `as_of` |

**P1 — reuse instead of invent** (standards CR-6, CR-7, CR-11, CR-19, CR-20 ·
rel-authz CR-15 · receipts CR-9): RFC 9728 for the descriptor, OpenID Federation
1.1 for the trust layer, AuthZEN for the port shape, identity-chaining and
transaction-tokens for propagation, DPV for purpose, RFC 9942/9943 for receipt
integrity.

**P2 — framing and honesty** (agent-memory CR-1, CR-2, CR-11 · standards CR-8,
CR-9, CR-13, CR-14 · receipts CR-2): add a cited "what already exists" section,
promote `BR-REQ-04`, disambiguate "federation", add the UMA prior-art paragraph,
reconcile receipt naming, and drop the claims listed above.

**P3 — citations, threat-table rows, and editorial fixes**: the remainder. The
threat table in particular gains free credibility from incumbent-documented
leaks — Elastic's own note that scores ignore the role query and that users can
count inaccessible documents containing a term, Azure's chunk-projection
mismatch, post-filtering returning fewer than *k* as a count oracle, embedding
inversion at 92% exact recovery (EMNLP 2023), and two 2026 attack papers
(fragmentation-based ACL bypass at 86.3%; authorization laundering writing false
authority 50.2% of the time and being acted on 98.6% of the time).

## Already done

The Phase 1 sequencing claim was corrected and pushed before this synthesis was
written (standards CR-15, partially CR-3 and CR-4). **Verified here** against
primary text: RFC 9700 §4.4.1 gives mix-up preconditions requiring two
authorization servers, one attacker-operated; RFC 9700 §4.7 describes `state` as
single-issuer CSRF protection; RFC 8414 §3.3 makes discovery issuer-matching
unconditional. Phase 1 now splits into 1a (unconditional, gates nothing) and 1b
(multi-issuer, gates Phase 6), and the open question of whether Phase 6 carries
any front-channel authorization response at all — which decides whether the gate
stays or moves to trust-layer issuer-authority binding — is recorded in the plan
rather than assumed (standards CR-16).

## Unverified

Do not cite these without checking first: vendor claims for Ping, CyberArk,
SailPoint, Saviynt, and Google agent identity; AWS AgentCore on-behalf-of
chains; whether the regulated-domain implementation procedure referenced above
was finalized after its October 2025 draft; the Gartner intent-based access
control penetration figure; the OWASP ASI06 designation; Kantara's current
successor work beyond its own statement that the canonical version "is not yet
fixed"; ISO texts, which are paywalled and were read only through public
abstracts and a community mapping guide.

## Lane reports

- [Standards prior art and gap](governed-brain-research-2026-09-15-standards.md)
- [Relationship-authorization landscape](governed-brain-research-2026-09-15-relationship-authorization.md)
- [Agent-memory landscape](governed-brain-research-2026-09-15-agent-memory.md)
- [Receipts, consent and audit](governed-brain-research-2026-09-15-receipts.md)
- [Vendor agent-identity status](governed-brain-research-2026-09-15-vendor-agent-identity.md)
- [Agent protocols and purpose binding](governed-brain-research-2026-09-15-agent-protocols.md)
