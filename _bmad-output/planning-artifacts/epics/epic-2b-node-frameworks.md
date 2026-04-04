---
title: "Epic 2B — Core Tier: Node/TypeScript Framework Integrations"
project: identity-model
status: draft
created: 2026-04-04
inputDocuments:
  - name: "Product Brief — identity-model: Multi-Language OIDC/OAuth2 Client Library"
    path: "_bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md"
  - name: "Epic 2 — Core Tier: Node/TypeScript"
    path: "_bmad-output/planning-artifacts/epics/epic-2-core-node.md"
---

# Epic 2B — Core Tier: Node/TypeScript Framework Integrations

## Overview

This epic is an addendum to [Epic 2 — Core Tier: Node/TypeScript](./epic-2-core-node.md). It extends `@identity-model/node` with framework-specific integration packages and a research story to evaluate the existing Node/TypeScript identity ecosystem before committing to build-vs-wrap decisions.

Epic 2 delivers the core library (`@identity-model/node`) — OIDC Discovery, JWKS, JWT validation, and OAuth 2.0 flows. This epic builds on that foundation with:

- **Part A:** Framework integration stories (NestJS, Next.js, React, Express/Fastify)
- **Part B:** Research story to evaluate existing libraries and inform build-vs-wrap-vs-integrate decisions

---

## Part A: Framework Integration Stories

---

## Story 1 — NestJS Integration

### User Story

**As a** NestJS developer,
**I want** a NestJS module that integrates `@identity-model/node` for token validation, OIDC discovery, and route protection,
**So that** I can secure my NestJS application using standard OIDC/OAuth 2.0 patterns with minimal boilerplate.

### Acceptance Criteria

**AC 1 — NestJS module registration**

> **Given** a NestJS application,
> **When** the developer imports `IdentityModelModule.forRoot({ issuerUrl, audience })` in the root `AppModule`,
> **Then** the module registers an OIDC discovery client, JWKS resolver, and token validator as injectable providers via NestJS dependency injection.

**AC 2 — Async configuration**

> **Given** a NestJS application using `ConfigService` or other async providers,
> **When** the developer uses `IdentityModelModule.forRootAsync({ useFactory, inject })`,
> **Then** configuration is resolved asynchronously before providers are initialized.

**AC 3 — AuthGuard for route protection**

> **Given** a controller route decorated with `@UseGuards(OidcAuthGuard)`,
> **When** a request arrives without a valid Bearer token in the `Authorization` header,
> **Then** the guard returns a 401 Unauthorized response with an appropriate error message.

**AC 4 — @Authenticated decorator**

> **Given** a controller route decorated with `@Authenticated()`,
> **When** a request arrives with a valid Bearer token,
> **Then** the request proceeds and the validated token claims are available via `@CurrentUser()` parameter decorator.

**AC 5 — @RequiresRole decorator**

> **Given** a controller route decorated with `@RequiresRole('admin')`,
> **When** a request arrives with a valid token that does not contain the `admin` role in the configured roles claim,
> **Then** the guard returns a 403 Forbidden response.

**AC 6 — @RequiresScope decorator**

> **Given** a controller route decorated with `@RequiresScope('read:users')`,
> **When** a request arrives with a valid token whose `scope` claim does not include `read:users`,
> **Then** the guard returns a 403 Forbidden response.

**AC 7 — Unit tests**

> **Given** the NestJS integration package,
> **When** unit tests are executed,
> **Then** all guards, decorators, module registration (sync and async), and error handling paths are covered and pass.

**AC 8 — Integration tests**

> **Given** a NestJS test application using `@nestjs/testing` with a `node-oidc-provider` fixture,
> **When** integration tests are executed,
> **Then** end-to-end request flows (valid token, expired token, missing token, insufficient role, insufficient scope) are tested and pass.

**AC 9 — Usage examples**

> **Given** an `examples/nestjs/` directory,
> **When** a developer reads the example application,
> **Then** they find a runnable NestJS application demonstrating module registration, route protection with guards, and claim extraction via decorators.

### References

- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [`@nestjs/passport`](https://github.com/nestjs/passport) — existing NestJS auth patterns to align with

---

## Story 2 — Next.js Integration

### User Story

**As a** Next.js developer,
**I want** middleware and server-side helpers that use `@identity-model/node` for token validation and session management,
**So that** I can protect routes, access user claims in server components, and secure API routes in my Next.js application.

### Acceptance Criteria

**AC 1 — App Router middleware**

> **Given** a Next.js application using the App Router,
> **When** the developer exports `withAuth(config)` from `middleware.ts`,
> **Then** incoming requests to protected route patterns have their session/token validated via `@identity-model/node`, and unauthenticated requests are redirected to a configurable login URL.

**AC 2 — Server component session access**

> **Given** a protected server component,
> **When** the developer calls `getSession()` in a React Server Component,
> **Then** the validated token claims are returned (or `null` if unauthenticated), using `@identity-model/node` for token validation.

**AC 3 — API route protection**

> **Given** a Next.js API route (Route Handler),
> **When** the developer wraps the handler with `withApiAuth(handler, options)`,
> **Then** requests without a valid Bearer token receive a 401 response, and authenticated requests have claims available via `request.auth`.

**AC 4 — next-auth compatibility patterns**

> **Given** a Next.js application that also uses `next-auth` / `auth.js`,
> **When** the developer follows the documented integration pattern,
> **Then** `@identity-model/node` handles server-side token validation while `next-auth` manages session lifecycle, and the two libraries cooperate without conflict.

**AC 5 — Token refresh handling**

> **Given** a session with an expired access token and a valid refresh token,
> **When** a protected route is accessed,
> **Then** the middleware transparently refreshes the token using `@identity-model/node` and updates the session.

**AC 6 — Unit tests**

> **Given** the Next.js integration package,
> **When** unit tests are executed,
> **Then** middleware logic, session helpers, API route wrappers, and token refresh handling are covered and pass.

**AC 7 — Integration tests**

> **Given** a Next.js test application with a `node-oidc-provider` fixture,
> **When** integration tests are executed using the Next.js test utilities,
> **Then** end-to-end flows (middleware redirect, server component session, API route auth, token refresh) are tested and pass.

**AC 8 — Usage examples**

> **Given** an `examples/nextjs/` directory,
> **When** a developer reads the example application,
> **Then** they find a runnable Next.js App Router application demonstrating middleware setup, server component session access, API route protection, and the next-auth integration pattern.

### References

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [`next-auth` / `auth.js`](https://github.com/nextauthjs/next-auth) — complementary session management library
- [`authjs.dev`](https://authjs.dev/) — Auth.js documentation

---

## Story 3 — React Integration (oidc-client-ts + react-oidc-context)

### User Story

**As a** React developer using `oidc-client-ts` and `react-oidc-context` for browser-side OIDC,
**I want** an adapter/bridge that connects `@identity-model/node` on the server side with the existing `oidc-client-ts` / `react-oidc-context` ecosystem on the client side,
**So that** I get consistent token validation, shared types, and server-side verification of tokens obtained client-side, without replacing my existing browser-side OIDC libraries.

### Acceptance Criteria

**AC 1 — Shared TypeScript types**

> **Given** the adapter package,
> **When** a developer imports types,
> **Then** shared types for token claims, user profiles, and OIDC configuration are available that align between `@identity-model/node` server-side validation and `oidc-client-ts` client-side tokens.

**AC 2 — Server-side token validation for client-obtained tokens**

> **Given** a token obtained by `oidc-client-ts` in the browser and sent to the server,
> **When** the server calls `validateClientToken(token, options)`,
> **Then** `@identity-model/node` validates the token signature, claims, and expiry, returning typed claims compatible with the `oidc-client-ts` `User` type.

**AC 3 — Discovery configuration bridge**

> **Given** an OIDC issuer URL,
> **When** the adapter's `createSharedConfig(issuerUrl)` is called,
> **Then** it returns a configuration object usable by both `oidc-client-ts` (client-side `UserManagerSettings`) and `@identity-model/node` (server-side discovery), ensuring both sides use the same provider metadata.

**AC 4 — react-oidc-context integration hook**

> **Given** a React application using `react-oidc-context`'s `AuthProvider`,
> **When** the developer uses the adapter's `useIdentityModel()` hook,
> **Then** it provides access to the current user's validated claims, token status, and helper functions that bridge `react-oidc-context` state with `@identity-model/node` types.

**AC 5 — NOT a replacement**

> **Given** the adapter documentation,
> **When** a developer reads the README and API docs,
> **Then** it is clear that this package is a bridge/adapter that complements `oidc-client-ts` and `react-oidc-context`, not a replacement, with guidance on which library handles which responsibility.

**AC 6 — Unit tests**

> **Given** the adapter package,
> **When** unit tests are executed,
> **Then** shared types, server-side validation of client-obtained tokens, configuration bridging, and the React hook are covered and pass.

**AC 7 — Integration tests**

> **Given** a test setup with `react-oidc-context`, `oidc-client-ts`, and a `node-oidc-provider` fixture,
> **When** integration tests are executed,
> **Then** the full flow (client obtains token via `oidc-client-ts`, server validates via `@identity-model/node`, shared types are consistent) is tested and passes.

**AC 8 — Usage examples**

> **Given** an `examples/react-oidc/` directory,
> **When** a developer reads the example,
> **Then** they find a runnable React application demonstrating: `oidc-client-ts` for browser-side auth, `react-oidc-context` for React state, the adapter for shared config and types, and a companion Express/Fastify server validating tokens with `@identity-model/node`.

### References

- [`oidc-client-ts`](https://github.com/authts/oidc-client-ts) — OpenID Connect client for browser-based JavaScript applications
- [`react-oidc-context`](https://github.com/authts/react-oidc-context) — React context provider for `oidc-client-ts`
- [`oidc-client-ts` documentation](https://authts.github.io/oidc-client-ts/)

---

## Story 4 — Express/Fastify Middleware

### User Story

**As an** Express or Fastify developer,
**I want** lightweight middleware that uses `@identity-model/node` for JWT validation and OIDC discovery,
**So that** I can protect routes with minimal configuration and optionally integrate with Passport.js.

### Acceptance Criteria

**AC 1 — Express middleware**

> **Given** an Express application,
> **When** the developer adds `app.use('/api', oidcAuth({ issuerUrl, audience }))`,
> **Then** requests to `/api/*` routes require a valid Bearer token in the `Authorization` header, validated via `@identity-model/node`, and `req.auth` is populated with validated claims.

**AC 2 — Fastify plugin**

> **Given** a Fastify application,
> **When** the developer registers `fastify.register(oidcAuthPlugin, { issuerUrl, audience })`,
> **Then** decorated routes require a valid Bearer token, validated via `@identity-model/node`, and `request.auth` is populated with validated claims.

**AC 3 — Route-level configuration**

> **Given** Express or Fastify middleware,
> **When** the developer applies middleware to specific routes with options like `{ requiredScopes: ['read:data'], requiredRoles: ['admin'] }`,
> **Then** the middleware enforces scope and role requirements in addition to token validation.

**AC 4 — Passport.js strategy**

> **Given** an Express application using Passport.js,
> **When** the developer registers the `IdentityModelBearerStrategy` and uses `passport.authenticate('identity-model')`,
> **Then** Passport.js delegates token validation to `@identity-model/node`, and the validated user is available via `req.user`.

**AC 5 — Automatic OIDC discovery**

> **Given** middleware configured with only an `issuerUrl`,
> **When** the first request arrives,
> **Then** the middleware automatically discovers the provider's OIDC configuration and JWKS, caching both per the TTL settings in `@identity-model/node`.

**AC 6 — Error responses**

> **Given** a request with an invalid, expired, or missing token,
> **When** the middleware rejects the request,
> **Then** the response includes appropriate HTTP status codes (401 for missing/invalid, 403 for insufficient scope/role) and a JSON error body with `error` and `error_description` fields.

**AC 7 — Unit tests**

> **Given** the Express/Fastify middleware package,
> **When** unit tests are executed,
> **Then** all middleware paths (valid token, invalid token, missing token, scope enforcement, role enforcement, Passport strategy) for both Express and Fastify are covered and pass.

**AC 8 — Integration tests**

> **Given** an Express and a Fastify test server with a `node-oidc-provider` fixture,
> **When** integration tests are executed,
> **Then** end-to-end request flows (authenticated, unauthenticated, insufficient scope, Passport integration) are tested and pass for both frameworks.

**AC 9 — Usage examples**

> **Given** `examples/express/` and `examples/fastify/` directories,
> **When** a developer reads the examples,
> **Then** they find runnable applications demonstrating: basic middleware setup, route-level scope/role enforcement, and Passport.js strategy integration.

### References

- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [Fastify Plugins](https://fastify.dev/docs/latest/Reference/Plugins/)
- [`passport`](https://github.com/jaredhanson/passport) — authentication middleware for Node.js
- [`passport-http-bearer`](https://github.com/jaredhanson/passport-http-bearer) — existing Bearer token strategy pattern

---

## Part B: Research Story

---

## Story 5 — Research: Existing Node/TypeScript Identity Libraries

### User Story

**As a** project maintainer and architect,
**I want** a thorough evaluation of existing Node/TypeScript identity libraries and their relationship to `@identity-model/node`,
**So that** I can make informed build-vs-wrap-vs-integrate decisions and avoid reinventing functionality that already exists in high-quality, well-maintained packages.

### Acceptance Criteria

**AC 1 — `jose` (panva) evaluation**

> **Given** the `jose` library by panva,
> **When** the research evaluates its capabilities,
> **Then** the report covers: feature overlap with `@identity-model/node` JOSE operations, API quality and maintenance status, whether `jose` should be used as the JOSE layer (as already decided in Epic 2) vs. reimplementing, and any gaps that `@identity-model/node` must fill on top of `jose`.

**AC 2 — `openid-client` (panva) evaluation**

> **Given** the `openid-client` library by panva,
> **When** the research evaluates its capabilities,
> **Then** the report covers: feature overlap with `@identity-model/node` OIDC/OAuth flows, API design comparison, maintenance and release cadence, and a recommendation on whether to wrap/extend `openid-client` or build independently.

**AC 3 — `oidc-client-ts` evaluation**

> **Given** the `oidc-client-ts` library,
> **When** the research evaluates its capabilities,
> **Then** the report covers: its browser-only scope, how it complements (not competes with) `@identity-model/node`, and integration points for the React adapter story (Story 3).

**AC 4 — `react-oidc-context` evaluation**

> **Given** the `react-oidc-context` library,
> **When** the research evaluates its capabilities,
> **Then** the report covers: its relationship to `oidc-client-ts`, React binding patterns, and how `@identity-model/node`'s React integration (Story 3) should relate to it.

**AC 5 — `next-auth` / `auth.js` evaluation**

> **Given** the `next-auth` / `auth.js` ecosystem,
> **When** the research evaluates its capabilities,
> **Then** the report covers: feature overlap with `@identity-model/node`, its session management model, provider adapter system, and a recommendation on how to complement (not compete with) `next-auth` in the Next.js integration (Story 2).

**AC 6 — Passport.js strategies evaluation**

> **Given** the `passport` ecosystem and relevant strategies (`passport-oauth2`, `passport-openidconnect`, `passport-http-bearer`),
> **When** the research evaluates their capabilities,
> **Then** the report covers: existing patterns for OIDC/OAuth in Passport, maintenance status of key strategies, and a recommendation on integrate-with vs. replace for the Express/Fastify middleware story (Story 4).

**AC 7 — `@nestjs/passport` evaluation**

> **Given** the `@nestjs/passport` module and NestJS auth patterns,
> **When** the research evaluates its capabilities,
> **Then** the report covers: how the existing NestJS auth ecosystem works, whether the NestJS integration (Story 1) should build on `@nestjs/passport` or provide an independent module, and compatibility considerations.

**AC 8 — Comparative summary matrix**

> **Given** all evaluated libraries,
> **When** the research is compiled,
> **Then** the report includes a summary matrix with columns: Library, Scope, Maintenance Status, Quality Assessment, Recommendation (Build / Wrap / Integrate / Complement), and Rationale.

**AC 9 — Risk analysis**

> **Given** the research findings,
> **When** the recommendations are made,
> **Then** each recommendation includes a risk assessment: what happens if the upstream library is abandoned, changes license, or introduces breaking changes.

**AC 10 — Deliverable format**

> **Given** the completed research,
> **When** the report is delivered,
> **Then** it is published as a markdown document in `docs/research/` with clear sections per library, the comparative matrix, and actionable recommendations that can be referenced by Stories 1-4 during implementation.

### References

- [`jose`](https://github.com/panva/jose) — JWA, JWS, JWE, JWT, JWK, JWKS for Node.js, Deno, Bun, and browsers
- [`openid-client`](https://github.com/panva/node-openid-client) — OpenID Connect Relying Party for Node.js
- [`oidc-client-ts`](https://github.com/authts/oidc-client-ts) — OpenID Connect client for browser-based JavaScript applications
- [`react-oidc-context`](https://github.com/authts/react-oidc-context) — React context provider for oidc-client-ts
- [`next-auth` / `auth.js`](https://github.com/nextauthjs/next-auth) — Authentication for Next.js
- [`passport`](https://github.com/jaredhanson/passport) — Simple, unobtrusive authentication for Node.js
- [`passport-openidconnect`](https://github.com/jaredhanson/passport-openidconnect) — OpenID Connect strategy for Passport
- [`@nestjs/passport`](https://github.com/nestjs/passport) — Passport module for NestJS
