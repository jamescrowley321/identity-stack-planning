#!/usr/bin/env bash
# Audit git history for sensitive content before making repo public.
# Run from the repo root: ./scripts/audit-history.sh

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== Git History Security Audit ==="
echo ""

echo "--- 1. API keys, secrets, passwords in diffs ---"
git log -p --all | grep -iE '(api[_-]?key|secret|password|token|credential|management[_-]?key)\s*[:=]\s*["'"'"'][A-Za-z0-9+/]{16,}' | head -30 || echo "  (none found)"
echo ""

echo "--- 2. .env files ever committed then deleted ---"
git log --all --diff-filter=D -- '*.env' '*.env.*' || echo "  (none found)"
echo ""

echo "--- 3. State files or PROMPT.md ever committed ---"
git log --all --diff-filter=A --name-only --pretty=format:"%h %s" -- '*task-state*' '*PROMPT.md' '*.ralph/*' '*.tfstate*' | head -20 || echo "  (none found)"
echo ""

echo "--- 4. Long alphanumeric strings that could be keys ---"
git log -p --all | grep -oE '[A-Za-z0-9+/]{40,}' | sort -u | head -20 || echo "  (none found)"
echo ""

echo "--- 5. Private keys or certificates ever committed ---"
git log --all --diff-filter=A --name-only --pretty=format:"%h %s" -- '*.pem' '*.key' '*.p12' '*.pfx' '*.cert' | head -10 || echo "  (none found)"
echo ""

echo "--- 6. URLs with embedded credentials ---"
git log -p --all | grep -E 'https?://[^:]+:[^@]+@' | head -10 || echo "  (none found)"
echo ""

echo "--- 7. All files ever deleted (could have contained secrets) ---"
git log --all --diff-filter=D --name-only --pretty=format: | sort -u | grep -v '^$' | head -30 || echo "  (none found)"
echo ""

echo "--- 8. Review findings file history ---"
git log --oneline -- '_bmad-output/implementation-artifacts/review-findings-identity-stack.md' || echo "  (no history)"
echo ""

echo "--- 9. Checking for BEGIN PRIVATE KEY / BEGIN RSA blocks ---"
git log -p --all | grep -i 'BEGIN.*PRIVATE\|BEGIN.*RSA\|BEGIN.*CERTIFICATE' | head -10 || echo "  (none found)"
echo ""

echo "=== Audit complete ==="
