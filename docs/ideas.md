---
title: "Ideas"
sidebar_label: "Deployment ideas"
description: "Free-tier deployment ideas on Supabase and Cloudflare, and the 10ms CPU ceiling that would have to be measured first."
status: parked
last_verified: 2026-09-15
---

# Ideas

Recorded thinking that is **not planned work**. Nothing here is scheduled, estimated, or
tracked by a GitHub issue. Things graduate out of this file by becoming a track in
[`roadmap.md`](roadmap.md), or they stay here.

---

## Free-tier deployment (Supabase or Cloudflare)

**The constraint.** Everything must be free. The only deployment clouds under consideration
are **Supabase** and **Cloudflare**, co-hosted alongside other projects rather than run as
dedicated infrastructure. Terraform is the source of truth for whatever gets deployed.

**Nothing is deployed today.** `identity-stack` is docker-compose only, and `infra/` is
Descope and Ory SaaS configuration rather than hosting. So this constraint breaks nothing —
it constrains future choices.

### What the constraint implies

**The gateway has no free home.** Tyk is a Docker gateway; neither Supabase nor Cloudflare's
free tier runs one. Either it becomes a Cloudflare Worker, or gateway mode stays a local-only
demonstration. Given Track 2 is a sandbox, local-only is the cheap answer.

**The backend has an unmeasured ceiling.** Cloudflare Python Workers do support FastAPI now
(Pyodide, uv-first workflow), but the free tier allows **10ms CPU per invocation**. JWT
signature verification under WASM against that ceiling is the open question — RSA verification
is a few milliseconds natively, and Pyodide is slower. This is the first thing to measure if
this stops being an idea. A cheap spike answers it: verify a realistic RS256 token in a
Worker and read the CPU time.

Free-tier figures worth re-checking before relying on them (accurate September 2026): Workers
100k requests/day, 10ms CPU per invocation; KV 1GB with 100k reads/day; D1 5GB.

**The database has an obvious home.** The canonical identity store is Postgres, and
Supabase's free tier is Postgres. That is the least surprising part of this.

### Why this is an idea and not a plan

Track 2 exists to prove the library against real providers, not to be hosted. Deploying it
would be a new goal, not a continuation of the current one. If that changes, the spike above
comes first — committing to a shape before measuring the CPU ceiling would be planning on an
assumption.

---

## Certification listing refresh

The OpenID certification names `py-identity-model 3.1.0`; the library ships `3.18.1`. What
the Foundation requires to refresh a listing for a newer version is not established. Tracked
as task 7 of
[`pim-conformance-evidence.md`](https://github.com/jamescrowley321/identity-stack-planning/blob/main/_bmad-output/implementation-artifacts/ralph-prompts/pim-conformance-evidence.md)
rather than left here, because it has a concrete owner and a concrete question.
