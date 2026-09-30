#!/usr/bin/env bash
set -euo pipefail

# diff-allowlist-check.sh - Decision #39, #47 / R-12.2-U §1.B
npx tsx scripts/ci/diff-allowlist-check.mjs "$@"
