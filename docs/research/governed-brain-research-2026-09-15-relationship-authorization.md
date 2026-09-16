---
title: "Relationship Authorization as a Proxied Port — Field Review"
sidebar_label: "Relationship authorization"
description: "Field review of treating relationship authorization as a proxied port rather than an owned store."
status: proposed
last_verified: 2026-09-16
---

# Relationship Authorization as a Proxied Port — Field Review

**Date:** 2026-09-15 · **Scope:** assessment of the `RelationshipAuthorizationPort` boundary in
`governed-brain-authorization.md` / `governed-brain-concepts.md` / `governed-brain-implementation-plan.md`
against current practice in the relationship-authorization and policy-engine field.

**Evidence convention.** Each claim is tagged `[DOC]` (documented behavior in a primary source:
spec, official docs, proto/config schema, paper, advisory), `[BLOG]` (vendor or third-party blog /
secondary source), or `[INFER]` (my inference from the above). Domain-neutral throughout:
principal / actor / subject / professional. Regulated-domain profiles are out of scope.

**Project liveness** (GitHub Releases API, queried 2026-09-15) — none of these are dormant:

| Project | Latest release | Published |
|---|---|---|
| openfga/openfga | v1.20.0 | 2026-09-08 `[DOC]` |
| authzed/spicedb | v1.56.2 | 2026-09-11 `[DOC]` |
| cedar-policy/cedar | v4.13.0 | 2026-09-15 `[DOC]` |
| open-policy-agent/opa | v1.20.2 | 2026-09-03 `[DOC]` |

---

**Coverage.** Every section rests on primary sources verified in this pass: the Zanzibar paper; the
OpenFGA API proto, server config schema and docs; SpiceDB/AuthZed docs, source and security
advisories; the Ory Keto proto; Cedar/AVP documentation and CLI source; OPA documentation; the
AuthZEN Authorization API 1.0 Final spec and its interop repo; OASIS XACML 3.0; NIST SP 800-162;
OWASP LLM08:2025 and Top 10:2025; Elasticsearch/OpenSearch/Pinecone/Qdrant/pgvector/Weaviate/Vespa
documentation; Microsoft Entra CAE documentation; the OpenID SSF/CAEP/RISC Final specs; and the
GitHub Releases API. Peer-reviewed and preprint sources are tagged separately. Items that could not
be verified are named explicitly in place rather than asserted.

**Note on the source documents.** `governed-brain-implementation-plan.md` was revised on disk during
this review (Phase 1 split into 1a "unconditional client conformance" and 1b "multi-issuer defences",
with only 1b gating Phase 6). That split does not affect any finding here — all change requests
target Phases 0, 2, 4, and 5, which are unchanged.

**Top findings, in order of consequence:**

1. Zanzibar's anti-new-enemy mechanism (the zookie) is a **bidirectional protocol with a write-side
   obligation on the application**, not a request parameter. A port whose only operation is
   `check(...)` cannot implement it. (§2.1, §F1, CR-2)
2. `consistency_requirement` typed as a scalar **is not provider-neutral** — SpiceDB's contract
   carries a token, OpenFGA's does not, and Ory Keto declares the fields but annotates them "not
   implemented yet and has no effect." A scalar resolves to the weakest engine. (§C0, §2.5, CR-1)
3. **No engine in the field offers a safe bulk filter**, which is what Phase 5's "authorized
   prefilter before every derived index" requires. SpiceDB's own advisory says `LookupResources`
   "should not be used for access-control decisions." The field's scalable answer is a
   **materialized permission projection fed by a change stream** — a layer the architecture does not
   have. (§F2, CR-4)
4. Freshness has a **published price of ~6× at p95** (Zanzibar Check Safe 9.46ms vs Check Recent
   60.0ms), and ~99% of Google's own checks run deliberately ≥10s stale. The proposal names no
   latency budget. (§C1, CR-8)
5. **Decision caching must be keyed by snapshot, not by wall clock.** Zanzibar encodes the snapshot
   timestamp in the cache key so an entry is never stale, only old; a TTL cache keyed on `checked_at`
   silently transitions from correct to incorrect. (§2.4, §F5)
6. **The boundary has been standardized.** The OpenID **AuthZEN Authorization API 1.0** reached Final
   status on 2026-01-11, and its request shape is close to the proposal's port. But it standardizes
   only the boolean — reasons, obligations, and PDP-failure behavior are explicitly out of scope, and
   **SpiceDB does not implement it**, so portability and causal correctness currently point at
   different engines. (§2.9, CR-15)
7. **Revocation windows are published, and much larger than flag names suggest.** OpenFGA 10s;
   SpiceDB ≈20.6s by derivation and ~40s on hot keys (open issue #3299); OPA 60–120s bundle polling;
   AVP "a few seconds," unbounded; upstream CAEP session revocation "up to 15 minutes"; upstream
   group/policy change "up to one day." (§2.10, CR-16, CR-17)
8. **No engine can verify that a stated purpose is true** — only that it came from a signed issuer.
   "Controlled vocabulary + policy-checked" is the weakest of the three properties and passes every
   documented anti-pattern. The enforceable residue is *entitlement-to-declare* plus audit; NIST
   SP 800-162 and XACML both place attribute truthfulness outside the engine and outside the spec.
   Cedar additionally has **no cryptographic operators**, so it cannot verify a signed purpose claim
   at all. (§2.7, CR-13, CR-14)

---

## 1. Verdict on the port boundary

**Sound with caveats — and one item that is actively wrong.**

The structural claim holds up well. Keeping the identity libraries product-neutral, delegating
"does this actor stand in a qualifying relationship to this subject" to an external engine behind a
provider-neutral port, and having a new domain add only resource types behind that port, is how the
field actually deploys relationship-based authorization. It is materially better than the common
alternative of growing an application-specific relation model inside the identity layer. The
proposal's insistence that the relationship engine is *necessary but not sufficient* — that consent,
purpose, classification, source authority, and tenancy stay in a separate policy layer — matches
both the Zanzibar design intent and every vendor's documented positioning.

The caveats are not about whether to draw the line. They are about **what the port must carry across
it**, and every one of them comes from a place where the field provides something the proposal's
port signature cannot express.

### C0 — Actively wrong: `consistency_requirement` is not a provider-neutral scalar

The port is specified as:

```text
RelationshipAuthorizationPort.check(
  actor_principal, action, resource_type, resource_id,
  tenant_id, consistency_requirement,
) -> { allowed, relation, model_id, tuple_snapshot, checked_at }
```

A single scalar `consistency_requirement` **cannot abstract over the two engines the proposal names
as candidates**, because they have structurally different consistency contracts:

- **OpenFGA** exposes a three-valued enum with two real settings and *no token*: `UNSPECIFIED`,
  `MINIMIZE_LATENCY`, `HIGHER_CONSISTENCY` `[DOC]` — verbatim from the API definition at
  <https://raw.githubusercontent.com/openfga/api/main/openfga/v1/openfga_service_consistency.proto>
  (retrieved 2026-09-15). `HIGHER_CONSISTENCY` means only "skip the cache, read the database."
- **SpiceDB** exposes four modes, **two of which take a token argument**: `minimize_latency`,
  `at_least_as_fresh(ZedToken)`, `at_exact_snapshot(ZedToken)`, `fully_consistent` `[DOC]`
  (<https://authzed.com/docs/spicedb/concepts/consistency>, retrieved 2026-09-15). The ZedToken is
  SpiceDB's Zookie: "an opaque token representing a point-in-time of the SpiceDB datastore" `[DOC]`.

Typing the port's consistency input as a scalar silently selects the weaker engine's semantics and
makes SpiceDB's principal safety feature **unreachable through the port**. Worse, it does so
invisibly: the adapter compiles, the tests pass, and the design has quietly committed to a model
that cannot prevent the new-enemy problem (§2.1). A port that is meant to be provider-neutral must
carry consistency as a **typed value that can hold a token**, not an enum.

The return type has the same gap from the other side. `tuple_snapshot` is suggestive of a Zookie but
is unspecified, and nothing in the proposal requires the brain to *store* it or *pass it back*.

### C1 — "Right now" has a published price, and the proposal never names it

The core question the proposal asks the port — "does this actor stand in a qualifying relationship
to this subject, **right now**" — is precisely the question Zanzibar's authors say cannot be answered
cheaply. From the paper `[DOC]`:

> To avoid evaluating checks for new contents using stale ACLs, one could try to always evaluate at
> the latest snapshot such that the check result reflects all ACL writes up to the check call.
> However, such evaluation would require global data synchronization with high-latency round trips
> and limited availability.

And the measured cost, from Table 2 of the paper (7-day production window, December 2018) `[DOC]`:

| API | p50 | p95 | p99 |
|---|---|---|---|
| Check **Safe** (zookie >10s old) | 3.0 ms | 9.46 ms | 15.0 ms |
| Check **Recent** (zookie <10s old) | 2.86 ms | **60.0 ms** | **76.3 ms** |
| Expand Safe | 4.27 ms | 8.84 ms | 34.1 ms |
| Expand Recent | 5.79 ms | 45.6 ms | 121.0 ms |
| Write | 127.0 ms | 233.0 ms | 401.0 ms |

Freshness costs **6.3× at p95** — and that is Google, on Spanner with TrueTime, in a system whose
whole design goal was this. The paper also reports that "[t]he rate of Safe requests is about two
orders of magnitude larger than that of Recent requests" `[DOC]` — i.e. ~99% of Google's
authorization checks are *deliberately* evaluated against data at least 10 seconds stale, and they
consider that correct because the zookie protocol bounds the staleness to something causally safe.

**The proposal has no latency budget anywhere.** It lists "maximum token, grant, cache, metadata, and
revocation staleness windows per data class" as an open decision, but the security invariant is
written as an unconditional per-request conjunction with a relationship check inside it. `[INFER]`
Those two facts are in tension: an eleven-term conjunction that includes a remote graph check and a
remote policy check, evaluated per request, with an unnamed budget, is a design that will discover
its budget in production.

### C2 — Fail-closed makes brain availability ≤ PDP availability

The proposal correctly requires the adapter to "fail closed on timeout." That is the right call, and
it is what the field recommends. But fail-closed on a remote dependency in the critical path means
the composite availability of every governed read is bounded above by the availability of the
relationship engine. Zanzibar's own bar for this was "greater than 99.999% over 3 years of
production use" `[DOC]` — "less than 2 minutes of global downtime" per quarter `[DOC]`. `[INFER]` A
self-managed OpenFGA or SpiceDB deployment does not get that for free, and the proposal's open
decision "is the relationship engine operated alongside the brain, or as a separately managed shared
authorization service?" is therefore an availability-budget decision, not a topology preference.

### C3 — No engine in the field gives this port a safe bulk filter

This is the largest gap, and it lands squarely on Phase 5. Zanzibar has **no list API at all**;
OpenFGA scopes `ListObjects` to "small object collections" and truncates silently at 1,000 results /
3 seconds; SpiceDB's own security advisory says `LookupResources` "should not be used for
access-control decisions." The field's scalable answer is a materialized permission projection fed by
a change stream — which is not a `check()`. Full treatment in §2.8; failure mode in §F2; fix in CR-4.

### C4 — Two clocks, no way to constrain the skew

The proposal's recommended answer to tuple ownership is "a brain-owned change record with idempotent
projection and reconciliation." That is well-aligned with documented practice — the transactional
outbox pattern, using idempotent `TOUCH` writes, is AuthZed's own recommendation `[BLOG]`
(<https://authzed.com/blog/the-dual-write-problem>). But it means the graph the engine answers from
**lags the brain's own grant table by the projection delay**.

The invariant then evaluates `relationship_graph_allows(...)` and `grant_is_current_and_not_revoked`
against two different clocks, and the port as written provides no way to require that the graph is
at least as fresh as the grant record. `[INFER]` This is exactly the gap a Zookie fills, which is
why C0 and C4 are the same defect seen from two angles.

### C5 — The boundary is now standardized, and the standard is narrower than the port needs

AuthZEN Authorization API 1.0 reached **Final** on 2026-01-11 (§2.9). Its request shape is close
enough to the proposal's port that divergence needs a stated reason. But adopting it closes less than
it appears: reasons and obligations are explicitly out of scope, PDP-failure behavior is undefined,
the Search APIs are advisory and optionally paginated, and **SpiceDB — the engine with the best
consistency contract — does not implement it.** So the design faces a genuine trade between
portability and causal correctness. See CR-15.

### C6 — Revocation windows are published, and larger than the flag names suggest

The proposal leaves staleness windows as an open decision. The field has already answered it with
numbers (§2.10.1): OpenFGA 10s; SpiceDB ≈20.6s derived, up to ~40s on hot keys per an open issue;
OPA 60–120s; AVP "a few seconds," unbounded; upstream CAEP session revocation up to 15 minutes;
upstream group/policy change up to a day. See CR-16 and CR-17.

### What the verdict is *not*

None of this argues for implementing a relationship engine in-house. The port boundary is right. The
corrections below are about the port's **type signature**, a **second port** the design is missing,
and **numbers that need to be named**.

---

## 2. Landscape findings per system

### 2.1 Google Zanzibar (the paper)

Pang et al., *Zanzibar: Google's Consistent, Global Authorization System*, USENIX ATC '19.
PDF: <https://www.usenix.org/system/files/atc19-pang.pdf> (retrieved 2026-09-15). All quotes `[DOC]`.

**The data model.** A relation tuple is `⟨object⟩#⟨relation⟩@⟨user | userset⟩`, where
`⟨object⟩ ::= ⟨namespace⟩:⟨object id⟩`. Table 1 of the paper:

| Tuple | Semantics |
|---|---|
| `doc:readme#owner@10` | User 10 is an owner of `doc:readme` |
| `group:eng#member@11` | User 11 is a member of `group:eng` |
| `doc:readme#viewer@group:eng#member` | Members of `group:eng` are viewers of `doc:readme` |
| `doc:readme#parent@folder:A#...` | `doc:readme` is in `folder:A` |

Stored tuples do not define effective ACLs on their own — **userset rewrite rules** do the rest:
`_this`, `computed_userset` (infer a relation from another relation on the same object), and
`tuple_to_userset` (follow a hop through a tupleset, which is how hierarchy is expressed with one
tuple per hop). Rewrites compose with union, intersection and exclusion.

**The APIs are Read, Write, Watch, Check, Expand. There is no list/filter API.** This matters a great
deal for the proposal's Phase 5 and is discussed in §2.8. The paper's own answer to access-aware
search is Expand plus client-side denormalization:

> Expand is crucial for our clients to reason about the complete set of users and groups that have
> access to their objects, **which allows them to build efficient search indices for access-controlled
> content.**

**Consistency.** Zanzibar names two required properties: **external consistency** and **snapshot
reads with bounded staleness**, provided by storing ACLs in Spanner and using TrueTime to assign
causally meaningful microsecond timestamps.

**The new enemy problem** — the paper's two examples, verbatim:

> **Example A: Neglecting ACL update order**
> 1. Alice removes Bob from the ACL of a folder;
> 2. Alice then asks Charlie to move new documents to the folder, where document ACLs inherit from
>    folder ACLs;
> 3. Bob should not be able to see the new documents, but may do so if the ACL check neglects the
>    ordering between the two ACL changes.

> **Example B: Misapplying old ACL to new content**
> 1. Alice removes Bob from the ACL of a document;
> 2. Alice then asks Charlie to add new contents to the document;
> 3. Bob should not be able to see the new contents, but may do so if the ACL check is evaluated
>    with a stale ACL from before Bob's removal.

**The zookie protocol — and why it is bidirectional.** This is the single most important structural
finding for this review. The paper's protocol, verbatim:

> 1. A Zanzibar client requests an opaque consistency token called a zookie for each content version,
>    via a content-change ACL check (§2.4.4) when the content modification is about to be saved.
>    Zanzibar encodes a current global timestamp in the zookie and ensures that all prior ACL writes
>    have lower timestamps. **The client stores the zookie with the content change in an atomic write
>    to the client storage.** [...]
> 2. The client sends this zookie in subsequent ACL check requests to ensure that the check snapshot
>    is at least as fresh as the timestamp for the content version.

And the content-change check itself (§2.4.4):

> A content-change check request does not carry a zookie and is evaluated at the latest snapshot. If
> a content change is authorized, the check response includes a zookie for clients to store along
> with object contents and use for subsequent checks of the content version.

**What an application loses by treating relationship authorization as a port it merely calls.**
The zookie protocol is not a parameter. It is a **protocol with a write-side obligation on the
application**: the application must (a) perform a *content-change check* at write time, (b) receive a
token, (c) persist it **atomically with its own content revision**, and (d) replay it on every later
read check. A port whose only operation is `check(...) -> {allowed, ...}` has no write-side leg, no
defined storage obligation, and no input slot for the token. `[INFER]` Therefore an application
built strictly on that port **cannot implement the zookie protocol and cannot prevent the new-enemy
problem** — it can only choose between "fast and stale by an unbounded amount" and "slow and
globally synchronized." That is precisely the choice the Zanzibar authors designed the zookie to
avoid.

The proposal is a governed *knowledge* store whose records are versioned and whose grants change.
Example B is its native failure mode: a grant is narrowed, a new revision is promoted, and a reader
holding a stale graph snapshot sees the new revision under the old relationship.

**Leopard.** For deeply nested or high-fan-out group structures, Zanzibar falls back to a separate
denormalizing index. Leopard "recursively expands edges in an ACL graph to form Leopard index
tuples," and its incremental layer "calls Zanzibar's Watch API to receive a temporally ordered
stream" of updates. `[INFER]` Even Google could not answer deep-membership questions from the
normalized tuple store at interactive latency; it built a materialized projection fed by a change
stream. This is the same shape as every scalable list-filtering answer in §2.8.

**Watch.** A watch request specifies namespaces and a zookie start time; responses contain "all tuple
modification events in ascending timestamp order," with a heartbeat zookie for resumption.

### 2.2 OpenFGA (CNCF)

**Status.** Accepted to CNCF 2022-09-14; **moved to Incubating 2025-10-28** `[DOC]`
(<https://www.cncf.io/projects/openfga/>, retrieved 2026-09-15). Not graduated. Actively released
(v1.20.0, 2026-09-08) `[DOC]`.

**Modeling language.** A typed DSL (`model / schema 1.1`, `type`, `relations`, `define`) with
`or`/`and`/`but not`, `X from Y` for hierarchy traversal, and type restrictions including userset
references like `organization#member`. The illustrative model in the proposal is written in this DSL
and is broadly idiomatic. `[INFER]`

**Consistency — no token.** `ConsistencyPreference` is `UNSPECIFIED | MINIMIZE_LATENCY |
HIGHER_CONSISTENCY` `[DOC]` (proto, above). The docs state the tradeoff plainly `[DOC]`
(<https://openfga.dev/docs/interacting/consistency>): if you write a tuple and immediately query,
"the tuple change might not be taken in consideration if OpenFGA serves the result from the cache";
and "you are trading off consistency for latency and system performance. **Always specifying
`HIGHER_CONSISTENCY` will have a significant impact in performance.**"

The docs' recommended workaround is telling: track modification timestamps **in your own database**
and conditionally request higher consistency when your TTL suggests the cache may be stale `[DOC]`.
`[INFER]` That is a hand-rolled, coarse-grained zookie, implemented by the application, with the
application supplying the causality that the engine does not track. Any port abstraction must have a
place for it.

**Documented staleness window.** From the server config schema `[DOC]`
(<https://raw.githubusercontent.com/openfga/openfga/main/.config-schema.json>, retrieved 2026-09-15):

| Setting | Default | Meaning |
|---|---|---|
| `checkQueryCache.enabled` | `false` | Check result caching off by default |
| `checkQueryCache.ttl` | **10s** | TTL of a cached Check result |
| `checkIteratorCache.ttl` | 10s | TTL of cached datastore iterators |
| `cacheController.enabled` | `false` | Changelog-driven cache invalidation |
| `cacheController.ttl` | **10s** | *Minimum* interval between invalidation polls |
| `listObjectsDeadline` | **3s** | Timeout for serving ListObjects |
| `listObjectsMaxResults` | **1000** | Max results in a non-streaming ListObjects response |
| `listUsersDeadline` / `listUsersMaxResults` | 3s / 1000 | Same for ListUsers |

`[INFER]` This is a concrete, citable answer to one of the proposal's open decisions: with caching
on, **the default revocation-visibility window for a cached OpenFGA Check is on the order of 10
seconds**, even with changelog-driven invalidation enabled, because the invalidation poll interval is
itself 10s.

**Bulk filtering.** OpenFGA documents three "search with permissions" options `[DOC]`
(<https://openfga.dev/docs/interacting/search-with-permissions>):

1. **Search, then Check** — filter in your database, then validate the page with BatchCheck.
   Recommended when result sets are small or mostly accessible.
2. **Build a local index from the changes endpoint** — consume `ReadChanges` to maintain a local
   authorization index and intersect it with database results. Recommended for the "user can access
   many objects but a small percentage of the total" case.
3. **ListObjects, then search** — recommended only when "the number of accessible objects is low
   (~1000) and represents a small percentage of total objects." Documented caveats: "As this number
   increases, this solution becomes impractical, because you would need to paginate over multiple
   pages" and "**A partial list from the API is not enough, because you won't be able to sort using
   it.**"

The relationship-queries reference is blunter still: ListObjects "provides a solution to the Search
with Permissions (Option 3) use case for access-aware filtering on **small object collections**"
`[DOC]` (<https://openfga.dev/docs/interacting/relationship-queries>).

**BatchCheck** reduces round trips; SDK defaults are `maxBatchSize` 50 and `maxParallelRequests` 10,
and the docs note that below ~10 checks, parallel Check calls may be faster `[DOC]` (same page).

**Relationship data in a different system of record.** Two documented mechanisms:
- **Contextual tuples** — ephemeral tuples supplied per request, valid only for that request, **max
  100 per request** `[DOC]` (<https://openfga.dev/docs/interacting/contextual-tuples>). When a
  contextual tuple matches a stored tuple on (user, relation, object), the contextual one wins. The
  docs explicitly position these for "when you want to avoid synchronizing data to OpenFGA," e.g.
  group membership carried in token claims. They also carry the documented warning that claims-based
  contextual tuples keep granting access until the token expires, "even if the underlying claims
  (like group membership) change."
- **Synchronization** — the adoption-patterns page acknowledges "writing the data to the centralized
  store adds implementation complexity. You need to implement a data pipeline that makes sure the
  data is always up to date," and recommends a hybrid: sync what is easy, supply the rest as
  contextual tuples `[DOC]` (<https://openfga.dev/docs/best-practices/adoption-patterns>).

`[INFER]` The 100-tuple cap is a hard architectural limit on the "pass the relationships in at call
time" escape hatch. It is fine for a handful of group memberships from a token; it is not a general
answer to "the brain owns the grants, the engine evaluates them."

**Conditions (ABAC).** CEL expressions with context merged from persisted tuple context and request
context; persisted context wins. Documented limits: per-tuple condition context **32KB**, request
context **512KB**, and **CEL evaluation cost capped at 100** to bound malicious expressions `[DOC]`
(<https://openfga.dev/docs/modeling/conditions>). Conditions do work with ListObjects `[DOC]`.

### 2.3 SpiceDB / AuthZed

**Status.** Actively released — v1.56.2 on 2026-09-11 `[DOC]`. Apache-2.0 open source, with
commercial AuthZed Dedicated/Cloud offerings around it.

**Modeling language.** A purpose-built schema language rather than Zanzibar's protobuf configs, and
it splits **relations** (stored edges) from **permissions** (computed set expressions), which lets it
drop Zanzibar's `_this` keyword `[DOC]` (<https://authzed.com/docs/spicedb/concepts/zanzibar>).
It also generalizes subjects beyond Zanzibar's integer user IDs, and adds `LookupResources` /
`LookupSubjects` APIs that the paper does not have `[DOC]` (same page).

**Consistency — full Zookie fidelity.** Four modes `[DOC]`
(<https://authzed.com/docs/spicedb/concepts/consistency>):

| Mode | Semantics | Documented cost |
|---|---|---|
| `minimize_latency` | Default; serves from cache | "can create a window where the New Enemy Problem occurs" |
| `at_least_as_fresh(ZedToken)` | "at least as fresh as the point-in-time specified in the ZedToken"; newer is fine | The balanced option |
| `at_exact_snapshot(ZedToken)` | Exactly that point in time | Can fail with **Snapshot Expired** once GC passes; recommended only for pagination within short windows |
| `fully_consistent` | Default for writes | "**explicitly bypasses caching, dramatically impacting latency**" |

Documented caveat worth flagging: on CockroachDB, `fully_consistent` **does not guarantee
read-after-write consistency** `[DOC]`. `[INFER]` That is a datastore-dependent weakening of the
strongest mode — a port that treats "fully consistent" as a portable guarantee would be wrong even
within a single engine.

**Watch.** Emits create/touch/delete events from `WriteRelationships` / `DeleteRelationships` /
`ImportBulkRelationships`; history is bounded by the datastore GC window, "typically 24 hours, but
may differ based on the datastore used"; clients resume with the last `ChangesThrough` ZedToken
`[DOC]` (<https://authzed.com/docs/spicedb/concepts/watch>). `[INFER]` The GC window is the hard
bound on how long a downstream projection can be offline before it must be rebuilt from scratch —
a real operational constraint for any materialized index the brain maintains.

**Bulk filtering — three documented options, with explicit ceilings** `[DOC]`
(<https://authzed.com/docs/spicedb/modeling/protecting-a-list-endpoint>):

1. **LookupResources** — for "small accessible resource sets (fewer than ~10,000 resources)." Caveat:
   "can get slow quickly: with a sufficiently large relation dataset, a sufficiently complex schema,
   or a sufficiently large set of accessible results."
2. **CheckBulkPermissions** — page candidates from your database, bulk-check the page, repeat.
   "works better with an API backed by cursor-based pagination than limit-offset pagination," and it
   is "recommended to run the various CheckBulkPermissions API calls at the same revision."
3. **AuthZed Materialize / Event Streams** — a denormalized, continuously-updated copy of "which
   users have permission to which resources," so filtering becomes a local JOIN. **Status: early
   access, AuthZed Dedicated only** `[DOC]` — i.e. the most scalable answer is commercial and not
   generally available.

**The bulk-filter APIs have a correctness track record.** Two published advisories:

- **CVE-2023-35930 / GHSA-m54h-5x5f-5m6r** — `LookupResources` **returned partial results** in
  v1.22.0, patched in v1.22.2 (published 2023-06-26, severity Low) `[DOC]`
  (<https://github.com/authzed/spicedb/security/advisories/GHSA-m54h-5x5f-5m6r>). The advisory
  states that **`LookupResources` should not be used for access-control decisions; the Check API
  serves that purpose** `[DOC]`.
- **GHSA-j85q-46hg-36p2** — `LookupSubjects` may return partial results for a specific kind of
  relation `[DOC]` (<https://github.com/advisories/GHSA-j85q-46hg-36p2>).

`[INFER]` This is the most important single data point for the proposal's Phase 5. The vendor's own
security advisory says the bulk-listing API is **not** an authorization primitive. A design that
prefilters a search index from `LookupResources`/`ListObjects` output and treats the result as
authoritative is using an API against its documented purpose.

**Relationship data in a different system of record.** AuthZed's documented answer is the
**transactional outbox**: write the intent to an outbox table in the same transaction as the domain
change, then a separate process drains it into SpiceDB, relying on idempotent `TOUCH` writes `[BLOG]`
(<https://authzed.com/blog/the-dual-write-problem>). CQRS via Kafka is offered as an alternative
`[BLOG]`. `[INFER]` The proposal's "brain-owned change record with idempotent projection and
reconciliation" is the same pattern, independently arrived at — a genuine point in its favour.

### 2.4 Caching a decision safely — what Zanzibar actually does

This deserves its own subsection because the proposal's port returns `checked_at` (a wall-clock
stamp) and the threat table calls for a "bounded cache," which is a weaker construct than the field's
answer. Zanzibar `[DOC]`:

> **We avoid reusing results evaluated from a different snapshot by encoding snapshot timestamps in
> cache keys.** We choose evaluation timestamps rounded up to a coarse granularity, such as one or
> ten seconds, while respecting staleness constraints from request zookies. This timestamp
> quantization allows the vast majority of recent checks and reads to be evaluated at the same
> timestamps and to share cache results [...] It is worth noting that rounding up timestamps does not
> affect Zanzibar's consistency properties, since Spanner ensures that a snapshot read at timestamp
> T will observe all writes up to T.

`[INFER]` The structural insight: Zanzibar never caches "the answer, which might now be stale." It
caches "the answer **as of snapshot T**," which is an immutable fact that never becomes wrong — only
less useful. Staleness is then a property of *which T you ask for*, governed by the zookie, not a
property of the cache.

A TTL-based decision cache keyed on wall-clock `checked_at` is a fundamentally different and weaker
construct: the entry silently transitions from correct to incorrect, and the only defence is to make
the TTL short. OpenFGA's defaults (`checkQueryCache.ttl` 10s, `cacheController.ttl` 10s) are
recognisably a coarse approximation of the same 1–10 second quantization, but without snapshot
semantics underneath. `[INFER]` The proposal should adopt snapshot-keyed caching where the engine
supports it (SpiceDB ZedToken, Keto/Zanzibar-family) and treat TTL caching as the degraded fallback,
explicitly labelled as such.

Zanzibar also documents a **lock table** to collapse concurrent identical checks and avoid cache
stampede `[DOC]`, and per-client CPU/RPC/concurrency quotas for performance isolation `[DOC]` — both
relevant if the brain fans out many checks per request (§3).

### 2.5 Ory Keto — the token exists in the API and is not implemented

Keto is one of the three engines the workspace's own `idp-rbac-comparison.md` names for the proxied
ReBAC boundary, so its consistency contract is directly load-bearing for the port.

Keto's Check service protobuf defines **both halves of the Zanzibar zookie protocol** — a `latest`
flag for the content-change check and a `snaptoken` field on request and response — and annotates
both with, verbatim `[DOC]`
(<https://raw.githubusercontent.com/ory/keto/master/proto/ory/keto/relation_tuples/v1alpha2/check_service.proto>,
retrieved 2026-09-15):

> `// This field is not implemented yet and has no effect.`

The commented-out intent is a faithful restatement of the paper:

> Set this field to `true` in case your application needs to authorize depending on up to date ACLs,
> also called a "content-change check". If set to `true` the `snaptoken` field is ignored, the check
> is evaluated at the latest snapshot (globally consistent) and the response includes a snaptoken for
> clients to store along with object contents that can be used for subsequent checks of the same
> content version.

`[INFER]` Two consequences, both sharp:

1. **The new-enemy protection is unavailable in Keto today**, while the API surface makes it look
   available. An adapter could set `latest: true`, read `snaptoken` from the response, store it, and
   replay it — and every one of those operations would be a no-op. This is the strongest possible
   argument for CR-1's "must reject, never silently downgrade" rule: the *engine* can silently
   downgrade even when the port does everything right.
2. **Even the designed behavior includes a silent fallback.** The `snaptoken` field's documentation
   states: "If the specified token is too old and no longer known, **the server falls back as if no
   snaptoken had been specified**" `[DOC]`. So a token-carrying port must additionally verify that
   the freshness it requested was actually honoured, or detect the fallback — otherwise an aged token
   degrades to "eventually consistent" without an error.

**Consistency-contract comparison across the candidate set:**

| Engine | Consistency surface | Zookie/token | New-enemy protection |
|---|---|---|---|
| Zanzibar (paper) | Snapshot + zookie | Yes — core protocol `[DOC]` | Yes `[DOC]` |
| SpiceDB | 4 modes, 2 token-carrying | ZedToken `[DOC]` | Yes `[DOC]` |
| Ory Keto | Fields defined, **not implemented** `[DOC]` | Declared, inert `[DOC]` | Not today `[DOC]` |
| OpenFGA | 2-valued enum `[DOC]` | None `[DOC]` | No `[INFER]` |
| Descope FGA | Proprietary — not verified here | Unverified | Unverified |

`[INFER]` A port that is neutral across this set, defined with a scalar consistency input, resolves
to the weakest row.

### 2.6 Port neutrality across the wider candidate set

The workspace's own comparison document scopes the proxied-ReBAC boundary to "Descope FGA, Ory Keto,
OpenFGA" (`idp-rbac-comparison.md`). `[INFER]` This widens the C0 problem rather than narrowing it:
Ory Keto is a Zanzibar-family implementation, Descope FGA is proprietary and its consistency contract
is whatever the vendor publishes, and OpenFGA has the two-valued enum documented above. A port that
must span all of them, plus SpiceDB, cannot define consistency as a scalar without defining it down
to the weakest member.

### 2.7 Policy-as-code (Cedar, OPA/Rego) — and why purpose cannot be verified

**Both projects are actively maintained** `[DOC]` (GitHub Releases API, 2026-09-15):
`cedar-policy/cedar` **v4.13.0** (2026-09-15), shipped alongside `cedar-policy-symcc` **v0.7.0**, a
symbolic-compiler component consistent with Cedar's published emphasis on formal verification.
`open-policy-agent/opa` **v1.20.2** (2026-09-03).

**The structural distinction.** Relationship-as-data (Zanzibar family) keeps the graph *inside* the
decision service; the caller sends only the question, and the cost is the projection lag (§F6).
Policy-as-code keeps the *rules* inside and expects the *facts* to arrive from outside — passed with
the request or loaded as a bundle. The cost is the inverse: no rule-sync lag, but **whatever the
caller fails to supply is simply not considered**, and whatever it does supply is taken at face
value. `[INFER]`

#### The finding that matters most: no policy engine can verify a stated purpose

This bears directly on the proposal's `purpose` field in `brain_access` and on its rule that purpose
"comes from a controlled vocabulary and is policy-checked."

**Three properties must be separated, and only two are achievable** `[INFER]`:

| Property | Meaning | Achievable? |
|---|---|---|
| **Vocabulary validity** | The value is a member of the controlled set | Yes — schema/set-membership check. Weakest, and most often mistaken for the others |
| **Provenance / non-repudiation** | The value is cryptographically attributable to an issuer or to the client | Yes, but only via a signed claim — and **not in every engine** (below) |
| **Truth** | The actor genuinely acts for that purpose | **No engine or standard achieves this** |

**Cedar cannot verify a signed assertion; Rego can.** This is the single most decision-relevant
difference between the two for this requirement.

- OPA provides `io.jwt.decode_verify(jwt, constraints)` — documented as verifying the signature under
  parameterized constraints and decoding claims only if valid `[DOC]`. (Note that `io.jwt.decode`
  does *not* verify — a real footgun.) A Rego policy can therefore verify a purpose claim against an
  issuer's JWKS **in-policy**, making the trust anchor the issuer's key rather than the caller's good
  behaviour. `[INFER]`
- Cedar's operator reference contains **no** signature, JWT, or cryptographic verification operators
  `[DOC by absence]`. A Cedar policy cannot verify a signed assertion. Amazon Verified Permissions'
  `IsAuthorizedWithToken` validates the token's expiry and signature `[DOC]`
  (<https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_IsAuthorizedWithToken.html>),
  but that covers **principal attributes only** — `context` remains caller-supplied and unvalidated.
  `[INFER]` So under Cedar/AVP, a trustworthy purpose must ride on the **token/principal** side, not
  in `context`.

**Cedar validation is authoring-time, not request-time.** Verbatim `[DOC]`
(<https://docs.cedarpolicy.com/policies/validation.html>):

> we expect validation to be performed **before** a policy is used by the authorization engine to
> decide authorization requests. Indeed, **the Cedar authorization APIs do not perform validation at
> the same time that a request is evaluated.** Rather, validation is an entirely separate API […]
> **By default, it is entirely up to the application to make sure that authorization requests are
> well-formed according to the schema's expectations.**

`[INFER]` A Cedar schema declaring `purpose: String` does not guarantee at request time that a string
even arrived, unless the application opts into request validation itself. The same trap exists for
Rego metadata schemas. Treating either as a request-time control is a documented misreading.

#### The standards say attribute truthfulness is out of scope

**NIST SP 800-162** (ABAC guide; Jan 2014, updated 2019-08-02) `[DOC]`
(<https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-162.pdf>):

> object attributes **must not be modifiable by the subject** to manipulate the outcome of the access
> control decision. (§3.1.3.4)

> environment conditions […] are *not administratively created and managed*, but instead are
> **intrinsic and must be detectable** by the ABAC system […] **tamper proof**, and relevant. (§3.1.3.5)

> **By assuming that attributes are issued appropriately, the ABAC system is partially dependent upon
> the attribute-issuing authorities.** (§3.1.2.5)

`[INFER]` NIST's architecture **pulls** attributes from a policy information point; it does not accept
them **pushed** by the enforcement point. A caller-supplied purpose inverts this — it makes the
requesting party its own attribute authority. SP 800-162 offers *metaattributes* (an assurance score
attached to an attribute) as the documented way to represent a low-trust attribute.

**OASIS XACML 3.0** (OASIS Standard, 2013-01-22) `[DOC]`, §9.1:

> rules and policies are only as reliable as the actors that create and use them […] **Mechanisms for
> trust establishment are outside the scope of this specification.**

`[DOC by absence]` XACML §9's threat catalogue covers disclosure, replay, insertion, deletion,
modification, NotApplicable handling, negative rules and denial of service — but contains **no entry
for an enforcement point asserting false attributes**. `[INFER]` Three generations of PDP design —
XACML, OPA, Cedar — all place attribute truthfulness outside the engine *and outside the spec*. This
is not a gap a future product feature will close.

#### The academic position: purpose is a property of a plan, enforced post hoc

**Tschantz, Datta & Wing, IEEE S&P 2012**, "Formalizing and Enforcing Purpose Restrictions in Privacy
Policies" `[ACADEMIC]`
(<http://reports-archive.adm.cs.cmu.edu/anon/2012/CMU-CS-12-106.pdf>). Purpose attaches to the
actor's **plan**, not to the request:

> if an auditee chooses to perform an action a while planning to achieve the purpose p, then the
> auditee's action a is for the purpose p

and enforcement is therefore retrospective:

> post-hoc auditing by a trusted auditor provides the perspective often required to determine the
> purpose of an action.

On the prior literature:

> each of these endeavors starts by **assuming that actions … are labeled with the purposes they are
> for** … and **provide no method of performing this labeling other than through intuition alone.**

**Byun, Bertino & Li, SACMAT '05** — the seminal purpose-based access control paper — concedes the
same `[ACADEMIC]`: users state their purpose and "the system validates the stated access purposes by
**ensuring that the users are indeed allowed to access data for the particular purposes**."
`[INFER]` "Validates" there means *checks entitlement to claim the purpose*, not *checks the claim is
true*. That is the strongest enforceable control available, and it is weaker than it sounds.

`[INFER]` Regulated-domain interoperability profiles (out of scope here) independently land in the
same place: they require a declared purpose to be **audited**, and only optionally permit it to
inform the access decision — an audit-grade rather than enforcement-grade control.

#### Observed anti-patterns

Public policy corpora show the failure mode repeatedly `[CODE, illustrative]`: purpose read from an
**unauthenticated request header**; **defaulting to a permissive purpose when absent**; validation
reduced to `purpose != ""`; and an emergency/break-glass value **short-circuiting the consent check**
on a caller-supplied string. `[INFER]` Each of these would pass the proposal's current rule
("controlled vocabulary and policy-checked") while providing no control at all.

#### What this means for the proposal

The proposal is **right** to keep purpose out of the relationship engine — under either paradigm that
is the correct call, and CR-9 makes it explicit in the model. What needs to change is the claim about
what checking a purpose achieves. See **CR-13**.

**Not verified in this pass** (named so absence is not read as evidence): AVP's documented
entity-payload and batch quotas; whether AVP offers any "list resources this principal may access"
API; and the maturity of OPA's Compile API / partial-evaluation data filtering and whether SQL
translation is open-source or commercial. Each is worth a follow-up before Phase 5 is fixed.

### 2.8 The data boundary — filtering a retrieval index by authorization

This is the richest prior art in the review and it bears directly on Phase 5. Everything here is a
primary source unless labelled otherwise.

#### 2.8.1 The three-tier answer, and its published ceilings

Every Zanzibar-family system documents the same three tiers for "filter a result set by
authorization," and each tier has a documented wall:

| Tier | Mechanism | Documented ceiling |
|---|---|---|
| 1. Filter first, then check | DB/search narrows, then batch-check the page | Best when most candidates are accessible `[DOC]` |
| 2. List permitted IDs, then filter | `ListObjects` / `LookupResources` | OpenFGA: **1,000 results / 3s deadline, silent truncation** `[DOC]`. SpiceDB: `--max-lookup-resources-limit` **1000**, and "performance problems when more than 10k results are involved" `[DOC]` |
| 3. Materialized permission projection | Change-stream-fed denormalized copy, filtered by local JOIN | Zanzibar Expand + Leopard `[DOC]`; OpenFGA changes-endpoint local index `[DOC]`; AuthZed Materialize — **early access, Dedicated only** `[DOC]` |

**The ID-list ceiling is lower than the engines' own limits**, because the consuming index has its
own:

| System | Documented limit | `[DOC]` |
|---|---|---|
| Elasticsearch `terms` query | **65,536 terms** (`index.max_terms_count`) | elastic.co query-dsl-terms-query |
| Pinecone `$in` / `$nin` | **10,000 values**; request fails above | docs.pinecone.io |
| OpenFGA `ListObjects` | 1,000 / 3s, **silent truncation** | openfga.dev relationship-queries + `.config-schema.json` |
| SpiceDB `LookupResources` | 1,000 per request | `spicedb serve` flag reference |

Pinecone names the pattern an explicit **anti-pattern** `[DOC]`: *"Avoid filtering by large lists of
individual user IDs. Instead, use access control groups (organization, project, role), namespaces, or
post-filter client-side."* Microsoft says the same from the other direction `[DOC]`: a disjunction of
equality expressions over thousands of values *"is error-prone, difficult to maintain, and in cases
where the list contains hundreds or thousands of values, slows down query response time by many
seconds."*

`[INFER]` OpenFGA's silent truncation is the worst of these for a governed store, because it is not an
error. A prefilter built on it degrades into **missing results that look like "nothing relevant
found"** — invisible in small-fixture tests, corrosive in production, and indistinguishable from a
legitimate empty result.

#### 2.8.2 Post-filtering: documented to return fewer than *k*

Every major engine documents this, and the wording is remarkably consistent `[DOC]`:

- **Elasticsearch**: a `filter` inside the `knn` query is a pre-filter; *"All other filters found in
  the Query DSL tree are applied as post-filters"* — and post-filtering *"results in fewer than k
  results, even when there are enough matching documents."* `[INFER]` The same clause moved from
  inside the `knn` block to the enclosing `bool` silently changes from a pre-filter to a post-filter.
  That is a security-relevant footgun with no error.
- **OpenSearch**: *"Because it is performed after the k-NN search, this approach may return
  significantly fewer than `k` results for a restrictive filter."*
- **pgvector**, the most quantified: *"filtering is applied **after** the index is scanned"* — *"If a
  condition matches 10% of rows, with HNSW and the default `hnsw.ef_search` of 40, **only 4 rows will
  match on average**."* Fix is `hnsw.iterative_scan`, which is **opt-in**.
- **Vespa**: some filters are evaluated after retrieval, which *"might cause the search to expose
  fewer hits to ranking than the wanted totalTargetHits."*
- **Pinecone** `[BLOG]`: post-filter means *"we risk returning very few or even zero results."*

**The security consequences, which no vendor states** `[INFER]`: (a) an *availability* failure — an
authorized actor gets a degraded or empty result set purely as a function of how much unauthorized
data sits near their query in embedding space; (b) a **count oracle** — if the caller requested `k`
and receives `n < k`, then `k − n` is a lower bound on the number of unauthorized records
semantically near the query, and repeated probing turns that into a measurable signal about a corpus
the actor cannot read.

Naive *pre*-filtering over a graph index has the mirror failure: Qdrant documents that a restrictive
filter *"can disrupt the connections within the graph,"* leading to *"fragmented search paths"*
`[BLOG]`, which is why it extends HNSW with payload-derived edges `[DOC]`. The academic measurement
is unambiguous — on a 2.77M-record corpus, *"the naïve post-filtering strategy… retrieves very few
policy-compliant vectors, resulting in **almost zero recall**"*, while *"pre-filtering consistently
achieved highest recall regardless of selectivity"* `[ACADEMIC]` (Policy-aware Vector Search,
SeQureDB '26 @ SIGMOD 2026, arXiv 2606.19803).

Microsoft Research's Filtered-DiskANN (WWW '23, DOI 10.1145/3543507.3583552) names the enterprise
authorization case explicitly and rules out the obvious fix `[ACADEMIC]`: index-per-label *"would
quickly become prohibitively expensive in scenarios with either a large number of filters, or where
each point could have many associated filters"* — which is exactly the shape of a per-record ACL.

#### 2.8.3 Document-level security does not cover scoring, statistics, or aggregates

This is the single most load-bearing quote in the section. Elasticsearch documents it verbatim
`[DOC]` (<https://www.elastic.co/docs/deploy-manage/security/limitations>):

> **Document level security doesn't affect global index statistics that relevancy scoring uses. This
> means that scores are computed without taking the role query into account.**

> While document-level security prevents users from viewing restricted documents, **it's still
> possible to write search requests that return aggregate information about the entire index. A user
> whose access is restricted to specific documents in an index could still learn about field names
> and terms that only exist in inaccessible documents, and count how many inaccessible documents
> contain a given term.**

`[INFER]` Because relevance scoring uses corpus-wide term statistics, an authorized actor's **scores
are a function of the unauthorized corpus**. Two consequences: a low-bandwidth oracle on term
frequencies in unreadable records, and — more mundanely but more certainly — non-reproducible ranking
that changes when unauthorized records are added or removed.

**Other documented DLS limitations that bear on this design** `[DOC]`:

- **Fail-open role composition (Elasticsearch):** *"if a role grants access to an index without
  document level security and another grants access with document level security, **document level
  security is not applied**; the user with both roles has access to all of the documents in the
  index."* Elastic's own remedy is partitioning: *"consider splitting documents by index instead."*
  `[INFER]` OpenSearch defaults the opposite way (fail-closed), with `dfm_empty_overrides_all` as the
  opt-in to Elastic's behaviour — so the safe default is **engine-dependent**, which is precisely the
  kind of thing a "provider-neutral" abstraction hides.
- **Terms-lookup is unsupported in an Elasticsearch role query:** *"Any query that makes remote calls
  to fetch query data isn't supported."* `[INFER]` The natural "look up this actor's group list from
  a groups index" pattern is therefore unavailable there; OpenSearch supports it but only in
  filter-level DLS mode, which narrows API coverage.
- Precomputed aggregation structures had to be **disabled entirely** for DLS users in OpenSearch
  (star-tree index nulled when DLS/FLS is present) `[MAINT]`, because they aggregate over all
  documents.
- Terms-enum returns nothing under DLS; profiling is disabled under DLS; DLS is documented as
  read-only and *"doesn't apply to write APIs."*
- Elastic documents an **alias information leak** and concludes: *"Until this limitation is
  addressed, avoid index and field names that contain confidential or sensitive information."*

**DLS × vector search is a young, actively-churning surface** `[MAINT]`: hybrid search failed outright
under OpenSearch DLS (neural-search#1303, 2025-04-30); the fix (security#6416, ~2026-08-20) lists
numerous still-unsupported combinations including cross-cluster search; a follow-up (#6428,
~2026-08-24) was needed because a query builder could silently drop the injected DLS filter, and now
**"fails closed"** if the filter did not survive the rewrite. Elasticsearch shipped an FLS fix in the
same window where a hidden field's state could still be created (#157889, 2026-08-28). `[INFER]`
These are one class of bug: DLS/FLS wraps Lucene, and any path that reaches the underlying reader, or
any plugin that rewrites the query tree, bypasses it.

#### 2.8.4 Embeddings are recoverable — the index is a secret store

- **Morris, Kuleshov, Shmatikov, Rush, EMNLP 2023** (arXiv 2310.06816) `[ACADEMIC]`: an iterative
  correct-and-re-embed method *"is able to **recover 92% of 32-token text inputs exactly**"*, and the
  authors demonstrate recovery of personal identifiers from a sensitive record corpus. Tooling is
  public (`vec2text`), with inverters shipped for widely-used commercial embedding models.
- **Song & Raghunathan, CCS 2020** (arXiv 2004.00053) `[ACADEMIC]`: inversion recovering 50–70% of
  input words, plus attribute inference *"from just a handful of labeled embedding vectors."*
- **Bounds** `[ACADEMIC]` (RecSys 2025 reproducibility track, arXiv 2507.07700): the headline result
  replicates, *"capable of reconstructing even password-like sequences that lack clear semantics,"*
  but is sensitive to sequence length; **quantization** is identified as a simple, broadly applicable
  mitigation. This is the one defence with independent peer-reviewed support.
- **"We never return the vector, only a score" is not a safe posture** `[PREPRINT]`: in the face
  domain, leaking *only distance* to authentic users allowed exact recovery of the stored embedding
  with a **93.65% success rate** under black-box assumptions (arXiv 1901.09769). `[INFER]` The
  analogous text result has not been published, but the mechanism is not modality-specific.
- **Deleted vectors remain recoverable** `[PREPRINT]` (arXiv 2606.18497, 2026-06-16): *"deleted
  vectors remain physically recoverable by accessing the raw index files at the storage layer,
  **bypassing API access**"*, with substantial reconstruction of structured attributes via vec2text.
  Proposed mitigation is crypto-shredding (encrypt vectors; discard the key on delete). Unreviewed,
  but the mechanism is directly testable and the mitigation is standard practice.
- **Snapshot exfiltration** `[DOC]`: in Qdrant's own access-control table, *download collection
  snapshot* is permitted at **read-only** levels. `[INFER]` A read-only token can therefore exfiltrate
  a whole collection including vectors, bypassing any payload/tenant filtering applied in the
  application layer.

Good news, verified `[DOC]`: Pinecone's `includeValues` and Qdrant's `with_vector`/`with_payload`
default to **false** — raw vectors are not returned by default. `[INFER]` The realistic exposure paths
are operator access, snapshots, and on-disk index files, not the query API.

**OWASP has standardized this.** `[OFFICIAL]` LLM08:2025 *Vector and Embedding Weaknesses* names
*"context leakage between users or queries"* in shared vector stores and *"invert embeddings and
recover significant amounts of source information"*, and its first prevention item is
*"fine-grained access controls and permission-aware vector and embedding stores… strict logical and
access partitioning of datasets."*

#### 2.8.5 Attacks against retrieval stores are cheap and current

`[ACADEMIC]` unless noted: membership inference at **0.991 AUC with only 5 queries**, robust to
current defenses (USENIX Security 2026, arXiv 2605.24312); datastore extraction at *"100% success
rate on 25 randomly selected customized GPTs with at most 2 queries"* (ICLR 2025, arXiv 2402.17840);
corpus poisoning at ~90% attack success from 5 injected texts in a 1M-text store (USENIX Security
2025, arXiv 2402.07867); and a confused-deputy leak against a major commercial assistant that
*"leverages the caching mechanism during retrieval"* (arXiv 2408.04870).

`[INFER]` Two structural readings matter for this proposal. First, read and write access to a shared
index are the same machinery in opposite directions — write access to a shared index approximates
write access to every scope's answers. Second, if a semantic cache or KV cache is shared across
scopes, published exploits already exist (e.g. arXiv 2601.23088, ICML 2026, on semantic-cache key
collisions) — a sharper problem than the vector index itself and in the same blast radius.

#### 2.8.6 How mature systems actually do it

Every system that operates at scale **denormalizes authorization into the index** and accepts sync
lag — the same conclusion the relationship engines reach in §2.8.1 tier 3.

- **Elastic** `[BLOG]` syncs ACLs into an `_allow_access_control` field and generates the filter into
  the **Elasticsearch role** (`.search-acl-filter-<index>`). `[INFER]` Putting the filter in the
  *role* rather than the *query* is the strongest safety property in this survey: **an application
  bug cannot forget it.**
- **Azure AI Search** `[DOC]` "security trimming": a filterable collection field plus `search.in`,
  with the honest caveats that `retrievable: false` *"isn't a content-obfuscation or field-level
  security mechanism"* and that the service *"doesn't authenticate user identities… the principal is
  just a string, used in a filter expression."* Their newer preview pushes enforcement into the
  service itself by passing the actor's token with the query. Documented chunking trap: when
  documents are chunked, permission metadata must be carried into the **index projections**, or
  chunk-level references are not filtered.
- **Microsoft Graph connectors** `[DOC]`: ACLs stored on the item, `deny` takes precedence over
  `grant`, and an explicit warning against expanding group membership into per-item ACLs because
  *"each group membership can lead to a high volume of item updates."*

**Propagation lag is documented by everyone who documents it at all** `[DOC]`: Azure states permission
changes *"are only reflected in search results after that metadata is synchronized to the index"*;
Glean notes permission resolution can lag content crawl and publishes no staleness guarantee;
Elasticsearch's DLS bitset cache has a **2h** TTL. **OpenFGA documents the only explicit backstop**:
re-`check` every result before returning, *"to filter out any resource with permissions revoked but
whose authorization data has not made it into your index yet"* `[DOC]`.

#### 2.8.7 A third architecture the proposal should know about

**Cerbos compiles the policy into a filter predicate** rather than enumerating IDs `[DOC]`: its query
plan is pushed into the store's metadata filter, so the filter is `scope == X AND label == Y`, not a
50,000-element `$in`. `[INFER]` This sidesteps the cardinality wall entirely — but it only works for
**attribute-shaped** policy and **cannot express arbitrary relationship-graph reachability**, which is
the whole point of a Zanzibar engine. That is the real axis of the choice, and no vendor states it
plainly: *relationship reachability and pushdown-filterable predicates are in tension.* A design that
needs both will end up materializing reachability into attributes — which is tier 3 again.

The quantitative case for partitioning over filtering is also now published `[ACADEMIC]`: HONEYBEE
(SIGMOD 2026, arXiv 2505.01538) reports **13.5× lower query latency than row-level security at 1.24×
memory**, matching per-role index performance with a 90.4% memory reduction.

#### 2.8.8 Two findings that indict a retriever-wrapper design

- `[ACADEMIC]` *"Retrieval systems rank documents by relevance… not by authorization, so a query from
  one tenant can surface another tenant's confidential data simply because it scores highest"*, and
  the paper names **"client-side orchestration bypass"** as a failure mode (arXiv 2605.05287).
  `[INFER]` This directly indicts enforcement implemented as a retriever wrapper in the caller's
  orchestration graph — a materially weaker boundary than Elastic's role-based or Azure's
  token-based enforcement. The proposal's rule that route handlers must not call the engine directly
  is the right instinct; it needs the same rule for retrieval paths.
- `[PREPRINT]` Microsoft argues enterprise systems must authorize to the **intersection of all
  participants** in an interaction, not just the requester (arXiv 2509.14608), noting existing
  defenses are *"fundamentally probabilistic"* and only deterministic fine-grained access control
  prevents leakage. `[INFER]` This is the multi-party case the proposal's federation and agent
  sections gesture at but never state: when an actor, a delegate, and an agent are all in the loop,
  the authorized set is the **intersection**, not the requester's set.

#### 2.8.9 Vendor RAG guidance — and a correction worth knowing

OpenFGA publishes first-party RAG authorization guidance (last updated 2026-09-14) `[DOC]`, which
recommends **post-filtering** as *"the most common approach"* with a documented mitigation: *"request
more candidates than you need from the vector database (e.g., **2-3x your target count**)"*, and it
states the tradeoff honestly — post-filter *"may return fewer than K after filtering."* SpiceDB's
Pinecone integration says the same and over-fetches in its own sample code.

`[INFER]` But note what the widely-distributed SDK actually does: the Auth0/Okta FGA LangChain
retriever is **post-filter only** — it retrieves, then batch-checks — with **no over-fetch
compensation**. A `top_k=5` retriever wrapped in it can legitimately return zero documents to the
model. The vendor's *documentation* says over-fetch; the vendor's *library* does not implement it.
That gap is the concrete form of §2.8.2's availability failure.

OpenFGA also documents two deliberate compromises `[DOC]`: *"Duplicate logic from the authorization
model when querying your database… not ideal, but it can be a reasonable trade-off"*, and retrieving
*"a higher-level resource ID list with lower cardinality"* (filter by accessible **parent** first).
`[INFER]` The second — coarse pre-filter on a low-cardinality parent, fine post-filter on the leaf —
is the design that survives production, and Pinecone independently recommends the same shape
("use access control groups"). Two vendors converging from opposite directions is the strongest
signal in this section.

**Terminology note** `[INFER]`: "permission-aware RAG" is vendor vocabulary with no academic uptake —
full-text search of the preprint literature returns nothing for it. If the proposal uses the phrase,
it must define it.

**Not verified in this pass:** documented tenant/collection ceilings for Weaviate, Milvus and Qdrant;
Postgres row-level-security × pgvector leakproof-function semantics (whether a non-LEAKPROOF operator
can be evaluated before the security-barrier qual — the RLS analogue of pgvector's post-filter
problem, and directly relevant to the proposal's reliance on row-level security); and vendor
delete/tombstone/compaction semantics for search and vector indexes. Also: pre-2019 leakage-abuse
attacks on encrypted similarity search are largely off-preprint, so the apparent absence of published
timing side-channel work on filtered vector search should not be cited as established.

### 2.9 The port boundary itself — AuthZEN, and what a remote PDP cannot promise

**This is the most consequential new fact in the review: the boundary the proposal is inventing has
been standardized.**

#### 2.9.1 AuthZEN Authorization API 1.0 is Final

`[DOC]` <https://openid.net/specs/authorization-api-1_0.html> — header reads *Published: 11 January
2026 · Status: Final*. Approved by OpenID Foundation membership vote 2026-01-12 (81 approve / 1
object / 25 abstain). A Final Specification *"is not subject to further revision."* The repo
(<https://github.com/openid/authzen>) was last pushed 2026-09-15 — actively maintained.

**The request shape is almost exactly the proposal's port** `[DOC]` — `subject`, `action`, `resource`
required; `context` optional:

```json
{ "subject":  {"type":"user","id":"..."},
  "resource": {"type":"account","id":"123"},
  "action":   {"name":"can_read"},
  "context":  {"time":"..."} }
```

Endpoints: `/access/v1/evaluation` (required), `/access/v1/evaluations` (batch, optional),
`/access/v1/search/{subject,resource,action}` (optional), discovered from a `.well-known` metadata
document where **absence of an endpoint parameter is how a PEP learns the PDP lacks that
capability** `[DOC]`. Batch semantics are a three-valued option: `execute_all` (default),
`deny_on_first_deny`, `permit_on_first_permit` `[DOC]`.

`[INFER]` The proposal should either adopt this shape for its port or record why not. Inventing a
parallel signature for a boundary that now has a Final OpenID specification is the kind of choice
that needs a written reason, and the proposal's own preference for reusing standards rather than
homegrown contracts points the same way.

#### 2.9.2 But AuthZEN standardizes less than it appears to

Three documented limits matter for this design:

1. **Only the boolean is portable.** Reasons, obligations, and advice live in `context`, and the spec
   says verbatim `[DOC]`: *"The actual semantics and format of the `context` object are an
   implementation concern and **outside the scope of this specification**."* `[INFER]` Two conformant
   PDPs can return structurally different denial information. The proposal's Phase 0 commitment to
   **machine-readable denial reason codes** is therefore *not* satisfiable by adopting AuthZEN alone —
   it remains the design's own work. (An Obligations Profile 1.0 is in draft and would fix this; it
   is not final, so do not design against it yet `[DOC]`.)
2. **There is no defined behavior for a PDP that fails.** The spec carefully separates transport
   errors from decisions — *"A successful request that results in a 'deny' is indicated by a 200 OK
   status code with a `{"decision": false}` payload"* `[DOC]` — but defines **no PEP behavior for a
   500 or a timeout**. Fail-open vs fail-closed is left entirely to the PEP.
3. **It is a read/decision-plane standard only.** There are no write endpoints; as OpenFGA's own docs
   note, *"It's not possible to implement OpenFGA only with AuthZEN endpoints, as it does not specify
   endpoints to Write and Read"* `[DOC]`. `[INFER]` The tuple-projection path (§F6) stays
   vendor-specific regardless.

Also worth recording for the proposal's trust model `[DOC]`: *"The architecture of this model assumes
**the PDP must trust the PEP**, as the PEP is ultimately responsible for enforcing the decision the
PDP produces."*

#### 2.9.3 The Search APIs are standardized — and explicitly not guaranteed

"List every resource this subject may read" **is** in Final 1.0 (Subject / Resource / Action Search).
The four documented caveats are all load-bearing `[DOC]`:

1. **Results are advisory.** *"any result from a Search API, when subsequently used in an Access
   Evaluation API call, **SHOULD** result in a `"decision": true` response. However… **this outcome is
   not guaranteed**."* — SHOULD, not MUST.
2. **Pagination is not a snapshot.** *"Pagination does not guarantee an atomic snapshot of the result
   set. Consequently, if items are added or removed while paginating, results MAY be repeated or
   omitted between pages."*
3. **`total` is untrustworthy** across pages if the data set changes.
4. **Pagination is OPTIONAL for the PDP** — *"a PDP **MAY** support pagination."*

Transitivity is only *RECOMMENDED* `[DOC]`. `[INFER]` A conformant PDP may therefore return a
non-transitive result set — missing subjects who have access via nested group membership — without
violating the spec.

**And the reality on the leading candidate engine is worse.** OpenFGA's AuthZEN documentation (last
updated 2026-09-14) states verbatim `[DOC]`: *"The current implementation does **not** support
pagination — all matching results are returned in a single response. The `page` field in search
requests is accepted but ignored."* `[INFER]` Layer that on OpenFGA's native 3s deadline and
1000-result cap (§2.8.1) and **AuthZEN Resource Search on OpenFGA can silently return a truncated
list with no `next_token` to indicate truncation.** For an enumeration that is security-relevant, that
is a correctness bug, not a performance characteristic.

AuthZEN support status across the candidate set `[DOC]`: OpenFGA — experimental, behind
`--experimentals=authzen` since v1.13.0 (2026-03-23), with docs warning *"The API surface may
change"*; **SpiceDB — does not implement AuthZEN** (absent from all six interop scenarios); OPA — only
via a Node.js proxy in `contrib`. `[INFER]` If AuthZEN portability is a requirement, SpiceDB is
currently out — which cuts directly against the engine that has the **best** consistency contract
(§2.5). That tension is a real decision, not a detail.

**Interop caveat** `[DOC]`: all six published interop scenarios are labelled against Drafts 00–04, and
the last results commit predates the Final spec. A certification scenario was added 2026-06-25 but its
own abstract says *"The scenario does not judge the implementer's own policy logic, which is out of
scope."* `[INFER]` A future "AuthZEN certified" badge will attest wire-format conformance, not
authorization correctness.

#### 2.9.4 XACML still supplies the vocabulary — including the piece everyone dropped

OASIS XACML 3.0 `[DOC]` defines **PDP** ("evaluates applicable policy and renders an authorization
decision"), **PEP** ("performs access control, by making decision requests and enforcing authorization
decisions"), **PIP** ("acts as a source of attribute values"), and **PAP**.

`[INFER]` The **PIP is the component modern systems dropped and then reinvented**, and the proposal
inherits the problem: Cedar/AVP pushes it entirely onto the caller (entities passed per request),
OPA replaced it with bundles, OpenFGA/SpiceDB replaced it with a tuple store they own, and AuthZEN's
`context` is the PIP-input channel. Whenever a design says "the policy layer will look up current
consent," that is a PIP, and someone must own its freshness. The proposal's invariant has **five**
such lookups (consent, purpose, classification, grant state, tenancy) and names an owner for none of
their staleness.

#### 2.9.5 Fail-open vs fail-closed — the documented position

- **Saltzer & Schroeder (1975)** `[DOC]`: *"**Fail-safe defaults**: Base access decisions on permission
  rather than exclusion… the default situation is lack of access."*
- **OWASP Top 10:2025** `[DOC]` now has category **A10 "Mishandling of Exceptional Conditions"**, which
  explicitly maps **CWE-636 "Not Failing Securely ('Failing Open')."** `[INFER]` Failing open is a
  named Top-10 category as of 2025, which raises the bar on justifying it anywhere.
- **XACML 3.0 §7.2** `[DOC]` formalizes both biases — deny-biased PEP ("All other decisions SHALL
  result in the denial of access") and permit-biased PEP — and defines **"Indeterminate" to include
  "network errors while retrieving policies."** §9.1.6 then walks the permit bias back: *"a PEP must
  deny access unless it receives an explicit 'Permit' authorization decision."*
- **NIST SP 800-53 Rev. 5 SC-24 "Fail in Known State"** is *parameterized* — it requires you to decide
  and document the known state, not automatically to deny. `[INFER]` Cite Saltzer & Schroeder or OWASP
  for "deny"; cite SC-24 only for "decide and document."

**The one real fail-open switch in production infrastructure** `[DOC]`: Envoy `ext_authz`
`failure_mode_allow` — *"the filter will `accept` the client request even if communication with the
authorization service has failed… **Defaults to `false`**"* — with companion
`failure_mode_allow_header_add` (tags the request so downstream knows it bypassed authz),
`status_on_error` (default 403), and a `failure_mode_allowed` counter. Istio mirrors it as `failOpen`
(default `false`) — **but its documented default `ext_authz` timeout is 600 seconds.** `[INFER]` That
is a trap: fail-closed by default, yet a hung PDP stalls requests for up to ten minutes. Envoy
separately documents a route-cache-clearing hazard where per-route ext_authz config can be bypassed,
*"potentially leading to privilege escalation vulnerabilities"* `[DOC]` — independent of
`failure_mode_allow` and easy to miss.

**Nobody credible recommends fail-open as a default.** `[INFER]` And Zanzibar states the actual
engineering answer in its own design goals `[DOC]`: *"**High availability**: It must reliably respond
to requests because, **in the absence of explicit authorizations, client services would be forced to
deny their users access**."* Google's five-nines target exists *because* fail-closed is the only
acceptable PEP behavior — availability is bought at the PDP, not by relaxing enforcement. That is the
correct framing for the proposal's C2/F4.

`[DOC]` **Verified absences:** SpiceDB's best-practices, consistency, and performance docs contain no
guidance on what an application should do when SpiceDB is unreachable; OpenFGA documents timeouts but
takes no fail-open/closed position; OPA's FAQ has no HA/critical-path guidance. OPA's one relevant
statement is in its external-data docs `[DOC]`: *"It is crucial in this approach for the OPA-enabled
service to handle the case when OPA returns no decision."*

**The topological answer.** OPA explicitly recommends local deployment `[DOC]`: *"Running OPA locally
on the same host as your application or service helps ensure policy decisions are fast and
highly-available,"* and it persists activated bundles to disk *"in case OPA cannot communicate with
the bundle server."* `[INFER]` OpenFGA pushes the opposite way — its docs recommend *"a small pool of
servers with high capacity… to increase cache hit ratios,"* which necessarily puts a network hop on
the request path. So the proposal's topology open decision has a real trade: co-location buys
availability, centralization buys cache hit rate.

#### 2.9.6 Cache hit rates: the one published production datapoint

Zanzibar §4.4 `[DOC]`: *"Caching for checks has a **10% hit rate** on the delegate's side, with an
additional 12% saved by the lock table… caching on the delegator's side has a **2% hit rate**… While
these hit rates appear low, they prevent 500K internal RPCs per second from creating hot spots."*

`[INFER]` Zanzibar's decision cache hits ~10%. **It exists to shed hot-spot load, not to serve the
bulk of traffic.** Any design premised on a high decision-cache hit rate is arguing against the only
published production datapoint — and, per §2.4, a TTL cache is the wrong construct anyway.

Zanzibar's availability definition is also worth copying `[DOC]`: *"the fraction of 'qualified' RPCs
the service answers successfully within latency thresholds: **5 seconds for a Safe request, and 15
seconds for a Recent request**"* — i.e. availability is defined against an explicit latency threshold,
not merely "responded."

#### 2.9.7 Testability — and the one capability that is categorically stronger

| | Test runner | Test format | Static check | Coverage | Formal analysis |
|---|---|---|---|---|---|
| **OPA** | `opa test` | `*_test.rego` | `opa check --strict` | **`--coverage`** (line-level JSON) | — |
| **Cedar** | `cedar run-tests` | JSON | `cedar validate` (Strict default) | — | **`cedar symcc`** + Lean-proven validator |
| **OpenFGA** | `fga model test` | `.fga.yaml` | `fga model validate` | — | — |
| **SpiceDB** | `zed validate` | `.yaml`/`.zaml` | `zed validate` | — | — |

All `[DOC]`. Three findings worth carrying into the plan:

- **Only OPA reports policy coverage.** `[INFER]` In Cedar, OpenFGA and SpiceDB, "we tested the
  authorization model" is unfalsifiable without building your own instrumentation — which matters for
  a Phase 4 whose done-criterion is a specific set of negative tests.
- **Cedar's test format asserts *which policy* granted access** (a `reason` array of contributing
  policy IDs) `[DOC]`, which is strictly stronger than a boolean assertion.
- **`cedar symcc`** (shipped v0.7.0, 2026-09-15) discharges `always-allows`, `always-denies`,
  `equivalent`, `implies`, and `disjoint` over a *policy set*, with concrete counterexamples via an
  SMT solver `[DOC]`. `[INFER]` **This is the only mechanism in the entire survey that answers "did
  this change alter the authorized permission set?" rather than "do my N examples still pass."** For a
  model change on a sensitive-class surface, a subsumption check is a materially stronger gate than
  any example-based suite. No Zanzibar-family engine offers an equivalent.

**Correction worth carrying:** `spicedb validate` does not exist — validation is `zed validate`
`[DOC]`. For integration tests, `spicedb serve-testing` provides *"completely isolated datastores per
client-supplied auth token"*, which lets a suite run real gRPC calls in parallel `[DOC]`.

**Fills a gap flagged earlier in this review:** OPA's data filtering **is** documented in open-source
OPA `[DOC]` (<https://www.openpolicyagent.org/docs/filtering>), using partial evaluation with a
`# compile: unknowns:` annotation to return a residual that becomes a SQL `WHERE` clause, with UCAST
and column-mask support. `[INFER]` This is the only approach in the survey that pushes the predicate
into the database, so it composes with sorting and pagination — exactly where ID-list approaches fail
(§2.8.1). Note also that OPA's four "unknowns" (subject, action, resource, context) are precisely
AuthZEN's four entities: the field has converged on one taxonomy from two directions.

### 2.10 Revocation and standing grants — Shared Signals, and the real numbers

#### 2.10.1 How a change takes effect, per engine

| Engine | Mechanism | Documented window |
|---|---|---|
| OpenFGA | Write is immediately visible **if caching is off (the default)**; with `checkQueryCache` on, Check/ListObjects become *"eventually consistent APIs"* | **10s** TTL; `cacheController` polls the changelog at min **10s** `[DOC]` |
| SpiceDB | ZedToken carries causality; without one you get `minimize_latency` | **See below — larger than it looks** |
| Cedar / AVP | Entity data is passed per request, so the caller owns its freshness; **policy** changes propagate separately | *"It can take a **few seconds** for a new or changed element to propagate"* — unbounded in the docs `[DOC]` |
| OPA | No decision cache at all; staleness is the **bundle polling interval** | `min_delay_seconds` **60**, `max_delay_seconds` **120** `[DOC]` |

**SpiceDB's real cache TTL is derived, not the flag value** `[DOC]` (from
`pkg/cmd/server/cacheconfig.go`): `defaultTTL = 2 × (quantizationInterval × (1 + maxStalenessPercent)
+ followerReadDelay)`. With stock defaults (5s quantization, 10% staleness, 4.8s follower-read delay)
that is **≈20.6 seconds, not 5**. And expiry is *access-based*: open issue **#3299, filed 2026-09-08**
`[DOC]` states *"we're using `ExpiryAccessing`, which means the timer starts from the last time the
entry was accessed; 2x the quantization window means that the **max life of an entry is 4x the
quantization window**."* `[INFER]` Worst case with defaults, a frequently-read *permit* can survive on
the order of **~40 seconds** after revocation unless the caller passes a ZedToken or requests
`fully_consistent`. A design that budgets "5 seconds" from the flag name understates this by roughly
8×.

`[INFER]` **AVP is the outlier that matters for the proposal's grant model:** a revocation expressed as
a *policy delete* has no upper bound and no read-your-writes token. If a revocation must be provably
effective, it has to be modelled as data the caller controls per-request, not as a policy edit.

#### 2.10.2 Shared Signals / CAEP — final, and what it actually delivers

`[DOC]` **All three are OpenID Final Specifications**, approved 2025-09-02, published 2025-08-29:
Shared Signals Framework 1.0, Continuous Access Evaluation Profile 1.0, RISC Profile 1.0.

Delivery profiles **RFC 8417 Security Event Tokens**, with exactly two methods: **push**
(`urn:ietf:rfc:8935`) and **poll** (`urn:ietf:rfc:8936`) `[DOC]`. Transmitter metadata carries a
`spec_version` field — *"If absent, the Transmitter is assumed to conform to `1_0-ID1`"* `[INFER]` so
that field is the integration check: a transmitter omitting it is a draft-era implementation.

**CAEP event types** `[DOC]`, under `https://schemas.openid.net/secevent/caep/event-type/`:
`session-revoked`, `token-claims-change`, `credential-change`, `assurance-level-change`,
`device-compliance-change`, `session-established`, `session-presented`, `risk-level-change`. Optional
claims include `initiating_entity` (`admin`/`user`/`policy`/`system`), `reason_admin`, `reason_user`.
**RISC** covers account lifecycle and compromise (`account-disabled`, `credential-compromise`,
`sessions-revoked`, …). `[INFER]` Clean split: CAEP = session/authorization state inside a trust
relationship; RISC = account-lifecycle signals across providers.

**The production numbers are the useful part, and they are sobering.** Microsoft Entra's Continuous
Access Evaluation is GA and documents `[DOC]`:

> The goal for critical event evaluation is for response to be near real time, but **latency of up to
> 15 minutes might be observed** because of event propagation time; however, IP locations policy
> enforcement is instant.

> Changes made to Conditional Access policies and group membership made by administrators **could take
> up to one day to be effective**… Some optimization is done for policy updates, which reduce the delay
> to **two hours**. However, it doesn't cover all the scenarios yet.

Also documented: token lifetime extends to **up to 28 hours** in CAE-aware sessions (revocation is
event-driven rather than expiry-driven); re-enabling a disabled user lags 15–40 minutes depending on
the resource; and **CAE does not support guest accounts** `[DOC]`. Google's RISC implementation is
production and push-based `[DOC]`.

`[INFER]` **This is the honest picture of "continuous" access evaluation, and it bears directly on the
proposal's standing-grant question:** an explicit session revocation propagates in minutes; a
revocation expressed as a *group membership or policy change* propagates in **hours to a day**. A
governed store that relies on an upstream identity provider's CAE signal to end an agent's standing
grant is therefore relying on a control whose documented latency is minutes at best and a day at
worst — which is why the proposal is right that *"local grant revocation must not depend only on an
upstream endpoint,"* and why that rule needs to be stated as a hard requirement rather than a
treatment column in a table.

---

## 3. Failure modes the proposal does not yet address

Each is stated with the concrete scenario that triggers it.

### F1 — New-enemy through a promoted revision (the zookie gap)

**Scenario.** A subject narrows a delegate's grant at T1 (the brain writes the grant change and
queues the tuple projection). At T2 > T1 a new revision of a record is promoted into the brain. At
T3 the delegate's agent calls retrieve. The relationship check runs with `MINIMIZE_LATENCY`, or
against a projection that has not yet drained the outbox, and returns *allowed* from a graph state
that predates T1. The agent retrieves content that did not exist when the relationship was valid.

This is Zanzibar Example B with "content" replaced by "promoted revision." The proposal's threat
table lists "Stale permission survives revocation" with the negative test "Revoked tuple or grant
denies before token expiry," but the port as specified has no mechanism that can make that test
pass: there is no write-side content-change check, no token returned to store with the revision, and
no token input on the read path. `[INFER]`

**Why it is not merely a tuning problem.** Raising `consistency_requirement` to the strongest setting
does not fix it when the brain owns the tuples and projects them (the proposal's own recommended
answer): `HIGHER_CONSISTENCY`/`fully_consistent` bypasses the *engine's cache*, not the *projection
lag*. The engine will faithfully and freshly report a graph that is behind the brain.

### F2 — The Phase 5 prefilter has no supported implementation

**Scenario.** Phase 5 requires "an authorized prefilter *before* every derived index — search,
vector, graph." The natural implementation is: call the port, get the set of permitted record IDs,
pass them as a filter. At 1,200 accessible records, OpenFGA's `listObjectsMaxResults` default of
**1000** truncates the list `[DOC]` and the caller — unless it explicitly detects truncation —
constructs a prefilter that omits records the actor may legitimately read. At a deeper hierarchy the
`listObjectsDeadline` of **3s** `[DOC]` fires first and the request either errors or returns a
partial set.

Meanwhile the port is a **point check** (`check(...) -> {allowed, ...}`). It has no list operation at
all, so Phase 5 either calls a capability the port does not expose, or the route/worker calls the
engine's `ListObjects`/`LookupResources` directly — which the proposal explicitly forbids ("route
handlers must never call a relationship engine's API directly").

**And the API it would reach for is documented as unsuitable.** SpiceDB's own security advisory for
`LookupResources` states that it **should not be used for access-control decisions; the Check API
serves that purpose** `[DOC]` (GHSA-m54h-5x5f-5m6r / CVE-2023-35930), and there are two published
advisories of these APIs returning **partial results** `[DOC]`. OpenFGA scopes `ListObjects` to
"small object collections" `[DOC]`.

The scalable answer across the whole field is the same shape and it is **not a check**: a
denormalized permission projection fed by a change stream —
Zanzibar's Expand-built search indices and Leopard `[DOC]`; OpenFGA's "build a local index from the
changes endpoint" `[DOC]`; AuthZed Materialize / Event Streams `[DOC]` (early access, Dedicated
only). The proposal's architecture has **no layer that owns this**, and the layer-responsibilities
table gives the relationship adapter only "relationship and permission checks."

### F3 — N+1 fan-out with no budget

**Scenario.** A retrieval request returns 50 candidate records; the brain performs a point check per
record before composing the response. With a same-region OpenFGA and cache enabled this is fine.
With `HIGHER_CONSISTENCY` requested (as a "sensitive class" rule would plausibly demand), each check
goes to the database; the docs warn this "will have a significant impact in performance" `[DOC]`.
Under the Zanzibar-measured freshness penalty — p95 9.46ms → 60.0ms `[DOC]` — a 50-record page moves
from a batched few tens of milliseconds to something no interactive surface can absorb.

Mitigations exist and are documented (BatchCheck with `maxBatchSize` 50 / `maxParallelRequests` 10
`[DOC]`; SpiceDB `CheckBulkPermissions` "at the same revision" `[DOC]`), but **the proposal's port
has no batch operation**, so the adapter cannot use them. `[INFER]`

### F4 — Fail-closed without an availability budget

**Scenario.** The relationship engine has a 30-second partial outage. Every governed read denies —
correctly, per the design. But the brain's own availability SLO is now the product of its own
availability and the engine's, and the proposal states no target for either. Zanzibar's bar was
>99.999% over three years `[DOC]`. `[INFER]` Without a named budget, the fail-closed rule is a
correctness statement that silently sets an operational requirement nobody has costed.

A related sub-case the proposal does not distinguish: **fail-closed on timeout is not the same as
fail-closed on "unknown."** The gap analysis already asks the adapter to return
"allow/deny/unknown/unavailable/error classes," but the authorization model collapses these into
"fail closed on timeout, unknown model, stale configuration, or ambiguous subject mapping." Those
have different operational responses (retry, page, circuit-break, degrade to a narrower scope) and
different audit meanings. `[INFER]`

### F5 — Decision caching keyed on the wrong thing

**Scenario.** To control F3, the brain caches port results for 30 seconds keyed on
`(actor, action, resource)` with `checked_at`. A grant is revoked at T; a request at T+5s is served
from cache and allowed. The threat table's "bounded cache" is satisfied and the system is still
wrong for up to 30 seconds.

Zanzibar's construct — snapshot timestamp *in the cache key* `[DOC]` — does not have this failure,
because an entry is never stale, only old. The port's return type (`checked_at`, `tuple_snapshot`)
gestures at this but does not require the snapshot to be the cache key, and `checked_at` invites the
TTL design. `[INFER]`

### F6 — Two-clock skew between the graph and the grant table

**Scenario.** The brain is the system of record for grants (the proposal's recommended answer) and
projects tuples asynchronously. A grant row says "revoked at T1." The projection drains at T1+2s. A
request at T1+1s evaluates `grant_is_current_and_not_revoked` → deny, so the conjunction denies and
the system is safe. Now invert it: a grant is *created* at T1 and the projection lags; the grant
term allows, the graph term denies, and the actor sees a spurious denial with a reason code that
blames the relationship layer. Support and audit cannot distinguish "not permitted" from "not yet
projected."

The proposal has no reconciliation-lag observable and no denial reason code for "projection stale."
`[INFER]` Given that it already commits to machine-readable denial reason codes in Phase 0, this is
a cheap fix.

### F7 — `at_exact_snapshot` expiry during a paginated disclosure

**Scenario.** A federated bounded-query disclosure returns results across several pages, and the
implementation pins a snapshot so pages are mutually consistent. SpiceDB documents that
`at_exact_snapshot` "can fail with Snapshot Expired errors due to garbage collection" and is
"recommended only for pagination within short windows" `[DOC]`. A long-running export or a slow
consumer crosses the GC window and the disclosure fails mid-stream — or, if the implementation falls
back to a fresh snapshot, pages silently come from different graph states and the receipt records a
disclosure that never atomically existed.

The proposal's receipts bind "the request, source, revision or snapshot, policy and grant references"
— so it already wants snapshot-pinned disclosure, but has not confronted that the pin has a vendor
expiry. `[INFER]`

### F8 — Watch-window overrun invalidates a projection

**Scenario.** Any materialized projection (F2's necessary fix, or a cache invalidator) consumes the
engine's change stream. SpiceDB bounds Watch history by the datastore GC window, "typically 24 hours"
`[DOC]`. If the consumer is down longer than that, resumption from the stored token is impossible and
the projection must be rebuilt from a full read. Until the rebuild completes, the brain is filtering
against a projection it cannot prove is complete.

The proposal has no "projection is untrusted, deny or degrade" state. `[INFER]` This is the
derived-index analogue of its own fail-closed rule.

### F9 — Contextual tuples as an escape hatch have a hard ceiling

**Scenario.** To avoid projecting everything, the design passes the actor's current memberships or
the grant as contextual tuples at call time. OpenFGA caps this at **100 contextual tuples per
request** `[DOC]`. An actor who is a member of many teams, or a request that needs to carry a
non-trivial slice of grant state, exceeds it. The docs also warn that token-claim-derived contextual
tuples continue granting access until the token expires "even if the underlying claims (like group
membership) change" `[DOC]` — which directly contradicts the proposal's rule that "a token is
evidence about an authorization request; it is not a permanent ACL."

`[INFER]` If the design intends to carry grant state into the check rather than project it, it must
say so and must confront the 100-tuple ceiling and the claims-staleness warning explicitly.

### F10 — A bulk-filter result is silently truncated with no truncation signal

**Scenario.** The brain uses AuthZEN Resource Search (or OpenFGA `ListObjects` directly) to build the
Phase 5 prefilter for an actor with 1,400 accessible records. OpenFGA returns 1,000 and stops; its
AuthZEN implementation *"does not support pagination — all matching results are returned in a single
response. The `page` field in search requests is accepted but ignored"* `[DOC]`. There is no
`next_token`, no error, and no field that distinguishes "that is all there is" from "I stopped."
400 records the actor is entitled to read simply vanish, and the UI reports no results for them.

`[INFER]` The AuthZEN spec makes this conformant: pagination is OPTIONAL for the PDP, `total` is not
trustworthy, and search results only *SHOULD* re-verify. A design cannot detect truncation through
the standard. It must be detected out-of-band — e.g. by requesting `limit+1` and treating a full
response as "possibly truncated" — and that convention has to be written down.

### F11 — A standing agent grant outlives the revocation signal

**Scenario.** A delegate's authority is withdrawn upstream (they leave the organization). The identity
provider emits a CAEP `session-revoked` event. But the delegate's agent holds a standing
`brain_access` grant and calls with a sender-constrained token that has not expired. Documented
propagation `[DOC]`: Entra's CAE targets near-real-time but *"latency of up to 15 minutes might be
observed"*, and where the withdrawal is expressed as a **group membership or policy change** it
*"could take up to one day to be effective"* (optimized to two hours in some scenarios). Meanwhile
CAE-aware sessions extend token lifetime to **up to 28 hours**.

So the window is: token still valid (up to 28h), upstream signal in flight (minutes to a day),
relationship projection lagging (§F6), engine cache holding a permit (10s–40s, §2.10.1). The
proposal's invariant term `grant_is_current_and_not_revoked` is the only thing standing between the
agent and the data, and it is the one term the document never assigns a latency to.

`[INFER]` The proposal already says *"local grant revocation must not depend only on an upstream
endpoint"* — but it says it in a *treatment* column of a capability table, not as a requirement. Given
these numbers it needs to be a hard rule with a named local revocation path and a measured window.

### F12 — The staleness budget is taken from the flag name, not the derived value

**Scenario.** An operator reads SpiceDB's `--datastore-revision-quantization-interval` default of 5s
and writes "5 seconds of staleness" into the design. The actual derived cache TTL is
`2 × (5s × 1.1 + 4.8s) ≈ 20.6s` `[DOC]`, and because expiry is access-based, a hot key can survive
**~4× the quantization window** — on the order of 40 seconds — per open issue #3299 (2026-09-08)
`[DOC]`. A revocation the design believes takes effect in 5 seconds takes effect in up to 40.

`[INFER]` This is the specific reason CR-8/CR-16 must require the window to be **measured on the
deployed configuration**, not read off a flag default.

### F13 — Phase 4's negative tests cannot be shown to be complete

**Scenario.** Phase 4 requires proving negative cases: cross-tenant, direct share, inherited
membership, revocation, maker-checker, proposer-approver separation. The tests pass. But **no
Zanzibar-family engine reports policy/model coverage** `[DOC]` — only OPA does, among the engines
surveyed. So there is no mechanism to show that the test suite actually exercises every branch of the
relationship model, and no mechanism to show that a later model edit did not silently widen the
authorized set.

`[INFER]` Cedar's `symcc` can answer the second question by subsumption (`implies`, `equivalent`)
`[DOC]`, but Cedar is not a relationship engine. For the Zanzibar-family choice, the design has to
build its own instrumentation or accept that "the model is tested" is unfalsifiable — which sits badly
against the proposal's own evidence discipline and its BR-REQ-16 capability-status requirement.

---

## 4. Specific change requests

Each names the file and the section to change.

### CR-1 — `governed-brain-authorization.md`, "The relationship-authorization port": make consistency a typed value, not a scalar

Replace `consistency_requirement` with a type that can carry a token, because the two named
candidate engines have structurally different contracts (§C0):

```text
consistency: MinimizeLatency
           | AtLeastAsFresh(snapshot_token)
           | AtExactSnapshot(snapshot_token)
           | FullyConsistent
```

Add three obligations to the adapter contract:

1. An adapter for an engine that cannot honour a token-carrying mode (**OpenFGA today**, and
   **Ory Keto today — where the fields exist in the API but are annotated "not implemented yet and
   has no effect"** `[DOC]`) **must reject** `AtLeastAsFresh` / `AtExactSnapshot` rather than silently
   downgrade. Silent downgrade is the failure that makes C0 invisible, and the Keto case shows the
   engine itself can perform it.
2. The result must report **the consistency actually achieved**, not the consistency requested — Keto
   documents that an over-aged token causes the server to fall back "as if no snaptoken had been
   specified" `[DOC]`, with no error.
3. Capability discovery: the adapter must declare which modes its engine genuinely supports, so
   Phase 7's conformance report can state the guarantee rather than assume it.

### CR-2 — `governed-brain-authorization.md`, "The relationship-authorization port": add the write-side leg of the zookie protocol

The port needs a second operation and a storage obligation, or the new-enemy problem is unaddressable
(§F1):

```text
RelationshipAuthorizationPort.check_content_change(
  actor_principal, action, resource_type, resource_id, tenant_id,
) -> { allowed, snapshot_token, model_id, checked_at }
```

and a stated rule in the brain layer: **the brain MUST persist `snapshot_token` atomically with the
record revision it authorizes, and MUST pass it as `AtLeastAsFresh` on every subsequent read check
for that revision.** This is Zanzibar §2.2/§2.4.4 verbatim in shape, and it is the only documented
mechanism in the field that prevents Example A and Example B.

Where the adapter's engine has no token (OpenFGA), the port must return a documented sentinel and the
brain must record that the revision is **not causally protected** — so the conformance report
(Phase 7) can state it rather than imply the guarantee.

### CR-3 — `governed-brain-authorization.md`, "The relationship-authorization port": add a batch operation

Add `check_batch(...)` returning per-item decisions at a single consistency point, mapping to
OpenFGA `BatchCheck` and SpiceDB `CheckBulkPermissions` `[DOC]`. Without it the adapter cannot use
the documented N+1 mitigation and the proposal's per-request conjunction becomes a per-record
conjunction (§F3). Note SpiceDB's documented guidance to run the bulk calls "at the same revision"
`[DOC]` — which requires CR-1's token to be expressible.

### CR-4 — `governed-brain-authorization.md`, "Layered architecture" + "Layer responsibilities": add the permission-projection layer

The layer table currently gives the relationship adapter "relationship and permission checks over
brain objects" and gives the database/object store "row- and object-level isolation." Nothing owns
the **materialized permission projection** that every system in the field uses for access-aware
search (§F2). Add a row:

| Layer | Owns | Must not own |
|---|---|---|
| **Permission projection** | A denormalized, change-stream-fed copy of "which actors hold which permission on which objects," used to prefilter search, vector, and graph indexes; its freshness watermark, completeness state, and rebuild path | Being the authority for a point decision; serving a disclosure without a confirming point check |

And add the corresponding invariant: **the projection may only ever narrow a result set.** Every
record that survives the prefilter is still subject to the full per-request conjunction before it is
disclosed. That preserves the proposal's own "necessary but not sufficient" property while making
Phase 5 implementable.

### CR-5 — `governed-brain-authorization.md`, "What belongs where": correct the search/index row

The row "Is this row returned from the database? → Row-level security and application policy" is
right but incomplete. Add a row for the bulk question, and say explicitly that it is **not** the
port's `check`:

| Question | Decision system | Why |
|---|---|---|
| Which records may this actor see in a list, search, or retrieval? | Permission projection, then per-record check before disclosure | Bulk-listing APIs are documented as unsuitable for access-control decisions (SpiceDB advisory GHSA-m54h-5x5f-5m6r) and are truncation- and deadline-bounded (OpenFGA `listObjectsMaxResults` 1000, `listObjectsDeadline` 3s) |

### CR-6 — `governed-brain-authorization.md`, "Threats and required controls": strengthen two rows

- **"Stale permission survives revocation."** Current control: "Per-request graph and policy check,
  bounded cache, revocation events." Change to require a *named staleness bound per data class* and
  the CR-2 token protocol, and change the negative test to include the Zanzibar Example B shape:
  *"a revision promoted after a grant is narrowed is not readable under the pre-narrowing graph
  state."* The current test ("Revoked tuple or grant denies before token expiry") does not exercise
  the ordering bug at all.
- **"Sensitive data leaks through projections."** Current control names "authorized prefilter before
  search, vector, graph, or model calls." Add: the prefilter's **source** must be the CR-4 projection
  with a freshness watermark, and a stale or incomplete projection must fail closed (§F8), not
  silently return a narrower set.

### CR-7 — `governed-brain-authorization.md`, "The relationship-authorization port": distinguish the failure classes

The adapter bullet "fail closed on timeout, unknown model, stale configuration, or ambiguous subject
mapping" collapses distinct conditions. Align with the gap analysis's own
`allow/deny/unknown/unavailable/error` classes: all of them deny, but each gets a distinct
machine-readable reason code, and `unavailable` additionally drives circuit-breaking and alerting
rather than appearing in audit as an authorization denial (§F4).

### CR-8 — `governed-brain-authorization.md`, "Open decisions" → promote to stated requirements

Two of the open decisions are answerable now with published numbers and should become budgets rather
than questions:

- **Latency budget.** State a per-request budget for the conjunction and a per-check budget for the
  port, with the note that the field's measured cost of freshness is ~6× at p95 (Zanzibar Check Safe
  p95 9.46ms vs Check Recent p95 60.0ms `[DOC]`).
- **Staleness window.** State a maximum per data class. Note the concrete default in the leading
  candidate engine: OpenFGA `checkQueryCache.ttl` 10s and `cacheController.ttl` 10s `[DOC]`, so
  ~10 seconds is the out-of-the-box revocation-visibility window with caching on.

### CR-9 — `governed-brain-authorization.md`, "Illustrative relationship model": add the tuple-lifecycle note

The model is idiomatic OpenFGA DSL and the "must add and test" list is good. Add two items that the
field's failure history says belong there: **(a)** a stated ownership rule for each relation — which
tuples are projected from the brain and which are supplied as contextual tuples at call time, with
the documented 100-contextual-tuple ceiling `[DOC]`; and **(b)** an explicit statement that this
model contains **no purpose, consent, or classification relation**, so that a later contributor
cannot "helpfully" add one.

### CR-10 — `governed-brain-implementation-plan.md`, Phase 2 and Phase 5: re-scope

- **Phase 2 ("Relationship-authorization port")** — "Done when: the port is the only path to a
  relationship decision" is correct but under-specified given CR-1/CR-2/CR-3. Add to the done
  criteria: the port exposes check, batch-check, and content-change-check; the consistency type
  round-trips a token; and an adapter that cannot honour a token-carrying mode **fails loudly**.
- **Phase 5 ("Policy composition and the data boundary")** — currently reads as if the prefilter is a
  straightforward application of the port. It is the hardest phase and depends on a projection
  component that does not exist in the architecture (CR-4). Split it: **5a** policy composition
  (transactional grant/consent/label storage + the intersecting service), **5b** the permission
  projection and its freshness/completeness contract, **5c** the derived-index boundary (prefilter,
  invalidation, queued-work cancellation). Add to 5b's done criteria: a measured
  projection-lag watermark, a rebuild path, and a fail-closed state when the watermark is stale or
  the change stream's history window has been exceeded (§F8).

### CR-11 — `governed-brain-implementation-plan.md`, Phase 4: add the ordering negative test

Phase 4's done criterion — "a relationship decision is demonstrably *necessary but not sufficient*"
— is excellent and should stay. Add one more: **the Zanzibar Example A and Example B orderings are
executed as negative tests against the chosen engine**, so that whichever engine is selected, the
conformance report states plainly whether the causal-ordering guarantee is held or absent.

### CR-12 — `governed-brain-concepts.md`, BR-REQ-09 and BR-REQ-12: name the derived-data obligation

- **BR-REQ-09 ("Make revocation observable")** says "cached and derived copies have an explicit
  handling policy." Tighten the acceptance property to require a **bound**: the maximum interval
  between a revocation and its effect in each derived copy (engine cache, permission projection,
  search index, vector index, agent context), stated per data class and tested.
- **BR-REQ-12 ("Enforce isolation end to end")** already enumerates indexes, graphs and caches.
  Add the projection to the list explicitly, and add the negative test that a projection which is
  stale beyond its watermark causes the dependent surface to deny rather than serve a narrower set.

### CR-13 — `governed-brain-authorization.md`, "`brain_access` authorization detail": fix the purpose rule

Current rule: "`purpose` comes from a controlled vocabulary and is policy-checked; a self-attested
string does not grant access." The second clause is the right instinct but the first does not deliver
it — vocabulary membership is the weakest of the three properties (§2.7), and every documented
anti-pattern in the field passes a vocabulary check.

Replace with an explicit three-property statement and one enforceable control:

- **Vocabulary validity** — the value is in the controlled set. Necessary, not sufficient.
- **Provenance** — the value MUST arrive in a signed artifact attributable to an issuer or to the
  client (a token claim, or a signed grant object), never from a request header, query parameter, or
  unauthenticated body field. This resolves the Phase 0 open item "decide whether `data_subject`
  travels inside authorization details or a separate signed grant object" — **purpose has the same
  requirement, and for the same reason.**
- **Truth** — explicitly **out of scope for any engine**. State this in the document so no downstream
  reader assumes purpose limitation is technically enforced.

Add the one control that *is* enforceable: **entitlement-to-declare.** Gate which principals may
assert which purposes, sourced from the canonical identity/grant state, not from the request. Then
state plainly that everything beyond that is **audit-grade**: purpose belongs in the receipt and the
decision record (BR-REQ-13) as evidence for after-the-fact review, which is also where the academic
literature places it — purpose is a property of the actor's plan, enforceable only by post-hoc
auditing (Tschantz, Datta & Wing, IEEE S&P 2012) `[ACADEMIC]`.

Add to the threats table:

| Threat | Required control | Negative test |
|---|---|---|
| Self-attested purpose escalates access | Purpose carried only in a signed claim or grant; entitlement-to-declare checked against canonical state; absence is a deny, never a default | A purpose supplied in an unauthenticated header is ignored; a missing purpose does **not** default to a permissive value; a principal not entitled to declare a purpose is denied when asserting it |

`[INFER]` The "absence is a deny, never a default" clause is worth stating explicitly: defaulting a
missing purpose to a permissive value is one of the most common observed failures, and the proposal's
allowlist rule ("an empty list means 'none,' not 'all'") already establishes exactly this principle
for `actions`/`collections`/`record_ids` — it simply is not yet stated for `purpose`.

### CR-14 — `governed-brain-authorization.md`, "Layer responsibilities": note the engine-capability constraint on purpose

If the policy layer is ever implemented on a policy engine rather than bespoke code, the choice is
constrained by a documented capability difference (§2.7): a Rego policy can verify a signed claim
in-policy via `io.jwt.decode_verify` `[DOC]`; **Cedar has no cryptographic operators** `[DOC by
absence]`, and Amazon Verified Permissions validates only the principal-side token, leaving `context`
unattested `[DOC]`. Either verify the signature *before* the policy call and pass a verified-claims
structure, or pick an engine that can verify in-policy. Record the choice, because it determines
whether purpose may travel in `context` at all.

### CR-15 — `governed-brain-authorization.md`, "The relationship-authorization port": reconcile with AuthZEN 1.0

The boundary this document is defining was standardized as an **OpenID Final Specification on
2026-01-11** (Authorization API 1.0), and its request shape — `subject` / `action` / `resource` /
`context` — is close to the proposal's port. Adopt it, or record the reason for diverging.

Three things the document must state either way, because adopting AuthZEN does **not** supply them:

- **Denial reasons remain the design's own work.** AuthZEN puts reasons and obligations in `context`
  and declares their semantics *"outside the scope of this specification"* `[DOC]`. Phase 0's
  machine-readable denial codes are therefore not satisfiable by standard adoption.
- **AuthZEN defines no PEP behavior on PDP failure.** The fail-closed rule stays local policy, and
  should cite Saltzer & Schroeder / OWASP A10:2025 (CWE-636) rather than implying a standard mandates
  it.
- **AuthZEN is decision-plane only** — no write endpoints — so the tuple-projection path (CR-4, §F6)
  stays vendor-specific.

Also record the engine tension this creates: **SpiceDB does not implement AuthZEN** `[DOC]`, and
SpiceDB is the engine with the strongest consistency contract (§2.5). Portability and causal
correctness currently point at different engines. That is a decision, not a detail.

### CR-16 — `governed-brain-authorization.md`, "Open decisions" → a staleness table with real numbers

Replace *"What are the maximum token, grant, cache, metadata, and revocation staleness windows per
data class?"* with a filled-in table. The field supplies the defaults; the design supplies the
budgets:

| Layer | Documented default | Source |
|---|---|---|
| OpenFGA check cache | **10s** TTL; changelog invalidation polls at min **10s** | `.config-schema.json` `[DOC]` |
| SpiceDB derived cache | **≈20.6s** with stock defaults; up to **~4× quantization (~40s)** on hot keys | `cacheconfig.go`; issue #3299 `[DOC]` |
| OPA policy/data | **60–120s** bundle polling | OPA docs `[DOC]` |
| Cedar / AVP policy change | *"a few seconds"*, **unbounded in the docs** | AVP API reference `[DOC]` |
| Upstream CAEP `session-revoked` | *"up to 15 minutes"* | Entra CAE docs `[DOC]` |
| Upstream group/policy change | *"up to one day"* (2h optimized) | Entra CAE docs `[DOC]` |

Add the rule that follows: the window must be **measured on the deployed configuration**, not read off
a flag default (§F12), and *"eventually consistent"* is not an acceptable statement of it.

### CR-17 — `governed-brain-authorization.md`: promote local revocation from a treatment to a requirement

The capability table currently carries *"local grant revocation must not depend only on an upstream
endpoint"* in a **Treatment** cell. Given the measured upstream numbers (§F11 — minutes for an
explicit session revocation, up to a day for a membership change, with token lifetimes up to 28
hours), this belongs in the security invariant's supporting rules as a hard requirement: **the brain
maintains its own authoritative grant state, and a revocation recorded locally takes effect on the
next request regardless of upstream signal timing or token expiry.**

Add the corresponding threat-table row:

| Threat | Required control | Negative test |
|---|---|---|
| Standing agent grant survives upstream withdrawal | Local grant state is authoritative and checked per request; upstream CAEP/SSF events are an *accelerant*, never the only path; queued and in-flight agent work is cancelled on revocation | An agent holding an unexpired, sender-constrained token is denied on the first request after a local revocation, with no dependence on an upstream event arriving |

`[INFER]` Also worth adopting from the Shared Signals work: CAEP's `initiating_entity`
(`admin`/`user`/`policy`/`system`) plus `reason_admin`/`reason_user` is a ready-made vocabulary for
the proposal's revocation audit records `[DOC]`, and reusing it is cheaper than inventing one.

### CR-18 — `governed-brain-implementation-plan.md`, Phase 4 and Phase 7: make model testing falsifiable

Phase 4's done-criterion is a set of negative tests, and Phase 7 promises a requirement-by-requirement
conformance report. Neither is achievable as written, because **no Zanzibar-family engine reports
model coverage** (§F13) `[DOC]`.

Add to Phase 4: build (or explicitly defer, with the gap recorded per BR-REQ-16) an instrument that
shows **which branches of the relationship model the negative tests actually exercise**, and a
**model-diff gate** that flags any change which widens the authorized set. Cedar's `symcc` shows what
the strong form looks like — `implies` / `equivalent` / `disjoint` over a whole policy set with
counterexamples `[DOC]` — and is worth citing in the plan as the benchmark the relationship-engine
choice does not currently meet.

Add to Phase 7: report the **absence** of coverage measurement as a named capability gap rather than
letting "negative tests pass" stand in for "the model is proven."

---

## 5. Open decisions

These are genuinely open — the field does not settle them, and they need a call from the author.

1. **Which engine's consistency contract does the port promise?** The honest options are (a) define
   the port at SpiceDB's fidelity (token-carrying) and accept that an OpenFGA adapter is a documented
   partial implementation; (b) define it at OpenFGA's fidelity and state plainly that the design does
   not prevent the new-enemy problem; or (c) make the token optional and make its absence a recorded
   capability gap per BR-REQ-16. **(c) is the most consistent with the proposal's own evidence
   discipline**, but it must be a deliberate, written choice, not an omission.

2. **Is the permission projection in scope, and who operates it?** If yes, it is a new component with
   its own storage, freshness contract, and rebuild path — and the most capable off-the-shelf version
   (AuthZed Materialize) is commercial and in early access `[DOC]`. If no, Phase 5's prefilter
   requirement should be narrowed to collection sizes where `ListObjects`/`LookupResources` is
   documented to work (~1,000 for OpenFGA `[DOC]`, ~10,000 for SpiceDB `[DOC]`), and that ceiling
   should be written into the requirement.

3. **Latency budget, and what is allowed to be stale.** ~99% of Google's own checks run against
   deliberately ≥10-second-stale data because the zookie bounds the staleness causally `[DOC]`.
   Which brain operations may do the same, and which must pay the ~6× freshness premium? This is a
   per-data-class call and it determines the engine topology.

4. **AuthZEN alignment, and the engine trade it forces.** Adopt the Final 1.0 request/response shape
   for the port, or record why not (CR-15). The consequential part is that AuthZEN portability and
   the strongest consistency contract currently point at **different engines** — OpenFGA implements
   AuthZEN experimentally but has no consistency token; SpiceDB has the token but no AuthZEN. Pick
   which property is load-bearing for the first sensitive lane.

5. **Availability target for the relationship engine**, given fail-closed puts it in the critical
   path of every governed read (§F4). Zanzibar's own number was >99.999% `[DOC]`. Collocated,
   separately managed, or replicated-with-local-read-replica are three different answers with three
   different operational costs.

6. **Tuple ownership.** The proposal's recommended answer — brain-owned change record, idempotent
   projection, reconciliation — matches the documented transactional-outbox guidance `[BLOG]` and I
   would keep it. The open part is the **reconciliation** half: how divergence between the brain's
   grant table and the engine's tuples is detected (periodic full compare? change-stream audit?) and
   what happens when it is found.

7. **Whether purpose is claimed as a preventive control at all.** The research is unambiguous that
   truth-of-purpose is unachievable (§2.7) and that the enforceable residue is
   entitlement-to-declare plus audit. The open decision is **how the capability is labelled**: if any
   artifact states that the system "enforces purpose limitation," that claim is not supportable from
   any primary source found here. Labelling it an audit/accountability control that *may* additionally
   inform the access decision is supportable. Given the proposal's own evidence discipline — and its
   rule that designed-for must never be reported as held — this is the labelling call that most needs
   making. CR-13 gives the wording.

8. **Snapshot pinning for multi-page disclosures** (§F7): pin and risk expiry, or accept
   page-to-page graph drift and record it in the receipt. The proposal's receipt model implies the
   former; the vendor's GC window means it cannot always be honoured.

9. **Denial-reason taxonomy** must distinguish "relationship absent" from "relationship not yet
   projected" from "relationship engine unavailable" (§F6, §F7). Phase 0 already commits to
   machine-readable denial codes, so this is a cheap decision to make early and expensive to retrofit.

