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

### identity-model (`jamescrowley321/identity-model`)

| Planning artifact | Tracking issue(s) |
|---|---|
| `planning-artifacts/epics/epic-20-pim-parity.md` | [#573](https://github.com/jamescrowley321/identity-model/issues/573) epic |
| `planning-artifacts/epics/epic-23-test-hardening.md` | [#614](https://github.com/jamescrowley321/identity-model/issues/614) epic; stories #607–#613 |
| `planning-artifacts/epics-token-harness.md` | [#462](https://github.com/jamescrowley321/identity-model/issues/462) epic; stories #463–#474 |
| `planning-artifacts/epics-config-api.md` | [#616](https://github.com/jamescrowley321/identity-model/issues/616) epic; stories #617–#620 |
| `planning-artifacts/epics/epic-19-mechanical-security-gates.md` | #511, #633, #638 |
| `planning-artifacts/epics/epic-cons1-im-merge-testinfra.md` | [#535](https://github.com/jamescrowley321/identity-model/issues/535) |
| `planning-artifacts/epics/epic-cons2-reorg-publishing.md` | [#536](https://github.com/jamescrowley321/identity-model/issues/536) |
| `planning-artifacts/epics/epic-cons3-rename-retire.md` | [#537](https://github.com/jamescrowley321/identity-model/issues/537) |
| `planning-artifacts/identity-model-parity-report-2026-09-05.md` | [#639](https://github.com/jamescrowley321/identity-model/issues/639) audit; follow-ups #642–#646 |
| `implementation-artifacts/ralph-prompts/pim-fapi2-hardening.md` | [#476](https://github.com/jamescrowley321/identity-model/issues/476) epic; #215, #218, #431, #475 |
| `docs/oidc-certification-analysis.md` | [#242](https://github.com/jamescrowley321/identity-model/issues/242) certification tracking |

### identity-stack (`jamescrowley321/identity-stack`)

| Planning artifact | Tracking issue(s) |
|---|---|
| `planning-artifacts/epics-tfc-environments.md` | [#411](https://github.com/jamescrowley321/identity-stack/issues/411) epic; stories #412–#418 |
| `planning-artifacts/epics/epic-secrets-vault-migration.md` | [#398](https://github.com/jamescrowley321/identity-stack/issues/398) epic; stories #399–#405 |
| `planning-artifacts/epics-ory-sso-provider.md` | #376, #377 (Epic 4), #378 (Epic 5) |
| `planning-artifacts/epics-config-api.md` (frontend + backend legs) | #406, #407 |
| `planning-artifacts/epics-api-gateway.md` | #161–#177 |
| `planning-artifacts/epics.md` (canonical identity) | #138–#156 |

### Planning artifacts with no tracking issue

Not an oversight to fix silently — each is a deliberate state. File an issue when the work is
picked up, and add the row above.

| Planning artifact | Why there is no issue |
|---|---|
| `planning-artifacts/epics/epic-24-identity-capability-gaps.md` | `status: proposed` — not yet accepted into a repo's backlog |
| `planning-artifacts/epics/epic-17-fapi-attacker-model-tests.md` | Written 2026-08-02, never filed. Distinct from #476, which tracks FAPI2 *hardening*, not the attacker-model suite |
| `planning-artifacts/epics/epic-16-audit-remediation.md` | Remediation shipped under the closed #300 umbrella; the epic doc is the record of what was decided |
| `planning-artifacts/epics/epic-0*` … `epic-15` (2026-04-04 vintage) | Written against the pre-consolidation repo layout. Retained as decision records; superseded in substance by the monorepo epics above |
| `planning-artifacts/epics-design-system.md`, `epics-multi-idp-demo.md`, `epics-multi-provider-test.md`, `epics-infrastructure-secrets.md`, `epics-open-identity.md` | PRD-level decompositions; work was filed ad hoc rather than as a numbered epic |

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
