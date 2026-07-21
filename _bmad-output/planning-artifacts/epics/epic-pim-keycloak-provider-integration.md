---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'EPIC-PIM-KEYCLOAK'
epic_title: 'Keycloak Provider Integration — matrix parity + max capability surface'
date: '2026-07-21'
status: 'draft'
inputDocuments:
  - py-identity-model/src/tests/integration/provider_matrix.py
  - py-identity-model/src/tests/integration/conftest.py
  - py-identity-model/Makefile
  - _bmad-output/planning-artifacts/epics/epic-0e-spec-logout.md
  - _bmad-output/planning-artifacts/epics/epic-0e-spec-dynamic-registration.md
relatedIssues:
  - 'py-identity-model#216 (Dynamic Client Registration)'
  - 'py-identity-model#214 (RP-Initiated Logout)'
  - 'py-identity-model#442 (Back-Channel Logout)'
  - 'py-identity-model#414 (multi-provider matrix, T132)'
  - 'py-identity-model#242 (OIDC RP Certification tracker)'
---

# Epic PIM-KEYCLOAK: Keycloak Provider Integration

## Overview

Add **Keycloak** to `py-identity-model` as a first-class integration-test provider,
wired **exactly the way the existing providers are** (ORY, Descope, node-oidc-provider),
and configure its realm to expose **as much OIDC/OAuth capability surface as possible** so
the existing capability-gated integration suite *executes* against Keycloak rather than
skipping.

Keycloak does double duty:

1. **Provider-matrix parity** — a real, self-hostable OP alongside the current providers,
   surfaced in `provider_matrix.py`.
2. **Live-IdP evidence for the next cert round** — Keycloak natively emits back-channel
   logout tokens, supports RP-initiated logout, and supports RFC 7591/7592 dynamic client
   registration, so it provides live coverage for the Back-Channel Logout (#442),
   RP-Initiated Logout (#214), and Dynamic RP (#216) profiles. The deterministic OIDF
   conformance runs stay on the node-oidc-provider fixture; Keycloak is the live cross-check.

### How the current providers are wired (the pattern to mirror)

- **Fixture-backed provider (node-oidc-provider):** `test-fixtures/node-oidc-provider/`
  (`docker-compose.yml`, `Dockerfile`, `provider.js`, `package.json`); Makefile target
  `test-integration-node-oidc` does `docker compose … up -d --build --wait` → `pytest -m
  integration --env-file=.env.node-oidc` → `down`.
- **Credential-backed provider (Descope/ORY):** `.env.<name>` (or `.env.<name>.example`)
  carrying `TEST_DISCO_ADDRESS` + client creds; Makefile target
  `test-integration-<name>`. ORY ships `src/tests/integration/ory_create_client.sh` for
  client provisioning.
- **Capability gating:** integration tests are `@pytest.mark.integration`; session-scoped
  `conftest.py` fixtures read `TEST_DISCO_ADDRESS`, cache discovery/JWKS/tokens, and the
  `provider_capabilities` fixture skips tests a provider can't do. Enabling a capability in
  the realm is what makes the corresponding test run.
- **Matrix:** `provider_matrix.py` globs every `.env.*` with a `TEST_DISCO_ADDRESS` and
  prints a grant-type/feature grid from discovery. `make provider-matrix` renders it.

## Stories

---

### Story KC.1: Keycloak fixture + capability-maximal realm export

```yaml
story_id: KC.1
title: "Keycloak fixture + capability-maximal realm export"
epic: EPIC-PIM-KEYCLOAK
status: draft
priority: high
estimation: M
```

**User Story**

> As a py-identity-model maintainer,
> I want a self-contained Keycloak fixture with a realm export that enables the widest
> capability set Keycloak supports,
> so that Keycloak comes up with one command and the existing integration suite exercises
> real behavior instead of skipping.

**Deliverables**

1. `test-fixtures/keycloak/docker-compose.yml` — pins a specific Keycloak image tag, imports
   the realm on start (`--import-realm`), exposes discovery on a stable local address, and is
   `--wait`-healthy (mirror the node-oidc-provider fixture layout and lifecycle).
2. `test-fixtures/keycloak/realm-export.json` — realm `pim-test` configured to light up the
   maximum capability surface:
   - **Clients:** a confidential client using `client_secret_basic`; a **public PKCE** client
     (S256 enforced); a **service-account** client for `client_credentials`; a
     **private_key_jwt / client_secret_jwt** client for JWT client auth.
   - **Grants/flows:** authorization code + PKCE, refresh token, client credentials,
     **device authorization**, and **standard token exchange** where the image supports it.
   - **Endpoints/features:** token introspection, revocation, userinfo, **PAR** (RFC 9126),
     **JAR** (request/request_uri), **DPoP** where supported.
   - **Logout:** `end_session_endpoint` (RP-initiated), **back-channel logout** with
     `backchannel_logout_session_required=true`, and the back-channel/RP-init discovery
     metadata advertised.
   - **Dynamic registration:** registration endpoint reachable (anonymous registration or a
     documented initial-access-token flow), RFC 7591/7592.
   - **Users:** at least one seeded user with known credentials for code-flow tests.
3. `test-fixtures/keycloak/README.md` — what the realm enables, the seeded client/user
   credentials, and any capability the pinned image can't provide (documented, not silently
   dropped).

**Acceptance Criteria**

- **AC-KC.1.1** Given `docker compose -f test-fixtures/keycloak/docker-compose.yml up --wait`,
  when it returns healthy, then the realm's discovery document is fetchable at the documented
  `TEST_DISCO_ADDRESS` and advertises `authorization_endpoint`, `token_endpoint`,
  `userinfo_endpoint`, `introspection_endpoint`, `revocation_endpoint`,
  `registration_endpoint`, `end_session_endpoint`, and the back-channel logout metadata.
- **AC-KC.1.2** Given the realm export, when it is imported into a clean Keycloak container,
  then every client/user needed by the integration suite exists with no manual post-import
  steps.
- **AC-KC.1.3** Given a capability the pinned image cannot provide, when the realm is
  documented, then `README.md` names it explicitly and the matrix will show `✗` (never a
  false `✓`).

---

### Story KC.2: `.env.keycloak`, Makefile target, and matrix wiring

```yaml
story_id: KC.2
title: ".env.keycloak, Makefile target, and matrix wiring"
epic: EPIC-PIM-KEYCLOAK
status: draft
priority: high
estimation: S
```

**User Story**

> As a maintainer,
> I want Keycloak wired into the same env/Makefile/matrix machinery as the other providers,
> so that `make test-integration-keycloak` and `make provider-matrix` "just work".

**Deliverables**

1. `.env.keycloak.example` — `TEST_DISCO_ADDRESS` + client id/secret + seeded-user creds,
   matching the shape of the other providers' env files.
2. `Makefile` target `test-integration-keycloak` mirroring `test-integration-node-oidc`:
   compose `up -d --build --wait` → `pytest src/tests -m integration --env-file=.env.keycloak`
   → `down` (with the same down-on-failure guard).
3. `provider_matrix.py` picks Keycloak up automatically via its `.env.*` glob; verify with
   `make provider-matrix`.

**Acceptance Criteria**

- **AC-KC.2.1** Given `.env.keycloak` exists, when `make provider-matrix` runs with the
  fixture up, then a `keycloak` column appears in the grid.
- **AC-KC.2.2** Given the fixture is down, when `make provider-matrix` runs, then the keycloak
  column reports `[offline]` (never a crash).
- **AC-KC.2.3** Given `make test-integration-keycloak`, when it runs, then it brings the
  fixture up, runs the integration suite against Keycloak, and tears the fixture down whether
  the suite passes or fails.

---

### Story KC.3: Full capability-gated suite runs green against Keycloak

```yaml
story_id: KC.3
title: "Full capability-gated suite runs green against Keycloak"
epic: EPIC-PIM-KEYCLOAK
status: draft
priority: high
estimation: L
```

**User Story**

> As a maintainer,
> I want the entire existing integration suite to execute (not skip) against Keycloak wherever
> Keycloak supports the capability,
> so that Keycloak provides maximum real-world coverage of the library.

**Description**

Run the full `src/tests/integration/` suite against Keycloak. For each capability Keycloak
supports, the corresponding gated test must **execute and pass**: auth code + PKCE, token
validation (sync + async), refresh, introspection, revocation, userinfo, device
authorization + token exchange, private_key_jwt / client_secret_jwt, and DPoP/PAR/JAR where
the image supports them. Any library defect surfaced by real Keycloak behavior is fixed as
part of this story (with a unit test capturing the regression).

**Acceptance Criteria**

- **AC-KC.3.1** Given `make test-integration-keycloak`, when it runs, then no capability that
  Keycloak's discovery advertises is left `skip`ped by a gate — each advertised capability has
  an executing, passing test.
- **AC-KC.3.2** Given a real Keycloak behavior that diverges from the current library
  handling, when found, then the divergence is fixed in `core/` (sync + async parity) with a
  unit test, not worked around in the test.
- **AC-KC.3.3** Given the suite completes, when the matrix is rendered, then Keycloak shows
  `✓` for every capability its realm enables, and any `✗` is explained in the fixture README.

---

### Story KC.4: Extend the provider matrix with logout + registration columns

```yaml
story_id: KC.4
title: "Extend the provider matrix with logout + registration columns"
epic: EPIC-PIM-KEYCLOAK
status: draft
priority: medium
estimation: S
```

**User Story**

> As a maintainer,
> I want the capability matrix to report logout and dynamic-registration support,
> so that the published matrix reflects the next-round cert profiles and Keycloak's advantage
> over discovery-only providers.

**Deliverables**

1. Extend `provider_matrix.py` `FEATURES` with columns derived from discovery:
   `registration_endpoint`, `end_session_endpoint` (RP-initiated logout),
   `backchannel_logout_supported`, `backchannel_logout_session_supported`.
2. Refresh the published matrix snapshot across **all** configured providers + Keycloak and
   commit it to the integration README / docs.

**Acceptance Criteria**

- **AC-KC.4.1** Given the extended matrix, when rendered, then it includes the four new
  columns and Keycloak reports `✓` for each.
- **AC-KC.4.2** Given a provider whose discovery omits a field, when the matrix renders, then
  that cell is `✗` (not a crash, not a false `✓`).

---

### Story KC.5: Live logout + dynamic-registration integration tests vs Keycloak

```yaml
story_id: KC.5
title: "Live logout + dynamic-registration integration tests vs Keycloak"
epic: EPIC-PIM-KEYCLOAK
status: draft
priority: high
estimation: M
```

**User Story**

> As a maintainer pursuing the next cert round,
> I want live integration tests that exercise the new logout and registration primitives
> against Keycloak,
> so that #442/#214/#216 have real-IdP evidence beyond the deterministic conformance fixture.

**Description**

Depends on the core primitives landed by the conformance loop (`validate_logout_token`,
`build_end_session_url`, dynamic-registration client). Add capability-gated integration tests:

- **Back-Channel Logout (#442):** obtain a real Keycloak-emitted logout token and assert
  `validate_logout_token` accepts it and rejects the mutated-invalid variants.
- **RP-Initiated Logout (#214):** build the `end_session` URL from Keycloak discovery, drive
  logout, assert the `state` round-trip on the post-logout redirect.
- **Dynamic RP (#216):** register a client against Keycloak's registration endpoint, read /
  update / delete it (RFC 7591/7592), and use the issued credentials in a code flow.

**Acceptance Criteria**

- **AC-KC.5.1** Given Keycloak up, when the back-channel logout test runs, then a genuine
  Keycloak logout token validates and each single-rule-mutated token is rejected.
- **AC-KC.5.2** Given Keycloak up, when the RP-initiated logout test runs, then the built
  end-session URL is accepted by Keycloak and the `state` round-trip is verified.
- **AC-KC.5.3** Given Keycloak up, when the dynamic-registration test runs, then register →
  read → update → delete all succeed and the issued client can complete a code flow.
- **AC-KC.5.4** Given any of these capabilities is unavailable on the pinned image, when the
  test runs, then it `skip`s with a clear reason (never a false pass).

---

### Story KC.6: CI + documentation

```yaml
story_id: KC.6
title: "CI + documentation"
epic: EPIC-PIM-KEYCLOAK
status: draft
priority: medium
estimation: S
```

**User Story**

> As a maintainer,
> I want Keycloak validated in CI and documented like the other providers,
> so that regressions are caught and contributors know how to use it.

**Deliverables**

1. Add a Keycloak integration job to CI mirroring the node-oidc-provider job, and add
   `test-integration-keycloak` to the local `pre-push` chain (or document why it is excluded
   for runtime cost).
2. Update `src/tests/integration/README.md` and the docs site's provider page with the
   Keycloak setup, the refreshed matrix, and the seeded credentials.

**Acceptance Criteria**

- **AC-KC.6.1** Given a PR, when CI runs, then the Keycloak integration job runs and gates the
  PR the same way the node-oidc job does.
- **AC-KC.6.2** Given the docs, when reviewed, then Keycloak appears in the provider matrix and
  its fixture is documented end to end.

---

## Sequencing & dependencies

- KC.1 → KC.2 → KC.3 land first (fixture, wiring, full suite green) — this is the "add
  Keycloak the same way, max surface" deliverable and is independent of the cert profiles.
- KC.4 can land alongside KC.3.
- **KC.5 depends on the conformance loop** landing `validate_logout_token`,
  `build_end_session_url`, and the dynamic-registration client, so it runs *after* the
  corresponding profile lands (Back-Channel → RP-Init → Dynamic).
- KC.6 closes the epic once the suite is stable.

## Non-goals

- Front-channel logout and session-management RP profiles (dropped in tracker #242).
- Making Keycloak the deterministic conformance fixture — that stays node-oidc-provider;
  Keycloak is the live cross-check.
