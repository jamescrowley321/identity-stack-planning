# Security Policy

This repository contains **no application code** — only planning artifacts, architecture
documents, and prompts. There is nothing here to exploit at runtime.

## Reporting a vulnerability in the software these plans describe

Report it to the repository that owns the code, through GitHub's **Private Vulnerability
Reporting** (repository → **Security** tab → **Report a vulnerability**). That opens a private
advisory where a fix and a CVE can be coordinated.

| If it affects | Report at |
|---|---|
| The OIDC/OAuth2 client libraries (Python, Go, Rust) or the FastAPI middleware | [identity-model advisories](https://github.com/jamescrowley321/identity-model/security/advisories/new) |
| The reference platform — backend, frontend, gateway, infrastructure | [identity-stack advisories](https://github.com/jamescrowley321/identity-stack/security/advisories/new) |
| The Descope Terraform provider | [terraform-provider-descope advisories](https://github.com/jamescrowley321/terraform-provider-descope/security/advisories/new) |

**Please do not open a public issue for a security problem**, here or there.

## Reporting a problem with this repository

Two classes of issue here are worth reporting privately rather than as a public issue:

- **A leaked secret** — a key, token, or credential committed to this repository or quoted in
  a document. Report through
  [private vulnerability reporting](https://github.com/jamescrowley321/identity-stack-planning/security/advisories/new).
- **A planning document that describes an insecure design**, where saying so publicly would
  point at a live weakness in a deployed system.

Everything else — a wrong claim, a stale document, a broken link — is an ordinary
[issue](https://github.com/jamescrowley321/identity-stack-planning/issues).

## Scope note on the prompts

`_bmad-output/implementation-artifacts/ralph-prompts/` holds prompts that drive autonomous
agents against the sibling repositories. A prompt that could induce an agent to exfiltrate
credentials, weaken a security control, or act outside its repository is a legitimate security
report — treat it as the first class above.
