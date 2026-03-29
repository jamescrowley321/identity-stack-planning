# HCP Terraform (formerly Terraform Cloud) — Research Summary

## 1. Setup: Backend Configuration

HCP Terraform uses the `cloud` block (preferred) or the legacy `remote` backend. The `cloud` block was introduced in Terraform 1.1+ and is the recommended approach.

**Preferred — `cloud` block (in `terraform {}`):**

```hcl
terraform {
  cloud {
    organization = "your-org-name"

    workspaces {
      name = "descope-saas-starter"
    }
  }

  required_providers {
    descope = {
      source  = "jamescrowley321/descope"
      version = "~> 0.x"
    }
  }
}
```

**Legacy — `backend "remote"` block:**

```hcl
terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "your-org-name"

    workspaces {
      name = "descope-saas-starter"
    }
  }
}
```

Key differences: The `cloud` block supports tags-based workspace selection, structured run triggers, and is the only block that supports HCP Terraform's newer features. The `backend "remote"` block is still functional but considered legacy.

Authentication is via a `TF_CLOUD_ORGANIZATION` env var or a credentials block in `~/.terraform.d/credentials.tfrc.json`:

```json
{
  "credentials": {
    "app.terraform.io": {
      "token": "your-api-token"
    }
  }
}
```

Or set the `TF_TOKEN_app_terraform_io` environment variable.

---

## 2. Free Tier

HCP Terraform's free tier (as of current offerings) includes:

| Feature | Free Tier Limit |
|---|---|
| **Users** | Up to 5 users per organization |
| **Workspaces** | Unlimited |
| **State storage** | Unlimited (no per-workspace or total cap) |
| **Runs** | Up to 500 managed runs per month |
| **State versions** | Full state version history retained |
| **Remote state sharing** | Yes, between workspaces in the same org |
| **VCS integration** | Yes (GitHub, GitLab, Bitbucket, Azure DevOps) |
| **Private registry** | Yes (for modules and providers) |
| **Sentinel/OPA policies** | No (requires Plus/Enterprise) |
| **Teams & governance** | No granular team permissions (requires Plus) |
| **Run tasks** | Limited |
| **SSO** | No (requires Plus/Enterprise) |
| **Concurrent runs** | 1 concurrent run (Plus allows more) |

**For the descope-saas-starter use case**: The free tier is more than sufficient. A single Descope project config with roles, permissions, tenants, FGA schema, and SSO provisioning will consume minimal runs (likely a handful per week at most) and trivial state storage.

---

## 3. Migration from Local State to HCP Remote State

### Step-by-step migration:

**Step 1**: Create an HCP Terraform account at [app.terraform.io](https://app.terraform.io) and create an organization.

**Step 2**: Generate an API token via User Settings > Tokens, or run:
```bash
terraform login
```
This opens a browser for OAuth and stores the token in `~/.terraform.d/credentials.tfrc.json`.

**Step 3**: Add the `cloud` block to your Terraform configuration:
```hcl
terraform {
  cloud {
    organization = "your-org"
    workspaces {
      name = "descope-saas-starter"
    }
  }
}
```

**Step 4**: Run the migration:
```bash
terraform init -migrate-state
```

Terraform will detect that you have existing local state and prompt:
```
Do you want to copy existing state to the new backend?
  Pre-existing state was found while migrating the previous "local" backend to the
  newly configured "cloud" backend. No existing state was found in the newly
  configured "cloud" backend. Do you want to copy this state to the new "cloud"
  backend? Enter "yes" to copy and "no" to start with an empty state.
```

Answer `yes`. The local `terraform.tfstate` is uploaded to HCP Terraform.

**Step 5**: Verify:
```bash
terraform state list
```
This should show your existing resources, now reading from remote state.

**Step 6**: Optionally back up and remove local state files:
```bash
cp terraform.tfstate terraform.tfstate.backup.local
rm terraform.tfstate terraform.tfstate.backup
```

**Important caveats:**
- The workspace must either not exist yet in HCP (it will be auto-created) or must be empty. If a workspace with that name already exists and has state, migration will fail.
- If using execution mode "remote" (default), HCP Terraform will run `plan` and `apply` on its servers — the custom `terraform-provider-descope` fork must be accessible. You will likely want to set execution mode to **"local"** so runs execute on your machine but state is stored remotely. Set this in Workspace Settings > General > Execution Mode.

---

## 4. Secrets Handling

### Sensitive Outputs

HCP Terraform handles sensitive values in several ways:

- **Sensitive outputs** (declared with `sensitive = true`) are stored encrypted in state. They are redacted in the UI and logs but are present in the state file. Anyone with state read access can retrieve them via `terraform output -json`.

- **State encryption**: HCP Terraform encrypts state at rest using its own managed encryption keys. This is a significant security improvement over local `.tfstate` files (which are plaintext JSON).

- **Workspace variables**: You can mark variables as "sensitive" in the HCP Terraform UI or API. Sensitive variables are write-only — once set, they cannot be read back from the UI, only overwritten. They are injected as environment variables or Terraform variables during runs.

**For Descope API keys / access keys generated by the provider:**

```hcl
output "descope_access_key" {
  value     = descope_access_key.backend.cleartext
  sensitive = true
}
```

This output will be:
- Encrypted in remote state
- Redacted in plan/apply logs in the UI
- Retrievable only via `terraform output -json` by users with state read access or via the API

**Limitation**: HCP Terraform is not a secrets manager. It protects secrets in transit and at rest within the state, but it does not provide rotation, leasing, or dynamic secret generation. For production secrets, consider pushing outputs to a dedicated secrets manager (Infisical, Vault, AWS Secrets Manager).

---

## 5. Workspace Organization

For a single Descope project config (roles, permissions, tenants, FGA schema, SSO), recommended approaches:

### Option A: Single Workspace (Recommended for your scale)

```
Organization: your-org
  └── Workspace: descope-saas-starter
        └── Manages: roles, permissions, tenants, FGA, SSO, access keys
```

This is the simplest approach. All Descope resources share the same lifecycle — they're all part of one Descope project. A single workspace is appropriate because:
- All resources depend on the same `DESCOPE_MANAGEMENT_KEY`
- Changes to roles/permissions/tenants are tightly coupled
- The blast radius is contained to one Descope project

### Option B: Environment-Split Workspaces (When you add staging/prod)

```
Organization: your-org
  ├── Workspace: descope-dev
  ├── Workspace: descope-staging
  └── Workspace: descope-prod
```

Use the same Terraform config with different variable values per workspace. Use workspace-specific variable sets for `DESCOPE_MANAGEMENT_KEY` (different key per environment).

### Option C: Concern-Split Workspaces (Rarely needed)

```
Organization: your-org
  ├── Workspace: descope-auth-config     (roles, permissions, FGA)
  ├── Workspace: descope-tenants         (tenant provisioning)
  └── Workspace: descope-sso             (SSO/SAML config)
```

This is overkill for a single Descope project but could make sense if different teams own different concerns.

**Recommendation**: Start with Option A. Move to Option B when you add environments. Use tags for grouping:

```hcl
terraform {
  cloud {
    organization = "your-org"
    workspaces {
      tags = ["descope", "auth"]
    }
  }
}
```

---

## 6. CI/CD Integration with GitHub Actions

HCP Terraform offers two integration patterns with GitHub:

### Pattern 1: VCS-Driven Runs (Native Integration)

Connect your GitHub repo directly to the HCP Terraform workspace:

1. In Workspace Settings > Version Control, connect to GitHub
2. Configure: working directory, branch, auto-apply settings

Behavior:
- **PR opened/updated**: HCP Terraform runs `terraform plan` and posts the result as a PR check/comment
- **PR merged to main**: HCP Terraform runs `terraform apply` (if auto-apply is enabled) or queues for manual confirmation

**Caveat for your case**: VCS-driven runs execute on HCP Terraform's servers ("remote" execution). The custom `terraform-provider-descope` fork is published to the Terraform registry as `jamescrowley321/descope`, so this should work — HCP Terraform will download it from the registry during `terraform init`. If the provider is NOT published to the registry, remote execution will fail and you need Pattern 2.

### Pattern 2: CLI-Driven Runs via GitHub Actions

Use execution mode "local" or "agent" and drive runs from GitHub Actions:

```yaml
name: Terraform
on:
  pull_request:
    paths: ['infra/**']
  push:
    branches: [main]
    paths: ['infra/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      TF_CLOUD_ORGANIZATION: "your-org"
      TF_TOKEN_app_terraform_io: ${{ secrets.TF_API_TOKEN }}
      TF_WORKSPACE: "descope-saas-starter"
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.x"
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        run: terraform init
        working-directory: infra

      - name: Terraform Plan
        if: github.event_name == 'pull_request'
        run: terraform plan -no-color
        working-directory: infra

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve
        working-directory: infra
```

With execution mode set to "local", the plan/apply runs on the GitHub Actions runner, but state is read/written from HCP Terraform. This ensures the custom provider works without needing registry publication.

**Recommendation**: Use Pattern 2 (CLI-driven from GitHub Actions with local execution mode) for maximum control and compatibility with the custom provider fork.

---

## 7. State Locking

HCP Terraform provides **automatic state locking** with no additional configuration:

- When a run starts (plan or apply), the workspace state is locked
- If another run is queued, it waits until the lock is released
- If a run fails or is cancelled, the lock is automatically released
- There is no manual lock/unlock needed (unlike S3+DynamoDB backend)

Concurrency protection:
- **Free tier**: 1 concurrent run per organization (runs queue sequentially)
- **Plus tier**: Configurable concurrent runs
- Runs within the same workspace are always serialized

This is a significant advantage over local state, where concurrent `terraform apply` from two terminals can corrupt state.

For your use case: State locking is automatic and zero-config. You get it for free with HCP Terraform.

---

## 8. Team Features on Free Tier

**Free tier limitations:**
- All 5 users in the organization have the **same permissions** (effectively all "owners")
- No team-based RBAC (requires Plus tier)
- No granular workspace permissions (read-only vs. read-write vs. admin)

**What you get on free tier:**
- All users can read state, trigger runs, set variables
- Audit log of who ran what and when
- State version history with diff viewing
- Run history with plan/apply output

**Plus tier adds:**
- Custom teams with workspace-level permissions
- Team tokens for CI/CD
- Permission sets: read, plan, write, admin per workspace
- SSO/SAML for user authentication

**For your case**: If it's just you (or a small team of 2-3), the free tier is fine. Everyone is an admin, which is acceptable for a small Descope project config.

---

## 9. Variable Sets

Yes, HCP Terraform supports **variable sets** — named groups of variables that can be applied to one or more workspaces.

**Setup for DESCOPE_MANAGEMENT_KEY:**

1. In HCP Terraform UI: Settings > Variable Sets > Create
2. Name: "Descope Credentials"
3. Scope: Apply to specific workspaces or all workspaces
4. Add variables:

| Key | Category | Value | Sensitive |
|---|---|---|---|
| `DESCOPE_MANAGEMENT_KEY` | Environment variable | `key:...` | Yes |
| `DESCOPE_BASE_URL` | Environment variable | `https://api.descope.com` | No |

**Via Terraform (meta-config):**

```hcl
resource "tfe_variable_set" "descope" {
  name         = "Descope Credentials"
  organization = "your-org"
}

resource "tfe_variable" "mgmt_key" {
  key             = "DESCOPE_MANAGEMENT_KEY"
  value           = var.descope_management_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.descope.id
}
```

**For your case**: Create a "Descope Credentials" variable set with `DESCOPE_MANAGEMENT_KEY` as a sensitive environment variable, applied to all Descope-related workspaces. When you add staging/prod, create separate variable sets per environment.

---

## 10. Integration with Infisical

There is **no native, first-party integration** between HCP Terraform and Infisical. However, there are several practical approaches:

### Option A: Infisical Terraform Provider (Pull secrets into Terraform)

Infisical has an official Terraform provider:

```hcl
terraform {
  required_providers {
    infisical = {
      source  = "infisical/infisical"
      version = "~> 0.x"
    }
  }
}

provider "infisical" {
  client_id     = var.infisical_client_id
  client_secret = var.infisical_client_secret
  site_url      = "https://app.infisical.com"
}

data "infisical_secrets" "descope" {
  env_slug    = "prod"
  folder_path = "/"
  project_id  = var.infisical_project_id
}

# Use in Descope provider
provider "descope" {
  management_key = data.infisical_secrets.descope.secrets["DESCOPE_MANAGEMENT_KEY"].value
}
```

This works with both local and remote execution. Infisical credentials would be stored as sensitive variables in HCP Terraform.

### Option B: Push Terraform Outputs to Infisical (via provisioner or CI)

After `terraform apply`, push generated secrets (like access keys) to Infisical via CI:

```yaml
# In GitHub Actions after terraform apply
- name: Push secrets to Infisical
  run: |
    ACCESS_KEY=$(terraform output -raw descope_access_key)
    infisical secrets set DESCOPE_ACCESS_KEY="$ACCESS_KEY" \
      --env=prod --projectId=$INFISICAL_PROJECT_ID
```

### Option C: HCP Terraform Run Tasks + Infisical Webhook

HCP Terraform run tasks can call external services pre/post plan/apply. You could build a webhook that syncs outputs to Infisical, but this requires custom development.

**Recommendation**: Use Option A (Infisical provider) to pull secrets into Terraform runs. Use Option B (CI-based push) to sync generated outputs back to Infisical. This gives you a bidirectional flow:

```
Infisical → (provider data source) → Terraform → (CI post-apply) → Infisical
```

---

## Step-by-Step Migration Plan: Local State to HCP Terraform

For the `descope-saas-starter` infrastructure config:

### Phase 1: HCP Terraform Account Setup

```bash
# 1. Sign up at https://app.terraform.io (free)
# 2. Create organization (e.g., "your-org-name")
# 3. Authenticate CLI
terraform login
# Opens browser, authorize, token is stored in ~/.terraform.d/credentials.tfrc.json
```

### Phase 2: Create Workspace and Configure Variables

```bash
# In HCP Terraform UI:
# 1. Create workspace "descope-saas-starter" (CLI-driven workflow)
# 2. Set Execution Mode to "Local" (Settings > General)
#    - This ensures runs happen on your machine / CI runner
#    - State is stored in HCP Terraform
# 3. Create variable set "Descope Credentials":
#    - DESCOPE_MANAGEMENT_KEY (env var, sensitive: true)
#    - DESCOPE_BASE_URL (env var, sensitive: false) [optional]
# 4. Apply variable set to workspace
```

### Phase 3: Back Up Current State

```bash
cd /home/james/repos/auth/descope-saas-starter/infra  # or wherever your tf config lives
cp terraform.tfstate terraform.tfstate.backup-pre-migration-$(date +%Y%m%d)
```

### Phase 4: Update Terraform Configuration

Add the `cloud` block to your main Terraform config:

```hcl
terraform {
  cloud {
    organization = "your-org-name"

    workspaces {
      name = "descope-saas-starter"
    }
  }

  required_providers {
    descope = {
      source  = "jamescrowley321/descope"
      version = "~> 0.x"
    }
  }
}
```

### Phase 5: Migrate State

```bash
terraform init -migrate-state
# Answer "yes" when prompted to copy existing state to the cloud backend
```

### Phase 6: Verify

```bash
# List resources in remote state
terraform state list

# Run a plan to ensure nothing has drifted
terraform plan
# Expected output: "No changes. Your infrastructure matches the configuration."
```

### Phase 7: Clean Up Local State

```bash
# Local state files are no longer used — remove them
rm terraform.tfstate terraform.tfstate.backup
# Keep the manual backup from Phase 3 for safety

# Add to .gitignore if not already present
echo "terraform.tfstate" >> .gitignore
echo "terraform.tfstate.backup" >> .gitignore
echo ".terraform/" >> .gitignore
```

### Phase 8: Set Up CI/CD (Optional)

```bash
# Store HCP Terraform token as GitHub Actions secret
gh secret set TF_API_TOKEN --body "your-hcp-terraform-token"

# Add the GitHub Actions workflow from Section 6 above
```

### Phase 9: Add `.gitignore` Entries for Remote State

```gitignore
# Terraform
.terraform/
*.tfstate
*.tfstate.backup
*.tfvars       # if contains secrets
.terraform.lock.hcl  # optional — some teams commit this
```

---

## Summary Comparison: Local State vs. HCP Terraform

| Concern | Local State | HCP Terraform (Free) |
|---|---|---|
| State storage | Plaintext JSON on disk | Encrypted at rest, versioned |
| State locking | None | Automatic |
| Collaboration | Manual file sharing | Multi-user with shared state |
| Secrets in state | Plaintext in `.tfstate` | Encrypted, redacted in UI |
| Audit trail | None | Full run history |
| CI/CD | DIY | Native VCS integration or CLI-driven |
| Cost | Free | Free (up to 500 runs/month, 5 users) |
| Backup/recovery | Manual | Automatic state versioning |
| Variable management | `.tfvars` files, env vars | Variable sets, sensitive vars |

**Bottom line**: For the descope-saas-starter project, HCP Terraform free tier is the right choice. It eliminates the risks of local state (no encryption, no locking, no versioning) with zero cost. The migration is a single `terraform init -migrate-state` command after adding the `cloud` block. Use local execution mode to maintain compatibility with the custom `terraform-provider-descope` fork, and CLI-driven GitHub Actions for CI/CD.
