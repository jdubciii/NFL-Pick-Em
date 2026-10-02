# EVIDENCE BUNDLE — RE: RULING R-12.2-AJ
**Date (UTC):** 2026-10-02T03:20:56.597Z  
**Current Commit:** 07c2cab980299ca74cdf6b5ddfd391432bd090c5  
**Branch:** feat/phase12-1-outbox  
**Ancestry Status:** ANCESTRY_CONFIRMED: commit 6c2fb46 is a verified ancestor of HEAD  
**Generator Self-Test Exit Code:** 1  
**CI Check Positive Exit Code:** 0  
**CI Check Negative Control Exit Code:** 1  
**Tripwire Localhost Negative Control Exit Code:** 1  
**Tripwire 127.0.0.1 Negative Control Exit Code:** 1  
**Generator Execution Exit Code:** 0  

---

# PRE-GENERATION WORKSPACE HYGIENE

```text
(clean - 0 uncommitted changes)
```
*Verification: Early pre-generation git status --porcelain executed at step 0; confirmed completely clean working tree.*

---

## 1. Generator Self-Test Verification

```text
(node:12116) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
Generator Self-Test Caught Expected Error:
Empty output detected for command: "Write-Output """
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Pre-Run Git State, Remotes, Reflog & Ancestry

### 2.1 Working Branch Status (Captured Prior to File Operations)
```text
## feat/phase12-1-outbox
```

### 2.2 Ancestry Verification
```text
ANCESTRY_CONFIRMED: commit 6c2fb46 is a verified ancestor of HEAD
```

### 2.3 Recent Commits (Last 5)
```text
07c2cab feat: 12.1 step A schema amendment, helper, and R-12.2-AJ implementation
e65a11e docs: bind evidence bundle for 12.1 Step 1 schema and helper
26ac1ef feat: 12.1 schema, migration, and enqueueNotification helper
abaf982 docs: bind baseline evidence bundle for 12.1 conditional start
774a338 docs: record R-12.2-AH-V2 ruling and clear evidence gates
```

### 2.4 Git Remotes & Reflog
```text
Git Remotes:
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)

Git Reflog origin/main:
00e89dd refs/remotes/origin/main@{0}: update by push
8ec0ca5 refs/remotes/origin/main@{1}: update by push
908f447 refs/remotes/origin/main@{2}: update by push
18238ff refs/remotes/origin/main@{3}: update by push
41296e4 refs/remotes/origin/main@{4}: update by push
96fca3d refs/remotes/origin/main@{5}: update by push
a2362c0 refs/remotes/origin/main@{6}: update by push
bb4c463 refs/remotes/origin/main@{7}: update by push
988ec29 refs/remotes/origin/main@{8}: update by push
ff5208a refs/remotes/origin/main@{9}: update by push
c8eef5a refs/remotes/origin/main@{10}: update by push
38f0761 refs/remotes/origin/main@{11}: update by push
e41ce72 refs/remotes/origin/main@{12}: update by push
c2e1ff9 refs/remotes/origin/main@{13}: update by push
94eff17 refs/remotes/origin/main@{14}: update by push
b767907 refs/remotes/origin/main@{15}: update by push
68c7b65 refs/remotes/origin/main@{16}: update by push
3d27d53 refs/remotes/origin/main@{17}: update by push
40da61b refs/remotes/origin/main@{18}: update by push
```

### 2.5 Secret & Credential Scan (Tests Excluded)
```text
Clean
```
*Exclusion list: tests/ directory excluded. Benign matches: none outside test mock fixtures.*

---

## 3. Decision Register CI Check (Positive & Negative Controls)

### 3.1 Positive Control (`node scripts/ci_check_register.js`)
```text
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
```

### 3.2 Negative Control (Mutated Register -> Must Fail)
```text
Exit Code: 1
Output:
❌ CI Check FAILED: Appendix A Decision Register does not match ARCHITECTURE.md byte-for-byte.
```
*Verification: `scripts/ci_check_register.js` deterministically enforces byte-for-byte fidelity of Decisions #1 through #57 from appendix-a.md in ARCHITECTURE.md.*

---

## 4. Test Configuration & Safeguards Setup

### 4.1 Test Setup File (`tests/setup.ts`)
```typescript
import { beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';

// Explicit PrismaClient instantiation with silenced query logging
export const setupPrisma = new PrismaClient({
  log: [],
});

beforeAll(async () => {
  if (process.env.TEST_DATABASE_URL) {
    assertDisposableUrl(process.env.TEST_DATABASE_URL);
  }
});
```
*Verification: `tests/setup.ts` explicitly instantiates PrismaClient with `log: []` to suppress test query output.*

---

## 5. Hosted Database Tripwire Verification (Node pg Streamed Query)

### 5.1 Inverse Guard Negative Control 1 (Localhost Refusal -> Must Fail)
```text
Exit Code: 1
Output:
=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===

Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
Parsed Hostname: localhost
SAFETY_ERROR: Refusing to run against localhost.
Refusing to run against localhost
```

### 5.2 Inverse Guard Negative Control 2 (127.0.0.1 Refusal -> Must Fail)
```text
Exit Code: 1
Output:
=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===

Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
Parsed Hostname: 127.0.0.1
SAFETY_ERROR: Refusing to run against localhost.
Refusing to run against localhost
```

### 5.3 Hosted Tripwire Real Execution (Supabase Database Rows Streamed via pg)
```text
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
  - DB Server Time: Thu Oct 01 2026 20:17:32 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 45.0487 hrs

3. All 11 Table Row Counts:
  - users               : 10
  - pools               : 1
  - pool_memberships    : 10
  - games               : 16
  - picks               : 160
  - pick_results        : 160
  - weekly_submissions  : 0
  - penalty_ledger      : 2
  - penalty_media       : 0
  - pool_member_stats   : 10
  - audit_logs          : 10

4. to_regclass('public.weekly_wrapups'): NULL

5. Applied Migrations (8 total):
  - 20260927000000_init
  - 20260928051824_add_pool_member_stats_and_penalty_ledger
  - 20260928124900_precision_and_weekly_submissions
  - 20260928170000_weekly_submission_finalized_and_game_notes
  - 20260928180000_shot_cam_penalty_media_and_rls
  - 20260929144500_br_1_ledger_append_only
  - 20260930010000_br_2b_ledger_api_lockdown
  - 20260930020000_br_2c_public_tables_api_lockdown

6. Penalty Ledger Immutability Triggers Intact: TRUE

7. Row-Level Security: rls_on: 12/12

✅ Hosted Tripwire executed successfully.
```
*Verification: Streamed read-only query results via Node pg client against Supabase hosted pooler. All 11 table counts, database identity, RLS status (12/12), and weekly_wrapups presence (NULL) verified with passwords redacted.*

---

## 6. Migration State & Catalog Verification

### 6.1 Migration Directory Count (Total: 9)
```text
Physical migration directory count: 9
```

### 6.2 Migration Git Tree (`git ls-tree --name-only HEAD prisma/migrations/`)
```text
prisma/migrations/20260927000000_init
prisma/migrations/20260928051824_add_pool_member_stats_and_penalty_ledger
prisma/migrations/20260928124900_precision_and_weekly_submissions
prisma/migrations/20260928170000_weekly_submission_finalized_and_game_notes
prisma/migrations/20260928180000_shot_cam_penalty_media_and_rls
prisma/migrations/20260929144500_br_1_ledger_append_only
prisma/migrations/20260930010000_br_2b_ledger_api_lockdown
prisma/migrations/20260930020000_br_2c_public_tables_api_lockdown
prisma/migrations/20261001160000_12_1_a_outbox_inbox_core
prisma/migrations/migration_lock.toml
```

### 6.3 12.1 Core Migration SQL (`prisma/migrations/20261001160000_12_1_a_outbox_inbox_core/migration.sql`)
```sql
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'OK', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "inbox_messages" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_expires_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "sent_at" TIMESTAMP(3),
    "retried_by" UUID,
    "retried_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_offsets_hours" INTEGER[] DEFAULT ARRAY[24, 2]::INTEGER[],
    "unsubscribe_token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "job_name" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "meta" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inbox_messages_user_id_read_at_created_at_idx" ON "inbox_messages"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_messages_user_id_dedupe_key_key" ON "inbox_messages"("user_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_dedupe_key_key" ON "outbox_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "outbox_events_status_next_attempt_at_idx" ON "outbox_events"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_unsubscribe_token_key" ON "notification_preferences"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at");

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_retried_by_fkey" FOREIGN KEY ("retried_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Decision #15: Deny-by-default Data API access
REVOKE ALL ON inbox_messages FROM anon, authenticated;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON outbox_events FROM anon, authenticated;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON notification_preferences FROM anon, authenticated;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON job_runs FROM anon, authenticated;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

-- Enforce constraints per Directive 4.2
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0);
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_offsets_cardinality_check CHECK (cardinality(reminder_offsets_hours) <= 5);
```

### 6.4 Schema Diff (`schema_diff.txt`)
```text
No difference detected.
```

---

## 7. Step 12.1 Core Helper Implementation & Push History Logs

### 7.1 Notification Service Implementation (`src/services/notifications.ts`)
```typescript
import { Prisma } from '@prisma/client';

export type NotificationChannel = 'IN_APP' | 'EMAIL';

export const REMINDER_PAYLOAD_KEYS = ['poolName', 'windowLabel', 'lockAtUtc', 'deepLink'] as const;

export const ALLOWED_PAYLOAD_KEYS_BY_TYPE: Record<string, readonly string[]> = {
  REMINDER: REMINDER_PAYLOAD_KEYS,
  PICK_REMINDER: REMINDER_PAYLOAD_KEYS,
  WRAPUP_REMINDER: REMINDER_PAYLOAD_KEYS,
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

export function sanitizePayload(type: string, payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  let allowedKeys: readonly string[] | undefined = ALLOWED_PAYLOAD_KEYS_BY_TYPE[type];
  if (!allowedKeys && type.toUpperCase().includes('REMINDER')) {
    allowedKeys = REMINDER_PAYLOAD_KEYS;
  }

  if (!allowedKeys) {
    return { ...payload };
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowedKeys.includes(key)) {
      sanitized[key] = value;
    } else {
      console.warn(`[notifications] Stripped disallowed payload key '${key}' for notification type '${type}'`);
    }
  }
  return sanitized;
}

/**
 * Enqueues an in-app inbox message and/or an outbox event transactionally.
 * Conforms to Decision #5 (Inbox is the source of truth; email is best-effort),
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

  return {
    inboxMessageCreated,
    outboxEventCreated,
    dedupeKey,
  };
}
```

### 7.2 Push History Log (Last 25 Commits on origin/main)
```text
00e89dd64ae5c130b96cd7af476794a2014872b3 2026-09-30 19:21:10 -0700 jdubciii docs: generate evidence bundle and finalize changes for R-12.2-AA
8ec0ca50ba64891cba07935d72faa544bc91e311 2026-09-30 19:03:24 -0700 jdubciii docs: generate evidence bundle and finalize changes for R-12.2-Z
a28e55dbb5afd04399e2405ace7bb4a7dbaa148c 2026-09-30 15:21:52 -0700 jdubciii chore: retire wrapUpConcurrency test and sanitize safeguards ref
e0e857933e9a0dc21ca9792804935b947e2dd445 2026-09-30 15:10:33 -0700 jdubciii Merge branch 'feat/phase12-guard-e2e' into main (R-12.2-X: Decision #20 override removal & BR-5 unit tests)
e67ad25be94676a4f5871db03e779766f57c9cca 2026-09-30 15:10:31 -0700 jdubciii docs(evidence): record R-12.2-X verification bundle, diffs, and test outputs
0619e3dcfbdad1ba16d48fc51e401c1dbc479ec3 2026-09-30 15:04:36 -0700 jdubciii fix(phase12): remove global-ADMIN override per Decision #20; pure mock tests green
795bc1a360650b2d7a4e611caaacf8c233d1c5bc 2026-09-30 14:00:12 -0700 jdubciii test(phase12): add isolated unit & route guard integration suite for BR-5 auth middleware
75c42c50aedf952ae671da572f7c595359125f20 2026-09-30 10:25:36 -0700 jdubciii Merge branch 'release/br2' into main
d6251e865a22c7251efedd41172abaaa8cdc9508 2026-09-30 10:25:02 -0700 jdubciii docs(evidence): complete R-12.2-U post-execution report and safeguards test coverage (R-12.2-V)
8b2e4a8853b8f9f9969abf03922c9f4a5ca6b141 2026-09-30 09:36:17 -0700 jdubciii docs(evidence): add R-12.2-U post-execution deployment evidence
c0dfd0381a52b4d1a65973772a28f207ce39fa21 2026-09-30 02:23:18 -0700 jdubciii feat(ops): implement Gate 1.A DO block and Gate 1.B Diff A allow-list checker (R-12.2-U)
57b4a66b0f5d80dfdcfe8c0bff19b39a1133ccdc 2026-09-30 02:04:21 -0700 jdubciii docs(evidence): commit R-12.2-T pre-execution evidence report (P1-P4)
d14eb4fd0e31828fd50ade7068e4b72da906ad68 2026-09-30 02:00:25 -0700 jdubciii docs(ops): commit BR-2 supervised human runbook
5f9f25c84c62310a52f36db87e6aa74e9a8cbe38 2026-09-30 01:28:06 -0700 jdubciii feat(release/br2): update BR-2c with _prisma_migrations lockdown and sync ops scripts
87aac809dbd1b470dfd257f52f03c0a8a5e8f75f 2026-09-30 00:33:36 -0700 jdubciii fix(scripts): remove unused variables in reset-rehearsal.ps1
7835dda30219ca441705cd1b052cfef2eca97921 2026-09-30 00:33:16 -0700 jdubciii release(br2): prepare supervised runbook and migrations for BR-2 lockdown
18238ff775251100b534aa029b1f102f50a1271e 2026-09-29 22:16:13 -0700 jdubciii feat: add Phase 12 ground-truth verification scripts, documentation CI guard, and arbiter ruling evidence
41296e4bc7adc7da7ad325bdaaf2897881c50d2f 2026-09-29 22:03:52 -0700 jdubciii feat: add local PostgreSQL rehearsal setup scripts and wrap-up concurrency tests
96fca3dd1f91be8eba36478208218ec37c943516 2026-09-29 21:27:54 -0700 jdubciii feat: implement database safeguards and testing infrastructure alongside Incident I-1 forensic artifacts
a2362c00de6bb651b160c129dda311c14702d5fb 2026-09-29 20:31:39 -0700 jdubciii test: add vitest dependency and characterization and concurrency test suites
bb4c463783e53ea4c078511a69e553b26b5b6489 2026-09-29 19:56:42 -0700 jdubciii docs: add Phase 12 architecture specification for league operations and resilience patterns
988ec29fa605233f14548246038413cf4765232d 2026-09-29 19:20:06 -0700 jdubciii feat: add database safeguard utility and R-12.2-J evidence documentation
ff5208a8b3bd6bb062b5bff5a561529d7b01add9 2026-09-29 18:59:02 -0700 jdubciii feat: implement weekly wrap-up service with game finality validation and claim idempotency
c8eef5aa4426219211bc85083fde50122032d7db 2026-09-29 18:39:30 -0700 jdubciii feat: implement weekly wrap-up service, auth middleware, and append-only penalty ledger migration
38f0761ffa346702a1c8cd87663313add6efd2fb 2026-09-28 21:44:48 -0700 jdubciii feat: add Express server and WallOfShame component
```

### 7.3 Push History Secret Scan (`push_history_scan.txt`)
```text
00e89dd64ae5c130b96cd7af476794a2014872b3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
8ec0ca50ba64891cba07935d72faa544bc91e311:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
a28e55dbb5afd04399e2405ace7bb4a7dbaa148c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
e0e857933e9a0dc21ca9792804935b947e2dd445:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
e67ad25be94676a4f5871db03e779766f57c9cca:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
0619e3dcfbdad1ba16d48fc51e401c1dbc479ec3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
795bc1a360650b2d7a4e611caaacf8c233d1c5bc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
75c42c50aedf952ae671da572f7c595359125f20:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
d6251e865a22c7251efedd41172abaaa8cdc9508:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
8b2e4a8853b8f9f9969abf03922c9f4a5ca6b141:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
c0dfd0381a52b4d1a65973772a28f207ce39fa21:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
57b4a66b0f5d80dfdcfe8c0bff19b39a1133ccdc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
d14eb4fd0e31828fd50ade7068e4b72da906ad68:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
5f9f25c84c62310a52f36db87e6aa74e9a8cbe38:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
87aac809dbd1b470dfd257f52f03c0a8a5e8f75f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
7835dda30219ca441705cd1b052cfef2eca97921:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
18238ff775251100b534aa029b1f102f50a1271e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
41296e4bc7adc7da7ad325bdaaf2897881c50d2f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
96fca3dd1f91be8eba36478208218ec37c943516:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
a2362c00de6bb651b160c129dda311c14702d5fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
bb4c463783e53ea4c078511a69e553b26b5b6489:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
988ec29fa605233f14548246038413cf4765232d:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
ff5208a8b3bd6bb062b5bff5a561529d7b01add9:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
c8eef5aa4426219211bc85083fde50122032d7db:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
38f0761ffa346702a1c8cd87663313add6efd2fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
e41ce7249fc8e5120957cc61ce0e6ce14dcdac4a:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
c2e1ff9d33f7642d9eb5a9fa460a93e4d7adfdbd:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
94eff178f4b00004f95b07ccc47a52e164a6912e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
b767907a8d2554d25025d585a02fad0f0e970001:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
68c7b65b1914f2170549a7e229c4c139947288da:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
3d27d539d31ad521aeb2676d84083b303df286ad:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
40da61b4445b3821e5e32d6426f589ae6aa0d48c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
b884656a95290f2d1d689fafdeea894ec1520aaf:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
d9a822d0862550f727f4aa39b396aa50f19fa839:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
52aa4b6a31ce77d3c03f744349a05b6849424995:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
```

---

## 8. BR-2 Row-Level Security & Privilege Lockdown Matrix (16 Tables)

| Table | RLS | Anon SELECT | Anon INSERT | Anon UPDATE | Anon DELETE | Auth SELECT | Auth INSERT | Auth UPDATE | Auth DELETE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_prisma_migrations` | ENABLED | false | false | false | false | false | false | false | false |
| `audit_logs` | ENABLED | false | false | false | false | false | false | false | false |
| `games` | ENABLED | false | false | false | false | false | false | false | false |
| `inbox_messages` | ENABLED | false | false | false | false | false | false | false | false |
| `job_runs` | ENABLED | false | false | false | false | false | false | false | false |
| `notification_preferences` | ENABLED | false | false | false | false | false | false | false | false |
| `outbox_events` | ENABLED | false | false | false | false | false | false | false | false |
| `penalty_ledger` | ENABLED | false | false | false | false | false | false | false | false |
| `penalty_media` | ENABLED | false | false | false | false | false | false | false | false |
| `pick_results` | ENABLED | false | false | false | false | false | false | false | false |
| `picks` | ENABLED | false | false | false | false | false | false | false | false |
| `pool_member_stats` | ENABLED | false | false | false | false | false | false | false | false |
| `pool_memberships` | ENABLED | false | false | false | false | false | false | false | false |
| `pools` | ENABLED | false | false | false | false | false | false | false | false |
| `users` | ENABLED | false | false | false | false | false | false | false | false |
| `weekly_submissions` | ENABLED | false | false | false | false | false | false | false | false |

---

## 9. Source Code Verifications

### 9.1 Wrap-Up Claim Step Fail-Closed (`src/services/weeklyWrapUp.ts:151-215`)
```typescript
151:     if (pendingGames.length > 0) {
152:       const sortedPending = [...pendingGames].sort(
153:         (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
154:       );
155:       return {
156:         applied: false,
157:         reason: 'WEEK_NOT_FINAL',
158:         pendingCount: pendingGames.length,
159:         earliestPendingKickoff: sortedPending[0]?.kickoffTime ?? null,
160:         poolId,
161:         weekNumber,
162:         weekNo: weekNumber,
163:       };
164:     }
165: 
166:     // -------------------------------------------------------------------------
167:     // Step 4: WRITE (Claim) - Atomic claim insertion via createMany
168:     // -------------------------------------------------------------------------
169:     const claim = await tx.weeklyWrapup.createMany({
170:       data: [{ poolId, weekNumber }],
171:       skipDuplicates: true,
172:     });
173:     if (claim.count === 0) {
174:       return { applied: false, reason: 'ALREADY_WRAPPED_UP', poolId, weekNumber, weekNo: weekNumber };
175:     }
176: 
177:     // -------------------------------------------------------------------------
178:     // Step 5: WRITE (Effects) - Grade, Split Penalties, and Update Stats
179:     // -------------------------------------------------------------------------
180:     const targetGame = resolveTiebreakerGame(nonExcludedGames, gameTargetSetting);
181:     const targetGameHomeScore = targetGame?.homeScore ?? 0;
182:     const targetGameAwayScore = targetGame?.awayScore ?? 0;
183:     const actualTiebreakerTotal = targetGame ? targetGameHomeScore + targetGameAwayScore : 0;
184: 
185:     // Fetch weekly submissions for tiebreaker predictions
186:     const weeklySubmissions = await tx.weeklySubmission.findMany({
187:       where: {
188:         poolId: pool.id,
189:         weekNumber,
190:       },
191:     });
192: 
193:     const predictionsMap = new Map<string, number | null>();
194:     for (const sub of weeklySubmissions) {
195:       if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
196:         predictionsMap.set(sub.userId, Number(sub.tieBreakerPrediction));
197:       } else {
198:         predictionsMap.set(sub.userId, null);
199:       }
200:     }
201: 
202:     // Calculate score per member
203:     const memberScoresMap = new Map<string, number>();
204:     for (const membership of pool.memberships) {
205:       memberScoresMap.set(membership.userId, 0);
206:     }
207: 
208:     for (const pick of picks) {
209:       if (memberScoresMap.has(pick.userId) && pick.result) {
210:         const isExcluded = pick.game ? isGameInExcludedWindow(pick.game.kickoffTime, excludedWindows) : false;
211:         if (!isExcluded) {
212:           const currentScore = memberScoresMap.get(pick.userId) || 0;
213:           memberScoresMap.set(pick.userId, currentScore + Number(pick.result.pointsAwarded));
214:         }
215:       }
```
*Verification: `to_regclass` checked fail-closed; if table absent or tx.weeklyWrapup missing, returns `CLAIM_STORE_UNAVAILABLE`. Single atomic `createMany` claim insertion.*

### 9.2 S-8 GET /api/games Pool Scoping & Authorization (`src/server.ts:111-160`)
```typescript
111:   const userId = req.user!.id;
112:   const poolIdParam = req.query.pool_id;
113:   const poolId = poolIdParam !== undefined && poolIdParam !== null && poolIdParam !== ''
114:     ? String(poolIdParam)
115:     : undefined;
116: 
117:   try {
118:     let pool: any = null;
119:     if (poolId) {
120:       if (!UUID_REGEX.test(poolId)) {
121:         res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
122:         return;
123:       }
124: 
125:       pool = await prisma.pool.findUnique({ where: { id: poolId } });
126:       if (!pool) {
127:         res.status(404).json({ error: 'POOL_NOT_FOUND' });
128:         return;
129:       }
130: 
131:       const isCommissioner = pool.adminId === userId;
132:       if (!isCommissioner) {
133:         const membership = await prisma.poolMembership.findUnique({
134:           where: {
135:             poolId_userId: {
136:               poolId,
137:               userId,
138:             },
139:           },
140:         });
141: 
142:         if (!membership || membership.status !== 'ACTIVE') {
143:           res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
144:           return;
145:         }
146:       }
147:     } else {
148:       pool = await prisma.pool.findFirst({
149:         where: {
150:           status: 'ACTIVE',
151:           memberships: {
152:             some: {
153:               userId,
154:               status: 'ACTIVE',
155:             },
156:           },
157:         },
158:         orderBy: [{ name: 'asc' }],
159:       });
160: 
```
*Verification: Explicit `pool_id` validates UUID format (400), existence (404), and requires active membership or commissioner role (403). Omitted `pool_id` deterministically queries active user pool with zero write-on-GET.*

---

## 10. DDL Grep & Worktree Negative Control

### 10.1 Positive Control at HEAD (Clean Live State)
```text
CLEAN: 0 DDL or SET search_path statements found across tests/, scripts/dev/, prisma/seed.ts
```

### 10.2 Negative Control at Pre-Retirement Commit (e0e8579, Isolated `.worktree-ctl`)
```text
tests/wrapUpConcurrency.test.ts:17:      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
```

---

## 11. Authoritative Appendix A Decision Register (Superseding Register)

```markdown
## Phase 12 Decision Register (supersedes the register at ARCHITECTURE.md lines 498-548)

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

V4: APPROVED by Fallback; RATIFIED IN PART by the Arbiter.

R-12.2-AG: Register ratified. Hosted tripwire re-run. Authoritative register is located at 'Phase 12 Decision Register (supersedes...)'.

R-12.2-AH: Milestone 12.1 CONDITIONAL START; hosted tripwire & evidence repair cycle.

R-12.2-AH-V2: Hosted tripwire query streaming corrected. S-7/S-8 explicit console assertions logged. Pre-run porcelain check enforced.

R-12.2-AH-V2: Evidence gate cleared. Hosted tripwire now provides raw hosted identity, all 11 required table counts, migration state, trigger state, and rls_on 12/12; localhost inverse controls fail closed. S-7/S-8 required invariant and byte-equality assertions are explicitly logged. Pre-generation workspace hygiene is directly evidenced as clean. Milestone 12.1 remains CONDITIONAL START on feat/phase12-1-outbox; hosted DDL and merges to main remain blocked pending separate implementation gates.

R-12.2-AI: Step 1 (Core Schema & Migration) implemented on rehearsal DB. Revoke/RLS applied.

R-12.2-AJ: I-1/I-2 CLOSED; 12.1 step A accepted with amendment. Authoritative register pointer updated.
```
*Verification: Full 57-item authoritative Decision Register (#1 through #57) registered in ARCHITECTURE.md.*

---

## 12. Decision #50 Database Headers & Verification

### 12.1 feat/phase12-migrations: Decision #50 DB Header
```text
=== DB Header & Rehearsal Verification ===

1. Database Identity:
[
  {
    "current_database": "pickem_rehearsal",
    "current_user": "postgres",
    "inet_server_addr": "127.0.0.1",
    "inet_server_port": 5432
  }
]

2. Applied Migrations:
[
  {
    "migration_name": "20260927000000_init",
    "started_at": "2026-10-02T03:17:48.331Z",
    "finished_at": "2026-10-02T03:17:48.406Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-02T03:17:48.407Z",
    "finished_at": "2026-10-02T03:17:48.432Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-02T03:17:48.434Z",
    "finished_at": "2026-10-02T03:17:48.475Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-02T03:17:48.476Z",
    "finished_at": "2026-10-02T03:17:48.480Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-02T03:17:48.481Z",
    "finished_at": "2026-10-02T03:17:48.502Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-02T03:17:48.503Z",
    "finished_at": "2026-10-02T03:17:48.509Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-02T03:17:48.510Z",
    "finished_at": "2026-10-02T03:17:48.513Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-02T03:17:48.514Z",
    "finished_at": "2026-10-02T03:17:48.520Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930030000_br_4b_weekly_wrapups",
    "started_at": "2026-10-02T03:17:48.521Z",
    "finished_at": "2026-10-02T03:17:48.530Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Database schema is up to date!
```

### 12.2 feat/phase12-migrations: Raw Prisma Generate Output
```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 367ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want to react to database changes in your app as they happen? Discover how with Pulse: https://pris.ly/tip-1-pulse
```

### 12.3 feat/phase12-migrations: BR-4b Test Results
```text
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP 2535ms
 × tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP 2031ms
   → Transaction API error: Unable to start a transaction in the given time.
 × tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written 2048ms
   → Transaction API error: Unable to start a transaction in the given time.
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool 8ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 5. Marker UPDATE/DELETE/TRUNCATE throws append-only SQLSTATE P0001 33ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 6. anon and authenticated roles receive 42501 on SELECT from weekly_wrapups 13ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 7. Backfill INSERT...SELECT in rolled-back transaction asserts 1 marker created 8ms

 Test Files  1 failed (1)
      Tests  2 failed | 5 passed (7)
   Start at  20:18:28
   Duration  9.73s (tests 97%, transform 2%, import 1%)
```

### 12.4 feat/phase12-1-outbox: Decision #50 DB Header
```text
=== DB Header & Rehearsal Verification ===

1. Database Identity:
[
  {
    "current_database": "pickem_rehearsal",
    "current_user": "postgres",
    "inet_server_addr": "127.0.0.1",
    "inet_server_port": 5432
  }
]

2. Applied Migrations:
[
  {
    "migration_name": "20260927000000_init",
    "started_at": "2026-10-02T03:19:01.590Z",
    "finished_at": "2026-10-02T03:19:01.690Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-02T03:19:01.693Z",
    "finished_at": "2026-10-02T03:19:01.725Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-02T03:19:01.727Z",
    "finished_at": "2026-10-02T03:19:01.772Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-02T03:19:01.773Z",
    "finished_at": "2026-10-02T03:19:01.781Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-02T03:19:01.782Z",
    "finished_at": "2026-10-02T03:19:01.805Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-02T03:19:01.806Z",
    "finished_at": "2026-10-02T03:19:01.815Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-02T03:19:01.816Z",
    "finished_at": "2026-10-02T03:19:01.819Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-02T03:19:01.820Z",
    "finished_at": "2026-10-02T03:19:01.829Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-02T03:19:01.830Z",
    "finished_at": "2026-10-02T03:19:01.893Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Database schema is up to date!
```

### 12.5 feat/phase12-1-outbox: Raw Prisma Generate Output
```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 540ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want real-time updates to your database without manual polling? Discover how with Pulse: https://pris.ly/tip-0-pulse
```

### 12.6 feat/phase12-1-outbox: 12.1 Notifications Tests Execution (`vitest tests/notifications.test.ts`)
```text
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 2518ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 20ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 19ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 14ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 19ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 7ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 7ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  20:20:49
   Duration  3.43s (tests 88%, transform 6%, setup 4%, import 1%, worker 1%)
```

### 12.7 feat/phase12-1-outbox: Full Test Suite Execution (`npm run test:db`)
```text
> nfl-pick-em@1.0.0 test:db
> npm run db:reset && npx prisma migrate deploy && npx prisma generate && node scripts/db_header.js && vitest --no-color --reporter=verbose --reporter=json --outputFile=vitest.json


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
│ 0       │ '20260927000000_init'                                       │ 2026-10-02T03:19:57.080Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-02T03:19:57.114Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-02T03:19:57.161Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-02T03:19:57.171Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-02T03:19:57.198Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-02T03:19:57.207Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-02T03:19:57.211Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-02T03:19:57.222Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-02T03:19:57.295Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 489ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate

=== DB Header & Rehearsal Verification ===

1. Database Identity:
[
  {
    "current_database": "pickem_rehearsal",
    "current_user": "postgres",
    "inet_server_addr": "127.0.0.1",
    "inet_server_port": 5432
  }
]

2. Applied Migrations:
[
  {
    "migration_name": "20260927000000_init",
    "started_at": "2026-10-02T03:19:56.965Z",
    "finished_at": "2026-10-02T03:19:57.080Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-02T03:19:57.082Z",
    "finished_at": "2026-10-02T03:19:57.114Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-02T03:19:57.116Z",
    "finished_at": "2026-10-02T03:19:57.161Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-02T03:19:57.163Z",
    "finished_at": "2026-10-02T03:19:57.171Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-02T03:19:57.172Z",
    "finished_at": "2026-10-02T03:19:57.198Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-02T03:19:57.201Z",
    "finished_at": "2026-10-02T03:19:57.207Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-02T03:19:57.208Z",
    "finished_at": "2026-10-02T03:19:57.211Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-02T03:19:57.212Z",
    "finished_at": "2026-10-02T03:19:57.222Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-02T03:19:57.223Z",
    "finished_at": "2026-10-02T03:19:57.295Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Database schema is up to date!

 RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 2530ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 25ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 36ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 24ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 23ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 10ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 171ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 16ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 2533ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 2564ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 2531ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 63ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 86ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 27ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 10ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 11ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 83ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 50ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 722ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 35ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 51ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 24ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 70ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
pool count before = 9
pool count after = 9
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
pool count before = 9
pool count after = 9
pool count invariant = PASS

 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 283ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
pool count before = 9
pool count after = 9
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
pool count before = 9
pool count after = 9
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
pool count before = 9
pool count after = 9
pool count invariant = PASS
member response byte equality = PASS
commissioner response byte equality = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 10ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 29ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 14ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 4ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 15ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 18ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 8ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 404 when the pool does not exist in DB 2ms
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
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 21ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 111ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 26ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 48ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 111ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 9ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 4ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 3ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 4ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 2ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 5ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  8 passed (8)
      Tests  75 passed (75)
   Start at  20:20:32
   Duration  11.45s (tests 83%, import 7%, setup 5%, transform 5%)

    Isolate  8 workers spawned · ~966ms startup each (spawn + environment, per file)
             at least ~1.61s faster with isolate: false — reuses workers across files instead of one per file

JSON report written to C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/vitest.json
```

---

## 13. Documentation Invariant Audit (Append-Only Verification)

### 13.1 Live File Line Counts & Baseline Numstat
```text
Line Counts:
  640 ARCHITECTURE.md
  136 ROADMAP.md
  400 tasks.md
  1176 total

Numstat vs Baseline (e41ce72):
347	0	ARCHITECTURE.md
58	0	ROADMAP.md
254	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---

## 14. Decision #49 Route Protection Matrix

| Route | Method | Scoping / Extraction | Guard Middleware | Security Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET | None | None | **ALLOWLISTED (Public Health Endpoint)** |
| `/api/auth/login` | POST | Body (`email`, `password`) | None | **PUBLIC AUTH** |
| `/api/pools` | GET | None | `requireAuth` | **GUARDED (Platform Pool List)** |
| `/api/games` | GET | Query (`week`, `pool_id`) | `requireAuth` | **GUARDED (S-8 Remediated: 400 on bad UUID, 404 on missing, 403 on non-member, deterministic fallback)** |
| `/api/pools/:pool_id/leaderboard` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/leaderboard/cumulative` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/penalties/adjust` | POST | Param (`pool_id`) | `requireAuth, requirePoolCommissioner` | **GUARDED (Pool Commissioner Only)** |
| `/api/pools/:pool_id/penalties/member/:member_id` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/penalties/:id/media` | POST | Param (`pool_id`) | `requireAuth` | **GUARDED (S-7 Remediated: Owner & Commissioner only)** |
| `/api/pools/:pool_id/penalties/:id/media/confirm` | PATCH | Param (`pool_id`) | `requireAuth` | **GUARDED (S-7 Remediated: Owner & Commissioner only)** |
| `/api/pools/:pool_id/penalties/:id/media` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/matrix` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/picks` | POST | Body (`pool_id`, `game_id`) | `requireAuth` | **GUARDED (User & Kickoff Lock)** |
| `/api/admin/users` | GET | None | `requireAuth, requireAdmin` | **ALLOWLISTED (Platform Admin User List)** |
| `/api/admin/audit-logs` | GET | None | `requireAuth, requireAdmin` | **GUARDED (Platform Audit Trail)** |
| `/api/admin/picks` | GET | Query (`pool_id`, `user_id`) | `requireAuth, requirePoolCommissioner({ from: 'query' })` | **REMEDIATED (BR-5b Commissioner Guard)** |
| `/api/admin/picks` | PUT | Body (`pool_id`, `user_id`, `game_id`) | `requireAuth, requirePoolCommissioner({ from: 'body' })` | **REMEDIATED (BR-5b Commissioner Guard)** |

---

## 15. BR-5 / BR-5b Raw Vitest JSON Test Artifact

```json
{"numTotalTestSuites":27,"numPassedTestSuites":27,"numFailedTestSuites":0,"numPendingTestSuites":0,"numTotalTests":75,"numPassedTests":75,"numFailedTests":0,"numPendingTests":0,"numTodoTests":0,"snapshot":{"added":0,"failure":false,"filesAdded":0,"filesRemoved":0,"filesRemovedList":[],"filesUnmatched":0,"filesUpdated":0,"matched":0,"total":0,"unchecked":0,"uncheckedKeysByFile":[],"unmatched":0,"updated":0,"didUpdate":false},"startTime":1790911232001,"success":true,"testResults":[{"assertionResults":[{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header is absent","status":"passed","title":"returns 401 when Authorization header is absent","duration":4.345800000000054,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header does not start with Bearer","status":"passed","title":"returns 401 when Authorization header does not start with Bearer","duration":0.7274999999999636,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 for an invalid / expired token","status":"passed","title":"returns 401 for an invalid / expired token","duration":0.9283000000000357,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth decodes valid JWT and attaches user to req.user, then calls next()","status":"passed","title":"decodes valid JWT and attaches user to req.user, then calls next()","duration":15.382299999999987,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 401 if req.user is undefined","status":"passed","title":"returns 401 if req.user is undefined","duration":17.84809999999993,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 403 if req.user is not ADMIN","status":"passed","title":"returns 403 if req.user is not ADMIN","duration":0.7497999999998228,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin calls next() if user is ADMIN","status":"passed","title":"calls next() if user is ADMIN","duration":0.8002999999998792,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 401 if req.user is missing","status":"passed","title":"returns 401 if req.user is missing","duration":0.9308999999998377,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 400 for a malformed non-UUID pool_id","status":"passed","title":"returns 400 for a malformed non-UUID pool_id","duration":7.550900000000183,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 404 when the pool does not exist in DB","status":"passed","title":"returns 404 when the pool does not exist in DB","duration":1.6261999999999261,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 403 when user is neither commissioner nor member","status":"passed","title":"returns 403 when user is neither commissioner nor member","duration":0.648200000000088,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","duration":0.6041000000000167,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner calls next() and attaches pool when user is the pool commissioner","status":"passed","title":"calls next() and attaches pool when user is the pool commissioner","duration":0.5482999999999265,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - extracts pool_id from query params and authorizes commissioner","status":"passed","title":"from: query - extracts pool_id from query params and authorizes commissioner","duration":0.5871999999999389,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - returns 400 when pool_id query parameter is missing","status":"passed","title":"from: query - returns 400 when pool_id query parameter is missing","duration":0.404700000000048,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - extracts pool_id from request body and authorizes commissioner","status":"passed","title":"from: body - extracts pool_id from request body and authorizes commissioner","duration":0.49499999999989086,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - returns 400 when pool_id body parameter is missing","status":"passed","title":"from: body - returns 400 when pool_id body parameter is missing","duration":0.3876000000000204,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember returns 403 if user is not a member and not the commissioner","status":"passed","title":"returns 403 if user is not a member and not the commissioner","duration":0.766399999999976,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","duration":0.4962999999997919,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is active pool member","status":"passed","title":"calls next() when user is active pool member","duration":0.40409999999997126,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is the pool commissioner (even without explicit membership row)","status":"passed","title":"calls next() when user is the pool commissioner (even without explicit membership row)","duration":0.3630999999998039,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911242132,"endTime":1790911242189.404,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/authMiddleware.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","status":"passed","title":"BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","duration":21.138299999999617,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","duration":110.82110000000011,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":25.870800000000145,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":47.60189999999966,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","status":"passed","title":"BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","duration":110.95849999999973,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","status":"passed","title":"BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","duration":9.389399999999569,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911242328,"endTime":1790911242655.3894,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br1.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","status":"passed","title":"BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","duration":2563.9679,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","duration":722.2688000000003,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","duration":283.46389999999974,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","status":"passed","title":"BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","duration":13.986799999999675,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","status":"passed","title":"BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","duration":17.772100000000137,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911237353,"endTime":1790911240955.7722,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br2.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-4b: Fail-Closed Claim Store Invariant (Decision #52)"],"fullName":"BR-4b: Fail-Closed Claim Store Invariant (Decision #52) Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","status":"passed","title":"Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","duration":2533.0984,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911236572,"endTime":1790911239105.0984,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br4b.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":170.5020999999997,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 400 when pool_id query parameter is missing or malformed","status":"passed","title":"returns 400 when pool_id query parameter is missing or malformed","duration":16.416700000000674,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 404 when pool does not exist","status":"passed","title":"returns 404 when pool does not exist","duration":2531.3794,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":12.11620000000039,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 200 and game slate snapshot when user is the verified commissioner","status":"passed","title":"returns 200 and game slate snapshot when user is the verified commissioner","duration":62.590400000000045,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":86.08719999999994,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 400 when pool_id is missing or malformed in request body","status":"passed","title":"returns 400 when pool_id is missing or malformed in request body","duration":26.97739999999976,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 404 when pool does not exist in request body","status":"passed","title":"returns 404 when pool does not exist in request body","duration":9.734600000000682,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":11.42239999999947,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 200 and upserts pick when authenticated user is the commissioner","status":"passed","title":"returns 200 and upserts pick when authenticated user is the commissioner","duration":82.8781999999992,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","duration":49.76209999999992,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403","duration":34.987200000000485,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) verifies zero penalty_media rows exist after denied upload attempts","status":"passed","title":"verifies zero penalty_media rows exist after denied upload attempts","duration":4.592200000000048,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success","duration":50.79669999999987,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","status":"passed","title":"PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","duration":24.115199999999277,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success","status":"passed","title":"PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success","duration":70.14609999999993,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)","status":"passed","title":"returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)","duration":17.91449999999986,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)","status":"passed","title":"returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)","duration":7.794600000000173,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 400 when explicit pool_id is not a valid UUID (no pool write)","status":"passed","title":"returns 400 when explicit pool_id is not a valid UUID (no pool write)","duration":6.579499999998916,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 403 when user is not a member or commissioner of the requested pool (no pool write)","status":"passed","title":"returns 403 when user is not a member or commissioner of the requested pool (no pool write)","duration":9.959000000000742,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot","status":"passed","title":"returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot","duration":29.354699999999866,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","Decision #49: CI Route Scan & Route Guard Verification"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan Decision #49: CI Route Scan & Route Guard Verification verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","status":"passed","title":"verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","duration":1.3896999999997206,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911237491,"endTime":1790911240971.3896,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br5b_routes.test.ts"},{"assertionResults":[{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock: enforces lock per-game at kickoff boundary","status":"passed","title":"Rolling lock: enforces lock per-game at kickoff boundary","duration":3.536399999999958,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock with offset: enforces lock at (kickoff - offset)","status":"passed","title":"Rolling lock with offset: enforces lock at (kickoff - offset)","duration":0.6616999999998825,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Global lock vs Rolling lock: handles first game vs later games","status":"passed","title":"Global lock vs Rolling lock: handles first game vs later games","duration":0.5406000000000404,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","status":"passed","title":"Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","duration":2.6023999999999887,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4 splitPenalty Math Characterization"],"fullName":"BR-4 splitPenalty Math Characterization Worked matrix: confirms exact zero-diff decimal split amounts","status":"passed","title":"Worked matrix: confirms exact zero-diff decimal split amounts","duration":4.267100000000028,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4b Set-Equality: Wrap-Up vs Scoring Resolver"],"fullName":"BR-4b Set-Equality: Wrap-Up vs Scoring Resolver Asserts 100% game ID set equality between wrap-up and scoring resolvers","status":"passed","title":"Asserts 100% game ID set equality between wrap-up and scoring resolvers","duration":1.9179000000001452,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911243044,"endTime":1790911243057.918,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/characterization.test.ts"},{"assertionResults":[{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) both rows created","status":"passed","title":"both rows created","duration":2529.8103,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) duplicate enqueue creates no second outbox OR inbox row","status":"passed","title":"duplicate enqueue creates no second outbox OR inbox row","duration":24.668699999999717,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) caller transaction that throws after enqueue leaves zero rows in both tables","status":"passed","title":"caller transaction that throws after enqueue leaves zero rows in both tables","duration":35.77639999999974,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) IN_APP-only writes no outbox row","status":"passed","title":"IN_APP-only writes no outbox row","duration":23.74030000000039,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) EMAIL-only writes no inbox row","status":"passed","title":"EMAIL-only writes no inbox row","duration":15.947900000000118,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) disallowed payload key is stripped","status":"passed","title":"disallowed payload key is stripped","duration":22.759000000000015,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink","status":"passed","title":"reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink","duration":9.90899999999965,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) static test fails if the module imports nodemailer, net, http(s) or fetch","status":"passed","title":"static test fails if the module imports nodemailer, net, http(s) or fetch","duration":7.222700000000259,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911234033,"endTime":1790911236704.2227,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/notifications.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl allows valid local disposable database URLs","status":"passed","title":"allows valid local disposable database URLs","duration":4.957499999999982,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","status":"passed","title":"rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","duration":1.457899999999995,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","status":"passed","title":"Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","duration":0.7916000000000167,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects URLs using ?schema= parameter to bypass host isolation","status":"passed","title":"rejects URLs using ?schema= parameter to bypass host isolation","duration":0.7121999999999389,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects non-disposable production database names on localhost","status":"passed","title":"rejects non-disposable production database names on localhost","duration":1.2568999999999733,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","status":"passed","title":"sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","duration":0.9056999999999107,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790911243489,"endTime":1790911243499.9058,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/safeguards.test.ts"}]}
```

---

## 16. R-12.2-AJ Acceptance Criteria Checklist

- [ ] Schema amendment applied to `prisma/schema.prisma` and migration `20261001160000_12_1_a_outbox_inbox_core`: `dedupe_key` added to `inbox_messages`, `UNIQUE(user_id, dedupe_key)` index created, check constraints on `outbox_events.attempts` and `notification_preferences.reminder_offsets_hours` verified.
- [ ] `enqueueNotification` helper implemented in `src/services/notifications.ts` with channel routing (`IN_APP`, `EMAIL`), `skipDuplicates: true`, zero transport/network imports, and payload allow-list stripping with warnings.
- [ ] All 8 unit/integration tests in `tests/notifications.test.ts` passing cleanly.
- [ ] Design note `docs/design/12.1.md` updated with Section 3 corrections (concept scope, replace `POST /api/admin/jobs/run`, lifecycle statuses/backoff, lock resolver pure extraction, open questions answered).
- [ ] Working tree hygiene maintained (`vitest.json` in `.gitignore`, `feat/phase12-migrations` merged with `main` to carry `db_header.js`).
- [ ] Push history log (25 commits) and secret scan over `origin/main` captured and verified clean.
- [ ] Decision #57 registered in `docs/rulings/appendix-a.md` and `ARCHITECTURE.md`, byte-for-byte CI check verified.
- [ ] Complete evidence bundle generated and bound in `docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md`.

---

# MILESTONE 12.1 DESIGN SPECIFICATION

The following is the complete, verbatim content of `docs/design/12.1.md`:

# Phase 12.1 Design Note: Resilient Outbox, Inbox & Background Job Architecture

## 1. Overview & Objectives
Phase 12.1 establishes an asynchronous, resilient background processing architecture for NFL Pick'em. The primary goal is to decouple critical transactional mutations (e.g. pick submissions, pool membership updates, weekly wrap-ups) from downstream side-effects (e.g. notification dispatch, audit streaming, statistical rollups, reminder triggers) via an Outbox Pattern.

---

## 2. Planned Architecture & Components

### 2.1 Files to Add
The following files are planned for addition in Phase 12.1 (strictly keeping application code out of `src/` during Phase 12.0 / R-12.2-AG):
- `src/services/outbox.ts`: Transactional outbox event publisher and queue processor.
- `src/services/inbox.ts`: Idempotent inbox message deduplication and consumer.
- `src/workers/drain.ts`: Outbox drain worker for processing pending outbox events.
- `src/workers/reminder.ts`: Background worker for pick deadline reminders and alerts.
- `src/services/lockResolver.ts`: Extracted, centralized game/pool lock resolution engine and window evaluation.
- `src/jobs/scheduler.ts`: Internal job scheduler loop managing interval timers for background tasks.
- `tests/outbox.test.ts`: Integration tests for outbox transactional persistence, processing, and retry lifecycles.
- `tests/inbox.test.ts`: Idempotency and deduplication tests for incoming events.
- `tests/lockResolver.test.ts`: Unit and characterization tests for lock-offset and window exclusions (`isGameInExcludedWindow`).
- `tests/scheduler.test.ts`: Concurrency and timer tests for the internal scheduler.

---

## 3. Lock-Resolver Extraction Plan

### Current State
Game locking logic (`isGameLocked`), lock offset evaluation (`lock_offset` from `pool.settings`), and window exclusions (`isGameInExcludedWindow` for TNF, MNF, Sunday Early/Late, SNF) are currently distributed across `src/services/scoringEngine.ts`, `src/server.ts`, `src/routes/games.ts`, and `src/services/weeklyWrapUp.ts`.

### Target Extraction
Extract all lock calculation, offset evaluation, and window exclusion rules into a single dedicated, pure module: `src/services/lockResolver.ts` (or `src/utils/lockResolver.ts`).

#### Interface Specification
```typescript
export interface LockContext {
  kickoffTime: Date;
  lockOffsetMinutes: number;
  now?: Date;
}

export interface LockStatus {
  isLocked: boolean;
  effectiveLockTime: Date;
  minutesRemaining: number;
}

export function computeGameLockStatus(context: LockContext): LockStatus;
export function isGameLocked(kickoffTime: Date, lockOffsetMinutes: number, now?: Date): boolean;
export function assertGameUnlocked(kickoffTime: Date, lockOffsetMinutes: number, now?: Date): void;
export function isGameInExcludedWindow(kickoffTimeIso: string | Date, excludedWindows: string[]): boolean;
```

#### Migration Strategy
1. Centralize `isGameInExcludedWindow` and `isGameLocked` in `src/services/lockResolver.ts` with comprehensive unit tests across edge cases (negative offsets, 0 offsets, post-kickoff, timezone variations).
2. Refactor route handlers (`/api/picks`, `/api/games`) and services (`scoringEngine.ts`, `weeklyWrapUp.ts`) to consume `assertGameUnlocked` and `isGameInExcludedWindow`.
3. Verify zero behavioral regression against `tests/characterization.test.ts` and `tests/br5b_routes.test.ts`.

---

## 4. Scheduler Trigger Mechanism

### Constraints
- **No external cron library** (e.g., `node-cron`, `cron`, `agenda`) to maintain a dependency-safe, lightweight, and deterministic runtime.
- Controlled exclusively via environment flags: `INTERNAL_JOBS_ENABLED=true`.

### Implementation Pattern
- **Scheduler Loop**: Native `setInterval` / recursive `setTimeout` loop initialized conditionally upon server startup:
  ```typescript
  if (process.env.INTERNAL_JOBS_ENABLED === 'true') {
    startSchedulerLoop();
  }
  ```
- **Manual Trigger Endpoint**:
  - Secure commissioner/admin endpoint `POST /api/admin/jobs/run` guarded by `requireAuth` and `requireAdmin` for on-demand execution and test harness invocations.
- **Fail-Safe Graceful Shutdown**:
  - Register `SIGTERM` / `SIGINT` hooks to clear active intervals and await completion of in-flight outbox batches.

---

## 5. Outbox & Inbox Event Lifecycle

```
[ HTTP Route Handler ]
       │ (Prisma Transaction)
       ├─── Writes Domain Entity (e.g. Pick, WrapUp)
       └─── Writes OutboxEvent (topic, payload, status: PENDING)
       │
[ Database / PostgreSQL ]
       │
[ Polling Job / Scheduler / drain.ts ] (INTERNAL_JOBS_ENABLED=true)
       │
       ├─── SELECT ... FROM outbox_events WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
       ├─── Execute Handlers / Dispatchers
       └─── UPDATE outbox_events SET status = 'PROCESSED', processed_at = NOW()
```

---

## 6. Open Questions & Architectural Considerations
1. **Advisory Locking / Multi-Instance Concurrency**:
   - If multiple server instances run simultaneously, should we use PostgreSQL advisory locks (`pg_try_advisory_lock`) or `FOR UPDATE SKIP LOCKED` for outbox polling?
2. **Dead Letter Queue (DLQ) & Retry Policy**:
   - What max-retry count (e.g., 3 or 5) and exponential backoff interval should be enforced before marking an event `FAILED`?
3. **Event Retention / Cleanup**:
   - Should processed outbox events be retained permanently for audit trails or purged after a configurable TTL (e.g., 30 days)?

---

## 7. R-12.2-AJ Section 3 Design Corrections & Amendments

### 7.1 Rename Concept & Architecture Scope
- The notification dispatch and job execution architecture is formalized as the **Resilient Outbox & Event-Driven Notification Engine**.
- Decouples domain write operations from downstream notification delivery.
- Guarantees strict transactional isolation (INV-6) with zero network transport or I/O in API mutation paths.
- Inbox messages serve as the canonical source of truth (Decision #5), while outbox events manage best-effort delivery.
- Every table written by a re-running job carries a database-enforced dedupe key (Decision #57).

### 7.2 Replace POST /api/admin/jobs/run with Internal Worker Invocations
- The proposed generic endpoint `POST /api/admin/jobs/run` is **REMOVED** and replaced by dedicated internal job runners and isolated scheduled workers.
- No public or commissioner HTTP endpoints can trigger arbitrary or unsanitized background jobs.
- Testing harnesses and scheduled triggers execute through direct internal service invocations (`runOutboxDrainWorker()`, `runPickReminderScanner()`) under strict transactional boundaries.

### 7.3 Lifecycle Statuses, Lease Expiration & Exponential Backoff
- Outbox event lifecycle states: `PENDING` -> `PROCESSING` -> `SENT` / `FAILED` -> `DEAD`.
- Job run lifecycle states: `RUNNING` -> `OK` / `PARTIAL` / `FAILED`.
- Exponential Backoff Schedule: Next retry attempt scheduled with delay formula `nextAttemptAt = now + baseDelay * (2 ^ attempts)` (base delay: 60s, max attempts: 5).
- Lease expiration: Processing workers acquire leases with `lease_expires_at = now + 5 minutes`; stale leases are reclaimed automatically on subsequent worker passes.

### 7.4 Lock Resolver Pure Module Extraction
- `src/services/lockResolver.ts` extracted as a pure, stateless computation engine.
- Zero database queries, mutations, or network calls inside `lockResolver.ts`.
- Evaluates `kickoffTime`, `lockOffsetMinutes`, and `excludedWindows` deterministically for both client and server consumers.

### 7.5 Open Questions Resolution
1. **Advisory Locking / Multi-Instance Concurrency:**
   - Standardized on `FOR UPDATE SKIP LOCKED` for outbox event batch polling and claim processing.
2. **Dead Letter Queue (DLQ) & Retry Policy:**
   - Max retry limit set to 5 attempts with exponential backoff. Events reaching 5 failed attempts transition to `DEAD` for manual commissioner triage.
3. **Event Retention & Cleanup:**
   - Sent and dead events retained for 30 days for audit and delivery verification before scheduled background archival.

---

# LIVE REPOSITORY CONTEXT

## prisma/schema.prisma

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

  pool Pool @relation(fields: [poolId], references: [id], onDelete: Restrict)
  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

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

  pool      Pool  @relation(fields: [poolId], references: [id], onDelete: Restrict)
  recipient User  @relation("OutboxEventRecipient", fields: [recipientUserId], references: [id], onDelete: Restrict)
  retrier   User? @relation("OutboxEventRetrier", fields: [retriedBy], references: [id], onDelete: Restrict)

  @@index([status, nextAttemptAt])
  @@map("outbox_events")
}

model NotificationPreference {
  userId               String   @id @map("user_id") @db.Uuid
  emailEnabled         Boolean  @default(true) @map("email_enabled")
  reminderOffsetsHours Int[]    @default([24, 2]) @map("reminder_offsets_hours")
  unsubscribeToken     String   @unique @default(uuid()) @map("unsubscribe_token")
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamp(3)

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

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

## git log -n 5 --oneline

```text
07c2cab feat: 12.1 step A schema amendment, helper, and R-12.2-AJ implementation
e65a11e docs: bind evidence bundle for 12.1 Step 1 schema and helper
26ac1ef feat: 12.1 schema, migration, and enqueueNotification helper
abaf982 docs: bind baseline evidence bundle for 12.1 conditional start
774a338 docs: record R-12.2-AH-V2 ruling and clear evidence gates
```

## git status

```text
On branch feat/phase12-1-outbox
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/evidence/R-12.2-AJ/

nothing added to commit but untracked files present (use "git add" to track)
```

## ARCHITECTURE.md

````markdown
# ARCHITECTURE.md

## 1. System Topology & Component Diagram

The system follows a strictly decoupled 3-tier architecture. The client application never interacts directly with the external NFL data provider. All external data is asynchronously synced to the local database, ensuring the application remains fast and highly available even if the upstream API experiences downtime (stale-while-revalidate).

```mermaid
graph TD
    subgraph External
        API[External NFL API]
    end

    subgraph Backend Engine
        SW[Sync Worker / CRON]
        API_Layer[Backend API / Scoring Engine]
    end

    subgraph Persistence Layer
        DB[(Application Database)]
    end

    subgraph Client
        UI[Web / Mobile UI]
    end

    API -->|Raw Schedules & Scores| SW
    SW -->|Upserts Game State| DB
    UI -->|Reads State / Writes Picks| API_Layer
    API_Layer <-->|Queries & Mutations| DB
```

---

## 2. Relational Data Schema

The database serves as the absolute source of truth. All relations enforce strict uniqueness and auditability. Soft deletes (`status = 'INACTIVE'`) are used exclusively for pools and memberships to preserve historical leaderboard calculations.

### Core Tables

#### `users`
- **id** (UUID, Primary Key)
- **email** (String, Unique)
- **password_hash** (String)
- **role** (Enum: `ADMIN`, `USER`)
- **created_at** (Timestamp)

#### `pools`
- **id** (UUID, Primary Key)
- **name** (String)
- **admin_id** (UUID, Foreign Key -> `users.id`)
- **settings** (JSONB) - Stores point weights, dynamic lock offsets, penalty configs, tiebreaker rules, and anti-peeking/visibility configs.
- **status** (Enum: `ACTIVE`, `INACTIVE`)

#### `pool_memberships`
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **status** (Enum: `ACTIVE`, `INACTIVE`)
- *Primary Key*: `(pool_id, user_id)`

#### `games`
- **id** (UUID, Primary Key)
- **external_game_id** (String, Indexed) - Used for idempotent API reconciliation.
- **home_team_id** (String)
- **away_team_id** (String)
- **kickoff_time** (Timestamp) - Used as the strict `lock_at` threshold.
- **status** (Enum: `SCHEDULED`, `IN_PROGRESS`, `FINAL`)
- **home_score** (Int, Nullable)
- **away_score** (Int, Nullable)
- **commissioner_notes** (String, Nullable) - Admin-curated matchup notes/context.

#### `picks`
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **game_id** (UUID, Foreign Key -> `games.id`)
- **selected_team_id** (String, Nullable) - `NULL` indicates an omitted pick.
- **submitted_by** (UUID, Foreign Key -> `users.id`) - Tracks if the user or an admin entered the pick.
- **created_at** (Timestamp)
- *Constraint*: `UNIQUE(pool_id, user_id, game_id)`

#### `pick_results` (Immutable)
- **pick_id** (UUID, Primary Key, Foreign Key -> `picks.id`)
- **is_correct** (Boolean)
- **points_awarded** (Decimal(5,2)) - Standardized precision decimal for weighted and custom point values.
- **finalized_at** (Timestamp)

#### `audit_logs` (Append-Only)
- **id** (UUID, Primary Key)
- **actor_id** (UUID, Foreign Key -> `users.id`)
- **action** (String) - e.g., `"ADMIN_OVERRIDE_PICK"`
- **target_entity_id** (UUID)
- **old_value** (JSONB)
- **new_value** (JSONB)
- **timestamp** (Timestamp)

### Extended Tables (Penalty Engine & Precision Tiebreakers)

#### `pool_member_stats` (Cumulative Cache)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **total_shots_drank** (Decimal(5,2), Default: `0.00`) - Precision cumulative metric supporting fractional/split penalties.
- **first_place_finishes** (Int, Default: `0`)
- **dead_place_finishes** (Int, Default: `0`)
- **updated_at** (Timestamp)
- *Primary Key*: `(pool_id, user_id)`

#### `penalty_ledger` (Audit & Transactions)
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **week_number** (Int, Nullable)
- **delta** (Decimal(5,2)) - Exact integer or fractional penalty delta (e.g., `0.50` shots for split dead place).
- **reason** (String) - e.g., `'WEEKLY_DEAD_PLACE'`, `'LOSS_INCREMENT'`, `'ADMIN_ADJUSTMENT'`
- **created_by** (UUID, Foreign Key -> `users.id`)
- **created_at** (Timestamp)
- *Index*: `(pool_id, user_id)`

#### `weekly_submissions` (Draft & Tiebreaker Tracker)
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **week_number** (Int)
- **tie_breaker_prediction** (Decimal(5,2), Nullable) - User's predicted total points for the designated tiebreaker game.
- **is_finalized** (Boolean, Default: `false`) - Tracks draft vs. locked pick state for visibility.
- **created_at** (Timestamp)
- **updated_at** (Timestamp)
- *Constraint*: `UNIQUE(pool_id, user_id, week_number)`
- *Index*: `(pool_id, week_number, is_finalized)`

#### `penalty_media` (Shot-Cam Storage)
- **id** (UUID, Primary Key)
- **penalty_id** (UUID, Unique Foreign Key -> `penalty_ledger.id`)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **storage_path** (String) - Supabase bucket path.
- **media_type** (String) - e.g., `'image/jpeg'`, `'video/mp4'`
- **status** (Enum: `PENDING`, `CONFIRMED`, `REJECTED`)
- **confirmed_by** (UUID, Nullable)
- **created_at** (Timestamp)
- *Index*: `(pool_id, user_id)`

### `pools.settings` JSON Schema Extension

```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "type": "object",
  "properties": {
    "lock_offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Lock offset threshold in minutes prior to kickoff"
    },
    "lockMode": {
      "enum": ["ROLLING", "GLOBAL_FIRST_GAME"],
      "default": "ROLLING"
    },
    "excludedGameWindows": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "points_per_win": {
      "type": "number",
      "minimum": 0,
      "default": 1.0,
      "description": "Points awarded per winning pick (Decimal(5,2) precision)"
    },
    "picking_mode": {
      "type": "string",
      "enum": ["STRAIGHT_UP", "SPREAD"],
      "default": "STRAIGHT_UP",
      "description": "Mode of pick submission and scoring evaluation"
    },
    "hide_picks_until_kickoff": {
      "type": "boolean",
      "default": true,
      "description": "Enables anti-peeking pick masking before game kickoff"
    },
    "anti_peeking": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "reveal_at": {
          "type": "string",
          "enum": ["LOCK_TIME", "GAME_FINAL"],
          "default": "LOCK_TIME"
        }
      }
    },
    "tiebreaker": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "game_target": {
          "type": "string",
          "enum": ["LAST_GAME", "MONDAY_NIGHT", "CUSTOM"],
          "default": "MONDAY_NIGHT"
        },
        "allow_decimals": { "type": "boolean", "default": true },
        "rule": {
          "type": "string",
          "enum": ["CLOSEST_ABSOLUTE", "CLOSEST_WITHOUT_GOING_OVER"],
          "default": "CLOSEST_ABSOLUTE"
        }
      }
    },
    "penalties": {
      "type": "object",
      "required": ["penalty_name", "shots_per_loss", "dead_place_penalty", "tie_handling"],
      "properties": {
        "penalty_name": { "type": "string", "default": "shot" },
        "shots_per_loss": { "type": "integer", "minimum": 0, "default": 0 },
        "dead_place_penalty": { "type": "integer", "minimum": 1, "default": 1 },
        "tie_handling": {
          "type": "string",
          "enum": ["ALL_TIED", "TIEBREAKER_ONLY", "SPLIT_PENALTY"],
          "default": "ALL_TIED"
        }
      }
    }
  }
}
```

---

## 3. State Machine & Lifecycle Specifications

### 3.1 Game Lock Lifecycle
- **Pre-Game (`SCHEDULED`):** Picks can be created, updated, or deleted. The UI evaluates `games.kickoff_time` minus the pool's `lock_offset` (from `pools.settings`) to determine if the submission window is open.
- **Lock Execution:** The backend API rejects any `POST` / `PUT` requests to the `picks` table where the current server time is greater than or equal to the calculated lock time. 
  - If `lockMode === 'ROLLING'`, granular locking is enforced per-game.
  - If `lockMode === 'GLOBAL_FIRST_GAME'`, submittals across all weekly games are rejected after the week's first kickoff.
- **In-Progress (`IN_PROGRESS`):** External API sync worker updates live scores periodically. UI can display live projections, but official scores are not written.

### 3.2 Scoring Finalization Lifecycle
1. The External API reports a game as complete.
2. The Sync Worker updates the `games` table: `status = 'FINAL'`, setting final `home_score` and `away_score`.
3. The Backend Scoring Engine is triggered.
4. **Scoring Exclusion Pipeline:** The engine checks `pools.settings.excludedGameWindows`. Any game falling within an excluded window (e.g., `THURSDAY_NIGHT`) is skipped and zero points are allocated.
5. The Engine evaluates all picks for that `game_id` (unsubmitted or `NULL` picks resolve gracefully to 0 points).
6. The Engine calculates points based on `pools.settings` and writes records with `Decimal(5,2)` precision to the `pick_results` table.
7. **Immutability:** Once a `pick_result` is written, it is static. Historical scores are read directly from `pick_results`.

### 3.3 Weekly Finalization Pipeline & Tiebreaker Engine
- **Trigger Condition:** Executes when all scheduled games for `week_no` have `status = 'FINAL'`.
- **Locking:** Acquires a transactional lock to prevent concurrent wrap-up executions.
- **Base Scoring & Tiebreaker Calculation:**
  1. Sum `points_awarded` for all members in the week.
  2. Identify the designated target game (`settings.tiebreaker.game_target`) and calculate actual total: `actual_total = (home_score + away_score)`.
  3. For each member, evaluate absolute distance: `distance = abs(actual_total - tie_breaker_prediction)`.
- **Precision Ranking:**
  - **Primary Sort:** Total points (DESC).
  - **Secondary Sort:** Tiebreaker distance (ASC).
- **Resolution & Fractional Penalties:**
  - Identifies **1st Place** (increments `first_place_finishes`).
  - Identifies **Dead Place**. If a Dead Place tie persists (identical points + identical distance), calculates `split_penalty = dead_place_penalty / count(tied_members)` and writes exact `Decimal(5,2)` values to `penalty_ledger`.
- **Stat Recalculation:** Atomically sums `penalty_ledger.delta` to update `pool_member_stats.total_shots_drank` (maintaining 2 decimal places).

### 3.4 Sync Failure Fallback
If the External NFL API goes offline, the Sync Worker logs a failure but the application remains fully operational. The frontend reads from the local `games` table (stale-while-revalidate strategy). Lock times and existing finalized scores remain intact.

---

## 4. API Specification & Data Masking

### Matrix Grid Endpoint (`GET /api/pools/:pool_id/matrix?week_no=X`)
Generates a structured 2D array representation of the week for UI rendering. Payload maps directly to rows (games), columns (users), and cells (the intersection pick). 

#### Dual-Mode Visibility & Anti-Peeking Rules
The Matrix API enforces strict data masking based on `pools.settings`:

- **Mode A (Strict/Hidden):** If `hide_picks_until_kickoff == true`, any pick where `game.kickoff_time > NOW()` belonging to another user (`requesting_user_id != target_user_id` and `role != 'ADMIN'`) is redacted. The pick's `selected_team_id` is mutated to `null` and a flag `is_masked: true` is appended.
- **Mode B (Open Slate):** If `hide_picks_until_kickoff == false`, picks are redacted ONLY if the opponent's `WeeklySubmission.is_finalized == false` (still a draft). Once a user finalizes their sheet (`is_finalized == true`), their picks become instantly exposed via `selected_team_id` to all pool members regardless of kickoff time.

---

## 5. Client-Side Determinism (The Snapshot Rule)

All UI Presets (`Contrarian`, `Mirror Rival`, `Favorites`, `Home/Away`) operate strictly in the browser.
- **Execution:** They compute purely as point-in-time form auto-fills in the browser.
- **No Binding:** Zero late-binding server synchronizations or relational bindings. User A mirroring User B on Tuesday creates static pick records. Subsequent mutations by User B prior to lock do not auto-propagate to User A.
- **Conditional Rules:** `Contrarian` and `Mirror Rival` presets are only enabled on the frontend when `hide_picks_until_kickoff === false`.

---

## 6. Audit & Compliance Implementation Details

- **Server-Side Enforcement:** Client-side validation is strictly advisory. The backend re-verifies all timestamps, roles, and ownership before committing transactions.
- **Admin Mutation Tracking:** If a pick is created or modified by an Admin overriding on behalf of a user, the `submitted_by` column on the `picks` table permanently records the Admin's ID.
- **Append-Only Logging:** Any destructive or overriding action performed by an Admin triggers an asynchronous write to the `audit_logs` table capturing `actor_id`, `action`, `target_entity_id`, `old_value`, and `new_value`.

---

## Phase 12 — League Operations, Resilience & Season Lifecycle

### Resilient Outbox & Inbox Pattern
The system ensures non-blocking outbound network actions by persisting `InboxMessage` and `OutboxEvent` records within the same database transaction as the domain logic. 
- **Inbox:** DB-local source of truth.
- **Outbox:** Claimed by a drain worker using `FOR UPDATE SKIP LOCKED`. Uses exponential backoff and transitions to `DEAD` status after 5 failed delivery attempts. A MailTransport interface (with SMTP adapter) separates transport from logic.

### Worker Leases, Reminders & Job Health
- A stateless reminder scanner runs every ~10 minutes to detect unfinalized picks, keyed by `dedupeKey`, dynamically adjusting to schedule changes (flex moves). Payloads are allow-listed and never contain pick details.
- All sync, scoring, outbox-drain, and reminder-scan jobs log their executions to the `JobRun` table. The Commissioner Ops Health panel surfaces metrics such as `syncStale`, `outbox` status, and recent jobs.

### Audit & Correction Engine
The `AuditLog` table prevents `UPDATE` and `DELETE` via DB triggers. All corrections use compensating logic:
- **Overrides:** Commissioner-entered overrides preempt the sync engine, flagging `divergedFromProvider = true`.
- **Proposals:** Upstream sync changes on FINAL games generate a `ScoreCorrectionProposal`. If `outcomeChanged = false`, it applies automatically; otherwise, it requires commissioner approval.
- **Scoring Runs:** Always run a dry run diff, then apply via a unique `inputHash`. Points are derived state (recomputed).
- **Ledger Expansion:** `penalty_ledger` is expanded to include `entryType` (`ASSESSMENT`, `FULFILLMENT`, `WAIVER`, `REVERSAL`, `OPENING_BALANCE`) and `reversalOfId`. Updates are strictly additive. The outstanding balance is derived dynamically using the effect formula: `ASSESSMENT (+), OPENING_BALANCE (+), FULFILLMENT (-), WAIVER (-), REVERSAL (-effect(target))`. Negative balances are strictly blocked.

### Season State Machine & Seal Design
- **State Machine:** `SETUP` -> `ACTIVE` -> `FINALIZING` -> `CLOSED`.
- **Close-readiness:** Checks for un-finalized games, open proposals, runs, Shot-Cam verifications, and outstanding penalties.
- **Seal:** Moving to `CLOSED` generates a `SeasonSeal`: an immutable JSON snapshot with amounts stored as strings (e.g. `"0.00"`), a SHA256 checksum, and the selected carry-over policy (`CARRY`, `EXPIRE`, `WAIVE`). Reopening the season marks the seal `supersededAt` without deleting it.

### Rollover & Archive Model
- **Rollover:** Creates the next Season in `SETUP`, cloning rules with "review before activate" flags on exclusions/lockouts.
- **Carry-over:** `OPENING_BALANCE` entries propagate only for `CONFIRMED` users when the `CARRY` policy is executed.
- **Archive Read Model:** All history reads query the immutable `SeasonSeal` exclusively. Export features generate JSON/CSV bundles for `CLOSED` seasons only, guaranteeing that draft picks are never leaked.

---

## Phase 12 Design Decisions
1. **Points are derived; penalties are ledger:** Game scores recompute in-place; penalty counts require strictly additive transactions.
2. **Provider corrections are proposals:** Auto-apply only occurs when no outcome changes.
3. **Overrides beat sync:** Divergence from the data provider is explicitly flagged.
4. **Locks derive from stored kickoff only:** Sync outages never unlock a game.
5. **Inbox is the source of truth:** Email delivery is strictly best-effort outbox logic.
6. **Aggregates are never stored numerically:** Sealed season JSONs use fixed-string representations for balances.
7. **Pick-on-behalf is write-only:** Admins cannot scrape user drafts prior to locking via exception logs.
8. **History reads seals only:** Historical dashboards and exports never query the live relational tables.
9. **Ledger `entryType` is additive and parallel to `reason` (Ruling R-12.2-A):** 
   - `entryType` is added as a NEW column alongside existing `reason`. `reason` is NOT replaced, renamed, or dropped.
   - `reason` = cause/rule code (why). `entryType` = balance effect (what). Balance logic MUST NOT read `reason`.
   - Backfill is achieved via the column DEFAULT only. The migration MUST NOT contain any `UPDATE` and MUST NOT disable, drop, or alter the immutability trigger (INV-2).
   - Non-ASSESSMENT write paths remain disabled behind a feature flag until the read-path audit passes.
   - Reversal-of-reversal is forbidden. A REVERSAL may only target a non-REVERSAL entry with the same league, season, and user, and equal amount.
10. **Physical schema names govern (Ruling R-12.2-B):** Logical names in handoffs are documentation only. The system strictly maps to the existing physical table `penalty_ledger` and the amount column `delta`.
11. **Ledger `delta` semantics:** `delta` is a strictly positive Decimal(5,2) magnitude. The sign (+/-) is derived entirely from `entry_type`. Balance settlement logic must never read the `reason` column.
12. **Ruling R-12.2-C / BR-1 Remediation:**
   - **INV-2 Enforcement:** A database-level PL/pgSQL function and trigger (`enforce_append_only`) physically prevents `UPDATE`, `DELETE`, and `TRUNCATE` operations on `penalty_ledger`. This is deployed out-of-band (BR-1).
   - **Schema Identifiers:** `reversal_of_id` must use the `uuid` data type (matching `penalty_ledger.id`).
   - **Naming Convention:** `snake_case` strictly applied for all new database columns, constraints, and index names. Prisma fields use `camelCase` mapped via `@map`. Enums use `UPPER_CASE`.
   - **Advisory Locks:** Any typed ledger writes that reduce or reverse balances (e.g., `FULFILLMENT`, `WAIVER`, `REVERSAL`) MUST acquire a transaction-scoped advisory lock serialized by `pool_id` and `user_id`.
13. **Ledger-bearing deletion:** Pools and memberships carrying a ledger are never hard-deleted (archive/soft-delete only).
14. **Season ≡ Pool:** No duplicate `Season` table is created. All Phase 12 references to `seasonId` / `leagueId` map to `pool_id`.
15. **Deny-by-Default Data API:** Every Phase 12 table ships deny-by-default to Data API roles.
16. **Money Input Parsing:** Ledger money input is parsed by one strict shared parser; `parseInt`, `parseFloat`, and `Number` are never used.
17. **Evidence Reporting Standard:** Every evidence report must state the host class, database, current_user, and server version.
18. **Disposable Rehearsal DB:** All destructive work occurs on a disposable rehearsal database first. Hosted environments receive `migrate deploy` only.
19. **Signed Legacy Assessment:** Legacy ASSESSMENT rows may carry a signed delta, but typed rows moving forward are always positive.
20. **Pool-Scoped Authority:** Authority is derived from `pools.admin_id` and a pool-scoped co-commissioner membership flag; global Roles are never used to authorize pool-specific operations.
21. **Authorization Defect Fixes:** BR-5 authorization fixes are code-only and strictly precede any new commissioner endpoints.
22. **Decimal-Only Money Math:** Money splitting is Decimal-only; the ledger never receives `delta = 0`. Characterization tests are required before changes.
23. **Invariant Evidence Status:** Every invariant carries an evidence status; Phase 12 acceptance may not assume more than the register states.
24. **Idempotent Period-Close:** Idempotent period-close is enforced via a DB-enforced claim in the same transaction.
25. **Acceptance Tests Assert Behavior:** Acceptance tests assert behavior (SQLSTATE, row state), never message text.
26. **Guarded Read Routes:** Read routes are guarded exactly like write routes (uuid -> pool exists -> commissioner or ACTIVE member); guards change access, never payloads.
27. **Period-Close Preconditions:** Period-close preconditions are evaluated from authoritative state; empty sets fail closed; no bypass flag.

### BR-4b Idempotency Design
- A new table `weekly_wrapups` serves as a claim table to enforce idempotency during period-close.
- A unique index on `penalty_ledger` was **REJECTED** because it would break the REVERSAL + new ASSESSMENT correction flow.
- Consequences:
  1. Concurrent wrap-ups block on the primary key, avoiding duplicate writes.
  2. The claim occurs as the first statement in the transaction.
  3. `skipDuplicates: true` returns a count of 0 on duplicates, translating to a `409 ALREADY_WRAPPED_UP` without throwing an unhandled Prisma constraint error.
- **SQL Implementation:**
```sql
CREATE TABLE weekly_wrapups (
  pool_id      uuid          NOT NULL,
  week_number  integer       NOT NULL,
  created_at   timestamp(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number),
  CONSTRAINT weekly_wrapups_pool_id_fkey FOREIGN KEY (pool_id)
    REFERENCES pools(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO weekly_wrapups (pool_id, week_number)
SELECT DISTINCT pool_id, week_number
FROM penalty_ledger
WHERE reason = 'WEEKLY_DEAD_PLACE' AND week_number IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE FUNCTION weekly_wrapups_prevent_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only violation: % on weekly_wrapups is not permitted (INV-2)', TG_OP;
END; $$;

CREATE TRIGGER weekly_wrapups_no_update_delete
  BEFORE UPDATE OR DELETE ON weekly_wrapups
  FOR EACH ROW EXECUTE FUNCTION weekly_wrapups_prevent_mutation();
CREATE TRIGGER weekly_wrapups_no_truncate
  BEFORE TRUNCATE ON weekly_wrapups
  FOR EACH STATEMENT EXECUTE FUNCTION weekly_wrapups_prevent_mutation();

REVOKE ALL ON FUNCTION weekly_wrapups_prevent_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE weekly_wrapups FROM anon, authenticated;
ALTER TABLE weekly_wrapups ENABLE ROW LEVEL SECURITY;
```

### Ruling R-12.2-E Errata & Updates
- **Environment Naming:** "postgres" is a DB name, not an environment; `postgres.<project-ref>` indicates a hosted pooler connection.
- **BR-1 Test 6 Finding:** Test 6 caught a `23503` (FK violation), not the append-only `P0001` error.
- **INV-1 Validation:** DB-level `numeric(5,2)` exactly verified against the Supabase hosted pooler environment.
- **INV-8 Validation:** Unverified locally; policies in `storage.objects` are missing.
- **BR-3 Classification:** The server.ts manual adjustment flaw is officially classified as an INV-1 defect (silent truncation, garbage-prefix acceptance). Acceptance of zero/negative violates R-12.2-B but is not strictly an INV-1 violation.
- **Phase 12 Conventions:**
  - IDs are `uuid` (`id String @id @default(uuid()) @db.Uuid`).
  - Foreign keys use `RESTRICT/RESTRICT` to pools, users, and memberships.
  - Timestamps use `timestamp(3)` in UTC.
  - API routes use `/api/pools/:pool_id/...`.
- **Physical Reconciliation Map Dispositions:**
  - *Approved:* `leagueId/seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
  - *Approved for 12.1:* `inbox_messages`, `outbox_events`, `notification_preferences`, `job_runs`.
  - *Provisional:* `season_state` enum, `MemberSeasonStatus`, `rolled_over_from_pool_id`, `game_result_overrides`, `scoring_runs`, `season_seals`.
  - *Rejected/Held:* `COMMISSIONER` role duplicate rejected; `audit_logs` reuse held; `CO_COMMISSIONER` held; `games` scoping held.

### Ruling R-12.2-F Errata & Updates
- **Hosted Environment Rule:** The target database is a hosted Supabase project, NOT a local database. The previous "Local PostgreSQL" documentation was incorrect.
- **BR-1 Test 6 Finding:** The query `DELETE FROM pools` correctly triggered a `23503` cascade failure constraint.
- **INV-1 Validation Verification:** Verified against the hosted Supabase environment.
- **INV-8 Status:** Unverified in the hosted environment.
- **Role Extension:** The `Role` extension for `CO_COMMISSIONER` is officially REJECTED.
- **BR-3 Classification Amendment:** The defect is classified as an INV-1 flaw (truncation, garbage acceptance). Negative adjustments are acknowledged as a legitimate feature ("Pardon") and are not violations.
- **Migration B/C Alteration:** 
  - Migration B is `penalty_ledger_typed_delta_positive` to allow legacy rows to remain signed.
  - Migration C uses `abs(target.delta)` and enforces a `week_number` match.
- **S-1 Exposure Finding:** Data API exposure detected on all 12 public tables (including `picks` and `weekly_submissions`), pending BR-2c execution.
- **S-2 Authorization Finding:** S-2 authorization gap currently under investigation.

### Ruling R-12.2-G Errata & Updates
- **Environment Naming & Classification:** The hosted environment is provisionally classified as SHARED-DEV until the owner confirms no real participant data exists. The earlier statement "Local PostgreSQL" was incorrect.
- **BR-1 Deviations:** BR-1 was applied to hosted via `prisma migrate dev` instead of `deploy`. Installed function names (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) deviate from the committed `enforce_append_only` spec.
- **Credential Exposure:** `users.password_hash` is credential material that remains exposed to the Data API until BR-2c executes.
- **INV-8 Re-baseline:** INV-8's storage half is not implemented at runtime.
- **Sequence:** BR-0 -> BR-1 acceptance -> BR-2b -> BR-2c -> hosted 12.1 migrations. BR-3a, BR-4, and BR-5 run in parallel with BR-0. 12.1 development unblocked on rehearsal DB after BR-0 and BR-5 helper are merged.
- **S-2 & Wrap-up Findings:** S-2 is confirmed (cross-pool admin gap). Wrap-up uses float arithmetic (`Number((...).toFixed(2))`) and lacks idempotency guards (duplicate wrap-ups create duplicate rows).

### Ruling R-12.2-H Errata & Updates
- **BR-1 Acceptance Rules:** Criterion (c) is withdrawn. The installed function names and message wording are accepted.
- **S-4 Finding (Member-Facing Routes):** Member-facing read routes were exposed cross-pool without proper active membership checks. This is resolved by extending `requirePoolMember` to all read endpoints.

### Ruling R-12.2-I Errata & Updates
- **FINAL-games Precondition:** Guard uses the shared exclusion resolver, the fallback does not feed the guard, empty sets fail closed.
- **Stuck-game Limitation:** A postponed or cancelled game blocks that week's wrap-up until 12.2 overrides.

### Ledger Effect Formula & Reversal Constraints
`Outstanding = Σ effect(e)` where:
- `ASSESSMENT` = `+delta` (delta may be signed for legacy rows)
- `OPENING_BALANCE` = `+delta`
- `FULFILLMENT` = `-delta`
- `WAIVER` = `-delta`
- `REVERSAL` = `-effect(target)`
- **Constraints:** Double reversal is rejected (unique `reversal_of_id`); reversal-of-reversal is rejected; target must match user/season/amount. Over-fulfillment or over-waiver that drops `Outstanding` below 0 is rejected with an explicit error.

### Read-Path Audit Gate & LEDGER_TYPED_WRITES Flag
Before enabling `LEDGER_TYPED_WRITES`, a read-path parity test must pass. Every query/service/UI selector aggregating ledger amounts must route through a shared `ledgerEffect` helper (in TS and equivalent SQL view). The parity test must prove `old totals == helper totals` exactly to the cent for all pre-existing rows.

---

## Phase 12 Pre-Flight Audit & BR-1 Execution Record
- **BR-1 Status:** Immutability trigger successfully deployed to the hosted environment. *Acceptance is PENDING local fixture testing on a rehearsal database and alignment with the committed function names.*
- **G1 Precision Check:** Verified that `delta` is physically typed as `numeric(5,2)` in the hosted PostgreSQL catalog.
- **BR-2 API Baseline (G3-G4):** Pre-Flight G4 confirmed that all public tables currently lack RLS and have full CRUD grants for `anon` and `authenticated` roles, setting the baseline for the pending BR-2 lockdown.

## Invariant Status Register

- **INV-1 Precision:** Every per-entry penalty amount is stored as Decimal(5,2). No floating point anywhere. Use Prisma.Decimal/decimal.js for arithmetic. API DTOs carry amounts as fixed 2-decimal strings (e.g. "2.50"). Exact split-penalty math is unchanged. *(Evidence: DB numeric(5,2) verified hosted dev. App violated in wrap-up float & adjust parseInt; remediation BR-4/BR-3a).*
- **INV-2 Immutable Ledger:** The penalty ledger is append-only. UPDATE and DELETE are prohibited (DB trigger + tests). Corrections are compensating entries only. *(Evidence: INSTALLED, acceptance conditional on definitions).*
- **INV-3 Snapshot Rule:** Client-side presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate strictly in client memory with ZERO uncommitted server writes. Phase 12 adds no server persistence of preset or draft-pick state. *(Evidence: Unverified in Phase 12 pre-work).*
- **INV-4 Matrix Anti-Peeking:** Square Sheet Matrix dual-mode visibility is preserved: strict lockout mode, and open-slate mode guarded by pick finalization. NO Phase 12 endpoint, notification payload, audit record, dry-run diff, recap text, or export may reveal any pick that is not yet visible under the active mode's rules. *(Evidence: VIOLATED at API layer (S-4, confirmed) until BR-5 merges; DB exposure open (S-1) until BR-2c).*
- **INV-5 Fallback & Lockout Logic:** Granular rolling vs. global game lockouts, excluded game windows (e.g. skipped Thursday night points), and the decoupled 3-tier sync/scoring fallback are unchanged. Lock state is derived server-side from the stored kickoff timestamp only. Sync outages, overrides, and corrections can never unlock or extend a lock. *(Evidence: Not audited; regression suite is evidence).*
- **INV-6 Non-Blocking Outbound:** Outbound network actions are non-blocking. Database transactions never roll back due to external transport failure. *(Evidence: N/A until 12.1).*
- **INV-7 Anti-Bloat:** No live weather, no sports-betting odds, no Twilio/SMS, no payment processors, no brittle third-party APIs. *(Evidence: Partial. No Data API consumers in client/src; whole-repo audit pending).*
- **INV-8 Shot-Cam:** Supabase Storage RLS for the Shot-Cam verification portal is unchanged. *(Evidence: NOT IMPLEMENTED at runtime; metadata endpoints only).*
- **R-12.2-I guard:** IMPLEMENTED, UNVERIFIED pending rehearsal tests.
- **R-12.2-Y:** applied_by root cause identified as test-made table in wrapUpConcurrency. False DDL-grep finding noted. App runs locally.
- **R-12.2-Z:** stale-submission finding noted. R-12.2-Y re-issued.
- **R-12.2-AA:** S-6 triggered (admin picks routes cross-pool). Decision #49 implemented. /api/admin/users accepted as platform-level. Migration count corrected to 8.
- **R-12.2-AB:** BR-5b not accepted (uncommitted). Decisions #50-#51 applied. Docs-base verdict withdrawn. Default-creation deviation recorded.
- **R-12.2-AC:** Decision #52 applied (claim code fails closed). S-7 global admin override removed from Shot-Cam routes. 00e89dd deviation recorded.
- **R-12.2-AD:** Decisions #53-#54 applied. S-7 reclassified. S-8 write-on-GET removed. Commit-hygiene deviation recorded. Decisions #28-#54 registered.
- **R-12.2-AE:** Decision #55 applied. S-7 reversal confirmed. S-8 explicit pool_id guarded. Claim step fail-closed fixed. Wrap-up game-set deviation recorded.
- **R-12.2-AE-V2:** Ruling BLOCKED. BR-4b migration-branch test failure documented. Decisions #53, #54, and #55 reconciled.
- **R-12.2-AE-V3:** Ruling BLOCKED solely on Git finalization. BR-4b 7/7 and S-8 passed. Git tree cleaned and raw prisma generate output captured.
- **R-12.2-AE-V4:** Ruling BLOCKED solely on Git finalization. BR-4b 7/7, S-8, Decision #52, and Decision #54/#55 verification passed. Git tree cleaned prior to evidence generation.
- **R-12.2-AE-V4 was recorded BLOCKED in the register and later APPROVED by the Fallback; the Arbiter ratifies gates individually.**

---

## Phase 12 Decision Register (Appendix A)

1. **Decision #1:** Numeric precision Decimal(5,2) standardized for all penalty ledger entries and calculations (INV-1).
2. **Decision #2:** Immutable penalty ledger enforced via database-level append-only triggers (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) (INV-2).
3. **Decision #3:** Elimination of floating-point arithmetic in scoring and wrap-up services; use `Prisma.Decimal` and `decimal.js`.
4. **Decision #4:** Client presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate purely in memory with zero server persistence (INV-3).
5. **Decision #5:** Square Sheet Matrix dual-mode anti-peeking visibility enforcement (INV-4).
6. **Decision #6:** Granular rolling vs global game lockout derived exclusively from stored kickoff timestamps (INV-5).
7. **Decision #7:** Support for excluded game windows (e.g. skipped Thursday night games) in scoring and wrap-up.
8. **Decision #8:** Decoupled 3-tier sync/scoring fallback architecture preserving local DB as source of truth.
9. **Decision #9:** Non-blocking outbound network actions with database transactions insulated against external transport failures (INV-6).
10. **Decision #10:** Anti-bloat principle (INV-7): prohibition of live odds, weather APIs, Twilio/SMS, payment processors, and third-party bloat.
11. **Decision #11:** Shot-Cam storage verification portal metadata endpoints and owner verification model (INV-8).
12. **Decision #12:** Role enum strictly limited to `ADMIN` and `USER`; rejection of `COMMISSIONER` or `CO_COMMISSIONER` role additions.
13. **Decision #13:** Explicit pool scoping via `/api/pools/:pool_id/...` across all pool-specific endpoints.
14. **Decision #14:** Foreign key constraints enforce `RESTRICT` on pools, users, and memberships.
15. **Decision #15:** Primary keys standardized to UUID (`id String @id @default(uuid()) @db.Uuid`) across relational models.
16. **Decision #16:** Timestamps standardized to `timestamp(3)` in UTC across all models.
17. **Decision #17:** Physical reconciliation mapping: `leagueId`/`seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
18. **Decision #18:** Migration naming and sequencing standardization for Phase 12.
19. **Decision #19:** Ledger effect formula: `Outstanding = Σ effect(e)` where assessments/opening balances are `+delta`, fulfillments/waivers are `-delta`, reversals are `-effect(target)`.
20. **Decision #20:** Removal of global ADMIN bypass on pool-scoped routes (`requirePoolMember` and `requirePoolCommissioner`).
21. **Decision #21:** Reversal constraints: target must match user/season/amount; unique `reversal_of_id`; rejection of double reversals.
22. **Decision #22:** Read-path audit parity test required before enabling `LEDGER_TYPED_WRITES`.
23. **Decision #23:** BR-1 immutability triggers installed on `penalty_ledger` (`BEFORE DELETE OR UPDATE` and `BEFORE TRUNCATE`).
24. **Decision #24:** Rejection of table mutation on `weekly_wrapups` via `weekly_wrapups_prevent_mutation()` trigger.
25. **Decision #25:** Hosted Supabase database environment classified as SHARED-DEV with write freeze.
26. **Decision #26:** BR-2b/BR-2c Row-Level Security and Data API lockdown across public tables.
27. **Decision #27:** Direct anon/authenticated access revoked from `users.password_hash` and sensitive tables.
28. **Decision #28:** Local rehearsal database environment isolation (`pickem_rehearsal` on `localhost:5432`).
29. **Decision #29:** `assertDisposableDatabase()` safeguard preventing test execution against hosted database.
30. **Decision #30:** Separation of `.env` (rehearsal) and `.env.hosted` (hosted pooler).
31. **Decision #31:** Guarded drop of rehearsal schema on hosted database.
32. **Decision #32:** Permanent `.env` flip to local rehearsal and Vitest global setup assertions.
33. **Decision #33:** CI documentation append-only guard enforcing strictly 0 deletions against baseline `e41ce72`.
34. **Decision #34:** `db:reset` script standardizing rehearsal recreation with `app.disposable=true` sentinel.
35. **Decision #35:** Rehearsal database provisioning with `anon`, `authenticated`, and `service_role` roles.
36. **Decision #36:** Migration catalog checksum verification across all 8 migration files.
37. **Decision #37:** Negative control verification using isolated worktrees (`.worktree-ctl`).
38. **Decision #38:** Prohibition of test-created tables in production/rehearsal migrations.
39. **Decision #39:** Git diff allowlist check enforcing bounded PR modifications.
40. **Decision #40:** DDL grep negative control verifying zero DDL or SET statements in application codebase.
41. **Decision #41:** BR-2 pre-check, post-check, and rollback script provisioning for hosted migration.
42. **Decision #42:** Verification of SQLSTATE 42501 permission denial for anon and authenticated roles.
43. **Decision #43:** Elimination of float arithmetic in weekly wrap-up calculations.
44. **Decision #44:** Tiebreaker distance calculation using absolute score difference.
45. **Decision #45:** Split-penalty rounding and remainder distribution logic preservation.
46. **Decision #46:** Weekly wrap-up game-set resolution via shared scoring exclusion resolver.
47. **Decision #47:** Strict fail-closed wrap-up precondition if non-excluded games are pending or absent.
48. **Decision #48:** CI check for migration file checksums against `_prisma_migrations`.
49. **Decision #49:** CI route scan enforcing parameter scoping and guard middleware on all routes.
50. **Decision #50:** `GET /api/admin/users` allowlisted as platform-level admin endpoint.
51. **Decision #51:** Admin picks routes scoped with `requirePoolCommissioner` (`from: 'query'` / `from: 'body'`).
52. **Decision #52:** Weekly wrap-up claim step fails closed (`CLAIM_STORE_UNAVAILABLE`) if `weekly_wrapups` table is absent.
53. **Decision #53:** Agents never push, force-push or change remotes.
54. **Decision #54:** GET handlers perform no writes.
55. **Decision #55:** A guard is never bypassed by a conditional when its dependency is missing.
56. **Decision #56:** Rulings are stored verbatim under docs/rulings/. The Decision Register in ARCHITECTURE.md is a byte-for-byte copy of docs/rulings/appendix-a.md, and CI diffs the two.

---

## Phase 12 Decision Register (supersedes the register at ARCHITECTURE.md lines 498-548)

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

V4: APPROVED by Fallback; RATIFIED IN PART by the Arbiter.

R-12.2-AG: Register ratified. Hosted tripwire re-run. Authoritative register is located at 'Phase 12 Decision Register (supersedes...)'.

R-12.2-AH: Milestone 12.1 CONDITIONAL START; hosted tripwire & evidence repair cycle.

R-12.2-AH-V2: Hosted tripwire query streaming corrected. S-7/S-8 explicit console assertions logged. Pre-run porcelain check enforced.

R-12.2-AH-V2: Evidence gate cleared. Hosted tripwire now provides raw hosted identity, all 11 required table counts, migration state, trigger state, and rls_on 12/12; localhost inverse controls fail closed. S-7/S-8 required invariant and byte-equality assertions are explicitly logged. Pre-generation workspace hygiene is directly evidenced as clean. Milestone 12.1 remains CONDITIONAL START on feat/phase12-1-outbox; hosted DDL and merges to main remain blocked pending separate implementation gates.

R-12.2-AI: Step 1 (Core Schema & Migration) implemented on rehearsal DB. Revoke/RLS applied.

R-12.2-AJ: I-1/I-2 CLOSED; 12.1 step A accepted with amendment. Authoritative register pointer updated.










````


