# HAG-27 Evidence: Production Import Runner Dossier (Runtime Fix Corrections)

**Authority**: god dispatch `2026-10-22T07-44-16-987Z-dc6b1c`
**Branch**: `feat/p37-shell-auth-openslate`
**Commit**: `d3357b3d21bf5fd372aee7b146994e73cd1cab21`
**UTC Timestamp**: 2026-10-22T08:01:00Z

---

## 1. Executive Summary

God accepted HAG-26 season import as complete (independently verified 209 total games, Weeks 7..18, W7 PIT@NO COMMISSIONER_OVERRIDE, 84 picks/11 memberships preserved). God then requested the final runtime-fix dossier with exact tested source SHA, confirming three narrow corrections to `scripts/production_season_import_runner.ts` must be recorded, along with clarification that counts alone do not prove app pickability.

No re-import was executed. The three runner issues identified by god during HAG-26 live execution have been corrected, typechecked, and committed at `d3357b3`.

---

## 2. Three Runtime Corrections Applied (HAG-27)

### 2.1 Real ACTIVE Membership Query (was: hardcoded `isUserActiveMember: true`)

> [!IMPORTANT]
> **HAG-27 HOLD correction (god review `318d11`)**: The initial d3357b3 fix erroneously added `AND season_type = 2` to the `pool_memberships` query. Live `information_schema` confirms `pool_memberships` columns are only `pool_id, user_id, status, id, role, created_at` â€” no `season_type` column exists on that table. Corrected to `pool_id + user_id` predicate only, matching `authoritativeSlateService`.

**Before (d3357b3 â€” incorrect):**
```typescript
const { updatedSettings, designation } = applyCommissionerOverride({
  ...
  isUserActiveMember: true,  // â† asserted, not verified
  ...
});
```

**After (this commit â€” correct):**
```typescript
// Verify real ACTIVE membership from database (no asserted booleans).
// pool_memberships columns: pool_id, user_id, status, id, role, created_at â€” no season_type.
const memberRows: any[] = await tx.$queryRawUnsafe(
  `SELECT status FROM public.pool_memberships
   WHERE pool_id = $1::uuid AND user_id = $2::uuid;`,
  POOL_ID,
  COMMISSIONER_ID
);
const isUserActiveMember = memberRows.length > 0 && memberRows[0].status === 'ACTIVE';
if (!isUserActiveMember) {
  throw new Error('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED: Commissioner does not have ACTIVE membership in pool.');
}

const { updatedSettings, designation } = applyCommissionerOverride({
  ...
  isUserActiveMember, // verified from real DB query above
  ...
});
```

**Why**: `applyCommissionerOverride` accepts the boolean as a parameter to allow unit testing. The runner must not assert it statically â€” it must prove active membership from the database under the same transaction context and pool row lock. `season_type` is not a column on `pool_memberships`; it is scoped only on the `games` query (correction 2.2 below).

Also removed misleading pool-lock comment that said "scoped to season_type 2" â€” pools are not scoped by season_type.

### 2.2 Game Query Scoped to `season_type = 2`

**Before (incorrect):**
```sql
WHERE season = 2026 AND week = 7
```

**After (correct):**
```sql
WHERE season = 2026 AND season_type = 2 AND week = 7
```

**Why**: The `games` table includes games from multiple season types. Regular season (type 2) must be explicitly scoped to avoid cross-type identity ambiguity for `PIT @ NO` game lookup.

### 2.3 Correct Return Property: `refresh.revision` (was: `refresh.manifestRevision`)

**Before (incorrect):**
```typescript
console.log(`[DONE] ${obs.events.length} games imported. Manifest rev ${refresh.manifestRevision}.`);
```

**After (correct):**
```typescript
console.log(`[DONE] ${obs.events.length} games imported. Manifest rev ${refresh.revision}.`);
```

**Why**: `refreshWeeklySlateInDb` returns `{ success, revision, manifestFingerprint, eventCount, games, reason? }`. The property `manifestRevision` does not exist on this type. This caused log output to emit `undefined` for the revision on each week import. The correct property is `revision`.

---

## 3. Authoritative Local Verifications

| Verification | Result |
| :--- | :--- |
| **TypeScript typecheck** (`npx tsc --noEmit`) | **Exit 0**, 0 errors |
| **Focused test suite** (`tests/phase42_v78_season_release.test.ts`) | **60/60 PASS** |
| **Decision #61 mirror hash** (`tiebreakerRankingService.ts`) | **Bit-identical**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68` (server â‰¡ client) |
| **Whitespace check** (`git diff --check dadb049..HEAD`) | **Exit 0**, 0 errors |
| **Release binary** (`pickem-v78-season-release.apk`) | **Intact/unchanged**: 7,003,436 bytes, SHA-256 `10BD6BCAD6FC3FD29BDE819C5CA9BBA32888B2437F4D60862229F204E1056A05` |

---

## 4. Scope Qualification on Pickability Claims

Per god directive: game counts alone do not prove app pickability. The following qualifications apply:

- **Local verified**: 209 games in DB, manifest revisions persisted, W7 PIT@NO COMMISSIONER_OVERRIDE designation in pool.settings. These are necessary conditions.
- **App pickability proof** (beyond Executor's local role): requires live deployed server at accepted commit `393a407` to serve `/api/pools/:pool_id/tiebreaker`, a caller with a valid authenticated bearer token, and future kickoff time (`2026-10-25T13:30Z`) not yet passed. These require production deployment, which is owned by god.
- **W16/W17 TBD locks**: Weeks 16, 17 contain games with `canonical_kickoff_time: NULL` locked at epoch sentinel (`1970-01-01T00:00:00Z`). These are correctly imported as locked pending schedule confirmation. Lockout behavior is per the accepted v78 contract.
- **W18 all-TBD**: All 16 Week 18 games have TBD kickoffs, locked at epoch sentinel. This is correct per ESPN broadcast flex scheduling.

---

## 5. HAG-26 vs. HAG-27 Source Distinction

| Item | HAG-26 (Live Import) | HAG-27 (Runner Dossier Fix) |
| :--- | :--- | :--- |
| **Commit** | `8f9bd7f` | `d3357b3d21bf5fd372aee7b146994e73cd1cab21` |
| **Deployed server** | `393a407` (accepted, unchanged) | `393a407` (unchanged; runner is LOCAL CLI only) |
| **DB state** | God independently verified `209 games / 84 picks / 11 memberships` | No DB change; corrections are to runner script only |
| **Purpose** | Live additive season import execution | Correct runner for future reference / audit dossier |

The runner at `d3357b3` is the corrected LOCAL CLI dossier. It was NOT re-executed against production (the import is complete and accepted). The deployed server source remains `393a407`.

---

## 6. Final Source SHA Registry (HAG-27 Delivery â€” Corrected)

> [!NOTE]
> d3357b3 (first HAG-27 attempt) is superseded by this commit due to the nonexistent `season_type` column on `pool_memberships`. Only the corrected SHA below is the pinned delivery.

| Artifact | SHA |
| :--- | :--- |
| **HAG-27 corrected runner fix commit** | _(pinned below after commit)_ |
| **HAG-26 season import commit** | `8f9bd7f` |
| **HAG-29 deployed server (regclass cast)** | `393a407` |
| **HAG-25 accepted branch tip** | `5f9bba33d9dbc34f001a860e7582173957399aac` |
| **Release APK SHA-256** | `10BD6BCAD6FC3FD29BDE819C5CA9BBA32888B2437F4D60862229F204E1056A05` |
| **Decision #61 mirror SHA-256** | `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68` |

---

## 7. Boundaries

- **Local commit only**: zero remote push, zero database DDL, zero deployment, zero production mutation.
- **Runner corrections do not alter deployed state** â€” the import is done and accepted by god.
- Executor stands by for HAG-27 existing release pipeline instructions.
