---
title: "Is the \"governed brain\" gap open? — landscape research, 2026-09-15"
sidebar_label: "Agent memory"
description: "Landscape research on whether the governed-brain gap is genuinely open in the agent-memory category."
status: proposed
last_verified: 2026-09-16
---

# Is the "governed brain" gap open? — landscape research, 2026-09-15

Research target: the positioning claim in
`/home/james/repos/auth/.worktrees/governed-brain/docs/governed-brain-concepts.md` —

> Agent memory today is retrieval ("what text is similar to this query"). A governed
> brain must answer "may THIS actor, acting for THIS subject, obtain THIS class of
> record, for THIS purpose, right now." Nobody is doing the authorization half, so
> the gap is open.

All claims below carry a URL and, where the source states one, a date. Shipped
behavior (spec text, product docs, code) is distinguished from roadmap/blog claims.
"Unverified" means I could not confirm it from a primary source.

---

## 1. Verdict — **partly closed, and closing on the axes the proposal claims are empty**

Decompose the claim into its five terms and score each independently. That is the
only honest way to answer it, because the terms have very different occupancy.

| Term of the decision | State of the art, 2026-09-15 | Open? |
|---|---|---|
| **THIS actor** (identity of the caller) | Solved and shipping everywhere. Every memory product scopes by an identity key; MCP's current spec makes the server an OAuth 2.1 resource server with mandatory PRM + audience validation. | **Closed** |
| **THIS class of record** (what may be returned) | Shipping in several products: Zep ABAC source-metadata policies, Cognee dataset ACLs, Supermemory container tags, Elastic DLS, Azure AI Search permission filters, Auth0/Okta FGA `FGARetriever`. | **Closed / commoditising** |
| **right now** (freshness / revocation) | Partially shipping, and every honest vendor documents a staleness window. Glean documents up to **one month** ACL lag on the least-privilege SharePoint connector config. Nobody ties retrieval to a revocation event stream. | **Partly open** |
| **acting for THIS subject** (delegation chain; data subject ≠ authenticated user) | Essentially unoccupied in product. MCP shipped single-subject delegated tokens (ID-JAG) but **no actor chain**. Glean explicitly *forbids* the case ("agents execute with the identity of the signed-in user"). Academic treatment exists (MSR "participant-aware access control"). | **Open** |
| **for THIS purpose** | Unoccupied for unstructured/knowledge retrieval. Immuta has real purpose-based access control for **structured** sources; Knostic sells per-topic "need-to-know" as an overlay. No retrieval or memory primitive takes a purpose as a policy input. | **Open** |

**Therefore:** the proposal's framing — *"nobody is doing the authorization half"* — is
**false as stated** and would not survive a reviewer who has read the 2026 literature or
the vendor docs. Multiple products make a real policy decision per retrieval today.
Two 2026 papers frame exactly the proposal's thesis (authorization as an
architectural invariant over retrieval) and one of them measures the alternative.

What **is** genuinely open is narrower and better: **the composition** — nobody ships a
single decision that intersects an actor chain, a data subject distinct from the
authenticated user, a data class, a purpose from a controlled vocabulary, and a
current revocation state. Every shipping system collapses to *identity × object*,
over a synced permission copy, with a documented staleness window.

That narrower claim is defensible, non-obvious, and still valuable. The broad claim
is not.

---

## 2. Per-player findings

### 2a. Memory products and frameworks

**mem0** — <https://github.com/mem0ai/mem0> (65.3k stars, Apache-2.0, actively
maintained; benchmark release Apr 2026). Access-control story: **caller-asserted
scoping, no server-side authorization.** The API takes `user_id`, `agent_id`,
`app_id`, `run_id` as *parameters supplied by the caller*
(<https://docs.mem0.ai/platform/quickstart>). The API key authenticates the
application, not the end user; the application decides which `user_id` to pass.
There is no role concept, no per-retrieval policy, no purpose, no delegation, and no
concept of a data subject distinct from the `user_id`. mem0's trust page is at
<https://trust.mem0.ai/> (SOC 2 Type I claimed; Type II in progress — treat as
vendor-stated, not independently verified).

The failure mode this design invites is documented in the wild: OpenMemory-OSS PRs
#89/#98 (<https://github.com/lucivskvn/OpenMemory-OSS/pull/98>) fixed handlers that
took `user_id` **from tool arguments** rather than the session tenant, allowing
cross-tenant read/write. That is precisely the "soft-fail filter" class the proposal's
BR-REQ-12 targets.

**Zep / Graphiti** — the **strongest shipped access-control story in the memory
category**. ABAC shipped 2026-07-09 (<https://blog.getzep.com/attribute-based-access-control/>,
docs at <https://help.getzep.com/attribute-based-access-control>). Precisely:

- The **policy subject is an API key**, not an end user. "Attach policies to API keys
  to limit which actions and context each agent can reach inside a project."
- Two evaluation layers per request: an **action layer** (endpoint allowlist —
  `thread.get`, `graph.search`, `thread.add_messages`) and an **attribute layer** that
  "filters search, list, and read results by the source metadata of each object."
- Attributes are user-defined ingestion-time metadata (up to 10 keys, scalars or
  arrays); objects carry "effective metadata" as the union across contributing sources.
- Zep's MCP server (<https://help.getzep.com/memory-mcp-server/authentication>) does
  *not* use MCP OAuth/RFC 9728; it federates to Google Workspace or custom OIDC and
  binds the project into the token: "The token's signed connection binding fixes the
  project, so a client cannot select another project in an MCP request."

**No purpose, no delegation, no data-subject distinction.** This is the closest thing
in the memory category to "a policy decision per retrieval" — and it is a static
key-scoped attribute filter, evaluated per call.

**Letta (formerly MemGPT)** — active but reorganised. `letta-ai/letta` (24.8k stars)
now describes itself as the historical archive for the deprecated V1 API server;
current development is in `letta-ai/letta-code` (<https://github.com/letta-ai/letta-code>,
3.3k stars, ~3,460 commits). Access-control story: **Identities are an association
mechanism, not a server-enforced boundary** — the documented pattern is that the
application maps users to agents and holds the authorization. `letta-code`'s README
documents a "Permissions" feature that sets auto-approve/auto-deny **action** modes —
tool-invocation gating, not record-disclosure authorization. A community request for
policy enforcement on memory read/write (issue #3320, opened 2026-04-20,
<https://github.com/letta-ai/letta/issues/3320>) was **closed and labelled spam** — so
it is evidence of demand, not of a roadmap. No purpose, no delegation, no per-retrieval
policy decision that I could verify.

**LangMem / LangGraph Store** — the most explicit admission in the category. From
LangChain's own docs (<https://docs.langchain.com/langsmith/store-auth>): **"By default,
store namespaces are shared across all callers."** Isolation requires the developer to
write an `@auth.on.store` handler that rewrites the namespace to include the
authenticated user's identity. The handler receives `ctx: Auth.types.AuthContext` (user
identity) and the namespace/key being accessed — **nothing else**: no purpose, no
subject-on-whose-behalf, no data class. The platform does not isolate; developer code
does. Also see <https://blog.langchain.com/custom-authentication-and-access-control-in-langgraph/>.

**Cognee** — the **most complete ACL model in the open memory category**. Shipped
Oct 2025, page updated 2026-09-03
(<https://www.cognee.ai/blog/cognee-news/product-announcement-user-management>, docs
<https://docs.cognee.ai/examples/multi-tenant-access-control>). Precisely:

- Principals: **user, role, tenant**.
- Protected object: the **dataset** (documents + metadata + graph/vector representations).
- Verbs: `read`, `write`, `delete`, `share`.
- **Enforced at retrieval**: "every read names both a `user` and explicit `dataset_ids`,
  and returns results only when an ACL allows it"; unauthorized reads raise
  `PermissionDeniedError` (403) rather than silently returning fewer rows — a
  **fail-closed** design, which is rarer than it should be.
- Multi-tenancy implemented at graph and trace level across pgvector/Neo4j/Kuzu/LanceDB.
- **No purpose, no data classification, no delegation, no data-subject distinction.**

**Supermemory** — container tags as an enforced boundary
(<https://supermemory.ai/docs/concepts/multi-tenancy>): "Container tags aren't just
organizational — they're enforced as an authorization boundary… API keys and org
members can be restricted to specific tags, so a request for a tag outside the caller's
allowed set is rejected with `403 Forbidden`." Again: **key-scoped, fail-closed, no
purpose, no delegation.**

**Category summary.** Sorted by how much of "the authorization half" is actually shipped:
Cognee (user/role/tenant × dataset ACL, fail-closed at read) ≈ Zep (key × action ×
object-metadata, filtered at read) > Supermemory (key/member × container, fail-closed)
> LangGraph Store (developer-written handler, shared by default) > Letta (application's
job) > mem0 (caller-asserted `user_id`, no server-side check). **None** of them models
an actor chain, a data subject distinct from the caller, or a purpose.

### 2b. MCP and the agent-plumbing layer

Current spec revision: **2026-07-28**
(<https://modelcontextprotocol.io/specification/versioning> — "The current protocol
version is 2026-07-28"). Prior: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25. A
`draft` tree exists with no new dated identifier as of this check.

**What the current authorization spec requires** (shipped normative text,
<https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization>):

- "A protected MCP server acts as an OAuth 2.1 resource server." (Authorization itself
  is OPTIONAL overall; stdio SHOULD NOT use it.)
- **RFC 9728 Protected Resource Metadata: MUST implement**; clients MUST use it for AS
  discovery.
- **RFC 8707 Resource Indicators: clients MUST implement**, sending `resource` in both
  authorization and token requests "regardless of whether authorization servers support
  it." (An open issue asks to relax this:
  <https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1614>, open,
  updated 2026-05-11.)
- **Audience binding is mandatory and passthrough is forbidden**: servers "MUST validate
  that access tokens were issued specifically for them," "MUST NOT accept or transit any
  other tokens," and "MUST NOT pass through the token it received from the MCP client."
- **Dynamic Client Registration is now deprecated**, retained only for backward
  compatibility; the preferred path is Client ID Metadata Documents (CIMD).
- New in this revision: **RFC 9207 issuer validation** (exact string comparison) and a
  scope step-up challenge via `WWW-Authenticate: Bearer error="insufficient_scope"`.

**Does MCP give a memory server enough context for the proposal's decision? No — it
gives two of the five terms.**

- **End-user identity: yes.** Via `sub` on an audience-bound token. Formalised by the
  **Enterprise-Managed Authorization** extension (status **STABLE**,
  <https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization>,
  spec in <https://github.com/modelcontextprotocol/ext-auth>, origin SEP-990): the client
  performs an **RFC 8693 token exchange** at the enterprise IdP to obtain an **ID-JAG**,
  then redeems it at the MCP AS. The ID-JAG carries `jti, iss, sub, email, aud, resource,
  client_id, exp, iat, scope`; `resource` MUST contain the MCP server's resource
  identifier and the issued token MUST be audience-restricted to it.
- **Actor chain / acting-for-another-subject: NO.** The ID-JAG carries **one** subject
  plus `client_id`. There is **no `act` claim, no actor_token, no delegation chain** in
  the stable extension. A user → orchestrator → sub-agent → MCP server chain collapses to
  one subject. Issue #214 ("Support On-Behalf-Of Token Exchange… for Agent-to-Agent
  Communications", <https://github.com/modelcontextprotocol/modelcontextprotocol/issues/214>)
  was closed as *completed* on 2026-01-16, but EMA does not in fact carry an actor chain,
  so the gap remains open in substance.
- **Purpose: NO.** Nothing in core or extensions carries a purpose-of-use claim. The
  closest is **SEP-2385 "Tool Auth Manifest"**
  (<https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2385>, **open**,
  created 2026-03-11, updated 2026-07-13): declarative per-function metadata for required
  roles, resource classification, a human-approval flag and audit requirements — and it
  **explicitly excludes enforcement from scope**.

**MCP is moving into this space — this is the single biggest competitive risk to the
proposal.** The MCP roadmap (<https://blog.modelcontextprotocol.io/posts/mcp-roadmap/>,
**2026-08-22**) names "Agent identity and enterprise-ready security" as a priority,
citing agents "acting on behalf of a user who isn't present, or **delegating narrower
authority to sub-agents**," and commits to "an opinionated path for agent identity and
delegation through Workload Identity Federation, the ID-JAG grant… and standard token
exchange," plus engagement with OAuth/WIMSE. **This is roadmap prose, not spec text** —
but it means the delegation term is claimed territory with a well-resourced occupant.
Related open work: SEP-1932 DPoP profile (open, updated 2026-09-09), SEP-1933 Workload
Identity Federation (open, updated 2026-09-07), SEP-1488 `securitySchemes` in tool
metadata (open, updated 2026-09-15).

**MCP memory servers.** The reference `memory` server
(<https://github.com/modelcontextprotocol/servers/tree/main/src/memory>) is a knowledge
graph in a **single JSONL file**, stdio transport only, with **zero authentication,
authorization, identity, namespace, tenant or policy check** — `read_graph` returns the
entire graph to any caller. It is actively maintained (eight commits on 2026-09-03:
concurrency serialization, entry validation, query-length constraint). This is the
strongest single data point for the proposal: the canonical MCP memory server is a flat
file with no access control at all.

**Consent / human-in-the-loop.** MCP **elicitation**
(<https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation>) has form
and url modes with accept/decline/cancel, and strong anti-phishing rules (servers MUST
bind elicitation to client and user identity and verify the opener is the intended user).
But it is explicitly **not** an authorization mechanism — "MCP servers MUST NOT rely on
URL mode elicitation to authorize users for themselves." **There is no shipped primitive
for "ask the user to approve this specific disclosure of these specific records to this
specific agent."** That maps directly onto the proposal's `human_approval_id` and is a
real gap.

### 2c. Retrieval + authorization prior art (the closest existing art)

This is where the proposal's claim is weakest, because this field is mature.

**Glean** — mirrored ACLs, indexed, evaluated at query time; **not** a live source check.
Glean "mirrors the access controls of every connected source system"; connectors ingest
"the permission model from that source (ACLs, group memberships, role assignments)"; at
query time Glean "evaluates the signed-in user's identity against those mirrored
permissions before returning any results"
(<https://docs.glean.com/security/security-principles>). Whether that is a pre-filter
inside the query or a post-filter is **not documented** — unverified. **Staleness is
documented and is worse than the marketing implies**: the SharePoint connector page
(<https://docs.glean.com/connectors/native/sharepoint/security/controls>) gives
permission-only update latency as "<2 hours (can vary)" with `Sites.FullControl.All`, but
**"Up to one month"** with `Sites.Selected`, because that scope "prevents Glean from
leveraging webhook subscriptions," leaving a 24-hour incremental crawl. The
least-privilege configuration produces the worst revocation window. On delegation: Glean
states agents "execute with the identity and permissions of the signed-in user who
triggered the run" — it **explicitly forecloses** the acting-for-another-subject case.

**Microsoft** — three stacks, three answers.
- **M365 Copilot** (<https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-architecture>,
  ms.date 2026-09-14) is principle-only: "Copilot only accesses data that an individual
  user is authorized to access." No mechanism, no staleness statement. The operational
  reality is the oversharing problem: **Restricted SharePoint Search is being retired**
  (new enablements blocked 2026-07-31, full retirement 2027-01-31 — MC1395311, mirrored
  at <https://mc.merill.net/message/MC1395311>), replaced by per-site **Restricted Content
  Discovery** (<https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery>)
  plus Purview DSPM for AI oversharing assessments. **Note what that admits: the ACL layer
  worked as specified and still leaked, so the remedy is a second, coarser discoverability
  gate on top of correct ACLs.** That is the strongest available evidence that
  identity × document is an insufficient decision — and it is a much better argument for
  the proposal than "nobody does authorization."
- **Graph connectors** (<https://learn.microsoft.com/en-us/graph/connecting-external-content-manage-items>):
  each `externalItem` carries an `acl` array of grant/deny entries over Entra users,
  Entra groups, external groups, or `Everyone`; "deny takes precedence over grant." A
  **synced push-model ACL** — refresh cadence is the connector author's problem and
  Microsoft does not document a staleness bound.
- **Azure AI Search** is the most honestly specified thing I found
  (<https://learn.microsoft.com/en-us/azure/search/search-document-level-access-overview>,
  updated 2026-08-31). Four approaches: security filters (**GA**, app supplies the
  identity string); POSIX-like ACL/RBAC scopes (**preview**); Purview sensitivity labels
  (**preview**); SharePoint M365 ACLs (**preview**). (b)–(d) run through
  `x-ms-query-source-authorization`: Search "extracts the user, group, and scope claims
  from the token," compares to indexed permission metadata, and returns only matching
  docs — a **pre-filter inside the query pipeline**. Microsoft documents its own leak
  channels: a "timing lag" before permission changes are recognised; SharePoint
  inherited-scope changes "require an explicit refresh"; and **chunk-level mismatch** —
  if a skillset chunks documents, ACLs must be projected onto each chunk row, and
  "Without this projection, chunk-level references aren't filtered." There is also an
  "elevated read" administrative bypass (preview).

**Vector DBs / search engines.**
- **Pinecone**: **no per-identity ACL.** Namespace-per-tenant + metadata filters
  (<https://docs.pinecone.io/guides/index-data/implement-multitenancy>); the application
  must target the right namespace. AuthZed ships a SpiceDB↔Pinecone integration
  (<https://authzed.com/docs/spicedb/integrations/pinecone>) precisely because the DB has
  no such feature.
- **Elastic**: the only vector/search store with genuine **per-identity document-level
  security**. DLS is a role-attached query; "documents that don't match the role query are
  never returned"
  (<https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level>).
  **Elastic documents its own leak channels**: "Document level security doesn't affect
  global index statistics that relevancy scoring uses," and users "can learn about field
  names and terms that only exist in inaccessible documents, and count how many
  inaccessible documents contain a given term." A vendor conceding that ACL-filtered
  retrieval still leaks through statistics.
- **Vespa**: transport-layer mTLS/token auth and read-vs-write client permissions
  (<https://docs.vespa.ai/en/security/guide>); no built-in per-identity document ACL.
- **Weaviate**: RBAC at collection/tenant/operation level
  (<https://docs.weaviate.io/weaviate/configuration/rbac>). **Milvus**: RBAC over
  databases/collections (<https://milvus.io/docs/multi_tenancy.md>). **Qdrant**: closest
  of the three — a payload filter can be embedded in a JWT and enforced server-side
  (<https://qdrant.tech/articles/data-privacy/>) — but the app mints the claims, so it is
  still app-asserted.

**Frameworks.** LlamaIndex ships permissions-aware SharePoint retrieval in LlamaCloud
(<https://www.llamaindex.ai/blog/permissions-aware-content-retrieval-with-sharepoint-and-llamacloud>)
— connector-level ACL sync — and otherwise documents runtime metadata filters. Haystack
documents metadata filtering only
(<https://docs.haystack.deepset.ai/docs/metadata-filtering>); no ACL/multi-user
permission documentation found. LangChain has no first-party ACL primitive; the serious
patterns are external: AuthZed's `langchain-spicedb`
(<https://github.com/authzed/langchain-spicedb>), which offers **both** pre-filter
(`LookupResources` → filtered vector search) **and** post-filter modes, and Auth0/Okta FGA.

**Auth0 / Okta FGA `FGARetriever` — the closest shipped product to the proposal's
retrieval half.** <https://auth0.com/ai/docs/authorization-for-rag> and the SDK examples
(<https://github.com/auth0/auth0-ai-js/blob/main/examples/authorization-for-rag/README.md>,
Python equivalent in `auth0-ai-python`). Characterised precisely: it is a **post-filter**
(base retriever runs, then documents are batch-checked against the FGA store and filtered),
**document-level** granularity (`type doc` with `define viewer: [user, user:*]`), checked
against the **end user's** identity (`user:${user.email}`), and it works against any
OpenFGA-compatible store including self-hosted. **No purpose, no data classification, no
delegation chain.** Maturity designation (GA vs preview) is not stated — unverified.

**OpenFGA's own agent guidance** (<https://openfga.dev/docs/modeling/agents>, page
"Last updated Sep 14, 2026") is one day old and directly adjacent. It proposes agents as
"first-class principals in your authorization model so they participate in the same
permission hierarchy as users," plus **Task-Based Authorization**: "narrowly scoped grants
for each task, with optional expiration, turn limits, and agent binding." Notably it does
**not** model an actor chain or intersect agent permissions with user permissions — agents
are independent principals, not representatives. So even the canonical Zanzibar-style
engine the proposal names has not modelled delegation.

**Leak-channel literature — real, named, recent, and it pre-empts the proposal's thesis.**
- **"Authorization-First Retrieval: Enforcing Least Privilege in Multi-Agent RAG Systems,"**
  Rohith Namboothiri, **TrustNLP 2026** (<https://aclanthology.org/2026.trustnlp-main.15/>).
  This is the **closest published statement of the proposal's central idea**. Abstract,
  verbatim: "Retrieval-augmented generation systems serving multiple users under
  role-based access control face a trustworthiness gap: semantic retrieval operates on
  embedding similarity rather than authorization predicates and can introduce unauthorized
  content into a model's context window before any filter intervenes." It proposes
  authorization as "an architectural invariant requiring that authorization constrain the
  retrieval candidate set before any learned component consumes retrieved content" — a
  **pre-filter**, tested over 12 enterprise roles × 9 domains. It measures the alternative:
  retrieve-then-filter "expose[s] unauthorized context in **86.1% of queries**," with
  answer leakage of 41.3% (Gemini 2.0 Flash) and 29.5% (GPT-4o-mini). **It stops at
  role × document** — no purpose, no delegation.
- **"Enterprise AI Must Enforce Participant-Aware Access Control,"** Bhatt, Rajore,
  Aggarwal, Ananthanarayanan, Chandra, Chandran, Gupta, Kiciman, Setty, Sharma et al.
  (Microsoft Research), arXiv 2509.14608, 2025-09-18 (<https://arxiv.org/abs/2509.14608>).
  The nearest published treatment of the **delegation/third-party-subject** term: content
  must be "explicitly authorized for **all users involved in the interaction**," not just
  the querier, with deterministic fine-grained enforcement during fine-tuning and RAG
  inference. It does not name purpose or delegation chains.
- **ConfusedPilot**, arXiv 2408.04870 — names the **retrieval cache** as a leak channel
  plus prompt-injection-driven confused-deputy behaviour.
- **FragFuse: Bypassing Access Control of LLM Agents via Memory-Based Query Fragmentation
  and Fusion**, Rao, Zhu, Lu, Chen, Niu, Guan, Li, Xiang, arXiv 2606.15609, 2026-06-14
  (<https://arxiv.org/abs/2606.15609>). Directly on point for agent **memory** as a leak
  channel: prohibited content is "fragmented across interactions, stored in long-term
  memory in benign-appearing form, and later reconstructed through memory retrieval
  without appearing explicitly in the final user query." Evaluated across four agent
  settings and **three state-of-the-art agent access-control mechanisms**; **86.3% average
  bypass rate**, 41.1% end-to-end harmful task success. Prompt-injection and perplexity
  detectors do not stop it. **This is the strongest single citation for "per-request ACL
  on retrieval is not sufficient once memory persists" — i.e. for the proposal's
  BR-REQ-11/BR-REQ-12.**
- **"Agent Memory Is a Surface for Endogenous Authorization Laundering,"** Cerruti (ETH
  Zurich), Okamoto and Erol (Georgia Tech), arXiv 2609.01836, **2026-09-01**
  (<https://arxiv.org/abs/2609.01836>). Thesis: "When memory misrepresents this evolving
  authorization state, the agent's own records can grant authority that the underlying
  history never permitted, resulting in misaligned behavior without any external attacks."
  Memory writers generate false authority for up to **50.2%** of unauthorized requests
  under incremental updating; executors act on it **98.6%** of the time. Proposes EAL-Bench
  plus two safeguards: **source-authority gating** ("keep authorization records only when
  all cited sources are valid") and **bounded event sourcing** ("move authorization
  maintenance from models to deterministic code"). Framing quote: "persistent memory is
  not merely a performance component, but part of an LLM agent's effective authorization
  policy." **This paper is a near-exact independent restatement of the proposal's
  BR-REQ-02 (preserve authority) and BR-REQ-11 (separate observation from approval),
  published two weeks before the proposal's date.**
- **"Always-On Agents: A Survey of Persistent Memory, State, and Governance in LLM
  Agents,"** Ding, Nannapaneni, Liu, Zhang, arXiv 2606.30306, 2026-06-29
  (<https://arxiv.org/abs/2606.30306>). 435-work coded corpus. Verbatim: "the literature
  concentrates more heavily on accumulating and retrieving state than on governing,
  recovering, or relinquishing it." Proposes AOEP-v0, "a pilot evaluation contract that
  makes these governance requirements concrete by scoring state mutation and recovery
  obligations rather than answer quality alone." **This is the best available third-party
  support for the proposal's directional claim — and note it is a survey claim about the
  literature's centre of mass, not a claim that nobody does authorization.**
- Embedding-inversion and nearest-neighbour side channels are codified as **OWASP
  LLM08:2025 "Vector and Embedding Weaknesses."** Agent memory manipulation is **ASI06**
  in the OWASP Top 10 for Agentic Applications (secondary source:
  <https://www.kiteworks.com/cybersecurity-risk-management/owasp-agent-memory-poisoning-guard/>;
  I could not fetch the OWASP primary page — treat the ASI06 designation as unverified).

**Purpose, specifically.** **Immuta** has a genuine, documented **purpose-based access
control** model — "makes access decisions based on the reason a user or tool intends to
use the data"
(<https://documentation.immuta.com/latest/governance/author-policies-for-data-access-control/projects-and-purpose-based-access-control/projects-and-purpose-controls>)
— but the documentation covers **structured data sources**, and the claim of purpose-bound
filtering of RAG chunks could **not** be verified (product URLs 404'd). **Knostic**
(<https://www.knostic.ai/>) markets per-user, per-**topic** "need-to-know" policy over
Copilot/Glean — closer to purpose than any search vendor — but it is a detection/overlay
layer, and as of 2026-09-15 its homepage foregrounds AI coding-safety products (Kirin,
Shadow AI Spotlight, OpenAnt, OpenClaw) rather than the knowledge-governance product, so
the current shape of that offering is **unverified**.

### 2d. Runtime-control standards (adjacent, and it matters)

**Agent Control Standard (ACS)** — launched 2026-05-27 at the AI Agent Security Summit
(<https://www.businesswire.com/news/home/20260527326259/en/>, <https://agentcontrolstandard.org/>,
<https://github.com/Agent-Control-Standard/ACS>). Spec **v0.1.0** (tag v0.1.1), 122 stars,
396 commits on `integration`, 63 open issues, v0.2.0 targeted March 2027. Originated
inside Zenity; positioned as vendor-neutral, hosted alongside the OWASP Agent Observability
Standard. It defines **sixteen native lifecycle hooks** including session start/end,
before/after turn, **knowledge retrieval**, and **memory reads and writes**, with a policy
verdict of **allow / deny / modify** (some sources also list `ask` — route to a human
approver — and `defer`). Hook payloads carry `agent_id`, `session_id`, `request_id`,
`timestamp`, tool name and arguments.

**This is the most important adjacent thing for the proposal to know about.** ACS is
building the **policy enforcement point** the proposal implies — a hook on memory read and
memory write with an allow/deny/ask verdict. But its payload carries **no end-user
identity, no subject-on-whose-behalf, no purpose, and no data classification**. ACS is the
PEP shape; the proposal is the decision content. They are complementary, not competing —
and the proposal should say so explicitly rather than be caught not knowing.

**Zylos, "Persistent Agent Memory Needs Write Authorization, Not Just Safety Screening,"
2026-09-11** (<https://zylos.ai/research/2026-09-11-persistent-agent-memory-write-authorization/>).
Thesis: "models may detect semantic risk, but deterministic policy must authorize
persistence and later use"; "the model can propose computation, but a non-model mechanism
owns the consequential transition." Critically for the proposal's defensibility, it states:
**"This review found no cross-vendor standard that combines memory-write authorization,
lineage revocation, and recovery into one test suite,"** and describes its own reference
architecture as "an engineering synthesis rather than a description of a deployed standard."
That is a third party, four days before the proposal's date, confirming the *composition*
gap while independently arriving at the same thesis — which is both supporting evidence
and evidence that the idea is not unique.

### 2e. "On behalf of" / delegated agent identity

The headline: **delegation is no longer unclaimed territory — but the *data subject* term
still is, and purpose still is.**

**IETF.** The only standardized actor chain remains **RFC 8693** nested `act` claims
(outermost = current actor, inner = prior hops). No purpose term. Around it, as of
2026-09-15:

- **`draft-ietf-wimse-aims-00`, "AI Identity Management System", published 2026-09-15**
  (<https://datatracker.ietf.org/doc/draft-ietf-wimse-aims/>) — authors from Defakto, AWS,
  Zscaler, Ping, OpenAI and Okta. WG-adopted, replacing the expired individual
  `draft-klrc-aiagent-auth-03`. It is a **composition** document. Decisive for the
  proposal: **§10.1 "Agent Mission" states that "The process through which the mission is
  translated into authorization requriements is out of scope of this specification."**
  *The IETF's flagship agent-identity draft, published the same day as this proposal,
  explicitly declines the purpose term.* That is the single best citation available for
  where the gap actually is.
- **Transaction Tokens** — `draft-ietf-oauth-transaction-tokens-11` (2026-07-30), state
  "WG Consensus: Waiting for Write-Up", IESG milestone Dec 2026
  (<https://datatracker.ietf.org/doc/draft-ietf-oauth-transaction-tokens/>). **Not an RFC.**
  Claims: `iat, aud, exp, txn, sub, scope, req_wl`, plus recommended `tctx`/`rctx`.
  **No `purpose` claim** — §9.2.1 says `scope` "captures, as narrowly as possible, the
  purpose of this particular transaction." And **no actor chain**: `req_wl` is the
  immediate requesting workload only. So transaction tokens give freshness + request
  context, not delegation lineage.
- **ID-JAG / Cross App Access** — `draft-ietf-oauth-identity-assertion-authz-grant-04`
  (2026-05-21), WG-adopted, not an RFC. It **"does not define normative processing
  requirements for `actor_token`"** — it carries user → app across trust domains and
  explicitly punts the agent-as-actor leg.
  `draft-ietf-oauth-identity-chaining-17` is **IESG-approved, in the RFC Editor queue**
  (2026-08-21), no RFC number yet.
  `draft-ietf-oauth-attestation-based-client-auth-11` (2026-09-03) is in WG Last Call and
  attests the **client instance** only — no agent/task/purpose semantics.
- Individual drafts filling the chain gap, none adopted: `draft-mcguinness-oauth-actor-profile-00`
  (2026-04-30, entity typing on `act`); `draft-liu-ai-agent-authorization-integration-00`
  (2026-07-06, a `delegation_chain` claim with per-hop signatures); `draft-sharif-agent-identity-framework-01`
  (2026-08-26, signed ≤5-hop chains); `draft-araut-oauth-transaction-tokens-for-agents-02`
  (2026-05-22, Amazon — an `agentic_ctx` claim with `current_actor`/`originator`/`hop_count`).
  The sharpest sentence in the whole corpus, and one the proposal should adopt verbatim in
  spirit, is from `draft-daniel-ai-agent-internet-architecture-03` (2026-08-28): **"Any
  standardized intent or purpose signal MUST be treated as a declaration rather than proof
  of authorization."**
- **`agentproto`** is a **Proposed** WG (BoF at IETF 126 Vienna, 2026-07-23), not
  chartered; adoption milestones target Feb–Mar 2027.

**OpenID.** **AuthZEN Authorization API 1.0 reached Final on 2026-01-11**
(<https://openid.net/specs/authorization-api-1_0-final.html>) — a standardized
Subject/Action/Resource/Context PDP call. **This matters a great deal to the proposal**:
the shape of `RelationshipAuthorizationPort.check(...)` and of the security invariant is
now a *standardized request envelope*, and the proposal is best understood as supplying
the **typed content of AuthZEN's `context`**, which the spec deliberately leaves open:
"the actual semantics and format of the `context` object are an implementation concern and
outside the scope." New AuthZEN WG drafts approved 2026-06-15 include AARP (access request
+ approval) and **COAZ / COAZ-MCP binding**
(<https://openid.net/openid-foundation-advances-authorization-for-the-agent-era-with-new-authzen-working-group-drafts/>)
— i.e. the OpenID Foundation is already binding a PDP call to MCP.

**Shared Signals.** SSF 1.0 / CAEP 1.0 / RISC 1.0 became **Final Specifications 2025-09-02**
(<https://openid.net/three-shared-signals-final-specifications-approved/>); the CAEP
Interoperability Profile is in final-spec public review (2026-07-27 → 2026-09-25, vote
2026-09-26). Nothing agent-specific — it is generic session/credential revocation that
happens to apply to agents. That is exactly the mechanism the proposal's BR-REQ-09
(observable revocation) should name rather than invent.

The OpenID **AI Identity Management group is a Community Group, not a WG** (chartered April
2025; whitepaper Oct 2025; NIST response 2026-03-11) and its charter excludes protocol
development. **NIST NCCoE** published a concept paper, *"Accelerating the Adoption of
Software and AI Agent Identity and Authorization"*, **2026-02-05** (comments closed
2026-04-02).

**Purpose as a standard authorization input: essentially absent.** RFC 9396 (RAR) common
fields are `type, locations, actions, datatypes, identifier, privileges` — you get a **data
class** (`datatypes`) but **no purpose**; RFC 9396's own worked example invents a
non-standard `reason_for_request`, and there is **no IANA registry of
`authorization_details` types**. GNAP (RFC 9635) models delegation but not purpose. W3C
DPV v2.3 (2026-02-25) has a rich purpose taxonomy but is a **Community Group Report, not
Standards Track**, and binds to no token. *The single exception is a regulated-domain
interoperability profile (domain deliberately out of scope here, per the proposal's own
"Regulated-domain profiles" section): it is the only place where purpose-of-use ships as a
first-class, required token-grant field alongside a subject identifier, a subject role, an
organization identifier and a consent reference — and even there the profile calls it an
**attestation**, contractually backstopped rather than cryptographically proven, and it has
**no actor-chain leg at all**. Cited only as evidence that the purpose term has precedent
somewhere; it is not a model to import.*

**Vendors — what actually shipped.**

| Vendor | Shipped | Delegation chain? | Purpose? |
|---|---|---|---|
| **Microsoft Entra Agent ID** | **GA**; `xms_act_fct` (actor facet), `xms_sub_fct` (subject facet), `idtyp`, `xms_idrel`; docs cover "complex delegation chains involving multiple agent entities" and instruct resource servers to parse them (<https://learn.microsoft.com/en-us/entra/agent-id/agent-tokens>, updated 2026-08-14) | **Yes — the only shipped one.** Proprietary `xms_` claims, not RFC 8693 `act` | **No** |
| **Okta / Auth0** | **Agent SSO GA 2026-08-24**, included in core Okta SSO at no extra cost, implementing Cross App Access (= ID-JAG); *Okta for AI Agents* is a separate subscription available since **May 2026**; further agentic launches 2026-09-02 and 2026-09-09 | Partial (user → app); no enforced user→agent chain in the decision | No |
| **Anthropic** | Enterprise-managed MCP auth via signed identity-assertion exchange, GA 2026-08-24 (<https://claude.com/blog/enterprise-managed-auth>), Okta first | No actor chain | No |
| **AWS Bedrock AgentCore Identity** | Workload identities, inbound JWT authorizer, outbound credential providers, consent portal. **RFC 8693 on-behalf-of actor chains could not be confirmed in AWS's own docs — unverified** (secondary sources claim it) | Unverified | No |
| **Descope** | Agentic Identity Hub 2.0 (2026-01-26); Agentic Identity Control Plane (2025-08-04) | Not a delegation protocol | No |
| **OpenAI Apps SDK / AgentKit** | OAuth 2.1 + PKCE, user token only | No | No |
| **Ping, CyberArk/Venafi, SailPoint, Saviynt, Google** | **UNVERIFIED — not checked against primary docs.** Google has no `cloud.google.com/iam/docs/agent-identity` page (404) | Unverified | Unverified |
| **Saviynt Zuma, Token Security, Varonis Agent IBAC** | Market "intent-aware" / "intent-based" access control | — | **Claimed, unspecified, and unverified** — none publishes a claim format or protocol |

Gartner's 2026 Digital Identity Hype Cycle is reported to place intent-based access control
at **<1% market penetration** (secondary; **unverified** against the primary Gartner document).

**The volume signal.** A datatracker sweep for "agent"
(<https://datatracker.ietf.org/doc/search?name=agent&sort=-date&activedrafts=on&rfcs=on>)
returns roughly **200 active individual drafts**, most filed July–September 2026, and
**essentially none adopted** — `draft-asor-wimse-agent-delegation-chain-01`,
`draft-hamr-oauth-agent-delegation-01`, `draft-mishra-oauth-agent-grants-02`,
`draft-reece-wimse-cross-org-delegation-02`, `draft-saha-aadp-02` (per-action
authorization), `draft-ruvalcaba-nhe-authz-00` ("intent-scoped credentials"),
`draft-williams-intent-token-02`, `draft-chapman-a2a-mls-03` (a signed `purpose` field with
receiver-side allowlists). **Read this correctly:** it is not evidence the space is empty,
and it is not evidence it is settled. It is evidence that the *design vocabulary* is
crowded and the *interop surface* is bare — which is precisely the position a contract
document can occupy, provided it does not claim to be a standard.

**Cross-organization delegation is openly unsolved**, which matters directly for the
proposal's federation phase. George Fletcher at Identiverse 2026, reported by Cerbos
(2026-06-24, <https://www.cerbos.dev/blog/identiverse-2026>): *"Any delegation scheme that
ignores [the crossing-the-trustee problem] will fall over as soon as it goes cross-org."*
Also relevant: `draft-ietf-wimse-arch-08` (2026-07-06) added §3.4.11 "AI and ML-Based
Intermediaries," treating agents as *"a special case of delegated workloads"* — while the
WIMSE charter (charter-ietf-wimse-01) still does not mention AI agents at all.

**A2A (Agent2Agent).** Donated to the Linux Foundation June 2025, then moved to the
**Agentic AI Foundation** (announced 2026-08-17 / posted 2026-08-27). Spec v1.0.1
(2026-05-28). **A2A carries no delegated user identity.** Verbatim from its enterprise
page (<https://a2a-protocol.org/latest/topics/enterprise-ready/>): "A2A protocol payloads,
such as JSON-RPC messages, don't carry user or client identity information directly."
Auth is transport-level `securitySchemes` on the Agent Card. Open, **unadopted** proposals:
issue **#2028 `actorChain`** (2026-07-03) — verbatim: **"A2A v1.0 carries no principal in
the payload… every implementation that needs delegation context invents a private schema"**;
#1937 delegated-authority context binding; #2093 signed purpose envelopes. Signed Agent
Cards give **agent** identity, not user identity.

**Scorecard for "actor X, acting for subject S, may obtain class C, for purpose P, now":**

| Term | Coverage as of 2026-09-15 |
|---|---|
| Actor chain (X) | **Covered.** RFC 8693 nested `act`; shipping in Entra via proprietary claims. ID-JAG punts it; A2A and MCP do not carry it. |
| Delegating principal | **Covered.** `sub` survives the chain — the well-trodden part. |
| Data class (C) | **Mostly covered.** RAR `datatypes`, AuthZEN `resource`, Zep source metadata, Cognee datasets. |
| Freshness (now) | **Best covered.** SSF/CAEP Final + AuthZEN per-request PDP + short-lived transaction tokens. |
| **Purpose (P)** | **Not covered.** Absent from RAR, GNAP, transaction tokens, AuthZEN context, A2A, MCP and every vendor token. Present only in one out-of-scope regulated-domain profile, and there as an attestation. AIMS declares mission→authz translation out of scope. |
| **Subject S (data subject ≠ delegating user)** | **The genuinely unmodelled term.** Nothing in the OAuth/agent stack distinguishes "the person driving the agent" from "the person the record is about." Nobody is standardizing it. |

---

## 3. Closest existing art, ranked by closeness

1. **"Authorization-First Retrieval" (TrustNLP 2026)** — <https://aclanthology.org/2026.trustnlp-main.15/>.
   *Closest to the thesis.* Same premise ("semantic retrieval operates on embedding
   similarity rather than authorization predicates"), same fix (authorization constrains
   the candidate set before any learned component), with measurements. **Distance:
   role × document only; no memory, no delegation, no purpose, no promotion/provenance,
   no federation. Research, not a shipped system.**
2. **Zep ABAC** (2026-07-09) — *closest shipped memory product.* A two-layer per-request
   decision (action allowlist + object-metadata filter) over a real agent-memory graph.
   **Distance: the policy subject is an API key, not an end user or an actor chain; no
   purpose; no data subject; policies are statically attached, not composed per request.**
3. **Cognee dataset ACL** (shipped Oct 2025, updated 2026-09-03) — *closest open-source
   memory ACL.* user/role/tenant × dataset × {read, write, delete, share}, **fail-closed at
   read with a 403**. **Distance: dataset granularity; no purpose, no class, no delegation,
   no provenance/promotion semantics.**
4. **Auth0 / Okta FGA `FGARetriever`** — *closest shipped relationship-authorization-over-retrieval.*
   A Zanzibar check per candidate document against the end user, over any OpenFGA store.
   **Distance: post-filter, document-level, identity-only; no purpose, no class, no
   delegation. And the proposal explicitly builds on this same engine family, so this is
   convergent rather than competitive.**
5. **Azure AI Search document-level access** (GA + three previews, updated 2026-08-31) —
   *closest enterprise pre-filter.* Claims extracted from the caller's token inside the
   query pipeline; and the most honest vendor documentation of staleness and chunk-level
   mismatch anywhere. **Distance: identity × document; no purpose, no delegation; and
   three of the four modes are preview.**
6. **Glean permission mirroring** — *closest "the whole corpus is permissioned" product.*
   **Distance: mirrored ACL copy with a documented staleness window up to one month on the
   least-privilege connector configuration; agents explicitly run as the signed-in user, so
   delegation is foreclosed by design.**
7. **Agent Control Standard v0.1.0** (2026-05-27) — *closest enforcement-point standard.*
   Hooks on knowledge retrieval and on memory read/write with allow/deny/modify verdicts.
   **Distance: the payload carries no user identity, no subject, no purpose, no class — it
   is the socket, not the plug.**
8. **Microsoft Entra Agent ID** (GA) — *closest shipped delegation chain.* Actor and subject
   facets parseable by a resource server. **Distance: proprietary claims; no purpose; no
   data-subject term; and it is identity plumbing, not a knowledge-record decision.**
9. **`draft-ietf-wimse-aims-00`** (2026-09-15) — *closest standards-track framing*, and it
   **explicitly declares the purpose term out of scope**, which is the proposal's opening.
10. **Elastic DLS** — *the most honest incumbent*: real per-identity document security, with
    a vendor-documented statistical side channel. Useful as a citation, not a competitor.
11. **Immuta purpose-based access control** — *the only shipped purpose-based engine*, but
    documented over **structured** sources; purpose-bound filtering of retrieval chunks is
    **unverified**. **Knostic** markets per-topic need-to-know over Copilot/Glean; as of
    2026-09-15 its homepage foregrounds AI coding-safety products, so the current shape of
    that offering is **unverified**.

**Does anyone already ship the proposal?** No. No product or spec composes actor chain ×
data subject × class × purpose × freshness into one enforceable decision over knowledge
records, and two independent third parties said so in writing within the last month:
Futurum (2026-06-25) — "authorization exists at the goal level, not the action level, and
no runtime enforcement layer can reconstruct what was never recorded"; Zylos (2026-09-11) —
"This review found no cross-vendor standard that combines memory-write authorization,
lineage revocation, and recovery into one test suite."

**But the *thesis* is not unique.** Three independent groups published the proposal's core
argument in 2026 — TrustNLP (authorization before retrieval), arXiv 2609.01836 (memory as
effective authorization policy), Zylos (deterministic write authorization). The proposal is
**early to the composition, late to the observation.** Its framing must reflect that or it
will read as uninformed.

---

## 4. Specific change requests to the proposal

### CR-1 — `governed-brain-concepts.md`, "Why this belongs in the identity workspace" (¶1)

**Overstates.** "Retrieval systems answer 'what text is similar to this query'" is false as
a description of the current market. Permission-aware retrieval is a mature product
category: Glean mirrors source ACLs and evaluates them per query; Azure AI Search extracts
user/group/scope claims from the caller's token and filters **inside** the query pipeline;
Elastic DLS never returns non-matching documents; Auth0/Okta FGA ships an `FGARetriever`;
Zep, Cognee and Supermemory all make a policy decision on memory reads.

**Say instead** (structure, not wording): retrieval-with-permissions is solved for
*identity × document*; what no product or specification composes is the **rest of the
decision** — who the actor is acting **for**, whether the **data subject** differs from the
caller, what **class** the record is, under what declared **purpose**, and whether that is
still true **now**.

**Add a short "What already exists" subsection** with 5–8 cited rows (Glean, Azure AI
Search, Elastic DLS, Auth0 FGA, Zep ABAC, Cognee, MCP EMA, Entra Agent ID). A design
document that names its closest art is trusted; one that implies greenfield is not. This is
the single highest-value edit in the set.

### CR-2 — `governed-brain-concepts.md`, Requirements table, **BR-REQ-04**

**Undersold.** "Separate actor, effective subject, and data subject" is buried as row 4 of
16, yet it is **the one term the entire standards stack leaves unmodelled**: ID-JAG "does
not define normative processing requirements for `actor_token`"; A2A issue #2028 states
"A2A v1.0 carries no principal in the payload… every implementation that needs delegation
context invents a private schema"; Entra ships facets but no data-subject term; AIMS puts
mission translation out of scope.

**Change:** promote BR-REQ-04 to the top of the table (or call it out in the section
preamble) and annotate it as the load-bearing one. Cite the three sources above. This is
the proposal's actual contribution and it is currently indistinguishable from fifteen
neighbours.

### CR-3 — `governed-brain-concepts.md`, Requirements table, **BR-REQ-06** ("Compose authorization")

**Reads as invented.** The Subject/Action/Resource/**Context** decision request is now a
**Final OpenID specification** — AuthZEN Authorization API 1.0, 2026-01-11 — and its
`context` object is deliberately left open ("the actual semantics and format… outside the
scope"). The OpenID Foundation approved a **COAZ-MCP binding draft** on 2026-06-15.

**Change:** reframe BR-REQ-06 as *supplying the typed content of an AuthZEN `context`* and
cite the spec. That converts "we designed a conjunction" into "we profile a Final standard
at the one place it was deliberately left blank" — a much stronger and more checkable
claim, and it gives the port an external conformance target.

### CR-4 — `governed-brain-authorization.md`, "The security invariant"

Two changes.

(a) **Add prior art inline.** The invariant currently stands unattributed. Cite TrustNLP
2026 (authorization as an architectural invariant over the candidate set) and Microsoft
Research arXiv 2509.14608 (content must be authorized for *all* participants in the
interaction, not only the querier — the nearest published statement of the data-subject
term). Standing on published work is stronger than appearing to originate it.

(b) **Add an ordering term, not just a conjunction term.** The invariant is a set of
predicates with no stated evaluation order, but the measured difference is *ordering*:
retrieve-then-filter "expose[s] unauthorized context in 86.1% of queries" (TrustNLP 2026).
Add an explicit requirement that authorization **constrains the candidate set before any
learned component or ranker consumes it** — i.e. pre-filter, not post-filter. Note for
honesty that the closest shipped relationship-authorization product, Auth0's
`FGARetriever`, is a **post-filter**; Azure AI Search is a pre-filter. This is a real,
defensible, testable design position and it is currently only implied (Phase 5's
"authorized prefilter *before* every derived index").

### CR-5 — `governed-brain-authorization.md`, "`brain_access` authorization detail"

**Strongest artifact in the document, weakest sourcing.** The rules say `purpose` "comes
from a controlled vocabulary and is policy-checked" without saying that **no such registry
exists**: RAR common fields have `datatypes` but no purpose; there is no IANA registry of
`authorization_details` types; transaction tokens have no purpose claim; AuthZEN leaves
context unstructured; `draft-ietf-wimse-aims-00` (2026-09-15) declares mission→authorization
translation out of scope.

**Change:** state that absence explicitly as the reason `brain_access` exists, and adopt
the discipline from `draft-daniel-ai-agent-internet-architecture-03` (2026-08-28) verbatim
in substance: **"Any standardized intent or purpose signal MUST be treated as a declaration
rather than proof of authorization."** The document already half-says this ("a
self-attested string does not grant access") — make it a named rule with its source.

### CR-6 — `governed-brain-authorization.md`, "Capability reuse and current gaps" table

**Missing three live external layers**, which makes the table read as if the workspace must
build everything:

- **MCP 2026-07-28 + the Enterprise-Managed Authorization extension (STABLE)** already
  supplies verified issuer, audience binding, mandatory PRM/RFC 9728, RFC 8707 resource
  indicators, RFC 9207 issuer validation, and a delegated single-subject token (ID-JAG) via
  RFC 8693 exchange. That is the first four terms of the invariant, off the shelf. Add a
  row: reuse it, do not reimplement it.
- **Agent Control Standard v0.1.0** (2026-05-27) defines hooks on **knowledge retrieval and
  memory read/write** with allow/deny/modify (and ask/defer) verdicts. That is the PEP the
  brain's decision plugs into. Add a row.
- **SSF / CAEP 1.0 Final** (2025-09-02) is the shipped revocation-signal mechanism BR-REQ-09
  needs. Add a row rather than describing revocation generically.

### CR-7 — `governed-brain-authorization.md`, "Threats and required controls" table

**Add three rows, each with a citation and a measured number** — this table is currently
plausible but unsourced, and three 2026 results map onto it exactly:

| Threat | Source | Number |
|---|---|---|
| Memory as a **temporal ACL-bypass channel** — prohibited content fragmented across turns, stored benignly, reassembled at retrieval | FragFuse, arXiv 2606.15609 (2026-06-14) | **86.3%** average bypass of three state-of-the-art agent access-control mechanisms |
| **Authorization laundering** — the agent's own memory records grant authority the underlying history never permitted | arXiv 2609.01836 (2026-09-01) | false authority written for **50.2%** of unauthorized requests; executors act on it **98.6%** of the time |
| **Statistical / side-channel leakage through ACL-filtered indexes** | Elastic's own DLS documentation; OWASP LLM08:2025 | Elastic, verbatim: DLS "doesn't affect global index statistics that relevancy scoring uses" |

Also add **chunk-level ACL mismatch** (Azure AI Search, verbatim: "Without this projection,
chunk-level references aren't filtered") and **ACL staleness** (Glean: "Up to one month"
with `Sites.Selected`) as named threats with negative tests. These are free credibility —
they are incumbents documenting their own leak channels, which is far more persuasive than
asserting the channels exist.

### CR-8 — `governed-brain-concepts.md`, **BR-REQ-11** and the "Learning and promotion" section

**Under-cited, and independently validated two weeks ago.** arXiv 2609.01836 (2026-09-01)
is a near-exact restatement: "persistent memory is not merely a performance component, but
part of an LLM agent's effective authorization policy," with two proposed safeguards that
match BR-REQ-02 and BR-REQ-11 almost term for term — **source-authority gating** ("keep
authorization records only when all cited sources are valid") and **bounded event sourcing**
("move authorization maintenance from models to deterministic code"). Zylos (2026-09-11)
adds: "the model can propose computation, but a non-model mechanism owns the consequential
transition," and states it "found no cross-vendor standard that combines memory-write
authorization, lineage revocation, and recovery into one test suite."

**Change:** cite both. Independent convergence is the strongest evidence a requirement is
real — and citing it pre-empts the reviewer who arrives with the papers.

### CR-9 — `governed-brain-concepts.md`, "Relationship to the rest of this workspace" table

Add a row so the document does not read as claiming greenfield on the retrieval half:

| This document needs | Supplied by | Status |
|---|---|---|
| Policy decision on each retrieval | External memory/search products (Zep ABAC, Cognee ACLs, Auth0 FGA `FGARetriever`, Azure AI Search, Elastic DLS) | **Shipping externally for identity × object; none composes subject, purpose, or actor chain** |

### CR-10 — `governed-brain-implementation-plan.md`, Phases 4 and 5

Phase 4's "Done when" — *"a relationship decision is demonstrably **necessary but not
sufficient** for disclosure"* — is the best sentence in the three documents and is exactly
the differentiator from every product in §2. Keep it verbatim and elevate it into the
concepts document.

Phase 5's authorized-prefilter requirement should carry a **named, measurable** acceptance
property with the TrustNLP 86.1% figure as the baseline it beats, and Phase 5 should add an
explicit negative test for the **chunk/projection mismatch** Azure AI Search documents.

### CR-11 — Scope honesty, all three documents

Two things to add rather than remove:

- The MCP roadmap (2026-08-22) explicitly names "agents… acting on behalf of a user who
  isn't present, or **delegating narrower authority to sub-agents**" and commits to
  Workload Identity Federation + ID-JAG + token exchange + WIMSE engagement. **The
  delegation lane has a well-resourced occupant.** But the same roadmap does **not** mention
  memory or knowledge governance at all. Say both. The defensible space is the
  **knowledge-record decision**, not the token mechanics.
- Record the date-stamp: `draft-ietf-wimse-aims-00` was published **2026-09-15**, the same
  date as this proposal, and puts mission→authorization translation out of scope. That is
  the clearest available evidence of where the seam is, and it will age — re-check it.

---

## 5. Positioning

### The defensible sentence

> **Permission-aware retrieval is solved for *identity × document*; a governed brain is the
> portable contract for the rest of the decision — which actor, acting for which subject,
> may obtain which class of record, under which declared purpose, and whether that is still
> true right now — over records that keep their own source authority and provenance.**

Shorter, for a README:

> **Every disclosure is a composed authorization decision, not a search result — and the
> composition, not the check, is the part nobody ships.**

If one clause has to carry the differentiation, make it the **data subject**: *"the caller
is not the subject, and no agent-identity specification models that distinction."*

### Claims to drop

1. **"Nobody is doing the authorization half."** False. Zep, Cognee, Supermemory, Auth0
   FGA, Azure AI Search, Elastic and Glean all make a real authorization decision on
   retrieval. Replace with the composition claim.
2. **"Agent memory today is retrieval / 'what text is similar to this query'."** True of the
   reference MCP memory server (a JSONL file with no access control) and of mem0's
   caller-asserted `user_id`; false of the category. Narrow it to the specific examples and
   cite them.
3. **Any implication that the conjunction is novel.** AuthZEN 1.0 is Final; claim the typed
   `context`, not the envelope.
4. **Any implication that delegation is unclaimed.** Entra Agent ID ships a delegation chain
   (GA); `draft-ietf-wimse-aims` is WG-adopted; the MCP roadmap commits to it. Claim the
   **data subject** and the **purpose** terms instead — those are genuinely empty.
5. **Any implication of standard status.** `brain_access` is a private RAR type; there is no
   IANA registry to register it in. Say "a private authorization-detail type, versioned like
   an API contract" — which the document already does; keep that discipline and do not let
   later drafts soften it.
6. **Any implication of first-mover on the thesis.** Three independent groups published the
   same core observation in 2026. Cite them and claim the contract, the composition, and the
   conformance tests.

### One residual risk to state plainly in the proposal

The nearest occupant is not a memory startup — it is **MCP itself**, whose 2026-08-22
roadmap claims agent identity and sub-agent delegation, plus the **OpenID AuthZEN WG**,
which approved a **COAZ-MCP** binding on 2026-06-15. If both land, the transport and the
PDP envelope are standardized and the remaining defensible surface is exactly the typed
decision content: subject, class, purpose, grant, receipt, provenance, promotion. That is a
good surface to own, but it is smaller than the current framing implies, and the framing
should say so first.
