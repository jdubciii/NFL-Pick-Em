#!/usr/bin/env bash
# ==============================================================================
# HAG-11 Directive 1: Tri-Target Synchronization & Status Verification
#
# Authoritatively compares:
# 1. Authoritative Remote GitHub Tip SHA (via git ls-remote on refs/heads/${BRANCH})
# 2. Render Live Backend SHA (https://nfl-pick-em-api.onrender.com/api/health)
# 3. GitHub Pages Static Preview SHA (https://jdubciii.github.io/NFL-Pick-Em/version.json)
#
# Strict requirements:
# - Valid full 40-character identical hashes across all 3 targets
# - Render live backend reports status=ok
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
RENDER_STATUS="unreachable"
RENDER_COMMIT="UNREACHABLE"
RENDER_BUILT_AT="unknown"

if [ -n "$RENDER_PAYLOAD" ] && echo "$RENDER_PAYLOAD" | jq . >/dev/null 2>&1; then
  RENDER_STATUS=$(echo "$RENDER_PAYLOAD" | jq -r '.status // "unknown"')
  RENDER_COMMIT=$(echo "$RENDER_PAYLOAD" | jq -r '.commit // "unknown"')
  RENDER_BUILT_AT=$(echo "$RENDER_PAYLOAD" | jq -r '.builtAt // "unknown"')
  echo "  [2] Render Live Backend:"
  echo "      SHA: ${RENDER_COMMIT} (status: ${RENDER_STATUS}, built: ${RENDER_BUILT_AT})"
else
  echo "  [2] Render Live Backend:"
  echo "      UNREACHABLE / PROBING FAILED"
fi

# 3. Static Preview URL
PREVIEW_PAYLOAD=$(curl -fsSL --max-time 8 "${PREVIEW_VERSION_URL}" 2>/dev/null || echo "")
PREVIEW_COMMIT="UNPUBLISHED"
PREVIEW_BUILT_AT="unknown"

if [ -n "$PREVIEW_PAYLOAD" ] && echo "$PREVIEW_PAYLOAD" | jq . >/dev/null 2>&1; then
  PREVIEW_COMMIT=$(echo "$PREVIEW_PAYLOAD" | jq -r '.commit // "unknown"')
  PREVIEW_BUILT_AT=$(echo "$PREVIEW_PAYLOAD" | jq -r '.builtAt // "unknown"')
  echo "  [3] GitHub Pages Static Preview:"
  echo "      SHA: ${PREVIEW_COMMIT} (built: ${PREVIEW_BUILT_AT})"
else
  echo "  [3] GitHub Pages Static Preview:"
  echo "      UNPUBLISHED / NOT YET DEPLOYED"
fi

echo "----------------------------------------------------------------------"
if [ "$GITHUB_TIP" = "UNAVAILABLE" ]; then
  echo "  RESULT: ❌ REMOTE QUERY FAILED — Could not query authoritative remote ref."
  exit 3
fi

HEX_40_REGEX="^[0-9a-fA-F]{40}$"

IS_VALID_TIP=false
if [[ "$GITHUB_TIP" =~ $HEX_40_REGEX ]]; then
  IS_VALID_TIP=true
fi

IS_VALID_RENDER=false
if [[ "$RENDER_COMMIT" =~ $HEX_40_REGEX ]]; then
  IS_VALID_RENDER=true
fi

IS_VALID_PREVIEW=false
if [[ "$PREVIEW_COMMIT" =~ $HEX_40_REGEX ]]; then
  IS_VALID_PREVIEW=true
fi

# Exact 40-character identical match AND status=ok required
if [ "$IS_VALID_TIP" = true ] && [ "$IS_VALID_RENDER" = true ] && [ "$IS_VALID_PREVIEW" = true ] && \
   [ "$GITHUB_TIP" = "$RENDER_COMMIT" ] && [ "$GITHUB_TIP" = "$PREVIEW_COMMIT" ] && \
   [ "$RENDER_STATUS" = "ok" ]; then
  echo "  RESULT: ✅ SYNCHRONIZED — Tip, Render backend, and preview match exact 40-char SHA (${GITHUB_TIP}) with status=ok."
  exit 0
elif [ "$RENDER_COMMIT" = "UNREACHABLE" ] || [ "$PREVIEW_COMMIT" = "UNPUBLISHED" ] || [ "$RENDER_COMMIT" = "unknown" ]; then
  echo "  RESULT: ⏳ PENDING PUBLICATION/DEPLOYMENT — Waiting for review, publication, or deployment completion."
  echo "          GitHub Tip:   ${GITHUB_TIP}"
  echo "          Render Live:  ${RENDER_COMMIT} (status: ${RENDER_STATUS})"
  echo "          Preview URL:  ${PREVIEW_COMMIT}"
  exit 2
else
  echo "  RESULT: ⚠️ DIVERGENCE DETECTED — Full 40-character hashes do not match across all 3 targets or status!=ok."
  echo "          GitHub Tip:   ${GITHUB_TIP}"
  echo "          Render Live:  ${RENDER_COMMIT} (status: ${RENDER_STATUS})"
  echo "          Preview URL:  ${PREVIEW_COMMIT}"
  exit 1
fi
