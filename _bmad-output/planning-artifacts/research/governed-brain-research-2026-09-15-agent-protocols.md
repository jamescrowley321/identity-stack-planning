# Agent protocols + purpose binding — relayed sub-agent findings, 2026-09-15

_Relayed from a sub-agent dispatched by one of the research agents._
_NOTE FOR PUBLICATION: this file contains regulated-domain (sector-profile) material. Per the
no-domain-framing rule, the published artifact must generalize it — "one regulated-domain sector
profile, out of scope here" — and must not carry the domain vocabulary or its sector URLs._

## GNAP
RFC 9635 (https://datatracker.ietf.org/doc/rfc9635/), Standards Track, published October 2024.
Models delegation richly (subject information conveyed to client, multi-party grants), carries dedicated
privacy sections (surveillance, stored data, intrusion, correlation). Does NOT model purpose as an
authorization input. Published but thinly implemented as of Sept 2026.

## Purpose binding in a regulated-domain sector profile (DOMAIN-STRIPPED FOR PUBLICATION)
The one place purpose is bound into a token grant in production today is a sector profile in a regulated
domain. Mechanism, stated generically:
- A signed client JWT carries an extension object; a `purpose_of_use` member is REQUIRED, valued from a
  governed code set maintained by the sector's governance body under a registered OID namespace.
- The authorization server MUST return `invalid_grant` when authorization metadata is insufficient, with a
  `consent_required` error extension listing acceptable consent-policy identifiers.
- Crucially, the governing procedure states that including the purpose code is an **attestation** that the
  transaction adheres to the rules — asserted by the client, not proven. Enforcement is contractual.
- The governing implementation SOP was still DRAFT (Oct 2025) at the time of research; finalization
  unverified. The underlying security IG is STU 2 (generated 2025-12-09), and its purpose value set is a
  SHOULD, not mandatory for conformance.
**Lesson for the governed brain: production purpose-binding exists, but as a client attestation backed by
contract, not by cryptography or by the resource server's own verification. A governed brain that treats a
purpose claim as *proof* would be weaker than it looks; treat it as an asserted input that the receipt
records and that policy may corroborate.**

## ISO/IEC 27560
Current is ISO/IEC **TS** 27560:2023 — a Technical Specification, NOT a full International Standard
(https://www.iso.org/standard/80392.html). A revision is in committee as ISO/IEC WD 27560 and will replace
the 2023 TS (https://www.iso.org/standard/91775.html). Its JSON-LD annex examples reference DPV.
It does NOT bind to an OAuth token.

## W3C DPV
Version 2.3, published 2026-02-25 (https://w3c-cg.github.io/dpv/2.3/dpv).
Standing is load-bearing: a **Final Community Group Report** that states explicitly it "is not a W3C Standard
nor is it on the W3C Standards Track" — Community Final Specification Agreement, not W3C Process.
Defines a large machine-readable Purpose taxonomy (AcademicResearch, Advertising, AccountManagement,
AgeVerification, CommercialPurpose, CustomerCare, DirectMarketing, …) plus a `Sector` concept via `hasSector`.

## Kantara consent receipts
UNVERIFIED by this sub-agent — no current Kantara-specific material surfaced before its budget ran out.
Assert no state for it from this source. (Covered separately by the receipts research agent.)

## A2A (Agent2Agent)
- v1.0.0 tagged **2026-03-12**, v1.0.1 **2026-05-28** (GitHub releases API). The Linux Foundation's
  "April 2026 v1.0" framing is the announcement (2026-04-09 press release), not the tag date. The AAIF move:
  press 2026-08-17 (Axios), A2A's own post 2026-08-27.
- **A2A does not propagate end-user identity.** Enterprise-ready page verbatim
  (https://a2a-protocol.org/latest/topics/enterprise-ready/): "A2A protocol payloads, such as JSON-RPC
  messages, don't carry user or client identity information directly."
  Corroborated by open issue #2028 (2026-07-03): "A2A v1.0 carries no principal in the payload... neither
  Message, Task, nor the agent card has a field for the human or upstream agent a request is made on behalf
  of." It proposes an `actorChain` member — open, 24 comments, UNADOPTED. Same status for #1937, #2079,
  #2093 (signed purpose envelopes) and the agent-identity cluster (#1497/#1672/#1786/#2043/#2167/#1575).
- Enumerating the `a2aproject` org, the only identity-adjacent extension repo is
  `experimental-ext-oid4vp-auth`, explicitly experimental. "Secure Passport" is an example in the docs, NOT
  an `a2aproject` repo — vendor claims that it is an official identity layer are unverified.

## Net
Nothing in the agent-protocol stack carries purpose or delegated user identity today. A2A and MCP both stop
at transport auth. The delegation plumbing is IETF-side and not yet RFC: identity-chaining-17 in the RFC
Editor queue; transaction-tokens-11 at "Waiting for Write-Up", and it has **no purpose claim** — it says
"The scope claim captures, as narrowly as possible, the purpose of this particular transaction."
