# Retrospective blind-peer-review sweep

Run the blind-peer-review lenses against pull requests that **already merged without
review**, and file a GitHub issue for every finding that survives verification.

Run this in a **fresh session with no prior conversation context**. You are auditing code
that shipped; you must not have absorbed the reasoning that produced it.

**Default target:** the last 20 merged PRs in `jamescrowley321/identity-model`. Substitute a
different repo or window if told to.

---

## Why this exists

A 2026-09-15 audit of `identity-model` found that **16 of the last 20 merged PRs had zero
reviews**, and that the integration-test gate in `phases/pr.md` had been matching
pre-consolidation paths — so it produced an empty `CODE` for every Rust and Go PR and
**passed silently**. A gate that cannot fire reads as a passed check.

One PR from that window (`#671`, Rust token revocation) was then reviewed properly. Five
lenses found **five real defects**, two rated MUST FIX, including a fail-open path the Go
reference already guarded and the Rust port had dropped. That is the expected yield. Assume
the other unreviewed PRs are comparable and work accordingly.

---

## How the lenses work — read this before dispatching anything

**The lens agents have no shell.** They cannot run `git diff`. This is deliberate: a lens
marinates in untrusted diff content, so it holds no capability to act on it. You do the
shell work first.

For each PR you must write the diff to a patch file and tell each lens to read it. Dispatch
a lens without doing that and it will correctly refuse — and **return an empty findings
list**, which is indistinguishable at a glance from "found nothing."

> **An empty `findings` array means "not reviewed" until you have confirmed the lens
> actually read a patch.** Check each lens's `summary` field. If it says the patch was
> absent, that PR is unreviewed — re-run it. Never record such a lens as a pass.

Available lens agent types: `blind-peer-review:cold_read`, `:edge_case`, `:acceptance`,
`:security`, `:red_team`. There are also `:policy`, `:owasp_web`, `:owasp_llm` — skip those
unless the diff has the matching surface.

---

## Procedure

### 1. Build the work list

```bash
cd ~/repos/auth/py-identity-model   # dir name is py-identity-model; GitHub repo is identity-model
gh pr list --repo jamescrowley321/identity-model --state merged --limit 20 \
  --json number,title,mergedAt,reviews,additions,deletions,mergeCommit
```

Record for each: number, title, review count, size, merge commit.

**Triage — do not review all twenty.** Rank by risk and skip what cannot carry a defect
worth an issue:

| Skip | Why |
|---|---|
| Dependabot / `ci(deps)` version bumps | A lockfile or action-SHA bump has no logic to review |
| Diffs under ~20 lines that touch no source | A one-line CI tweak is not worth five agents |
| PRs with a real review already (`reviews > 0`) | Check what the review covered before deciding; a rubber-stamp still counts as unreviewed |

**Prioritise:** large diffs, anything under `py/src/`, `go/pkg/`, `go/internal/`,
`rust/src/`, `conformance/`, and anything touching tokens, JWT, JWKS, client auth, DPoP,
mTLS, PAR, FAPI, or CI security gates.

State your triage decisions before you start, with the reason for each skip. Silently
dropping a PR is the failure this whole exercise exists to correct.

### 2. Per PR — write the patch, then dispatch

```bash
mkdir -p /tmp/retro-review/pr-<N>
gh pr diff <N> --repo jamescrowley321/identity-model > /tmp/retro-review/pr-<N>/review-diff.patch
wc -l /tmp/retro-review/pr-<N>/review-diff.patch     # confirm it is non-empty
```

Then dispatch the lenses **concurrently for that one PR**, each with this shape:

> LOCAL MODE — this pull request has already merged; there is nothing to block.
> `__PR_NUMBER__` → `<N>`.
>
> The full diff is at `/tmp/retro-review/pr-<N>/review-diff.patch`. Read that file first.
>
> Also load the shared review contract at
> `/home/james/.claude/plugins/cache/blind-peer-review/blind-peer-review/*/contracts/shared_review_contract.md`
>
> Repo root: `~/repos/auth/py-identity-model`. Read surrounding source on disk ONLY to
> confirm a finding. Do NOT modify any file.
>
> This is a polyglot OIDC/OAuth2 **client library** used for production token validation.
> `py/` is the reference implementation and is OpenID-certified; `go/` and `rust/` are
> ports. **Where this diff implements a capability another language already has, compare
> against that implementation** — a guard the reference has and the port dropped is the
> highest-value finding available here, and exactly what the 2026-09-15 review found.
>
> Your FINAL message must be the contract's JSON object and nothing else — no prose, no
> markdown fences.

**Pace it.** One PR's lens set at a time, or at most two PRs in flight. Twenty PRs × five
lenses is a hundred agent runs; that is real spend and it will exhaust context if you fan
out wider. Finish a PR — verify, file, record — before starting the next.

### 3. Verify every finding before it becomes an issue

**Do not file what a lens told you. File what you confirmed.**

For each MUST FIX and SHOULD FIX:

- Open the file and read the code at the cited line. Does it say what the finding says?
- If the finding claims a cross-language divergence, **read the other language** and quote it.
- If it claims a test is vacuous, construct the input that would pass it wrongly.
- If it claims a path is unreachable or a guard absent, grep for the guard.

The 2026-09-15 review was accurate on every load-bearing claim, and it was still right to
check all of them — one earlier scan in that same session mis-read *"Resolved Decision #9"*
as an issue reference and scored a live document as spent. Lenses are careful readers, not
oracles.

**Drop a finding that does not survive.** Say so in the summary rather than filing it.

### 4. Deduplicate

Three lenses independently found the same empty-token defect on `#671`. That is **one
issue**, not three — cite all three lenses as corroboration, which raises confidence rather
than issue count.

Before filing, check what already exists:

```bash
gh issue list --repo jamescrowley321/identity-model --state open --limit 200 \
  --search "<keyword from the finding>"
```

### 5. File

**Severity gate: MUST FIX and SHOULD FIX only.** NITPICKs go in the summary report, never
into the tracker — a backlog of style notes buries the real findings.

One issue per confirmed defect:

```
Title:  <type>(<area>): <the defect, stated plainly>
Body:
  Found by a retrospective blind-peer-review sweep of PR #<N>, which merged
  <date> with <n> reviews.

  ## The defect
  <what is wrong, with file:line — quote the code>

  ## Why it matters
  <the concrete failure: inputs -> wrong behaviour. If it is a security
   finding, the attack chain. Not "this is bad practice".>

  ## Cross-language position
  <does py/go/rust do this correctly? quote the one that does. If this is a
   port dropping a reference guard, say so — that is a parity break.>

  ## Verified
  <what you personally checked, and how — the command or the file read>

  ## Corroboration
  <which lenses found it>
```

Label `bug`, `security`, or `test-quality` as fits, and link the originating PR.

**Do not fix anything.** This sweep produces issues. A fix is a separate change with its
own review — and fixing while sweeping is how a twenty-PR audit becomes one PR and
nineteen skipped reviews.

### 6. Report

A table: PR → lenses run → confirmed findings → issues filed → skipped-with-reason.

Then state plainly:

- Which PRs you did **not** review and why.
- Any lens that failed to read its patch, and on which PR.
- Whether the yield suggests the remaining unreviewed history needs the same treatment.

---

## Rules

- **Never file an unverified finding.** A wrong issue costs more than a missed one.
- **Never record an empty findings list as a pass** without checking the lens summary.
- **Never fix code.** Issues only.
- **Never close or edit an existing issue** to make room for yours; comment instead.
- Identifiers are GitHub issue numbers. Do not invent code schemes; write `repo#N`, never a
  bare `#N`.
- If a finding is in a sibling repo (`identity-stack`, `terraform-provider-descope`), file
  it there, and do not edit that repo.
- Stop and ask if the sweep turns up something that looks like an **active** exploitable
  vulnerability in shipped code rather than a latent defect — that is a disclosure
  decision, not a backlog entry.
