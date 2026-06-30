Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

## Running

Run the loop from a **dedicated py-identity-model worktree**, never from the main `~/repos/auth/py-identity-model` checkout — this keeps `PROMPT.md`/`.claude/task-state.md` out of the primary checkout and keeps `main` pristine.

```bash
# One-time: create the orchestrator worktree off main
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/pim-fapi2-ralph -b ralph/fapi2-hardening origin/main

# Run the loop from inside that worktree
cd /tmp/pim-fapi2-ralph
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-fapi2-hardening.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` below refers to `/tmp/pim-fapi2-ralph`. **The prompt must live inside the orchestrator worktree as `PROMPT.md` for the whole run** — ralph re-reads `PROMPT.md` from the worktree's CWD on every iteration, so it must be copied in (as above) before `ralph run` and must remain there until the loop completes. The planning-repo copy at `ralph-prompts/pim-fapi2-hardening.md` is the source of truth; edit it there and re-`cp` if you change the workstream mid-run. Per-task implementation happens in its own short-lived worktree (`/tmp/pim-T5X`) created by the `setup` phase — the orchestrator worktree only hosts the loop, never task branches. When the loop finishes, remove it: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-fapi2-ralph`.

## Task Queue

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| T57 | feat/private-key-jwt-client-auth | #213 private_key_jwt client authentication (token + PAR + introspection + revocation) | pending |
| T58 | feat/rfc9207-issuer-validation | #221 RFC 9207 authorization-response issuer validation | pending |
| T236 | fix/jwks-cache-lru-eviction | #397 jwks-cache FIFO→LRU (move_to_end on read hits) | pending |

Order is intentional: the two FAPI 2.0 RP gating items (#213, #221) first, then the jwks-cache security fix (#397). They are mutually independent — no cross-task dependencies.

## Routing

Repo: `~/repos/auth/py-identity-model` (the loop's CWD is `ORCH_WORKTREE` = `/tmp/pim-fapi2-ralph`).

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/pim-fapi2-ralph/.claude/task-state.md`).

- **Does not exist** → Pick first `pending` task, create state, execute setup
- **phase is `complete`** → Update status to `done` in this file, clean up the task worktree, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order (all three tasks use the feature pipeline): `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`. T236 is a fix (no usage example required; the `docs` phase is changelog-only).

## New Task Setup

Create `ORCH_WORKTREE/.claude/task-state.md` (`/tmp/pim-fapi2-ralph/.claude/task-state.md`):
```
task_id: T5X
branch: <branch from queue>
worktree: /tmp/pim-T5X
phase: setup
```

The `setup` phase creates the task worktree with `git worktree add /tmp/pim-T5X -b <branch> origin/main` (run from `ORCH_WORKTREE`).

If all done: `<promise>LOOP_COMPLETE</promise>`

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

All work after setup happens in the task worktree — `cd /tmp/pim-T5X` first.

## Task-Specific Analysis Guidance

Include these notes when the analyze phase reads the issue. The #213 design was scoped against the live code on 2026-06-29 — follow it rather than re-deriving.

- **T57 (#213 private_key_jwt):**
  - The contract: every client-authenticating endpoint funnels through a core `prepare_*()` returning `(params, headers, auth)`, where `auth` is the httpx Basic tuple. private_key_jwt injects `client_assertion` + `client_assertion_type` into `params` and returns `auth=None`, so the sync/aio HTTP wrappers need **no change**.
  - New `core/client_assertion.py` — `build_client_assertion(...)`. Reuse the JWT-signing + algorithm-validation pattern from `core/jar.py` (extract the shared `_SUPPORTED_ALGORITHMS`/validation helper instead of duplicating it). Assertion claims: `iss`=`sub`=client_id, `aud`, `jti` (uuid4), `iat`, `exp` (short); optional `kid` header.
  - New `PrivateKeyJwt` dataclass: `private_key`, `algorithm='PS256'`, `kid=None`, `audience=None`, `lifetime=300`. Add optional `private_key_jwt: PrivateKeyJwt | None = None` to the client-authenticating request models in `core/models.py`.
  - Modify the core prepare functions: `token_client_logic.py` (auth-code, refresh, client-credentials), `token_exchange_logic.py`, `device_auth_logic.py`, `par_logic.py`, `introspection_logic.py`, `revocation_logic.py`. Precedence: `private_key_jwt` > `client_secret` (Basic) > public (client_id in body).
  - Normalize `request_client_credentials_token` to the 3-tuple contract (it currently hardcodes Basic at `sync/token_client.py:83` and `prepare_token_request_data` returns a 2-tuple).
  - `aud` defaults to the request `address`, overridable via `PrivateKeyJwt.audience`. FAPI2 algorithms: PS256/ES256. Export `PrivateKeyJwt` from sync + aio `__init__`.
  - Constants already exist: `oidc_constants.py:103-104` (`CLIENT_ASSERTION`, `CLIENT_ASSERTION_TYPE`, `PRIVATE_KEY_JWT`).
  - Tests (unit, respx, sync+async): body carries `client_assertion_type` + a decodable `client_assertion` with correct claims, signature verifies with a test keypair, no Basic auth header present, unsupported-algorithm raises, precedence honored. Integration against node-oidc-provider with a `private_key_jwt` client (auth-code + PAR). Usage example under `examples/`.

- **T58 (#221 RFC 9207 issuer validation):**
  - Parsing is **already done**: `AuthorizeCallbackResponse.issuer` (`core/authorize_response.py:74`), `AuthorizeResponse.ISSUER='iss'`, discovery field `authorization_response_iss_parameter_supported`, unit test `test_issuer_parameter_rfc9207`. Do not re-implement parsing.
  - Remaining work is **validation**: compare the response `iss` against the expected issuer to defend against mix-up attacks (RFC 9207 §3). Add it alongside `state` validation in `core/state_validation.py`. Enforce when the AS advertises `authorization_response_iss_parameter_supported` (plus a strict opt-in). Raise a clear exception on mismatch — and on absence when required.
  - Tests: match / mismatch / missing-when-required / not-advertised. Integration: node-oidc-provider advertises `iss` — exercise the validated path. Update an example to show issuer validation.

- **T236 (#397 jwks-cache FIFO→LRU):**
  - `core/jwks_cache.py` is FIFO today: eviction via `next(iter(cache))` (~`:193-212`); pop-and-reinsert happens only on **write** (~`:462-469`), never on read. So a read cache hit does not refresh recency.
  - Make it LRU: call `cache.move_to_end(key)` on read cache hits in `_get_cached_jwks()` (`sync/token_validation.py:143-150`) and the async equivalent (`aio/token_validation.py:200-207`); apply the same to the discovery cache.
  - Threat: in a multi-tenant gateway where the attacker controls tenant→issuer mapping, FIFO lets distinct-address reads evict a legitimately-hot JWKS entry. Add a unit test proving an attacker-driven distinct-address read pattern does NOT evict a recently-read legitimate entry. Keep it deterministic (no `PYTHONHASHSEED` dependence). No usage example required (it's a fix).

## Rules

- ONE phase per iteration, then end.
- Run the loop from `ORCH_WORKTREE` (`/tmp/pim-fapi2-ralph`), never from the main checkout. Never commit to main — task work happens in `/tmp/pim-T5X` worktree branches.
- Run `make lint` as a single command before every commit; do NOT use `--no-verify`.
- Feature tasks (T57, T58) MUST add integration tests (`src/tests/integration/`) AND a usage example (`examples/`) — unit tests alone are insufficient. Run integration tests locally (`make test-integration-node-oidc`) before the `pr` phase.
- All unit AND integration tests must pass. Never rationalize a red test as pre-existing, environmental, or out-of-scope.
- Conventional-commit PRs against `main`. Never auto-merge — the owner reviews and merges every PR manually (no `gh pr merge`, `--auto`, or merge-queue commands).
- If stuck 3+ iterations on one task: set it to `blocked`, clean up the worktree, move on.
- If all tasks done: `<promise>LOOP_COMPLETE</promise>`
