#!/usr/bin/env bash
set -euo pipefail

# Decision #33: CI Documentation Append-Only Guard
# Asserts that no deletions occurred in core documentation relative to phase12-docs-base.

BASELINE="phase12-docs-base"
DOCS=("ARCHITECTURE.md" "ROADMAP.md" "tasks.md")

echo "=== Running Documentation Append-Only Check (Decision #33) ==="
echo "Comparing working tree against baseline tag: ${BASELINE}"

DELETIONS=0

while read -r added deleted file; do
  echo "  ${file}: +${added} -${deleted}"
  if [ "${deleted}" -ne 0 ]; then
    echo "❌ ERROR: Document '${file}' contains ${deleted} deletions! Documentation must be append-only."
    DELETIONS=$((DELETIONS + deleted))
  fi
done < <(git diff -w --numstat "${BASELINE}" -- "${DOCS[@]}")

if [ "${DELETIONS}" -gt 0 ]; then
  echo "❌ CI FAILED: Total ${DELETIONS} deletions detected in protected documentation."
  exit 1
fi

echo "✅ CI PASSED: All documentation edits are strictly append-only (0 deletions)."
exit 0
