---
title: "Governed Brain — Standards Prior-Art Assessment"
sidebar_label: "Standards prior art"
description: "What existing standards already cover of the governed-brain model, and what they leave open."
status: proposed
last_verified: 2026-09-16
---

# Governed Brain — Standards Prior-Art Assessment

**Reviewed:** `governed-brain-concepts.md`, `governed-brain-authorization.md`,
`governed-brain-implementation-plan.md` (all dated 2026-09-15), and
`identity-capability-gap-analysis-2026-09-05.md`.
**Assessment date:** 2026-09-15. All statuses verified against primary sources on
this date; every status below is labelled **published RFC**, **active draft**,
**expired draft**, or **OpenID Final Specification**.

---

## 1. Summary verdict

**The thesis is sound and the layering is right.** "Retrieval is similarity;
disclosure is authorization" is a correct framing, the conjunctive
deny-by-default invariant is well-formed, and the decision to keep the
relationship engine behind a proxied port while holding consent/purpose/source
authority outside it matches how the standards community has actually split
these concerns (RFC 9396 for request intent, AuthZEN for the PDP boundary,
OpenID Federation for trust). Nothing in the proposal contradicts a normative
requirement of any standard I verified.

**What it can stand on, unchanged:**

- RAR (RFC 9396) genuinely is the idiomatic extension point. A custom
  `authorization_details` type is the designed mechanism, not a workaround.
- The mix-up half of the federation gate is correct and now has stronger
  empirical support than when the docs were written.
- Token exchange (RFC 8693), PAR (RFC 9126), Resource Indicators (RFC 8707),
  DPoP (RFC 9449), RFC 9068, RFC 9700 are all cited accurately and used the way
  their specs intend.
- Refusing to build on a "standard called brain federation" is correct — none
  exists.

**What must change (ordered by cost of getting it wrong):**

1. **The federation gate is mis-argued and partly mis-aimed.** Of the three
   Phase-1 gaps, only `iss` is genuinely multi-issuer. `state` and
   discovery-authority binding are unconditional single-issuer requirements
   (RFC 8414 §3.3 is an unqualified MUST), and the JWKS-cache argument has no
   normative basis in either direction. Worse: mix-up is a *redirect-response*
   attack, and the proposal's federation flow is mostly service-to-service.
2. **OpenID Federation 1.0/1.1 went Final in 2026 and supplies exactly the
   issuer-authority binding Phase 6 needs.** The hand-rolled "Federation
   metadata" section is a partial re-invention of Entity Statements + Trust
   Chains + Trust Marks + metadata policy. Also, "federation" is being used for
   a different axis than the standard uses it — a live naming collision inside
   an identity workspace.
3. **RFC 9728 (Protected Resource Metadata) already standardizes most of
   `BrainDescriptor`.** A brain is a protected resource. Published April 2025.
4. **The `brain_access` detail has six concrete defects** against RFC 9396:
   non-collision-resistant `type`, a non-standard `version` member, common data
   fields reinvented under new names, `data_subject` in the front channel
   without a mandatory PAR/JAR requirement, no granted-vs-requested comparison
   algorithm (which §6.1 says the type *must* supply because the RFC does not),
   and no statement of how `scope` interacts (§3.1 makes the AS grant the
   union).
5. **The relationship port should be AuthZEN-shaped.** Authorization API 1.0 is
   an OpenID Final Specification as of 2026-01-11 and is a near-isomorphism of
   the proposed port signature. Declining it means defining a fifth private
   authorization interface in a workspace whose stated goal is provider
   neutrality. One real impedance mismatch to resolve: AuthZEN's `decision` is
   a boolean, and the gap analysis requires five decision classes.
6. **Two IETF drafts already cover the propagation the invariant needs** —
   Identity Chaining (cross-domain, now awaiting RFC Editor) and Transaction
   Tokens (intra-domain call chains, carrying purpose and request context).
   The proposal invents both paths from RFC 8693 alone.
7. **GNAP models "grant" the way the proposal means it, but is a dead end to
   build on** (WG concluded 2024-10-22). Steal the grant-as-first-class-resource
   idea; do not adopt the protocol.
8. **UMA solved this exact problem statement in 2018 and did not win.** The
   proposal repeats at least three of the reasons. Its permission-ticket and
   claims-gathering primitives are worth reusing — and AuthZEN's AARP working
   group draft is the modern re-run of the same idea.

---

## 2. Per-standard findings

### 2.1 RFC 9396 — OAuth 2.0 Rich Authorization Requests

- **Status: published RFC, Standards Track, May 2023.**
  <https://www.rfc-editor.org/rfc/rfc9396.html>
- **Reuse verdict: yes — this is the correct extension point. Contradiction:
  none. Underspecification: substantial.**

**What the RFC requires of a type definition.**

- §2 — `type` is REQUIRED; it is "an identifier for the authorization details
  type as a string."
- §2.1 — "The AS controls the interpretation of the value of the `type`
  parameter"; the AS "MUST refuse to process any unknown authorization details
  type … and respond with an error `invalid_authorization_details`." For APIs
  deployed across different servers, "the API designer is RECOMMENDED to use a
  collision-resistant namespace under their control, such as a URI."
- §2.2 — six common data fields are defined for reuse: `locations` ("an array
  of strings representing the location of the resource or RS"), `actions`
  ("the kinds of actions to be taken at the resource"), `datatypes` ("the kinds
  of data being requested from the resource"), `identifier` ("a string
  identifier indicating a specific resource available at the API"), and
  `privileges`.
- §3.1 — `scope` and `authorization_details` "can be used in the same
  authorization request for carrying independent authorization requirements";
  the AS "MUST process both sets of requirements in combination" and present
  "the merged set of requirements" at consent.
- §3.2 — the RFC 8707 `resource` parameter "does not have any impact on the way
  the AS processes the `authorization_details` authorization request
  parameter." They are independent mechanisms.
- §3 — the AS asks the user for consent based on the data in
  `authorization_details`, and "the user may also grant a subset of the
  requested authorization details."
- §6.1 (*Comparing Authorization Details*) — there is **no standardized
  mechanism** to compare two authorization detail requests, because "the
  semantics of the fields … will be implementation specific"; comparison
  "depends on the definition of the `type` … and outside the scope of this
  specification."
- §7 — "the AS MUST also return the `authorization_details` as granted by the
  resource owner and assigned to the respective access token."
- §7.1 — granted details "MAY differ from what the client requests"; the AS may
  enrich them, and enrichment must be "part of the definition of the respective
  authorization details type."
- §9.1 / §9.2 — resource-server consumption: JWT-based access tokens, and
  introspection where "the information MUST be conveyed with
  `authorization_details` as a top-level member of the introspection response."
- §10 — AS advertises `authorization_details_types_supported`; §14.5 registers
  client metadata `authorization_details_types`.
- §11.3 — a JSON Schema identifier *could* be used as a `type` value, but the
  RFC makes "no assumption that a `type` value would point to a machine-readable
  schema format or that any party … would dereference or process" it.
- §12 (Security Considerations, no subsections) — "If the integrity of the
  `authorization_details` is a concern, clients MUST protect
  `authorization_details` against tampering and swapping," via signed request
  objects (RFC 9101) or `request_uri`. String comparison per RFC 8259 with no
  normalization. "The AS MUST properly sanitize and handle the data passed in
  the `authorization_details` in order to prevent injection attacks."
- §13 (Privacy Considerations) — sensitive personal data in
  `authorization_details` "must be prevented from leaking, e.g., through
  referrer headers," with encrypted request objects or end-to-end encrypted
  client↔AS transmission as mitigations. It further warns that an attacker
  "could use the AS to learn the user's data by injecting the encrypted request
  data into an authorization request … and use the AS's user consent screens to
  show the (decrypted) user data in the clear."
- §14 — IANA registrations cover the parameter, the JWT claim, the introspection
  member, AS metadata, client metadata and the error code. **There is no IANA
  registry of authorization details *types*.** §10 states the registration of
  types with the AS is out of scope.

**What the proposal gets wrong or leaves underspecified.**

| # | Defect | Basis |
|---|---|---|
| R1 | `"type": "brain_access"` is a bare short name. The design is explicitly multi-authority/federated — the exact case §2.1 addresses. | §2.1 RECOMMENDS a collision-resistant namespace such as a URI under the designer's control. |
| R2 | `"version": "1"` is not an RFC 9396 field and has no defined comparison behaviour. Two ASes may treat `v1` and `v2` details as comparable. | §2.2 defines no `version`; §6.1 leaves comparison to the type definition, so a member the type does not explain is dead weight at best. Fold the version into the `type` URI. |
| R3 | `brain`, `collections`, `record_ids` reinvent `locations`, `datatypes`, `identifier`. Interop value of the common fields is discarded for no gain. | §2.2 defines these precisely for reuse. |
| R4 | `data_subject` — a third party's identifier — travels in the authorization request. PAR is only "when the request carries sensitive authorization details," i.e. conditional. | §13 (referrer leakage; the consent-screen decryption-oracle attack). §12 (integrity: tampering and swapping). Must be unconditional PAR (RFC 9126) or JAR (RFC 9101) for any detail carrying `data_subject`. |
| R5 | No comparison algorithm for `brain_access`. The AS cannot decide "is this the same grant, a narrowing, or a broadening?" and therefore cannot decide when re-consent is required. | §6.1 explicitly makes this the type definition's job. This is a missing Phase-0/Phase-3 deliverable, not a detail. |
| R6 | Nothing says what happens when a broad `scope` accompanies a narrow `brain_access`. The AS grants the merged union. | §3.1. The type definition must state that scope values MUST NOT confer brain access and that the brain ignores scope for authorization. |
| R7 | "an empty list means 'none,' not 'all'" has no standard backing, and an intermediary that drops empty arrays converts "none" into "absent". | §2.2 assigns no semantics to an empty array. Safer: forbid empty arrays; define *absent member* = deny. |
| R8 | The invariant's `token_intent_allows(...)` does not say whether it evaluates the **requested** or the **granted** detail. | §7 / §7.1 — only the granted (possibly enriched, possibly narrowed) detail is authoritative. The client must also compare what came back. |
| R9 | The plan never decides how the target brain *obtains* the granted detail: JWT claim or introspection. This changes the trust model (offline verification with staleness vs. AS as online authority). | §9.1 vs §9.2. |
| R10 | RAR and Resource Indicators are presented as one combined mechanism ("RAR + PAR + Resource Indicators express the exact requested brain"). They are independent. | §3.2 — `resource` has no impact on how the AS processes `authorization_details`. The doc must say which is authoritative for `aud`. |
| R11 | Phase 0 says "register `brain_access` as a versioned authorization-detail schema" without naming the AS. | There is no IANA type registry (§10, §14); "registration" means (a) a collision-resistant name you control, (b) an AS that actually supports RAR. |

**Adoption reality (secondary source, flagged as such).** A survey published
2026-08-03 reports that of 20 widely used public authorization servers, none
advertised `authorization_details_types_supported`; deployed RAR is
concentrated in open banking and in OpenID for Verifiable Credentials (which
uses the `openid_credential` type).
<https://mojoauth.com/blog/scoping-agent-permissions-rich-authorization-requests-rfc-9396-in-practice>
This is not authoritative, but it is a build risk the plan does not name: if the
chosen AS does not support RAR, `brain_access` is unimplementable without
writing the AS.

**Adjacent active work.** `draft-chen-oauth-rar-agent-extensions-01` —
**individual draft, not WG-adopted**, revision 01 dated 2026-04-22, active,
expires 2026-10-24 — proposes exactly the fields the proposal invents ad hoc:
`policy_context` (`assurance_level`, `compliance_frameworks`) and
`lifecycle_binding` (`type`, `task_id`, `termination_states`), plus an
`intent_request` type.
<https://datatracker.ietf.org/doc/draft-chen-oauth-rar-agent-extensions/>
Do not depend on it. Do align field names in case it advances.

---

### 2.2 OAuth 2.1, RFC 9700 (security BCP), RFC 9207 (`iss`)

- **OAuth 2.1: active WG Internet-Draft, NOT an RFC.** `draft-ietf-oauth-v2-1-16`,
  revision dated 2026-09-03, expires 2027-03-07; WG milestone targets IESG
  submission December 2026. <https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/>
  The proposal is right not to cite "OAuth 2.1" as a standard; it cites RFC 9700
  instead. Keep it that way.
- **RFC 9700: published RFC, BCP 240, January 2025.**
  <https://www.rfc-editor.org/rfc/rfc9700.html>
- **RFC 9207: published RFC, Proposed Standard, March 2022.**
  <https://datatracker.ietf.org/doc/rfc9207/>
- **RFC 8414: published RFC, Standards Track, June 2018.**
  <https://www.rfc-editor.org/rfc/rfc8414.html>

**Is the "multi-issuer" claim right? Partly — one of three.**

**(a) `iss` — the claim is CORRECT.**
RFC 9207 §2: "an authorization server supporting this specification MUST
indicate its identity by including the `iss` parameter in the response."
§2.4: the client must "compare the result to the issuer identifier of the
authorization server where the authorization request was sent to … This
comparison MUST use simple string comparison," and on mismatch "clients MUST
reject the authorization response and MUST NOT proceed with the authorization
grant."
RFC 9207 §4: "Mix-up attacks are only relevant to clients that interact with
multiple authorization servers. However, clients interacting with only one
authorization server might add support for a second authorization server in the
future."
RFC 9700 §4.4.1 states the precondition: the grant "is used with multiple
authorization servers of which one is considered 'honest' (H-AS) and one is
operated by the attacker." §4.4.2: clients "MUST prevent mix-up attacks" when
interacting with two or more authorization servers, with two defences —
§4.4.2.1 issuer identification (the `iss` value "MUST be evaluated according to
[RFC9207]") and §4.4.2.2 distinct redirect URIs per issuer.

Note: **the plan omits the second mandated defence.** RFC 9700 §4.4.2.2
(distinct redirect URIs per issuer) is a co-equal countermeasure and is cheaper
than a callback parser. Phase 1 should cover both.

**(b) `state` — the claim is WRONG.** `state` is not a multi-issuer control.
RFC 9700 §4.7.1 treats `state` as CSRF protection and notes "the same protection
is provided by PKCE or the OpenID Connect `nonce` value." OAuth 2.1 draft-16
§2.3.3: "Clients that have ensured that the authorization server supports the
`code_challenge` parameter MAY rely on the CSRF protection provided by that
mechanism … Otherwise, one-time use CSRF tokens carried in the `state`
parameter … MUST be used." Login-CSRF and authorization-code injection are
live with exactly one issuer. RFC 9700 §2.1.1: "Public clients MUST use PKCE";
§4.5.3.2 warns that `nonce` "does not protect authorization codes of public
clients."

**(c) Discovery endpoint-authority binding — the claim is WRONG, and the
requirement is unconditional.** RFC 8414 §3.3: "The `issuer` value returned MUST
be identical to the authorization server's issuer identifier value into which
the well-known URI string was inserted to create the URL used to retrieve the
metadata. If these values are not identical, the data contained in the response
MUST NOT be used." §6.2 describes the impersonation attack directly: an attacker
"could publish a metadata document that contains an `issuer` claim using the
issuer identifier URL of the authorization server being impersonated, but with
its own endpoints and signing keys."

The separate Malicious Endpoints / SSRF class is also single-issuer: a discovery
document can point endpoints at internal hosts, which the client then fetches.
Mainka, Mladenov, Schwenk & Wich, *SoK: Single Sign-On Security — An Evaluation
of OpenID Connect*, IEEE EuroS&P 2017
<https://oaklandsok.github.io/papers/mainka2017.pdf>; see also Mladenov & Mainka,
*OpenID Connect Security Considerations*
<https://www.nds.ruhr-uni-bochum.de/media/ei/veroeffentlichungen/2017/01/13/OIDCSecurity_1.pdf>.

**(d) Bounded JWKS caches / single-flight — the claim is UNSUPPORTED in both
directions.** Neither RFC 8414 nor RFC 9700 specifies key-cache behaviour, so
there is no normative basis for "latent at one issuer." The plan's rationale
("keyed by issuer count; one issuer means one cache entry") mis-models the
mechanism: JWKS caches are keyed by `kid` as well as issuer, so unknown-`kid`
tokens drive refetches against a single issuer, and the missing single-flight
dedup is a thundering-herd on rotation with one issuer. This is engineering
reasoning, not a spec citation — the plan should either soften the claim or
support it.

**Mix-up is empirically live in 2025–26, which strengthens the gate.**
Luo, Wang, Fung, Lau & Lecomte, *Universal Cross-app Attacks: Exploiting and
Securing OAuth 2.0 in Integration Platforms*, USENIX Security '25, August 2025 —
two variants (COAT, CORF), 15+ affected mainstream vendors, one-click account
takeover of a major productivity suite (CVE-2023-36019). The shift is that an
*open marketplace* lets untrusted developers register as authorization servers,
so the "attacker-operated AS" precondition is now cheap to satisfy. The original
result is Fett, Küsters & Schmitz, *A Comprehensive Formal Security Analysis of
OAuth 2.0*, ACM CCS 2016
<https://publ.sec.uni-stuttgart.de/fettkuestersschmitz-ccs-2016.pdf>.

**The deeper problem: the gate may be aimed at the wrong layer.** Mix-up is an
attack on the *authorization response delivered through a browser redirect*. The
proposal's federation sequence is broker → token exchange → target brain, which
is back-channel. If cross-brain federation never routes through a user-agent
redirect, RFC 9207 is not the control that protects it; audience/resource
restriction, sender constraint, and trust-chain issuer authority are. The plan
must state which federation flows are redirect-based.

---

### 2.3 GNAP — RFC 9635 and family

- **RFC 9635 (GNAP core): published RFC, Proposed Standard, October 2024.**
  <https://datatracker.ietf.org/doc/rfc9635/>
- **RFC 9767 (GNAP Resource Server Connections): published RFC, Proposed
  Standard, April 2025.** <https://datatracker.ietf.org/doc/draft-ietf-gnap-resource-servers/>
- **The GNAP working group was CONCLUDED on 2024-10-22.**
  <https://datatracker.ietf.org/wg/gnap/about/> ·
  <https://datatracker.ietf.org/group/concluded/>

**Does GNAP model "grant" the way the proposal does? Yes — closer than OAuth
does.** In GNAP a grant is a first-class, addressable, continuable object with
its own lifecycle state (Processing → Pending → Approved → Finalized), a
continuation handle, structured `access` descriptions per resource, a `subject`
information request, and explicit `interact` modes for gathering the resource
owner's authorization out of band. That is precisely the proposal's grant:
bounded, named, amendable, revocable, and separable from any one access token.
OAuth has no such object — the closest thing is a refresh token, which is not
introspectable as a grant and cannot be narrowed.

**Should the proposal build on GNAP? No.** The WG is concluded, there is no
active maintenance body, production authorization-server support is effectively
absent, there is no security profile equivalent to FAPI 2.0, and no conformance
suite. Meanwhile the proposal's entire reuse story — PAR, RAR, DPoP, token
exchange, RFC 9068, RFC 9728, AuthZEN, OpenID Federation, SSF/CAEP — is
OAuth-shaped. Adopting GNAP costs every off-the-shelf AS and every client
library in the four languages the plan names, to buy one object.

**What to take instead:** model the grant as a first-class resource in the brain
contract (Phase 3) with its own identifier and state machine, referenced *by id*
from the `brain_access` detail and from every receipt — rather than trying to
make the access token be the grant. This is also the clean fix for defect R2/R5
and for the awkward `expires_at` member.

---

### 2.4 UMA 2.0

- **UMA 2.0 Grant for OAuth 2.0 Authorization: Kantara Initiative
  Recommendation, 2018-01-07.**
  <https://docs.kantarainitiative.org/uma/wg/rec-oauth-uma-grant-2.0.html>
- **Federated Authorization for UMA 2.0: companion Kantara Recommendation, same
  date.** Neither is an IETF RFC; neither is deprecated; the Kantara UMA WG still
  exists. <https://kantara.atlassian.net/wiki/spaces/uma>

**UMA's problem statement is the proposal's problem statement.** UMA introduces
the **requesting party** — "a natural or legal person that uses a client to seek
access" — as distinct from the resource owner, enabling genuine party-to-party
authorization rather than app-to-user authorization. That is exactly
BR-REQ-04 (separate actor, effective subject, data subject) and exactly the
"professional acting for a subject" case.

**Why it did not win (evidence-bounded).** It was never taken to IETF standards
track, so it has no IESG review, no IANA anchoring, and no BCP tracking it. Its
implementer set stayed small and vendor-concentrated. Interop ambiguity persisted
even among that small set — e.g. an open dispute about how the RPT request
authenticates at the token endpoint
(<https://github.com/keycloak/keycloak/issues/30779>). And it places a heavy
contract on the resource server: register every resource at the AS, run a
permission-ticket round trip on every miss, and understand the AS's claim
requirements.

**Does the proposal repeat the reasons? Three of them, yes.**

1. **Same "smart resource server" bet.** The brain must call a relationship
   port, call a policy service, evaluate current consent, filter to
   minimum-necessary, and emit a receipt — on every sensitive request. That is a
   heavier RS contract than UMA's, and UMA's was already the adoption blocker.
2. **Same interop-ambiguity failure mode.** `brain_access` semantics live
   entirely in one project's prose, with no comparison algorithm (R5) and no
   registry. UMA's divergences arose from exactly this.
3. **Same coordination cost.** The design assumes a broker/control plane that
   both authorities trust. UMA assumed a shared AS both parties trust, and never
   amortized the cost of getting one.

**What is worth reusing from UMA:**

- **The permission ticket.** Instead of a bare deny, return a correlation handle
  naming precisely what was insufficient, so the client knows what to go obtain.
  The proposal's "machine-readable denial reason codes" are a weaker,
  non-actionable version of this. (AuthZEN's AARP draft — §2.7 below — is the
  modern standards re-run of the same idea; prefer it over reviving UMA's wire
  format.)
- **Claims pushing vs. interactive claims gathering.** The proposal has
  `human_approval_id` but no answer to *when* approval is collected: before the
  request (pushed) or triggered by the denial (gathered). UMA names both modes.
- **The Persisted Claims Token (PCT).** The model for not re-collecting consent
  on every call while keeping the grant revocable — directly relevant to the
  proposal's cache-staleness open decision.
- **Requesting party ≠ resource owner vocabulary.** Already present in the
  proposal's roles table; keep it, and cite UMA as the prior art so reviewers
  recognise the shape.

---

### 2.5 OpenID Federation 1.0 / 1.1

- **OpenID Federation 1.0: OpenID Final Specification, approved 2026-02-17**
  (85 approve / 0 object / 20 abstain).
  <https://openid.net/openid-federation-1-0-final-specification-approved/> ·
  spec: <https://openid.net/specs/openid-federation-1_0.html>
- **OpenID Federation 1.1 and OpenID Federation for OpenID Connect 1.1: OpenID
  Final Specifications, approved 2026-05-06** (83 / 0 / 21).
  <https://openid.net/openid-federation-1-1-final-specifications-approved/> ·
  spec: <https://openid.net/specs/openid-federation-1_1-final.html>
  1.1 is a reorganization — it "contains the protocol-independent functionality
  defined in OpenID Federation 1.0" and "introduces no new functionality not
  present in OpenID Federation 1.0," with OIDC-specific parts split out.
- Interop is real: nine countries, twelve implementers, nine deployments tested
  at TIIME 2026. <https://openid.net/nine-countries-prove-openid-federation-interoperability/>

**Does it supply the issuer-authority binding Phase 6 needs? Yes, completely.**

- **Entity Statement** — a signed JWT carrying what an entity needs to
  participate. **Entity Configuration** is the self-issued form (iss == sub)
  carrying the entity's federation keys; **Subordinate Statement** is issued by a
  superior about an immediate subordinate and carries metadata policy.
- **Trust Chain** — "a sequence of Entity Statements … starting at an Entity
  Configuration … and ending in a Trust Anchor." Resolution: fetch the target's
  Entity Configuration, follow `authority_hints` to immediate superiors, collect
  Subordinate Statements from each superior's fetch endpoint, verify each
  signature with the next entity's published keys, terminate at a configured
  Trust Anchor. This is cryptographically verifiable proof of membership and of
  who may speak for whom.
- **Trust Marks** — "statement of conformance to a well-scoped set of trust
  and/or interoperability requirements," issued by designated Trust Mark Issuers
  (`trust_mark_issuers`) and independently checkable at a **Trust Mark Status
  Endpoint** (1.1 §8.4).
- **Metadata policy** — operators `value`, `one_of`, `subset_of`, `superset_of`,
  cascading down the hierarchy, with the crucial rule that a policy "cannot be
  repealed or made more permissive by Intermediate Entities."
- **Resolve endpoint** (1.1 §8.3) and **federation historical keys endpoint**
  (1.1 §8.7) handle delegated chain resolution and verification across key
  rotation — both of which the plan's Phase 6 lists as things to "test."

**Conflict verdict: no contradiction, but a naming collision and a large
re-invention.**

- **Re-invention.** The authorization doc's "Federation metadata" list —
  authority ID, issuers, JWKS/discovery location, accepted algorithms, key
  rotation policy, accepted audiences, trust-community identifiers, "signed or
  obtained over an authenticated administrative channel," version pinning, fail
  closed when stale — is a partial, unsigned-by-default, manually-administered
  Entity Statement. OpenID Federation gives all of it signed, chained, policy-
  constrained, revocable via trust-mark status, and with a standard resolution
  algorithm.
- **Naming collision.** OpenID Federation's "federation" means *trust
  establishment* — who is a legitimate participant and what metadata they may
  assert. The proposal's "federation" means *authorized data exchange between
  brains*. Both words appear in the same workspace. OpenID Federation 1.1 is
  explicit that it is trust and metadata only: it "only concerns itself with how
  Entities in a federation get to know about each other" and defines no
  authorization grants. So the two are **orthogonal and composable** — but the
  vocabulary must be disambiguated or the docs will mislead.
- **It closes an open decision.** The authorization doc asks: "Which federation
  trust model applies — explicit bilateral registration, a trust community, or a
  reviewed trust registry?" Trust Anchors + Trust Marks + metadata policy are
  the standardized answer to "trust community" and "reviewed trust registry,"
  with an interop-tested implementation base.

---

### 2.6 Transaction Tokens and Identity Chaining

- **`draft-ietf-oauth-identity-chaining`: ACTIVE WG draft, revision 17 dated
  2026-07-19, submitted to IESG and awaiting RFC Editor; expires 2027-01-20.
  NOT yet an RFC.** <https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-chaining/>
  Mechanism: a client in trust domain A exchanges its token at A's authorization
  server for a JWT authorization grant, then presents that grant to domain B's
  authorization server via the JWT assertion grant to obtain an access token for
  B's protected resource — preserving context about the original user, the
  authorization decisions, and the intermediaries.
- **`draft-ietf-oauth-transaction-tokens`: ACTIVE WG draft, revision 11 dated
  2026-07-30, WG consensus state "Waiting for Write-Up," IESG state "I-D
  Exists"; expires 2027-01-31; intended Standards Track. NOT yet an RFC.**
  <https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/>
  Mechanism: short-lived signed JWTs that carry immutable user *and* workload
  identity plus authorization context — subject identifier, intended purpose,
  and request context — through internal call chains **within a trust domain**,
  so each downstream service can verify independently. Explicitly motivated by
  compromised-service, stolen-access-token, and unauthorized-workload-invocation
  risk.

**Overlap vs. gap.**

| Proposal need | Covered by | Gap |
|---|---|---|
| Broker exchanges a home token for a target-brain token across authorities | **Identity Chaining** — this *is* the proposal's broker step, and it is nearly an RFC | The proposal derives it from RFC 8693 alone and never names the draft |
| Actor / subject / purpose propagated through API → workers → indexes → model calls (Phase 5, BR-REQ-12) | **Transaction Tokens** — subject id + purpose + request context, immutable across the chain | The proposal has *nothing* here; the invariant is stated only at the API edge |
| The **data subject** — the person the record is about, distinct from the OAuth `sub` | **Neither** | This is a genuine gap the proposal is right to fill. But fill it as a registered extension to one of these, not only inside a bespoke RAR type |
| Delegation semantics `sub`/`act` | **RFC 8693** (published, Jan 2020) | Correctly used |

**RFC 8693 details the proposal relies on** (<https://www.rfc-editor.org/rfc/rfc8693.html>,
published RFC, Standards Track, January 2020): §1.1 distinguishes impersonation
("A is given all the rights that B has … and is indistinguishable from B") from
delegation ("principal A still has its own identity separate from B … any
actions taken are being taken by A representing B"). §4.1: "`act` claim value is
a JSON object"; "A chain of delegation can be expressed by nesting one `act`
claim within another. The outermost `act` claim represents the current actor
while nested `act` claims represent prior actors." The issued token's `sub`
remains the subject of the `subject_token`. §4.4: "The `may_act` claim makes a
statement that one party is authorized to become the actor and act on behalf of
another party." §2.1 defines `resource`, `audience`, `scope` request parameters.

The proposal's delegated-actions section is accurate. It is missing `may_act`,
which is the standard way to pre-authorize *which* actors may act for a subject
— relevant to BR-REQ-07 ("onward delegation MUST be separately permitted").

---

### 2.7 OpenID AuthZEN

- **Authorization API 1.0: OpenID Final Specification, approved 2026-01-12**
  (81 approve / 1 object / 25 abstain); spec header reads "Final, 11 January
  2026." <https://openid.net/authorization-api-1-0-final-specification-approved/>
  · <https://openid.net/specs/authorization-api-1_0.html>
- **Working Group Drafts** (approved as official WG Drafts, announced
  2026-06-15, <https://openid.net/openid-foundation-advances-authorization-for-the-agent-era-with-new-authzen-working-group-drafts/>):
  - **AuthZEN Access Request and Approval Profile (AARP)** — for when policy
    cannot yet decide because "approval, consent, delegated authority, an
    attestation, a risk assessment, or additional justification may be required
    before a decision can be reached."
    <https://openid.github.io/authzen/authzen-access-request-approval-profile-1_0.html>
  - **COAZ Framework 1.0** and **COAZ-MCP binding** — mapping arbitrary protocol
    information into the Subject-Action-Resource-Context model; tool-level
    authorization for agent runtimes.
    <https://openid.github.io/authzen/authzen-mcp-profile-1_0.html>
  - **AuthZEN Profile for Obligations 1.0** — lets a PDP attach mandatory
    machine-readable actions to a decision.
    <https://openid.net/wg/authzen/specifications/>

**Does it standardize the proposal's port? Essentially yes.**

Access Evaluation Request: `subject` (REQUIRED `type`, `id`, OPTIONAL
`properties`), `action` (REQUIRED `name`, OPTIONAL `properties`), `resource`
(REQUIRED `type`, `id`, OPTIONAL `properties`), `context` (OPTIONAL, free-form).
Response: `decision` (boolean) plus OPTIONAL `context`. Boxcarred
`/access/v1/evaluations` with `options.evaluations_semantic` of `execute_all`,
`deny_on_first_deny`, or `permit_on_first_permit`. Subject / Resource / Action
Search endpoints (omit the relevant `id`, or the `action` member, to search).
HTTPS binding with `/.well-known/authzen-configuration` discovery and
`/access/v1/evaluation`.

Map the proposal's port onto it:

| Proposed port element | AuthZEN |
|---|---|
| `actor_principal` | `subject.type` + `subject.id` |
| `action` | `action.name` |
| `resource_type`, `resource_id` | `resource.type`, `resource.id` |
| `tenant_id`, `consistency_requirement` | `context` members |
| `allowed` | `decision` |
| `relation`, `model_id`, `tuple_snapshot`, `checked_at` | response `context` members |

**Should the port be AuthZEN-shaped? Yes — with three cautions.**

1. **`decision` is a boolean.** The gap analysis requires the port to "return
   stable allow/deny/unknown/unavailable/error classes" and the authorization
   doc requires fail-closed on timeout, unknown model, stale configuration and
   ambiguous subject mapping. AuthZEN has no decision class for those. They must
   be carried as HTTP status plus response `context`, and the mapping must be
   written down — this is a real impedance mismatch, not a formatting detail.
2. **`context` is free-form and there is no standardized `purpose`.** That is
   compatible with the proposal's rule that purpose stays in the policy layer,
   but it means no interop for purpose. If a second AuthZEN-shaped call is used
   for the policy PDP, the doc must define that context vocabulary itself.
3. **AuthZEN is engine-agnostic** — it standardizes the PDP boundary, not the
   ReBAC boundary. Keeping relationship and policy separate means either two
   AuthZEN calls or one call with a documented internal split. The doc currently
   implies one relationship call plus one policy call but does not say whether
   both use the same wire shape.

**AARP and Obligations close two open holes.** `human_approval_id` is an
invented field; AARP is the standards-track protocol for "denied, here is what
would make it allowed, here is how to request it." BR-REQ-08 (minimize
disclosure) currently has *no mechanism* for how the redaction/minimum-necessary
requirement reaches the enforcement point; the Obligations profile is exactly
that mechanism. Both are WG Drafts, not Final — track, do not depend.

---

### 2.8 Other load-bearing standards

**RFC 9728 — OAuth 2.0 Protected Resource Metadata. Published RFC, Proposed
Standard, April 2025.** <https://datatracker.ietf.org/doc/rfc9728/>
Defines `resource` (the resource identifier, https, no fragment),
`authorization_servers`, `jwks_uri`, `scopes_supported`,
`bearer_methods_supported`, `resource_signing_alg_values_supported`, and
`signed_metadata` (a JWT asserting the metadata as a bundle). Published at
`/.well-known/oauth-protected-resource`; discoverable from the
`WWW-Authenticate` response header's `resource_metadata` parameter.

**This is the single biggest missed reuse.** A brain *is* a protected resource.
BR-REQ-01 ("declare scope … stable identity, authority boundary, lifecycle
state, capability set … without inferring identity from a session or endpoint")
and BR-REQ-15 ("endpoint/key/capability discovery can be tested without making a
provider-specific service the domain contract") are largely RFC 9728 plus
registered extension members. The Phase-3 `BrainDescriptor` should be a profile
of RFC 9728, not a parallel document.

**RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens. Published RFC, Proposed
Standard, October 2021.** <https://datatracker.ietf.org/doc/rfc9068/>
Required claims `iss`, `exp`, `aud`, `sub`, `client_id`, `iat`, `jti`; §2.1 the
`typ` header MUST be `at+jwt`; §4 "the resource server MUST validate that the
`aud` claim contains a resource indicator value corresponding to an identifier
the resource server expects for itself." It does **not** define
`authorization_details` — but RFC 9396 §14.2 registers `authorization_details`
as a JWT claim, so an `at+jwt` token can legitimately carry the granted detail.
The plan must state this explicitly (see defect R9).

**RFC 8707 — Resource Indicators. Published RFC, Proposed Standard, February
2020.** <https://datatracker.ietf.org/doc/rfc8707/> §2: "The authorization server
SHOULD audience-restrict issued access tokens to the resource(s) indicated by
the `resource` parameter." Note SHOULD, not MUST — so the brain cannot *assume*
audience restriction happened; it must verify `aud` itself (RFC 9068 §4). The
proposal's threat table row "Token for brain A rejected by brain B" is therefore
an RS-side obligation, not an AS-side guarantee.

**RFC 9449 — DPoP. Published RFC, Standards Track, September 2023.**
<https://datatracker.ietf.org/doc/rfc9449/> Binds via `cnf.jkt` (JWK SHA-256
thumbprint); proof JWT carries `jti`, `htm`, `htu`, `iat`, optionally `ath` and
`nonce`; §4.3 and §7.1 specify resource-server validation. Used correctly.

**RFC 9126 — PAR. Published RFC, Standards Track, September 2021.** Cited
correctly; must become mandatory rather than conditional for details carrying
`data_subject` (defect R4).

**FAPI 2.0 Security Profile — OpenID Final Specification, February 2025**,
approved together with the FAPI 2.0 Attacker Model.
<https://openid.net/fapi-2-security-profile-attacker-model-final-specifications-approved/>
· <https://openid.net/specs/fapi-security-profile-2_0-final.html>
The authorization doc links the correct *final* URL. **The gap analysis links the
non-final URL** (`fapi-security-profile-2_0.html`) — fix for consistency.

**OpenID Shared Signals Framework 1.0, OpenID CAEP 1.0, OpenID RISC 1.0 — all
three reached OpenID Final Specification on 2025-09-02.**
<https://openid.net/three-shared-signals-final-specifications-approved/> ·
<https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html> ·
<https://openid.net/specs/openid-caep-1_0-final.html>
A **CAEP Interoperability Profile** is in Final-Specification public review
2026-07-27 → 2026-09-25.
<https://openid.net/public-review-period-for-proposed-openid-caep-interoperbility-profile-final-specification/>

This is the standardized transport for BR-REQ-09 (make revocation observable)
and for the threat row "stale permission survives revocation." The authorization
doc says "use revocation events plus local grant state as the authority" without
naming a mechanism — SSF is the mechanism, and it is Final. A grant-revocation
event fits the CAEP event model alongside session-revoked and credential-change.

**ISO/IEC TS 27560:2023 — Consent record information structure. Published
Technical Specification, August 2023** (a TS, not a full International
Standard). It "specifies an interoperable, open and extensible information
structure for recording consent" and covers exchanging such records "in the form
of 'receipts'"; it incorporates the Kantara Consent Receipt lineage, now carried
forward by Kantara's ANCR work group.
<https://arxiv.org/pdf/2405.04528> · <https://kantara.atlassian.net/wiki/spaces/WA/overview>
The proposal's "receipt" is a **disclosure** receipt, not a **consent** receipt,
so 27560 is not a drop-in. But BR-REQ-13 and the Receipt concept should say how
the two relate, because a regulated-domain profile will require the consent
record and will ask whether the disclosure receipt satisfies it. (It does not.)

**AI-agent authorization work — nothing stable enough to build on.** Several
individual Internet-Drafts exist (`draft-oauth-ai-agents-on-behalf-of-user`,
`draft-klrc-aiagent-auth`, `draft-nelson-agent-delegation-receipts`,
`draft-niyikiza-oauth-attenuating-agent-tokens`), none WG-adopted. The OpenID
Foundation's **Artificial Intelligence Identity Management (AIIM)** group is a
*Community Group*, which by charter does **not** produce specifications.
<https://openid.net/cg/artificial-intelligence-identity-management-community-group/>
The proposal is right not to depend on any of this. Phase 0 should say so
explicitly so a reviewer does not read the omission as an oversight. The one
thing that *is* Final and agent-relevant is AuthZEN, plus its COAZ-MCP WG draft.

---

## 3. Specific, actionable change requests

### `governed-brain-authorization.md`

**CR-1 — RAR detail section (`brain_access` authorization detail`).** Rewrite the
JSON example and rules:
- Change `"type": "brain_access"` to a collision-resistant URI under a namespace
  the author controls, with the version in the path — e.g.
  `"type": "https://<authority>/authz/brain-access/v1"` — per RFC 9396 §2.1.
  Delete the separate `"version"` member.
- Rename to the RFC 9396 §2.2 common fields where semantics match: `brain` →
  `locations`; `collections` → `datatypes`; `record_ids` → `identifier` (or an
  array of identifiers, documented). Keep `actions` (already a common field).
  Keep `data_subject`, `purpose`, `tenant`, `environment`, `human_approval_id`
  as documented extension members, and state that they are extensions.
- Replace the `expires_at` member with a reference to a first-class grant object
  (`grant_id`) whose lifecycle the brain owns; if `expires_at` is retained, state
  that it is a requested *maximum* the AS MAY shorten and MUST echo in the
  granted detail.
- Replace "an empty list means 'none,' not 'all'" with: arrays MUST NOT be
  empty; an **absent** member denies. Empty arrays are rejected.
- Add a rule: `scope` values MUST NOT confer brain access; the brain ignores
  `scope` for authorization. Cite RFC 9396 §3.1 (the AS grants the merged set).
- Add a rule: the brain evaluates the **granted** detail returned per RFC 9396
  §7 (possibly enriched per §7.1), never the requested detail; and clients MUST
  compare the returned detail against what they requested.
- Add a **normative comparison algorithm** for the type — what constitutes the
  same grant, a narrowing, and a broadening — because RFC 9396 §6.1 explicitly
  delegates this to the type definition and the AS cannot decide re-consent
  without it.
- State how the brain obtains the granted detail: `at+jwt` claim
  (RFC 9396 §14.2 / §9.1) or introspection (§9.2), and the staleness consequence
  of each.
- Reference `invalid_authorization_details` (RFC 9396 §2.1, §14.6) as the AS-side
  error, and keep the brain's own denial-reason vocabulary separate from it.

**CR-2 — Protocol profile → Interactive clients.** Change PAR from conditional
("when the request carries sensitive authorization details") to **mandatory for
any `brain_access` detail containing `data_subject`**, citing RFC 9396 §13
(referrer leakage; the consent-screen decryption-oracle attack) and §12
(tampering and swapping). Name RFC 9101 (JAR) as the alternative.

**CR-3 — Capability-and-gaps table, `iss`/`state` row.** Split the row. `iss`
(RFC 9207 §2, §2.4) is a multi-issuer control and belongs on the federation gate.
`state`/PKCE is an unconditional control for every client (RFC 9700 §4.7.1,
§2.1.1, §4.5.3; OAuth 2.1 draft-16 §2.3.3) and must not be gated on federation.
Add RFC 9700 §4.4.2.2 (distinct redirect URIs per issuer) — the second mandated
mix-up defence, currently missing.

**CR-4 — Capability-and-gaps table, discovery row.** Restate discovery
endpoint-authority binding as an **unconditional** RFC 8414 §3.3 MUST ("The
`issuer` value returned MUST be identical … If these values are not identical,
the data contained in the response MUST NOT be used"), not a pre-federation
gate. Cite §6.2 for the impersonation attack and the Malicious Endpoints / SSRF
literature for the single-issuer case.

**CR-5 — Delegated actions section.** Add `may_act` (RFC 8693 §4.4) as the
mechanism for BR-REQ-07's "onward delegation MUST be separately permitted." Cite
`draft-ietf-oauth-identity-chaining` (rev 17, 2026-07-19, awaiting RFC Editor) as
the intended cross-domain shape, labelled as a pre-RFC draft. Note that the
`sub` of an exchanged token stays the subject of the `subject_token` (§A.2.5),
which is why `data_subject` must be carried separately — as the doc already says.

**CR-6 — Federation metadata section.** Either adopt OpenID Federation 1.1
(Final, 2026-05-06) for the trust layer — Entity Configurations, Subordinate
Statements, Trust Chains, Trust Marks, metadata policy, resolve endpoint,
historical-keys endpoint — or state explicitly that a bilateral registration
model is being used and enumerate what is given up (no automated onboarding, no
cascading metadata policy, no independently checkable trust-mark status, manual
key-rotation coordination). Cross-reference RFC 9728 for the resource-side half.
This also answers the open decision "Which federation trust model applies."

**CR-7 — Relationship-authorization port section.** Adopt the AuthZEN
Authorization API 1.0 (OpenID Final, 2026-01-11) wire shape for the port, with an
explicit mapping table, and resolve the boolean-`decision` mismatch: state how
unknown / unavailable / error / timeout are carried (HTTP status + response
`context`) given that `decision` is boolean-only. State whether the policy PDP
uses the same shape. Reference AARP (WG Draft) for `human_approval_id` and the
Obligations profile (WG Draft) for BR-REQ-08's minimum-necessary filtering, both
labelled as drafts.

**CR-8 — Terminology.** Disambiguate "federation." The document's federation is
*cross-brain disclosure*; OpenID Federation's is *trust establishment*. Rename
one or define both in the glossary, and state that they compose (OpenID
Federation 1.1 defines no authorization grants).

**CR-9 — Add a UMA prior-art paragraph.** Name UMA 2.0 (Kantara Recommendation,
2018-01-07) as the closest prior art for party-to-party authorization, note the
requesting-party-vs-resource-owner distinction as shared vocabulary, and state
what is deliberately being done differently. Reviewers will otherwise ask.

**CR-10 — Threat table.** The row "Confused deputy / wrong brain" cites Resource
Indicators; note that RFC 8707 §2 is a **SHOULD** on the AS, so the brain must
verify `aud` itself per RFC 9068 §4 rather than rely on the AS.

### `governed-brain-concepts.md`

**CR-11 — BR-REQ-01 and BR-REQ-15.** Point both at RFC 9728 (Protected Resource
Metadata, published April 2025) as the discovery/declaration mechanism, with
brain-specific members as registered extensions and `signed_metadata` for the
signing requirement in BR-REQ-14. Do not define an independent `BrainDescriptor`
format.

**CR-12 — BR-REQ-09 (revocation observable).** Name OpenID Shared Signals
Framework 1.0 / CAEP 1.0 (both Final, 2025-09-02) as the event transport rather
than leaving "revocation events" as an undefined local mechanism.

**CR-13 — Grant (concept) and BR-REQ-07.** Define the grant as a first-class,
addressable resource with its own lifecycle state machine and identifier —
explicitly citing GNAP (RFC 9635) as the prior art for grant-as-object, while
stating that GNAP itself is not being adopted and why (WG concluded 2024-10-22,
no production AS support).

**CR-14 — Receipt (concept) and BR-REQ-13.** State the relationship to
ISO/IEC TS 27560:2023 consent records: the brain's receipt is a *disclosure*
receipt and does **not** satisfy a consent-record obligation. This prevents a
later regulated-domain profile from assuming it does.

### `governed-brain-implementation-plan.md`

**CR-15 — "Why Phase 1 is parallel, not first."** Rewrite. The three bullets are
individually wrong for two of three items. Correct framing: `iss` is genuinely
multi-issuer (RFC 9207 §4, RFC 9700 §4.4.1); `state`/PKCE and discovery-authority
binding are unconditional and should move out of the federation gate into
baseline Phase 1 work that blocks *anything* touching a redirect;
JWKS-cache bounding has no normative basis either way and should be argued as
availability/robustness, not as a latent multi-issuer bug.

**CR-16 — Phase 6 scope.** State which federation flows are redirect-based.
Mix-up (and therefore RFC 9207) applies to authorization responses delivered
through a user agent. If brain-to-brain federation is back-channel only, the
controls that matter there are audience/resource restriction, sender
constraint, and trust-chain issuer authority — and the Phase-1 gate, as written,
does not protect Phase 6 at all.

**CR-17 — Phase 0.** Add three deliverables: (a) the `brain_access` comparison
algorithm (RFC 9396 §6.1); (b) the decision on how the granted detail reaches the
brain (JWT claim vs introspection); (c) an explicit statement that AI-agent
authorization drafts are individual I-Ds and that the OIDF AIIM group is a
Community Group that does not produce specifications — so the omission is
deliberate.

**CR-18 — Phase 0 / "Where each piece lands."** Name the authorization server
product and confirm it supports RAR and `authorization_details_types_supported`.
If it does not, `brain_access` is unimplementable without also building the AS,
and that belongs on the critical path.

**CR-19 — Phase 5.** Add Transaction Tokens (`draft-ietf-oauth-transaction-tokens`
rev 11, active WG draft) as the candidate mechanism for propagating actor,
subject, and purpose across the internal call chain that BR-REQ-12 requires
(API → workers → transactions → indexes → caches → exports). Phase 5 currently
asserts end-to-end enforcement with no propagation mechanism named.

**CR-20 — Phase 6.** Add OpenID Federation trust-chain resolution and trust-mark
verification to the pilot's exercise list, or record the decision not to.

### `identity-capability-gap-analysis-2026-09-05.md` (minor)

**CR-21 —** The FAPI section links `fapi-security-profile-2_0.html`; the Final
Specification (February 2025) is at `fapi-security-profile-2_0-final.html`, which
the authorization doc already uses. Align.

**CR-22 —** The relationship-authorization row requires "stable
allow/deny/unknown/unavailable/error classes." If the port becomes
AuthZEN-shaped (CR-7), this requirement needs an explicit mapping, because
AuthZEN's `decision` is boolean.

---

## 4. Open questions the author has to decide

1. **Is cross-brain federation redirect-based or back-channel only?** Everything
   about the Phase-1 → Phase-6 gate depends on this, and the docs never say.
2. **Trust layer: OpenID Federation, or bilateral registration?** Now a real
   choice with a Final standard on one side, an interop-tested implementation
   base, and a documented cost on the other.
3. **Is the grant an object or a token?** GNAP's answer is "an object." The
   proposal's `expires_at`-inside-RAR and its revocation/narrowing/suspension
   lifecycle only cohere if the grant is a first-class addressable resource.
4. **Does the port adopt the AuthZEN wire shape, and how are the five decision
   classes carried over a boolean `decision`?**
5. **Where does `data_subject` live — inside `authorization_details`, or in a
   separate signed grant object?** Phase 0 already flags this. RFC 9396 §13
   pushes toward "not in the front channel at all," which argues for the
   separate object plus a `grant_id` reference in the detail.
6. **JWT claim or introspection for the granted detail?** Offline verification
   with staleness vs. online AS authority. This determines whether revocation
   can be enforced at the token layer or only by local grant state.
7. **Which authorization server?** RAR support is not universal; the plan assumes
   it without naming a product.
8. **What is the purpose vocabulary, and is it shared across authorities?** A
   controlled vocabulary that is local to one authority cannot be evaluated by a
   peer. Neither AuthZEN `context` nor RAR standardizes purpose.
9. **Does the disclosure receipt need to carry, or reference, a consent record
   (ISO/IEC TS 27560)?** Answer before any regulated-domain profile is
   contemplated; that profile is out of scope here but will force the question.
10. **Do you track the pre-standard work (Identity Chaining, Transaction Tokens,
    AARP, Obligations, RAR agent extensions), or freeze against published RFCs
    plus OpenID Final Specifications only?** Both are defensible; the docs
    should state which, because four of the proposal's invented fields have
    draft-standard counterparts already in flight.
