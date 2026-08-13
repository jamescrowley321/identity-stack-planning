---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '21'
epic_title: 'Cross-Platform Serialization Spec + Per-Language Serializers'
date: '2026-08-12'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0f-spec-extended-tier.md
---

# Epic 21: Cross-Platform Serialization Spec + Per-Language Serializers

**Goal:** Pin the language-neutral wire vocabulary shared by every identity-model port — the JWK member set, the OIDC discovery / AS-metadata document, and the claim/constant enums — into a normative serialization specification backed by executable round-trip conformance vectors, then prove Go and Rust serialize and parse that vocabulary identically.

## Overview

identity-model is a Go + Rust monorepo; `py-identity-model` (PIM) is the OIDF-certified reference implementation and a Node port is planned. Shared cross-language contracts live in `spec/`, with prose conformance definitions in `spec/conformance/*.json`. Today those ports each hand-write their own JWK and discovery parsers, and there is **no** normative document that says which members those types carry, what their canonical names are, how names differ across languages, or how a parser must behave when it meets a member it does not recognize. The result is silent divergence risk: two ports can each "work" against their own test provider yet disagree on the wire.

This epic closes that gap. It delivers:

1. A language-neutral **serialization specification** (`spec/serialization.md`) covering the JWK member set (RFC 7517), the OIDC discovery / RFC 8414 AS-metadata document (~45 fields), and the claim/constant enums (`JwtClaimTypes`, `oidc_constants`, `ConfirmationMethods`), with two behaviors pinned normatively:
   - **JWK and discovery parsers drop unknown members** — an unrecognized member is ignored, not an error.
   - **Token, introspection, and userinfo responses are loose pass-through** — extra claims round-trip unchanged and there is deliberately **no** typed claim model to port for those responses.
2. **Executable round-trip conformance vectors** (parse → re-serialize → structural-equal) that extend the existing `spec/conformance/*.json` vector schema.
3. **Go and Rust serializer conformance** wired to run those vectors green, proving cross-language structural parity.

It also resolves an existing overlap. A JSON-vector conformance runner already exists — `go/internal/conformance/` executing `spec/conformance/*.json` (merged as PR #36) — but only `validation.json` carries executable vectors; the other nine files are prose. This epic is where the cross-language JSON-vector model gets its real home: the serializer round-trip vectors **subsume and feed** that runner, and Story 21.5 records the source-of-truth decision and the reconciliation between the JSON-vector runner and the OIDF RP certification harness.

Scope is strictly **serialization**: field names, name mappings, member sets, and unknown-member policy for the three vocabularies above. This epic does not add protocol behavior, signature verification, network fetching, or new capabilities.

---

## Story 21.1: Serialization Specification (`spec/serialization.md`)

A language-neutral specification that authoritatively describes the wire vocabulary shared by all identity-model ports, so that every port serializes and parses the same members under the same rules.

### User Story

As a **port maintainer**,
I want a normative serialization specification in `spec/serialization.md`,
So that every language port agrees on the JWK member set, the discovery / AS-metadata schema, the claim/constant enums, their canonical field names, cross-language name mappings, and the unknown-member policy — without reverse-engineering another port's structs.

### Scope

The spec MUST define three vocabularies and the rules that govern them:

1. **JWK member set (RFC 7517).** Enumerate the JWK members the ports serialize — including `kty`, `use`, `key_ops`, `alg`, `kid`, the per-`kty` key-material members (`n`, `e`, `crv`, `x`, `y`, `d`, `k`, etc.), and the X.509 members `x5u`, `x5c`, `x5t`, and `x5t#S256`. State the canonical (on-the-wire) name for each per [RFC 7517 Section 4](https://datatracker.ietf.org/doc/html/rfc7517#section-4), and record the cross-language field-name mapping where a language cannot use the wire name verbatim — most notably `x5t#S256` (canonical wire name, [RFC 7517 Section 4.9](https://datatracker.ietf.org/doc/html/rfc7517#section-4.9)) ↔ the identifier-safe struct/field name `x5t_s256` used where `#` is not a legal member identifier.
2. **OIDC discovery / RFC 8414 AS-metadata document (~45 fields).** Enumerate the metadata members of the discovery document, covering both OpenID Provider Metadata ([OpenID Connect Discovery 1.0 Section 3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)) and OAuth 2.0 Authorization Server Metadata ([RFC 8414 Section 2](https://datatracker.ietf.org/doc/html/rfc8414#section-2)) — e.g. `issuer`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`, `registration_endpoint`, `introspection_endpoint`, `revocation_endpoint`, `scopes_supported`, `response_types_supported`, `grant_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`, `token_endpoint_auth_methods_supported`, `claims_supported`, `code_challenge_methods_supported`, and the remaining metadata members. Give each its canonical name and record any cross-language mapping.
3. **Claim / constant enums.** Pin the value sets carried by the ports as `JwtClaimTypes` (standard claim names — `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`, `azp`, `nonce`, `at_hash`, `c_hash`, and the OIDC profile claims), `oidc_constants` (protocol constant strings — grant types, response types, token-endpoint auth methods, `token_type` values), and `ConfirmationMethods` (the `cnf` confirmation members — `jkt`, `x5t#S256`, per [RFC 7800](https://datatracker.ietf.org/doc/html/rfc7800)). State that these are shared value vocabularies whose string values are identical across ports.

The spec MUST state, as normative rules:

- **Unknown-member policy, per type.** JWK parsing and discovery/AS-metadata parsing **drop** unknown members: an unrecognized member is silently ignored and parsing succeeds. Token, introspection, and userinfo responses **preserve** unknown members: extra claims are retained and round-trip unchanged via loose pass-through, and there is deliberately no typed claim model for those responses.
- **Canonical field names + cross-language name mappings.** For every member of every type, the canonical wire name is authoritative; any language-specific field name (e.g. `x5t_s256`) is recorded as a mapping to that canonical name so serialization emits the wire name regardless of internal identifier.
- **Machine-readable round-trip vector format.** Define a round-trip vector shape that extends the existing `spec/conformance/*.json` vector schema, sufficient to express "parse this input, re-serialize it, assert structural equality (modulo dropped unknown members for drop-policy types; including preserved unknown members for pass-through types)".

### Acceptance Criteria

- **AC-21.1.1** Given `spec/serialization.md`, when the JWK section is reviewed, then every JWK member it lists carries its canonical [RFC 7517 Section 4](https://datatracker.ietf.org/doc/html/rfc7517#section-4) wire name and, where applicable, a cross-language field-name mapping — and the `x5t#S256` ↔ `x5t_s256` mapping is stated explicitly with the RFC 7517 Section 4.9 reference.
- **AC-21.1.2** Given the discovery / AS-metadata section, when its member list is reviewed, then it enumerates the OpenID Provider Metadata and RFC 8414 AS-metadata members with canonical names, and each member cites either [OpenID Connect Discovery 1.0 Section 3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata) or [RFC 8414 Section 2](https://datatracker.ietf.org/doc/html/rfc8414#section-2) as its source.
- **AC-21.1.3** Given the claim/constant section, when it is reviewed, then `JwtClaimTypes`, `oidc_constants`, and `ConfirmationMethods` are each documented as shared value vocabularies whose string values are byte-identical across ports, with the standard claim names grounded in their defining specs.
- **AC-21.1.4** Given the unknown-member policy section, when a reader checks the policy for each type, then the spec states unambiguously that JWK and discovery/AS-metadata parsing **drops** unknown members (parse succeeds, member ignored) while token/introspection/userinfo responses **preserve** unknown members via loose pass-through with no typed claim model.
- **AC-21.1.5** Given a JWK document containing a member no port recognizes, when the spec's drop rule is applied, then parsing succeeds and re-serialization omits the unrecognized member — and the spec says so explicitly.
- **AC-21.1.6** Given an introspection or userinfo response containing an extra, non-standard claim, when the spec's pass-through rule is applied, then that claim is retained and re-serialized unchanged — and the spec says so explicitly.
- **AC-21.1.7** Given the round-trip vector format section, when it is reviewed, then it defines a vector shape that extends the existing `spec/conformance/*.json` schema and is precise enough for a maintainer to author parse → re-serialize → structural-equal vectors in any language without ambiguity, including how structural equality treats dropped vs. preserved unknown members.
- **AC-21.1.8** Given the whole spec, when its normative statements are checked, then each cites an explicit source (RFC 7517 section, RFC 8414 Section 2, OIDC Discovery 1.0 Section 3, or RFC 7800 for `cnf`), and the document introduces no protocol behavior beyond serialization.

### RFC References

- [RFC 7517 Section 4 — JSON Web Key (JWK) Members](https://datatracker.ietf.org/doc/html/rfc7517#section-4)
- [RFC 7517 Section 4.8 — `x5t` (X.509 Certificate SHA-1 Thumbprint)](https://datatracker.ietf.org/doc/html/rfc7517#section-4.8)
- [RFC 7517 Section 4.9 — `x5t#S256` (X.509 Certificate SHA-256 Thumbprint)](https://datatracker.ietf.org/doc/html/rfc7517#section-4.9)
- [RFC 8414 Section 2 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)
- [OpenID Connect Discovery 1.0 Section 3 — OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [RFC 7800 — Proof-of-Possession Key Semantics (`cnf`, `jkt`, `x5t#S256`)](https://datatracker.ietf.org/doc/html/rfc7800)

---

## Story 21.2: Round-Trip Conformance Vectors

Author the executable serialization vectors that turn `spec/serialization.md` from prose into a machine-checkable contract, extending the vector schema the conformance runner already executes for `validation.json`.

### User Story

As a **port maintainer**,
I want executable round-trip serialization vectors for JWK, the discovery document, and the claim/constant enums in `spec/conformance/`,
So that every port can prove — mechanically, in CI — that it parses and re-serializes the shared vocabulary identically, rather than relying on prose review.

### Scope

- Author round-trip vectors (parse → re-serialize → structural-equal) for:
  - **JWK** — one or more representative keys per `kty` (RSA, EC, OKP, oct), each JWK's full member set, plus a `cnf`/thumbprint case exercising `x5t#S256` ↔ `x5t_s256`.
  - **Discovery / AS-metadata document** — a full ~45-field discovery document plus a minimal one, exercising both OIDC Provider Metadata and RFC 8414 AS-metadata members.
  - **Claim / constant enums** — vectors asserting the canonical string values of `JwtClaimTypes`, `oidc_constants`, and `ConfirmationMethods` are emitted and parsed identically.
- Include **drop-policy** vectors: JWK and discovery inputs carrying unknown members, with expected re-serialized output that omits them (parse succeeds, unknown dropped).
- Include **pass-through** vectors: introspection/userinfo response inputs carrying extra claims, with expected output that preserves them unchanged.
- Extend the existing `spec/conformance/` vector schema (the one `go/internal/conformance` already executes for `validation.json`) rather than inventing a parallel format; the new vectors live under `spec/conformance/` (e.g. `serialization.json` or per-type files) and validate against that schema.
- The vectors are the executable realization of the Story 21.1 format; where prior `spec/conformance/*.json` files are prose-only, this story's vectors demonstrate the executable pattern those files should follow.

### Acceptance Criteria

- **AC-21.2.1** Given the new serialization vectors, when each is validated, then it conforms to the extended `spec/conformance/` vector schema and declares an input, an expected re-serialized output, and a structural-equality assertion mode.
- **AC-21.2.2** Given a JWK round-trip vector for each `kty` (RSA, EC, OKP, oct), when parse → re-serialize is applied, then the output is structurally equal to the input over the canonical JWK member set, and the `x5t#S256` member survives the `x5t_s256` internal mapping with its canonical wire name intact.
- **AC-21.2.3** Given the full ~45-field discovery vector, when parse → re-serialize is applied, then every enumerated OIDC/RFC 8414 metadata member round-trips under its canonical name; and given the minimal discovery vector, then only the present members appear in the output.
- **AC-21.2.4** Given a JWK or discovery **drop-policy** vector containing an unknown member, when parse → re-serialize is applied, then parsing succeeds and the expected output omits the unknown member — asserting the drop policy mechanically.
- **AC-21.2.5** Given an introspection/userinfo **pass-through** vector containing an extra claim, when parse → re-serialize is applied, then the expected output preserves the extra claim unchanged — asserting the pass-through policy mechanically.
- **AC-21.2.6** Given the enum vectors, when checked, then they assert the exact canonical string values of `JwtClaimTypes`, `oidc_constants`, and `ConfirmationMethods` such that any drift in a value fails the vector.
- **AC-21.2.7** Given the vector set as a whole, when a schema-validation step runs, then every vector references only members defined in `spec/serialization.md`, and no vector introduces behavior outside serialization.

### RFC References

- [RFC 7517 Section 4 — JSON Web Key (JWK) Members](https://datatracker.ietf.org/doc/html/rfc7517#section-4)
- [RFC 7517 Section 4.9 — `x5t#S256`](https://datatracker.ietf.org/doc/html/rfc7517#section-4.9)
- [RFC 8414 Section 2 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)
- [OpenID Connect Discovery 1.0 Section 3 — OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [RFC 7800 — `cnf` Confirmation Members](https://datatracker.ietf.org/doc/html/rfc7800)

---

## Story 21.3: Go Serializer Conformance

Wire the Go port to execute the Story 21.2 vectors green, and reconcile the result with the port's existing hand-written JWK and discovery parsers.

### User Story

As a **Go port maintainer**,
I want `go/internal/conformance` (or a dedicated `go/pkg` seam) to run the serialization round-trip vectors green,
So that the Go JWK and discovery serializers are proven to match the normative spec, and any divergence in the existing parsers is surfaced and reconciled rather than hidden.

### Scope

- Extend the existing `go/internal/conformance` runner (which already executes `spec/conformance/validation.json`) to load and execute the Story 21.2 serialization vectors; or introduce a new `go/pkg` seam if a public serializer surface is the cleaner home. Prefer reusing the existing runner to avoid a second execution path.
- Drive each vector through the Go port's real JWK and discovery types (parse → re-serialize) and assert structural equality per the vector's mode.
- **Reconcile with existing parsers.** Where a vector exposes a mismatch — a member the Go parser drops that should round-trip, a name it emits that differs from canonical, or an unknown member it errors on instead of dropping — fix the Go serializer to match the spec, or (if the spec is wrong) raise a spec correction back into Story 21.1. Do not weaken a vector to make Go pass.
- Verify the `x5t#S256` ↔ `x5t_s256` mapping: the Go struct field may be `x5t_s256` (or a tagged equivalent) but the emitted JSON member MUST be the canonical `x5t#S256`.
- Confirm drop-policy and pass-through vectors behave correctly against the Go implementation.

### Acceptance Criteria

- **AC-21.3.1** Given the Go conformance runner, when the serialization vectors are executed, then all JWK, discovery, and enum round-trip vectors pass with structural equality.
- **AC-21.3.2** Given the `x5t#S256` JWK vector, when the Go port serializes its key type, then the emitted JSON member name is exactly `x5t#S256` (not `x5t_s256`) despite the internal field name, and the round-trip is structurally equal.
- **AC-21.3.3** Given a drop-policy vector, when the Go parser meets the unknown member, then parsing succeeds and the re-serialized output omits it — matching the vector.
- **AC-21.3.4** Given a pass-through vector, when the Go path handles the introspection/userinfo response, then the extra claim is preserved and re-serialized unchanged.
- **AC-21.3.5** Given a vector that initially fails against the existing Go parser, when the mismatch is reconciled, then the fix lands in the Go serializer (or a justified spec correction lands in Story 21.1) and the vector is unchanged.
- **AC-21.3.6** Given CI, when the Go serialization conformance job runs on a PR, then a regression that breaks any serialization vector fails the job with the failing vector identified.

### RFC References

- [RFC 7517 Section 4 — JSON Web Key (JWK) Members](https://datatracker.ietf.org/doc/html/rfc7517#section-4)
- [RFC 7517 Section 4.9 — `x5t#S256`](https://datatracker.ietf.org/doc/html/rfc7517#section-4.9)
- [RFC 8414 Section 2 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)
- [OpenID Connect Discovery 1.0 Section 3 — OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)

---

## Story 21.4: Rust Serializer Conformance

Run the same Story 21.2 vectors green in the Rust (serde-based) port, proving Go and Rust serialize the shared vocabulary structurally identically.

### User Story

As a **Rust port maintainer**,
I want the serialization round-trip vectors to run green against the serde-based Rust serializers,
So that Rust and Go are proven to parse and emit the same JWK, discovery, and enum vocabulary identically, establishing cross-language structural parity.

### Scope

- Add a Rust conformance test harness that loads the Story 21.2 vectors from `spec/conformance/` and drives them through the Rust port's serde-based JWK and discovery types (parse → re-serialize → structural-equal).
- Honor the canonical name mappings via serde attributes: the Rust field may be `x5t_s256` with `#[serde(rename = "x5t#S256")]` (or equivalent) so the emitted member is the canonical `x5t#S256`.
- Implement drop-policy behavior for JWK and discovery (serde ignores unknown members by default — assert this is the case and not overridden by `deny_unknown_fields`), and pass-through behavior for introspection/userinfo responses (unknown claims retained, e.g. via a flattened extra-claims map).
- **Prove parity, not just per-language pass.** The Rust harness executes the same vector files the Go harness executes; a vector that passes in Go MUST pass in Rust and vice versa. Any port-specific divergence is reconciled in the serializer, never by forking the vectors.

### Acceptance Criteria

- **AC-21.4.1** Given the Rust conformance harness, when the serialization vectors are executed, then all JWK, discovery, and enum round-trip vectors pass with structural equality.
- **AC-21.4.2** Given the `x5t#S256` JWK vector, when the Rust serde serializer emits the key, then the JSON member name is exactly `x5t#S256` via the rename attribute, and the round-trip is structurally equal.
- **AC-21.4.3** Given a drop-policy vector, when Rust deserializes then reserializes, then the unknown member is dropped (serde default, not `deny_unknown_fields`) and the output matches the vector.
- **AC-21.4.4** Given a pass-through vector, when Rust handles the introspection/userinfo response, then the extra claim is preserved (e.g. flattened extra-claims map) and re-serialized unchanged.
- **AC-21.4.5** Given the identical vector files executed by both Go (21.3) and Rust (21.4), when both harnesses run, then the pass/fail set is identical — proving cross-language structural parity — and no vector is forked or weakened per language.
- **AC-21.4.6** Given CI, when the Rust serialization conformance job runs on a PR, then a regression that breaks any serialization vector fails the job with the failing vector identified.

### RFC References

- [RFC 7517 Section 4 — JSON Web Key (JWK) Members](https://datatracker.ietf.org/doc/html/rfc7517#section-4)
- [RFC 7517 Section 4.9 — `x5t#S256`](https://datatracker.ietf.org/doc/html/rfc7517#section-4.9)
- [RFC 8414 Section 2 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)
- [OpenID Connect Discovery 1.0 Section 3 — OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)

---

## Story 21.5: Source-of-Truth Strategy + Conformance-Mechanism Reconciliation (Design Decision)

A design-decision story whose deliverable is a recorded, justified decision in the epic body (and mirrored into `spec/serialization.md`), not new code. It answers two questions the epic forces to the surface.

### User Story

As a **project maintainer**,
I want a documented, justified decision on how the serializers stay in sync across languages, and on how the two overlapping conformance mechanisms relate,
So that future ports (Node, and PIM parity) follow one agreed model rather than each maintainer guessing.

### Design Decision A — Source-of-truth strategy

**Question.** Should the per-language serializers be **hand-written per language** (governed by shared behavioral vectors), or generated from a **shared JSON-Schema / codegen source of truth**?

**Recommendation — hand-written per-language serializers, governed by shared conformance vectors as the behavioral source of truth.** The `spec/conformance/` round-trip vectors (Stories 21.2–21.4) are the authoritative shared artifact; the language types (Go structs with tags, Rust serde structs) remain hand-written and idiomatic.

**Justification.**
- **The schema is small, stable, and standards-frozen.** The JWK member set (RFC 7517), the ~45-field discovery/AS-metadata document (RFC 8414 / OIDC Discovery 1.0), and the claim/constant enums change rarely and only when a standard changes. The maintenance cost that would justify a codegen pipeline is not present.
- **Codegen fights idiomatic serialization.** A JSON-Schema-to-struct generator would collide with Go struct tags and Rust serde attributes exactly where the interesting behavior lives — the `x5t#S256` ↔ `x5t_s256` rename, and the drop-vs-preserve unknown-member policy. Those are per-language serializer idioms, not schema shape, so a generator would need per-language escape hatches that erode its value.
- **Pass-through resists codegen by design.** Token/introspection/userinfo responses have deliberately **no** typed model — they are loose pass-through. A codegen source of truth has nothing to generate there, so codegen could at best cover the JWK + discovery half while the pass-through half stays hand-written anyway.
- **Two-toolchain build cost.** A shared codegen step would impose a generator dependency and a generate-check on both the Go and Rust builds (and Node/Python later). Shared **vectors** impose only a test dependency — every language already runs tests in CI — which is strictly cheaper and language-agnostic.
- **Behavioral parity is what actually matters.** Structural parity is guaranteed by both ports passing the *same* vectors (AC-21.4.5), which a codegen approach does not by itself guarantee (identical structs can still serialize differently). The vectors test the property we care about directly.

**Consequence.** New ports (Node, PIM-parity checks) adopt the serializers by making the shared `spec/conformance/` vectors pass, not by consuming generated code. `spec/serialization.md` remains the human-readable normative source; the vectors are its executable enforcement. A JSON-Schema representation MAY still be published later as documentation, but is explicitly **not** the codegen source of truth for the serializers.

### Design Decision B — Reconciling the two conformance mechanisms

**Question.** identity-model now has two overlapping mechanisms: (1) the JSON-vector conformance runner (`go/internal/conformance` + `spec/conformance/*.json`, merged as PR #36, where only `validation.json` is executable today and the other nine files are prose), and (2) the OIDF RP certification harness under `conformance/`. Which owns what?

**Resolution (state explicitly).**
- **The JSON-vector runner is the fast, in-CI, cross-language serializer / parity check.** It owns structural round-trip and parity — it is where the Story 21.2 vectors live and what Stories 21.3–21.4 execute. It runs on every PR in every language, requires no network or live provider, and is the mechanism that catches serialization drift. The serializer round-trip vectors **subsume and feed** this runner: they are the executable content the nine currently-prose `spec/conformance/*.json` files should grow toward, starting with serialization.
- **The OIDF RP certification harness (`conformance/`) remains the certification track.** It owns end-to-end protocol conformance against the OpenID Foundation test suite and is the basis for the "OpenID Certified" mark (PIM's track). It is heavier, network-bound, and run on a certification cadence — not per-PR-per-language.
- **No merge, no duplication of purpose.** The two are complementary, not redundant: the JSON-vector runner answers "do the ports agree on the wire, fast?"; the RP harness answers "does the implementation pass the official certification suite?". Serialization vectors belong to the former and never to the latter.

### Acceptance Criteria

- **AC-21.5.1** Given the epic body, when Story 21.5 is reviewed, then Design Decision A records a clear recommendation (hand-written per-language, vectors as source of truth) with the justification enumerated, and the decision is mirrored into `spec/serialization.md`.
- **AC-21.5.2** Given Design Decision A, when a maintainer reads it, then it explicitly explains why codegen was **not** chosen, citing the `x5t#S256` rename, the drop-vs-preserve policy, the no-typed-model pass-through, and the two-toolchain build cost.
- **AC-21.5.3** Given Design Decision B, when reviewed, then it states unambiguously that the JSON-vector runner is the fast in-CI cross-language serializer/parity check and the OIDF RP harness (`conformance/`) is the certification track, and that the two are complementary rather than redundant.
- **AC-21.5.4** Given Design Decision B, when reviewed, then it states that the Story 21.2 serialization vectors subsume and feed the existing `spec/conformance/*.json` runner (PR #36), and that the nine currently-prose conformance files are the backlog the executable-vector pattern extends to.
- **AC-21.5.5** Given both decisions, when a future port maintainer (Node, PIM parity) consults them, then the adoption path is unambiguous: make the shared vectors pass; do not generate serializers; do not route serialization checks through the RP harness.

### RFC References

- [RFC 7517 — JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)
- [RFC 8414 — OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 21.1 (Serialization Spec) | Existing `spec/conformance/` vector schema (PR #36); Epic 0B (Discovery/JWKS spec) for member provenance |
| 21.2 (Round-Trip Vectors) | 21.1 (spec defines members, mappings, policy, vector format) |
| 21.3 (Go Serializer Conformance) | 21.2 (vectors exist); existing `go/internal/conformance` runner |
| 21.4 (Rust Serializer Conformance) | 21.2 (vectors exist); Rust serde types |
| 21.5 (Design Decision) | 21.1–21.4 surface the trade-offs the decision records; resolvable in parallel but ratified once 21.3/21.4 prove the vector-driven approach |

## Design Principles

1. **Serialization only** — This epic pins field names, name mappings, member sets, and unknown-member policy. It adds no protocol behavior, signature verification, network fetching, or new capabilities.
2. **Vectors are the executable contract** — `spec/serialization.md` is the human-readable norm; the `spec/conformance/` round-trip vectors are its mechanical enforcement, and both languages pass the *same* vectors to prove parity.
3. **Canonical wire name wins** — Internal field identifiers (e.g. `x5t_s256`) are mappings; the emitted member is always the canonical wire name (e.g. `x5t#S256`).
4. **Policy is per-type and explicit** — JWK and discovery drop unknown members; token/introspection/userinfo preserve them via loose pass-through. The policy is stated per type and tested per type.
5. **Two mechanisms, two jobs** — The JSON-vector runner is the fast in-CI parity check; the OIDF RP harness is the certification track. Serialization lives in the former.
