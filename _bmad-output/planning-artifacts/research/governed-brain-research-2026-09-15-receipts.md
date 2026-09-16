# Consent-receipt and audit prior art vs. the governed-brain grant/receipt model

**Research date:** 2026-09-15 · **Reviewed against:** `docs/governed-brain-concepts.md`,
`docs/governed-brain-authorization.md`, `docs/governed-brain-implementation-plan.md`
(all dated 2026-09-15, status *Proposed*).

Domain-neutral throughout: *principal / actor / subject / professional / class of record*.
Regulated-domain profiles are named only as out-of-scope. Nothing here is legal advice;
where a data-protection regime is cited it is cited as the **source of a general
obligation**, not as a compliance analysis.

Paywalled ISO texts were **not** read. Where an ISO document is cited, the citation is to
the public catalogue entry (designation, stage, date, published scope) and to a public
third-party mapping — never to an unread clause.

---

## 1. Verdict

**There is no single profile to adopt. There is a profile to *assemble*, and the proposal
should assemble it rather than invent a fourth vocabulary.**

Four bodies of prior art each solve one third of the problem and none solves the whole:

| Layer | Best available prior art | Adoptable today? |
|---|---|---|
| **Receipt/record structure** (what fields) | ISO/IEC TS 27560:2023 shape (header · parties · processing · events) | **Shape yes, text no** — paywalled, at stage 90.92, being replaced by ISO/IEC CD 27560.2 (stage 30.60, comments closed 2026-06-06) |
| **Vocabulary** (purpose, status) | W3C DPV 2.3 | **Yes, wholesale** — Final Community Group Report, 25 Feb 2026, FSA licence |
| **Proof** (verifiable, non-repudiable) | RFC 9942 COSE Receipts + RFC 9943 SCITT Transparency Service | **Yes** — both Standards Track, June 2026 |
| **Standing authority + revocation** | UMA 2.0 grant model + OpenID SSF/CAEP 1.0 event streams | **Pattern yes** — neither produces a durable, verifiable artifact |

**Kantara Consent Receipt v1.1 is a historical artifact, not a live profile.** It is dated
2018-02-20, was produced by the now-archived Consent & Information Sharing WG, and — this
is decisive — **puts revocation and validation explicitly out of scope** (§5.3.2 item 3:
"The ability to validate and revoke the receipt – and other aspects of the Consent Receipt
lifecycle are out-of-scope for this specification at this time"). It also leaves proof
entirely to the implementer (§5.3.1: signing "if the Consent Receipt is to be used for
proof of consent"). A specification that cannot express revocation cannot express the
proposal's `BR-REQ-09`. Its successor work (Kantara ANCR WG) is mid-flight and says of its
own output that "the canonical version for the submission is a working-group decision and
is not yet fixed."

**Where the proposal needlessly diverges:** it uses the word *receipt* for the
**issuer-side record**, which is the opposite of every prior art's usage. In Kantara,
ISO/IEC TS 27560 and RFC 9943 alike, the *record* is what the accountable party keeps and
the *receipt* is the artifact handed to the other party — in Kantara's case specifically to
the subject (§4.7: a CR "MUST be provided to the PII Principal in a human-readable
format"). The proposal's Receipt concept — "the recipient's durable record of a federation
decision" — takes the name and drops the property that makes the name mean anything.

**Where the proposal genuinely diverges for good reason:** its **grant** is an authority
that may or may not be consent. Every consent-receipt profile assumes consent is the legal
basis. The proposal is right not to collapse "standing authority" into "consent"; it is
wrong to therefore reject the *vocabulary*, which is basis-neutral.

**The load-bearing gap:** the implementation plan's Phase 6 done-when says "a disclosure
between two authorities produces a **verifiable** receipt" — but **no requirement in
`BR-REQ-01..16` makes a receipt verifiable by anyone.** `BR-REQ-13` asks for "correlated
audit evidence", which a row in the operator's own database satisfies. `BR-REQ-14` protects
*messages* against tampering, not the *receipt artifact*. As written, Phase 6's gate cannot
be met, because nothing upstream defines what it would mean to meet it.

---

## 2. What a receipt must carry to be verifiable and non-repudiable

Separate the two words; they need different machinery.

**Verifiable** = a party other than the issuer can establish that this artifact is
authentic and unaltered. Requires: a signature over a canonical serialization; a named,
resolvable issuer; key material that is discoverable *and* resolvable after rotation; and
every load-bearing field inside the signed envelope (nothing consulted out-of-band from a
mutable store).

**Non-repudiable** = the issuer cannot later deny issuing it, *and* cannot have
silently issued a different one. A signature gives the first only. Three residual attacks
survive a signature:

1. **Equivocation** — the issuer signs two contradictory receipts for the same event and
   shows a different one to each party.
2. **Omission** — the issuer simply never issued (or later destroyed) the receipt, and its
   absence is unprovable.
3. **Backdating** — the issuer signs later and asserts an earlier `occurred_at`.

All three are defeated by the same mechanism: entering the receipt (or its digest) into an
**append-only verifiable data structure** and returning an inclusion proof, with
consistency proofs available so a monitor can show the log never rewrote history. This is
the Certificate Transparency pattern (RFC 9162, §2.1.3.2 inclusion, §2.1.4.2 consistency,
§4.10 signed tree heads), now generalised and put on the standards track as **RFC 9942
(COSE Receipts)** and wrapped in an operating role by **RFC 9943 (SCITT)**.

NIST states the non-repudiation requirement domain-neutrally in **AU-10**: "Provide
irrefutable evidence that an individual (or process acting on behalf of an individual) has
performed [Assignment: organization-defined actions]", with **AU-10(1)** requiring the
binding of the information producer's identity to the information. A record the accused
party can rewrite, and whose absence nobody can detect, is not irrefutable.

---

## 3. Per-standard findings

### 3.1 Kantara Consent Receipt v1.1 — historical

- **Status:** "Kantara Initiative Technical Specification Recommendation", Version 1.1.0,
  Document Date **2018-02-20**, produced by the Consent & Information Sharing Work Group
  (now under Kantara's *Archived Groups* space).
  Spec PDF: <https://www.surveillancetrust.org/wp-content/uploads/2023/10/Consent-Receipt-Specification.pdf>
  (verbatim status text on p.1); Kantara download page
  <https://kantarainitiative.org/download/consent-receipt-specification/> (retrieved
  2026-09-15) still lists it under "Kantara Initiative Recommendations" with no
  supersession notice — i.e. it is *published and unretracted*, but unmaintained.
- **Required fields** (§4, "The JSON field names are normative"): `version` (MUST be
  `"KI-CR-v1.1.0"`), `jurisdiction`, `consentTimestamp`, `collectionMethod`,
  `consentReceiptID`, `piiPrincipalId`, `piiControllers[]`, `piiController`, `contact`,
  `address`, `email`, `phone`, `policyURL`, `services[]`, `service`, `purposes[]`,
  `purposeCategory`, `consentType` (default `"EXPLICIT"`), `piiCategory[]`, `termination`,
  `thirdPartyDisclosure`, `thirdPartyName` (if disclosure true), `sensitive`, `spiCat`.
  **Optional:** `publicKey`, `language`, `onBehalf`, `piiControllerURL`, `purpose`,
  `primaryPurpose`.
- **Revocation:** out of scope (§5.3.2 item 3, which lists "Status and revocation of
  consent" as *future* work).
- **Proof:** §5.3.1 — signing/encryption/key management are the implementer's
  responsibility "if the Consent Receipt is to be used for proof". §5.3.2 recommends JWT
  (RFC 7519), JWE (RFC 7516), JWS (RFC 7515) for transmission. The `publicKey` field is
  OPTIONAL and unbound to any verification procedure.
- **Three fields worth stealing:** `collectionMethod` (REQUIRED, §4.3.4 — "a description of
  the method by which consent was obtained"), `policyURL` (REQUIRED, §4.4.10, with the rule
  that the link "SHOULD continue to point to the old policy until there is evidence of an
  updated consent"), and `termination` (REQUIRED, §4.5.9 — conditions for termination).
  The proposal has no equivalent for any of the three.

### 3.2 Kantara ANCR WG — active but not adoptable

- **Status:** active WG (<https://kantarainitiative.org/work-groups/ancr/>, retrieved
  2026-09-15), chaired by Salvatore D'Agostino, stated purpose to "address the technical
  gaps, and take advantage of recent legal and standards development, to update version
  1.1."
- Repo <https://github.com/KantaraInitiative/ancr-wg> (retrieved 2026-09-15) carries a
  27560 Notice Receipt Extension, a PWI 26689 gap analysis, and WG5 liaison material
  submitted to ISO/IEC JTC 1/SC 27/WG 5, with activity referenced through March 2026 and
  calls from 2026-08-20. Its README states the canonical submission version **"is not yet
  fixed."**
- The ANCR Notice Record v0.8.9 wiki page (last updated 2023-03-18, marked archived)
  describes a controller-credential / privacy-contact / controller-security triad with
  annexes A–E.
- **Read:** a moving target. Track it; do not pin to it.

### 3.3 ISO/IEC 29184:2020 — published, confirmed, guidance not schema

- **Designation/title:** ISO/IEC 29184:2020, *Information technology — Online privacy
  notices and consent*. Edition 1, published **2020-06-02**, stage **90.93 (International
  Standard confirmed)** as of 2026-03-20.
  (iso.org blocks automated retrieval — HTTP 403 on both `iso.org/standard/70331.html`
  and a direct curl; catalogue data read from the ISO committee mirror
  <https://committee.iso.org/es/sites/isoorg/contents/data/standard/07/03/70331.html>,
  retrieved 2026-09-15.)
- **Published scope:** specifies controls that "shape the content and the structure of
  online privacy notices as well as the process of asking for consent to collect and
  process personally identifiable information (PII) from PII principals"; applicable "in
  any online context where a PII controller or any other entity processing PII informs PII
  principals of processing."
- **Annex B** carries the Kantara consent receipt as an *informative* example (per Kantara's
  own account of the adoption, <https://kantarainitiative.org/work-groups/ancr/>).
- **Full text not read (paywalled).** What is publicly verifiable: it is a **controls**
  standard about *notices and the consent-asking process*, with an informative receipt
  annex. It is **not** a schema you can validate against, and Annex B being informative
  means conformance to 29184 does not imply any receipt format.

### 3.4 ISO/IEC TS 27560:2023 → CD 27560.2 — the right shape, mid-revision

- **ISO/IEC TS 27560:2023**, *Privacy technologies — Consent record information structure*.
  Edition 1, published **2023-08-08**, stage **90.92 (International Standard to be
  revised)**, review dated April 2025.
  (ISO mirror: <https://committee.iso.org/es/sites/isoorg/contents/data/standard/08/03/80392.html>,
  retrieved 2026-09-15; catalogue page <https://www.iso.org/standard/80392.html> returns 403.)
- **Successor:** **ISO/IEC CD 27560.2**, retitled *Structure of Personally Identifiable
  Information (PII) Processing Records* — stage **30.60**, comment period closed
  **2026-06-06**, explicitly replacing TS 27560:2023
  (<https://committee.iso.org/es/sites/isoorg/contents/data/standard/09/17/91775.html>,
  retrieved 2026-09-15). Note the broadened title: the successor is moving beyond *consent*
  records to *processing* records generally — which is closer to what the proposal needs.
- **Published scope (both):** "an interoperable, open and extensible information structure
  for recording PII principals' consent to PII processing", supporting (a) providing
  records to the individual, (b) exchanging consent information between systems, (c)
  managing the lifecycle of recorded consent.
- **Full text not read (paywalled).** The field structure below is from the DPVCG's public
  mapping guide, *Consent Records and Receipts as per ISO/IEC TS 27560:2023 using DPV*
  (<https://w3c-cg.github.io/dpv/guides/consent-27560>, retrieved 2026-09-15) — a
  maintainer-authored mapping, not the standard text:

  - **Header:** `schema_version`, `record_id`, `pii_principal_id`
  - **Processing (≈22 fields):** `privacy_notice`, `language`, `purpose`,
    `pii_information`, `pii_controllers`, `collection_method`, `processing_method`,
    `storage_locations`, `retention_period`, `processing_locations`,
    `geographic_restrictions`, `recipient_third_parties`, `withdrawal_method`,
    `jurisdiction`, `privacy_rights`, `codes_of_conduct`, `impact_assessment`
  - **Personal data:** `pii_type`, `pii_attribute_id`, `pii_optional`,
    `sensitive_pii_category`, `special_pii_category`
  - **Parties:** `party_id`, `party_name`, `party_role`, `party_contact`, `party_address`
  - **Events:** `event_time`, `validity_duration`, `entity_id`, `event_type`, `event_state`
  - **Receipt vs record:** per the same guide, a **receipt** requires only a unique
    identifier and schema version, optionally embedding the full record or referencing it.

- **Read:** 27560 is the only prior art that carries an explicit **event** block with
  `event_state` and an explicit `withdrawal_method` — i.e. the revocation semantics Kantara
  lacked. Adopt its *four-block shape* and its *field names* so a later mapping is
  mechanical. Do not pin a version while the successor is at CD.

### 3.5 W3C Data Privacy Vocabulary (DPV) 2.3 — adopt it

- **Version 2.3, "Final Community Group Report 25 February 2026"**
  (<https://w3c-cg.github.io/dpv/2.3/dpv/>, retrieved 2026-09-15; `https://w3id.org/dpv/`
  currently 302-redirects here). This version:
  <https://www.w3.org/community/reports/dpvcg/CG-FINAL-dpv-20260225/>.
- **Status caveat:** a **Community Group Final Report**, *not* a W3C Recommendation. Licence
  is the W3C Community Final Specification Agreement. Maintained by the DPVCG; release
  history on <https://github.com/w3c/dpv/releases> shows ~9,982 concepts across extensions
  at 2.3, with one breaking change (`dpv:ServiceProvision` reorganised into
  `dpv:ServiceManagement`).
- **What it supplies the proposal:**
  - a **purpose taxonomy** (`AcademicResearch`, `Advertising`, `AgeVerification`,
    `AccountManagement`, …) — exactly the "controlled vocabulary" that
    `governed-brain-authorization.md` requires for `purpose` but never names;
  - a **status taxonomy** for authority state: `ConsentGiven`, `ConsentWithdrawn` (by the
    subject), `ConsentRevoked` (by another party), `ConsentExpired`, `ConsentRefused`,
    `ConsentInvalidated`, `ConsentRequested`, `ConsentUnknown` — which maps onto
    `BR-REQ-09`'s active/expired/revoked/superseded/deleted with the useful addition of a
    *who withdrew it* distinction the proposal lacks;
  - concepts named `ConsentRecord` and `ConsentReceipt`, plus `hasLegalBasis`, so an
    authority basis can be stated without asserting it is consent;
  - the ISO/IEC TS 27560 mapping above, maintained by the same group.
- **Cost of adoption:** one external vocabulary version to track (with a documented
  breaking change between minors), a pinned version IRI in the schema, and a local mapping
  table for terms DPV lacks. Benefit: purpose strings become comparable across brains,
  which `BR-REQ-05`'s cross-brain binding structurally requires and free text cannot give.

### 3.6 Verifiable Credentials and proof mechanisms

- **W3C VC Data Model 2.0 — "W3C Recommendation 15 May 2025"**
  (<https://www.w3.org/TR/vc-data-model-2.0/>). Defines "a tamper-evident credential whose
  authorship can be cryptographically verified"; a credential "MUST be secured by at least
  one securing mechanism" (VC Data Integrity, VC-JOSE-COSE, or SD-JWT); optional
  `validFrom` / `validUntil`; optional `credentialStatus`; holder and subject are "often,
  but not always, the same entity."
- **W3C Bitstring Status List v1.0 — "W3C Recommendation 15 May 2025"**
  (<https://www.w3.org/TR/vc-bitstring-status-list/>). Status/revocation for VCs, with a
  **minimum 131,072-entry bitstring** required for herd privacy, and §6.1 warning that
  "if the number of issued verifiable credentials is a small population, the ability to
  correlate an individual increases."
- **RFC 9162, *Certificate Transparency Version 2.0*, December 2021, Experimental**
  (<https://www.rfc-editor.org/rfc/rfc9162.html>). Append-only Merkle tree; inclusion
  proofs (§2.1.3.2), consistency proofs (§2.1.4.2), SCTs (§4.8), signed tree heads (§4.10),
  monitors that "MUST at least inspect every new entry" (§8.2). **Its privacy model is
  public-by-design:** §4 says log operators "SHOULD NOT impose any conditions on retrieving
  or sharing data from the log." That is the property to *not* copy.
- **RFC 9942, *CBOR Object Signing and Encryption (COSE) Receipts*, June 2026, Standards
  Track** (<https://www.rfc-editor.org/rfc/rfc9942.html>). Abstract: "COSE Receipts prove
  properties of a Verifiable Data Structure (VDS) to a verifier. VDSs and associated Proof
  Types enable security properties, such as minimal disclosure, transparency, and
  non-equivocation." Introduces header parameters `receipts` (394), `vds` (395), `vdp`
  (396); registries for VDS algorithms and proof types; `RFC9162_SHA256` as the initial VDS.
- **RFC 9943, *An Architecture for Trustworthy and Transparent Digital Supply Chains*, June
  2026, Standards Track** (<https://www.rfc-editor.org/rfc/rfc9943.html>) — the SCITT
  architecture, promoted from `draft-ietf-scitt-architecture-22`. Transparency Service
  "MUST produce COSE Receipts" (§5.1); signed statements carry CWT claims with issuer and
  subject identifiers (§6); receipts are "signed proofs of VDS properties" created at
  registration (§7); the VDS must be "append-only" such that "the Statement Sequence cannot
  be modified, deleted, or reordered" (§5.1.3); "Anyone with access to the TS can
  independently verify its consistency" (§4.5). Critically for privacy, §8.2 places the TS
  *inside* the confidentiality boundary ("The TS is trusted with the confidentiality of the
  Signed Statements presented for Registration") and §8 permits retaining "cryptographic
  metadata rather than the complete Signed Statement" — i.e. **SCITT explicitly supports a
  non-public transparency service over digests**, which CT does not.

  This is the most directly applicable prior art in the whole survey and it is eight
  months old. The proposal predates nothing here; it simply does not cite it.

- **Adjacent, worth knowing:** *Anumati: Proof of Adherence as a Formal Consent Model for
  Autonomous Agent Protocols* (arXiv 2604.16524, 2026-04-16) distinguishes "proof of
  acceptance (a timestamped acknowledgement)" from **proof of adherence**, "a per-action
  reasoning record citing the specific clause evaluated", via PolicyDocument /
  ConsentRecord / AdherenceEvent over A2A and MCP. Not a standard; useful framing for why
  the proposal's `policy_version` + `decision_inputs_digest` matter.

### 3.7 Audit-record requirements (framework-neutral)

- **NIST SP 800-53 Rev. 5** (September 2020, updated 2020-12-10; patch **Release 5.2.0**
  issued 2025-08-27, <https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final>).
- **AU-3 Content of Audit Records** — "Ensure that audit records contain information that
  establishes the following: a. What type of event occurred; b. When the event occurred;
  c. Where the event occurred; d. Source of the event; e. Outcome of the event; and f.
  Identity of any individuals, subjects, or objects/entities associated with the event."
  (<https://csf.tools/reference/nist-sp-800-53/r5/au/au-3/>, retrieved 2026-09-15.)
  **This is the non-negotiable floor: who · what · when · where · source · outcome.**
- **AU-3(3) Limit Personally Identifiable Information Elements** — restrict PII in audit
  records to the elements identified in the privacy risk assessment (Privacy baseline).
- **AU-9 Protection of Audit Information** — protect audit information from unauthorized
  access, modification and deletion; alert on tampering; AU-9(2) store on a physically
  separate system; AU-9(4) restrict audit management to a privileged subset.
- **AU-10 Non-repudiation** + **AU-10(1) Association of Identities** (bind producer identity
  to the information) / **AU-10(2)** validate that binding / **AU-10(3)** chain of custody.
  (<https://csf.tools/reference/nist-sp-800-53/r5/au/au-10/>.)
- **AU-11 Audit Record Retention** — retain for an organization-defined period supporting
  after-the-fact investigation and any applicable retention requirement.

**Mapped against the proposal:** `BR-REQ-13` gestures at AU-3's content ("who/what/when/why
/result") in its *acceptance property* but not in the requirement, names no fields, and
never reaches AU-9 (separation/tamper alerting), AU-10 (non-repudiation), or AU-11
(retention period). "Source of authority" — the grant reference — is the one field AU-3
implies (item d) that no consent-receipt prior art carries, and that the proposal's own
model makes central.

### 3.8 The privacy trap: the receipt is itself a record about the subject

A disclosure receipt asserts *that someone asked about this subject, when, and why*. The
metadata is often more sensitive than the payload — a timeline of which professionals
queried a subject is a profile of the subject.

- **RFC 6973, *Privacy Considerations for Internet Protocols*, July 2013, Informational**
  (<https://www.rfc-editor.org/info/rfc6973>). Data minimization: collect only "the minimal
  data necessary to perform a task"; limit identifiability via pseudonyms or by omitting
  identifiers; allow periodic re-randomisation to prevent correlation. Defines
  identifiability, pseudonymity, unlinkability, correlation. Notes that stored data faces
  compromise risk and that designers should weigh whether storage recommendations are
  necessary at all.
- **AU-3(3)** (above) is the framework-side statement of the same rule for audit records
  specifically.
- **RFC 9162 §4 / RFC 9943 §8.2** bound the design space: a *public* log leaks by
  construction (CT's real-world failure mode was internal hostnames); a *permissioned*
  transparency service keeps confidentiality inside the trust boundary and may retain only
  cryptographic metadata.
- **Bitstring Status List §6.1** is the cautionary note for status mechanisms: a
  small-population status list is a correlation vector, not a privacy feature.

**Retention and deletion — the durability/erasure conflict, stated generically:**
non-repudiation requires that a record survive the wishes of the party who would most like
it gone; general data-protection regimes impose an erasure/rectification obligation over
records about a person, and a storage-limitation obligation that pushes retention *down*
while AU-11 pushes it *up*. These cannot both be absolute.

The nearest published treatment of exactly this conflict is the EDPB's *Guidelines 02/2025
on processing of personal data through blockchain technologies*
(<https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_202502_blockchain_v2_en.pdf>,
version 2.0 adopted 2026-07-07; v1.0 April 2025). Cited here only as the source of a
**general** design obligation, not as a compliance analysis: it treats immutability as in
tension with erasure, advises resolving it at design time rather than at request time, and
notably advises against registering personal data on an immutable structure **in clear,
encrypted, or hashed form** — i.e. it does not accept "we only stored a hash" as a
settled answer. Whether a salted digest of a subject identifier is personal data is
contested and jurisdiction-specific; that is a question for counsel inside a
regulated-domain profile, which is out of scope here.

**The design that survives both pressures** (and the one recommended below) is a
**two-tier receipt**: a small, durable, log-anchored *proof stub* containing no recoverable
personal data, plus an erasable *detail record* holding everything that identifies. Erasure
destroys the mapping and the detail; the stub remains as an unlinkable digest and the
integrity chain is unbroken.

### 3.9 Standing grants and revocation prior art

- **RFC 7009, *OAuth 2.0 Token Revocation*, August 2013, Proposed Standard**
  (<https://www.rfc-editor.org/info/rfc7009>). "A revocation request will invalidate the
  actual token and, if applicable, other tokens based on the same authorization grant."
  Gaps for this purpose: client-initiated cleanup, not subject-initiated withdrawal;
  produces no artifact the subject can keep; revokes tokens, not the standing authority.
- **RFC 7662, *OAuth 2.0 Token Introspection*, October 2015, Proposed Standard**
  (<https://www.rfc-editor.org/info/rfc7662>). Response carries `active` (required) plus
  `scope`, `client_id`, `username`, `token_type`, `exp`, `iat`, `nbf`, `sub`, `aud`, `iss`,
  `jti`. Gap: `active` is a **pull-model boolean with no signature and no `as_of`** — a
  relying party cannot later prove what status it observed at time T.
- **OpenID Shared Signals Framework 1.0** and **OpenID Continuous Access Evaluation
  Profile 1.0**, both **Final Specifications published 29 August 2025**
  (<https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html>,
  <https://openid.net/specs/openid-caep-1_0-final.html>). SSF defines SET streams
  (push per RFC 8935 / poll per RFC 8936) with a Verification Event so a receiver can
  confirm the stream works. CAEP defines eight event types — session-revoked,
  token-claims-change, credential-change, assurance-level-change, device-compliance-change,
  session-established, session-presented, risk-level-change — with common optional claims
  `event_timestamp`, **`initiating_entity`** (admin / user / policy / system),
  `reason_admin` ("intended for logging and auditing") and `reason_user`. **`initiating_entity`
  is precisely the "who revoked this" field the proposal lacks.** Gap: SETs are transport
  events, not durable artifacts — they establish propagation, not proof.
- **UMA 2.0 Grant for OAuth 2.0 Authorization**, Kantara Recommendation, **2018-01-07**
  (<https://docs.kantarainitiative.org/uma/wg/rec-oauth-uma-grant-2.0.html>). Permission
  ticket as a correlation handle; RPT bound to requesting party + client + AS + RS +
  resource owner; claims pushing; revocation via RFC 7009. This is the closest prior art
  for a **standing, subject-managed authority over a resource the subject does not
  operate** — which is the proposal's grant, almost exactly. Its gap is the one the
  proposal is trying to fill: it "does not explicitly define audit logging requirements."
- **RFC 8693 Token Exchange** `act` / `sub` (already cited in the proposal) supplies the
  actor-chain half of `BR-REQ-04` on the wire but not in the receipt.

---

## 4. Recommended minimum field sets

Field names below deliberately track ISO/IEC TS 27560's public field names where an
equivalent exists, so a later mapping is mechanical rather than interpretive.

### 4.1 Minimum receipt field set

**Block A — artifact identity and integrity**

| Field | Justification |
|---|---|
| `receipt_id` | Kantara §4.3.5 `consentReceiptID` REQUIRED; TS 27560 header `record_id` |
| `schema_version` | Kantara §4.3.1 `version` REQUIRED (normative constant); TS 27560 header `schema_version`. A verifier must know the canonicalization rules before it can check a signature |
| `issuer` + `key_id` | RFC 9943 §6 (signed statements carry CWT claims with issuer identity); NIST AU-10(1) association of identities |
| `proof` | VC DM 2.0: a credential "MUST be secured by at least one securing mechanism"; Kantara §5.3.1 requires signing *if* the receipt is to serve as proof. Signature over canonical bytes, detached or enveloped (JWS or COSE_Sign1) |

**Block B — the event (AU-3 floor)**

| Field | Justification |
|---|---|
| `event_type` | AU-3 a ("what type of event occurred"); TS 27560 `event_type`. Enum: `disclosure` · `denial` · `grant_created` · `grant_narrowed` · `grant_revoked` · `grant_superseded` · `correction` |
| `occurred_at` **and** `issued_at` | AU-3 b; Kantara §4.3.3 `consentTimestamp` REQUIRED; TS 27560 `event_time`. Two fields, because the gap between them is what backdating exploits |
| `outcome` + `reason_code` | AU-3 e ("outcome of the event"). Reuse the machine-readable denial reason codes the plan's Phase 0 already commits to |
| `authority` + `endpoint` | AU-3 c and d ("where" and "source of the event") — which brain/authority decided, at which resource identifier |

**Block C — parties (three-way, per `BR-REQ-04`)**

| Field | Justification |
|---|---|
| `actor` (+ `actor_issuer`) | AU-3 f; RFC 8693 `act` — the immediate requesting human, service or agent |
| `on_behalf_of` | `BR-REQ-04`'s effective subject; absent ⇒ actor acts as itself |
| `data_subject_ref` | TS 27560 `pii_principal_id`, **but pseudonymised**: a salted, per-log, rotatable reference, never a direct identifier. RFC 6973 (pseudonymity, unlinkability); AU-3(3) |
| `recipient` + `recipient_role` | Kantara §4.5.10/§4.5.11 `thirdPartyDisclosure` / `thirdPartyName` REQUIRED; TS 27560 `recipient_third_parties` |

**Block D — source of authority** *(no consent-receipt prior art carries this; AU-3 d implies it)*

| Field | Justification |
|---|---|
| `grant_ref` + `grant_version` | AU-3 d, "source of the event", read as source of *authority*. Versioned so a narrowing is traceable |
| `authority_basis` | DPV `hasLegalBasis` terms — states *why* this was permitted (subject grant / standing authority / delegated / break-glass / other) without asserting a legal conclusion |
| `purpose` | DPV purpose taxonomy; Kantara §4.5.5 `purposeCategory` REQUIRED; TS 27560 `purpose`. Controlled vocabulary, never free text |
| `policy_version` + `decision_inputs_digest` | `BR-REQ-10` provenance. The proposal's own `RelationshipAuthorizationPort` already returns `model_id` and `tuple_snapshot` — bind them into the signed receipt or they are unverifiable |
| `human_approval_ref` | Present in the `brain_access` RAR shape; must survive into the receipt or maker-checker is unprovable after the fact |

**Block E — what was disclosed (shape, not content)**

| Field | Justification |
|---|---|
| `record_class` + `selectors` + `result_count` | `BR-REQ-08` minimise disclosure; AU-3(3). Classes and field names — never values |
| `content_digest` + `revision_id` / `snapshot_id` | `BR-REQ-10`. Lets a dispute be resolved against the exact bytes disclosed without the receipt containing them |
| `redactions_applied` | `BR-REQ-13`'s "appropriate redaction", made countable |

**Block F — binding, freshness, lifecycle**

| Field | Justification |
|---|---|
| `request_binding` | `BR-REQ-14`. Digest over request id / audience / resource / nonce, so a receipt cannot be re-presented for a different request |
| `transparency` (`log_id`, `vds`, `vdp`, tree-head ref) | RFC 9942 header parameters `receipts` (394) / `vds` (395) / `vdp` (396); RFC 9162 §2.1.3.2 inclusion, §2.1.4.2 consistency |
| `retention_class` + `expires_at` | NIST AU-11; storage-limitation obligation. Names which tier this receipt belongs to (durable stub vs erasable detail) |

### 4.2 Minimum grant field set

| Field | Justification |
|---|---|
| `grant_id`, `version`, `supersedes` | `BR-REQ-09` requires a *superseded* state; that is only expressible if grants are versioned rather than mutated |
| `issued_at`, `not_before`, `expires_at` | `BR-REQ-07` time-bounded; VC DM 2.0 `validFrom` / `validUntil` |
| `granter` + `granter_authn_ref` + `collection_method` | Kantara §4.3.4 `collectionMethod` REQUIRED — "a description of the method by which consent was obtained". A standing authority with no record of *how it was obtained and who was authenticated* cannot be defended in a dispute. **Missing from the proposal entirely** |
| `notice_ref` (immutable, versioned) | Kantara §4.4.10 `policyURL` REQUIRED, with the rule that the link "SHOULD continue to point to the old policy until there is evidence of an updated consent"; TS 27560 `privacy_notice`; ISO/IEC 29184's entire subject matter. **Missing from the proposal entirely** — and it is the single largest omission |
| `subject` | Pseudonymous ref, resolvable only inside the issuing authority |
| `grantee` (+ `grantee_kind`: user / service / agent, + agent version) | The authorization model already insists agent identity ≠ service identity; the grant must carry it |
| `actions[]`, `record_classes[]`, `selectors[]` | `BR-REQ-07` least-privilege; the proposal's own allowlist rule (empty list = none, not all) |
| `purpose` | DPV taxonomy — same vocabulary as the receipt, or cross-brain comparison is impossible |
| `onward_disclosure` (+ named permitted parties) | `BR-REQ-07` "onward delegation MUST be separately permitted"; Kantara `thirdPartyDisclosure` / `thirdPartyName` |
| `conditions` (tenant, environment, residency, human-approval-required, result limits) | `BR-REQ-12` isolation; already present in the `brain_access` RAR shape |
| `termination` / `withdrawal_method` | Kantara §4.5.9 `termination` REQUIRED; TS 27560 `withdrawal_method`. How the subject actually exercises revocation, stated in the grant itself |
| `status`, `status_changed_at`, `status_reason`, `initiating_entity` | `BR-REQ-09` state machine; DPV status terms; CAEP `initiating_entity` / `reason_admin` |
| `derived_copy_policy` | The authorization model's lifecycle §5 mentions cancelling queued jobs and removing derived copies in prose; nothing in `BR-REQ-01..16` compels it |
| `proof` | The grant is itself signed by the issuing authority, and grant creation emits its own receipt |

---

## 5. Proof mechanism: one recommendation, two rejections

### Recommend — signed receipt + permissioned append-only transparency log over digests

Concretely: every receipt is a COSE_Sign1 (or JWS, if the stack is JSON-native) over a
canonical serialization; its digest is registered in a verifiable data structure; the
registration returns an inclusion proof carried in the receipt using RFC 9942's
`vds`/`vdp` header parameters. The transparency service is **permissioned**, following RFC
9943 rather than RFC 9162 — the log holds digests and cryptographic metadata, not receipt
content (RFC 9943 §8 explicitly permits "retaining cryptographic metadata rather than the
complete Signed Statement"; §8.2 places the TS inside the confidentiality boundary).

For a two-authority federation, the cheapest credible topology is **mutual witnessing**:
each authority co-signs the other's tree heads. No public log, no third-party operator, and
equivocation still requires both parties to collude.

- **Who can verify:** the counterparty authority, the subject's agent, and any auditor given
  read access — without trusting the issuer.
- **What the subject can prove later:** that a disclosure with these exact properties was
  registered at a time bounded by a signed tree head, and — via consistency proofs — that
  the issuer did not rewrite history around it.
- **Key rotation:** the log entry is anchored at a tree head; verification needs the key
  that was valid *then*, so publish a key history keyed by validity interval. This is
  exactly the failure mode a bare signature has and a log-anchored signature does not.
- **Privacy leakage from the log:** bounded by construction — the log's leaves are digests,
  the service is permissioned, and no leaf content survives a detail-tier deletion.
- **Cost:** one more service, a canonicalization decision that must be frozen early, and
  monitoring discipline (a log nobody audits provides nothing).

### Reject 1 — Verifiable Credentials as the receipt envelope

VC DM 2.0 is a W3C Recommendation and technically sound, but it is built for a *holder*
presenting a credential *about a subject* to a *verifier*. A disclosure receipt is issued
about an **event**, most often to a party who is not the subject, at machine rate, once per
disclosure. Adopting VC drags in identifier resolution, a securing-mechanism choice
(Data Integrity vs VC-JOSE-COSE vs SD-JWT), and status-list infrastructure whose herd
privacy needs a 131,072-entry minimum (Bitstring Status List §6.1) — all to solve problems
receipts do not have. **Receipts are never revoked; they are superseded by a later event.**

Caveat worth recording: if the subject must ever *present* their standing authority to a
third party offline, VC is the right answer — **for the grant, not the receipt**. Keep that
door open by making the grant a signed object with `validFrom`/`validUntil` semantics.

### Reject 2 — a plain signed audit record in the operator's own store

This satisfies AU-3 content and AU-9 protection and is what `BR-REQ-13` currently asks for.
It fails on three counts. (1) The verifier is the operator, and the operator is the party
whose conduct is in dispute — AU-10 asks for "irrefutable evidence", and a record the
accused can rewrite is not that. (2) Omission is undetectable: nobody can prove a receipt
that was never written should have existed. (3) It fails `BR-REQ-15` portability — two
authorities have no way to cross-check each other's records, which is precisely what a
federation needs.

### Also reject — public blockchain / DLT anchoring

Same non-equivocation property as a private log, with the erasure conflict maximised and no
way to retire a leaf. The EDPB guidance cited in §3.8 advises against registering personal
data on such a structure in clear, encrypted **or hashed** form. A permissioned append-only
log with deletable detail and retained digests is the strictly better trade.

---

## 6. Specific change requests

### `docs/governed-brain-concepts.md`

**CR-1 · `BR-REQ-13` — split audit evidence from verifiable receipts.**
As written, an operator-owned database row satisfies `BR-REQ-13`. Keep AU-3-style content
as `BR-REQ-13` and add a new sibling requirement: a disclosure receipt MUST be a signed
artifact over a canonical serialization, issued by a named authority with resolvable and
rotatable keys, and MUST be verifiable by a party that is not the issuer.
*Acceptance property:* a verifier holding only the receipt and the issuer's published key
history validates it offline; any altered field fails validation.

**CR-2 · Receipt concept definition — reconcile with prior-art usage.**
The Receipt concept says "the recipient's durable record of a federation decision or
disclosure." Kantara §4.7 and ISO/IEC TS 27560's record-vs-receipt split both put the
*receipt* in the counterparty's — and in Kantara's case the subject's — hands. Either
(a) add a requirement that a subject (or their agent) can obtain the receipts concerning
them, or (b) rename the concept to **disclosure record** and state explicitly that
subject-facing receipting is deferred and why. Do not keep the word without the property.

**CR-3 · New `BR-REQ-17` — anchor receipts for non-equivocation.**
Require that each receipt's digest be registered in an append-only verifiable data
structure and that the receipt carry an inclusion proof, following RFC 9942's receipt/proof
structure and RFC 9943's Transparency Service role.
*Acceptance property:* two parties holding receipts for the same event can be shown
consistent; a missing, reordered or rewritten entry is detectable via a consistency proof.

**CR-4 · `BR-REQ-13` + `BR-REQ-10` — state a field floor.**
The requirements name no fields, which makes "correlated audit evidence" untestable. Adopt
the minimum receipt field set in §4.1, with AU-3 a–f as the explicit floor plus
`grant_ref`/`grant_version` (source of authority) and `content_digest`.

**CR-5 · `BR-REQ-07` — grant field floor, notice reference, and collection method.**
Grants are required to be "least-privilege, time-bounded, operation-specific, data-bounded,
auditable, and revocable" with no field list, and **nothing records what the granter was
shown or how the grant was obtained**. Add `notice_ref` (immutable, versioned) and
`granter_authn_ref` / `collection_method` per Kantara §4.3.4 and §4.4.10, plus the rest of
§4.2. A grant that cannot reproduce the notice under which it was given cannot be defended.

**CR-6 · `BR-REQ-09` — revocation must itself be receipted and acknowledged.**
Today revocation need only be "observable". Require that every state transition
(active → suspended / revoked / superseded / expired / deleted) emits its **own signed,
log-anchored receipt** carrying `initiating_entity`, reason code, time and the superseded
grant version — modelled on CAEP's `initiating_entity` / `reason_admin` / `reason_user` —
and that a recipient returns a signed acknowledgement covering derived copies and queued
work. Add a published maximum propagation window per data class so staleness is bounded and
testable, and surface it in the federation metadata the authorization model already defines.

**CR-7 · New `BR-REQ-18` — provable status at a point in time.**
Add a signed, timestamped grant-status response carrying an explicit `as_of`. RFC 7662's
`active` boolean is not evidence after the fact; a relying party that honoured a grant in
good faith currently has no way to prove what the status was when it acted.

**CR-8 · New `BR-REQ-19` — minimise the receipt.**
`BR-REQ-13`'s "appropriate redaction and retention handling" is unfalsifiable. Require:
receipts carry classes, selectors, counts and digests — never disclosed values, query text,
prompts, or free-text purposes; the subject is referenced by a salted, per-log, rotatable
pseudonym; a `retention_class` is declared per receipt tier with a named owner of deletion.
Cite AU-3(3) and RFC 6973. Add the two-tier stub/detail split from §3.8 as the acceptance
property: erasing the detail tier leaves the integrity chain intact and the stub unlinkable.

**CR-9 · `BR-REQ-06` purpose vocabulary — adopt DPV 2.3 by name.**
`governed-brain-authorization.md` requires `purpose` to come from "a controlled vocabulary"
and never names one, while the concepts doc's non-requirements decline "a universal
consent… vocabulary". Adopting DPV's **purpose taxonomy** is not adopting a consent regime —
it is a naming scheme, and its `hasLegalBasis` terms let a grant state a non-consent basis.
Also adopt DPV's status terms for `BR-REQ-09`'s state machine (`ConsentGiven` /
`ConsentWithdrawn` / `ConsentRevoked` / `ConsentExpired` / `ConsentInvalidated`) rather than
inventing five words — note DPV distinguishes withdrawal *by the subject* from revocation
*by another party*, a distinction `BR-REQ-09` currently collapses. Pin the version IRI
(2.3) and record the 2.2→2.3 breaking change as a tracked dependency.

**CR-10 · `BR-REQ-14` — bind the receipt to the request.**
Protocol integrity is required for messages, but nothing binds the *receipt* to the
specific request. Require `request_binding` (digest over request id, audience, resource,
nonce) inside the signed envelope, so a receipt cannot be re-presented for a different
request.

**CR-11 · `BR-REQ-16` — make capability status machine-readable.**
Capability status is required "from the first artifact" but has no defined shape. Require a
versioned, machine-readable conformance document (`requirement_id`, `status` enum,
`evidence_ref`, `tested_at`, `artifact_version`) published alongside the schemas, so partial
support is machine-checkable rather than prose. Cross-reference the plan's Phase 3 and
Phase 7.

### `docs/governed-brain-implementation-plan.md`

**CR-12 · Phase 6 done-when is currently unmeetable.**
"a disclosure between two authorities produces a verifiable receipt" — nothing upstream
defines verifiability. Either land CR-1 and CR-3 first, or reword the gate to what the
phase can actually demonstrate.

**CR-13 · Move two "Deliberately not decided" items earlier.**
"the wire format and cryptographic envelope for federation" and "retention classes, cache
and backup deletion, and legal-hold behavior" are exactly the decisions that determine
whether receipts are verifiable and whether erasure is possible. Deferring the envelope past
Phase 3 means the receipt schema gets designed without knowing whether it will be signed,
and unsigned schemas become permanent. Recommend: **signing envelope → Phase 0**
(it is a vocabulary-level commitment: canonicalization + algorithm + key-resolution rules);
**retention tiering → Phase 3** (it is a schema shape, not an ops decision).

**CR-14 · Phase 3 — name the external dependencies in the contract.**
Phase 3 produces schemas for "grants, receipts, and denial categories" with no reference to
any prior art. Add: field names tracking ISO/IEC TS 27560's public structure, purpose and
status terms from DPV 2.3, proof structure from RFC 9942. Record 27560's live revision
(CD 27560.2, stage 30.60) as a *tracked, unpinned* dependency with a mapping table, so the
successor's broadened scope ("PII processing records" rather than "consent records") can be
absorbed mechanically.

---

## 7. Open decisions

1. **Subject-facing receipts — yes or no?** The whole prior art assumes yes; the proposal
   currently implies no. If yes: what channel, and how does giving a subject a queryable
   disclosure history avoid becoming a new correlation surface of its own?
2. **Who operates the transparency service?** Self-operated (weakest), mutual witnessing
   between the two authorities (recommended for a two-party federation), or an independent
   third party (strongest, most operational cost). This changes nothing in the receipt
   format, so it can be deferred past Phase 3 — but not past Phase 6.
3. **Pseudonym lifecycle.** Per-subject, per-grant, or per-log-epoch salting? Rotation
   improves unlinkability and simultaneously destroys the subject's ability to enumerate
   their own history. Pick one and state the trade in the contract.
4. **Is a salted digest of a subject identifier personal data?** Contested,
   jurisdiction-specific, and the pivot on which the two-tier retention design stands or
   falls. A counsel question inside a regulated-domain profile; out of scope here, but the
   design should not assume the favourable answer.
5. **Retention split.** Which fields live in the durable stub vs the erasable detail, what
   the two retention periods are, and whether a legal hold can pin the detail tier past its
   normal expiry. AU-11 and storage-limitation pull in opposite directions; the split is
   where that is resolved, so it belongs in the schema.
6. **Are grants subject-presentable?** If a subject must ever show a third party that they
   hold a standing authority, the grant becomes a VC and the DID/status-list cost lands
   after all. Decide before Phase 3 freezes the grant schema.
7. **Does the word "receipt" survive?** Given the prior-art meaning, keeping it for the
   issuer-side record will mislead every reviewer who knows the field. Rename, or adopt the
   property.
8. **The durability-vs-erasure tension itself** is not resolvable by picking a side. The
   recorded position should be explicit: *the durable tier contains no personal data
   recoverable without a mapping the authority controls; erasure destroys the mapping;
   the integrity chain survives as unlinkable digests* — together with an
   acknowledgement that whether this satisfies any given regime is a question for a
   regulated-domain profile and is not decided here.

---

## Source index

| Source | Status | Date | URL |
|---|---|---|---|
| Kantara Consent Receipt Spec v1.1.0 | Kantara Technical Specification Recommendation; WG archived | 2018-02-20 | <https://www.surveillancetrust.org/wp-content/uploads/2023/10/Consent-Receipt-Specification.pdf> · <https://kantarainitiative.org/download/consent-receipt-specification/> |
| Kantara ANCR WG | Active WG; deliverables draft, canonical version "not yet fixed" | retrieved 2026-09-15 | <https://kantarainitiative.org/work-groups/ancr/> · <https://github.com/KantaraInitiative/ancr-wg> |
| ANCR Notice Record v0.8.9 | Archived wiki page | 2023-03-18 | <https://kantara.atlassian.net/wiki/spaces/WA/pages/42008577/> |
| ISO/IEC 29184:2020 | Published, stage 90.93 confirmed 2026-03-20; **text not read (paywalled)** | 2020-06-02 | <https://committee.iso.org/es/sites/isoorg/contents/data/standard/07/03/70331.html> |
| ISO/IEC TS 27560:2023 | Published TS, stage 90.92 (to be revised); **text not read (paywalled)** | 2023-08-08 | <https://committee.iso.org/es/sites/isoorg/contents/data/standard/08/03/80392.html> |
| ISO/IEC CD 27560.2 | Committee Draft, stage 30.60, comments closed 2026-06-06; replaces TS 27560:2023 | 2026-06-06 | <https://committee.iso.org/es/sites/isoorg/contents/data/standard/09/17/91775.html> |
| DPVCG guide: 27560 records/receipts using DPV | Community Group guide (public mapping, not the ISO text) | retrieved 2026-09-15 | <https://w3c-cg.github.io/dpv/guides/consent-27560> |
| W3C DPV 2.3 | Final Community Group Report (not a Recommendation) | 2026-02-25 | <https://w3c-cg.github.io/dpv/2.3/dpv/> |
| W3C VC Data Model 2.0 | W3C Recommendation | 2025-05-15 | <https://www.w3.org/TR/vc-data-model-2.0/> |
| W3C Bitstring Status List 1.0 | W3C Recommendation | 2025-05-15 | <https://www.w3.org/TR/vc-bitstring-status-list/> |
| RFC 9162 Certificate Transparency 2.0 | Experimental | 2021-12 | <https://www.rfc-editor.org/rfc/rfc9162.html> |
| RFC 9942 COSE Receipts | Standards Track (Proposed Standard) | 2026-06 | <https://www.rfc-editor.org/rfc/rfc9942.html> |
| RFC 9943 SCITT Architecture | Standards Track (Proposed Standard); was draft-ietf-scitt-architecture-22 | 2026-06 | <https://www.rfc-editor.org/rfc/rfc9943.html> |
| NIST SP 800-53 Rev. 5 (AU family) | Published; patch Release 5.2.0 2025-08-27 | 2020-09 / upd 2020-12-10 | <https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final> · <https://csf.tools/reference/nist-sp-800-53/r5/au/> |
| RFC 6973 Privacy Considerations | Informational (IAB) | 2013-07 | <https://www.rfc-editor.org/info/rfc6973> |
| RFC 7009 OAuth Token Revocation | Proposed Standard | 2013-08 | <https://www.rfc-editor.org/info/rfc7009> |
| RFC 7662 OAuth Token Introspection | Proposed Standard | 2015-10 | <https://www.rfc-editor.org/info/rfc7662> |
| OpenID Shared Signals Framework 1.0 | OpenID Final Specification | 2025-08-29 | <https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html> |
| OpenID CAEP 1.0 | OpenID Final Specification | 2025-08-29 | <https://openid.net/specs/openid-caep-1_0-final.html> |
| UMA 2.0 Grant for OAuth 2.0 | Kantara Recommendation | 2018-01-07 | <https://docs.kantarainitiative.org/uma/wg/rec-oauth-uma-grant-2.0.html> |
| EDPB Guidelines 02/2025 (blockchain & personal data) | Adopted guidelines, v2.0 | 2026-07-07 (v1.0 2025-04) | <https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_202502_blockchain_v2_en.pdf> |
| Anumati (arXiv 2604.16524) | Preprint, not a standard | 2026-04-16 | <https://arxiv.org/abs/2604.16524> |

**Retrieval note:** `iso.org` returns HTTP 403 to automated retrieval (confirmed for
`/standard/70331.html`, `/standard/80392.html`, `/standard/91775.html`, and via direct
curl); catalogue metadata above was read from ISO's own committee mirror. No ISO clause
text was read, and none is quoted.
