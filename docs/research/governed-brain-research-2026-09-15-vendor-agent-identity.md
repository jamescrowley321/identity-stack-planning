---
title: "Vendor AI-agent identity / delegated authorization — shipped status, September 2026"
sidebar_label: "Vendor agent identity"
description: "What vendors have actually shipped for AI-agent identity and delegated authorization, as of September 2026."
status: proposed
last_verified: 2026-09-16
---

# Vendor AI-agent identity / delegated authorization — shipped status, September 2026

_Source: sub-agent dispatched by the agent-memory research agent. Findings relayed 2026-09-15._
_Relevance to the governed brain: this is the "who is already binding a retrieval/access decision to a
delegation and a purpose" question — i.e. whether the actor-acting-for-subject-for-a-purpose leg exists
anywhere in shipped product._

## Microsoft — Entra Agent ID + Agent 365
**GA.** https://learn.microsoft.com/en-us/entra/agent-id/whats-new-agent-id (ms.date 2026-05-01, updated 2026-08-13).
Agent 365 GA 2026-05-01 after Ignite 2025 preview; $15/user/mo or bundled in M365 E7 at $99.
Conditional Access for agents / ID Protection for agents REQUIRE an Agent 365 license — Agent ID alone is
only the identity substrate.
Technically the strongest shipped delegation model: https://learn.microsoft.com/en-us/entra/agent-id/agent-tokens
defines actor-facet (`xms_act_fct`), subject-facet (`xms_sub_fct`), `idtyp`, `xms_idrel`; an OBO flow where the
user remains `sub` while the agent blueprint is the acting entity; explicitly names "complex delegation chains
involving multiple agent entities". Resource servers are instructed to parse and validate these claims.
Separate CA templates for on-behalf-of vs autonomous agents.
Caveats: admin-center blueprint/identity creation wizard still labelled **Preview**; claims are proprietary
`xms_`-prefixed, NOT RFC 8693 `act`.
**Verdict: delegation-chain (proprietary, not standards-based). Not purpose-aware.**

## Okta / Auth0
Okta for AI Agents GA 2026-04-30 (https://www.okta.com/blog/ai/okta-for-ai-agents-general-availability/).
Agent SSO GA 2026-08-24, included in core Okta SSO at no extra cost
(https://www.okta.com/newsroom/press-releases/okta-brings-first-class-identity-to-ai-agents-with-agent-sso/).
Auth0 for AI Agents (Token Vault, CIBA async auth, FGA for RAG) GA 2025-11-19
(https://auth0.com/blog/auth0-for-ai-agents-generally-available/).
Auth0 XAA is **Early Access only, not GA** (https://auth0.com/docs/ai-agents-mcp/cross-app-access).

IMPORTANT CORRECTION to the common framing: ID-JAG is **still an Internet-Draft, not an RFC** —
draft-ietf-oauth-identity-assertion-authz-grant-04, 2026-05-21, expires 2026-11-22
(https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant).
It defines `act` as OPTIONAL and states: "This specification does not define normative processing requirements
for `actor_token` or whether an `act` claim is included in the issued ID-JAG."
So XAA reliably carries **user -> requesting-app** delegation across trust domains; the agent-as-distinct-actor
leg is explicitly deferred to future work. Purpose: nothing dedicated — only `scope`, `resource`, and RAR
`authorization_details` (RFC 9396). Auth0 CIBA binding message shows the user what they approve but is NOT a
policy input at the resource server.
**Verdict: delegation-chain (user-level; agent actor optional/unspecified). Not purpose-aware.**

## Ping Identity
Identity for AI GA 2026-03-31, announced 2026-03-24
(https://press.pingidentity.com/2026-03-24-Ping-Identity-Defines-the-Runtime-Identity-Standard-for-Autonomous-AI):
Agent IAM Core, Agent Gateway, Agent Detection (via PingOne Protect). Language is "delegated, scoped tokens
instead of human impersonation" and "continuous, contextual authorization at runtime", but the release names no
ID-JAG, no token-exchange mechanics, no `act` claim, no purpose input. Enterprise Personal Agent Access
(PingOne Privilege) is in customer pilot, not GA.
**Verdict: own-identity + runtime gateway enforcement; delegation depth UNVERIFIED. Not purpose-aware.**

## CyberArk (+ Venafi)
Secure AI Agents Solution announced 2025-11-04, GA December 2025
(https://www.cyberark.com/press/cyberark-introduces-first-identity-security-solution-purpose-built-to-protect-ai-agents-with-privilege-controls/).
Venafi acquisition closed 2024-10-01. Privileged access, credential/secrets vaulting, shadow-agent discovery,
behavioral detection — not token-level delegation.
**Verdict: own-identity-only (privilege/credential model). Not purpose-aware.**

## SailPoint / Saviynt
SailPoint Agentic Fabric GA 2026-08-04, merged with Human Fabric into "SailPoint Identity Security"; discovery
via endpoint/browser sensors (SEAS/SBAS) surfacing shadow agents and MCP servers
(https://www.sailpoint.com/press-releases/sailpoint-identity-security-solution;
https://www.helpnetsecurity.com/2026/05/11/sailpoint-agentic-fabric-expands-identity-governance-to-autonomous-ai-agents/).
Governance/lifecycle, not a runtime delegation protocol. **Verdict: own-identity-only (governance).**

Saviynt Zuma launched 2026-07-28 (https://saviynt.com/press-release/saviynt-launches-zuma-ai-security-platform).
Zuma Access claims **Intent-Aware Runtime Authorization (IARA)** — every agent action evaluated at runtime on
"identity, context, risk, policy, and intended purpose". Clearest purpose-as-authorization-input claim from a
major IGA vendor, but NO public spec, claim format, or protocol detail found — mechanism UNVERIFIED.
**Verdict: purpose-aware (claimed, mechanism unverified).**

## AWS / Google / Anthropic / OpenAI
**AWS** Bedrock AgentCore GA 2025-10-13
(https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-bedrock-agentcore-available).
AgentCore Identity included — workload identities, inbound JWT authorizer, outbound credential providers,
consent portal, 2LO/3LO (https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html).
re:Invent 2025 added custom claims, 3LO for Gateway, Lambda interceptors, Cedar policy. Downstream resources see
the *user's* ordinary vaulted OAuth token — no user+agent chain.
**Verdict: own-identity-only + token vault. Not purpose-aware.**

**Google** Gemini Enterprise Agent Platform Agent Identity: SPIFFE-based
`principal://TRUST_DOMAIN/NAMESPACE/AGENT_NAME`, mTLS/certificate-bound tokens under a Google-managed
Context-Aware Access policy; docs carry no Preview banner
(https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/agent-identity-overview, updated 2026-09-11).
Supports 3LO on-behalf-of-user with end-user creds encrypted by the auth manager and decrypted at Agent Gateway
so the agent never touches the raw credential; logs show both agent and user identity — an AUDIT-level chain.
GA announcement date UNVERIFIED; token-level actor claim UNVERIFIED.
**Verdict: own-identity (SPIFFE) + brokered user creds; chain is audit-level. Not purpose-aware.**

**Anthropic** enterprise-managed auth for MCP connectors GA 2026-08-24
(https://claude.com/blog/enterprise-managed-auth) — Claude obtains a signed identity assertion and exchanges it
for an access token, i.e. the XAA/ID-JAG pattern in production, Okta first IdP. Same day as Okta Agent SSO GA
(coordinated launch).
**Verdict: delegation-chain (user-level, via ID-JAG).**

**OpenAI** Apps SDK / AgentKit: OAuth 2.1 + PKCE + OIDC with ChatGPT as the public OAuth client, MCP "Security
Schemes" extension (https://developers.openai.com/apps-sdk/guides/security-privacy).
**Verdict: user-token-only — no agent identity, no chain, no purpose.**

## Smaller vendors
- Descope Agentic Identity Hub 2.0 (2026-01-26), 2.5 (2026-06-09): each agent gets a dedicated identity carrying
  associated user, tenant, tool-level scopes, OAuth client ID
  (https://www.descope.com/press-release/agentic-identity-hub-2.5). **own-identity + user binding.**
- Stytch Connected Apps shipped 2025-02-20.
- 1Password Unified Access GA March 2026, Privileged Access July 2026
  (https://1password.com/press/2026/mar/1password-unified-access) — credential mediation; own-identity-only.
- Astrix acquired by Cisco; ended standalone new-license sales 2026-06-30.
- Token Security intent-based AI agent security, available 2026-03-18; declared AND observed intent driving
  least-privilege policy (https://www.token.security/news/token-security-introduces-intent-based-security-for-ai-agents).
- Varonis Agent IBAC 2026-08-03, available to Atlas customers; intent-drift detection + quarantine
  (https://www.globenewswire.com/news-release/2026/08/03/3337561/33473/en/Varonis-Introduces-Agent-Intent-Based-Access-Control.html).
- Britive, Obsidian: no shipped agent-identity product found — UNVERIFIED, treat as unknown.

## Bottom line
No vendor has shipped a standards-based, resource-enforced **user -> agent** delegation chain. Microsoft comes
closest but proprietary; ID-JAG deliberately punts the agent-actor leg. Purpose-as-authorization-input remains
embryonic — Gartner's 2026 Hype Cycle for Digital Identity rates intent-based access control at <1% market
penetration — claimed only by Saviynt, Token Security, and Varonis, none with a published mechanism.
