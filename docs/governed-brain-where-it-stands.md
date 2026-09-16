---
title: "Governed Brain — Where It Stands"
sidebar_label: "Where it stands"
description: "Plain-language entry point: the idea, what is genuinely new against what already exists, and the four open decisions with a recommendation for each."
status: proposed
last_verified: 2026-09-15
---

# Governed Brain — Where It Stands

**Status:** Proposed · **Date:** 2026-09-15

Plain-language entry point to the governed-brain material. Read this first; the
three design documents and the research beneath it carry the detail.

## The idea in a paragraph

An agent that remembers things on your behalf has to answer a question ordinary
search does not. Search answers *"what text is similar to this query."* A
governed brain has to answer *"may **this actor**, acting for **this person**,
obtain **this kind of record**, for **this stated reason**, right now."* That is
an authorization question, not a retrieval question, and it is the same class of
question this workspace's identity libraries already exist to answer. A governed
brain is the contract for asking it — independent of any database, cloud,
authorization engine, or model provider.

## What exists today

| Document | What it is |
|---|---|
| [Concepts and Requirements](governed-brain-concepts.md) | What a governed brain must mean and do — brain, scope, authority, grant, receipt — plus sixteen acceptance properties written so any implementation can be checked against them |
| [Authorization and Federation Model](governed-brain-authorization.md) | How one disclosure decision composes: the security invariant, which layer owns which check, the relationship-authorization port, and the threat table |
| [Long-Term Implementation Plan](governed-brain-implementation-plan.md) | Phases 0–7 across the identity repositories, what gates what, and the known blockers |
| [Research Findings](research/governed-brain-research-2026-09-15.md) | Four independent passes testing all of the above against the current state of the field |

Nothing is built. No phase has started.

## What is genuinely new, and what is not

The research was blunt about this, and the documents now say it plainly.

**Not new.** Retrieval filtered by permissions — *this user, this document* — is a
mature product category. Several products decide it per query today, some
filtering inside the query pipeline rather than after it. A design that implied
greenfield here would be read as uninformed.

**New.** Two terms are unoccupied everywhere we looked:

- **Acting for someone else.** No shipped system models the difference between
  the actor making a request, the person it is made on behalf of, and the person
  the data is *about*. The relevant drafts either leave it optional or declare it
  out of scope, and the leading agent-to-agent protocol carries no principal in
  its payload at all.
- **For a stated reason.** Purpose is absent from every token format in general
  use. Where it does appear in production, it is an attestation the client makes
  about itself, backed by contract rather than by proof.

The defensible claim is therefore narrow and checkable: *permission-aware
retrieval is solved for identity × document; this is the portable contract for
the rest of the decision.*

## Four decisions to make

Each one blocks a phase. None can be settled by more research — they are choices
about what to build and what to promise.

### 1. How the candidate set gets narrowed (blocks Phase 5)

**The problem.** The plan assumes authorization can filter the set of candidate
records *before* retrieval runs. No relationship-authorization engine supports
that safely at scale: one has no list operation at all, another truncates results
silently, and a third advises in its own documentation against using its list
operation for access-control decisions. Filtering *after* retrieval is a weaker
system — published measurement of that pattern found unauthorized context
reaching the model in the large majority of queries.

**The options.** Build a projection — a maintained, permission-filtered view fed
by the authorization engine's change stream, which is what the field does — or
restrict early phases to a scale where per-record checks are affordable, and say
so.

**Recommendation.** Build the projection, and write its one non-negotiable
property into the contract: it may only ever *narrow* the candidate set, never
widen it, and that property gets a negative test rather than a promise.

### 2. What the relationship port actually promises (blocks Phases 2 and 4)

**The problem.** The port currently takes a single consistency setting. The
candidate engines do not agree on what consistency means — one takes a mode plus
a freshness token, one takes a two-value flag with no token, and one declares the
fields and then documents that they have no effect. A single setting quietly
becomes the weakest of those. Worse, the freshness mechanism is two-sided: you
have to check at *write* time, get a token back, and store it with the content.
A port that only offers "check this" cannot carry it — which means the plan's own
"a revoked permission must not survive in a cache" test cannot pass.

**The options.** Widen the port to carry a typed consistency value and the
write-side leg, and refuse engines that cannot honor it; or keep the port narrow
and accept a documented staleness window with local revocation state as the
authority.

**Recommendation.** Widen it. The narrow version fails your own test, and the
staleness numbers are real — measured revocation windows across these engines run
from ten seconds to a minute, and upstream session-revocation events can take
fifteen minutes.

### 3. What makes a receipt worth anything (blocks Phase 6)

**The problem.** Phase 6 says a disclosure must produce a *verifiable* receipt.
Nothing in the requirements makes a receipt verifiable by anyone — as written,
a row in the operator's own database satisfies it. A record held only by the
party whose conduct is in question proves nothing. A signature alone does not
fix it either: it proves authorship, not that the record was never omitted,
backdated, or told differently to two people.

**The options.** Signed receipts anchored in a permissioned append-only log, with
inclusion proofs (two Standards-Track RFCs published in June 2026 cover exactly
this); mutual witnessing between two authorities, which needs no third party;
or drop the word *verifiable* and promise an internal audit record.

**Recommendation.** Signed plus anchored, with mutual witnessing as the two-party
starting point. But this is the decision with the longest tail: it commits you to
a log, a retention position, and an answer to the durability-versus-erasure
question. Taking the third option honestly is better than claiming the first one
loosely.

### 4. When a request needs fresh consent (blocks Phase 0)

**The problem.** The authorization-details format the design uses delegates one
thing to whoever defines a type: how to tell whether a new request is already
covered by an existing grant. That algorithm is not written. Without it, an
authorization server cannot decide when to re-prompt, which is the difference
between a grant that means something and a checkbox.

**The options.** Define it now, in Phase 0, alongside the type identifier and the
field mapping; or defer it and accept that every request re-prompts until it
exists.

**Recommendation.** Define it in Phase 0. It is pure writing, it is the smallest
of the four, and three other decisions read more clearly once it exists.

## After the decisions

With those four settled, the architecture work has something to compile against
and the phases unblock in the order the plan already gives: the contract and
terminology first, the port and its projection next, then the brain contract and
the synthetic slice. The unconditional client-conformance work does not wait on
any of this and can start immediately.

## What this is not

Nothing here is implemented, deployed, certified, or compliant with anything. The
requirements are proposed. Where a specific regulated domain would impose its own
consent regime, that is an additional boundary on top of this model and is
deliberately out of scope — it needs its own legal and security review, and
picking one is a separate decision.
