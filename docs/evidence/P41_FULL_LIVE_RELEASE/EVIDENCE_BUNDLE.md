# P41 FULL LIVE RELEASE EVIDENCE BUNDLE

**AUTHORITY:** `PO-FULL-LIVE-RELEASE-2026-10-18-01`  
**ISSUED BY:** Jack, Product Owner, October 18, 2026  
**RECORD TYPE:** Governed Full Live Release Evidence Container  
**TIMESTAMP:** 2026-10-18T20:20:00Z  

---

## 1. RELEASE IDENTITY & IMMUTABLE SOURCE
- **`RELEASE_SHA`:** `71fdb4c9859ab7cef7682cdc926e239ebe5a41a1`
- **Target Branch:** `feat/p37-shell-auth-openslate`
- **Remote Tip:** `origin/feat/p37-shell-auth-openslate` (`71fdb4c9859ab7cef7682cdc926e239ebe5a41a1`)
- **Working Tree Cleanliness:** Clean (`git status -s` empty)
- **Frozen Migrations Integrity:** Checkpoint `926d541` validated identical (Exit Code 0)
- **Prisma Schema Validation:** Validated cleanly (`npx prisma validate` Exit Code 0)
- **Authoritative Test Suites:** 170/170 tests passing (52 core + 118 security/CORS)

---

## 2. PRODUCTION DATABASE MIGRATION (SUPABASE POSTGRESQL 17.6)
- **Target Project:** `nsljipyoihcoqkuphhll` (`aws-0-us-east-1.pooler.supabase.com:5432/postgres`)
- **Database Engine:** PostgreSQL 17.6 on x86_64-pc-linux-gnu

### Applied SQL Proposals (Exact 100% SHA-256 Match to Isolated PG17-Tested Artifacts):
1. **Proposal A (`02_proposal_a_games_manifest.sql`):**
   - Path: `docs/evidence/P41_POST_PURGE_VALIDATION/sql/02_proposal_a_games_manifest.sql`
   - SHA-256: `50926ff835a1d1c3f9a90c38d7fd99570a814478e5fb0f627d46d09f9ecdbb21`
   - Status: Applied & Verified
2. **Proposal E (`06_proposal_e_picks_security.sql`):**
   - Path: `docs/evidence/P41_POST_PURGE_VALIDATION/sql/06_proposal_e_picks_security.sql`
   - SHA-256: `a39e8ba26e5ceaba8d405926c184862060dce0bb379d8cd69748513957776e96`
   - Status: Applied & Verified
3. **Proposal B (`03_proposal_b_games_import.sql`):**
   - Path: `docs/evidence/P41_POST_PURGE_VALIDATION/sql/03_proposal_b_games_import.sql`
   - SHA-256: `2e0f7e8a1703df9a3ea736a99afc74a52b83eb5fb2feb5db81928a4a3f65b472`
   - Status: Applied & Verified (14 canonical games imported, Rev 1 manifest stored)
4. **Proposal C (`04_proposal_c_submissions_designation.sql`):**
   - Path: `docs/evidence/P41_POST_PURGE_VALIDATION/sql/04_proposal_c_submissions_designation.sql`
   - SHA-256: `abcc55fcbd90eed210ed03923dd9ec6c598373f36c1de3d061fc40b66b7f0e0d`
   - Status: Applied & Verified
5. **Proposal D (`05_proposal_d_settlement_ledger.sql`):**
   - Path: `docs/evidence/P41_POST_PURGE_VALIDATION/sql/05_proposal_d_settlement_ledger.sql`
   - SHA-256: `b7f60eb9d46ca820be25118f4b4506835ddc13e12b297b5f6bd88a34c61fddbe`
   - Status: Applied & Verified

### Production Database Integrity & Postchecks:
- **Pool Preservation:** 1 pool (`9b893bef-3b5a-4ffa-951d-8ba27f9c9782`, "Main League") preserved 100%.
- **Membership Preservation:** 10 pool memberships preserved 100% in ACTIVE status.
- **Account Preservation:** 10 user accounts preserved 100%.
- **Game Records:** 30 total games (16 legacy games preserved with original UUIDs + 14 canonical Week 6 games).
- **Pick Records:** 80 baseline picks preserved and resolved to canonical events with zero orphaned rows.
- **Zero Inadvertent Settlement:** `penalty_ledger`: 0 rows; `weekly_wrapups`: 0 rows.
- **Tripwire Integrity:** 20/20 public tables have RLS enabled (`scripts/run_hosted_tripwire.js` PASSED).

---

## 3. RENDER PRODUCTION BACKEND DEPLOYMENT
- **Render Service ID:** `srv-db9a12on74is73ev84m0` (`nfl-pick-em-api`)
- **API URL:** `https://nfl-pick-em-api.onrender.com`
- **Deployed Source Commit:** `71fdb4c9859ab7cef7682cdc926e239ebe5a41a1`
- **Rollback Deployment Preserved:** `dep-db9f4u3rjlhs73ejf4fg` (Source: `34bf0025bc0067fc20af43c316e346a2a5f5fa4b`)
- **Operational Invariants:**
  - `BACKGROUND_JOBS_ENABLED=false` (workers/cron offline)
  - `SETTLEMENT_ENABLED=false` (automated settlement disabled)
  - `PENALTY_POSTING_ENABLED=false` (penalty posting disabled)

### Live Backend Smoke Test Results:
1. Health endpoint (`GET /api/health`): HTTP 200 OK (`{ status: 'ok' }`).
2. Code activation probe (`POST /api/admin/ops/slate/refresh`): HTTP 401 (Route activated).
3. PostgREST RPC Unauthenticated (`get_pool_canonical_games`): Fails closed (0 rows returned).
4. Supabase Auth Sign-In: Succeeded, valid session token issued.
5. Express Authentication (`GET /api/me/inbox`): Unauth 401 rejected; Auth 200 OK.
6. Pool Context: ACTIVE membership confirmed for test identity.
7. PostgREST RPC Authenticated (`get_pool_canonical_games`): Returns all 14 canonical Week 6 games; zero commissioner notes leaked.
8. Permitted Pick Save (`POST /api/picks` on game `401873008`, WAS @ SF): HTTP 200 OK, pick persisted.
9. Forbidden Locked Game Mutation (`POST /api/picks` on game `401872995`, SEA @ DEN): HTTP 403 Forbidden ("Game is locked").
10. Pool Lounge Messaging: POST `/api/pools/:id/lounge/messages` HTTP 201 Created; GET returns message listed.
11. Settlement Invariants: `penalty_ledger`: 0 rows; `weekly_wrapups`: 0 rows.

---

## 4. ANDROID RELEASE PACKAGING & ARTIFACTS
- **versionCode:** `74`
- **versionName:** `41.4.0`
- **Artifact Path:** `c:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\pickem-v74-p41-full-live.apk`
- **Conventional Root Copy:** `app-release.apk`
- **File Size:** 6,998,477 bytes
- **SHA-256 Digest:** `05B7F0F35DFF8512BF2B9546D035BB1453AFD46BC19FFC36C6163E05C7200A33`
- **APK Signature Scheme v2:** `true` (Verified via `apksigner.bat verify --verbose`)
- **Signer SHA-256 Fingerprint:** `0f4397ffa90b7934d49bbe58317839fd534e36f7d483cda52ce29e960af2e9a4` (100% compatible with previous release)
- **Packaged Web Assets:**
  - `index-DvmUYcUv.css` (181 kB)
  - `index-Qk3p94Z9.js` (889 kB)
  - `index.html` (497 bytes)
  - Zero service-role secrets embedded
- **Rollback Binary Preserved:** `pickem-v73-s2.apk` (6,995,304 bytes, SHA-256 `2d27d588...`)
