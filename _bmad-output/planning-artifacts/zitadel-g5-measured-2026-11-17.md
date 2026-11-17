# Zitadel at gate G5: measured answers (2026-11-17)

The answers [`governed-brain-implementation-plan.md`](../../docs/governed-brain-implementation-plan.md)
asks of a provider at gate G5, for Zitadel, from the end-to-end run of
[identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570). The plan is
[`epic-zitadel-provider.md`](epics/epic-zitadel-provider.md); this file replaces its "read" and
"measured in part" answers with what the run measured.

**What was measured.** Zitadel `v4.20.3` (API and Login V2) in the identity-stack compose profile
`zitadel`, with `infra/zitadel` applied, `make zitadel-seed` run and the shipped backend and SPA
in front of it. The suite is `backend/tests/e2e_zitadel/` (`make test-e2e-zitadel`, CI job
`E2E Tests (Zitadel)`); the machine-user token is checked by
`backend/tests/integration_zitadel/test_zitadel_machine_token.py`. Limits found are in
identity-stack `docs/zitadel.md`, "End-to-end".

## Flow matrix

| Flow | Answer | Basis |
|---|---|---|
| Authorization code with PKCE, SPA (public client) | Works. Login V2's login name and password pages, `S256` only | Measured: e2e, every user |
| Refresh (`offline_access`) | Works. The SPA renews before the 15-minute access token expires | Measured: e2e (refresh token issued and exchanged) |
| RP-initiated logout | Works for the session: the next sign-in asks for the password. Login V2 still offers the login name it saw (account list) | Measured: e2e |
| What logout revokes | Neither token. After logout the old refresh token is still exchanged at the token endpoint (200), and the old JWT access token is still accepted by the backend until it expires | Measured: e2e, recorded without asserting |
| Client credentials (machine user) | Works, JWT when the machine user asks for it. A token with the project-audience scope passes discovery, keys, signature, issuer and audience; the backend's client binding refuses it | Measured: integration |
| Token binding to the SPA | Needed and built: a human token's `aud` lists every application of the project, so the SPA is told apart by `client_id`. A live ID token and a live token of the second application each get 401 | Measured: e2e |
| Self-registration in a tenant organization | Refused by Login V2 when the organization's policy has `allow_register` off. The user API is not refused (the Login V2 service user can still create users) | Measured: e2e (register page), `infra/zitadel` check |
| Request-bound authorization detail (RAR) | Absent. Not advertised | Measured (discovery), unchanged from the epic |
| Delegated exchange (RFC 8693) | Present, experimental, off by default | Read, unchanged from the epic |
| Sender-constrained tokens (DPoP, mTLS) | Absent. Neither advertised | Measured (discovery), unchanged from the epic |

Zitadel still fails two of the three G5 flow-matrix rows (request-bound detail and
sender-constraint); delegated exchange is there but experimental. Standard login, refresh, logout
and client credentials work.

## Tenancy mapping as built

| Canonical | Zitadel | How |
|---|---|---|
| Tenant | Organization | `tenants.external_org_id` holds the organization id, `external_org_provider_id` the `zitadel` provider row. `make zitadel-seed` links `acme` and `globex`; the admin adapter (`SYNC_PROVIDER=zitadel`) creates the organization of a tenant made through the API, with the tenant's id as its id |
| Membership and roles | None | Canonical only. The project's roles mirror the canonical names and are granted to nobody; no token carries a role the backend reads |
| First membership | The token's organization claim | `urn:zitadel:iam:user:resourceowner:id`, present when the SPA asks for scope `urn:zitadel:iam:user:resourceowner`. A first login in a linked organization, with an email in the tenant's `domains`, creates the canonical user as `member` of that tenant and nothing else. An unlinked organization gets 403 and nothing is created |
| Active tenant on a request | `X-Tenant-ID` | Zitadel puts no tenant in the token. The SPA's switcher picks among the canonical memberships; the backend checks the header against them. Measured: `admin` in `acme`, 403 on the same route after switching to `globex`, `viewer` route 200 there |
| User | Human user in the tenant's organization | Linked by `idp_links` (`zitadel`, the Zitadel user id). A first login links itself; the seed and the adapter write the link for the users they make |
| Self-registration | Off | `allow_register` false on the instance default and on every organization's own policy |

Two gaps the run found, both filed: a tenant's email `domains` cannot be set without a database
edit (identity-stack#621), and the IdP-link routes take their tenant from Descope's `dct`
(identity-stack#590).

## Operational cost

| Measure | Value | How |
|---|---|---|
| Containers | 4: Traefik proxy, Zitadel API, Login V2, PostgreSQL 17 | `docker compose --profile zitadel` |
| Memory at idle | About 444 MiB in total: API 156 MiB, Login V2 128 MiB, PostgreSQL 107 MiB, proxy 52 MiB | `docker stats`, 60 s after apply and seed, before the suite |
| Memory after the suite | About 475 MiB (API 187, Login V2 180, PostgreSQL 82, proxy 27) | `docker stats` after one run |
| Cold start | 29 s to 42 s from `make zitadel-reset` (volumes deleted) to healthy, images already pulled | Three runs on one workstation |
| Image size | Zitadel 237 MB, Login V2 329 MB, Traefik 250 MB, PostgreSQL 424 MB | `docker images` |

### Upgrading the pinned version

1. Change `ghcr.io/zitadel/zitadel` and `ghcr.io/zitadel/zitadel-login` in identity-stack's
   `docker-compose.yml` to the same new tag. Login V2 is released with the API and the two move
   together.
2. `make zitadel-reset`. The local instance is disposable; a kept volume would be migrated by
   `start-from-init`'s setup phase on the next start (read, not measured).
3. Re-record the fixtures (`docs/zitadel.md`, "Re-recording") and diff
   `backend/tests/fixtures/zitadel/`. The backend's token binding rests on the claim sets
   recorded there; its unit tests are built from them and fail when a claim moves.
4. `make zitadel-terraform-check`: the root applies, the next plan is empty and the instance
   reads back as configured. A Terraform provider bump is `terraform init -upgrade` within the
   `~> 3.8` pin in `infra/zitadel/versions.tf`, then the same check.
5. `make zitadel-terraform-integration` and `make test-e2e-zitadel`, as CI's `Zitadel Terraform
   Check` and `E2E Tests (Zitadel)` jobs do.
