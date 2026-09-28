---
workflowType: 'epic'
project_name: 'identity-model'
epic_title: 'Spec HTTP vectors — node-oidc vector routes and shared runners'
date: '2026-09-28'
inputDocuments:
  - identity-model spec/README.md, spec/vectors/*.json (main at 2b68f98)
  - identity-model#762 vector stack (#765, #767, #779, #787 merged; #788, #789, #790, #794 open; #795, #796 merged into #794's branch)
---

# Epic: Spec HTTP vectors — node-oidc vector routes and shared runners

Tracking: [identity-model#801](https://github.com/jamescrowley321/identity-model/issues/801).
Stories are its sub-issues, listed below.

## Evidence

identity-model#762 replaced the cross-language coverage gate with executable vectors in
`spec/vectors/*.json`. There are two kinds of vector:

- **Token vectors** (validation, id-token): each runner mints a JWT from the vector's claims
  and compares the result to a canonical error code. These are pure logic, and sharing them
  across languages works well.
- **HTTP vectors** (revocation, userinfo and jwks on main; the rest in the open stack): each
  one carries `input`, canned responses keyed by path (`http`), the request the client must
  send (`expect_request`), and the expected outcome (`expect`).

The HTTP vectors cost far more than they need to:

- **One runner per capability per language.** Every capability adds three runner files
  (Python/respx, Go/httptest, Rust/wiremock). Each re-implements the same things: loading
  the JSON, serving the canned responses, rewriting `https://server.example.com`, and
  checking `expect_request`.
  - Python copies `_find_repo_root`, `_mock` and `_assert_request` into every file.
  - Rust redeclares the `HttpVector` structs in every file.
  - Only Go shares a helper file (`httpvector_test.go`).
- **Schema changes land everywhere at once.** Go and Rust reject unknown JSON fields, so
  each new vector field (`discover`, `www_authenticate`, `claims`, `custom_claims`) has to
  change all three runners in the same PR.
- **The open stack is large.** #788, #789, #790 and #794 add about 7,000 lines; #794 alone
  is 3,000 lines across 34 files.
- **A library change rode inside a test PR.** #794 carries a Go behaviour change in
  `go/pkg/dpop/verify.go`.

The part that is genuinely per-language is small: calling the client with `input`, and
mapping the native result or error to the canonical `expect`.

The vectors still found real problems: about 20 Python gaps (identity-model#766, #768–#778,
#782–#786, #791, #574), including fail-open ones (#773, #774, #782, #574).

## Decision

**Serve HTTP vectors from the existing certified node-oidc fixture, and run them with one
generic runner per language.**

- **Canned vectors.** A Koa middleware in `infra/node-oidc-provider` (mounted with
  `provider.use()` ahead of the real OP) serves them:
  - `{ISSUER}/v/{run}/{capability}/{case_id}/{vector}/{path}` returns the canned response
    and records the request.
  - `.../_check` compares the recorded requests against `expect_request` and returns
    `{ok, diffs}`.

  Mocking, fixture rewriting and request checks therefore exist once, in Node. `{run}` is a
  token the caller picks, so concurrent runs never share request records.
- **Live vectors.** A vector marked `"op": "live"` goes to the real OP. Accept paths and
  errors that a conformant OP produces itself (for example `invalid_client`) come from a
  certified implementation rather than from hand-written JSON.
- **Why canned responses stay.** A certified OP never produces the "OP misbehaves" responses
  a client must reject: issuer mismatch, malformed JSON, userinfo without `sub`, a bad
  `WWW-Authenticate`, junk JWKS keys. Those vectors stay canned.
- **Runner shape.** Each language has one runner. Per vector it computes the base URL, calls
  the capability's adapter, maps the result to `expect`, and then requires
  `_check.ok == true`. An adapter is the only per-capability code.

**Test tier.** Once the vector routes exist, HTTP vector runners need a running fixture, so
they leave the unit suite. Each one runs in its language's existing node-oidc target:

- Python: `make test-integration-node-oidc`
- Go: `make test-integration-go`
- Rust: `make test-integration-rust`

Pure-logic vectors stay in-process in the unit suite: validation, id-token, PKCE S256, and
the DPoP proof checks. A missing fixture fails the run; it never skips.

## Stories

Order follows dependencies. Stories within a step are independent of each other.

1. [identity-model#802](https://github.com/jamescrowley321/identity-model/issues/802) —
   vector routes and `_check` in the node-oidc fixture; compose mounts `spec/`.
2. Generic runners that migrate revocation, userinfo and jwks and delete the old
   per-capability runners:
   - [identity-model#803](https://github.com/jamescrowley321/identity-model/issues/803) — Python
   - [identity-model#804](https://github.com/jamescrowley321/identity-model/issues/804) — Go
   - [identity-model#805](https://github.com/jamescrowley321/identity-model/issues/805) — Rust;
     rebases onto identity-model#746 and #793 if they land first.
3. [identity-model#806](https://github.com/jamescrowley321/identity-model/issues/806) —
   `op: "live"` vectors, limited to calls answerable with static inputs.
4. Re-land each capability onto the shared runners: the vector JSON and fixtures from the
   frozen PR, plus one adapter per language. Each story closes its PR as superseded.

   | Story | Capability | Supersedes |
   |---|---|---|
   | [identity-model#807](https://github.com/jamescrowley321/identity-model/issues/807) | discovery | identity-model#788 |
   | [identity-model#808](https://github.com/jamescrowley321/identity-model/issues/808) | introspection | identity-model#789 |
   | [identity-model#809](https://github.com/jamescrowley321/identity-model/issues/809) | token-exchange | identity-model#790 |
   | [identity-model#810](https://github.com/jamescrowley321/identity-model/issues/810) | client-credentials | identity-model#794 |
   | [identity-model#811](https://github.com/jamescrowley321/identity-model/issues/811) | authorization-code (PKCE Appendix B in-process) | identity-model#795 |
   | [identity-model#812](https://github.com/jamescrowley321/identity-model/issues/812) | dpop (only the nonce retry flow over HTTP) | identity-model#796 |

5. [identity-model#813](https://github.com/jamescrowley321/identity-model/issues/813) —
   the Go DPoP embedded-private-jwk attribution fix, split out of #794 as its own `fix(go)`.
   It is independent of the other stories.

## Scope boundaries

- **Frozen PRs.** identity-model#788, #789, #790 and #794 are not merged as they stand. Their
  vector JSON and fixtures are reused; their runners are not.
- **Live vectors take static inputs only.** Flows that need a minted token or an
  interactive login stay in each language's existing integration tests. Live vectors never
  gain setup steps.
- **The Python gaps are fixed elsewhere.** The runners track them as strict `KnownGap`
  expected failures that link the gap issue. The fix order is decided separately.
- **Config vectors are out of scope.** `spec/vectors/config.json` is handled by
  identity-model#751.
- **No new server.** The vector routes live inside the existing node-oidc fixture, and its
  real-OP behaviour is unchanged.
