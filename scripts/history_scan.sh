#!/usr/bin/env bash
set -eo pipefail

TARGET_REF="${1:-origin/main}"

echo "=== History Secret Scan against $TARGET_REF ==="
echo "Excluding package-lock.json, including tests/..."

# Search patterns for JWTs, DB connection strings with passwords, and Supabase credentials
PATTERNS="eyJ[A-Za-z0-9_-]{20,}|postgres(ql)?://[^:/]+:[^@ \r\n]+@|sb_(publishable|secret)_[A-Za-z0-9_-]+"

MATCHES=$(git grep -nE "$PATTERNS" "$TARGET_REF" -- ':!**/package-lock.json' 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "MATCHES FOUND:"
  echo "$MATCHES"
  exit 1
else
  echo "Clean: Zero secrets detected in $TARGET_REF."
  exit 0
fi
