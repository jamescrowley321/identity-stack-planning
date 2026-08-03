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

| Task | PR · Release | Description | Status |
|------|--------------|-------------|--------|
| T252 | #479 · v3.4.3 | #431 repr/eq guard on `RefreshTokenResponse` + `PushedAuthorizationResponse` | ✅ done (shipped) — audited clean |
| T253 | #480 · v3.6.0 | #215 mTLS client auth + certificate-bound access tokens (RFC 8705) | ✅ shipped — ⚠ RS-side `cnf` binding fail-open (audit RT1-F1) → T256 |
| T254 | #481 · v3.7.0 | #218 JARM — JWT-Secured Authorization Response Mode | ✅ done (shipped) — audited clean |
| T255 | #482 #483 · v3.8.0 | #475 FAPI 2.0 Security Profile RP conformance | ⚠ code shipped; conformance green NOT CI-gated/reproducible (audit F13–F17); hosted cert pending → T262 |

**Already shipped — do NOT re-implement** (FAPI2 groundwork already on `main`): T57 #213 private_key_jwt (PR #433), T58 #221 RFC 9207 issuer validation (PR #457), T236 #397 jwks-cache FIFO→LRU (PR #461). PAR (RFC 9126), JAR request objects, DPoP (`core/dpop.py`), and the FAPI2 constants/validators (`core/fapi.py`) also already exist.

**Reconciled 2026-08-02:** T252–T255 have all **shipped** (v3.4.3 → v3.8.0). The original epic's *implementation* is done, but a fresh-context red/blue audit on 2026-08-02 (see `RED-BLUE-GATE.md`) found its *assurance* was not: a stranded algorithm-downgrade guard, a fail-open mTLS `cnf` binding, algorithm-confusion left to PyJWT, and conformance "green" that no CI job runs. The feature loop reviewed the task branch, never the code that shipped to `origin/main`. Those findings are queued as **Post-Audit Follow-ups** below and are the live work; the detection loop `pim-shipped-audit.md` now guards shipped `main` going forward.

### Sequencing

Pick in listed order: **T252 → T253 → T254 → T255.**
- T252 (#431) is a low-severity, self-contained fix — good warm-up.
- T253 (#215) and T254 (#218) are independent features.
- **T255 (#475) MUST be last** — it is the capstone that drives the OIDF suite against the full stack. It passes today on the **DPoP** sender-constraining path (already shipped), so it does not hard-depend on T253; running it after T253/T254 simply widens coverage (mTLS path + JARM response mode).

## Post-Audit Follow-ups (blue team — 2026-08-02 red/blue audit)

These are the CONFIRMED findings from the shipped-`main` audit. Each REQUIRES a fail-closed test under
`src/tests/security/` (mutation-style — fails if the fix is reverted) and a row in `docs/security/control-matrix.md`
(see `RED-BLUE-GATE.md`). Prefer in-session stacked PRs for the well-scoped ones; run the larger cluster via
`pim-shipped-audit.md`. Priority order: T257 → T256 → T258 → T262 → T261 → T259 → T260.

| Task | Sev | Description | Audit ref |
|------|-----|-------------|-----------|
| T256 | HIGH | Enforce RS-side sender-constraints in `validate_token` (opt-in, fail-closed): cert-binding `cnf.x5t#S256`, DPoP `cnf.jkt` (#478), honor caller `algorithms` allowlist in discovery mode, reject untrusted secondary `aud` | RT1-F1, RT4-F1, RT5-F18, #478 |
| T257 | HIGH | Algorithm-confusion hardening: add HS256/384/512→`oct` and `none` to `_ALG_TO_KTY`; never resolve alg from the token header; wrap `InvalidKeyError`/`NotImplementedError` in `TokenValidationException` | RT4-F2 |
| T258 | MED | Add `verify_aud` to `_ENFORCED_VERIFICATION_OPTIONS`; set PyJWT `require=['exp']` (reject tokens with no `exp`) | RT4-F3, RT4-F4 |
| T259 | MED | Thread DPoP proofs through refresh-token and client-credentials grants (RFC 9449 §5) | RT3-F7, RT3-F8 |
| T260 | MED | Basic-auth percent-encoding: prove round-trip against a non-form-decoding AS via integration test; gate the behavior change | RT3-F9 |
| T261 | MED | mTLS: auto-apply `mtls_endpoint_aliases` in the request path; add a real cert-presentation fail-closed test (current test passes if `load_cert_chain` is deleted) | RT1-F2, RT1-F3 |
| T262 | HIGH (process) | Make new-profile conformance real: CI-gate FAPI2/logout/dynamic profiles, remove `config-rp` `continue-on-error`, drop `WARNING`/`SKIPPED` from `PASSING_STATUSES`, stop counting harness-side skips as pass, and move harness-only checks (secondary-`aud`) into the library | RT5-F13–F18 |
| T263 | — | Establish the blue-team artifacts: `src/tests/security/` fail-closed suite + `docs/security/control-matrix.md` (created incrementally by T256–T262) | — |

**Forward workstreams (planned separately, not in this loop):** FAPI 2.0 Attacker-Model adversarial test suite +
new controls (guided by the FAPI 2.0 Attacker Model A1–A5); serious load/soak testing (ties to epic #462–#474, esp.
#474 Locust — validate JWKS-cache concurrency, audit RT4-F6, under real load).

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
- **Red/blue gate (`RED-BLUE-GATE.md`):** every security control needs a fail-closed test under `src/tests/security/` that breaks if the control is deleted; the `review` phase reviews the SHIPPED entrypoint (grep that `validate_token`/middleware actually invokes the control), not just the diff; "conformance green" counts only if a gating CI job or a hosted run produced it. After merges, run `pim-shipped-audit.md` against `origin/main`.
- **Reconcile the queue against reality before picking a task:** cross-check each `pending` row against merged PRs (`gh pr list --state merged`) and shipped `origin/main` — a task already on `main` is `done`, not `pending`.
- Conventional-commit PRs against `main`, each linking its issue and the epic #476. Never auto-merge — the owner reviews and merges every PR manually (no `gh pr merge`, `--auto`, or merge-queue commands).
- If stuck 3+ iterations on one task: set it to `blocked`, clean up the worktree, move on.
- If all tasks done: `<promise>LOOP_COMPLETE</promise>`
