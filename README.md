# auth-planning

BMAD-METHOD v6 planning hub for a multi-repo authentication workspace. This repo contains zero application code — only planning artifacts, architecture documents, and project knowledge that drive development across three sibling repositories.

This project also serves as a **use case for agentic development**, demonstrating how AI orchestration tools (BMAD agents, Ralph Orchestrator, Claude Code) can coordinate planning and implementation across multiple repositories.

## Workspace

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

[Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) v2.8.1 provides autonomous AI agent orchestration using a hat-based pub/sub architecture. The workspace uses a custom lightweight loop implementation that coordinates task execution across the three application repos.

**Current setup:**
- `ralph.yml` in `descope-saas-starter` (Claude backend)
- Custom loop phases: `analysis → plan → execute → test → review → docs → ci → complete`
- Task queue with cross-repo dependencies and priority scheduling
- BMAD personas inform each phase (Winston for analysis/plan, Amelia for execute, Quinn for test, etc.)

### Layer 3: Custom Integration (Planned)

Bridging BMAD agents with Ralph hats to create security-focused development pipelines. See [Ralph-BMAD Integration Plan](docs/ralph-planning/ralph-bmad-integration-plan.md) for the full proposal including:

- **Security Auditor (Sentinel)** — auth-domain-aware security review on every PR
- **Red Team (Viper)** — 5-stage offensive security pipeline (inspired by [Chief Wiggum](https://github.com/wiggum-cc/chief-wiggum))
- **Auth Domain Expert (Cipher)** — OAuth 2.0/OIDC protocol compliance specialist
- Ralph hat topology mapping BMAD personas to pub/sub event flows

## Documentation

### Project Knowledge Base (`docs/`)

| Document | Description |
|----------|-------------|
| [Descope Data Model](docs/descope-data-model.md) | OAuth 2.0/OIDC mapping for Descope — endpoints, JWT claims, tenant model |
| [OIDC Certification Analysis](docs/oidc-certification-analysis.md) | OpenID Foundation certification readiness assessment for py-identity-model |

### Ralph Planning (`docs/ralph-planning/`)

| Document | Description |
|----------|-------------|
| [Orchestrator Comparison](docs/ralph-planning/orchestrator-comparison.md) | Chief Wiggum vs Ralph Orchestrator — architecture, security, community analysis |
| [BMAD Integration Plan](docs/ralph-planning/ralph-bmad-integration-plan.md) | Custom agents, skills, and Ralph hat topology for the auth workspace |

### Planning Artifacts (`_bmad-output/`)

| Path | Description |
|------|-------------|
| `_bmad-output/planning-artifacts/` | PRDs, architecture docs, product briefs |
| `_bmad-output/implementation-artifacts/task-queue.md` | Cross-repo task tracker with dependencies |
| `_bmad-output/implementation-artifacts/sprint-plan.md` | 7-tier prioritized sprint plan |
| `_bmad-output/implementation-artifacts/review-findings-saas-starter.md` | Adversarial code review findings |

## Getting Started

### BMAD Skills

All BMAD skills are available as `/bmad-*` commands in Claude Code:

```
/bmad-help                    # Contextual guidance
/bmad-pm                      # Product Manager agent
/bmad-architect               # Architect agent
/bmad-create-product-brief    # Kick off a new initiative
/bmad-create-prd              # Product Requirements Document
/bmad-create-architecture     # System architecture design
/bmad-create-epics-and-stories # Break down work into implementable units
/bmad-code-review             # Multi-layer adversarial code review
/bmad-sprint-planning         # Generate sprint plan from epics
```

### Ralph Orchestrator

```bash
ralph --version               # Verify installation (2.8.1)
ralph preflight               # Validate configuration
ralph run                     # Start orchestration loop
ralph hats list               # Show configured hats
ralph web                     # Launch web dashboard
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
    _memory/                  # Agent persistent memory (tech writer sidecar, etc.)
  _bmad-output/               # Generated planning artifacts
    planning-artifacts/       # PRDs, architecture docs
    implementation-artifacts/ # Task queue, sprint plan, review findings
  docs/                       # Project knowledge base
    ralph-planning/           # Ralph orchestrator analysis and integration plans
  .claude/                    # Claude Code configuration
    skills/                   # BMAD skill wrappers (47 skills)
```

## License

Planning artifacts only — no application code. See individual sibling repos for their licenses.
