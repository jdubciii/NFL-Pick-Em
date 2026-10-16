# P41 FINAL HOSTED ANDROID ACCEPTANCE CANDIDATE EVIDENCE

**RECORD TYPE:** Unsealed Decision #53 Artifact Evidence  
**MILESTONE:** P41_FINAL_ACCEPTANCE  
**DATE:** 2026-10-16  
**AUTHORITY:** Jack's Product Owner Authorization (Emergency Directive — 2026-10-16)  

---

### A. Authority & Distribution Scope

- **Authorization:** Jack's explicit Product Owner Directive authorizing compilation of the final hosted Android candidate.
- **Permitted Recipients:** Jack and his family member for acceptance-device testing only.
- **Strict Invariants:**
  - Zero public links or broad distribution.
  - Zero Google Play or app-store publication.
  - Zero Git pushes to origin.
  - Zero backend deployment mutations.

---

### B. Hosted Backend Telemetry

- **Render Service ID:** `srv-db9a12on74is73ev84m0`
- **Provider HTTPS Origin:** `https://nfl-pick-em-api.onrender.com`
- **Backend Deployed SHA:** `59a558db306d23bb5144eebd49ec5a16cf05f5f4`
- **Live Deployment ID:** `dep-db9a3vfbtjjs73aup5k0`
- **Service Plan:** Render Free ($0 spend)
- **Background Workers:** Disabled (`BACKGROUND_JOBS_ENABLED=false`)

---

### C. Client Source Provenance

- **`ANDROID_SOURCE_SHA`:** `a0c839abb690d89f72ef4050f22ca39d2e1d09c1`
- **Parent SHA:** `59a558db306d23bb5144eebd49ec5a16cf05f5f4`
- **Changed Configuration:**
  - `client/android/app/build.gradle`: Updated `versionCode` 72 -> 73, `versionName` "41.3.0" -> "41.3.1".
- **Effective Production API Origin:** `VITE_API_URL=https://nfl-pick-em-api.onrender.com` (verified in `client/.env.production` and inlined into compiled production bundle).
- **Capacitor `allowNavigation`:** `['nfl-pick-em-api.onrender.com']` (verified in `client/capacitor.config.ts`).
- **Capacitor Android Scheme:** `androidScheme: 'https'` (WebView Origin: `https://localhost`).
- **Git Push Status:** ZERO remote pushes executed. Local feature branch `feat/p37-shell-auth-openslate` preserved.

---

### D. Build Provenance

1. **Client Web Production Build:**
   - Command: `npm --prefix client run build` with `VITE_API_URL=https://nfl-pick-em-api.onrender.com`
   - Exit Code: 0
   - Output: `client/dist/index.html` (497 B), `client/dist/assets/index-BWINUVan.js` (876,863 B), `client/dist/assets/index-Bql-ZanU.css` (180,276 B).
2. **Capacitor Android Synchronization:**
   - Command: `npx --no-install cap sync android`
   - Exit Code: 0
   - Parity: 100% SHA-256 bit-identical match between `client/dist/` assets and `client/android/app/src/main/assets/public/`.
3. **Android Release Compilation:**
   - Command: `.\gradlew.bat assembleRelease --no-build-cache`
   - Exit Code: 0 (BUILD SUCCESSFUL in 2m 12s, 210 actionable tasks).
4. **Android SDK Toolchain:**
   - Android SDK Build-Tools: 35.0.0
   - apksigner: `C:\Users\kacone\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat`
   - aapt: `C:\Users\kacone\AppData\Local\Android\Sdk\build-tools\35.0.0\aapt.exe`
5. **Release Signing Identity:**
   - Keystore: `client/android/nflpickem-release.keystore` (Redacted)
   - Alias: `nflpickem`
   - Key Algorithm: RSA 2048-bit

---

### E. Signed Release Binary Details

- **Versioned Artifact:** `pickem-v73-s2.apk`
- **Conventional Root Copy:** `app-release.apk`
- **Gradle Release Output:** `client/android/app/build/outputs/apk/release/app-release.apk`
- **Exact File Size:** 6,995,304 bytes
- **SHA-256 Digest:** `2d27d588d2a3d62cf29856db49b8266abe5c88c97818ff1fb36e57e5cd1d25c4` (Verified identical across all three locations)
- **Application ID:** `com.nflpickem.app`
- **versionCode:** `73`
- **versionName:** `41.3.1`
- **minSdkVersion:** `24`
- **targetSdkVersion:** `36`
- **APK Signature Scheme v2:** `true` (Verified via `apksigner verify --verbose`)
- **Signer DN:** `CN=NFLPickEm, OU=Engineering, O=League, L=Phoenix, ST=AZ, C=US`
- **Signer Certificate SHA-256 Fingerprint:** `0f4397ffa90b7934d49bbe58317839fd534e36f7d483cda52ce29e960af2e9a4`

---

### F. Security & Packaged Asset Scan

- **Packaged Web Assets:**
  - `assets/public/index.html` (497 B)
  - `assets/public/assets/index-BWINUVan.js` (876,863 B)
  - `assets/public/assets/index-Bql-ZanU.css` (180,276 B)
  - `assets/public/favicon.svg` (9,522 B), `assets/public/icons.svg` (5,031 B)
  - `assets/public/cordova.js` (0 B), `assets/public/cordova_plugins.js` (0 B)
- **Source Map Leakage:** ZERO (`.map` files count = 0).
- **Executable Legacy Token Fallbacks:** NONE. (`nfl_pickem_jwt_token` appears solely in `localStorage.removeItem` cleanup during logout and bootstrap clearance).
- **Hardcoded ADMIN / Bearer Credentials:** NONE.
- **Development Actor-Header Injections:** NONE (`x-user-email` = 0, `x-user-role` = 0, `x-pool-id` = 0).
- **Custom Idempotency Headers:** NONE (`x-client-request-id` = 0).
- **LAN Routing / Proxies:** NONE (`192.168.` = 0, `localhost:3000` = 0).
- **Service-Role Secrets:** NONE.
- **Hosted API Destination:** `https://nfl-pick-em-api.onrender.com` strictly inlined in `scopedExpressFetch`.

---

### G. Native HTTPS & Live Server CORS Validation

- **Native Origin:** `https://localhost` (Static verified via `client/capacitor.config.ts`).
- **Live Render Preflight Probes (`https://nfl-pick-em-api.onrender.com/api/health`):**
  - Origin `https://localhost`: HTTP 204 No Content
    - `Access-Control-Allow-Origin: https://localhost`
    - `Access-Control-Allow-Credentials: true`
    - `Access-Control-Allow-Headers: Content-Type,Authorization`
    - `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
  - Origin `http://localhost`: HTTP 204 No Content
    - `Access-Control-Allow-Origin: http://localhost`
    - `Access-Control-Allow-Credentials: true`
  - Negative Origin Control (`https://malicious.com`): HTTP 200 with NO `Access-Control-Allow-Origin` (Rejected).
- **Live Health Endpoint:** `GET /api/health` returned HTTP 200 `{"status":"ok"}`.
- **Live Protected Route Fail-Closed:** `GET /api/me/inbox` without Bearer returned HTTP 401 `{"error":"Authentication required. Missing or malformed token."}`.
- **Live Header Bypass Test:** `GET /api/me/inbox` with `x-user-email: admin@example.com` returned HTTP 401 (Zero bypass).
- **Physical Device Telemetry:** `PENDING_ACCEPTANCE` (Synthetic preflight and static origin PASS; physical device acceptance pending two-member installation).

---

### H. Regression & Architectural Invariants

- **Authoritative Vitest Suites:** 17 suites, 174 tests passed, 0 failures, 0 skips, 0 todo.
- **Backend Build (`tsc`):** Exit code 0.
- **Client Build (`tsc -b && vite build`):** Exit code 0.
- **Decision #61 Canonical Six Mirrors:** Byte-identical (SHA-256 parity verified):
  - `dependableInfoService.ts`: `de63fc7ef4526378dbdbd893732744a5caffd90616a27b7603390144146cc4b0`
  - `sweatReceiptService.ts`: `32260366348f01033c1795cd3e753eab177117634ebda44ab5c08d1b07a7e4f3`
  - `seasonStoryService.ts`: `ca64105f17c4ff076fc3698dd255f69cab6e12f031396cbdb6189e0fde895481`
  - `weeklyRecapService.ts`: `c23aeb4ece99f9a89c3474b3cbfac745272b347119de6c5e57b938b0bd366b27`
  - `deadlineAlertPlanner.ts`: `f28569ae567a88c861b279b81acda9b385819c83809a1207389f9dd797ed17b3`
  - `poolSocialService.ts`: `07540b8a82ec6daa10ea7431613a494ed78894b63faec0a58df2b41a60105fed`
- **Frozen Migrations:**
  - P38: `0d94fa38fe57b8f8b6302705fbc96283cf388add4fbc88a10ea706fedffe343e`
  - P41: `71a35132503921f6e62e60fc1ff0b94a76f765b7769991a9c3931fad746db765`
- **Client Import Boundary:** Verified 0 relative imports escape `client/src`.

---

### I. Acceptance Status Summary

| Gate | Status | Details |
|---|---|---|
| `HOSTED_APK_BUILD` | **PASS** | Gradle assembleRelease completed without cache |
| `APK_SIGNATURE_V2` | **PASS** | Scheme v2 verified by apksigner |
| `PACKAGED_CREDENTIAL_AUDIT` | **PASS** | Zero hardcoded secrets, dev headers, or legacy paths |
| `API_ORIGIN` | **PASS** | `https://nfl-pick-em-api.onrender.com` strictly compiled |
| `NATIVE_CORS_PREFLIGHT` | **PASS** | HTTP 204 on `https://localhost` and `http://localhost` |
| `PHYSICAL_DEVICE_ACCEPTANCE` | **NOT_RUN** | Awaiting Jack & family acceptance-device test |
| `REAL_MEMBER_A` | **NOT_RUN** | Deferred per Product Owner Directive |
| `REAL_MEMBER_B` | **NOT_RUN** | Deferred per Product Owner Directive |
| `DISTRIBUTION` | **AUTHORIZED** | Restricted strictly to Jack & family acceptance devices |
| `APP_STORE_PUBLICATION` | **NOT_AUTHORIZED** | Prohibited |
| `PHASE38` | **CONTROLLED_DEFERRED**| Preserved |
| `WORKER_ACTIVATION` | **BLOCKED** | `BACKGROUND_JOBS_ENABLED=false` |
| `PHASE41_CLOSURE` | **PENDING** | Awaiting device acceptance |
