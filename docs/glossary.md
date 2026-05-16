# Glossary

Definitions for terms used across identity-stack-planning documents. Organized alphabetically.

---

**Acceptance Auditor** — Review agent persona that verifies spec compliance. For each acceptance criterion, checks whether it's implemented, tested, and matches intent. Reports PASS / FAIL / PARTIAL / SCOPE CREEP. See [review process](review-process.md).

**Blind Hunter** — Review agent persona that reviews code diffs with zero project context. Sees only the diff, assumes the worst about every line. Catches logic errors, security holes, dead code, and resource leaks. See [review process](review-process.md).

**BMAD-METHOD** — AI-driven agile planning framework (v6) providing structured agent personas, workflows, and skill integration. Installed at `_bmad/` in identity-stack-planning. See [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD).

**Canonical identity** — The Postgres-backed identity model that serves as the source of truth for users, tenants, roles, and permissions. Identity providers (Descope, Ory, etc.) become sync targets rather than the source of truth. Defined in PRD 5. See [system architecture](system-architecture.md#canonical-identity-data-model-prd-5).

**Claim normalization** — The process of mapping provider-specific JWT claims into a uniform format. Descope uses `dct` and `tenants` claims; Ory uses `realm_access.roles`; Entra uses `groups`. A Tyk Go plugin normalizes these into headers (`X-User-ID`, `X-User-Email`, `X-User-Roles`, `X-Tenant-ID`). Defined in PRD 4.

**ClaimMapper** — Go interface in the Tyk claim normalization plugin. Each identity provider has a concrete implementation (`DescopeMapper`, `OryMapper`, `GenericOIDCMapper`) that extracts user identity from provider-specific JWT structures. Defined in the PRD 4 architecture.

**DEPLOYMENT_MODE** — Environment variable (`standalone` | `gateway`) evaluated once at FastAPI startup. Controls which middleware is active: standalone mode runs JWT validation in FastAPI; gateway mode offloads it to Tyk. See ADR-GW-4 and ADR-GW-5.

**Edge Case Hunter** — Review agent persona that traces every branching path and boundary condition. Reports only genuinely unhandled paths where code will fail, crash, or produce wrong results. See [review process](review-process.md).

**IdentityProviderAdapter** — Abstract base class (ABC) defining the interface for syncing canonical identity operations to an external identity provider. Implementations: `DescopeSyncAdapter` (production), `NoOpSyncAdapter` (testing). Defined in PRD 5 architecture.

**IdentityService** — Abstract base class (ABC) defining the core contract for canonical identity operations (create_user, assign_role, create_tenant, etc.). Methods return `Result[T, IdentityError]` — never raise exceptions. The concrete implementation is `PostgresIdentityService`. Defined in PRD 5 architecture.

**idp_links** — Database table linking a canonical user to their identity at a specific provider. Contains `external_sub` (the provider's subject identifier), `provider_id`, and JSONB metadata. Enables one user to authenticate through multiple providers.

**Infisical** — Secrets management platform chosen over HashiCorp Vault for right-sized complexity. Used for centralized secret storage, audit logging, and runtime injection via `infisical run`. See PRD 1.

**Phase** — A single unit of work within a ralph loop iteration. Each iteration completes one phase, then exits. Common phases: `analyze`, `plan`, `implement`, `test`, `review-blind`, `review-edge`, `review-acceptance`, `review-security`, `review-fix`, `docs`, `ci`, `complete`. See [ralph loop process](ralph-loop-process.md).

**Problem Detail** — RFC 9457 standard error response format. Used by the canonical identity service. Includes `type` (URI), `title`, `status`, `detail`, `instance` (request path), and `traceId` (OpenTelemetry). Content-Type: `application/problem+json`.

**Provider abstraction tiers** — Classification system for identity capabilities by cross-provider mapping feasibility:
- **Tier 1 (Abstract)** — Similar shape across providers; abstract with a common interface. Examples: User CRUD, ReBAC/authz, SSO/Federation, session management.
- **Tier 2 (Translate)** — Requires translation; interface + provider-specific adapters. Examples: RBAC roles/permissions, password policy.
- **Tier 3 (Provider-specific)** — Too divergent to abstract. Examples: multi-tenancy model, flows/orchestration, connectors, JWT claim structure.
See ADR-3 in [system architecture](system-architecture.md).

**Ralph loop** — An autonomous execution cycle driven by Ralph Orchestrator. Reads the task queue, picks the next pending task, executes one phase per iteration, persists state to `.claude/task-state.md`, and signals completion. See [ralph loop process](ralph-loop-process.md).

**Ralph Orchestrator** — External autonomous AI agent orchestration tool. Rust-based, hat-based pub/sub architecture. Configured via `ralph.yml` in each application repo. See [mikeyobrien/ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator).

**Result[T, E]** — Functional error handling pattern used by canonical identity services. Methods return `Ok(value)` on success or `Error(IdentityError)` on failure. Routers map Results to HTTP responses via `result_to_response()`. Replaces `raise HTTPException` pattern.

**Review gate** — Quality checkpoint in the ralph loop. After all reviewers produce findings, the loop enters a fix phase. Blocking findings (MUST FIX, BLOCK, FAIL) must be resolved before the PR can be created. Maximum 3 fix iterations; unresolved findings block the PR. See [review process](review-process.md).

**Sentinel** — Review agent persona: pragmatic security auditor focused on the identity/auth domain. Reviews for tenant isolation, authorization bypass, injection, JWT validation gaps, and credential exposure. Reports only genuinely exploitable vulnerabilities with concrete attack scenarios. See [review process](review-process.md).

**Task queue** — Central work tracker at `_bmad-output/implementation-artifacts/task-queue.md`. Tracks tasks across all three application repos with status (`pending`, `in_progress`, `done`, `blocked`, `wontfix`), dependencies, and iteration counts. Ralph loops read this file to pick their next task.

**Task-state file** — Per-loop state persistence at `.claude/task-state.md` (or `task-state-<name>.md` for parallel loops). Contains current task ID, phase, branch, worktree path, implementation plan, and review findings. Enables crash recovery and manual inspection between phases.

**Viper** — Review agent persona: offensive red team specialist. Activated only for changes touching auth, middleware, token, or infrastructure code. Runs a 3-stage pipeline: Recon → Vulnerability Analysis → Exploit Validation. Scores findings with CVSS v3.1. See [review process](review-process.md).

**Worktree** — Git worktree used for filesystem isolation in story-based ralph loops. Each story gets its own worktree (e.g., `/tmp/sss-canonical-story-1.3`) so multiple loops can run in parallel without interference. Cleaned up when the story completes.

**Write-through sync** — Data consistency pattern used by the canonical identity model. API-originated writes go to Postgres first (source of truth), then sync to the identity provider. Sync failures are logged and warned but never rolled back — a reconciliation job catches up asynchronously. See D-7 in [system architecture](system-architecture.md).
