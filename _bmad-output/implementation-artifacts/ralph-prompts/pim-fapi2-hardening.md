Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

**Epic:** py-identity-model #476 — *PIM FAPI 2.0 Security Profile — hardening & conformance*.

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

`ORCH_WORKTREE` below refers to `/tmp/pim-fapi2-ralph`. **The prompt must live inside the orchestrator worktree as `PROMPT.md` for the whole run** — ralph re-reads `PROMPT.md` from the worktree's CWD on every iteration, so it must be copied in (as above) before `ralph run` and must remain there until the loop completes. The planning-repo copy at `ralph-prompts/pim-fapi2-hardening.md` is the source of truth; edit it there and re-`cp` if you change the workstream mid-run. Per-task implementation happens in its own short-lived worktree (`/tmp/pim-T2XX`) created by the `setup` phase — the orchestrator worktree only hosts the loop, never task branches. When the loop finishes, remove it: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-fapi2-ralph`.

## Task Queue

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| T252 | fix/response-repr-redaction | #431 repr/eq guard on `RefreshTokenResponse` + `PushedAuthorizationResponse` (redact secrets) | pending |
| T253 | feat/mtls-cert-bound-tokens | #215 mTLS client auth + certificate-bound access tokens (RFC 8705) | pending |
| T254 | feat/jarm-response-mode | #218 JARM — JWT-Secured Authorization Response Mode | pending |
| T255 | test/fapi2-conformance-profile | #475 FAPI 2.0 Security Profile RP conformance run + cert evidence | pending |

**Already shipped — do NOT re-implement** (FAPI2 groundwork already on `main`): T57 #213 private_key_jwt (PR #433), T58 #221 RFC 9207 issuer validation (PR #457), T236 #397 jwks-cache FIFO→LRU (PR #461). PAR (RFC 9126), JAR request objects, DPoP (`core/dpop.py`), and the FAPI2 constants/validators (`core/fapi.py`) also already exist.

**Reconciled 2026-08-01:** the previous queue mislabeled #221 and #397 as `pending` — both are merged. This workstream is now the FAPI 2.0 hardening epic #476: close the low-sev leftover (#431), add the two missing FAPI2 features (mTLS #215, JARM #218), then prove the whole stack against the OIDF FAPI 2.0 Security Profile (#475). All four are independent **except** ordering below.

### Sequencing

Pick in listed order: **T252 → T253 → T254 → T255.**
- T252 (#431) is a low-severity, self-contained fix — good warm-up.
- T253 (#215) and T254 (#218) are independent features.
- **T255 (#475) MUST be last** — it is the capstone that drives the OIDF suite against the full stack. It passes today on the **DPoP** sender-constraining path (already shipped), so it does not hard-depend on T253; running it after T253/T254 simply widens coverage (mTLS path + JARM response mode).

## Routing

Repo: `~/repos/auth/py-identity-model` (the loop's CWD is `ORCH_WORKTREE` = `/tmp/pim-fapi2-ralph`).

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/pim-fapi2-ralph/.claude/task-state.md`).

- **Does not exist** → Pick first `pending` task, create state, execute setup
- **phase is `complete`** → Update status to `done` in this file, clean up the task worktree, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order (feature pipeline): `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`.
- **T252** is a fix — no usage example; the `docs` phase is changelog-only.
- **T255** is a conformance task — its `docs` phase produces **certification evidence + the feature→profile coverage matrix update (#471)**, not a usage example. Its `test` phase is the OIDF suite run itself.

## New Task Setup

Create `ORCH_WORKTREE/.claude/task-state.md` (`/tmp/pim-fapi2-ralph/.claude/task-state.md`):
```
task_id: T2XX
branch: <branch from queue>
worktree: /tmp/pim-T2XX
phase: setup
```

The `setup` phase creates the task worktree with `git worktree add /tmp/pim-T2XX -b <branch> origin/main` (run from `ORCH_WORKTREE`).

If all done: `<promise>LOOP_COMPLETE</promise>`

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

All work after setup happens in the task worktree — `cd /tmp/pim-T2XX` first.

## Task-Specific Analysis Guidance

Include these notes when the analyze phase reads the issue.

- **T252 (#431 repr/eq redaction):**
  - `RefreshTokenResponse` (`core/models.py:728`) and `PushedAuthorizationResponse` (`:819`) are plain `@dataclass` — they lack the `@dataclass(repr=False, eq=False)` guard the other secret-bearing models carry, so secrets (`refresh_token`, and the `request_uri` capability) can leak via `repr()`.
  - Mirror the exact guard + custom `__repr__` pattern already used by the certified secret models (grep `repr=False` in `core/models.py` and copy the redaction style — do not invent a new one).
  - Tests: unit assertions that `repr()` / `str()` of each model does NOT contain the secret value, and that equality still behaves as intended. Low-severity fix — no integration test or usage example required; `docs` = changelog entry only.

- **T253 (#215 mTLS + certificate-bound tokens, RFC 8705):**
  - Add mTLS client authentication (`tls_client_auth` / `self_signed_tls_client_auth`) as a third client-auth mechanism alongside private_key_jwt (#213) and client_secret. The core `prepare_*()` 3-tuple contract already exists: for mTLS the client cert is presented at the **TLS layer**, `client_id` goes in the body, and `auth=None`. Follow the #213 precedence design (`private_key_jwt` > mTLS > `client_secret` (Basic) > public).
  - Thread a client certificate through the sync **and** aio HTTP wrappers (httpx `cert=(certfile, keyfile)` or a configured `ssl.SSLContext`). Add an `MtlsClientAuth` config dataclass (cert, key, optional CA) to the client-authenticating request models.
  - Certificate-bound access tokens: validate the `cnf.x5t#S256` confirmation claim (RFC 8705 §3) — the SHA-256 thumbprint of the presented client cert must match the token's `cnf`. Reuse the DPoP `cnf`/thumbprint validation shape from `core/dpop.py`.
  - Discovery: honor `tls_client_certificate_bound_access_tokens` and route token/PAR/introspection/revocation through `mtls_endpoint_aliases` when mTLS is configured.
  - Tests: unit (respx cannot do a real mTLS handshake — assert cert config is plumbed through and the `cnf` thumbprint validation logic in isolation) + integration against an IdP that supports mTLS (extend the node-oidc-provider fixture with an mTLS client, or document the gap per the T126 IdentityServer-gap precedent). Usage example under `examples/`.
  - FAPI2 relevance: mTLS is the second FAPI 2.0 sender-constraining path (DPoP is the first and is already shipped).

- **T254 (#218 JARM — JWT-Secured Authorization Response Mode):**
  - JARM returns the authorization response as a signed (optionally encrypted) JWT in the `response` parameter. Implement: parse the response JWT, verify signature against the AS JWKS, validate `iss`/`aud`/`exp`, then extract `code`/`state`/`iss` from the JWT claims.
  - Add response-mode support: `query.jwt`, `fragment.jwt`, `form_post.jwt`. Honor discovery `authorization_signing_alg_values_supported` and `response_modes_supported`.
  - Reuse existing JWKS + JWT validation (`core` token_validation + `jwks_cache`) and the already-present RFC 9207 `iss` check — JARM carries `iss` inside the JWT, so wire the mix-up defense to the JWT claim.
  - Tests: unit (valid signed response accepted; tampered signature, expired, `iss`/`aud` mismatch each rejected; `state` binding enforced). Integration against a node-oidc-provider JARM config. Usage example under `examples/`.

- **T255 (#475 FAPI 2.0 Security Profile conformance):**
  - Extend `conformance/app.py` with a FAPI2 RP profile exercising: PAR-initiated authorization, PKCE `S256`, private_key_jwt client auth, DPoP-bound tokens, RFC 9207 `iss` validation, `PS256`/`ES256` only. Follow the existing certified-profile wiring in `conformance/` (Basic/Config/Form Post Basic) — this task EXTENDS that harness, it does not greenfield.
  - Run the OIDF `fapi2-security-profile-final` (current Final) RP test plan. **Resolve every failure in the library, never by loosening the harness.** The hosted OIDF conformance token may be stale (302→login) — see the certification tooling notes before assuming a red run is a code bug.
  - `docs`/evidence: export the run logs as certification evidence, link from the RP cert tracking issue #242, and update the feature→profile coverage matrix #471. Add the profile to the required-regression gate per the #472 pattern.
  - Runs LAST; can certify on the DPoP path even if T253 (mTLS) is deferred.

## Rules

- ONE phase per iteration, then end.
- Run the loop from `ORCH_WORKTREE` (`/tmp/pim-fapi2-ralph`), never from the main checkout. Never commit to main — task work happens in `/tmp/pim-T2XX` worktree branches.
- Run `make lint` as a single command before every commit; do NOT use `--no-verify`.
- Feature tasks (T253, T254) MUST add integration tests (`src/tests/integration/`) AND a usage example (`examples/`) — unit tests alone are insufficient. Run integration tests locally (`make test-integration-node-oidc`) before the `pr` phase.
- T255 (conformance) MUST attach real OIDF suite evidence — a green local unit run is NOT proof; the OIDF test-plan result is.
- All unit AND integration tests must pass. Never rationalize a red test as pre-existing, environmental, or out-of-scope.
- Conventional-commit PRs against `main`, each linking its issue and the epic #476. Never auto-merge — the owner reviews and merges every PR manually (no `gh pr merge`, `--auto`, or merge-queue commands).
- If stuck 3+ iterations on one task: set it to `blocked`, clean up the worktree, move on.
- If all tasks done: `<promise>LOOP_COMPLETE</promise>`
