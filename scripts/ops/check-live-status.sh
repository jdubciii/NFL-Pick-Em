#!/usr/bin/env bash
# ==============================================================================
# HAG-11 Directive 1: Tri-Target Synchronization & Status Verification
#
# Compares:
# 1. GitHub Tip SHA (git remote origin/feat/p37-shell-auth-openslate or local HEAD)
# 2. Render Live Backend SHA (https://nfl-pick-em-api.onrender.com/api/health)
# 3. GitHub Pages Static Preview SHA (https://jdubciii.github.io/NFL-Pick-Em/version.json)
# ==============================================================================

set -uo pipefail

BRANCH="${1:-feat/p37-shell-auth-openslate}"
RENDER_HEALTH_URL="${2:-https://nfl-pick-em-api.onrender.com/api/health}"
PREVIEW_VERSION_URL="${3:-https://jdubciii.github.io/NFL-Pick-Em/version.json}"

echo "======================================================================"
echo "         NFL PICK 'EM - LIVE DEPLOYMENT SYNCHRONIZATION CHECK         "
echo "======================================================================"

# 1. GitHub Tip
GITHUB_TIP=$(git rev-parse --short "origin/${BRANCH}" 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo "UNKNOWN")
echo "  [1] GitHub Tip (${BRANCH}):    ${GITHUB_TIP}"

# 2. Render Live Backend Health
RENDER_PAYLOAD=$(curl -fsSL --max-time 8 "${RENDER_HEALTH_URL}" 2>/dev/null || echo "")
if [ -n "$RENDER_PAYLOAD" ] && echo "$RENDER_PAYLOAD" | jq . >/dev/null 2>&1; then
  RENDER_STATUS=$(echo "$RENDER_PAYLOAD" | jq -r '.status // "unknown"')
  RENDER_RAW_COMMIT=$(echo "$RENDER_PAYLOAD" | jq -r '.commit // "unknown"')
  RENDER_COMMIT=$(echo "$RENDER_RAW_COMMIT" | cut -c1-7)
  RENDER_BUILT_AT=$(echo "$RENDER_PAYLOAD" | jq -r '.builtAt // .timestamp // "unknown"')
  echo "  [2] Render Live Backend:           ${RENDER_COMMIT} (status: ${RENDER_STATUS}, built: ${RENDER_BUILT_AT})"
else
  RENDER_COMMIT="UNREACHABLE"
  echo "  [2] Render Live Backend:           UNREACHABLE / PROBING FAILED"
fi

# 3. Static Preview URL
PREVIEW_PAYLOAD=$(curl -fsSL --max-time 8 "${PREVIEW_VERSION_URL}" 2>/dev/null || echo "")
if [ -n "$PREVIEW_PAYLOAD" ] && echo "$PREVIEW_PAYLOAD" | jq . >/dev/null 2>&1; then
  PREVIEW_RAW_COMMIT=$(echo "$PREVIEW_PAYLOAD" | jq -r '.commit // "unknown"')
  PREVIEW_COMMIT=$(echo "$PREVIEW_RAW_COMMIT" | cut -c1-7)
  PREVIEW_BUILT_AT=$(echo "$PREVIEW_PAYLOAD" | jq -r '.builtAt // "unknown"')
  echo "  [3] GitHub Pages Static Preview:   ${PREVIEW_COMMIT} (built: ${PREVIEW_BUILT_AT})"
else
  PREVIEW_COMMIT="UNPUBLISHED"
  echo "  [3] GitHub Pages Static Preview:   UNPUBLISHED / NOT YET DEPLOYED"
fi

echo "----------------------------------------------------------------------"
if [ "$GITHUB_TIP" != "UNKNOWN" ] && [ "$GITHUB_TIP" = "$RENDER_COMMIT" ] && [ "$GITHUB_TIP" = "$PREVIEW_COMMIT" ]; then
  echo "  RESULT: ✅ SYNCHRONIZED — Tip, Render backend, and preview match (${GITHUB_TIP})."
  exit 0
elif [ "$RENDER_COMMIT" = "UNREACHABLE" ] || [ "$PREVIEW_COMMIT" = "UNPUBLISHED" ]; then
  echo "  RESULT: ⏳ PENDING PUBLICATION/DEPLOYMENT — Waiting for review or deploy triggers."
  exit 2
else
  echo "  RESULT: ⚠️ DIVERGENCE DETECTED — Versions do not match across all 3 targets."
  exit 1
fi
