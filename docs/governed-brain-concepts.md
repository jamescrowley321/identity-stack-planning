# Governed Brain — Concepts and Requirements

**Status:** Proposed · **Date:** 2026-09-15

A *governed brain* is a scoped knowledge boundary that an agent, application, or
person reads from and proposes into, where every disclosure is an authorization
decision rather than a search result. This document defines what a governed
brain must **mean** and **do**. It does not say how to build one — the
[authorization model](governed-brain-authorization.md) defines the decision
composition, and the [implementation plan](governed-brain-implementation-plan.md)
sequences the work across this workspace's repositories.

The contract is deliberately independent of any database, cloud provider,
authorization engine, credential format, model provider, or deployment shape.

These are proposed requirements. They are not evidence that the capability
exists today, and they do not establish a certification or a legal conclusion
about data ownership.

## Why this belongs in the identity workspace

Agent memory is converging on a problem this workspace already owns — but not
the whole of it. Permission-aware retrieval is a mature product category:
retrieval filtered by *identity × document* ships today, and any design that
implies greenfield here will be read as uninformed. What no product or
specification composes is the **rest of the decision** — who the actor is acting
*for*, whether the **data subject** differs from the caller, what **class** the
record is, under what declared **purpose**, and whether all of that is still true
**now**.

That composed question — "may *this actor*, acting for *this subject*, obtain
*this class of record*, for *this purpose*, right now" — is an authorization
question, and it decomposes into the layers already mapped in
[Identity Capability Gap Analysis](identity-capability-gap-analysis-2026-09-05.md):
protocol, trust, resource-server, credential evidence, relationship
authorization, and conformance.

The gap analysis already establishes the two structural commitments this model
depends on — a **provider-neutral relationship-authorization port** with an
external engine behind it, and the boundary invariant that relationship
authorization is a *proxied capability* rather than an engine this workspace
implements. A governed brain is what sits on top of that port once the objects
being protected are knowledge records instead of application resources.

### What already exists

Named so this document stands on the field rather than beside it. Each row is the
closest shipped or specified art to one term of the decision; none composes all
five.

| Existing art | What it decides | What it leaves open |
|---|---|---|
| Enterprise search with mirrored source ACLs | Identity × document, evaluated per query | Delegation, data subject, purpose; ACL mirrors can lag their source |
| Managed search services that extract caller claims and filter inside the query pipeline | Identity × document, pre-filtered rather than post-filtered | Same three terms; chunk-level projection mismatches are documented |
| Document-level security in general-purpose search engines | Non-matching documents are never returned | Scores and aggregates can still leak the existence of unauthorized documents |
| Relationship-authorization retrievers built on Zanzibar-style engines | Per-document relationship check against the end user | Post-filtering, document granularity, no subject or purpose term |
| Memory products with per-request action allowlists and object-metadata filters | Class-of-record on read, fail-closed | Policy subject is often an API key rather than a user; no data subject |
| Delegation-aware agent identity from the large identity platforms | An actor chain distinct from the user | Proprietary claims, no data-subject term, no purpose input |
| Agent-protocol authorization hooks | A place to allow, deny, or modify a retrieval | Payload carries no user, subject, purpose, or class |

The two terms left unoccupied everywhere are **acting for this subject** and
**for this purpose**. That is the contribution this document is making, and it
should be read as an addition to the row above it rather than a replacement.

## Abstract concepts

### Brain

A brain is a scoped governed knowledge boundary. It receives observations,
source references, application activity, and proposals; it promotes only
approved revisions into governed knowledge. It may expose retrieval and
federation interfaces, but retrieval output is not automatically truth,
authority, approval, or policy.

### Scope

The contract supports two primary scopes:

| Scope | Meaning | Authority boundary |
|---|---|---|
| **Organization brain** | An organization, product, tenant, or team context | Governs that organization's approved operational, product, and agent knowledge within its tenant and environment boundaries |
| **Principal brain** | An individual person's governed personal context | Governs user-contributed context, preferences, permissions, goals, observations, and user-approved artifacts without replacing any external system of record |

Scope is not inferred from a login, device, application, model, or empty tenant
field. A professional's workspace and that professional as an individual are
different scopes even when the same person operates both.

### Authority

Each brain is authoritative for the governed records it creates and approves
within its scope. A source system remains authoritative for the underlying
record it owns. A brain stores the captured revision, citation, classification,
and provenance needed to show where a statement came from; it does not silently
become the system of record.

A shared control plane may issue or evaluate common policy conventions, grants,
and federation decisions without becoming a universal copy of every brain's
knowledge.

### Learning and promotion

Source intake and application activity are two observation paths. Both may
create proposals, corrections, unsupported-question records, or feedback.
Neither path may directly create approved truth. Approval, versioning,
provenance, snapshot publication, and maker-checker controls remain explicit.

### Federation

Federation is an authorized exchange between separately scoped brains. It is not
a shared database, a hidden additional brain, or a transfer of source authority.

The word collides with an established one and the two must not be conflated:
OpenID Federation (1.0 Final, 2026-02-17) means *trust establishment* between
entities — entity statements, trust chains, trust marks, and metadata policy that
can only narrow. This document's federation means *disclosure* between brains.
They compose rather than compete, and the trust-establishment problem is better
solved by adopting that specification than by hand-rolling signed metadata here.
A source may disclose a reference, a selective snapshot, or a bounded query
result. The recipient stores the result as source-attributed external evidence
and may create a local claim only through its own review and policy.

### Grant

A grant is a bounded authorization for a named recipient and operation. It
identifies the relevant subject, purpose, data class, selectors or fields,
validity window, revocation state, and onward-disclosure rule. "Read my brain"
is not an acceptable unbounded grant.

A grant is a **first-class, addressable, independently queryable object**, not a
property of a token. GNAP (RFC 9635) models it that way and is the right prior
art for the shape; its working group has concluded and it has no production
authorization-server support, so the concept is worth reusing and the protocol
is not. The closest prior attempt at this whole problem is UMA 2.0 — party-to-
party authorization for resources about a subject — which did not win adoption.
Three of its reasons are live risks here: a heavy contract imposed on the
resource server, bespoke semantics documented only in one project's prose, and an
assumed shared broker. Its permission ticket (deny plus a handle to go get
authorization), its claims-pushing model, and its persisted claims token are all
worth carrying forward.

### Receipt

A receipt is the recipient's durable record of a federation decision or
disclosure. It binds the request, source, revision or snapshot, policy and grant
references, redactions, timing, and verification result. A receipt records what
was disclosed and under which authority; it does not make the recipient
authoritative for the source material.

Two cautions carried over from the consent-receipt prior art. First, the word is
used here for the **issuer-side** record, which inverts its established usage —
in that prior art a receipt is the artifact the *subject* is given. Either give
the subject one or rename this to a disclosure record; do not quietly redefine a
term that already means something else. Second, "durable record" is not the same
as **verifiable**: a record held only by the party whose conduct is in question
proves nothing to anyone else, and BR-REQ-13 as written is satisfied by a row in
an operator's own database. Making a receipt independently verifiable is an open
requirement, not a solved one — see the research synthesis.

## Requirements

The identifiers below are stable review handles, not decision codes. An
implementation claiming conformance must provide evidence for each applicable
requirement and explicitly mark unsupported ones.

**BR-REQ-04 is the load-bearing one.** The actor / effective-subject / data-subject
separation is the single term the surrounding standards stack leaves unmodelled:
the identity-assertion authorization grant draft states it does not define
normative processing requirements for an actor token; the leading agent-to-agent
protocol carries no principal in its payload at all, so every implementation
needing delegation context invents a private schema; the shipped
delegation-aware agent identities model an actor chain but no data subject; and
the agent-identity-and-mission work explicitly puts translation from mission to
authorization out of scope. The other fifteen requirements are assembly. This one
has no prior art to assemble from.

| ID | Requirement | Implementation-independent acceptance property |
|---|---|---|
| BR-REQ-01 | **Declare scope.** Every brain MUST expose a stable identity, scope type, subject, tenant/environment context where applicable, authority boundary, lifecycle state, and capability set. This SHOULD profile RFC 9728 (Protected Resource Metadata) rather than define a parallel descriptor — it already carries the resource identifier, authorization servers, key material, signed metadata, and the challenge that points a client at it. | A caller can distinguish an organization brain, a principal brain, and a separately deployed brain without inferring identity from a session or endpoint. |
| BR-REQ-02 | **Preserve authority.** A brain MUST distinguish its governed records from records for which another source system is authoritative. | Every sourced item identifies its source, revision, citation, and local status; local approval cannot rewrite source authority. |
| BR-REQ-03 | **Bind principal scope to a subject.** A principal brain MUST bind to a stable subject identity and MUST NOT be identified by a login session, device, application, or model. | Re-authentication, device change, or a new client does not create a second principal brain or change its subject. |
| BR-REQ-04 | **Separate actor, effective subject, and data subject.** A request MUST preserve the distinction between the actor making it, the subject on whose behalf it is made, and the person or entity the data describes. | Delegated and represented actions can be audited without collapsing identities into one principal. |
| BR-REQ-05 | **Require explicit target binding.** Every cross-brain request MUST bind the requester, source/target brain, operation, resource or selectors, purpose, validity window, and response mode. | A request cannot be replayed or retargeted to a different brain, resource, purpose, or operation. |
| BR-REQ-06 | **Compose authorization.** A disclosure MUST require all applicable identity, audience/resource, sender-proof, relationship, tenant, purpose, consent/authority, data-policy, grant, lifecycle, and revocation checks to pass. This is not a new decision request: it supplies the typed content of the `context` object in the AuthZEN Authorization API 1.0 (OpenID Final Specification, 2026-01-11), whose semantics that specification deliberately leaves outside its scope. Purpose values SHOULD come from a published taxonomy rather than a local enum. | No single token, credential, relationship tuple, or application role is sufficient when another required policy denies access; denial is the safe default. A conforming implementation can be checked against an external decision-API contract rather than only against this document. |
| BR-REQ-07 | **Constrain delegation.** Grants MUST be least-privilege, time-bounded, operation-specific, data-bounded, auditable, and revocable. Onward delegation MUST be separately permitted. | "Read" cannot silently imply write-back, policy change, training use, delegation, export, or onward sharing. |
| BR-REQ-08 | **Minimize disclosure.** Federation MUST return the smallest authorized result and MUST support references, selective snapshots, or bounded queries without requiring corpus replication. | A recipient receives only the approved classes, fields/selectors, and result limit for the stated purpose. |
| BR-REQ-09 | **Make revocation observable.** The protocol MUST distinguish at least active, expired, revoked, superseded, and deleted states where those states apply, and SHOULD carry state changes over the Shared Signals Framework and its continuous-access event profile rather than a bespoke webhook. Withdrawal *by the subject* and revocation *by another party* are distinct states, not one. | Source changes and revocations produce a verifiable status or supersession path; cached and derived copies have an explicit handling policy. Upstream event delivery is not assumed to be immediate — local grant state is the authority for a local decision. |
| BR-REQ-10 | **Preserve provenance.** Claims, snapshots, agent runs, and federation results MUST retain source references, revision/snapshot identifiers, policy/grant references, and retrieval timing sufficient to reconstruct their basis. | A reviewer can trace a derived result back to the source material and authorization context without relying on an unversioned search result. |
| BR-REQ-11 | **Separate observation from approval.** Intake, activity, retrieval, embedding, graph traversal, reranking, and model output MUST NOT by themselves create approved truth, policy, approval, or compliance results. | Promotion requires the declared review and maker-checker path; agents cannot expand their own authority through activity. |
| BR-REQ-12 | **Enforce isolation end to end.** Scope and classification MUST be enforced across API, workers, transactions, objects, indexes, graphs, caches, exports, events, backups, and federation responses. | A negative cross-tenant, cross-environment, cross-brain, and prohibited-class test fails closed at every path. |
| BR-REQ-13 | **Produce accountable receipts.** Mutations, approvals, grants, denials, disclosures, revocations, and material corrections MUST produce correlated audit evidence with appropriate redaction and retention handling. | An operator can reconstruct who/what/when/why/result without retaining raw credentials or sensitive prompts by default. |
| BR-REQ-14 | **Protect protocol integrity.** Cross-brain requests and responses MUST be bound to the intended participants, protected against replay and tampering, and rejected when freshness, key, audience, or signature validation fails. | Altered, expired, replayed, misaddressed, or unverifiable messages are not accepted as evidence or authorization. |
| BR-REQ-15 | **Support portability.** A hosted brain and a separately deployed brain MUST share the logical contract for identity, evidence, claims, snapshots, grants, provenance, receipts, and lifecycle. Discovery SHOULD reuse the RFC 9728 well-known location rather than a private endpoint convention. | Export/import and endpoint/key/capability discovery can be tested without making a provider-specific service the domain contract. |
| BR-REQ-16 | **Make capability status explicit.** Each implementation MUST identify which requirements are implemented, partial, deferred, or not applicable, with tests or evidence for the status. | Designed-for behavior is not reported as held production capability or certification. |

## Explicit non-requirements

The following are intentionally not decided here:

- a particular database, object store, graph engine, vector index, workflow
  engine, cloud, or model provider;
- a universal consent, custodianship, legal-ownership, or cross-jurisdiction
  vocabulary;
- a choice between reference, selective snapshot, and federated query as the
  first production mode;
- a cryptographic envelope, discovery trust-root model, or transport profile;
- whether a particular credential is sufficient for authorization; and
- a claim that any compliance framework, certification, or regulated production
  control is held today.

## Relationship to the rest of this workspace

| This document needs | Supplied by | Status |
|---|---|---|
| Issuer, key, token, and client verification | `identity-model` / `py-identity-model` | Shipping; cross-language parity varies |
| Canonical subject, tenant, and provider-link mapping | `identity-stack` canonical identity model | Planned (PRD 5) |
| Provider-neutral relationship authorization port | `identity-stack` integration boundary | Defined in the gap analysis; port not yet built |
| Relationship engine behind that port | A relationship-authorization engine meeting the architecture's selection criteria; not chosen | External, proxied — not implemented here |
| Brain scope, grants, provenance, receipts, federation | This document family | Proposed; no implementation |

The identity libraries stay product-neutral. Brain semantics — scope, authority,
promotion, grants, receipts, federation — live in this document family and in
whatever service eventually implements them. Neither layer absorbs the other.
