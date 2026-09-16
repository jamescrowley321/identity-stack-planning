# identity-stack-planning

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Planning docs](https://img.shields.io/badge/docs-planning%20hub-2d6a4f.svg)](docs/index.md)
[![Status](https://img.shields.io/badge/status-GitHub%20issues-181717?logo=github)](https://github.com/jamescrowley321/identity-stack-planning/issues)

Planning and orchestration hub for a multi-repo identity platform. **Zero application code** —
only the architecture decisions, domain research, and autonomous-execution prompts that drive
development across four sibling repositories.

It is also a case study in **agentic software development**: AI agents plan the work
(BMAD-METHOD), execute it autonomously (Ralph Orchestrator), and review it adversarially in
fresh contexts with no access to the implementation.

## What this is

Four independent tracks, not one program. **They do not gate each other.**

| Track | Goal | Repos |
|---|---|---|
| **Library** | A credible, certified, multi-language open-source identity library | `identity-model` |
| **Proving ground** | Exercise the library against real providers; keep Descope and Tyk skills sharp | `identity-stack` |
| **Expertise** | Stay fluent in Descope, Terraform, and repo governance | `terraform-provider-descope`, `oss-admin` |
| **Governed brain** | Research: agent memory as an authorization problem. Gated, nothing built | — |

```mermaid
graph LR
    subgraph t1["Track 1 — library"]
        IM["identity-model<br/>py · go · rust · spec · conformance"]
    end
    subgraph t2["Track 2 — proving ground"]
        IS["identity-stack<br/>FastAPI · React · canonical identity"]
        PROV["Descope · Ory · node-oidc-provider"]
    end
    subgraph t3["Track 3 — expertise"]
        TFP["terraform-provider-descope"]
        OSS["oss-admin<br/>TF roots · variable sets"]
    end
    subgraph t4["Track 4 — governed brain"]
        GB["research · gated"]
    end
    IM -->|"pinned dependency"| IS
    IS --> PROV
    OSS --> TFP

    style IM fill:#2d6a4f,color:#fff
    style IS fill:#40916c,color:#fff
    style GB fill:#f59e0b,color:#000
```

The one real coupling is that arrow: `identity-stack/backend` depends on `py-identity-model`
for token validation. Everything else is independent.

The library is the flagship, and Python is **OpenID Certified® by the OpenID Foundation as a
Relying Party** — Basic, Config and Form Post Basic RP, since 2 July 2026. It is the certified
reference the family's Go and Rust native libraries are built to match.

`identity-stack` is **not a product**. Tyk and Descope are deliberate expertise vehicles —
POC-grade by design, chosen because they are worth being fluent in.

Full detail: **[docs/roadmap.md](docs/roadmap.md)**.

## The repositories

Each repository documents its own capabilities and ships its own release notes. This table
links; it does not restate.

| Repository | What it is | Release |
|---|---|---|
| [identity-model](https://github.com/jamescrowley321/identity-model) | Multi-language OIDC/OAuth2 **client** library — `py/ go/ rust/ spec/ conformance/` behind one harness. OpenID Certified RP | [![PyPI](https://img.shields.io/pypi/v/py-identity-model?label=py-identity-model)](https://pypi.org/project/py-identity-model/) |
| [identity-stack](https://github.com/jamescrowley321/identity-stack) | Proving ground — FastAPI + React + Terraform, canonical Postgres identity, Tyk gateway, Descope and Ory | — |
| [terraform-provider-descope](https://github.com/jamescrowley321/terraform-provider-descope) | Terraform provider for Descope (Go). Fork of the upstream provider | [![Registry](https://img.shields.io/github/v/release/jamescrowley321/terraform-provider-descope?label=registry)](https://registry.terraform.io/providers/jamescrowley321/descope/latest) |
| [oss-admin](https://github.com/jamescrowley321/oss-admin) *(private)* | One Terraform root per administered repo — GitHub settings, branch protection, CI secrets | — |

## Where things live

| Path | Holds |
|---|---|
| [`docs/`](docs/index.md) | The knowledge base — program map, architecture, identity-domain analysis, governed-brain research |
| [`_bmad-output/planning-artifacts/`](_bmad-output/planning-artifacts/) | Epics and product briefs, each linked to its tracking issue |
| [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/) | Ralph loop prompts, the runner guide, and the artifact → issue map |
| [`_archive/README.md`](_archive/README.md) | What was retired, why, and the `git show` that prints it back. The files live only in git history |
| [`AGENTS.md`](AGENTS.md) | Instructions for AI agents working in this repo |
| `_bmad/` | Vendored BMAD-METHOD v6 install — not edited by hand |

## How work gets done

Three layers, each documented in full:

1. **[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) plans** — product briefs, epics and stories, available as `/bmad-*` skills in Claude Code.
2. **[Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) executes** — one phase per iteration, state persisted to disk, git worktrees for isolation. See [ralph loop process](docs/ralph-loop-process.md) and the [runner guide](_bmad-output/implementation-artifacts/ralph-runner-guide.md).
3. **Independent agents review** — each reviewer runs in a fresh context with zero access to the implementation, so it reads the code cold. See [review process](docs/review-process.md).

Loops never merge their own pull requests.

## Where status lives

**GitHub issues are the source of truth.** Planning artifacts here hold the *why* and the
decomposition; they never carry status. `task-queue.md` and `sprint-plan.md` were retired on
2026-09-05 for drifting from the issues they duplicated — a hand-reconciled tracker always
loses to the system that updates itself.

The artifact → issue map is
[`status.md`](_bmad-output/implementation-artifacts/status.md); it contains no status words,
only stable identifiers.

## For agents

Start at **[AGENTS.md](AGENTS.md)** — what is authoritative, how work is named, which sibling
repository to ground against, and what not to touch. Claude Code reads
[`CLAUDE.md`](CLAUDE.md), which imports it.

## Contributing

This is a planning repository, so a contribution is a change to a *plan*. See
[CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilities in the code these plans describe belong in
the relevant repository — see [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).
