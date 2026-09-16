# Where Status Lives

**GitHub issues are the source of truth for what is done, in progress, or open.**
Planning artifacts in this repo are the source of truth for *why* and *how it decomposes* —
the rationale, the acceptance criteria, the architecture behind a decision. They do not carry
status.

This split replaces `task-queue.md` and `sprint-plan.md`, both retired on 2026-09-05. Those
files duplicated GitHub issue state in markdown tables and drifted from it continuously: at
retirement, 16 rows in the task queue were marked `pending` against closed issues and the
sprint plan carried 18 more. A tracker that must be hand-reconciled will always lose to the
system that updates itself.

## The rule

- Adding work → **file the GitHub issue**, then link it from the planning doc.
- Changing status → **change it on GitHub**. Never in a markdown table.
- A planning doc that wants to say "this is done" should instead say *which issue tracks it*.

The table below therefore contains **no status words** — only stable identifiers. It goes
stale only when a new epic is written, never merely because work progressed.

## Epic → GitHub tracking

### identity-model (`jamescrowley321/identity-model`) — Track 1

| Planning artifact | Tracking issue(s) |
|---|---|
| `planning-artifacts/epics/epic-20-pim-parity.md` | [#573](https://github.com/jamescrowley321/identity-model/issues/573) epic; stories #574–#579 |
| `planning-artifacts/epics/epic-23-test-hardening.md` | [#614](https://github.com/jamescrowley321/identity-model/issues/614) epic; stories #607–#613 |
| `planning-artifacts/epics-token-harness.md` | [#462](https://github.com/jamescrowley321/identity-model/issues/462) epic; stories #463–#474 |
| `planning-artifacts/epics-config-api.md` | [#616](https://github.com/jamescrowley321/identity-model/issues/616) epic; stories #617–#620 |
| `planning-artifacts/epics/epic-19-mechanical-security-gates.md` | #511, #633, #642, #643 |
| `planning-artifacts/identity-model-parity-report-2026-09-05.md` | [#639](https://github.com/jamescrowley321/identity-model/issues/639) audit |
| `docs/oidc-certification-analysis.md` | [#242](https://github.com/jamescrowley321/identity-model/issues/242) certification; [#476](https://github.com/jamescrowley321/identity-model/issues/476) FAPI 2.0 |
| `ralph-prompts/identity-model-go-rust-parity.md` | #573, #574, #575, #576, #578, #579 |
| `ralph-prompts/pim-conformance-evidence.md` | #607, #471, #472, #473, #242, #475, #476 |

### identity-stack (`jamescrowley321/identity-stack`) — Track 2

| Planning artifact | Tracking issue(s) |
|---|---|
| `planning-artifacts/epics-ory-sso-provider.md` | #376, #377, #378 |
| `planning-artifacts/epics-tfc-environments.md` | [#411](https://github.com/jamescrowley321/identity-stack/issues/411) epic; stories #413–#418 |
| `planning-artifacts/epics-config-api.md` (backend/frontend legs) | #406, #407 |
| `docs/ory-sso-provider-context.md`, `docs/ory-iac-automation-plan.md` | #376–#378 |
| `ralph-prompts/ory-frontend-logout.md` | #377, #378 |

### terraform-provider-descope / oss-admin — Track 3

| Planning artifact | Tracking issue(s) |
|---|---|
| — (no planning artifact; work is filed directly) | [terraform-provider-descope#109](https://github.com/jamescrowley321/terraform-provider-descope/issues/109) |

`oss-admin` is administered entirely through its Terraform roots and carries no planning
artifacts or issues here.

### Governed brain — Track 4

Gated. No issues filed, deliberately: four decisions and four blockers are unresolved.

The documents landed on `main` in #108 — six under `docs/governed-brain-*.md` plus the
research passes under `planning-artifacts/research/`. Landing them is not scheduling them;
nothing here gets an issue until the four decisions in
`docs/governed-brain-where-it-stands.md` are settled.

## Planning artifacts with no tracking issue

Naming the gap is the point — a silent absence reads identically to an oversight.

| Planning artifact | Why there is no issue |
|---|---|
| `planning-artifacts/epics/epic-24-identity-capability-gaps.md` | `status: proposed` — not yet accepted into a repo's backlog |
| `planning-artifacts/epics/epic-17-fapi-attacker-model-tests.md` | Written 2026-08-02, never filed. Distinct from #476, which tracks FAPI2 *hardening*, not the attacker-model suite |
| `planning-artifacts/epics/epic-16-audit-remediation.md` | Remediation shipped under the closed #300 umbrella; the epic doc is the record of what was decided |
| `planning-artifacts/epics/epic-18-load-soak-testing.md`, `epic-21-cross-platform-serializer.md`, `epic-22-framework-middlewares.md` | Decomposition written ahead of the work; not yet filed |
| `docs/idea-open-identity.md` | A parked idea, not work |
| `docs/ideas.md` | Recorded thinking, explicitly not scheduled |

## Issues with no planning artifact

This is the normal state, not a gap. Standalone backlog items are filed straight to GitHub
and need no decomposition here — middleware fixes, dependency bumps, flaky-test triage.

Three are epic-shaped and have carried no planning artifact since 2026-09-05:
`identity-stack-planning#61` (tier-2 FOSS security hardening), `#66` (cross-repo Security-tab
triage), and `#94` (Keycloak provider integration).

## Reading current state

```bash
# Everything open in a repo, newest first
gh issue list -R jamescrowley321/identity-model --state open --limit 100

# One epic's stories
gh issue view 614 -R jamescrowley321/identity-model

# Cross-repo sweep of what is actually open right now
for r in identity-model identity-stack terraform-provider-descope; do
  echo "== $r"; gh issue list -R jamescrowley321/$r --state open --limit 100
done
```

## What this file is not

It is not a priority order. Sequencing lives with whoever is driving the work — currently the
report at `planning-artifacts/identity-model-parity-report-2026-09-05.md` for identity-model,
and the epic bodies for identity-stack. Encoding an ordering here would recreate exactly the
drift this file exists to remove.
