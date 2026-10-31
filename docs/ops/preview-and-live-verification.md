# Live Preview & Version Synchronization Architecture (Directive 1)

## 1. Overview & Objective
Directive 1 ("See It Live") establishes zero-cost ($0) browser preview hosting for the built web client (`client/dist`), real Render backend integration, and synchronized version reporting across client and server.

## 2. Preview Hosting Origin & Configuration
- **Host**: GitHub Pages (native $0 static hosting in the `jdubciii/NFL-Pick-Em` repository).
- **Public URL**: `https://jdubciii.github.io/NFL-Pick-Em/`
- **Origin**: `https://jdubciii.github.io`
- **Base Path**: `/NFL-Pick-Em/`
- **Routing Support**: Single Page Application (SPA) routing is preserved by generating `client/dist/404.html` (mirroring `index.html`) during the build step, ensuring deep links (e.g. `/profile`, `/login`) resolve properly without server-side HTTP 404 drops.
- **Machine Verification**: Automatically emits `client/dist/version.json` containing `{ "commit": "<SHA>", "builtAt": "<ISO>", "branch": "<branch>" }`.

## 3. GitHub Actions Continuous Deployment Workflow
- **Workflow File**: `.github/workflows/preview.yml`
- **Triggers**:
  - `push` to `feat/p37-shell-auth-openslate`
  - `workflow_dispatch` (manual one-click trigger)
- **Deployment Mechanics**: Official GitHub Pages actions (`actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`).

## 4. Backend Health & Version Reporting
- **Endpoints**: `GET /api/health` and `GET /health`
- **Response Format**:
  ```json
  {
    "status": "ok",
    "commit": "2bd9487a2ce64a2bc280c512bf690ac32c3476b5",
    "builtAt": "2026-10-31T19:25:20.453Z",
    "timestamp": "2026-10-31T19:26:00.123Z",
    "uptime": 128.4
  }
  ```
- **Commit Resolution**: Reads `process.env.RENDER_GIT_COMMIT` (injected automatically by Render web service deployments), falls back to `process.env.GIT_COMMIT`, and falls back to `git rev-parse HEAD` in local development.

## 5. Client Version Visibility & Profile UI
- **Injected Constants**: `APP_BUILD_COMMIT` and `APP_BUILD_TIME` via Vite build definitions.
- **Profile UI (`ProfilePage.tsx`)**:
  - Displays **System Build & Deployment Verification** card (`data-testid="system-build-verification"`).
  - Displays client static dist commit SHA and build timestamp.
  - Automatically probes `/api/health` on mount, displaying the live Render backend commit SHA, health status badge (`HEALTHY` vs `UNREACHABLE`), and build timestamp.

## 6. Capacitor Web Compatibility & Browser Fallbacks
An exhaustive audit of native device integrations confirms safe browser operation:
1. **Core Bridge (`@capacitor/core`)**: `Capacitor.isNativePlatform()` safely reports `false` in standard web browsers.
2. **Camera Hardware Capture (`@capacitor/camera`)**: Evidence submission drawer uses standard HTML5 `<input type="file" accept="video/*" capture="environment" />`. In mobile browsers (Safari/Chrome), this invokes native camera/camcorder hardware; in desktop browsers, it opens the system file picker.
3. **Haptics (`client/src/utils/haptics.ts`)**: Defensively probes `(window as any).Capacitor?.isPluginAvailable('Haptics')`, falling back cleanly to `navigator.vibrate` if supported, or silently no-ops in desktop environments without hardware vibration engines.
4. **CapacitorHttp**: Only active in native Android WebView. Standard web browsers use native `window.fetch`.

## 7. Pez Synchronization Check Command
Pez can execute the repository script:
```bash
./scripts/ops/check-live-status.sh
```
Or execute the standalone one-liner:
```bash
GITHUB_TIP=$(git rev-parse --short origin/feat/p37-shell-auth-openslate 2>/dev/null || git rev-parse --short HEAD)
RENDER_COMMIT=$(curl -fsSL --max-time 5 https://nfl-pick-em-api.onrender.com/api/health 2>/dev/null | jq -r '.commit' | cut -c1-7)
PREVIEW_COMMIT=$(curl -fsSL --max-time 5 https://jdubciii.github.io/NFL-Pick-Em/version.json 2>/dev/null | jq -r '.commit' | cut -c1-7)
echo "GitHub: ${GITHUB_TIP} | Render: ${RENDER_COMMIT:-OFFLINE} | Preview: ${PREVIEW_COMMIT:-UNPUBLISHED}"
```

## 8. Exact Remaining Manual Approval & Settings Steps
To activate the live preview and permit cross-origin communication, the following three manual settings steps are required:

1. **GitHub Pages Enablement (Repository Settings)**:
   - URL: `https://github.com/jdubciii/NFL-Pick-Em/settings/pages`
   - Setting: Under **Build and deployment** > **Source**, select **"GitHub Actions"**.
2. **Render CORS Allowlist (Render Dashboard)**:
   - URL: `https://dashboard.render.com` > Select service `nfl-pick-em-api` > **Environment**.
   - Setting: Add `https://jdubciii.github.io` to `CORS_ALLOWED_ORIGINS` (comma-separated, e.g. `https://portal.nflpickem.com,https://jdubciii.github.io`).
3. **Supabase Auth Redirect URLs (Supabase Dashboard)**:
   - URL: `https://supabase.com/dashboard/project/nsljipyoihcoqkuphhll` > **Authentication** > **URL Configuration**.
   - Setting: Under **Redirect URLs**, add `https://jdubciii.github.io/NFL-Pick-Em/*` (and `https://jdubciii.github.io/NFL-Pick-Em/login`).
