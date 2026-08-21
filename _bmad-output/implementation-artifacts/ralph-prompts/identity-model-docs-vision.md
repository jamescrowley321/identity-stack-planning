# Handoff prompt — rewrite the README + docs to carry the identity-model vision

Hand this to a fresh Claude Code session working in `~/repos/auth/py-identity-model`
(the repo will be renamed to `identity-model` later; work in it under its current name).

---

```
ROLE: You are rewriting the documentation for identity-model — a family of
native OIDC/OAuth2 client libraries in Python, Go, and Rust — so it represents
the PROJECT'S VISION, not just a pile of per-directory READMEs. Today the docs
describe mechanics ("here is the Go package layout"); they should first make a
reader understand what this project IS, why it exists, and why it is different,
then help them use it.

=== READ FIRST (authoritative, in order) ===
1. ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
   — the vision, the problem, the market wedge, what-it-is / what-it-is-not. THIS is the source of truth for the vision.
2. py-identity-model/docs/py_identity_model_roadmap.md — the capability history and RFC coverage.
3. py-identity-model/spec/capabilities.md + spec/README.md — the cross-language capability matrix and the "one conformance contract, every language proves parity" model.
4. The current docs you are replacing/elevating: README.md (root), py/README.md, go/README.md, rust/README.md, spec/README.md, infra/README.md, docs/ (mkdocs site), mkdocs.yml.
5. py-identity-model/CLAUDE.md — repo layout + workflow rules (feature branch, `make lint`, conventional commits, PR).

=== THE VISION (summary — verify and deepen from the product brief) ===
The identity-protocol client space outside C#/.NET is fragmented: developers
cobble together 3–4 libraries per language to approximate what Duende's
IdentityModel/IdentityServer give the .NET world in one cohesive package.
identity-model brings that design philosophy — clean abstractions, a shared
capability taxonomy, RFC-first spec compliance — to Python, Go, and Rust (Node/TS
planned). The value is NOT any single-language port; it is the *abstraction and
standardization across languages*: the same mental model, the same capability
surface, the same compliance guarantees, idiomatic in each language, held to one
behavioral contract by a shared conformance spec ("build the conformance vectors
once, every language executes them"). The Python library is OIDF-certified and
production-proven (Apache-2.0); it is the reference the others are held to.
It IS a protocol *client* library. It is NOT an identity provider / authorization
server, and NOT framework middleware (though middleware — e.g. fastapi-identity-model
— is built on top). Credit Duende explicitly as the inspiration.

=== CURRENT REPO STATE (verify against the tree) ===
Polyglot monorepo: /py (Python core + fastapi-identity-model middleware; OIDF-
certified; on PyPI), /go (Go library), /rust (Rust library, crate rs-identity-model,
not yet on crates.io), /spec (language-neutral capability matrix + conformance
vectors + a per-language runner and cross-language coverage gate), /infra (shared
local IdP fixtures), /conformance (the Python library's OIDF cert harness). Go is
Core+Extended, Rust is Core (+ Extended in progress) — DO NOT claim more than is
implemented; check spec/capabilities.md's per-language status column and the code.

=== THE TASK ===
Produce documentation that leads with the vision and is genuinely good:
- Root README.md: the front door. Open with the problem and the vision (what this
  is, the cross-language value, the Duende lineage, RFC-first), THEN the languages
  and how to get each, THEN the shared-spec/conformance story (a real
  differentiator), THEN how to work in the repo. Honest capability status per
  language. Make someone who lands here understand *why this exists* in 30 seconds.
- Per-language READMEs (py/, go/, rust/): each stands alone as that language's
  library doc — install, quickstart with a real code example, capability list with
  RFC references, design notes — but each also connects back to the shared vision
  and the conformance contract. py/README.md is the PyPI long description; keep it
  strong for that audience.
- docs/ (mkdocs site): assess whether the structure and landing page carry the
  vision; improve the index/overview and navigation so the site isn't just an API
  dump. Keep `mkdocs build --strict` green.
- Consistency pass: one coherent voice and capability taxonomy across all of it.

=== HARD CONSTRAINTS / VOICE ===
- These are NATIVE libraries per language, never "bindings" (a binding wraps
  another language's implementation; these are independent idiomatic ports).
- NO internal-process narration in user-facing docs: no epic/story IDs (CONS-x,
  TH-x), no "imported from identity-model", no "interim, will change at the
  rename", no "churn accepted", no migration history. Write for the reader/user,
  not the reviewer. (A CHANGELOG may state changes factually.)
- Be HONEST: don't claim Go/Rust parity or crates.io/published status they don't
  have; don't oversell. Verify every capability claim against spec + code.
- RFC-first: tie capabilities to specific RFC / OIDC spec sections (the roadmap
  and spec/capabilities.md have the mapping).
- Credit Duende IdentityModel as the design inspiration (the product brief does).
- Apache-2.0. Repo rename to `identity-model` is pending — you may use the
  identity-model name in prose, but keep install commands / module paths / crate
  names accurate to what resolves TODAY (e.g. Go module
  github.com/jamescrowley321/py-identity-model/go).
- Work on a feature branch in a dedicated /tmp worktree; run `make lint` and
  `mkdocs build --strict` before committing; conventional commits; open a PR
  (docs-only, so it can be reviewed and merged normally). Do NOT touch code,
  release config, or workflows.

=== DEFINITION OF DONE ===
- A newcomer reading the root README understands what identity-model is, the
  cross-language value, and why it's different, before any install command.
- Each language README is a strong standalone doc with a working quickstart and
  honest capability status, connected to the shared conformance story.
- The mkdocs site's landing/overview carries the vision; `mkdocs build --strict`
  is green. No "binding", no process narration, no overclaiming anywhere.

FIRST ACTION: read the product brief and the current READMEs, then draft the root
README's vision-carrying opening and confirm the per-language capability status
against spec/capabilities.md before writing the rest.
```
