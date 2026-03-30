## Task: Comprehensive code quality audit of py-identity-model

**Target repo:** `~/repos/auth/py-identity-model`
**Branch:** Create `chore/code-quality-audit` from `main`
**Goal:** Audit the entire codebase for lint suppression debt, test quality, architectural drift, and structural issues. Produce a findings report and fix what's fixable.

### Context

The ruff ignore list in `pyproject.toml` has grown to 28 rules. Some are legitimate (formatter conflicts, framework patterns), but others may be masking real code quality issues. The integration test conftest.py has accumulated helper functions that may belong in a shared test utilities module. There are concerns about test coverage being inflated by tests that don't assert meaningful behavior.

This audit should be collaborative with BMAD agents to evaluate whether the codebase has drifted from its architectural intent.

---

### Phase 1: Ruff ignore audit

For every rule in the `[tool.ruff.lint] ignore` list:

1. **Temporarily remove the ignore** (one at a time)
2. **Run `uv run ruff check src/`** to see all violations
3. **Classify each violation** as:
   - **Legitimate suppress** — the rule genuinely doesn't apply here (e.g., `S101` assert in tests, `COM812`/`ISC001`/`E501` formatter conflicts)
   - **Fixable** — the code should be changed to satisfy the rule
   - **Scoped suppress** — the rule is valid globally but specific files/lines need `# noqa` with justification
4. **For fixable violations**, fix them
5. **For scoped suppressions**, replace the global ignore with per-line `# noqa: RULE  # reason` comments
6. **For legitimate global suppressions**, keep them but add a brief justification comment in pyproject.toml

**Target outcome:** The global ignore list should shrink to only rules that genuinely conflict with the project's tooling or framework patterns. Everything else should be either fixed or scoped to specific lines.

**Rules to scrutinize most carefully:**
- `S105`, `S106`, `S107` — Are there actual hardcoded secrets outside test fixtures?
- `PLR0911`, `PLR0913` — Are functions genuinely too complex, or is this masking design issues?
- `A001`, `A002` — What builtins are being shadowed? Is this intentional?
- `PLW0603` — Where are globals used? Can they be eliminated?
- `PLC0415` — Which imports are intentionally deferred? Are they still needed?
- `PT011` — Which `pytest.raises` calls are too broad? Should they use `match=`?

### Phase 2: conftest.py structural audit

The integration test `conftest.py` has grown to ~600 lines with:
- Generic provider fixtures (retry, caching, session-scoped tokens)
- Capability detection logic (`_detect_grant_capabilities`, `_detect_feature_capabilities`)
- Auth code flow helpers (`perform_auth_code_flow`, `_resolve_location`, `follow_redirects_to_callback`, `_follow_redirects_counted`)
- Multiple redirect-following functions with overlapping responsibilities

Evaluate whether this should be refactored:

1. **Extract capability detection** into `src/tests/integration/capabilities.py` — the `_detect_*` functions, `provider_capabilities` fixture, `raw_discovery` fixture
2. **Extract auth code flow helpers** into `src/tests/integration/auth_code_helpers.py` — `perform_auth_code_flow`, redirect helpers, `auth_code_result`/`public_auth_code_result` fixtures
3. **Consolidate redirect following** — `follow_redirects_to_callback` and `_follow_redirects_counted` share 90% of their logic. Unify into one function with an optional `prior_redirects` parameter.
4. **Evaluate `test_utils.py` vs conftest.py boundary** — `get_config()` is in `test_utils.py` but is only called from conftest. Should it just be in conftest? Or should more helpers move to test_utils?

**Constraint:** Don't break any tests. Run `make test-integration-node-oidc` after each structural change.

### Phase 3: Test quality audit

For every integration test file under `src/tests/integration/`:

1. **Identify duplicate/overlapping tests** — tests that assert the same behavior through different fixtures but add no coverage value
2. **Identify assertion-weak tests** — tests that only check `is_successful` or `is not None` without validating meaningful state (e.g., checking a token exists but not that its claims are valid)
3. **Identify tests that can never fail** — tests where the assertion is guaranteed by the fixture setup (e.g., asserting a field exists that was just set by the test itself)
4. **Evaluate skip coverage** — run `make test-integration-ory` and `make test-integration-descope` and count how many tests skip. If >30% skip for a provider, document what's missing and whether those tests add value
5. **Check for test isolation issues** — session-scoped fixtures that could leak state between tests (the `MappingProxyType` fix addressed one case, but are there others?)

### Phase 4: BMAD architectural review

Invoke the following BMAD agents to evaluate alignment with project intent:

1. **`/bmad-architect`** (Winston) — Ask: "Review the py-identity-model integration test architecture. The conftest.py has grown to ~600 lines with capability detection, auth code flow helpers, and redirect following logic. Is this the right place for this code? Does it follow clean test architecture principles? What would you refactor?"

2. **`/bmad-review-adversarial-general`** — Run against the full `src/tests/integration/` directory (not just a diff). Look for systemic issues, not just per-change issues.

3. **`/bmad-review-edge-case-hunter`** — Run against `conftest.py` specifically. The fixture dependency chain is deep (test_config → discovery_document → token_endpoint → client_credentials_token → jwt_access_token → jwt_signing_key). Walk every failure path in this chain.

4. **`/bmad-retrospective`** — Run a retrospective on the integration test refactor (PR #281 + follow-up fixes). What went well? What required multiple iterations? What should we do differently next time?

### Phase 5: Produce findings report

Output a structured report at `_bmad-output/implementation-artifacts/pim-code-quality-audit-report.md` with:

```markdown
## Ruff Ignore Audit
| Rule | Disposition | Action Taken | Remaining Violations |
|------|-------------|--------------|---------------------|

## Structural Findings
- conftest.py refactoring recommendations (with file moves if done)
- test_utils.py boundary decision

## Test Quality Findings
| File | Duplicates | Weak Assertions | Dead Tests | Notes |
|------|-----------|-----------------|------------|-------|

## BMAD Agent Findings
- Architect review summary
- Adversarial findings (triaged)
- Edge case findings
- Retrospective key takeaways

## Recommendations
- Prioritized list of follow-up work items
```

### Verification checklist

- [ ] Global ruff ignore list reduced (document before/after count)
- [ ] All remaining global ignores have justification comments
- [ ] `make lint` passes
- [ ] `make test-unit` passes (863+ tests, 80%+ coverage)
- [ ] `make test-integration-node-oidc` passes
- [ ] No test regressions (same or higher test count)
- [ ] Findings report produced at the specified path
- [ ] All commits follow conventional commit format
