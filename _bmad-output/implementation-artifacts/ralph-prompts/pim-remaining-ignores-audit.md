## Task: Audit remaining 8 ruff ignore rules in py-identity-model

**Target repo:** `~/repos/auth/py-identity-model`
**Branch:** Create `chore/audit-remaining-ignores` from `main`
**Goal:** For each of the 8 remaining ignored ruff rules, either fix ALL violations or document an airtight rationale for why the rule must stay suppressed. No hand-waving — cite specs, framework constraints, or measurable false positive rates.

### Context

A prior audit (PR #296) reduced the ruff ignore list from 28 → 8 rules by fixing all violations for 20 rules. The remaining 8 rules were carried forward with brief comments. This audit validates each one.

### Current ignore list

```toml
ignore = [
    "E501",      # line too long
    "COM812",    # trailing comma missing
    "ISC001",    # implicit string concatenation
    "S101",      # use of assert (needed for tests)
    "S105",      # possible hardcoded password assigned to variable
    "S106",      # possible hardcoded password assigned to argument
    "S107",      # possible hardcoded password in function default
    "RUF003",    # ambiguous unicode character
]
```

### Procedure

For EACH rule:

1. **Remove it from the ignore list** (temporarily)
2. **Run `uv run ruff check . --select <RULE>`** to see ALL violations
3. **For every violation**, classify as one of:
   - **Fixable** — the code should be changed to satisfy the rule
   - **True false positive** — the rule fires but the code is correct; cite WHY (spec reference, framework constraint, etc.)
   - **Scoped suppress** — the rule is valid globally but this specific line needs `# noqa: RULE  # <rationale>`
4. **Fix all fixable violations**
5. **For true false positives**, determine if the FP rate justifies a global suppress or if per-line noqa is better:
   - If >80% of violations are FPs in the same category → global suppress is justified
   - If <80% FPs or violations are in different categories → fix what you can, scope the rest
6. **Document the decision** in the pyproject.toml comment AND in the findings section below

### Per-rule guidance

**E501 (line too long):** This should conflict with `ruff format`. Verify by running `ruff format` then `ruff check --select E501`. If format produces lines that E501 flags, the rule genuinely conflicts and the global suppress is justified. Document: "ruff format produces lines that exceed E501 threshold — confirmed conflict on N files."

**COM812 (trailing comma missing):** Same — verify formatter conflict. Run `ruff format` then `ruff check --select COM812`. Document.

**ISC001 (implicit string concatenation):** Same — verify formatter conflict. Document.

**S101 (use of assert):** Count violations. If 100% are in test files, consider using `[tool.ruff.lint.per-file-ignores]` to suppress only in test paths:
```toml
[tool.ruff.lint.per-file-ignores]
"src/tests/**/*.py" = ["S101"]
"examples/**/test_*.py" = ["S101"]
```
This is better than a global ignore because it would catch accidental assert usage in production code. If there ARE production asserts, evaluate each one.

**S105/S106/S107 (hardcoded passwords):** Count total violations and categorize:
- How many are OIDC protocol field names (e.g., variables named `access_token`, `client_secret`, `refresh_token`)? Cite the relevant RFC (6749, 7519, etc.)
- How many are test fixture data (e.g., `client_secret="test"`)? These could use per-file-ignores.
- Are there ANY that are actual hardcoded secrets? If so, fix immediately.

**RUF003 (ambiguous unicode):** List every violation. For each, show the exact character and explain its origin. If they're all from OIDC spec text, cite the spec section.

### Verification

After all changes:
- `make lint` passes
- `make test-unit` passes (863+ tests, 80%+ coverage)
- `uv run pytest src/tests/integration/ --co -q` collects all integration tests without errors
- Every remaining ignored rule has a documented rationale in pyproject.toml

### Output

Update the pyproject.toml ignore list. For each rule that stays, the comment must include:
- The count of violations that would fire if enabled
- Why they're false positives (with spec/framework reference)
- Whether per-file-ignores was considered and why it was or wasn't used

Example:
```toml
ignore = [
    # Formatter conflicts — verified: ruff format produces output that triggers these rules
    "E501",      # 47 violations from ruff format output (line-length 79 vs format wrapping)
    "COM812",    # 12 violations from ruff format's trailing comma decisions
    "ISC001",    # 3 violations from ruff format's string concatenation style
    # ...
]
```
