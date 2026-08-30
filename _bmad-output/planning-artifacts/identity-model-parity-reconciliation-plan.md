# identity-model — Cross-Language Parity Reconciliation Plan

**Companion to:** `identity-model-feature-parity-report-2026-08-29.md` (the evidence).
**Repos:** code = `jamescrowley321/identity-model` (`py/ go/ rust/`); this plan lives in the planning repo.
**Status:** proposed 2026-08-29. Awaiting owner sign-off on §3 (the four inversions) before P0 starts.

---

## 1. Purpose

The three native libraries have diverged. Python is a near-complete OIDC/OAuth2 client; Go covers the core plus a slice of the extended tier; Rust is core-only. The report quantifies it (Python ≈100%, Go ≈45%, Rust ≈25% of the reference surface) and — importantly — found **four inversions** where Python trails the ports. This plan defines *what parity means*, *how it is enforced mechanically*, and *the sequenced work* to converge the three.

## 2. Principles

1. **Reconciliation is bidirectional, not "port everything to match Python."** Python is the *feature* reference, but the report shows Go/Rust independently implement three things Python lacks (`client_secret_post`, id-token `nonce` validation, RFC 8414 issuer match) and Rust validates `azp`. Parity means a *single agreed contract*, then every language conforms — including Python adopting what it's missing.
2. **The contract is `spec/`, and parity is enforced by the coverage gate, not by review.** Every capability is defined once as neutral vectors in `spec/conformance/*.json` with a canonical error-code outcome; the existing `spec-vector-coverage` CI gate already fails when a language skips a vector. Any capability we agree on gets vectors added, so drift becomes a red gate, not a stale doc.
3. **`spec/capabilities.md` becomes generated, not hand-maintained.** It is currently wrong (marks Python "planned" for shipped features). The status column should be emitted by the conformance runners, so it can never lie again.
4. **Tiers gate scope.** Core parity is non-negotiable; Extended parity is the near-term goal; Advanced/FAPI parity is explicitly optional per language and owner-scheduled.
5. **Idiomatic, not transliterated.** Each language stays idiomatic (Go options funcs, Rust builders, Python sync+async) — parity is *behavioral*, proven by shared vectors, not structural.

## 3. Owner decisions required BEFORE P0 (the four inversions)

Each of these is a place the "reference" is behind. "Make ports match Python" would delete real, correct behavior — so the direction must be chosen deliberately. Recommendation in **bold**.

| # | Capability | Today | Recommendation |
|---|-----------|-------|----------------|
| I-1 | `client_secret_post` client auth | Go ✅ Rust ✅ **Py ❌** | **Python adopts it.** Real providers require secret-in-body; it's a small, standard addition. |
| I-2 | id-token `nonce` validation | Go ✅ Rust ✅ **Py ❌** | **Python adopts it** (opt-in `expected_nonce`, default off — backward-compatible per the hardening-config convention). OIDC Core §3.1.3.7 requires it for the auth-code+id_token flow. |
| I-3 | RFC 8414 issuer-identifier match (`issuer == requested`) | Go ✅ Rust ✅ **Py 🟡** | **Python adopts it** as a default-on discovery check (mix-up defense); it currently only checks issuer *format* + endpoint authority. |
| I-4 | `azp` validation | **Rust ✅** Py ❌ Go ❌ | **Standardize as opt-in in all three** (validate `azp == client_id` only when the caller supplies an expected client id and `azp` is present). Rust's current always-on-when-aud-set behavior is too eager — soften to opt-in. |

**These four ship as P0 because they are cheap and they change the *contract*** — every later phase assumes the contract is settled.

## 4. Phased workstreams

Each phase = a tracking issue in `jamescrowley321/identity-model`, its member items = child issues, each item lands as: **spec vector(s) added → all three (or the in-scope) languages implement → `spec-vector-coverage` + conformance green**. Merge per repo policy; no auto-merge.

### Phase P0 — Contract & cheap correctness (all languages) — **~1–2 wk**
The settle-the-contract phase. Small diffs, high value, unblocks everything.
- **I-1..I-4** — the four inversions above (per §3 decisions).
- **B5 Duplicate-`kid` try-all** — on verify failure, iterate *all* keys with the matching `kid` before erroring (key-rotation correctness). All three today pick the first match.
- **C7 ID-token vs access-token discrimination** — bring the `scope`-present discriminator (from the Python F-07 work) into the shared validators; add `token_class` option. Currently in *no* language's shared validator.
- **C6 `at_hash` / `c_hash`** — implement token/code hash binding (opt-in, needed for hybrid/implicit-adjacent flows). Absent everywhere.
- **Vectors:** add `spec/conformance/` cases for each so the gate enforces them.
- **Exit:** all three pass the new vectors; `capabilities.md` regenerated (see §5); inversions resolved.

### Phase P1 — Operational parity (Go + Rust catch up to Python) — **~2–3 wk**
Make Go/Rust production-grade, not just correct.
- **H3 Cache-Control-derived TTL** — parse `Cache-Control: max-age` → `*_CACHE_TTL` env → clamped default. Go/Rust use a static 24 h today; this is a real behavioral divergence against a rotating provider.
- **I2 HTTP retry/backoff** — 429/5xx exponential backoff honoring `Retry-After`, `HTTP_RETRY_*` env. Absent in Go/Rust.
- **I3 SSL/CA-bundle env config** — `SSL_CERT_FILE`/`CURL_CA_BUNDLE`/`REQUESTS_CA_BUNDLE`. Absent in Go/Rust.
- **H6 Cache metrics** — hit/miss/refresh counters in Go/Rust; **and finish Python's sync-path instrumentation** (Python only instruments async today).
- **Rust-specific:** widen JWT algorithms to **ES512 + EdDSA** (Rust is the narrowest — RS/PS/ES256+384 only); add **discovery-cache single-flight** (Rust coalesces JWKS but not discovery).
- **A5 SSRF hardening** — bring Go/Rust up to Python's endpoint-authority binding + internal-IP-literal rejection (they only do HTTPS + body-cap today).

### Phase P2 — Extended-tier parity (Rust is the gap) — **~3–5 wk**
Bring Rust to Go's extended level; fill Go's remaining extended holes.
- **Rust:** Introspection (RFC 7662), Revocation (RFC 7009), Token Exchange (RFC 8693), DPoP (RFC 9449, full — Go's implementation is the template incl. server-side verifier).
- **Go + Rust:** `refresh_token` grant (both only model the response field today).
- **Go + Rust:** device authorization (RFC 8628) — Python-complete.

### Phase P3 — Advanced / FAPI parity (Go + Rust) — **owner-scheduled, large**
Explicitly optional per language; sequence only if the roadmap wants FAPI-grade Go/Rust clients.
- mTLS + cert-bound tokens (RFC 8705), `private_key_jwt` (RFC 7523) + `client_assertion`, PAR (RFC 9126), JAR (RFC 9101), JARM, RFC 9207 `iss`, RP-initiated + back-channel logout, Dynamic Client Registration (RFC 7591/7592), FAPI 2.0 validators, authorize-URL builder + callback parsing.
- **Back-port to Python (any phase, cheap):** the uniform hardening the ports added — 1 MiB body caps on every endpoint, HTTPS→HTTP redirect-downgrade refusal, duplicate-claim-key rejection, reserved-parameter injection guards. Python has some of these (JWKS caps, guarded responses) but not uniformly.

### Common gaps deferred (all three, low priority)
- state/nonce **generation** helpers (all validate, none generate).
- Front-channel logout (Python has RP-init + back-channel only).

## 5. Mechanical enforcement (do this in P0)

- **Regenerate `spec/capabilities.md`** from the conformance runners' output. A capability's status per language = derived from whether that language's runner executes+passes that capability's vectors (`implemented` / `in-progress` / `planned` / `n/a`). Kill the hand-maintained status column. (The current doc's Python="planned" rows are the proof it can't be trusted by hand.)
- **Extend `spec/conformance/` vectors** to cover the P0 items (C6/C7/B5 and the four inversions) so parity for them is a red/green gate.
- **The `spec-vector-coverage` CI job already gates every language on every executable vector** — leverage it: adding a vector automatically forces all in-scope languages to implement or explicitly mark `n/a`.

## 6. Sequencing & ownership

- **P0 in-session as stacked PRs** (per the "prefer in-session over loops" convention) — small, well-scoped, owner-reviewed. Start once §3 is signed off.
- **P1/P2 per-language ralph loops** are reasonable (larger, mechanical) — one workstream per repo at a time; owner merges; fresh-context adversarial review on each PR.
- **P3 owner-scheduled**, likely its own epic set.
- Conformance is now a **required check on every identity-model PR** and gates releases, so every parity PR proves conformance before merge.

## 7. Definition of done

- The four inversions are resolved to the agreed direction; `spec/capabilities.md` is generated and truthful.
- Core-tier parity is 100% across all three, enforced by vectors.
- Extended-tier parity: Rust reaches Go's level (P2 complete).
- Every parity claim is backed by a shared vector the coverage gate enforces — no hand-maintained status can drift again.
- Advanced/FAPI parity is an explicit, owner-scheduled decision per capability, not an accidental gap.
