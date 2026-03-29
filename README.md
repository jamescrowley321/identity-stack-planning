# auth-planning

BMAD-METHOD v6 planning hub for a multi-repo authentication workspace. This repo contains zero application code — only planning artifacts, architecture documents, research, and project knowledge that drive development across three sibling repositories.

This project also serves as a **use case for agentic development**, demonstrating how AI orchestration tools (BMAD agents, Ralph Orchestrator, Claude Code) can coordinate planning and implementation across multiple repositories.

## What This Repo Is For

- **Planning** — PRDs, architecture docs, epics, stories, and sprint plans that define what gets built
- **Research** — Technical research, brainstorming sessions, and competitive analysis that inform planning decisions
- **Orchestration** — Task queue, ralph loop prompts, and runner guides that drive autonomous implementation across sibling repos
- **Review** — Adversarial code review findings and review fix tracking
- **Knowledge** — Project-level documentation (Descope data model, OIDC certification analysis) shared across repos

## Workspace

This repo lives at `~/repos/auth/auth-planning/` alongside three sibling repositories. The parent `~/repos/auth/CLAUDE.md` is the single source of truth for workspace-wide build commands, git conventions, and cross-repo relationships.

| Repo | Description |
|------|-------------|
| **auth-planning** (this repo) | BMAD planning artifacts and project knowledge |
| **py-identity-model** | Production OIDC/OAuth2.0 Python library — JWT decoding, token validation, discovery. Dual sync/async API |
| **terraform-provider-descope** | Terraform provider for Descope (Go). Fork of `descope/terraform-provider-descope` |
| **descope-saas-starter** | SaaS starter kit — FastAPI backend + Vite/React frontend + Terraform infra |

### Cross-Repo Dependencies

- `descope-saas-starter/backend` depends on `py-identity-model` (>= 2.1.0) for token validation
- `terraform-provider-descope` manages Descope project infrastructure the SaaS starter connects to
- `py-identity-model/examples/descope/` contains Descope-specific integration examples

## Agentic Development Stack

This workspace uses three layers of AI-driven development tooling:

### Layer 1: BMAD-METHOD (Planning & Personas)

[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) v6 provides structured AI-driven agile planning with specialized agent personas:

| Agent | Persona | Role |
|-------|---------|------|
| Winston | Architect | System design, API architecture, scalable patterns |
| Amelia | Developer | Story execution, TDD, code implementation |
| John | Product Manager | PRDs, requirements discovery, stakeholder alignment |
| Mary | Business Analyst | Market research, competitive analysis |
| Quinn | QA Engineer | Test automation, E2E testing, coverage analysis |
| Bob | Scrum Master | Sprint planning, agile ceremonies |
| Sally | UX Designer | User research, interaction design |
| Paige | Tech Writer | Documentation, standards compliance |
| Barry | Quick Flow Solo Dev | Rapid spec-to-implementation |

Each agent is a full persona with activation protocol, interactive menu, and Claude Code skill integration. See `_bmad/bmm/agents/` for definitions.

### Layer 2: Ralph Orchestrator (Autonomous Loop Execution)

[Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) provides autonomous AI agent orchestration with a hat-based pub/sub architecture. Each application repo has a `ralph.yml` (configuring the Claude backend, iteration limits, and completion promise) and a `PROMPT.md` that drives the loop.

**Current setup:**
- `ralph.yml` in `py-identity-model` and `descope-saas-starter` (Claude backend, 15 min timeout per iteration)
- Task queue in this repo at `_bmad-output/implementation-artifacts/task-queue.md` with cross-repo dependencies and priority
- Ralph loop prompts in `_bmad-output/implementation-artifacts/ralph-prompts/` for different execution modes (new tasks, review fixes, epic-specific work)
- Each iteration completes one phase of one task, persisting state to `.claude/task-state.md` in the target repo
- Custom loop phases: `analysis → plan → execute → test → review → docs → ci → complete`

**Running:**
```bash
# From the target repo directory — copy the appropriate prompt into PROMPT.md, then:
ralph run

# Monitor progress
cat .claude/task-state.md
```

See `_bmad-output/implementation-artifacts/ralph-runner-guide.md` for full details.

### Layer 3: Custom Integration (Planned)

Bridging BMAD agents with Ralph hats to create security-focused development pipelines. See [Ralph-BMAD Integration Plan](docs/ralph-planning/ralph-bmad-integration-plan.md) for the full proposal including:

- **Security Auditor (Sentinel)** — auth-domain-aware security review on every PR
- **Red Team (Viper)** — 5-stage offensive security pipeline (inspired by [Chief Wiggum](https://github.com/wiggum-cc/chief-wiggum))
- **Auth Domain Expert (Cipher)** — OAuth 2.0/OIDC protocol compliance specialist
- Ralph hat topology mapping BMAD personas to pub/sub event flows

## Artifacts

### Planning (`_bmad-output/planning-artifacts/`)

| Document | Description |
|----------|-------------|
| `prd.md` | Product Requirements Document |
| `architecture.md` | System architecture and design decisions |
| `epics.md` | Epics breakdown with stories |

### Implementation (`_bmad-output/implementation-artifacts/`)

| Document | Description |
|----------|-------------|
| `task-queue.md` | Cross-repo task tracker with dependencies and priority |
| `sprint-plan.md` | Prioritized sprint plan |
| `review-findings-saas-starter.md` | Adversarial code review findings |
| `ralph-runner-guide.md` | Guide for running ralph loops |
| `ralph-prompts/` | Loop prompt files for different execution modes |

### Brainstorming & Research (`_bmad-output/brainstorming/`)

| Document | Description |
|----------|-------------|
| `brainstorming-session-*.md` | BMAD brainstorming session outputs |
| `research/hcp-terraform-research.md` | HCP Terraform (Terraform Cloud) research |
| `research/infisical-research.md` | Infisical secrets management research |
| `research/node-oidc-provider-research.md` | node-oidc-provider research |
| `research/tyk-gateway-research.md` | Tyk API gateway research |

### Project Knowledge Base (`docs/`)

| Document | Description |
|----------|-------------|
| [Descope Data Model](docs/descope-data-model.md) | OAuth 2.0/OIDC mapping for Descope — endpoints, JWT claims, tenant model |
| [OIDC Certification Analysis](docs/oidc-certification-analysis.md) | OpenID Foundation certification readiness assessment for py-identity-model |
| [Orchestrator Comparison](docs/ralph-planning/orchestrator-comparison.md) | Chief Wiggum vs Ralph Orchestrator — architecture, security, community analysis |
| [BMAD Integration Plan](docs/ralph-planning/ralph-bmad-integration-plan.md) | Custom agents, skills, and Ralph hat topology for the auth workspace |

## Getting Started

All BMAD skills are available as `/bmad-*` commands in Claude Code:

```
/bmad-help                    # Contextual guidance on what to do next
/bmad-pm                      # Product Manager agent
/bmad-architect               # Architect agent
/bmad-create-product-brief    # Kick off a new initiative
/bmad-create-prd              # Product Requirements Document
/bmad-create-architecture     # System architecture design
/bmad-create-epics-and-stories # Break down work into implementable units
/bmad-code-review             # Multi-layer adversarial code review
/bmad-sprint-planning         # Generate sprint plan from epics
/bmad-brainstorming           # Facilitated ideation sessions
```

## Repository Structure

```
auth-planning/
  _bmad/                      # BMAD-METHOD v6 installation
    bmm/                      # BMM module — agents, workflows, config
      agents/                 # Agent persona definitions (9 agents)
      config.yaml             # Project-level configuration
      teams/                  # Agent team bundles
    core/                     # Core skills and shared workflows
    _config/                  # Agent/skill manifests and customization
    _memory/                  # Agent persistent memory
  _bmad-output/               # Generated artifacts
    planning-artifacts/       # PRDs, architecture docs, epics
    implementation-artifacts/ # Task queue, sprint plan, review findings
      ralph-prompts/          # Loop prompts for autonomous execution
    brainstorming/            # Brainstorming sessions
      research/               # Technical research reports
  docs/                       # Project knowledge base
    ralph-planning/           # Ralph orchestrator analysis and integration plans
  .claude/                    # Claude Code configuration
    skills/                   # BMAD skill wrappers
```

## License

Planning artifacts only — no application code. See individual sibling repos for their licenses.
