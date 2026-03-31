# Ralph Orchestrator + BMAD Integration Plan

**Date:** 2026-03-28
**Status:** Proposal
**Purpose:** Define custom BMAD agents and Ralph hats to bridge the two systems, adding security capabilities inspired by Chief Wiggum.

---

## 1. The Opportunity

BMAD has 9 agents covering product/engineering roles but **zero security personas**. Ralph Orchestrator is installed (v2.8.1) but has **no hats configured**. Chief Wiggum demonstrates that a red team pipeline and security audit agents are viable in this architecture.

The auth workspace — dealing with OAuth/OIDC tokens, JWT validation, and Descope identity infrastructure — is exactly the domain where security agents pay for themselves.

## 2. Proposed Custom Agents

### 2.1 Security Auditor — "Sentinel"

**Why:** Every PR touching token validation, auth middleware, or Terraform IAM config should get a security review. Currently this is done ad-hoc in the BMAD code review workflow but has no dedicated persona.

**Persona:**
- Pragmatic security engineer, not a checkbox compliance drone
- Only reports genuinely exploitable vulnerabilities (high-confidence standard)
- Explicit false-positive suppression: won't flag parameterized queries, test fixtures, or internal-only paths
- Understands OAuth 2.0/OIDC attack surface: token replay, JWT alg confusion, PKCE downgrade, tenant isolation bypass, SSRF via discovery endpoints

**Menu items:**
- `[SA]` Security Audit — scan a diff or branch for vulnerabilities
- `[TR]` Threat Model — map attack surface for a feature/component
- `[DC]` Dependency Check — audit dependencies for known CVEs
- `[TP]` Token Probe — analyze JWT/token handling for auth-specific vulnerabilities

**BMAD artifacts:**
- `_bmad/bmm/agents/security-auditor.md` — agent definition
- `.claude/skills/bmad-security-auditor/SKILL.md` — skill wrapper
- `_bmad/_config/agents/bmm-security-auditor.customize.yaml` — customization

**Ralph hat mapping:**
```yaml
security-auditor:
  name: "Security Auditor"
  subscribe: ["review.request", "build.done"]
  publish: ["security.pass", "security.fix_required", "security.block"]
  instructions: |
    You are Sentinel, a security auditor for OAuth/OIDC infrastructure.
    Load and follow the BMAD agent at _bmad/bmm/agents/security-auditor.md.
    Focus on: token handling, tenant isolation, PKCE flows, JWT validation.
    Output PASS, FIX (with findings), or BLOCK (architectural issue).
```

---

### 2.2 Red Team Agent — "Viper"

**Why:** Chief Wiggum's 5-stage red team pipeline is its strongest feature. We can build an equivalent as a BMAD agent that works both standalone and as a Ralph hat.

**Persona:**
- Offensive security specialist — thinks like an attacker, not a defender
- Methodical: recon first, then analysis, then validation — never skips steps
- Every finding requires a concrete exploitation hypothesis (not "this could be bad")
- CVSS v3.1 scoring for validated findings

**Menu items:**
- `[RC]` Recon — map attack surface (HTTP routes, auth mechanisms, data flows, trust boundaries)
- `[VA]` Vulnerability Analysis — exploitation-focused analysis across injection, XSS, auth bypass, SSRF, IDOR
- `[EV]` Exploit Validation — attempt proof-of-exploitation, assign CONFIRMED/LIKELY/UNLIKELY/FALSE_POSITIVE
- `[RT]` Full Red Team — run the complete recon → analysis → validation → report pipeline
- `[RM]` Remediate — fix validated vulnerabilities by severity priority

**BMAD artifacts:**
- `_bmad/bmm/agents/red-team.md` — agent definition
- `.claude/skills/bmad-red-team/SKILL.md` — skill wrapper
- `_bmad/core/skills/bmad-red-team-pipeline/workflow.md` — 5-stage workflow

**Ralph hat mapping:**
```yaml
red-team:
  name: "Red Team"
  subscribe: ["security.audit_complete", "redteam.request"]
  publish: ["redteam.report", "redteam.remediate"]
  instructions: |
    You are Viper, an offensive security specialist.
    Load and follow the BMAD agent at _bmad/bmm/agents/red-team.md.
    Execute the 5-stage pipeline: Recon → Vuln Analysis → Exploit Validation → Report → Remediate.
    Every finding needs a concrete exploitation hypothesis and CVSS score.
```

---

### 2.3 Auth Domain Expert — "Cipher"

**Why:** The auth workspace deals with OIDC discovery, JWT validation, Descope-specific tenant claims, and OAuth grant flows. A domain expert agent can inform both planning and implementation with deep protocol knowledge.

**Persona:**
- Deep expertise in OAuth 2.0, OIDC, PKCE, JWT/JWS/JWK, SAML, and Descope's specific implementation
- References RFCs directly (RFC 6749, 7519, 7517, 8414, etc.)
- Understands Descope's data model: projects, tenants, apps, roles, FGA, `dct` claims
- Can review code for spec compliance, not just "does it work"

**Menu items:**
- `[OA]` OAuth/OIDC Review — check implementation against spec
- `[JA]` JWT Analysis — validate token structure, claims, signing
- `[DR]` Descope Review — check Descope-specific integration patterns
- `[CR]` Certification Readiness — assess against OpenID Foundation conformance tests
- `[RF]` RFC Lookup — explain relevant RFC sections for a given feature

**BMAD artifacts:**
- `_bmad/bmm/agents/auth-domain-expert.md`
- `.claude/skills/bmad-auth-domain-expert/SKILL.md`

**Ralph hat mapping:**
```yaml
auth-expert:
  name: "Auth Domain Expert"
  subscribe: ["plan.review", "design.review", "build.done"]
  publish: ["auth.compliant", "auth.non_compliant"]
  instructions: |
    You are Cipher, an OAuth/OIDC domain expert.
    Load and follow the BMAD agent at _bmad/bmm/agents/auth-domain-expert.md.
    Reference RFCs directly. Check Descope-specific patterns against docs/descope-data-model.md.
```

---

## 3. Proposed Skills (Non-Agent)

These are workflow skills, not personas — they execute a specific task without the interactive menu.

### 3.1 `bmad-security-audit` (skill)

Lightweight, non-interactive security scan for use in the ralph loop's review phase. Runs against a diff and outputs PASS/FIX/BLOCK.

```
_bmad/core/skills/bmad-security-audit/workflow.md
.claude/skills/bmad-security-audit/SKILL.md
```

### 3.2 `bmad-threat-model` (skill)

Generates a threat model document for a given feature or component. Maps: assets, threat actors, attack vectors, mitigations, residual risk.

```
_bmad/core/skills/bmad-threat-model/workflow.md
.claude/skills/bmad-threat-model/SKILL.md
```

### 3.3 `bmad-auth-compliance-check` (skill)

Checks code against OAuth 2.0/OIDC spec requirements. Outputs a compliance matrix with pass/fail/not-applicable per requirement.

```
_bmad/core/skills/bmad-auth-compliance-check/workflow.md
.claude/skills/bmad-auth-compliance-check/SKILL.md
```

### 3.4 `bmad-dependency-audit` (skill)

Runs dependency vulnerability scanning and license compliance. For Python: `pip-audit`, `safety`. For Go: `govulncheck`. Outputs findings with severity and remediation.

```
_bmad/core/skills/bmad-dependency-audit/workflow.md
.claude/skills/bmad-dependency-audit/SKILL.md
```

---

## 4. Ralph Hat Topology

With the new agents, here's a proposed hat topology for the auth workspace:

### 4.1 Secure Development Pipeline (default)

```
Planner (Winston) → Builder (Amelia) → Security Auditor (Sentinel) → Reviewer (Quinn) → Finalizer
```

Events flow:
```
plan.done → build.task
build.done → security.audit
security.pass → review.request
security.fix_required → build.task (loop back)
security.block → plan.review (escalate)
review.approved → finalize
review.changes_requested → build.task
```

### 4.2 Red Team Pipeline

```
Recon (Viper) → Vuln Analysis (Viper) → Exploit Validation (Viper) → Report (Viper) → Remediate (Amelia)
```

One-shot pipeline triggered on demand or on release branches.

### 4.3 Auth Review Pipeline

```
Builder (Amelia) → Auth Expert (Cipher) → Security Auditor (Sentinel) → Reviewer (Quinn)
```

For PRs touching token validation, OIDC discovery, or Descope integration.

---

## 5. Integration with Existing Ralph Loop

The custom `ralph-loop.local.md` currently runs phases: `analysis → plan → execute → test → review → docs → ci → complete`.

**Proposed changes:**

1. **Add `security` phase** between `review` and `docs`:
   - Runs `bmad-security-audit` skill against the diff
   - PASS → continue to docs
   - FIX → enter `security-fix` sub-phase (like `review-fix`)
   - BLOCK → set task to `blocked`

2. **Enhance `review` phase** to include the Security Auditor persona's findings alongside the existing adversarial and edge-case reviews as a third layer.

3. **Add optional `red-team` phase** triggered for tasks tagged `security-critical` in the task queue.

---

## 6. Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Security Auditor agent (Sentinel) | Medium | Every PR gets security review |
| **P0** | `bmad-security-audit` skill | Low | Plugs into existing review phase |
| **P1** | Auth Domain Expert agent (Cipher) | Medium | Protocol compliance for OIDC work |
| **P1** | Security phase in ralph loop | Low | Automates security gate |
| **P2** | Red Team agent (Viper) | High | On-demand offensive testing |
| **P2** | Ralph hat topology (ralph.yml) | Medium | Full orchestration pipeline |
| **P3** | `bmad-threat-model` skill | Medium | Planning artifact generation |
| **P3** | `bmad-auth-compliance-check` skill | Medium | OIDC certification prep |
| **P3** | `bmad-dependency-audit` skill | Low | Supply chain security |

---

## 7. File Inventory

New files to create:

```
# Agents (3)
_bmad/bmm/agents/security-auditor.md
_bmad/bmm/agents/red-team.md
_bmad/bmm/agents/auth-domain-expert.md

# Agent skills (3)
.claude/skills/bmad-security-auditor/SKILL.md
.claude/skills/bmad-red-team/SKILL.md
.claude/skills/bmad-auth-domain-expert/SKILL.md

# Workflow skills (4)
_bmad/core/skills/bmad-security-audit/workflow.md
_bmad/core/skills/bmad-threat-model/workflow.md
_bmad/core/skills/bmad-auth-compliance-check/workflow.md
_bmad/core/skills/bmad-dependency-audit/workflow.md

# Skill wrappers (4)
.claude/skills/bmad-security-audit/SKILL.md
.claude/skills/bmad-threat-model/SKILL.md
.claude/skills/bmad-auth-compliance-check/SKILL.md
.claude/skills/bmad-dependency-audit/SKILL.md

# Configuration (3)
_bmad/_config/agents/bmm-security-auditor.customize.yaml
_bmad/_config/agents/bmm-red-team.customize.yaml
_bmad/_config/agents/bmm-auth-domain-expert.customize.yaml

# Ralph config update
identity-stack/ralph.yml (add hat definitions)

# Ralph loop update
.claude/ralph-loop.local.md (add security phase)
```

Files to update:
```
_bmad/_config/agent-manifest.csv (add 3 rows)
_bmad/bmm/agents/bmad-skill-manifest.yaml (add 3 entries)
_bmad/_config/skill-manifest.csv (add 7 rows)
_bmad/bmm/teams/default-party.csv (add 3 agents)
```
