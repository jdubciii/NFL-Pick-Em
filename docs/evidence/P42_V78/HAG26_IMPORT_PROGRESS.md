# HAG-26 Import Progress & Telemetry Report

**Timestamp**: 2026-10-22T07:40:00Z
**Pool ID**: `9b893bef-3b5a-4ffa-951d-8ba27f9c9782`
**Commissioner**: `e3242a19-1131-4fc5-9886-7730f10ef69b`
**Execution Script**: `scripts/production_season_import_runner.ts`
**Target Environment**: Hosted Supabase PostgreSQL via `.env.hosted`

---

## 1. Baseline Verification
- **Pre-Import Verified Baseline**:
  - `games`: 30 rows (14 in Week 6, 16 in Week null)
  - `picks`: 84 rows
  - `pool_memberships`: 11 rows
  - `pools`: 1 row
  - `weekly_slate_manifests`: 1 row (Week 6, revision 1, 14 events)
- **Status**: PASSED. Baseline safety invariant verified before any write operations.

---

## 2. Week 7 Execution & Results
- **Week 7 Dry Run**:
  - Mode: `DRY_RUN`
  - ESPN Events: 14 verified games
  - Lions Game: `GB @ DET` (`401873020`)
  - Status: PASSED (0 errors).
- **Runtime Fix Applied**:
  - `src/services/authoritativeSlateService.ts`: Advisory lock query `pg_advisory_xact_lock` returns PostgreSQL `void`. Updated to call `$executeRawUnsafe` instead of `$queryRawUnsafe` to avoid Prisma void deserialization error (`P2010`).
  - Added explicit `{ maxWait: 20000, timeout: 60000 }` to Prisma interactive transaction to support remote multi-query cloud execution without timeout (`P2028`).
- **Week 7 Live Additive Ingestion**:
  - ESPN Scope: Season 2026, Season Type 2, Week 7
  - Events Ingested: 14 canonical games persisted into `public.games`
  - Manifest Persisted: `public.weekly_slate_manifests` (Season 2026, Week 7, Revision 1, 14 events)
  - Fingerprint: `5a89ac33464005aa04bdb99569b4e39ccfa588a8eec83866e24bbf26b3e75f15`
- **Canonical Commissioner Tiebreaker Override**:
  - PO Ruling Requirement: Steelers @ Saints (`PIT @ NO`), not Lions default.
  - Target Game ID: `401873011` (`PIT @ NO`, kickoff `2026-10-25T13:30:00.000Z`)
  - Override Executed via `applyCommissionerOverride`:
    - Event ID: `401873011`
    - Game Title: `PIT @ NO`
    - Provenance: `COMMISSIONER_OVERRIDE`
    - Kickoff: `2026-10-25T13:30:00.000Z`
    - Designated By: `e3242a19-1131-4fc5-9886-7730f10ef69b`
    - Frozen: `false`
- **Database Readback Verification**:
  - `weekly_slate_manifests`: Revision 1, Count 14
  - `games` for Week 7: Exactly 14 games
  - `pools.settings`: Verified `tiebreaker_designations['2026']['7']` matches `COMMISSIONER_OVERRIDE` for `401873011`.
  - All 14 games kick off on/after 2026-10-23T00:15Z (Sunday 2026-10-25); all games are active and pickable.

---

## 3. Weeks 8..18 Ingestion Progress
- Ingestion is actively running in background runner.
- Each week fetches authoritative ESPN scoreboard, writes 16 canonical columns to `public.games`, inserts manifest with `cardinality(event_ids)`, and sets default Lions tiebreaker.
- Complete post-run verification and baseline comparison will follow immediately upon completion.
