# HAG-22 Remedial Evidence Dossier: Manifest Coverage Authority & Proposal Contract Provenance

**Target Branch:** `feat/p37-shell-auth-openslate`
**Parent Commit:** `c8227233511f66c1ae3f46e09fe94daea9dc772e` (unmodified; do not amend)
**Date:** 2026-10-20
**Authority:** God Directive `2026-10-20T22-47-31-344Z-c804c1` (HAG-22 HOLD Review)
**Status:** Remediated locally; child correction commit ready for god independent review

---

## 1. Executive Summary & Review Gaps Remediated

This remedial evidence dossier addresses both focused review findings identified by god on commit `c822723`:

### R1 GAP: Complete Manifest Coverage & Canonical External Binding
- **Defect Identified**: Previously, `boundGames` in `resolveProfileReminderScope` only required a non-empty intersection with the manifest. If a manifest contained events `[A, B]` and the RPC/query returned only `[A]`, having picked `A` resulted in `hasAcceptedSlate: true` and `isSlateSubmitted: true`, falsely reporting a partial subset as a fully submitted slate. Furthermore, binding accepted internal UUIDs alongside canonical external IDs.
- **Remediation Implemented**:
  1. **Strict Canonical External Binding**: Games are mapped strictly by canonical external event ID (`external_game_id` or `externalGameId`). Internal database UUIDs (`g.id`) are never accepted as manifest event identity.
  2. **Duplicate & Conflicting Mapping Detection**: Duplicate external event mappings in returned games fail closed with `DUPLICATE_MANIFEST_EVENT_MAPPING`. Conflicting internal-to-external ID mappings fail closed with `CONFLICTING_MANIFEST_EVENT_MAPPING`.
  3. **Complete Coverage Requirement**: Every accepted event ID in `manifestRecord.event_ids` must be uniquely bound in `mappedGamesByExternalId`. If any accepted event is missing, the resolver fails closed (`hasAcceptedSlate: false`, `isSlateSubmitted: false`, `windowGames: []`, `unavailabilityReason: 'INCOMPLETE_MANIFEST_COVERAGE'`).
  4. **No Unauthorized Reminders**: When coverage is incomplete or unavailable, `planDeadlineReminders` receives `hasAcceptedSlate: false` and `windowGames: []`, failing closed with `isUnavailable: true` and `toSchedule: []` (zero reminders scheduled).
  5. **RPC Arguments Observation & Validation**: Enhanced `createMockSupabase` in test harness to record all RPC invocations (`rpcCalls`) and validate `p_pool_id`, `p_season`, and `p_week` arguments, proving positive context matching and wrong-context fail-closed behavior (0 rows returned on wrong season, week, or unauthorized pool membership).
  6. **Regression Test Coverage**: Added Cases 15 through 20 in `tests/phase41_runtime_mock_purge.test.ts` exercising partial RPC manifest coverage, partial direct coverage, duplicate rows, conflicting ID rows, RPC argument observation, and internal UUID rejection.

### R2 GAP: Documented Provenance & Markdown Code Fence Correction
- **Defect Identified**: Restored document labeled catalog and preservation/freshness claims as current verified facts (e.g. "16 rows untouched", "all 80 picks preserved", "Live Production Catalog") while this task ran no live queries and current production audit remains unverified. Additionally, a Markdown blockquote note was inserted inside a SQL code fence around lines 404–420.
- **Remediation Implemented**:
  1. **Explicit Dated Historical Provenance**: Replaced unqualified claims with explicit dated historical provenance: documented 16 historical game records (`401872964`..`401872979`) and 80 existing Week 6 test picks across 9 events derive from the static baseline inspection conducted on 2026-10-18 (`docs/evidence/P41_POST_PURGE_VALIDATION/`).
  2. **Current-Unverified Qualification**: Explicitly qualified all inherited catalog counts, tables, unique keys, and policy names as unverified by live database queries during this task (which operated under strict zero-production-mutation boundaries).
  3. **Reconciliation Matrix Header**: Updated Table 1 column header to `Inherited Historical Catalog (2026-10-18 Inspection; Current Live State Unverified)`.
  4. **Markdown Prose Moved Outside SQL Fence**: Fixed lines 402–420 by closing the SQL code fence before the `> [!NOTE]` alert, placing the Markdown alert cleanly in markdown prose, and reopening the SQL code fence for Step 2.
  5. **Controlling Visibility Directive Preserved**: Maintained explicit references to `P41-POOL-VISIBILITY-2026-10-19-08` (HAG-20) across DDL notes and recovery invariants.

---

## 2. Source & Test File Change Map

| File Path | Description of Changes |
| :--- | :--- |
| `client/src/pages/ProfilePage.tsx` | Enforced complete, unique accepted event coverage via `mappedGamesByExternalId`. Replaced internal UUID matching with strict canonical external ID binding (`external_game_id`/`externalGameId`). Rejects duplicate mappings (`DUPLICATE_MANIFEST_EVENT_MAPPING`), conflicting mappings (`CONFLICTING_MANIFEST_EVENT_MAPPING`), and partial coverage (`INCOMPLETE_MANIFEST_COVERAGE`). |
| `docs/proposals/P41_DATABASE_CONTRACT_PROPOSALS.md` | Added explicit dated historical provenance (2026-10-18) and current-unverified qualifications to opening notice, Section 1 matrix, Section Proposal A notice, Proposal B objective, and Stage 3 recovery plan. Moved Markdown blockquote outside SQL code fence in Proposal E DDL. |
| `tests/phase41_runtime_mock_purge.test.ts` | Enhanced `createMockSupabase` RPC mock to record `rpcCalls` and observe/validate `p_pool_id`, `p_season`, `p_week` arguments with fail-closed non-member/wrong-scope filtering. Added Cases 15–20 verifying partial RPC coverage, partial direct coverage, duplicate event rows, conflicting ID rows, RPC argument capture, and UUID rejection. |

---

## 3. Retained Raw Verbatim Logs

All verification commands were executed and their complete, unabridged stdout and stderr captured into dedicated UTF-8 log files:

| Log File Path | Exact Command Executed | Exit Code | Summary Result |
| :--- | :--- | :---: | :--- |
| `docs/evidence/HAG-22/01_focused_tests.log` | `npx vitest run tests/phase41_runtime_mock_purge.test.ts tests/phase41_week7_tiebreaker.test.ts` | 0 | 2 files, 94 tests passed (0 failures) |
| `docs/evidence/HAG-22/02_typescript_typecheck.log` | `npx tsc --noEmit` | 0 | Clean exit, 0 errors |
| `docs/evidence/HAG-22/03_client_build.log` | `npm --prefix client run build` | 0 | Clean Vite production build (2.49s, 2,393 modules) |
| `docs/evidence/HAG-22/04_git_diff_check.log` | `git diff --check; git diff --check dadb049..HEAD` | 0 | Clean exit, 0 trailing whitespace errors |
| `docs/evidence/HAG-22/05_decision61_mirror_hashes.log` | `Get-FileHash -Algorithm SHA256 src/services/tiebreakerRankingService.ts, client/src/services/tiebreakerRankingService.ts` | 0 | SHA-256 `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68` bit-identical |

---

## 4. Architectural Boundaries & Operational Invariants

1. **Child Correction Commit**: Parent commit `c822723` is preserved unchanged. Changes are staged cleanly into a separate child correction commit.
2. **Zero Remote Push**: Local commit only on feature branch `feat/p37-shell-auth-openslate`; zero pushes to origin or remote branches.
3. **Zero Hosted Database / Production Mutation**: No DDL, no migrations (`npx prisma db push`), no PostgREST calls, and no schema mutations were executed against live infrastructure.
4. **No Schema Expansion**: No Prisma schema changes or additive migrations introduced.
5. **Decision #61 Ranking Mirror Parity**: Bit-for-bit identical SHA-256 (`750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`) preserved.
6. **No Certification Claim**: HAG-22 / HAG-1 acceptance remains in HOLD status pending independent god verification and Architect narrow re-review.
