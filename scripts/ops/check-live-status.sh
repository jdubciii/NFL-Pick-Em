#!/usr/bin/env bash
# ==============================================================================
# HAG-11 Directive 1: Tri-Target Synchronization & Status Verification
#
# Authoritatively compares:
# 1. Authoritative Remote GitHub Tip SHA (via git ls-remote on refs/heads/${BRANCH})
# 2. Render Live Backend SHA (https://nfl-pick-em-api.onrender.com/api/health)
# 3. GitHub Pages Static Preview SHA (https://jdubciii.github.io/NFL-Pick-Em/version.json)
# ==============================================================================

set -uo pipefail

BRANCH="${1:-feat/p37-shell-auth-openslate}"
REPO_REMOTE="${REPO_REMOTE:-https://github.com/jdubciii/NFL-Pick-Em.git}"
RENDER_HEALTH_URL="${2:-https://nfl-pick-em-api.onrender.com/api/health}"
PREVIEW_VERSION_URL="${3:-https://jdubciii.github.io/NFL-Pick-Em/version.json}"

echo "======================================================================"
echo "         NFL PICK 'EM - LIVE DEPLOYMENT SYNCHRONIZATION CHECK         "
echo "======================================================================"

# 1. Authoritative Remote GitHub Tip via git ls-remote
REMOTE_LINE=$(git ls-remote --heads "${REPO_REMOTE}" "refs/heads/${BRANCH}" 2>/dev/null || echo "")
GITHUB_TIP=$(echo "$REMOTE_LINE" | awk '{print $1}')

if [ -n "$GITHUB_TIP" ]; then
  echo "  [1] Authoritative GitHub Remote Tip (${BRANCH}):"
  echo "      SHA: ${GITHUB_TIP}"
else
  echo "  [1] Authoritative GitHub Remote Tip (${BRANCH}):"
  echo "      QUERY FAILED / REMOTE REF UNAVAILABLE"
  GITHUB_TIP="UNAVAILABLE"
fi

# 2. Render Live Backend Health
RENDER_PAYLOAD=$(curl -fsSL --max-time 8 "${RENDER_HEALTH_URL}" 2>/dev/null || echo "")
if [ -n "$RENDER_PAYLOAD" ] && echo "$RENDER_PAYLOAD" | jq . >/dev/null 2>&1; then
  RENDER_STATUS=$(echo "$RENDER_PAYLOAD" | jq -r '.status // "unknown"')
  RENDER_COMMIT=$(echo "$RENDER_PAYLOAD" | jq -r '.commit // "unknown"')
  RENDER_BUILT_AT=$(echo "$RENDER_PAYLOAD" | jq -r '.builtAt // .timestamp // "unknown"')
  echo "  [2] Render Live Backend:"
  echo "      SHA: ${RENDER_COMMIT} (status: ${RENDER_STATUS}, built: ${RENDER_BUILT_AT})"
else
  RENDER_COMMIT="UNREACHABLE"
  echo "  [2] Render Live Backend:"
  echo "      UNREACHABLE / PROBING FAILED"
fi

# 3. Static Preview URL
PREVIEW_PAYLOAD=$(curl -fsSL --max-time 8 "${PREVIEW_VERSION_URL}" 2>/dev/null || echo "")
if [ -n "$PREVIEW_PAYLOAD" ] && echo "$PREVIEW_PAYLOAD" | jq . >/dev/null 2>&1; then
  PREVIEW_COMMIT=$(echo "$PREVIEW_PAYLOAD" | jq -r '.commit // "unknown"')
  PREVIEW_BUILT_AT=$(echo "$PREVIEW_PAYLOAD" | jq -r '.builtAt // "unknown"')
  echo "  [3] GitHub Pages Static Preview:"
  echo "      SHA: ${PREVIEW_COMMIT} (built: ${PREVIEW_BUILT_AT})"
else
  PREVIEW_COMMIT="UNPUBLISHED"
  echo "  [3] GitHub Pages Static Preview:"
  echo "      UNPUBLISHED / NOT YET DEPLOYED"
fi

echo "----------------------------------------------------------------------"
if [ "$GITHUB_TIP" = "UNAVAILABLE" ]; then
  echo "  RESULT: ❌ REMOTE QUERY FAILED — Could not query authoritative remote ref."
  exit 3
fi

# Compare full 40-char hashes or exact matches
FULL_MATCH=false
if [ "$GITHUB_TIP" = "$RENDER_COMMIT" ] && [ "$GITHUB_TIP" = "$PREVIEW_COMMIT" ]; then
  FULL_MATCH=true
fi

# Also check if backend/preview emitted 7-char short SHAs matching the prefix of full remote SHA
SHORT_MATCH=false
if [ "${RENDER_COMMIT:0:7}" = "${GITHUB_TIP:0:7}" ] && [ "${PREVIEW_COMMIT:0:7}" = "${GITHUB_TIP:0:7}" ]; then
  SHORT_MATCH=true
fi

if [ "$FULL_MATCH" = true ] || [ "$SHORT_MATCH" = true ]; then
  echo "  RESULT: ✅ SYNCHRONIZED — Tip, Render backend, and preview match (${GITHUB_TIP})."
  exit 0
elif [ "$RENDER_COMMIT" = "UNREACHABLE" ] || [ "$PREVIEW_COMMIT" = "UNPUBLISHED" ]; then
  echo "  RESULT: ⏳ PENDING PUBLICATION/DEPLOYMENT — Waiting for review or deploy triggers."
  exit 2
else
  echo "  RESULT: ⚠️ DIVERGENCE DETECTED — Hashes do not match across all 3 targets."
  echo "          GitHub:  ${GITHUB_TIP}"
  echo "          Render:  ${RENDER_COMMIT}"
  echo "          Preview: ${PREVIEW_COMMIT}"
  exit 1
fi
