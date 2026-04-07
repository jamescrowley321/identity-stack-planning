# Infisical Research Summary for Terraform + FastAPI + React Stack

## 1. Self-Hosted vs Cloud

### Self-Hosted Requirements

Infisical can be self-hosted via Docker Compose, Kubernetes (Helm), or standalone binaries. The Docker Compose setup requires:

**Core dependencies:**
- **PostgreSQL** (v14+) — primary data store for secrets, audit logs, configuration
- **Redis** (v6+) — caching, session management, real-time secret replication
- **Infisical Core** — the main application server (single container)

A minimal `docker-compose.yml` for self-hosted Infisical looks like:

```yaml
services:
  infisical:
    image: infisical/infisical:latest
    ports:
      - "8080:8080"
    environment:
      - ENCRYPTION_KEY=<generated-hex-key>        # 128-bit hex for secret encryption
      - AUTH_SECRET=<generated-jwt-secret>         # JWT signing secret
      - DB_CONNECTION_URI=postgres://user:pass@db:5432/infisical
      - REDIS_URL=redis://redis:6379
      - SITE_URL=http://localhost:8080
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: infisical
      POSTGRES_USER: infisical
      POSTGRES_PASSWORD: <password>
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

**Key self-hosted considerations:**
- You must generate and securely store `ENCRYPTION_KEY` (losing it means losing all secrets)
- Database backups are your responsibility
- Updates require pulling new images and running migrations
- HTTPS/TLS termination must be handled by a reverse proxy (Nginx, Caddy, Traefik)
- The Community (open-source) edition is MIT-licensed and includes core secret management, RBAC, audit logs, and integrations

### Cloud Free Tier

Infisical Cloud (https://app.infisical.com) offers a free tier:
- Up to **5 team members**
- Unlimited projects and secrets
- Audit logs retained for a limited period (typically 1-3 days on free tier)
- Community integrations (Terraform, Docker, SDKs)
- No SLA guarantees
- No SSO/SAML (paid feature)
- No secret rotation on free tier (Enterprise feature, though some basic rotation may be available on paid plans)

**Recommendation for this project:** Start with Infisical Cloud free tier for development/staging. Self-host for production only if you have compliance requirements (data residency, SOC2 controls requiring self-managed infrastructure).

---

## 2. Terraform Integration

### Official Terraform Provider

Infisical has an official Terraform provider: **`infisical/infisical`** published on the Terraform Registry.

```hcl
terraform {
  required_providers {
    infisical = {
      source  = "infisical/infisical"
      version = ">= 0.12.0"
    }
  }
}

provider "infisical" {
  host          = "https://app.infisical.com"  # or self-hosted URL
  client_id     = var.infisical_client_id      # Machine Identity credentials
  client_secret = var.infisical_client_secret
}
```

### Key Resources and Data Sources

```hcl
# Store a secret in Infisical
resource "infisical_secret" "descope_management_key" {
  name         = "DESCOPE_MANAGEMENT_KEY"
  value        = descope_project.main.management_key  # from Descope provider
  folder_path  = "/"
  env_slug     = "prod"
  project_id   = var.infisical_project_id
}

# Read a secret from Infisical
data "infisical_secrets" "backend_secrets" {
  env_slug   = "prod"
  folder_path = "/backend"
  project_id  = var.infisical_project_id
}
```

### Storing Terraform-Generated Secrets Automatically

Yes, this is the key value proposition. You can chain providers:

```hcl
# 1. Descope provider creates infrastructure
resource "descope_project" "main" {
  # ... project configuration
}

# 2. Infisical provider stores the generated secrets
resource "infisical_secret" "descope_project_id" {
  name        = "DESCOPE_PROJECT_ID"
  value       = descope_project.main.id
  folder_path = "/descope"
  env_slug    = "prod"
  project_id  = var.infisical_project_id
}

resource "infisical_secret" "descope_mgmt_key" {
  name        = "DESCOPE_MANAGEMENT_KEY"
  value       = descope_project.main.management_key
  folder_path = "/descope"
  env_slug    = "prod"
  project_id  = var.infisical_project_id
}
```

**Important caveat:** The Descope Terraform provider (`terraform-provider-descope` in this workspace) manages project defaults (roles, permissions, tenants) but does **not** create management keys as resource outputs. Management keys are created in the Descope console and provided as input to the provider. So the flow would be:

1. Manually create the Descope management key and project ID
2. Store them in Infisical (manually or via `infisical_secret` resources)
3. Reference them from Infisical in other Terraform configs and applications

For secrets that Terraform **does** generate (e.g., random passwords, API keys from other providers), the automatic storage pattern works directly.

### Authentication: Machine Identities

Infisical uses **Machine Identities** (service accounts) for programmatic access. For Terraform, you create a Machine Identity with a **Universal Auth** login method, which gives you a `client_id` and `client_secret`. These are the only secrets you need to bootstrap — everything else lives in Infisical.

---

## 3. Application Integration (FastAPI Backend)

### Option A: Python SDK (Recommended for FastAPI)

Infisical provides an official Python SDK:

```bash
pip install infisical-python
# or: uv add infisical-python
```

Usage in a FastAPI application:

```python
from infisical_client import InfisicalClient, ClientSettings, GetSecretOptions, AuthenticationOptions, UniversalAuthMethod

class Settings:
    def __init__(self):
        self.client = InfisicalClient(ClientSettings(
            auth=AuthenticationOptions(
                universal_auth=UniversalAuthMethod(
                    client_id="MACHINE_IDENTITY_CLIENT_ID",
                    client_secret="MACHINE_IDENTITY_CLIENT_SECRET",
                )
            ),
            site_url="https://app.infisical.com",  # or self-hosted
        ))

    def get_secret(self, name: str, environment: str = "prod") -> str:
        secret = self.client.getSecret(options=GetSecretOptions(
            environment=environment,
            project_id="your-project-id",
            secret_name=name,
            path="/",
        ))
        return secret.secret_value

# In FastAPI lifespan
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    app.state.descope_project_id = settings.get_secret("DESCOPE_PROJECT_ID")
    app.state.descope_mgmt_key = settings.get_secret("DESCOPE_MANAGEMENT_KEY")
    app.state.database_url = settings.get_secret("DATABASE_URL")
    yield
```

**Note:** The Python SDK is synchronous (uses Rust bindings via PyO3). For the FastAPI async context, wrap calls in `asyncio.to_thread()` or fetch all secrets at startup (lifespan) where blocking is acceptable.

### Option B: Infisical CLI + Environment Injection

The Infisical CLI can inject secrets as environment variables before the process starts:

```bash
# Install CLI
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo bash
sudo apt install infisical

# Run FastAPI with secrets injected
infisical run --env=prod --path=/backend -- uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

This approach requires **zero code changes** — the app reads secrets from `os.environ` as it does with `.env` files today. The CLI authenticates via Machine Identity (set `INFISICAL_MACHINE_IDENTITY_CLIENT_ID` and `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET`).

### Option C: Infisical Agent (Sidecar/Init Container)

For Docker/Kubernetes deployments, the Infisical Agent runs as a sidecar that:
1. Authenticates with Infisical
2. Fetches secrets
3. Writes them to a shared volume as a `.env` file or template
4. Periodically refreshes secrets

```yaml
# Docker Compose with Infisical Agent
services:
  infisical-agent:
    image: infisical/cli:latest
    command: agent --config /config/agent-config.yaml
    volumes:
      - secrets-vol:/secrets

  backend:
    build: ./backend
    env_file:
      - /secrets/.env  # populated by agent
    depends_on:
      - infisical-agent
    volumes:
      - secrets-vol:/secrets:ro
```

**Recommendation for identity-stack:** Use **Option B (CLI injection)** for development and Docker Compose deployments. Use **Option A (SDK)** only if you need runtime secret refresh without restarts.

---

## 4. Frontend Integration (Vite/React)

### Build-Time Secret Injection

For Vite/React apps, secrets are embedded at build time (they become public in the bundle). Infisical handles this via CLI injection during the build step:

```bash
# Build frontend with secrets from Infisical
infisical run --env=prod --path=/frontend -- npm run build
```

In `vite.config.ts`, Vite automatically picks up `VITE_*` environment variables:

```typescript
// These are available in the app as import.meta.env.VITE_*
// No code changes needed — Infisical injects them as env vars before build
```

### CI/CD Integration

In GitHub Actions:

```yaml
- name: Build Frontend
  run: |
    npx @infisical/cli run --env=prod --path=/frontend -- npm run build
  env:
    INFISICAL_MACHINE_IDENTITY_CLIENT_ID: ${{ secrets.INFISICAL_CLIENT_ID }}
    INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET: ${{ secrets.INFISICAL_CLIENT_SECRET }}
    INFISICAL_PROJECT_ID: ${{ secrets.INFISICAL_PROJECT_ID }}
```

### Important: Frontend secrets are NOT sensitive

For this project, the frontend only needs `VITE_DESCOPE_PROJECT_ID` and optionally `VITE_DESCOPE_BASE_URL`. These are public values (the project ID is visible in the browser's network requests anyway). Infisical is still useful here for **consistency** (single source of truth for config across environments) rather than security.

---

## 5. Docker Compose Integration

Infisical can absolutely run alongside your application stack. Here is a comprehensive example:

```yaml
version: "3.9"

services:
  # --- Infisical (self-hosted) ---
  infisical:
    image: infisical/infisical:latest
    ports:
      - "8080:8080"
    environment:
      - ENCRYPTION_KEY=${INFISICAL_ENCRYPTION_KEY}
      - AUTH_SECRET=${INFISICAL_AUTH_SECRET}
      - DB_CONNECTION_URI=postgres://infisical:infisical@infisical-db:5432/infisical
      - REDIS_URL=redis://infisical-redis:6379
      - SITE_URL=http://localhost:8080
    depends_on:
      infisical-db:
        condition: service_healthy
      infisical-redis:
        condition: service_started

  infisical-db:
    image: postgres:14
    environment:
      POSTGRES_DB: infisical
      POSTGRES_USER: infisical
      POSTGRES_PASSWORD: infisical
    volumes:
      - infisical-pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U infisical"]
      interval: 5s
      timeout: 5s
      retries: 5

  infisical-redis:
    image: redis:7-alpine
    volumes:
      - infisical-redis-data:/data

  # --- Your Application ---
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    # Option 1: CLI injection via entrypoint
    entrypoint: >
      infisical run --env=dev --path=/backend --
      uvicorn backend.main:app --host 0.0.0.0 --port 8000
    environment:
      - INFISICAL_MACHINE_IDENTITY_CLIENT_ID=${MACHINE_CLIENT_ID}
      - INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET=${MACHINE_CLIENT_SECRET}
      - INFISICAL_PROJECT_ID=${INFISICAL_PROJECT_ID}
    depends_on:
      - infisical

  frontend:
    build:
      context: ./frontend
      args:
        # Pass at build time
        VITE_DESCOPE_PROJECT_ID: ${VITE_DESCOPE_PROJECT_ID}
    ports:
      - "3000:3000"

volumes:
  infisical-pg-data:
  infisical-redis-data:
```

**Resource footprint for self-hosted Infisical:**
- Infisical core: ~256MB RAM, minimal CPU
- PostgreSQL: ~128MB RAM baseline
- Redis: ~64MB RAM baseline
- Total overhead: approximately 500MB RAM

---

## 6. Key Features

### Secret Versioning
Every secret change creates a new version. You can view the full history and roll back to any previous version via the UI, CLI, or API. This is built-in and available on all tiers.

### Audit Logging
All secret access (reads, writes, deletes) is logged with:
- Who (user or machine identity)
- What (secret name, action)
- When (timestamp)
- Where (IP address, user agent)

Available on all tiers; retention period varies by plan.

### RBAC (Role-Based Access Control)
- **Built-in roles:** Admin, Member, Viewer, No Access
- **Custom roles:** Available on paid plans
- **Per-environment permissions:** A developer can have write access to `dev` but read-only to `prod`
- **Per-folder permissions:** Scope access to `/backend`, `/frontend`, `/infra` folders within a project

### Environment Management
- Default environments: Development, Staging, Production
- Custom environments supported
- Secrets are scoped per environment — same secret name can have different values across environments
- Environment-level overrides and inheritance

### Secret Rotation
- Available on **paid plans** (Team tier and above)
- Supports automatic rotation for: PostgreSQL, MySQL, AWS IAM, SendGrid, LDAP
- Custom rotation via webhooks/lambda functions
- For Descope management keys: no native rotation integration, but you could build a custom rotation using Infisical's rotation webhook + Descope Management API

### Secret References / Import
Secrets can reference other secrets (cross-environment, cross-folder):

```
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
```

This is particularly useful for composing connection strings from individual components.

### Integrations
Native integrations with: AWS Parameter Store, AWS Secrets Manager, GitHub Actions, GitLab CI, Vercel, Netlify, Docker, Kubernetes, CircleCI, and more. Secrets sync from Infisical to these targets automatically.

---

## 7. Comparison: Infisical vs HashiCorp Vault

| Dimension | Infisical | HashiCorp Vault |
|---|---|---|
| **Complexity** | Simple — single binary, PostgreSQL + Redis | Complex — requires unsealing, HA setup, Consul backend option |
| **Setup time** | ~15 minutes (Docker Compose) | ~1-2 hours minimum for production-grade |
| **Learning curve** | Low — intuitive web UI, straightforward CLI | Steep — policies (HCL), auth methods, secret engines are powerful but complex |
| **Terraform provider** | Yes, official (`infisical/infisical`) | Yes, official (`hashicorp/vault`), more mature |
| **Python SDK** | Yes (Rust-backed, sync only) | Yes (`hvac` — mature, async support via `httpx`) |
| **Secret rotation** | Basic (paid) — PostgreSQL, MySQL, AWS IAM | Extensive — dynamic secrets for nearly any database, cloud provider, PKI |
| **Dynamic secrets** | No | Yes — generates short-lived credentials on-demand (major differentiator) |
| **PKI/Certificates** | No | Yes — full PKI engine |
| **Transit encryption** | No | Yes — encrypt/decrypt as a service |
| **Audit logging** | Yes (all tiers) | Yes (all editions) |
| **UI** | Modern, developer-friendly | Functional but less polished |
| **Pricing** | Free tier generous; paid starts at $6/user/month | Community (open source, BSL since 1.14); HCP Vault starts at ~$0.03/hr |
| **License** | MIT (truly open source) | BSL 1.1 (not open source since v1.14; community fork: OpenBao) |
| **Operational burden** | Low | High — seal/unseal, token lifecycle, lease management |
| **Best for** | Application secret management, small-medium teams | Enterprise-grade secret management, dynamic secrets, PKI, encryption-as-a-service |

### Verdict for This Project

**Infisical is the clear winner** for the identity-stack use case:

1. **Right-sized complexity** — You need to store ~10 secrets (Descope credentials, database URL, API keys). Vault's dynamic secret engines, PKI, and transit encryption are overkill.
2. **Faster adoption** — Team can be productive in an afternoon vs. days with Vault.
3. **MIT license** — No BSL concerns for the self-hosted path.
4. **Native Terraform provider** — Secrets generated by Terraform flow directly into Infisical.
5. **CLI injection** — Zero code changes to existing `.env`-based code.
6. **Lower ops burden** — No seal/unseal ceremony, no token renewal, no lease management.

Vault would only be preferred if you needed: dynamic database credentials (generate per-request Postgres users), PKI certificate issuance, or encryption-as-a-service (transit engine).

---

## Architecture Recommendation

### Migration Path from `.env` Files

**Phase 1: Infisical Cloud (immediate, no infrastructure changes)**

```
Current:  .env files (checked into .gitignore, shared via Slack/1Password)
Target:   Infisical Cloud free tier

Steps:
1. Create Infisical account + project
2. Create environments: dev, staging, prod
3. Create folders: /backend, /frontend, /infra
4. Import existing .env values into Infisical via UI or CLI:
   infisical secrets set DESCOPE_PROJECT_ID=xxx --env=dev --path=/backend
5. Create Machine Identity for CI/CD + local dev
6. Replace `env_file: .env` in docker-compose with infisical CLI injection
7. Update CI/CD to use `infisical run` instead of GitHub secrets
8. Delete .env files from developer machines
```

**Phase 2: Terraform Integration**

```
descope provider                    infisical provider
  │                                      │
  │ manages project defaults             │ stores/reads secrets
  │ (roles, permissions, tenants)        │ (credentials, config)
  ▼                                      ▼
┌─────────────────────────────────────────────────┐
│              Infisical (Cloud or Self-hosted)    │
│                                                  │
│  /infra/                                        │
│    DESCOPE_MANAGEMENT_KEY                       │
│    DESCOPE_PROJECT_ID                           │
│                                                  │
│  /backend/                                      │
│    DESCOPE_PROJECT_ID (ref: /infra)             │
│    DESCOPE_MANAGEMENT_KEY (ref: /infra)         │
│    DATABASE_URL                                 │
│                                                  │
│  /frontend/                                     │
│    VITE_DESCOPE_PROJECT_ID (ref: /infra)        │
│    VITE_DESCOPE_BASE_URL                        │
└──────────┬──────────────────┬───────────────────┘
           │                  │
    CLI injection        CLI injection
           │                  │
     ┌─────▼─────┐    ┌──────▼──────┐
     │  Backend   │    │  Frontend   │
     │  FastAPI   │    │  Vite Build │
     └───────────┘    └─────────────┘
```

**Phase 3: Self-Hosted (optional, when needed)**

Only move to self-hosted if:
- You exceed the free tier (>5 team members)
- You have data residency requirements
- You need secret rotation (paid feature)
- You want to eliminate the external dependency

When self-hosting, add Infisical's containers to the existing Docker Compose stack as shown in Section 5. The ~500MB RAM overhead is minimal for a development or staging environment.

### Bootstrap Problem: What Stores the Infisical Credentials?

Every secrets manager has a bootstrap secret — the credentials needed to access all other secrets. For Infisical:

- **Local development:** `INFISICAL_TOKEN` (service token) or Machine Identity credentials stored in a local `.infisical.json` (auto-created by `infisical login`)
- **CI/CD:** Machine Identity `client_id` + `client_secret` stored as GitHub Actions secrets (the only 2 secrets in GitHub)
- **Docker Compose:** Machine Identity credentials passed via environment variables from the host (only these 2-3 values in a `.env` file)
- **Production:** Machine Identity credentials injected via cloud provider's native secret store (AWS Parameter Store, GCP Secret Manager) or Kubernetes secrets

This means you go from **N secrets in .env files** to **2 secrets bootstrapped from the platform**, with everything else centralized in Infisical.

---

### Summary of Recommendations

| Decision | Recommendation |
|---|---|
| Cloud vs Self-hosted | Start with Infisical Cloud free tier |
| Terraform integration | Use `infisical/infisical` provider to store generated secrets |
| Backend integration | CLI injection (`infisical run`) — zero code changes |
| Frontend integration | CLI injection at build time (`infisical run -- npm run build`) |
| Secret organization | Folders: `/backend`, `/frontend`, `/infra` per environment |
| vs Vault | Infisical — right-sized, simpler, MIT licensed |
| Migration effort | Low — import `.env` values, swap `env_file` for `infisical run` |
