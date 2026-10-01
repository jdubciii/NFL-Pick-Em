# EVIDENCE BUNDLE — RE: RULING R-12.2-Y
**Date (UTC):** 2026-10-01T02:02:52.077Z  
**Current Commit:** a28e55dbb5afd04399e2405ace7bb4a7dbaa148c  
**Branch:** main  

---

## 1. Generator Self-Test Verification

```text
(node:3120) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
=== Running Generator Self-Test ===
Generator Self-Test Caught Expected Error:
Empty output block detected from command: "echo -n """
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Negative & Positive Control Grep (wrapUpConcurrency Retirement Verification)

### 2.1 Negative Control at HEAD~1 (wrapUpConcurrency Present)
Command: `git checkout HEAD~1 && grep -rEn "(CREATE|ALTER|DROP)\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\s+search_path" tests/ scripts/dev/ prisma/seed.ts || true`

```text
tests/wrapUpConcurrency.test.ts:17:      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
```
*Verification: Test-made DDL in `tests/wrapUpConcurrency.test.ts` was identified as the root cause of the spurious `applied_by` column and flagged by DDL grep.*

### 2.2 Positive Control at HEAD (Clean Repository State)
Command: `grep -rEn "(CREATE|ALTER|DROP)\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\s+search_path" tests/ scripts/dev/ prisma/seed.ts || true`

```text
CLEAN: 0 DDL or SET search_path matches found across tests/, scripts/dev/, prisma/seed.ts
```
*Verification: Zero test files contain DDL or `SET search_path` on HEAD.*

---

## 3. Post-Merge Git & Migration Lineage

### 3.1 Git Revisions
```text
a28e55dbb5afd04399e2405ace7bb4a7dbaa148c
a28e55dbb5afd04399e2405ace7bb4a7dbaa148c
```

### 3.2 Git Log (Last 8 Commits)
```text
a28e55d chore: retire wrapUpConcurrency test and sanitize safeguards ref
e0e8579 Merge branch 'feat/phase12-guard-e2e' into main (R-12.2-X: Decision #20 override removal & BR-5 unit tests)
e67ad25 docs(evidence): record R-12.2-X verification bundle, diffs, and test outputs
0619e3d fix(phase12): remove global-ADMIN override per Decision #20; pure mock tests green
795bc1a test(phase12): add isolated unit & route guard integration suite for BR-5 auth middleware
75c42c5 Merge branch 'release/br2' into main
d6251e8 docs(evidence): complete R-12.2-U post-execution report and safeguards test coverage (R-12.2-V)
8b2e4a8 docs(evidence): add R-12.2-U post-execution deployment evidence
```

### 3.3 Ancestry Check (`git merge-base --is-ancestor HEAD main; echo $?`)
```text
0
```

### 3.4 Migration Directories
```text
20260927000000_init
20260928051824_add_pool_member_stats_and_penalty_ledger
20260928124900_precision_and_weekly_submissions
20260928170000_weekly_submission_finalized_and_game_notes
20260928180000_shot_cam_penalty_media_and_rls
20260929144500_br_1_ledger_append_only
20260930010000_br_2b_ledger_api_lockdown
20260930020000_br_2c_public_tables_api_lockdown
migration_lock.toml
```
- Total Migration Directories (`ls -1 prisma/migrations | wc -l`): `9`

---

## 4. Dependency Counts & Admin Route Inventory

### 4.1 Symbol Counts in `src/`
| Symbol | Matches in `src/` |
| :--- | :--- |
| `requirePoolCommissioner` | **4** |
| `requirePoolMember` | **8** |
| `req.pool` | **3** |
| `Role.ADMIN` | **2** |
| `requireAdmin` | **9** |
| **Total Combined Matches** | **24** |

### 4.2 Admin Route Inventory (`/api/admin/*`)
| File & Line | Method & Path | Guard Middleware | Returned Data / Operation | Cross-Pool Scope | Exposes Credentials? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/routes/admin.ts:11` | `GET /api/admin/users` | `requireAuth, requireAdmin` | Array of users (`id`, `email`, `role`, `createdAt`) | Yes (global user list) | No (`passwordHash` excluded via select) |
| `src/routes/admin.ts:33` | `GET /api/admin/picks` | `requireAuth, requireAdmin` | NFL games list populated with target user picks | Scoped to `pool_id` query param (creates default if none) | No |
| `src/routes/admin.ts:95` | `GET /api/admin/audit-logs` | `requireAuth, requireAdmin` | Recent 50 audit logs with actor info | Yes (system-wide audit log query) | No |
| `src/routes/admin.ts:123` | `PUT /api/admin/picks` | `requireAuth, requireAdmin` | Upserts pick for user and creates AuditLog record | Scoped by `pool_id` in request body | No |

---

## 5. Concurrency & Weekly Wrap-Up Test Execution

Command: `npx vitest run tests/br4b.test.ts -t "Concurrent calls on final week" --reporter=verbose`

```text
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [2m[90m↓[39m[22m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m1. Apply once, second call returns ALREADY_WRAPPED_UP
 [32m✓[39m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP[32m 272[2mms[22m[39m
 [2m[90m↓[39m[22m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
 [2m[90m↓[39m[22m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[2m | [22m[33m3 skipped[39m[90m (4)[39m
[2m   Start at [22m 19:02:50
[2m   Duration [22m 989ms[2m (tests 63%, transform 22%, import 9%, setup 4%, worker 1%)[22m
```

---

## 6. Documentation Invariant & Append-Only Verification

### 6.1 File Line Counts (`wc -l ARCHITECTURE.md ROADMAP.md tasks.md`)
```text
  485 ARCHITECTURE.md
  110 ROADMAP.md
  251 tasks.md
  846 total
```

### 6.2 Diff Numstat Against Baseline (`git diff --numstat e41ce72 -- ARCHITECTURE.md ROADMAP.md tasks.md`)
```text
192	0	ARCHITECTURE.md
32	0	ROADMAP.md
105	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---
