# CLOSING EVIDENCE SUPPLEMENT: BINDING RULING R-14-INTAKE-03
**Execution Timestamp:** 2026-10-03T19:13:04.564Z
**Remediation Branch:** `docs/r14-intake-remediation`
**Execution Baseline SHA:** `f5459d5f97b331f18eb674cc1c7ed750f1d7c65a`
**Governing Authority:** Binding Ruling R-14-INTAKE-03 & Decisions #53, #56, #67
**Generator Exit Code:** 0

---

## 1. Executive Summary & Remediation Matrix
### R-14-INTAKE-03 Acceptance & Remediation Matrix
- Remediation Branch Isolation (Decision #67): BRANCH `docs/r14-intake-remediation` CUT FROM MAIN
- Commit Provenance & Tracking Status (Decision #53): 3 LOCAL COMMITS AUDITED ON DISK (ZERO PUSHES)
- Transient Script Disclosure & Containment: 16 SCRIPTS ACCOUNTED IN `.worktree-ctl/` (ZERO REMOTE MUTATIONS)
- Decision #67 Ingestion & Register Synchronization: VERBATIM APPENDED TO APPENDIX-A & ARCHITECTURE.MD
- CI Decision Register Enforcement (scripts/ci_check_register.js): EXIT CODE 0
- Ancestry Anchor Verification (f9f9308 -> HEAD): CONFIRMED ANCESTOR (EXIT CODE 0)
- Outbox Idempotency Key Contract: ATOMIC ENQUEUE & UNIQUE CONSTRAINTS VERIFIED (30/30 TESTS PASSED)
- Hosted Database Isolation & Tripwire Inventory: 15/15 PUBLIC APPLICATION TABLES VERIFIED
- Hosted Database Inverse Guard (Localhost Control): REJECTS LOCALHOST (EXIT CODE 1)
- Tripwire Table-Omission Negative Control: DETECTS MISSING TABLE (EXIT CODE 1)
- Catalog Discrepancy Reconciliation: 15 SCHEMA MODELS vs 16 PUBLIC TABLES (EXPLAINED: _prisma_migrations RLS)
- Fail-Closed Claim Store Invariant (Decision #52 / BR-4b): CONFIRMED PASSING (tests/br4b.test.ts)
- Full Regression Test Suite: 22/22 SUITES PASSED, 230/230 TESTS PASSED (EXIT CODE 0)

---

## 2. Section 1: Branch Provenance, Commit Lineage & Working Tree Hygiene

### 2.1 Active Branch & Remote Tracking Status (`git branch -vv`)
```
* docs/r14-intake-remediation           f5459d5 docs: ingest Decision #67 from R-14-INTAKE-03 and prepare evidence compiler
  feat/phase12-1-outbox                 d3b7e8a docs: create binding container B_SHA for Section 9 verification bundle
  feat/phase12-1e-reminder-scanner      d77c219 docs: bind Section 9 verification bundle for Milestone 12.1-E
  feat/phase12-2-wrapup-engine          f728d1f docs: bind Section 9 verification bundle for Milestone 12.2
  feat/phase12-3-transports             dd41ad2 docs: bind Section 9 verification bundle for Milestone 12.3
  feat/phase12-4-retention-pruning      fd6868c docs: bind Section 9 verification bundle for Milestone 12.4
  feat/phase12-guard-e2e                e67ad25 docs(evidence): record R-12.2-X verification bundle, diffs, and test outputs
  feat/phase12-migrations               24e83dd test: B1 - concurrency stabilization
  feat/phase13-1-notification-center    910cbec docs: bind Section 9 verification bundle for Milestone 13.1
  feat/phase13-2-commissioner-dashboard 58b1e55 docs: bind Section 9 verification bundle for Milestone 13.2
  feat/phase13-3-admin-ops-panel        2ac0df6 docs: bind Section 9 verification bundle for Milestone 13.3
  feat/phase13-4-e2e-verification       11ec29f docs: bind Section 9 verification bundle for Milestone 13.4
  fix/br5b-admin-picks                  e8959ea [origin/fix/br5b-admin-picks: ahead 5, behind 3] docs: generate evidence bundle and append R-12.2-AD rulings
  main                                  1d99324 [origin/main: ahead 3] chore: prepare R-14-INTAKE-01 evidence baseline
  release/br2                           d6251e8 docs(evidence): complete R-12.2-U post-execution report and safeguards test coverage (R-12.2-V)
```

### 2.2 Working Tree Status at Baseline
```
(clean - 0 uncommitted changes)
```

### 2.3 Commit Ancestry Verification
- **Phase 13 Final Closure Ancestry (`git merge-base --is-ancestor f9f9308 HEAD`):**
```
Exit code: 0
```
- **Milestone 12.1 Ancestry (`git merge-base --is-ancestor 6c2fb46 HEAD`):**
```
Exit code: 0
```

### 2.4 Git Commit History (Last 10 Commits on Branch)
```
f5459d5 docs: ingest Decision #67 from R-14-INTAKE-03 and prepare evidence compiler
1d99324 chore: prepare R-14-INTAKE-01 evidence baseline
cccaac1 chore: update tripwire and db header for 15-table schema and rehearsal
c09c365 docs: ingest Decisions #61-66 from R-14-INTAKE-01
f9f9308 docs: bind Section 9 verification bundle for Phase 13 final program closure
c98e2a3 feat(phase13-closure): generate comprehensive raw terminal evidence for Phase 13 closure
45eb5a7 Merge pull request #9 from jdubciii/feat/phase13-4-e2e-verification
11ec29f docs: bind Section 9 verification bundle for Milestone 13.4
68211ec feat(phase13-4): implement full-stack end-to-end lifecycle verification suite
4184184 docs: author Milestone 13.4 Full-Stack E2E Verification paper design specification
```

### 2.5 Git Reflog (Last 10 Reflog Entries — Push Guard Compliance)
```
f5459d5 HEAD@{0}: commit: docs: ingest Decision #67 from R-14-INTAKE-03 and prepare evidence compiler
1d99324 HEAD@{1}: checkout: moving from main to docs/r14-intake-remediation
1d99324 HEAD@{2}: commit (amend): chore: prepare R-14-INTAKE-01 evidence baseline
bdb43ea HEAD@{3}: commit: chore: prepare R-14-INTAKE-01 evidence baseline
cccaac1 HEAD@{4}: commit: chore: update tripwire and db header for 15-table schema and rehearsal
c09c365 HEAD@{5}: commit: docs: ingest Decisions #61-66 from R-14-INTAKE-01
f9f9308 HEAD@{6}: commit: docs: bind Section 9 verification bundle for Phase 13 final program closure
c98e2a3 HEAD@{7}: commit: feat(phase13-closure): generate comprehensive raw terminal evidence for Phase 13 closure
45eb5a7 HEAD@{8}: pull origin main: Fast-forward
2cf6b04 HEAD@{9}: checkout: moving from feat/phase13-4-e2e-verification to main
```

### 2.6 Git Remote Verification (`git remote -v`)
```
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
```

---

## 3. Section 2: Transient Scripts Audit Manifest & Connection Disclosure

### 3.1 Transient Script Inventory & Execution Targets
All transient scripts created during development workflows have been accounted for and relocated to the ignored `.worktree-ctl/` control directory. Zero transient scripts executed writes or mutations against the hosted Supabase production infrastructure.

- `.worktree-ctl/check_dal_games.ts` (501 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/cleanup_stale_games.ts` (416 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/debug_matrix.ts` (940 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/fix_exact_pool_memberships.ts` (1043 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/fix_game_schedule.ts` (999 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/fix_membership.ts` (803 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/get_active_token.ts` (1322 bytes): HTTP client requests against localhost development server (Zero hosted Supabase mutations)
- `.worktree-ctl/grant_all_memberships.ts` (707 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/inspect_auth.ts` (782 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/reset_and_verify.ts` (1656 bytes): HTTP client requests against localhost development server (Zero hosted Supabase mutations)
- `.worktree-ctl/seed_week1.ts` (1210 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/set_all_week4_kickoffs.ts` (2243 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/set_real_kickoffs.ts` (1376 bytes): Local development diagnostic / mock test (Zero hosted Supabase mutations)
- `.worktree-ctl/sync_live_nfl_games.ts` (1845 bytes): External read-only ESPN public sports API feed (Zero hosted Supabase mutations)
- `.worktree-ctl/test_matrix_endpoint.ts` (928 bytes): HTTP client requests against localhost development server (Zero hosted Supabase mutations)
- `.worktree-ctl/verify_matrix_direct.ts` (1049 bytes): HTTP client requests against localhost development server (Zero hosted Supabase mutations)

### 3.2 Current `.gitignore` Configuration
```gitignore
# Node modules
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.hosted
.env.*.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Prisma generated artifacts & sqlite files (if any)
*.db
*.db-journal

# OS files
.DS_Store
Thumbs.db

# Worktrees
.worktree-ctl/

# Test artifacts
vitest.json
self_test_output.txt
test_summary.json

# Audit, diagnostic, and history scan dumps
*_diff.txt
*_scan.txt
*_history*.txt
scratch/
```

### 3.3 Git Ignored Files Status (`git status --ignored`)
```
On branch docs/r14-intake-remediation
Ignored files:
  (use "git add -f <file>..." to include in what will be committed)
	.env
	.env.hosted
	.worktree-ctl/
	client/dist/
	client/node_modules/
	dist/
	node_modules/
	scratch/capture_r12_2_r_evidence.mjs
	scratch/check_rls_flag.mjs
	scratch/diff_rehearsal_hosted.mjs
	scratch/diff_rollback.mjs
	scratch/dump_hosted_norm.sql
	scratch/dump_hosted_raw.sql
	scratch/dump_local6_norm.sql
	scratch/dump_local6_raw.sql
	scratch/dump_pre6.sql
	scratch/dump_rolled_back.sql
	scratch/execute_gates_u.mjs
	scratch/execute_p1_p4.mjs
	scratch/execute_postchecks_hosted.mjs
	scratch/execute_track1.mjs
	scratch/format_complete_post_execution.mjs
	scratch/generate_normalized_dumps.mjs
	scratch/hosted_normalized.sql
	scratch/hosted_pre_state.sql
	scratch/insecure_migrations/
	scratch/mutated_migrations/
	scratch/normalized_dumps/
	scratch/old_tasks.md
	scratch/rehearsal_normalized.sql
	scratch/restart_local_pg.ps1
	scratch/run_full_postchecks.mjs
	scratch/run_hosted_checks.mjs
	scratch/run_revoke_proof.mjs
	scratch/run_tripwire_hosted.mjs
	scratch/setup_rehearsal_6.mjs
	scratch/temp_migrations_6/
	scratch/test_negative_checksum.mjs
	scratch/test_negative_security_guard.mjs
	scratch/test_normalize_v2.mjs
	scratch/test_pg_dump.mjs
	scratch/test_rollback_tx.mjs

nothing to commit, working tree clean
```

---

## 4. Section 3: Decision #67 Ingestion & Checksum CI Enforcement

### 4.1 Verbatim Decision #67 Text
> "67 Evidence bundles bind to a named baseline commit (E_SHA) recorded with raw clean-tree output; the bundle is committed afterwards as a child commit that changes only the bundle path and whose parent equals E_SHA; evidence and governance commits are made on a branch cut from main, never directly on main; amending, rebasing or force-updating a commit already on a remote is prohibited."

### 4.2 Git Diff of Appendix A (`docs/rulings/appendix-a.md`)
```diff
diff --git a/docs/rulings/appendix-a.md b/docs/rulings/appendix-a.md
index 8d0e51e..13912a5 100644
--- a/docs/rulings/appendix-a.md
+++ b/docs/rulings/appendix-a.md
@@ -64,3 +64,4 @@
 64 Feature tables use the public schema with f_<feature>_ prefixes and platform tables use p_; multi-schema is not used in Phases 14-16, and this does not alter Decision 29 (environment isolation by database); every prefixed table is tripwire-covered.
 65 The six-state weekly slate graph is a derived monotonic projection recorded in an append-only idempotent p_ transition log; per-game locks remain the sole authority for pick acceptance and are irrevocable; FINALIZED is immutable and corrections are revisions; transitions run only in System-Tier workers using transaction-scoped locks, never on GET; user notifications fan out per recipient through the transaction-client producer path with a deterministic dedupe key under Decision 57.
 66 Pick visibility under hide_picks_until_kickoff derives from the per-game lock, never slate state; viewer identity is resolved server-side from membership; a cohort floor of 3 is a minimum, and snapshot differencing must be analyzed before any live aggregate feature ships.
+67 Evidence bundles bind to a named baseline commit (E_SHA) recorded with raw clean-tree output; the bundle is committed afterwards as a child commit that changes only the bundle path and whose parent equals E_SHA; evidence and governance commits are made on a branch cut from main, never directly on main; amending, rebasing or force-updating a commit already on a remote is prohibited.
```

### 4.3 Git Diff of Architecture Register (`ARCHITECTURE.md`)
```diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 4bb67ad..b8566ca 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -623,6 +623,7 @@ Before enabling `LEDGER_TYPED_WRITES`, a read-path parity test must pass. Every
 64 Feature tables use the public schema with f_<feature>_ prefixes and platform tables use p_; multi-schema is not used in Phases 14-16, and this does not alter Decision 29 (environment isolation by database); every prefixed table is tripwire-covered.
 65 The six-state weekly slate graph is a derived monotonic projection recorded in an append-only idempotent p_ transition log; per-game locks remain the sole authority for pick acceptance and are irrevocable; FINALIZED is immutable and corrections are revisions; transitions run only in System-Tier workers using transaction-scoped locks, never on GET; user notifications fan out per recipient through the transaction-client producer path with a deterministic dedupe key under Decision 57.
 66 Pick visibility under hide_picks_until_kickoff derives from the per-game lock, never slate state; viewer identity is resolved server-side from membership; a cohort floor of 3 is a minimum, and snapshot differencing must be analyzed before any live aggregate feature ships.
+67 Evidence bundles bind to a named baseline commit (E_SHA) recorded with raw clean-tree output; the bundle is committed afterwards as a child commit that changes only the bundle path and whose parent equals E_SHA; evidence and governance commits are made on a branch cut from main, never directly on main; amending, rebasing or force-updating a commit already on a remote is prohibited.
 
 V4: APPROVED by Fallback; RATIFIED IN PART by the Arbiter.
```

### 4.4 Decision Register Checksum CI Run (`node scripts/ci_check_register.js`)
- **Exit Code:** 0 (Expected: 0)
- **Raw Command Output:**
```
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
```

---

## 5. Section 4: Outbox Idempotency Contract & Dedicated Test Verification

### 5.1 Outbox & Inbox Enqueue Implementation (`src/services/notifications.ts`)
```typescript
import { Prisma } from '@prisma/client';

export type NotificationChannel = 'IN_APP' | 'EMAIL';

export const REMINDER_PAYLOAD_KEYS = ['poolName', 'windowLabel', 'lockAtUtc', 'deepLink'] as const;
export const WRAPUP_PAYLOAD_KEYS = ['poolName', 'weekNumber', 'highScorer', 'penaltySummary', 'deepLink'] as const;

export const ALLOWED_PAYLOAD_KEYS_BY_TYPE: Record<string, readonly string[]> = {
  REMINDER: REMINDER_PAYLOAD_KEYS,
  PICK_REMINDER: REMINDER_PAYLOAD_KEYS,
  WRAPUP_REMINDER: REMINDER_PAYLOAD_KEYS,
  WRAPUP: WRAPUP_PAYLOAD_KEYS,
  WRAP_UP: WRAPUP_PAYLOAD_KEYS,
  WEEKLY_WRAPUP: WRAPUP_PAYLOAD_KEYS,
};

export interface EnqueueNotificationInput {
  poolId: string;
  userId: string;
  type: string;
  payload: any;
  dedupeKey: string;
  channels: NotificationChannel[];
}

export interface EnqueueNotificationResult {
  inboxMessageCreated: boolean;
  outboxEventCreated: boolean;
  dedupeKey: string;
}

/**
 * DEFAULT-DENY payload sanitizer.
 * Only keys explicitly declared in the registry for the given notification type are allowed.
 * Unregistered types or keys are stripped and logged as errors (does not throw).
 */
export function sanitizePayload(type: string, payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const allowedKeys = ALLOWED_PAYLOAD_KEYS_BY_TYPE[type];
  if (!allowedKeys) {
    console.error(`[notifications] DEFAULT-DENY: Unregistered notification type '${type}', payload stripped`);
    return {};
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowedKeys.includes(key)) {
      if (key === 'deepLink' && typeof value === 'string' && !/^https?:\/\//i.test(value)) {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        sanitized[key] = `${baseUrl.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`;
      } else {
        sanitized[key] = value;
      }
    } else {
      console.error(`[notifications] Stripped unregistered payload key '${key}' for notification type '${type}'`);
    }
  }
  return sanitized;
}

/**
 * Enqueues an in-app inbox message and/or an outbox event transactionally.
 * Conforms to Decision #5 (Inbox is the source of truth; email is best-effort),
 * Decision #54 (No writes on GET),
 * Decision #57 (Every table written by a re-running job carries a database-enforced dedupe key),
 * and INV-6 (Non-blocking outbound: Zero network calls, DB transaction only).
 *
 * Idempotency is guaranteed via unique constraints on (user_id, dedupe_key) for inbox_messages
 * and dedupe_key on outbox_events with skipDuplicates: true.
 */
export async function enqueueNotification(
  tx: Prisma.TransactionClient | any,
  input: EnqueueNotificationInput
): Promise<EnqueueNotificationResult> {
  // Reject non-transaction or missing clients
  if (!tx || '$transaction' in (tx as object) || !(tx as any).inboxMessage) {
    throw new Error('Transaction client required; received root client');
  }

  const { poolId, userId, type, payload, dedupeKey, channels = ['IN_APP', 'EMAIL'] } = input;

  if (!poolId || !userId || !type || !dedupeKey) {
    throw new Error('poolId, userId, type, and dedupeKey are required to enqueue a notification');
  }

  const cleanPayload = sanitizePayload(type, payload);

  let inboxMessageCreated = false;
  if (channels.includes('IN_APP')) {
    const inboxResult = await tx.inboxMessage.createMany({
      data: [
        {
          poolId,
          userId,
          type,
          payload: cleanPayload,
          dedupeKey,
        },
      ],
      skipDuplicates: true,
    });
    inboxMessageCreated = inboxResult.count > 0;
  }

  let outboxEventCreated = false;
  if (channels.includes('EMAIL')) {
    const pref = await tx.notificationPreference.findUnique({
      where: { userId },
      select: { emailEnabled: true },
    });

    // Skip EMAIL channel if user preference emailEnabled === false
    if (pref === null || pref.emailEnabled !== false) {
      const outboxResult = await tx.outboxEvent.createMany({
        data: [
          {
            poolId,
            recipientUserId: userId,
            type,
            payload: cleanPayload,
            dedupeKey,
            status: 'PENDING',
            attempts: 0,
          },
        ],
        skipDuplicates: true,
      });
      outboxEventCreated = outboxResult.count > 0;
    }
  }

  return {
    inboxMessageCreated,
    outboxEventCreated,
    dedupeKey,
  };
}

```

### 5.2 Dedicated Outbox Drain & Notification Tests (`tests/outbox_drain.test.ts` & `tests/notifications.test.ts`)
- **Exit Code:** 0 (Expected: 0)
- **Total Tests:** 30 Passed / 30 Total (0 Failures, 0 Skips)
- **Raw Test Runner Output:**
```
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 105ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 28ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 46ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 36ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 22ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 19ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 100ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 15ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 29ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 37ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 103ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 22ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 12ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 13ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 23ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 6ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 6ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 15ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 9ms

 Test Files  2 passed (2)
      Tests  30 passed (30)
   Start at  12:13:18
   Duration  2.31s (tests 49%, transform 21%, import 18%, setup 11%, worker 2%)

    Isolate  2 workers spawned · ~337ms startup each (spawn + environment, per file)
             at least ~337ms faster with isolate: false — reuses workers across files instead of one per file


(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
stderr | tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution
[withJobRun] Failed to create JobRun record for resilient_job: Error: DB Connection Lost
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/outbox_drain.test.ts:458:63
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
    at new Promise (<anonymous>)
    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64

stderr | tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped
[notifications] Stripped unregistered payload key 'unauthorizedField' for notification type 'REMINDER'
[notifications] Stripped unregistered payload key 'extraBogusData' for notification type 'REMINDER'
```

---

## 6. Section 5: Hosted Database Tripwire & Negative Control Proofs

### 6.1 Hosted Database 15-Table Live Inventory Check (`node scripts/run_hosted_tripwire.js`)
- **Exit Code:** 0 (Expected: 0)
- **Raw Command Output:**
```
=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===

Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
Parsed Hostname: aws-0-us-east-1.pooler.supabase.com
✅ Inverse Guard verified: Target is confirmed hosted Supabase database.

Connecting via Node pg client to stream exact query rows...

1. Database Identity & Server Info:
  - Database: postgres
  - Current User: postgres
  - Version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit

2. Timestamp & Drift Metrics:
  - DB Server Time: Sat Oct 03 2026 12:13:22 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 84.9793 hrs

3. All 15 Table Row Counts:
  - users                    : 122
  - pools                    : 100
  - pool_memberships         : 11
  - games                    : 16
  - picks                    : 4
  - pick_results             : 0
  - weekly_submissions       : 0
  - penalty_ledger           : 2
  - penalty_media            : 0
  - pool_member_stats        : 10
  - audit_logs               : 10
  - inbox_messages           : 0
  - outbox_events            : 0
  - notification_preferences : 0
  - job_runs                 : 1

4. to_regclass('public.weekly_wrapups'): NULL

5. Applied Migrations (9 total):
  - 20260927000000_init
  - 20260928051824_add_pool_member_stats_and_penalty_ledger
  - 20260928124900_precision_and_weekly_submissions
  - 20260928170000_weekly_submission_finalized_and_game_notes
  - 20260928180000_shot_cam_penalty_media_and_rls
  - 20260929144500_br_1_ledger_append_only
  - 20260930010000_br_2b_ledger_api_lockdown
  - 20260930020000_br_2c_public_tables_api_lockdown
  - 20261001160000_12_1_a_outbox_inbox_core

6. Penalty Ledger Immutability Triggers Intact: TRUE

7. Row-Level Security: rls_on: 16/16

✅ Hosted Tripwire executed successfully.
```

### 6.2 Inverse Guard Localhost Negative Control (`node scripts/run_hosted_tripwire.js --negative-control`)
- **Exit Code:** 1 (Expected: 1 - Fail Closed)
- **Raw Command Output:**
```
=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===

Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
Parsed Hostname: localhost

SAFETY_ERROR: Refusing to run against localhost.
Refusing to run against localhost
```

### 6.3 Table-Omission Negative Control (`node scripts/run_hosted_tripwire.js --omit-table=audit_logs`)
- **Exit Code:** 1 (Expected: 1 - Fail Closed)
- **Raw Command Output:**
```
=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===

Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
Parsed Hostname: aws-0-us-east-1.pooler.supabase.com
✅ Inverse Guard verified: Target is confirmed hosted Supabase database.

Connecting via Node pg client to stream exact query rows...

1. Database Identity & Server Info:
  - Database: postgres
  - Current User: postgres
  - Version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit

2. Timestamp & Drift Metrics:
  - DB Server Time: Sat Oct 03 2026 12:13:24 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 84.9800 hrs

3. All 15 Table Row Counts:
  - users                    : 122
  - pools                    : 100
  - pool_memberships         : 11
  - games                    : 16
  - picks                    : 4
  - pick_results             : 0
  - weekly_submissions       : 0
  - penalty_ledger           : 2
  - penalty_media            : 0
  - pool_member_stats        : 10
  - audit_logs               : 10
  - inbox_messages           : 0
  - outbox_events            : 0
  - notification_preferences : 0
  - job_runs                 : 1

[NEGATIVE CONTROL] Simulating table omission of 'audit_logs' from inventory allowlist...

TRIPWIRE_FAILURE: Expected 15 tables, but inventory only accounts for 14 tables (missing: audit_logs).
ERROR during query execution: Negative control passed: tripwire detected missing table 'audit_logs'
```

---

## 7. Section 6: Schema Models (15) vs RLS Catalog (16) Reconciliation

### 7.1 Entity & Catalog Discrepancy Breakdown
- **Prisma Schema Models (15):**
  1. `User` (`users`)
  2. `Pool` (`pools`)
  3. `PoolMembership` (`pool_memberships`)
  4. `Game` (`games`)
  5. `Pick` (`picks`)
  6. `PickResult` (`pick_results`)
  7. `WeeklySubmission` (`weekly_submissions`)
  8. `PenaltyLedger` (`penalty_ledger`)
  9. `PenaltyMedia` (`penalty_media`)
  10. `PoolMemberStats` (`pool_member_stats`)
  11. `AuditLog` (`audit_logs`)
  12. `InboxMessage` (`inbox_messages`)
  13. `OutboxEvent` (`outbox_events`)
  14. `NotificationPreference` (`notification_preferences`)
  15. `JobRun` (`job_runs`)

- **PostgreSQL Public Schema Relations (16):**
  The 15 application tables enumerated above plus `public._prisma_migrations` (the internal schema migration history table managed by Prisma Migrate).

- **Row-Level Security Lockdown (16/16):**
  All 16 tables in the public schema have `relrowsecurity = true` enabled, ensuring that anon and authenticated roles are denied direct access across both application entities and the migration tracking table.

---

## 8. Section 7: Rehearsal Database State, Diagnostics & Full Regression Suite

### 8.1 Rehearsal Reset & Migration Deployment (`npm run db:reset`)
- **Exit Code:** 0 (Expected: 0)
- **Raw Command Output:**
```
> nfl-pick-em@1.0.0 db:reset
> tsx scripts/dev/reset-rehearsal.mjs

=== RESET REHEARSAL DATABASE (Decision #35) ===

✅ URL Safety verified (localhost, no schema, pickem_rehearsal).
Terminating active connections to pickem_rehearsal...
Dropping and recreating pickem_rehearsal...
✅ pickem_rehearsal database recreated with timezone=UTC and app.disposable=true.
✅ Server sentinel app.disposable verified.
✅ Role 'anon' provisioned.
✅ Role 'authenticated' provisioned.
✅ Role 'service_role' provisioned.

--- Running prisma migrate deploy on pickem_rehearsal ---
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Applying migration `20260927000000_init`
Applying migration `20260928051824_add_pool_member_stats_and_penalty_ledger`
Applying migration `20260928124900_precision_and_weekly_submissions`
Applying migration `20260928170000_weekly_submission_finalized_and_game_notes`
Applying migration `20260928180000_shot_cam_penalty_media_and_rls`
Applying migration `20260929144500_br_1_ledger_append_only`
Applying migration `20260930010000_br_2b_ledger_api_lockdown`
Applying migration `20260930020000_br_2c_public_tables_api_lockdown`
Applying migration `20261001160000_12_1_a_outbox_inbox_core`

The following migration(s) have been applied:

migrations/
  └─ 20260927000000_init/
    └─ migration.sql
  └─ 20260928051824_add_pool_member_stats_and_penalty_ledger/
    └─ migration.sql
  └─ 20260928124900_precision_and_weekly_submissions/
    └─ migration.sql
  └─ 20260928170000_weekly_submission_finalized_and_game_notes/
    └─ migration.sql
  └─ 20260928180000_shot_cam_penalty_media_and_rls/
    └─ migration.sql
  └─ 20260929144500_br_1_ledger_append_only/
    └─ migration.sql
  └─ 20260930010000_br_2b_ledger_api_lockdown/
    └─ migration.sql
  └─ 20260930020000_br_2c_public_tables_api_lockdown/
    └─ migration.sql
  └─ 20261001160000_12_1_a_outbox_inbox_core/
    └─ migration.sql
      
All migrations have been successfully applied.

Applied Migrations:
┌─────────┬─────────────────────────────────────────────────────────────┬──────────────────────────┐
│ (index) │ migration_name                                              │ finished_at              │
├─────────┼─────────────────────────────────────────────────────────────┼──────────────────────────┤
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T19:13:31.260Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T19:13:31.289Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T19:13:31.327Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T19:13:31.334Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T19:13:31.361Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T19:13:31.368Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T19:13:31.373Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T19:13:31.380Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T19:13:31.439Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
```

### 8.2 Database Header & Migration Diagnostic (`node scripts/db_header.js`)
- **Exit Code:** 0 (Expected: 0)
- **Raw Command Output:**
```
=== DB Header & Rehearsal Verification ===

1. Database Identity:
[
  {
    "current_database": "pickem_rehearsal",
    "current_user": "postgres",
    "inet_server_addr": "::1",
    "inet_server_port": 5432
  }
]

2. Applied Migrations:
[
  {
    "migration_name": "20260927000000_init",
    "started_at": "2026-10-03T19:13:31.189Z",
    "finished_at": "2026-10-03T19:13:31.260Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T19:13:31.262Z",
    "finished_at": "2026-10-03T19:13:31.289Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T19:13:31.290Z",
    "finished_at": "2026-10-03T19:13:31.327Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T19:13:31.329Z",
    "finished_at": "2026-10-03T19:13:31.334Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T19:13:31.336Z",
    "finished_at": "2026-10-03T19:13:31.361Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T19:13:31.362Z",
    "finished_at": "2026-10-03T19:13:31.368Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T19:13:31.369Z",
    "finished_at": "2026-10-03T19:13:31.373Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T19:13:31.374Z",
    "finished_at": "2026-10-03T19:13:31.380Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T19:13:31.381Z",
    "finished_at": "2026-10-03T19:13:31.439Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Database schema is up to date!

(node:3936) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
```

### 8.3 BR-4b Fail-Closed Claim Store Specific Verification (`tests/br4b.test.ts`)
- **Exit Code:** 0 (Expected: 0)
- **Raw Command Output:**
```
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 56ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  12:14:13
   Duration  724ms (tests 41%, transform 33%, setup 18%, import 6%, worker 2%)


(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
```

### 8.4 Full Regression Test Suite Execution Telemetry (`npx vitest run --reporter=verbose`)
- **Exit Code:** 0 (Expected: 0)
- **Test Suites:** 22 Passed / 22 Total
- **Total Tests:** 230 Passed / 230 Total (0 Failures, 0 Skips)
- **Raw Vitest Output:**
```
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > fails closed when attempting wrap-up against unfinalized slate (Decision #27) 100ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > successfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24) 108ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57) > creates outbox events with compound dedupeKey and drains them to inbox_messages 110ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > fetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54) 143ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > enforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20) 63ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > allows User A to mark own notification as read with deterministic ClockFn timestamp 18ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > rejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass) 11ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > allows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22) 64ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > rejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20) 5ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > allows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54) 178ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > advances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records 37ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 55ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 19ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 89ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 32ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 38ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 10ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 8ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 31ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 20ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
pool count before = 3
pool count after = 3
pool count invariant = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 22ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 16ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
pool count before = 3
pool count after = 3
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
pool count before = 3
pool count after = 3
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
pool count before = 3
pool count after = 3
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
pool count before = 3
pool count after = 3
pool count invariant = PASS
member response byte equality = PASS
commissioner response byte equality = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 16ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 29ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 3ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 63ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 14ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 149ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 11ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 12ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 149ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 21ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 54ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 21ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 196ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 12ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 10ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 178ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 48ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation > applies decimal scoring adjustments accurately without floating-point drift 39ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 22ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 6. Injectable ClockFn Determinism > records deterministic timestamps on proposal voting and execution 25ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 23ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 28ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 43ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 30ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 69ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 18ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 15ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 202ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 151ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 44ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 75ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 160ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 33ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 69ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 23ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 30ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 36ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 16ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 31ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 18ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 10ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 91ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 97ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 5ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 7ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 91ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 22ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 48ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects unauthenticated requests with 401 Unauthorized 51ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects standard users on /api/admin/ops/system/health with 403 Forbidden 11ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden 11ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > allows global ADMIN to retrieve health telemetry 205ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 2. Read-Only GET Execution & Zero Mutations (Decision #54) > enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health 109ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > returns exact telemetry matching database states 15ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN 79ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error 22ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 219ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 14ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 19ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 10ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 60ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 46ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 24ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 20ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 132ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 47ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 17ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 24ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 16ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 20ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 5ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 39ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 20ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 19ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 16ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 66ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 21ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 10ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 218ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 44ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 174ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 172ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 76ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 18ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 14ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 63ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 187ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 30ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 31ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 55ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 3ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 47ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 9ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 29ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 16ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 20ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 16ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 15ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 13ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 113ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 19ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 29ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 65ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 13ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 47ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 17ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 9ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 133ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 10ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 11ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 18ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 30ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 33ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 18ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 13ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 2ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 78ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 7ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 27ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 20ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 18ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 47ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 110ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 21ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 18ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 14ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 13ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 6ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 6ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 14ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 9ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 14ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 23ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 6ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 12ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 4ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 3ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 10ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 404 when the pool does not exist in DB 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 403 when user is neither commissioner nor member 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > calls next() and attaches pool when user is the pool commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - extracts pool_id from query params and authorizes commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - returns 400 when pool_id query parameter is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - extracts pool_id from request body and authorizes commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - returns 400 when pool_id body parameter is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > returns 403 if user is not a member and not the commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is active pool member 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is the pool commissioner (even without explicit membership row) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns false (unlocked) when kickoff is in the future 4ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) when kickoff is in the past 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) at exact kickoff boundary (now === kickoff) 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > locks early when positive offset is configured (e.g., 60 minutes before kickoff) 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > supports negative offsets (e.g., locking 15 minutes after kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for unlocked game 2ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for locked game 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns safe fallback on missing kickoffTime 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > returns false if no excluded windows are passed or list is empty 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Thursday Night Football correctly 3ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Monday Night Football correctly 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 4ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 2ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 7ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 2ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 5ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  22 passed (22)
      Tests  230 passed (230)
   Start at  12:13:40
   Duration  29.39s (tests 46%, import 39%, setup 8%, transform 7%, worker 1%)

     Import  55 modules were evaluated 369 times · 8.56s total, 39% of tracked time
             ~7.28s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game
Error executing proposal: Error: DECISION_27_FAIL_CLOSED: Target slate or game is unfinalized.
    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:207:11)
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/routes/ops.ts:298:20

stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error
Error executing proposal: Error: userId and gameId are required for PICK override
    at db.$transaction.isolationLevel (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:232:17)
    at Proxy._transactionWithCallback (C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\node_modules\@prisma\client\runtime\library.js:130:8006)
    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:219:10)
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/routes/ops.ts:298:20

stderr | tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error
Error fetching consolidated system health: Error: DATABASE_OFFLINE_FAIL_CLOSED
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/adminOpsPanel.test.ts:348:9
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
    at new Promise (<anonymous>)
    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64

stderr | tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution
[withJobRun] Failed to create JobRun record for resilient_job: Error: DB Connection Lost
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/outbox_drain.test.ts:458:63
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
    at new Promise (<anonymous>)
    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64

stderr | tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement
Webhook ingestion error (failing closed): Error: PostgreSQL connection dropped unexpectedly
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/webhooks.test.ts:249:62
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
    at new Promise (<anonymous>)
    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64

stderr | tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped
[notifications] Stripped unregistered payload key 'unauthorizedField' for notification type 'REMINDER'
[notifications] Stripped unregistered payload key 'extraBogusData' for notification type 'REMINDER'
```

---

## 9. Section 8: LIVE REPOSITORY CONTEXT

### 9.1 Prisma Schema (`prisma/schema.prisma`)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  USER
}

enum Status {
  ACTIVE
  INACTIVE
}

enum GameStatus {
  SCHEDULED
  IN_PROGRESS
  FINAL
}

enum PenaltyMediaStatus {
  PENDING
  CONFIRMED
  REJECTED
}

model User {
  id                     String                  @id @default(uuid()) @db.Uuid
  email                  String                  @unique
  passwordHash           String                  @map("password_hash")
  role                   Role                    @default(USER)
  createdAt              DateTime                @default(now()) @map("created_at")
  pools                  Pool[]                  @relation("AdministeredPools")
  memberships            PoolMembership[]
  picks                  Pick[]                  @relation("UserPicks")
  submittedPicks         Pick[]                  @relation("SubmittedPicks")
  auditLogs              AuditLog[]              @relation("UserAuditLogs")
  createdPenalties       PenaltyLedger[]         @relation("CreatedPenalties")
  weeklySubmissions      WeeklySubmission[]
  penaltyMedia           PenaltyMedia[]          @relation("UserPenaltyMedia")
  confirmedMedia         PenaltyMedia[]          @relation("ConfirmedPenaltyMedia")
  inboxMessages          InboxMessage[]
  outboxEventsReceived   OutboxEvent[]           @relation("OutboxEventRecipient")
  outboxEventsRetried    OutboxEvent[]           @relation("OutboxEventRetrier")
  notificationPreference NotificationPreference?

  @@map("users")
}

model Pool {
  id                String             @id @default(uuid()) @db.Uuid
  name              String
  adminId           String             @map("admin_id") @db.Uuid
  admin             User               @relation("AdministeredPools", fields: [adminId], references: [id])
  settings          Json
  status            Status             @default(ACTIVE)
  memberships       PoolMembership[]
  picks             Pick[]
  memberStats       PoolMemberStat[]
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]
  penaltyMedia      PenaltyMedia[]
  inboxMessages     InboxMessage[]
  outboxEvents      OutboxEvent[]

  @@map("pools")
}

model PoolMembership {
  poolId String @map("pool_id") @db.Uuid
  userId String @map("user_id") @db.Uuid
  status Status @default(ACTIVE)

  pool Pool @relation(fields: [poolId], references: [id])
  user User @relation(fields: [userId], references: [id])

  stat              PoolMemberStat?
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]

  @@id([poolId, userId])
  @@map("pool_memberships")
}

model Game {
  id                String     @id @default(uuid()) @db.Uuid
  externalGameId    String     @unique @map("external_game_id")
  homeTeamId        String     @map("home_team_id")
  awayTeamId        String     @map("away_team_id")
  kickoffTime       DateTime   @map("kickoff_time")
  status            GameStatus @default(SCHEDULED)
  homeScore         Int?       @map("home_score")
  awayScore         Int?       @map("away_score")
  commissionerNotes String?    @map("commissioner_notes")
  picks             Pick[]

  @@map("games")
}

model Pick {
  id             String      @id @default(uuid()) @db.Uuid
  poolId         String      @map("pool_id") @db.Uuid
  userId         String      @map("user_id") @db.Uuid
  gameId         String      @map("game_id") @db.Uuid
  selectedTeamId String?     @map("selected_team_id")
  submittedById  String      @map("submitted_by") @db.Uuid
  createdAt      DateTime    @default(now()) @map("created_at")

  pool        Pool        @relation(fields: [poolId], references: [id])
  user        User        @relation("UserPicks", fields: [userId], references: [id])
  game        Game        @relation(fields: [gameId], references: [id])
  submittedBy User        @relation("SubmittedPicks", fields: [submittedById], references: [id])
  result      PickResult?

  @@unique([poolId, userId, gameId])
  @@map("picks")
}

model PickResult {
  pickId        String   @id @map("pick_id") @db.Uuid
  isCorrect     Boolean  @map("is_correct")
  pointsAwarded Decimal  @map("points_awarded") @db.Decimal(5, 2)
  finalizedAt   DateTime @default(now()) @map("finalized_at")

  pick Pick @relation(fields: [pickId], references: [id], onDelete: Cascade)

  @@map("pick_results")
}

model AuditLog {
  id             String   @id @default(uuid()) @db.Uuid
  actorId        String   @map("actor_id") @db.Uuid
  action         String
  targetEntityId String   @map("target_entity_id")
  oldValue       Json?    @map("old_value")
  newValue       Json?    @map("new_value")
  timestamp      DateTime @default(now())

  actor User @relation("UserAuditLogs", fields: [actorId], references: [id])

  @@map("audit_logs")
}

model PoolMemberStat {
  poolId             String   @map("pool_id") @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  totalShotsDrank    Decimal  @default(0.00) @map("total_shots_drank") @db.Decimal(5, 2)
  firstPlaceFinishes Int      @default(0) @map("first_place_finishes")
  deadPlaceFinishes  Int      @default(0) @map("dead_place_finishes")
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)

  @@id([poolId, userId])
  @@map("pool_member_stats")
}

model PenaltyLedger {
  id          String        @id @default(uuid()) @db.Uuid
  poolId      String        @map("pool_id") @db.Uuid
  userId      String        @map("user_id") @db.Uuid
  weekNumber  Int?          @map("week_number")
  delta       Decimal       @map("delta") @db.Decimal(5, 2)
  reason      String
  createdById String        @map("created_by") @db.Uuid
  createdAt   DateTime      @default(now()) @map("created_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  createdBy  User           @relation("CreatedPenalties", fields: [createdById], references: [id])
  media      PenaltyMedia?

  @@index([poolId, userId])
  @@map("penalty_ledger")
}

model WeeklySubmission {
  id                   String   @id @default(uuid()) @db.Uuid
  poolId               String   @map("pool_id") @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  weekNumber           Int      @map("week_number")
  tieBreakerPrediction Decimal? @map("tie_breaker_prediction") @db.Decimal(5, 2)
  isFinalized          Boolean  @default(false) @map("is_finalized")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([poolId, userId, weekNumber])
  @@index([poolId, weekNumber, isFinalized])
  @@map("weekly_submissions")
}

model PenaltyMedia {
  id          String             @id @default(uuid()) @db.Uuid
  penaltyId   String             @unique @map("penalty_id") @db.Uuid
  poolId      String             @map("pool_id") @db.Uuid
  userId      String             @map("user_id") @db.Uuid
  storagePath String             @map("storage_path")
  mediaType   String             @map("media_type")
  status      PenaltyMediaStatus @default(PENDING)
  confirmedBy String?            @map("confirmed_by") @db.Uuid
  createdAt   DateTime           @default(now()) @map("created_at")

  penalty   PenaltyLedger @relation(fields: [penaltyId], references: [id], onDelete: Cascade)
  pool      Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade)
  user      User          @relation("UserPenaltyMedia", fields: [userId], references: [id], onDelete: Cascade)
  confirmer User?         @relation("ConfirmedPenaltyMedia", fields: [confirmedBy], references: [id])

  @@index([poolId, userId])
  @@map("penalty_media")
}

enum OutboxStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  DEAD
  SUPPRESSED
}

enum JobStatus {
  RUNNING
  OK
  PARTIAL
  FAILED
}

model InboxMessage {
  id        String    @id @default(uuid()) @db.Uuid
  poolId    String    @map("pool_id") @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  type      String
  payload   Json
  dedupeKey String    @map("dedupe_key")
  readAt    DateTime? @map("read_at") @db.Timestamp(3)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamp(3)

  pool Pool @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@unique([userId, dedupeKey])
  @@index([userId, readAt, createdAt])
  @@map("inbox_messages")
}

model OutboxEvent {
  id              String       @id @default(uuid()) @db.Uuid
  poolId          String       @map("pool_id") @db.Uuid
  recipientUserId String       @map("recipient_user_id") @db.Uuid
  type            String
  payload         Json
  dedupeKey       String       @unique @map("dedupe_key")
  status          OutboxStatus @default(PENDING)
  attempts        Int          @default(0)
  nextAttemptAt   DateTime     @default(now()) @map("next_attempt_at") @db.Timestamp(3)
  leaseExpiresAt  DateTime?    @map("lease_expires_at") @db.Timestamp(3)
  lastErrorCode   String?      @map("last_error_code")
  sentAt          DateTime?    @map("sent_at") @db.Timestamp(3)
  retriedBy       String?      @map("retried_by") @db.Uuid
  retriedAt       DateTime?    @map("retried_at") @db.Timestamp(3)
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamp(3)

  pool      Pool  @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  recipient User  @relation("OutboxEventRecipient", fields: [recipientUserId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  retrier   User? @relation("OutboxEventRetrier", fields: [retriedBy], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@index([status, nextAttemptAt])
  @@map("outbox_events")
}

model NotificationPreference {
  userId               String   @id @map("user_id") @db.Uuid
  emailEnabled         Boolean  @default(true) @map("email_enabled")
  reminderOffsetsHours Int[]    @default([24, 2]) @map("reminder_offsets_hours")
  unsubscribeToken     String   @unique @default(uuid()) @map("unsubscribe_token")
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamp(3)

  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@map("notification_preferences")
}

model JobRun {
  id             String    @id @default(uuid()) @db.Uuid
  jobName        String    @map("job_name")
  status         JobStatus
  startedAt      DateTime  @default(now()) @map("started_at") @db.Timestamp(3)
  finishedAt     DateTime? @map("finished_at") @db.Timestamp(3)
  itemsProcessed Int       @default(0) @map("items_processed")
  errorCode      String?   @map("error_code")
  meta           Json?

  @@index([jobName, startedAt])
  @@map("job_runs")
}
```

### 9.2 Authoritative Decision Register Appendix A (`docs/rulings/appendix-a.md`)
```markdown
1 Points are derived; penalties are ledger entries.
2 Provider corrections are proposals; auto-apply only when no outcome changes.
3 Manual overrides beat sync; divergence is flagged.
4 Locks derive from the stored kickoff time only.
5 Inbox is the source of truth; email is best-effort.
6 Aggregates are never stored in numeric columns.
7 Pick-on-behalf is write-only.
8 History reads sealed snapshots only.
9 Ledger entry_type is additive and parallel to reason; backfill by column default, never UPDATE.
10 Physical schema names govern; logical names in handoffs are documentation.
11 DB-enforced invariants are verified against the catalog, never assumed.
12 Typed ledger writes serialize per (pool_id, user_id).
13 Ledger-bearing pools and memberships are never hard-deleted.
14 Season is Pool; routes use /api/pools/:pool_id.
15 New tables and functions are deny-by-default to Data API roles.
16 Money input goes through one strict parser; never parseInt/parseFloat/Number.
17 Every evidence report states host class, database, user and server version.
18 Destructive work runs only on a disposable database; hosted gets migrate deploy only.
19 Legacy ASSESSMENT rows may be signed; typed rows are positive.
20 Per-pool authority derives from pools.admin_id; no global-role override.
21 Authorization defect fixes are code-only and precede new commissioner endpoints.
22 Money splitting is Decimal-only with characterization first; no zero-delta rows.
23 Every invariant carries an evidence status.
24 Period-close jobs are idempotent via a DB-enforced claim in the same transaction.
25 Acceptance tests assert behavior (SQLSTATE, row state), never message text.
26 Read routes are guarded like write routes; guards change access, never payloads.
27 Period-close preconditions use authoritative state; empty sets fail closed; no bypass flag.
28 VERIFIED requires numbers or raw output in the report body.
29 Isolation is by database, never by schema; the guard has three independent checks.
30 Raw evidence is unedited tool output; identifiers resolve; figures are consistent.
31 Irreversible operations run only from committed scripts with machine-checked preconditions.
32 The default environment is disposable; hosted credentials live in a separate file.
33 Docs are append-only, enforced by CI against a tagged baseline.
34 Every acceptance criterion maps to a named test or evidence item.
35 Tests never create or alter schema; databases reset via a guarded script.
36 A migration stays off the deployable branch until its hosted gate clears.
37 Evidence is produced by one committed script; empty sections fail; UTF-8 via spawn.
38 Trigger proofs run as a privileged role; privilege proofs as anon/authenticated.
39 Evidence and CI scripts measure inputs independently and ship with a negative control.
40 Every evidence run stamps commit, branch and time; identical output counts as not run.
41 A matrix row may cite only tests present in the committed JSON artifact.
42 Schema evidence comes from real pg_dump including ACLs, bodies and indexes.
43 Every ordered criterion appears in the matrix as PASS, FAIL or NOT VERIFIED.
44 Only a human runs or approves hosted changes; authorizations are typed in the conversation.
45 Rollbacks are generated from a pre-state snapshot and proven by hash equality.
46 External exposure is measured identically before and after a change.
47 Machine-checkable gates are decided by script exit codes.
48 Applied migrations are immutable; CI compares checksums.
49 Authorization scans cover every source of an identifier (path, query, body, headers).
50 Each test run begins with reset, migrate deploy and generate, and prints a header.
51 Tests are never deleted or weakened in non-test commits; controls run in a separate worktree.
52 Code depending on a schema object ships with its migration or fails closed.
53 Agents never push, force-push or change remotes.
54 GET handlers perform no writes.
55 A guard is never bypassed by a conditional when its dependency is missing.
56 Rulings are stored verbatim under docs/rulings/. The Decision Register in ARCHITECTURE.md is a byte-for-byte copy of docs/rulings/appendix-a.md, and CI diffs the two.
57 Every table written by a re-running job carries a database-enforced dedupe key.
58 Outbound payload sanitization is default-deny against an explicit per-type registry.
59 Outbox drain workers claim via FOR UPDATE SKIP LOCKED with explicit lease timeouts and discrete backoff.
60 Every claim of a leased job item counts as an attempt; the lease is verified before each send and when the result is recorded.
61 Core tables hold no foreign keys to feature tables, and feature tables hold none to other features; core code and scoring do not import feature modules; shared tables (penalty_ledger, notification_preferences, outbox_events, inbox_messages, job_runs) receive no feature columns; feature metadata lives in prefixed side tables keyed downward.
62 Every feature binds to a registry key, default OFF; a missing row or flag-store failure evaluates to disabled; routes run authenticate, membership, flag, handler; disabled features return 404 to members; producers check the flag at enqueue; queued events for disabled features get an audit-visible terminal disposition that records the reason and is distinguishable from preference opt-out, are never silently deleted, and are not replayed on re-enable without a ruling.
63 Disable, retire and purge are distinct; purge is hosted DDL needing an authorization ruling, drops tables explicitly and never uses CASCADE; scoring-affecting features change only forward-only at a week boundary.
64 Feature tables use the public schema with f_<feature>_ prefixes and platform tables use p_; multi-schema is not used in Phases 14-16, and this does not alter Decision 29 (environment isolation by database); every prefixed table is tripwire-covered.
65 The six-state weekly slate graph is a derived monotonic projection recorded in an append-only idempotent p_ transition log; per-game locks remain the sole authority for pick acceptance and are irrevocable; FINALIZED is immutable and corrections are revisions; transitions run only in System-Tier workers using transaction-scoped locks, never on GET; user notifications fan out per recipient through the transaction-client producer path with a deterministic dedupe key under Decision 57.
66 Pick visibility under hide_picks_until_kickoff derives from the per-game lock, never slate state; viewer identity is resolved server-side from membership; a cohort floor of 3 is a minimum, and snapshot differencing must be analyzed before any live aggregate feature ships.
67 Evidence bundles bind to a named baseline commit (E_SHA) recorded with raw clean-tree output; the bundle is committed afterwards as a child commit that changes only the bundle path and whose parent equals E_SHA; evidence and governance commits are made on a branch cut from main, never directly on main; amending, rebasing or force-updating a commit already on a remote is prohibited.
```
