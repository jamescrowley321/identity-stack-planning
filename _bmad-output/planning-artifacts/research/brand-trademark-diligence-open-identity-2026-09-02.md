# Brand / Trademark Diligence — "Open Identity" / "open-identity" / "open-identity-model"

**Date:** 2026-09-02
**Subject:** Naming diligence for a developer identity-portability platform and its client library
**Author:** Research pass (web-sourced)

> **DISCLAIMER — this is brand/naming DILIGENCE, not legal advice.** It is a
> best-effort web search of secondary trademark databases (Justia, Trademarkia)
> and public sources. I could **not** reach USPTO TESS / TSDR live records
> directly (Justia and Trademarkia both returned HTTP 403 to automated fetches;
> findings below come from their search-index snippets). Confidence is flagged
> per claim. Before adopting a name commercially, get a real clearance search
> and an opinion from trademark counsel.

---

## Bottom line

**"Open Identity" is adoptable-but-muddy for a developer tool, with no clean
kill-shot trademark — but it is a weak, crowded, descriptive name that will live
in other people's shadow.** There is **no live U.S. federal registration for the
bare mark "OPEN IDENTITY," "OPEN IDENTITY STACK," or "OPEN IDENTITY PLATFORM" in
the identity-software classes (Nice 9 / 42)** that I could find. The historical
ForgeRock "Open Identity Stack" was a **marketing/product brand, never a
findable federal registration**, and it is effectively **retired** (rebranded to
"ForgeRock Identity Platform" ~2016, then folded into Ping post-2023). So the
"registered-trademark landmine" people worry about **does not appear to exist**.

The real risks are **not** a blocking registration; they are **confusion and
crowding**:

1. **An active OSS project literally named "Open Identity Platform"**
   (openidentityplatform.org) that operates *in exactly our space* (IAM/SSO:
   OpenAM/OpenDJ/OpenIDM/OpenIG forks). Unregistered, but well-known in the IAM
   community and SEO-dominant. This is the strongest collision for the bare
   *platform* name.
2. **The OpenID Foundation family of marks** — OPENID, OPENID CONNECT, OPENID
   CERTIFIED — which are LIVE, registered, actively enforced, and semantically
   almost identical ("OpenID" was literally coined as a contraction of *open
   identity*). Low legal-collision risk on the exact string, but real
   brand-confusion and enforcement-sensitivity risk if we lean into "identity"
   + "open" + certification language.

**Verdict:** *Safe-enough to adopt as a knowingly-weak descriptive mark for a dev
tool, IF* you (a) don't expect strong trademark protection, (b) differentiate
hard from the openidentityplatform.org OSS project and from OpenID, and (c) never
imply OpenID Foundation endorsement. If you want a defensible, ownable brand,
"Open Identity" is a poor choice — pick something distinctive and use "open
identity / identity portability" only as descriptive tagline copy.

**Library name is lower-risk:** `open-identity-model` is *available on every
registry checked* (PyPI, npm, crates.io — all 404) and reads as a descriptive
library name ("a model/library for open identity"), consistent with the existing
`py-identity-model` / `identity-model` family. It is meaningfully lower-risk than
the bare platform name because (i) it is a longer, more descriptive compound,
(ii) the practical concern for a library is package-namespace collision, not
brand confusion, and (iii) it does not present as a company/product brand.

---

## LIVE-trademark / well-known-entity landmines (ranked)

| # | Landmine | Type | In our classes (9/42)? | Status | Risk | Confidence |
|---|----------|------|------------------------|--------|------|------------|
| 1 | **Open Identity Platform** (openidentityplatform.org) — OSS IAM community; forks of ForgeRock OpenAM/OpenDJ/OpenIDM/OpenIG/OpenICF | Well-known **unregistered** name + active project, same domain (IAM/SSO) | N/A (no registration found) | **Active** (GitHub org, releases, Open Collective) | **Highest** — direct descriptive-name + same-market collision; owns the SEO | High |
| 2 | **OpenID / OpenID Connect / OpenID Certified** (OpenID Foundation) | **LIVE registered** trademarks + certification mark | Yes (identity software/services) | **Live/registered** (e.g., OPENID Reg. 5196131, reg. 2017-05-02) | **Medium** — not the same string, but semantically "open identity"; actively governed & enforced | High |
| 3 | **OPEN IDENTITY EXCHANGE** (OIX) | **LIVE registered** (Reg. 5131091, reg. 2017-01-31) | **No** — services class (35 or 45; sources conflict), not 9/42 | **Registered, but owner defunct** (OIX ceased operations 2024-08-31) → likely to lapse at 2027 renewal | **Low–Medium** — different (3-word) mark, different class, dying org | Medium |
| 4 | **"Open Identity Stack"** (ForgeRock, now Ping/Thoma Bravo) | Legacy product/marketing brand; **no federal registration found** | No registration found | **Retired** (rebranded ~2016; ForgeRock folded into Ping post-2023) | **Low** — no registration surfaced; abandoned-brand common-law claim is weak/stale | Medium |
| 5 | Bare **"OPEN IDENTITY"** application (OIX, Serial 85471772) | Abandoned application | Was filed for trust-framework software tools | **DEAD** — "Abandoned – failure to respond," 2012-10-09 | **None** (dead) | High |

**Net on the specific question asked:** *No* live registered "OPEN IDENTITY" /
"OPEN IDENTITY STACK" / "OPEN IDENTITY PLATFORM" mark in Nice class 9 or 42 owned
by Ping/ForgeRock or anyone else was found. The only live registration in the
"open identity" family is OIX's three-word **OPEN IDENTITY EXCHANGE** in a
*services* class, and OIX is defunct.

---

## 1. Registered trademarks

**Searched:** "OPEN IDENTITY," "OPEN IDENTITY PLATFORM," "OPEN IDENTITY STACK"
via Justia Trademarks and Trademarkia index snippets (direct page fetch 403'd;
USPTO TESS/TSDR not reachable by tool). Findings:

- **Bare "OPEN IDENTITY" — DEAD.** The closest bare-string filing is USPTO
  **Serial 85471772**, filed 2011-11-14 (part of OIX's early filing cluster, for
  "web-based software tools to assist in development of trust frameworks"),
  status **"602 – Abandoned–Failure To Respond Or Late Response," 2012-10-09.**
  No live bare "OPEN IDENTITY" registration surfaced. *(Confidence: High)*

- **"OPEN IDENTITY STACK" — no federal registration found.** Despite heavy 2013-era
  ForgeRock use ("ForgeRock Launches Open Identity Stack…"), no USPTO registration
  or live application for the string surfaced on Justia/Trademarkia. ForgeRock's
  registered marks are for **FORGEROCK** (Reg. 4560127, Serial 86122583, Section 8
  & 15 accepted) — *not* "Open Identity Stack." Treat "Open Identity Stack" as an
  **unregistered, now-retired product brand** with at most stale common-law rights.
  *(Confidence: Medium — absence-of-evidence via secondary indexes, not a TESS
  clearance.)*

- **"OPEN IDENTITY PLATFORM" — no federal registration found.** The prominent user
  of this name is the OSS community (see §2), which does **not** appear to hold a
  registration. *(Confidence: Medium)*

- **Adjacent LIVE registrations that exist:**
  - **OPEN IDENTITY EXCHANGE** — Reg. **5131091**, Serial 86611979, filed
    2015-04-28, registered **2017-01-31**, owner **Open Identity Exchange**.
    Class is a *services* class — sources conflict between **35** (trade-association/
    advertising/business) and **45** (security/personal services); either way **not
    the software classes 9/42.** *(Confidence: Medium on class; High that it's a
    services class, not 9/42.)*
  - **OPENID** — Reg. **5196131**, Serial 86611986, registered **2017-05-02**,
    owner **OpenID Foundation** (plus an older OPENID, Serial 78899244). *(High)*
  - **OPENID CERTIFIED** — certification mark, Serial 86613788, OpenID Foundation.
    *(High)*
  - **OIX**, **BUILDING TRUST IN ONLINE IDENTITY**, **OIX REGISTERED** — OIX-owned
    (Serials 85471789 / 85471793 / 85471820 / 86612388). *(Medium)*

- **International:** Not systematically searched. OpenID and OIX both operate
  internationally (OIX was UK-centric); assume corresponding foreign filings for
  OPENID at least. Flag for counsel if launch is global. *(Low confidence /
  not investigated.)*

## 2. Existing "Open Identity *" entities & products

- **Open Identity Platform (openidentityplatform.org)** — *Most important.* An
  **active** open-source IAM community that forked ForgeRock's stack after ForgeRock
  went closed-source: OpenAM, OpenDJ, OpenIDM, OpenIG, OpenICF. Live website, active
  GitHub org (`github.com/OpenIdentityPlatform`), Open Collective funding, and
  explicit "ForgeRock alternative / migration" positioning. It is in **exactly our
  problem space** (IAM/SSO/identity) and **owns the search results** for "open
  identity platform." No registration found, but strong common-law presence and
  developer mindshare. **This is the primary confusion/enforcement-adjacent risk
  for a bare "Open Identity" platform name.** *(Confidence: High)*

- **ForgeRock / Ping "Open Identity Stack"** — Legacy 2012–2015 brand for
  ForgeRock's 100% open-source stack. **Retired**: ForgeRock rebranded to
  "ForgeRock Identity Platform" (~2016), was acquired by Thoma Bravo (2023) and
  merged into **Ping Identity**; current Ping/ForgeRock product naming is
  PingOne/PingGateway/"ForgeRock Identity Platform," not "Open Identity Stack." Old
  blog-tag/press pages persist but it is not an actively marketed brand. Low live
  risk. *(Confidence: Medium)*

- **Open Identity Exchange (OIX, openidentityexchange.org)** — Identity
  trust-framework **nonprofit**, founded 2010 (Google/PayPal/Equifax/VeriSign et
  al.), owns the LIVE "OPEN IDENTITY EXCHANGE" registration (§1). **Ceased
  operations 2024-08-31** (membership decline). A dormant/dissolving org still
  holding a registered *services*-class mark: real name-family overlap but different
  string, different class, and a non-enforcing (defunct) owner. Its registration
  faces the 10-year renewal window around Jan 2027 and may lapse. *(Confidence:
  High on closure; Medium on renewal outcome.)*

- **Others named "Open Identity …":**
  - **OpenID / OpenID Foundation** — see §3.
  - **"open-identity" (npm)** — a dormant one-developer Capacitor auth plugin (v0.0.2,
    2019). Squats the bare npm name but is abandoned. *(High)*
  - Wren Security ("Wren:AM") — another ForgeRock fork, does **not** use "Open
    Identity" (renamed specifically to avoid ForgeRock conflict) — useful precedent
    that the community treats these names as sensitive. *(Medium)*

## 3. OpenID Foundation mark

- **What they own / govern:** OPENID, OPENID CONNECT (word marks) and OPENID
  CERTIFIED (a **certification mark** — the mark certifies conformance to OIDF
  protocols). Governed by the **OpenID Foundation Trademark Usage Policy (dated
  2017-06-19)** and the "OpenID Trademark and Service Mark License." *(High)*

- **Usage rules (per the policy):**
  - "OpenID" may appear in a product name **only as a descriptive modifier** when
    the product genuinely implements the technology — **not** as the primary brand.
  - **Company names** and **domain names** built primarily around "OpenID" are
    **restricted / prohibited** for commercial use without OIDF approval.
  - **"OpenID Certified"** may be used **only by implementations that have actually
    passed OIDF certification**, with the official mark, accurate scope, correct
    version, and attribution. Falsely implying certification or endorsement is
    prohibited. So: *yes, a genuinely certified project may say "OpenID Certified"
    freely — within those conditions; a non-certified one may not.* *(High)*

- **Confusion risk vs. "Open Identity":** *Moderate.* "OpenID" was coined as a
  play on **"open identity,"** so the semantic overlap is real and a security/IAM
  audience will mentally associate them. However, as marks the two are
  distinguishable — one word vs. two, different sound/appearance — so a
  **likelihood-of-confusion** collision on the string alone is not strong.
  The practical guidance: it's fine to *be* OpenID-compatible and say so, but
  **do not brand around "OpenID," do not use OIDF logos/certification language
  unless certified, and avoid taglines that blur "Open Identity" into "OpenID."**
  OIDF is an active mark-steward; don't hand them a reason to send a letter.
  *(Confidence: Medium — this is a judgment call, get counsel for a launch.)*

## 4. SEO reality check

- **"open identity platform"** → page 1 is **almost entirely the OSS project**:
  openidentityplatform.org (home + OpenAM/OpenIDM/OpenIG/OpenDJ subpages), its
  GitHub org, its Open Collective, plus Wikipedia (OpenAM/OpenIDM/OpenDJ). A new
  entrant would be **buried under an established same-space incumbent** and would
  not realistically rank for its own name. *(Confidence: High)*

- **"open identity"** → more mixed but still **owned by established identity
  entities**: OIX, OpenID history/Wikipedia, ForgeRock "Open Identity Stack" legacy
  pages, the Open Identity Platform GitHub, and identity-portability explainer
  content (dock.io, didit). No gap for a newcomer to own the term. *(High)*

- **One-line SEO read:** *You would not own "open identity" — you'd rank behind the
  openidentityplatform.org OSS project, OpenID, and OIX; the name is SEO-saturated
  by incumbents in your exact category.*

## 5. Net read

- **Platform name "Open Identity" / "open-identity":** *Safe-enough legally* (no
  blocking live registration in classes 9/42 found; the scary "Open Identity Stack"
  was never a findable registration and is retired), **but weak and crowded.** It is
  a descriptive mark you won't be able to protect well, it collides
  head-on with an active same-space OSS project (Open Identity Platform), and it
  sits adjacent to aggressively-governed OpenID marks. Adopt only with eyes open to
  "weak/descriptive + lives in a shadow"; prefer a distinctive coined brand if you
  want something ownable and SEO-winnable.

- **Library name "open-identity-model":** **Lower risk than the bare platform name.**
  Available on PyPI, npm, and crates.io (all 404 = unclaimed as of this check); reads
  as a descriptive library in the existing `identity-model` / `py-identity-model`
  family; the operative risk for a library is namespace collision (none found), not
  brand confusion. Reasonable to proceed. (Bare `open-identity` on npm is taken by a
  dormant 2019 plugin — another reason the `-model` suffix is the safer choice.)

- **If you adopt "Open Identity" anyway, concrete guardrails:**
  1. Differentiate visibly from **openidentityplatform.org** (different logo,
     tagline, and a "not affiliated with the Open Identity Platform / ForgeRock /
     Ping" note if confusion is likely).
  2. Say "OpenID Connect compatible / OpenID Certified" **only** when true and per
     OIDF policy; never imply OIDF endorsement; don't build the brand around "OpenID."
  3. Don't rely on trademark protection for "Open Identity" — treat it as descriptive
     copy, and reserve a distinctive brand element (a coined product name/wordmark)
     you *can* protect and rank for.
  4. Get a professional clearance search + counsel opinion before any commercial /
     funded launch, especially if international.

---

## Package-namespace check (2026-09-02)

| Name | PyPI | npm | crates.io |
|------|------|-----|-----------|
| `open-identity-model` | Available (404) | Available (404) | Available (404) |
| `open-identity` | Available (404) | **Taken** (dormant v0.0.2, 2019) | Available (404) |

## Sources (with confidence)

- Justia Trademarks index snippets — OPEN IDENTITY EXCHANGE (Reg. 5131091 / Serial
  86611979), bare OPEN IDENTITY abandoned application (Serial 85471772), OPENID
  (Reg. 5196131), OPENID CERTIFIED (Serial 86613788), FORGEROCK (Reg. 4560127):
  https://trademarks.justia.com/ *(pages 403'd to direct fetch; data from search
  index — Medium confidence, verify in TESS/TSDR)*
- OpenID Foundation Trademark Usage Policy (2017-06-19):
  https://openid.net/intellectual-property/trademark-license/ *(High)*
- OpenID Foundation certification mark / how-to-certify:
  https://openid.net/certification/mark/ , https://openid.net/certification/ *(High)*
- Open Identity Platform (OSS): https://www.openidentityplatform.org/ ,
  https://github.com/openidentityplatform ,
  https://www.openidentityplatform.org/forgerock-alternative *(High)*
- ForgeRock "Open Identity Stack" (legacy):
  https://www.pingidentity.com/en/company/ping-newsroom/forgerock-archives/news/forgerock-launches-open-identity-stack-to-protect-enterprise-cloud-social-and-mobile-applications.html ,
  https://opensource.com/business/13/4/forgerock-open-identity-stack *(Medium)*
- OIX closure (2024-08-31): https://www.biometricupdate.com/202409/oix-closes-leaving-legacy-of-digital-id-ecosystem-development ,
  https://www.thinkdigitalpartners.com/news/2024/09/03/oix-disbands-after-drop-in-member-numbers/ ,
  https://en.wikipedia.org/wiki/Open_Identity_Exchange *(High)*
- OpenID etymology / OpenID vs OpenID Connect: https://en.wikipedia.org/wiki/OpenID *(High)*
- Package registries: pypi.org/pypi/{name}/json, registry.npmjs.org/{name},
  crates.io/api/v1/crates/{name} — checked 2026-09-02 *(High)*

> Reminder: diligence, not legal advice. Trademark-database claims here rest on
> secondary-index snippets because USPTO TESS/TSDR and full Justia/Trademarkia
> records were not directly reachable; confirm status, class, and live/dead state
> in TESS/TSDR before relying on them.
