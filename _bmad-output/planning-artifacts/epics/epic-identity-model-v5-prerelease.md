# Epic: identity-model py 5.0 — Alpha Pre-releases and Feedback (Phase P)

**Source:** `sprint-change-proposal-2026-11-15.md` (amendment). **GitHub:** sub-issues of [identity-model#904](https://github.com/jamescrowley321/identity-model/issues/904). **Depends on:** the eight spec-fix PRs merged into `release/v5`, and Phase D3 (`epic-identity-model-v5-conformance.md`).

## Overview

py-identity-model 5.0 and fastapi-identity-model are published as **alpha** pre-releases (`5.0.0a1`, `a2`, …) to PyPI from `release/v5`. They are used in several real places to collect feedback. Feedback fixes land on `release/v5`, and each batch is followed by a new alpha. 5.0.0 final ships through [identity-model#915](https://github.com/jamescrowley321/identity-model/pull/915) once the owner calls the feedback period done. `main` stays on the 4.x line until then.

Status lives in the GitHub issues, and each issue's acceptance criteria win over this file.

## Decisions (James, 2026-11-15)

- The pre-release label is **alpha**.
- The eight spec-fix PRs merge before the first alpha, so feedback covers the intended API.
- Phase D3 (conformance coverage) gates `5.0.0a1`.
- The status note goes on the `main` README, plus a `Development Status :: 3 - Alpha` classifier. The release/v5 READMEs are unchanged.

## Story P1: FastAPI module names say what they hold — [#1146](https://github.com/jamescrowley321/identity-model/issues/1146)

**Given** `rp.py` (login router) and `ws.py` (WebSocket auth), **when** P1 lands, **then**:
- they are `login.py` and `websocket.py`, with tests, docs, examples and the conformance fastapi harness updated;
- there are no shims;
- `docs/upgrade-v5.md` has the entry;
- the commit is `refactor(fastapi)!`.

The owner confirms the names at pick time.

## Story P1b: Discovery takes the issuer, and the issuer match is exact — [#1154](https://github.com/jamescrowley321/identity-model/issues/1154)

Decided by the owner on 2026-11-15. It supersedes M8 of #1128 (full discovery URL plus a helper).

**Given** a configured issuer, **when** the library fetches discovery, **then**:
- it builds the URL by OIDC Discovery §4.1 by default, or by RFC 8414 §3 when the caller explicitly opts in;
- it compares the document's `issuer` to the configured issuer exactly (§4.3, §5, §7.2; RFC 8414 §3.3), with no trailing-slash trim, in Python, Go and Rust;
- the same issuer drives the ID Token `iss` check;
- passing a full discovery URL where the issuer is expected is a configuration error.

FastAPI's `OIDCSettings` takes the issuer. Shared vectors cover trailing-slash differences and issuers with a path. Go/Rust RFC 8414 support is the parity story [#1155](https://github.com/jamescrowley321/identity-model/issues/1155).

## Story P2: `release/v5` can publish alphas of both packages — [#1147](https://github.com/jamescrowley321/identity-model/issues/1147)

**Given** a dispatch of `release.yml` on `release/v5`, **when** PSR runs, **then**:
- the core tags an `a`-token prerelease, and `publish-dist.yml` matches that tag;
- fastapi versions an alpha with floor `py-identity-model>=5.0.0a1,<6`, and `release-fastapi.yml` publishes it;
- Go/Rust tag nothing;
- both pyprojects carry `Development Status :: 3 - Alpha`.

Proven with PSR `--noop` dry runs before merge.

## Story P3: The `main` README says where 5.0 is — [#1148](https://github.com/jamescrowley321/identity-model/issues/1148)

**Given** a reader on the GitHub landing page, **when** they read the README, **then** they learn that:
- 5.0 is in development and published as alphas;
- they can install it with `pip install --pre`;
- the API may change between alphas;
- 4.x is the stable line;
- feedback goes through the `v5-feedback` template.

The `docs:` commit cuts no 4.x release.

## Story P4: Cut `5.0.0a1` — [#1149](https://github.com/jamescrowley321/identity-model/issues/1149)

**Given** D3, P1, P1b and P2 merged, [#1140](https://github.com/jamescrowley321/identity-model/issues/1140) gating applied, a green hosted Basic/Config/Form Post run on `release/v5` and a full E2E, **when** the owner runs `gh workflow run release.yml -f branch=release/v5`, **then**:
- exactly one py `5.0.0a1` and one fastapi alpha reach PyPI;
- `pip install --pre` of both in a scratch venv runs `py/examples/`.

## Story P5: Feedback reaches the backlog — [#1150](https://github.com/jamescrowley321/identity-model/issues/1150)

**Given** alphas in use, **when** a user hits a problem, **then**:
- they file it with the "5.0 alpha feedback" template, labelled `v5-feedback`;
- it is triaged as one of: fix on `release/v5` + next alpha / defer to 5.x / won't fix;
- the adoption list records each place and its pin.

## Then — 5.0.0 final

When the owner calls the feedback period done:
1. Run a final E2E and hosted run.
2. Set the classifiers to `5 - Production/Stable` and the fastapi floor to `>=5.0.0`.
3. Write the #915 squash body, with a `feat(fastapi)!`/`fix(fastapi)` line so fastapi releases.
4. The owner merges #915 with a merge commit.
