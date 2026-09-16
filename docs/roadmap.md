# Program map

**Re-derived 2026-09-15** from GitHub issues and sibling-repo source, replacing the six
numbered PRDs and their dependency graph. Rationale and evidence:
[`reground-2026-09-15-design.md`](reground-2026-09-15-design.md). Retired artifacts:
[`_archive/README.md`](../_archive/README.md).

Four tracks. **They do not gate each other** — the old dependency graph was the fiction.
Each has its own goal and its own test of done.

Status lives in GitHub, never here. This file says what the work *is* and why; the issue
says where it stands. See [`status.md`](../_bmad-output/implementation-artifacts/status.md).

---

## Track 1 — identity-model (the library)

**Goal.** A credible, certified, multi-language open-source identity library.

**Done looks like.** Certification breadth grows and cross-language parity holds.

This is the flagship and where nearly all momentum is. The repo consolidated: `py/ go/
rust/ node/ spec/ infra/ conformance/` behind one harness, shipping `py-v3.18.1`, with
Python OpenID-certified (Basic + Config + Form Post Basic RP, 2 July 2026).

**Cross-language parity, measured in source 2026-09-15.** `spec/capabilities.md` carries its
own warning that it is hand-maintained and has drifted, so this was read off the source tree:

| Capability | Python | Go | Rust |
|---|---|---|---|
| discovery · JWKS · JWT · id_token · token · userinfo · introspection | yes | yes | yes |
| revocation · token exchange (RFC 8693) · DPoP (RFC 9449) | yes | yes | **no** |
| `private_key_jwt`/`client_secret_jwt` · PAR · FAPI 2.0 validators | yes | **no** | **no** |

Rust's extended tier is the largest gap; Go's is client authentication, PAR, and FAPI.

**Live work.** Parity `identity-model#573` (stories `#574`–`#579`) · test hardening `#614`
(`#607`–`#613`) · configuration API `#616` (`#617`–`#620`) · token harness `#462`
(`#463`–`#474`) · FAPI 2.0 `#476` · RP certification `#242` · security gates `#633`, `#642`,
`#643`.

**Loops.** [`identity-model-go-rust-parity.md`](../_bmad-output/implementation-artifacts/ralph-prompts/identity-model-go-rust-parity.md)
and [`pim-conformance-evidence.md`](../_bmad-output/implementation-artifacts/ralph-prompts/pim-conformance-evidence.md).
Both target this repo — **run them one at a time.**

**Standing decision.** The hosted OIDF suite is the conformance standard; see
[`oidc-certification-analysis.md`](oidc-certification-analysis.md).

---

## Track 2 — identity-stack (proving ground and sandbox)

**Goal.** Exercise the library against real providers, and keep Descope and Tyk skills sharp.

**Done looks like.** The library is proven against Descope and Ory for real.

**This is not a product.** Tyk and Descope are deliberate expertise vehicles — POC-grade by
design, chosen because they are worth being fluent in, not because they are deployment
targets. That single fact retired the multi-IdP capstone (PRD 4) and the 31-story design
system (PRD 5b).

Delivered and verified in source: the canonical Postgres identity model with eight
repositories, sync adapters, inbound sync and migrations; the Tyk gateway; the Ory feeder
epics including `OrySyncAdapter` and provider-driven token validation.

**Live work.** Ory provider-agnostic frontend and logout `identity-stack#377`, `#378` ·
Ory Terraform state migration `#376` · TFC environments `#411` (`#413`–`#418`) ·
configuration API `#406`, `#407` · the FastAPI rate-limit pin `#324`.

**Loop.** [`ory-frontend-logout.md`](../_bmad-output/implementation-artifacts/ralph-prompts/ory-frontend-logout.md).

**Dead here.** The VAULT epic `#398`–`#405` targets HCP Vault Secrets, which reached end of
life 2026-07-01, and HCP Vault Dedicated, which costs ~$1,152/month against a free-only
constraint. Documented rather than closed — closing them is the owner's call.

---

## Track 3 — expertise (terraform-provider-descope, oss-admin)

**Goal.** Stay fluent in Descope, Terraform, and repository governance.

**Done looks like.** The provider fork stays current, and Terraform remains the source of
truth for deployment.

`terraform-provider-descope` is a fork of the upstream provider; PRs go to the fork.
`oss-admin` holds one Terraform root per administered repo — GitHub settings, branch
protection, CI secrets — with state in HCP Terraform.

**Secrets, settled by evidence.** HCP Terraform variable sets. `oss-admin` reads
`descope_management_key` from the org-wide `descope-company` variable set, with the workspace
in local execution mode. The free tier covers 500 managed resources and one concurrent run.
Infisical was rejected; HCP Vault was planned and abandoned on cost and end-of-life.

**Live work.** `terraform-provider-descope#109`.

---

## Track 4 — governed brain (research, gated)

**Goal.** Test the thesis that agent memory is an authorization problem — *may this actor,
acting for this person, obtain this kind of record, for this stated reason, right now.*

**Done looks like.** The four open decisions are settled so Phase 0 can start.

**Nothing is built, by design.** Four decisions and four blockers are unresolved, and the
material says so plainly. The defensible claim is narrow: permission-aware retrieval is a
mature category for identity × document; what is unoccupied is *acting on behalf of someone
else* and *for a stated purpose*.

**Landed 2026-09-15** (#108): six documents in `docs/governed-brain-*.md` plus four research
passes under `planning-artifacts/research/`. Start at
[`governed-brain-where-it-stands.md`](governed-brain-where-it-stands.md), which carries the
four open decisions and a recommendation for each. No issues are filed, deliberately —
nothing should be scheduled until those decisions are settled.

---

## Parked ideas

Not tracks. Recorded so the thinking is not lost, and explicitly not scheduled.

- **[open-identity](idea-open-identity.md)** — a rebrand around provider-portable identity,
  planned thoroughly in September 2026 and never started. Ten locked decisions, market and
  trademark findings, and the readiness-audit lesson, condensed from seven documents.
- **[Deployment ideas](ideas.md)** — free-tier hosting on Supabase or Cloudflare,
  co-hosted alongside other projects.

---

## How the tracks relate

They mostly do not, and that is the point. The one real coupling: `identity-stack/backend`
depends on `py-identity-model` for token validation — currently pinned `>=3.8.5,<4` while
the library ships `3.18.x`. That pin is the whole interface between Track 1 and Track 2.
