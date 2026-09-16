# Contributing

This repository holds plans, not code, so a contribution here is a change to a *plan*: a
correction, a decision recorded, an epic decomposed, or research added. The bar is that a
reader — human or agent — can check what you wrote.

If you are an AI agent, read [AGENTS.md](AGENTS.md) first; it carries the operating rules in
full and this document does not repeat them.

## Before you write

**Verify against source, not against another document.** The planning documents are the thing
most likely to be wrong — a 2026-09-15 audit found the roadmap asserting a repository
consolidation had been deferred when it had already shipped. When a document and the tree
disagree, the tree wins and the document gets fixed.

**Check whether a GitHub issue already exists.** Work is tracked in the repository that will do
it, not here.

## The rules that get changes rejected

**Status never goes in markdown.** GitHub issues are the source of truth for what is open, in
progress, or done. Planning artifacts hold the rationale and the decomposition, and link to
their tracking issue. `task-queue.md` and `sprint-plan.md` were retired on 2026-09-05 after
drifting from the issues they duplicated; do not reintroduce that pattern in any form.

**Do not invent an identifier scheme.** No `TH-1.5`, no `T300`, no `FR-PIM-2`. Work is named by
GitHub issue number, written `repo#N` — `identity-model#573`, never a bare `#N`. Identifiers
that mean the same thing outside this repository are welcome: RFC numbers, CVE ids, OIDF
profile names, provider claim names.

**Date anything that will age**, and say what you measured it against.

## Writing style

Documents are read by people and by agents, so write to be checked:

- Evidence before conclusion. A table of *claim versus actual* beats prose assurance.
- Say when something was verified and how.
- Link rather than restate. If a fact is owned by a sibling repository, link to it — restated
  facts are what drift.
- Keep front-matter to the four keys (`title`, `description`, `status`, `last_verified`);
  GitHub renders front-matter as a table above the content, so a long block looks bad there.

## Making the change

```bash
git switch -c docs/<short-description>
# edit
npm run build          # builds the site; fails on any broken internal link
```

- **Conventional commits**, Angular convention: `docs:`, `feat:`, `fix:`, `chore:`, `ci:`.
- **Always work on a feature branch.** Never commit to `main`.
- Open a pull request. Every change lands that way.

The site build is the only mechanical check, and it is real: `onBrokenLinks` is set to `throw`,
so a link to a file that does not exist fails the build rather than shipping a dead link.

## Adding a document

1. Write it in `docs/` with the four front-matter keys.
2. Add it to `sidebars.ts` so it appears on the published site.
3. Run `npm run build` to confirm it parses and its links resolve.

A document that is a dated design decision follows the form of
[`reground-2026-09-15-design.md`](docs/reground-2026-09-15-design.md): evidence first, then the
plan, then explicit scope boundaries.

## Retiring a document

Delete the file and add a row to [`_archive/README.md`](_archive/README.md) recording what it
was, what superseded it, and the `git show` command that prints it back. The archive index is
tracked; the artifacts themselves live in git history by design.

## Security

There is no code here. Vulnerabilities in the software these plans describe belong in that
repository — see [SECURITY.md](SECURITY.md).
