# identity-model py 5.0.0 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Status lives in the GitHub epic, not here.

**Goal:** Ship `py-identity-model` 5.0.0 (plus `fastapi-identity-model`'s matching major): the OIDC citation fixes (#852), the required Discovery metadata (#771, D2), and the injected `Config` (Epic 25, #751). All of it lands through `release/v5`, so `main` gets one push and semantic-release cuts one version.

**Architecture:** 16 stacked PRs (#875 → #899) were built by the `identity-model-stack` loop off `main`. Every PR's must-fix is resolved (#882 pending). A few pre-release fixes go on as new commits on the PRs that introduced each problem. The stack is then merged bottom-up into `release/v5` with **merge commits**, which keep SHAs, so each child retargets cleanly with no restack or force-push. One `release/v5` → `main` PR, also merged with a merge commit, triggers `release.yml` once.

**Tech stack:** Python (uv, pytest, PyJWT, httpx), Go, Rust; semantic-release with scope routing (`tools/release_parsers.py`); GitHub Actions.

**Spec:** Epic 25 (`epic-25-injected-config.md`), the OIDC citation epic (`epic-oidc-spec-citations.md`), the review briefs in `~/repos/auth/resolution/reviews/stack-*.md` (local).

## Global Constraints

- James reviews all identity-model code before merge. Agents never merge into `release/v5` or `main` unless James directs it.
- Never force-push a shipped stack branch. Fixes are new commits. Resolve stack conflicts by merging the parent into the child.
- Merge method for the stack and the final release PR: **merge commit**. Not squash: PSR parses squash bodies, and squashing destroys the per-language `fix(go)!`/`fix(rust)!` commits. Not rebase: it rewrites SHAs and breaks child retargeting.
- Retarget the child PR to `release/v5` **before** deleting a merged branch (`--delete-branch` closes children).
- Spec MUSTs are enforced unconditionally. Optional hardening is opt-in and off by default. Errors are typed (enums or reason constants), never magic strings.
- No inline `# noqa`. Run `PATH=$HOME/go/bin:$PATH make lint` before every commit. Unit and integration tests must pass. Never rationalize a failure.
- Run the `blind-peer-review:check` lenses (`--base origin/<branch>`) before every push.
- Conventional commits with per-language scopes: `fix(py)`, `fix(go)`, `fix(rust)`, `fix(fastapi)`, `docs(spec)`, and so on.
- HealthCloud is private. Never mention it in commits, PRs or issues.

## Review Focus

1. `trusted_audiences="api"` (bare `str`) → expect a typed configuration error, not a set of characters (Task 1).
2. An ID Token with no `aud`, `aud: null` or `aud: []`, validated with no `client_id` → expect rejection in all three languages (Task 2).
3. A Discovery document with `jwks_uri: false`, `0` or `{}`, or a top-level JSON array → expect `MISSING_FIELDS` or a parse error, never `UNEXPECTED_ERROR` (Task 3).
4. `repr(OIDCSettings(client_secret=...))` → expect the secret absent (Task 4).
5. A 4.x user upgrading with `HTTP_TIMEOUT`, `OIDCSettings.from_env()` or a Discovery document missing `jwks_uri` → expect the upgrade guide to tell them exactly what changed (Task 6).

---

## Phase A — Decisions (James)

- [ ] **A1. #842 (discovery issuer must equal the requested issuer):** ship it in 5.0.0 (needs the Cognito/HealthCloud check from 2026-10-10 done, and a rebase onto `release/v5`), or defer to 5.1?
- [ ] **A2. #885 AC "run the token-characterization harness against Descope":** waive it, or amend it to a follow-up issue?
- [ ] **A3.** Confirm merge commits for the stack and the release PR.

## Phase B — Pre-review fixes (agents, in parallel; new commits on the owning PR branch)

Each task: a fresh `/tmp/im-v5-<task>` worktree from `origin/<branch>`; TDD; lint; tests; lenses; push; one terse PR comment.

### Task 1: Reject a bare string `trusted_audiences` (#881, `fix/857-reject-untrusted-audiences`)

**Files:**
- Modify: `py/src/py_identity_model/core/id_token_logic.py` (`_reject_untrusted_audiences`, ~L139-161)
- Test: `py/src/tests/unit/test_id_token_validation.py`

- [ ] Step 1: Failing test:

```python
@pytest.mark.parametrize("bad", ["s6BhdRkqt3", b"s6BhdRkqt3"])
def test_trusted_audiences_rejects_bare_string(bad):
    claims = {"iss": "https://op.example.com", "sub": "248289761001",
              "aud": "s6BhdRkqt3", "iat": 1699999900, "exp": 1700003600}
    with pytest.raises(ConfigurationException, match="trusted_audiences"):
        validate_id_token_claims(claims, "RS256", client_id="s6BhdRkqt3",
                                 trusted_audiences=bad, now=1700000000)
```

- [ ] Step 2: `cd py && uv run pytest src/tests/unit/test_id_token_validation.py -k bare_string -v` → FAIL.
- [ ] Step 3: At the top of `_reject_untrusted_audiences`:

```python
    if isinstance(trusted_audiences, (str, bytes)):
        raise ConfigurationException(
            "trusted_audiences must be an iterable of audience strings, not a single string"
        )
```

(Use the existing `ConfigurationException` from `py_identity_model.exceptions`. If the module has no such class, use the exception the wrapper already raises for bad arguments and match on it.)
- [ ] Step 4: The test passes. Run `make test-unit`.
- [ ] Step 5: Commit `fix(py): reject a bare string as trusted_audiences`.

### Task 2: An ID Token without `aud` is rejected (#881 branch; py + go + rust + vector)

OIDC Core §2 makes `aud` REQUIRED. Today an absent, `null` or empty `aud` skips step 3, and with no `client_id` Python accepts the token.

**Files:**
- Modify: `py/src/py_identity_model/core/id_token_logic.py` (`_reject_untrusted_audiences`: replace `if aud is None: return`)
- Modify: `go/pkg/idtoken/idtoken.go` (`validateAudiences`: the `!present` branch); `go/pkg/idtoken/errors.go` (add `ReasonMissingAud = "missing_aud"`)
- Modify: `rust/src/jwt/id_token.rs` (`validate_id_token_claims` step 3: empty `values()`)
- Modify: `spec/vectors/id-token.json` (new test `IDT-013`)
- Modify: `py/src/tests/unit/test_id_token_conformance.py` (map reason `missing_aud`)

**Interfaces:** reason string `missing_aud`, error class `id_token_profile`. Python raises `IdTokenValidationException("ID token missing required 'aud' claim", token_part="payload")`. Rust returns `IdentityError::IdTokenValidation("ID token missing required 'aud' claim")`. Go returns `profileErr(ReasonMissingAud, ...)`.

- [ ] Step 1: Add vector `IDT-013` to `spec/vectors/id-token.json`:

```json
{
 "id": "IDT-013",
 "title": "An ID Token without an audience is rejected",
 "given": "A decoded ID Token whose aud is absent, null or an empty array",
 "when": "The ID-Token profile rules are applied",
 "then": "aud is REQUIRED (§2); the token is rejected whether or not a client_id is configured",
 "references": ["OIDC Core 1.0 §2", "OIDC Core 1.0 §3.1.3.7"],
 "vectors": [
  {"name": "aud absent, no client_id",
   "input": {"claims": {"iss": "https://op.example.com", "sub": "248289761001", "iat": 1699999900, "exp": 1700003600},
             "header_alg": "RS256", "now": 1700000000},
   "expect": {"outcome": "reject", "error": "id_token_profile", "reason": "missing_aud"}},
  {"name": "aud null, client_id set",
   "input": {"claims": {"iss": "https://op.example.com", "sub": "248289761001", "aud": null, "iat": 1699999900, "exp": 1700003600},
             "header_alg": "RS256", "client_id": "s6BhdRkqt3", "now": 1700000000},
   "expect": {"outcome": "reject", "error": "id_token_profile", "reason": "missing_aud"}},
  {"name": "aud empty array",
   "input": {"claims": {"iss": "https://op.example.com", "sub": "248289761001", "aud": [], "iat": 1699999900, "exp": 1700003600},
             "header_alg": "RS256", "client_id": "s6BhdRkqt3", "now": 1700000000},
   "expect": {"outcome": "reject", "error": "id_token_profile", "reason": "missing_aud"}}
 ]
}
```

- [ ] Step 2: Run the vector runners and confirm the new cases fail: `make test-unit` (py `test_id_token_vector[IDT-013-*]`), `make test-unit-go` (`TestIDTokenConformance/IDT-013`), `make test-unit-rust` (`spec_id_token_conformance`).
- [ ] Step 3 (py): in `_reject_untrusted_audiences`, replace `if aud is None: return` with:

```python
    if aud is None or aud == "" or (isinstance(aud, (list, tuple)) and not aud):
        raise IdTokenValidationException(
            "ID token missing required 'aud' claim", token_part="payload"
        )
```

and add `"missing_aud": "missing required 'aud'"` to the reason→message map in `test_id_token_conformance.py`.
- [ ] Step 4 (go): add `ReasonMissingAud = "missing_aud"` to `errors.go`. In `validateAudiences`:

```go
	audRaw, present := claims["aud"]
	if !present || audRaw == nil || audRaw == "" {
		return profileErr(ReasonMissingAud, "ID token is missing the required 'aud' claim")
	}
	audiences, ok := audRaw.([]any)
	if !ok {
		audiences = []any{audRaw}
	}
	if len(audiences) == 0 {
		return profileErr(ReasonMissingAud, "ID token is missing the required 'aud' claim")
	}
```

Update the function comment ("an absent aud has nothing to check" no longer holds).
- [ ] Step 5 (rust): before computing `untrusted`:

```rust
    let audiences = claims.audience.values();
    if audiences.iter().all(|a| a.is_empty()) {
        return Err(IdentityError::IdTokenValidation(
            "ID token missing required 'aud' claim".to_string(),
        ));
    }
```

Map `missing_aud` in the Rust vector runner if it keys on reason. Update the step-3 comment.
- [ ] Step 6: All three runners pass. Run `make test-unit`, `make test-unit-go`, `make test-unit-rust`, `make test-integration-node-oidc`. Gated files changed, so run `rm -rf py/mutants && make mutation-security`, `make mutation-security-go` and `make mutation-security-rust`.
- [ ] Step 7: Commit as four commits: `test(spec): an ID Token without aud is rejected (IDT-013)`, `fix(py)!: reject an ID Token with no aud`, `fix(go)!: ...`, `fix(rust)!: ...`. Each gets a `BREAKING CHANGE:` footer saying that tokens missing `aud` were accepted when no `client_id` was set.

### Task 3: Discovery required-field check accepts only real values (#891, `fix/771-discovery-required-fields`)

**Files:** Modify `py/src/py_identity_model/core/validators.py` (`validate_required_parameters`, ~L95-110). Test `py/src/tests/unit/test_discovery_required_fields.py`.

- [ ] Step 1: Failing tests:

```python
@pytest.mark.parametrize("bad", [False, 0, {}])
def test_falsy_jwks_uri_is_missing(bad):
    doc = valid_discovery_doc() | {"jwks_uri": bad}
    resp = parse(doc)  # existing helper in this file
    assert resp.is_successful is False
    assert resp.error_kind is DiscoveryErrorKind.MISSING_FIELDS

def test_non_object_body_is_parse_error():
    resp = parse([])
    assert resp.is_successful is False
    assert resp.error_kind is not DiscoveryErrorKind.UNEXPECTED_ERROR
```

(Reuse the file's existing builders. If they're named differently, adapt the names, not the assertions.)
- [ ] Step 2: Run them and confirm they fail.
- [ ] Step 3: In `validate_required_parameters`: first `if not isinstance(response_data, dict): raise DiscoveryParseError("Discovery document must be a JSON object")` (the parse error type the module already uses), then change the membership test to `if not response_data.get(param)`. Update the docstring.
- [ ] Step 4: Tests pass. Run `make test-unit`.
- [ ] Step 5: Commit `fix(py): treat a falsy or non-object discovery value as missing`.

### Task 4: Keep `client_secret` out of `OIDCSettings` repr (#899, `refactor/754-oidc-settings-from-env-helper`)

**Files:** Modify `py/packages/fastapi-identity-model/fastapi_identity_model/config.py`. Test `py/packages/fastapi-identity-model/tests/test_config.py` (or the existing settings test file).

- [ ] Step 1: Failing test: `assert "s3cr3t" not in repr(OIDCSettings(discovery_url="https://op.example.com", client_id="c", client_secret="s3cr3t"))` (fill the other required fields the dataclass needs).
- [ ] Step 2: `make test-fastapi` → FAIL.
- [ ] Step 3: `client_secret: str | None = field(default=None, repr=False)` (import `field` from `dataclasses`).
- [ ] Step 4: `make test-fastapi` passes.
- [ ] Step 5: Commit `fix(fastapi): keep client_secret out of OIDCSettings repr`.

### Task 5: Scope `spec/config.md`'s claims to Python (#897, `docs/755-plain-config-spec-page`)

- [ ] Line 4: "Python defines them. Go and Rust are being brought to match ([#757], [#758]); until then they differ as listed below."
- [ ] Line 8: "The Python library reads no environment variables…"
- [ ] Add a short **Go/Rust today** list: they still read `JWKS_CACHE_MAX_ENTRIES` and `DISCO_CACHE_MAX_ENTRIES` (`0` means unbounded); discovery TTL defaults to 24 h; an invalid TTL or cooldown falls back to the default; there's no retry, `ca_bundle`, or `jwks_max_size`/`max_keys` (fixed 1 MiB body cap); there's no TTL clamp.
- [ ] Commit `docs(spec): scope the config page's guarantees to Python until #757/#758`.

## Phase C — Release branch prep (agent; needs A3)

### Task 6: Upgrade guide and FastAPI floor (new PR `docs/v5-upgrade-guide`, stacked on `refactor/754-oidc-settings-from-env-helper`)

**Files:**
- Create `docs/upgrade-v5.md`; add it to `mkdocs.yml` nav next to `migration-guide.md`
- Modify `py/packages/fastapi-identity-model/pyproject.toml:32` → `"py-identity-model>=5.0.0,<6"`

- [ ] Build the guide from the `BREAKING CHANGE:` footers: `git log origin/main..origin/docs/v5-upgrade-guide --format='%h %s%n%b' | grep -B1 -A6 'BREAKING CHANGE'`. One section per break, each with before/after code:
  - `Config` is a plain typed value (#892)
  - clients take `config=` and the library no longer reads env vars (`HTTP_TIMEOUT` and the rest map to `config_from_env()`) (#893/#895)
  - `OIDCSettings.from_env` became `fastapi_identity_model.config_helpers.oidc_settings_from_env` (#899)
  - `jwks_uri` and every Discovery §3 REQUIRED field (#891)
  - `azp` rules are opt-in via `validate_azp` (#885)
  - untrusted extra audiences are rejected and `trusted_audiences` is new (#881)
  - an ID Token without `aud` is rejected (Task 2)
  - Back-Channel Logout requires `exp` (#875)
  - UserInfo requires `sub`, and signed UserInfo enforces `expected_sub` (#884/#882)
  - mTLS refuses a caller-owned client (#895)
  - #842 issuer match, only if A1 says ship
- [ ] `make docs-build` passes (strict).
- [ ] Commit `docs: 4.x to 5.0 upgrade guide` and `build(fastapi)!: require py-identity-model 5`.

### Task 7: Point `release/v5` at `main` and retarget the stack root

- [ ] `git push origin origin/main:refs/heads/release/v5` (fast-forward: `release/v5` is an ancestor of `main` and has no commits of its own; check with `git merge-base --is-ancestor origin/release/v5 origin/main`).
- [ ] `gh pr edit 875 -R jamescrowley321/identity-model --base release/v5`.
- [ ] Confirm `release.yml` triggers only on `main` (it does: `on.push.branches: [main]`), so merges into `release/v5` publish nothing except PR prereleases.

## Phase D — Review and merge (James reviews; agent assists)

Order, bottom-up:

1. Citations: #875 → #877 → #878 → #881
2. UserInfo and ID Token: #882 → #884 → #885 → #887 → #889
3. Discovery: #891
4. Config: #892 → #893 → #895 → #897 → #898 → #899
5. Upgrade guide: Task 6 PR
6. #842 if A1 says ship (rebased onto `release/v5`)

For each PR:

- [ ] James reviews and ticks the accountability box.
- [ ] `gh pr merge <n> --merge` (no `--delete-branch`).
- [ ] `gh pr edit <child> --base release/v5`.
- [ ] If the child shows conflicts (the lower branches carry fix commits the upper ones don't): in a worktree, `git merge origin/release/v5` into the child, resolve, run lint and tests, push (no force).
- [ ] Wait for CI to go green on the child before its review.
- [ ] Delete the merged branch.

## Phase D2 — Correct course, 2026-10-16: FAPI 2.0 and caching (blocks Phase E)

The stack is merged and #915 is green. Two problems surfaced in the final review sweep.

1. **FAPI 2.0 was not met.** `validate_fapi_discovery` treats absent metadata as compliant (#923). The allowed algorithm set omits EdDSA. The library has no FAPI profile at all: `validate_fapi_*` are advisory validators that take self-reported booleans, and only an example calls them. The passing OIDF FAPI2 runs come from posture hand-built in `conformance/app.py` (`:366` algorithms, `:1012` assertion `aud`, `:1157` `iss` required). `private_key_jwt` assertions default `aud` to the endpoint URL, not the issuer (FAPI 2.0 SP §5.3.3.1), at nine call sites.
2. **Caching on HTTP clients is unsafe.** Since #895 the discovery and JWKS caches and the kid-miss cooldown live on each `HTTPClient`, next to a process-wide default client. Short-lived clients defeat the cooldown (#945). The default client's cleanup lock binds to one event loop (#944). It is shared across a pre-fork server's workers. A redirect-following wrapped client caches what it fetched (#935).

5.0.0 is the cheap place for the breaking fixes. Python only: Go and Rust are pre-1.0, so their breaking changes are cheap at any time.

### Decisions (James)

- [ ] **G1.** 5.0.0 scope = the five stories below. Everything additive moves to the post-5.0 FAPI epic.
- [ ] **G2.** `private_key_jwt` `aud` (V5-F2): default to the issuer whenever it is known (RFC 7523bis direction), or make `audience` required?
- [ ] **G3.** Python default asymmetric-algorithm allowlist (V5-F4). This is hardening, so policy says opt-in. RFC 8725 §3.1 requires only that callers *can* restrict algorithms. Make it the default anyway, matching Go and Rust?
- [ ] **G4.** Caching design (V5-C1): approve the transport/state split below.
- [ ] **G5.** Also ride along in 5.0.0 (all breaking): #888 `use: enc` as a hard filter, #930 `validate_azp=True` without `client_id` becomes a config error, #934 delete `ClientAuthMethod.requires_secret`.

### Stories for 5.0.0 (each a PR into `release/v5`; FAPI requirement audit 2026-10-16 is the source)

**V5-F1 (#949). FAPI 2.0 discovery validator: absent means non-compliant** (py; breaking; folds in #923, #855)
- Each of these produces a violation citing its section: absent `code_challenge_methods_supported` (SP 5.3.3.2(3), RFC 8414 §2); absent `pushed_authorization_request_endpoint` (SP 5.3.3.2(2)); `authorization_response_iss_parameter_supported` absent or false (SP 5.3.2.2(7), RFC 9207 §3); neither `dpop_signing_alg_values_supported` nor `tls_client_certificate_bound_access_tokens: true` (SP 5.3.2.1(4-5)).
- `token_endpoint_auth_signing_alg_values_supported` must intersect the FAPI set.
- Add `dpop_signing_alg_values_supported` to `DiscoveryDocumentResponse`. Add EdDSA to `FAPI2_ALLOWED_SIGNING_ALGORITHMS` (SP 5.4.1).
- Correct the docstring at `fapi.py:155-159`. Flip `test_pkce_methods_none_passes`. One fail-closed test per field.

**V5-F2 (#950). `private_key_jwt` `aud` is the issuer** (py; breaking; G2)
- Every `default_audience=request.address` site (`par_logic.py:82`, `token_client_logic.py:81,177,240`, introspection, revocation, device ×2, token exchange) uses the issuer per G2.
- Under the FAPI profile, `aud` is the issuer as a single string. Tests assert the claim at both the PAR and token endpoints.

**V5-F3 (#951). FAPI 2.0 client profile, fail-closed** (py; breaking: the validator API is reshaped)
- One profile object turns on, and refuses any attempt to weaken: S256 only; `response_type=code`; PAR required; client auth in {private_key_jwt, mTLS}; DPoP or mTLS present; `iss` required on the callback; ID Token, JARM and DPoP algorithms in {PS256, ES256, EdDSA}; `nonce` ≤ 64 characters; http loopback redirects only for native apps.
- The `validate_fapi_*` functions check real request and config objects, not self-reported booleans.
- `conformance/app.py` deletes its hand-rolled checks (`:366`, `:1012`, `:1157`) and uses the profile. All three FAPI2 plans still pass.

**V5-F4 (#952). Algorithm and key-strength defaults** (py, go, rust; breaking; folds in #907, #880; G3)
- Reject RSA keys under 2048 bits (RFC 7518 §3.3 MUST, so unconditional) and EC keys under 224 bits for verification, in all three languages, with shared vectors.
- Go and Rust default allowlists gain EdDSA. Python's default allowlist depends on G3.

**V5-C1 (#953). Split transport from cache state** (py; breaking; folds in #944, #945; G4)
- `HTTPClient` / `AsyncHTTPClient` only send requests and hold no cache.
- The discovery cache, JWKS cache and kid-miss / signature-failure cooldown move to an explicit, injectable cache object, keyed by issuer and `jwks_uri`. Its process-wide default resets in a forked child (pid check) and never holds loop-bound primitives across event loops.
- The process-wide default HTTP client resets after fork the same way, or is removed.
- The mTLS path no longer allocates `ClientCaches` per request.
- The JWKS fallback TTL (no `Cache-Control`) drops from 24 h to 1 h, so a key the provider pulls stops validating within the hour.
- Tests: the cooldown survives short-lived clients; a fork test; a two-loop shutdown test.
- Update `spec/config.md`, `docs/upgrade-v5.md` and `docs/api/config.md`.

Order: V5-C1 and V5-F4 are independent. V5-F1 → V5-F3 (the profile builds on the validator). V5-F2 goes before V5-F3.

### Post-5.0: FAPI 2.0 completeness epic (#954; additive, 5.x)

- PAR front-channel URL helper (`client_id` + `request_uri` only, SP 5.3.3.2(6)); a signed JAR request object sent to PAR (MS 5.3.2); JAR lifetime ≤ 60 min; run the MS plan with `fapi_request_method=signed`.
- Sender-constraint completeness: DPoP on the refresh grant; fail on a Bearer downgrade under the profile; apply `mtls_endpoint_aliases` automatically; PS256 and EdDSA DPoP keys.
- Python RS-side DPoP verification (#478).
- Signed introspection responses (RFC 9701, MS 5.5.2).
- Go and Rust FAPI client parity (#573 Phase 3), with shared FAPI spec vectors.
- CI-gate all three FAPI2 plans, including a signed-request variant; regenerate the baselines (#906); close #880 and #855 once verified.

## Phase E — Release

- [ ] Open `release/v5` → `main` PR titled `release: py-identity-model 5.0.0`, with a body listing the stack PRs.
- [ ] Smoke-test the PR's prerelease wheel (`publish-prerelease.yml` comment) in a scratch venv: `pip install <rc wheel>` and run `examples/` against node-oidc (`make test-integration-node-oidc` on the release branch already covers the library).
- [ ] CI green. James merges with a **merge commit**.
- [ ] Watch `release.yml`: py tag `5.0.0` and PyPI publish; `release-fastapi.yml` (major); `release-go.yml` and `release-rust.yml` tags from `fix(go)!`/`fix(rust)!`. If anything other than one py `5.0.0` comes out, stop and investigate before retrying anything.
- [ ] Delete `release/v5` or reset it for v6.

## Phase F — After 5.0.0 (separate issues; not blocking)

- #757 Go config: push the local branch `refactor/757-go-match-python-settings` (7 commits, unreviewed), open a PR, run the lenses.
- #758 Rust config.
- #853 CIT-1 citations: the branch exists only locally (`docs/853-oidc-spec-citations`, 8 commits). Push it and open a PR.
- #861 CIT-9 citation gate.
- Follow-ups from the briefs: FastAPI RP validates the login ID Token with `validate_id_token` (rp.py:254); `UntrustedAudienceException` / `AmbiguousKeyException` pickling; #885 Descope harness; #877 absent-PKCE-metadata FAPI rule; identity-stack floor bump to `>=5`.
