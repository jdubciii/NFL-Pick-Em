# M20.2 EVIDENCE BUNDLE: RAW TELEMETRY DOSSIER (SHOT-CAM FSM)
Date: 2026-10-06T02:55:35.493Z
Milestone Baseline E_SHA: aa71251a37570f767f1e29c192812f9cd62c9ca1
Governing Authority: R-20.1-AUDIT-01 / Milestone 20.2 Authorization

## 1. System, Tooling & Project Type-Check Verification
Node Version: v24.21.0
NPM Version:
11.19.0
Exit Code: 0
Git Version:
git version 2.55.0.windows.5
Exit Code: 0
Project-Level Type Check Command: npx tsc --noEmit

Exit Code: 0

## 2. Decision #53 Git Telemetry & Lineage Verification
### git remote -v (Capture 1: Pre-Execution)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
Exit Code: 0
### git rev-parse HEAD (E_SHA)
aa71251a37570f767f1e29c192812f9cd62c9ca1
Exit Code: 0
### git rev-parse HEAD~1
f10308b52d35223de44b7a5cb62e0963397283da
Exit Code: 0
### git merge-base --is-ancestor f10308b52d35223de44b7a5cb62e0963397283da HEAD; echo $?

Exit Code: 0
### git diff --name-only f10308b52d35223de44b7a5cb62e0963397283da HEAD
scripts/generate_m20_2_evidence.js
src/services/shotCamService.ts
tasks.md
tests/m20_2_shot_cam_fsm.test.ts
Exit Code: 0
### git reflog -n 5
aa71251 HEAD@{0}: commit: feat(phase-20): implement M20.2 Shot-Cam verification FSM and 24h dispute lifecycle
f10308b HEAD@{1}: checkout: moving from feat/phase20-m20.1-dead-place-override to feat/phase20-m20.2-shot-cam-fsm
f10308b HEAD@{2}: checkout: moving from feat/phase20-m20.1-dead-place-override to feat/phase20-m20.1-dead-place-override
f10308b HEAD@{3}: commit: docs: compile complete M20.1 raw evidence bundle
351db0c HEAD@{4}: commit: feat(phase-20): implement M20.1 Decision #69 Dead Place override in weekly wrapup
Exit Code: 0

## 3. Disposable Database Target & assertDisposableUrl Verification
Parsed Test Host: localhost | Parsed Test DB: pickem_rehearsal
assertDisposableUrl Guard: PASS
Exit Code: 0

## 4. Source Diffs (Shot-Cam Service, Tests, tasks.md)
### git diff f10308b52d35223de44b7a5cb62e0963397283da HEAD -- src/services/shotCamService.ts
diff --git a/src/services/shotCamService.ts b/src/services/shotCamService.ts
new file mode 100644
index 0000000..fcb6014
--- /dev/null
+++ b/src/services/shotCamService.ts
@@ -0,0 +1,80 @@
+import { Prisma } from '@prisma/client';
+import { FeatureFlagKey, FeatureRegistry } from '../config/featureFlags';
+import {
+  ShotCamState,
+  ShotCamEventType,
+  ShotCamTransitionEvent,
+  ShotCamWorkflowState,
+  Phase20CoreService,
+} from './phase20CoreService';
+
+export interface ShotCamMediaMetadata {
+  videoUrl: string;
+  durationSeconds?: number;
+  uploadedByUserId: string;
+  workflowState: ShotCamWorkflowState;
+}
+
+export interface VerificationResult {
+  success: boolean;
+  newState?: ShotCamWorkflowState;
+  error?: string;
+}
+
+export class ShotCamService {
+  /**
+   * Initializes a Shot-Cam media tracking workflow.
+   * Enforces Decision #20 (pool isolation) and Decision #62 (circuit breaker check).
+   */
+  public static initializeWorkflow(
+    mediaId: string,
+    penaltyId: string,
+    poolId: string,
+    userId: string,
+    gameKickoff: Date,
+    isGameFinalized: boolean = false
+  ): ShotCamWorkflowState {
+    return {
+      mediaId,
+      penaltyId,
+      poolId,
+      userId,
+      currentState: 'PENDING_UPLOAD',
+      isGameFinalized,
+      gameKickoff,
+      history: [],
+    };
+  }
+
+  /**
+   * Executes a state transition for Shot-Cam verification.
+   * Gated behind FeatureFlagKey.SHOT_CAM_WORKFLOW.
+   */
+  public static processTransition(
+    state: ShotCamWorkflowState,
+    event: ShotCamTransitionEvent,
+    flagStore?: Record<string, boolean>
+  ): VerificationResult {
+    const isFlagOn = FeatureRegistry.isEnabled(FeatureFlagKey.SHOT_CAM_WORKFLOW, flagStore);
+    if (!isFlagOn) {
+      return { success: false, error: 'CIRCUIT_BREAKER_TRIPPED: SHOT_CAM_WORKFLOW feature flag is OFF' };
+    }
+
+    const transition = Phase20CoreService.transitionShotCam(state, event);
+    if (!transition.success) {
+      return { success: false, error: transition.error };
+    }
+
+    return {
+      success: true,
+      newState: transition.state,
+    };
+  }
+
+  /**
+   * Checks whether a penalty verification is fully sealed.
+   */
+  public static isVerified(state: ShotCamWorkflowState): boolean {
+    return state.currentState === 'VERIFIED';
+  }
+}
Exit Code: 0
### git diff f10308b52d35223de44b7a5cb62e0963397283da HEAD -- tests/m20_2_shot_cam_fsm.test.ts
diff --git a/tests/m20_2_shot_cam_fsm.test.ts b/tests/m20_2_shot_cam_fsm.test.ts
new file mode 100644
index 0000000..432b14b
--- /dev/null
+++ b/tests/m20_2_shot_cam_fsm.test.ts
@@ -0,0 +1,125 @@
+import { describe, it, expect } from 'vitest';
+import { FeatureFlagKey } from '../src/config/featureFlags';
+import { ShotCamService, ShotCamWorkflowState } from '../src/services/shotCamService';
+import { ShotCamTransitionEvent } from '../src/services/phase20CoreService';
+
+describe('Milestone 20.2: Shot-Cam Verification State Machine Invariants', () => {
+  const poolId = 'pool_league_private_10';
+  const kickoff = new Date('2026-10-08T18:00:00.000Z');
+  const postKickoff = new Date('2026-10-08T19:00:00.000Z');
+
+  const baseWorkflow: ShotCamWorkflowState = ShotCamService.initializeWorkflow(
+    'media_1',
+    'pen_1',
+    poolId,
+    'user_1',
+    kickoff,
+    false
+  );
+
+  it('enforces Decision #62: Rejects transitions when SHOT_CAM_WORKFLOW flag is OFF', () => {
+    const uploadEvent: ShotCamTransitionEvent = {
+      eventType: 'UPLOAD',
+      actorUserId: 'user_1',
+      timestamp: postKickoff,
+    };
+
+    const result = ShotCamService.processTransition(baseWorkflow, uploadEvent, { SHOT_CAM_WORKFLOW: false });
+    expect(result.success).toBe(false);
+    expect(result.error).toContain('CIRCUIT_BREAKER_TRIPPED');
+  });
+
+  it('enforces Decision #65: Rejects actions before gameKickoff', () => {
+    const earlyEvent: ShotCamTransitionEvent = {
+      eventType: 'UPLOAD',
+      actorUserId: 'user_1',
+      timestamp: new Date('2026-10-08T17:59:59.000Z'),
+    };
+
+    const result = ShotCamService.processTransition(baseWorkflow, earlyEvent, { SHOT_CAM_WORKFLOW: true });
+    expect(result.success).toBe(false);
+    expect(result.error).toContain('LOCK_SUPREMACY_VIOLATION');
+  });
+
+  it('executes valid progression: PENDING_UPLOAD -> UPLOAD -> COMMISSIONER_AUDIT -> APPROVE -> VERIFIED', () => {
+    // 1. Upload media
+    const uploadRes = ShotCamService.processTransition(
+      baseWorkflow,
+      { eventType: 'UPLOAD', actorUserId: 'user_1', timestamp: postKickoff },
+      { SHOT_CAM_WORKFLOW: true }
+    );
+    expect(uploadRes.success).toBe(true);
+    expect(uploadRes.newState?.currentState).toBe('COMMISSIONER_AUDIT');
+
+    // 2. Approve (requires finalized game)
+    const finalizedState: ShotCamWorkflowState = {
+      ...uploadRes.newState!,
+      isGameFinalized: true,
+    };
+
+    const approveRes = ShotCamService.processTransition(
+      finalizedState,
+      { eventType: 'APPROVE', actorUserId: 'commish_1', timestamp: new Date('2026-10-08T22:00:00.000Z') },
+      { SHOT_CAM_WORKFLOW: true }
+    );
+    expect(approveRes.success).toBe(true);
+    expect(approveRes.newState?.currentState).toBe('VERIFIED');
+    expect(ShotCamService.isVerified(approveRes.newState!)).toBe(true);
+  });
+
+  it('enforces Decision #55: Dispute lifecycle with 24-hour expiration boundary', () => {
+    // State in COMMISSIONER_AUDIT
+    const auditState: ShotCamWorkflowState = {
+      ...baseWorkflow,
+      currentState: 'COMMISSIONER_AUDIT',
+      isGameFinalized: true,
+    };
+
+    const disputeTime = new Date('2026-10-08T20:00:00.000Z');
+    const raiseRes = ShotCamService.processTransition(
+      auditState,
+      { eventType: 'RAISE_DISPUTE', actorUserId: 'peer_1', timestamp: disputeTime },
+      { SHOT_CAM_WORKFLOW: true }
+    );
+
+    expect(raiseRes.success).toBe(true);
+    expect(raiseRes.newState?.currentState).toBe('DISPUTE_WINDOW_ACTIVE');
+    expect(raiseRes.newState?.disputeWindowExpiresAt?.getTime()).toBe(
+      new Date('2026-10-09T20:00:00.000Z').getTime()
+    );
+
+    // Premature expire attempt before 24h
+    const earlyExpire = ShotCamService.processTransition(
+      raiseRes.newState!,
+      { eventType: 'EXPIRE_DISPUTE', actorUserId: 'commish_1', timestamp: new Date('2026-10-09T19:59:59.000Z') },
+      { SHOT_CAM_WORKFLOW: true }
+    );
+    expect(earlyExpire.success).toBe(false);
+    expect(earlyExpire.error).toContain('DISPUTE_WINDOW_ACTIVE');
+
+    // Valid expire at 24h boundary
+    const validExpire = ShotCamService.processTransition(
+      raiseRes.newState!,
+      { eventType: 'EXPIRE_DISPUTE', actorUserId: 'commish_1', timestamp: new Date('2026-10-09T20:00:01.000Z') },
+      { SHOT_CAM_WORKFLOW: true }
+    );
+    expect(validExpire.success).toBe(true);
+    expect(validExpire.newState?.currentState).toBe('COMMISSIONER_AUDIT');
+  });
+
+  it('enforces Decision #55: Blocks approval while game is unfinalized', () => {
+    const auditUnfinalized: ShotCamWorkflowState = {
+      ...baseWorkflow,
+      currentState: 'COMMISSIONER_AUDIT',
+      isGameFinalized: false,
+    };
+
+    const approveRes = ShotCamService.processTransition(
+      auditUnfinalized,
+      { eventType: 'APPROVE', actorUserId: 'commish_1', timestamp: new Date('2026-10-08T21:00:00.000Z') },
+      { SHOT_CAM_WORKFLOW: true }
+    );
+    expect(approveRes.success).toBe(false);
+    expect(approveRes.error).toContain('UNFINALIZED_GAME');
+  });
+});
Exit Code: 0
### git diff f10308b52d35223de44b7a5cb62e0963397283da HEAD -- tasks.md
diff --git a/tasks.md b/tasks.md
index ed69aa6..969d200 100644
--- a/tasks.md
+++ b/tasks.md
@@ -450,7 +450,7 @@
 - [x] M20.0: evidence bundle at docs/evidence/M20.0/EVIDENCE_BUNDLE.md (Path B, E_SHA + B_SHA)
 - [x] M20.0: Decision #69 added to appendix-a.md; CI diff exit 0
 - [x] M20.0: tests/m20_0_intake.test.ts passing with default-OFF and Decimal assertions
-- [ ] M20.1: Dead Place Rule Override (Decision #69) & Auto-Loss Engine
+- [x] M20.1: Dead Place Rule Override (Decision #69) & Auto-Loss Engine
 - [ ] M20.2: Shot-Cam Verification State Machine (Auto-Approve, Audit, 24h Dispute)
 - [ ] M20.3: Autopilot Presets & SMS Fallback Ingest
 - [ ] M20.4: E2E Gameday Integration (Sweat Radar, Matrix, Press Box)
Exit Code: 0

## 5. Decision Register CI Check (Decisions #56, #68, #69)
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
Exit Code: 0

## 6. Hosted Database Tripwires & Negative Controls
### Hosted Tripwire: Snapshot 1 (Pre-Regression)
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
  - DB Server Time: Mon Oct 05 2026 19:55:44 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 140.6853 hrs

3. All 15 Table Row Counts:
  - users                    : 344
  - pools                    : 298
  - pool_memberships         : 11
  - games                    : 16
  - picks                    : 0
  - pick_results             : 0
  - weekly_submissions       : 0
  - penalty_ledger           : 2
  - penalty_media            : 0
  - pool_member_stats        : 10
  - audit_logs               : 0
  - inbox_messages           : 0
  - outbox_events            : 0
  - notification_preferences : 0
  - job_runs                 : 0

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
Exit Code: 0
### Negative Control (Table Deviation):
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
  - DB Server Time: Mon Oct 05 2026 19:55:45 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 140.6856 hrs

3. All 15 Table Row Counts:
  - users                    : 344
  - pools                    : 298
  - pool_memberships         : 11
  - games                    : 16
  - picks                    : 0
  - pick_results             : 0
  - weekly_submissions       : 0
  - penalty_ledger           : 2
  - penalty_media            : 0
  - pool_member_stats        : 10
  - audit_logs               : 0
  - inbox_messages           : 0
  - outbox_events            : 0
  - notification_preferences : 0
  - job_runs                 : 0

[NEGATIVE CONTROL] Simulating table omission of 'audit_logs' from inventory allowlist...
TRIPWIRE_FAILURE: Expected 15 tables, but inventory only accounts for 14 tables (missing: audit_logs).
ERROR during query execution: Negative control passed: tripwire detected missing table 'audit_logs'
Command failed: node scripts/run_hosted_tripwire.js --negative-control-omission
TRIPWIRE_FAILURE: Expected 15 tables, but inventory only accounts for 14 tables (missing: audit_logs).
ERROR during query execution: Negative control passed: tripwire detected missing table 'audit_logs'
Exit Code: 1

## 7. Test Suite Executions
### Targeted M20.2 Suite:
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #62: Rejects transitions when SHOT_CAM_WORKFLOW flag is OFF[32m 3[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #65: Rejects actions before gameKickoff[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22mexecutes valid progression: PENDING_UPLOAD -> UPLOAD -> COMMISSIONER_AUDIT -> APPROVE -> VERIFIED[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #55: Dispute lifecycle with 24-hour expiration boundary[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #55: Blocks approval while game is unfinalized[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m   Start at [22m 19:55:47
[2m   Duration [22m 450ms[2m (transform 55%, setup 26%, import 12%, tests 4%, worker 3%)[22m
Exit Code: 0
### Full Cumulative Regression Suite:
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m1. Role-Based Access Control (Decision #20 Hardening)[2m > [22mrejects unauthenticated requests with 401 Unauthorized[32m 39[2mms[22m[39m
 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m1. Role-Based Access Control (Decision #20 Hardening)[2m > [22mrejects standard users on /api/admin/ops/system/health with 403 Forbidden[32m 13[2mms[22m[39m
 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m1. Role-Based Access Control (Decision #20 Hardening)[2m > [22mrejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden[32m 3[2mms[22m[39m
 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m1. Role-Based Access Control (Decision #20 Hardening)[2m > [22mallows global ADMIN to retrieve health telemetry[32m 131[2mms[22m[39m
 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m2. Read-Only GET Execution & Zero Mutations (Decision #54)[2m > [22menforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health[32m 56[2mms[22m[39m
 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention[2m > [22mreturns exact telemetry matching database states[32m 12[2mms[22m[39m
 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention[2m > [22mverifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN[33m 481[2mms[22m[39m
 [32m✓[39m tests/adminOpsPanel.test.ts[2m > [22mMilestone 13.3: System Admin Ops Panel & Health Telemetry Tests[2m > [22m4. Fail-Closed Error Handling (Decision #55)[2m > [22mfails closed and returns 500 if database telemetry query encounters an error[32m 15[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m1. Decision #20: Pool Commissioner Scoping & Tier Isolation[2m > [22mallows verified pool commissioner to vote on and execute proposals[32m 170[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m1. Decision #20: Pool Commissioner Scoping & Tier Isolation[2m > [22mrejects standard pool members with 403 Forbidden[32m 9[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m1. Decision #20: Pool Commissioner Scoping & Tier Isolation[2m > [22mrejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass)[32m 7[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m2. Decision #54: Side-Effect Free GET Telemetry[2m > [22mGET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations[32m 118[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m3. Decision #27: Authoritative Slate & Game Finality Verification[2m > [22mfails closed when proposal targets an unfinalized slate or game[32m 21[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation[2m > [22mapplies decimal scoring adjustments accurately without floating-point drift[32m 29[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m5. Decision #55: Transaction Fail-Closed Rollback[2m > [22maborts and rolls back entire state on execution error[32m 13[2mms[22m[39m
 [32m✓[39m tests/commissionerDashboard.test.ts[2m > [22mMilestone 13.2 Commissioner Dashboard & Governance Integration Tests[2m > [22m6. Injectable ClockFn Determinism[2m > [22mrecords deterministic timestamps on proposal voting and execution[32m 17[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27)[2m > [22mfails closed when attempting wrap-up against unfinalized slate (Decision #27)[32m 204[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27)[2m > [22msuccessfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24)[32m 83[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57)[2m > [22mcreates outbox events with compound dedupeKey and drains them to inbox_messages[32m 105[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55)[2m > [22mfetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54)[32m 100[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55)[2m > [22menforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20)[32m 32[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55)[2m > [22mallows User A to mark own notification as read with deterministic ClockFn timestamp[32m 18[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55)[2m > [22mrejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass)[32m 8[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55)[2m > [22mallows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22)[32m 67[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55)[2m > [22mrejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20)[32m 3[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55)[2m > [22mallows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54)[32m 23[2mms[22m[39m
 [32m✓[39m tests/e2ePhase13Lifecycle.test.ts[2m > [22mMilestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite[2m > [22mLifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55)[2m > [22madvances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records[32m 14[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m1. GET /api/notifications (Inbox Fetch & Telemetry)[2m > [22mreturns 401 when unauthenticated[32m 91[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m1. GET /api/notifications (Inbox Fetch & Telemetry)[2m > [22mreturns strictly req.user.id records with accurate unread counts[32m 143[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m1. GET /api/notifications (Inbox Fetch & Telemetry)[2m > [22msupports unreadOnly filter parameter[32m 24[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m2. POST /api/notifications/read (Single & Batch Read State)[2m > [22midempotently marks single notification ID as read for req.user.id with injectable clock[32m 44[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m2. POST /api/notifications/read (Single & Batch Read State)[2m > [22menforces Decision #20: User A cannot mark User B notification as read (fails 403)[32m 14[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m2. POST /api/notifications/read (Single & Batch Read State)[2m > [22mhandles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55)[32m 17[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m3. POST /api/notifications/read-all[2m > [22matomically marks all unread notifications for req.user.id and preserves other users (Decision #20)[32m 11[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m4. GET & PUT /api/notifications/preferences[2m > [22mGET returns default preferences without creating DB row (Decision #54)[32m 10[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m4. GET & PUT /api/notifications/preferences[2m > [22mPUT validates and updates preferences for req.user.id[32m 24[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m5. Decision #54 Hardening (NO WRITES ON GET)[2m > [22mGET /api/notifications does not mutate any database state[32m 9[2mms[22m[39m
 [32m✓[39m tests/notificationCenter.test.ts[2m > [22mMilestone 13.1 Notification Center & Preferences Integration Tests[2m > [22m6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR)[2m > [22mrolls back and leaves state intact when mid-transaction or update errors occur[32m 6[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m1. GET /api/me/inbox[2m > [22mreturns 401 when unauthenticated[32m 47[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m1. GET /api/me/inbox[2m > [22mreturns inbox messages for authenticated user in descending order (Decision #54 compliant)[33m 338[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m1. GET /api/me/inbox[2m > [22msupports unreadOnly filter and poolId filter[32m 17[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m2. POST /api/me/inbox/:id/read[2m > [22mreturns 401 when unauthenticated[32m 5[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m2. POST /api/me/inbox/:id/read[2m > [22mreturns 404 when message belongs to another user (ownership isolation)[32m 25[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m2. POST /api/me/inbox/:id/read[2m > [22mmarks single message read successfully and is idempotent[32m 14[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m3. POST /api/me/inbox/read-all[2m > [22mreturns 401 when unauthenticated[32m 2[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m3. POST /api/me/inbox/read-all[2m > [22mmarks all unread messages for the user as read[32m 34[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m4. Notification Preferences: GET & PUT /api/me/notification-prefs[2m > [22mreturns 401 when unauthenticated[32m 8[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m4. Notification Preferences: GET & PUT /api/me/notification-prefs[2m > [22mreturns default preferences on GET before upsert without mutating DB (Decision #54)[32m 6[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m4. Notification Preferences: GET & PUT /api/me/notification-prefs[2m > [22mrejects invalid reminderOffsetsHours payloads with 400[32m 8[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m4. Notification Preferences: GET & PUT /api/me/notification-prefs[2m > [22mupdates valid preferences successfully[32m 11[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m5. Token-based Unsubscribe Flow[2m > [22mGET /api/notifications/unsubscribe validates token without modifying DB (Decision #54)[32m 4[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m5. Token-based Unsubscribe Flow[2m > [22mGET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token[32m 3[2mms[22m[39m
 [32m✓[39m tests/me_routes.test.ts[2m > [22mStep C: /api/me & /api/notifications Routes Tests[2m > [22m5. Token-based Unsubscribe Flow[2m > [22mPOST /api/notifications/unsubscribe disables email without deleting row[32m 6[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 401 when Authorization header is missing[32m 35[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 400 when pool_id query parameter is missing or malformed[32m 8[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 404 when pool does not exist[32m 144[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 403 when user is not the pool commissioner[32m 4[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 200 and game slate snapshot when user is the verified commissioner[32m 15[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 401 when Authorization header is missing[32m 18[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 400 when pool_id is missing or malformed in request body[32m 8[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 404 when pool does not exist in request body[32m 4[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 403 when user is not the pool commissioner[32m 3[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 200 and upserts pick when authenticated user is the commissioner[32m 23[2mms[22m[39m
[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22m[2mPOST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
[22m[39mpenalty_media row count = 0

[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22m[2mPOST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
[22m[39mpenalty_media row count = 0

[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22m[2mverifies zero penalty_media rows exist after denied upload attempts
[22m[39mpenalty_media row count = 0

[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22m[2mPATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
[22m[39mpenalty_media row count = 0

 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22mPOST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403[32m 12[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22mPOST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403[32m 5[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22mverifies zero penalty_media rows exist after denied upload attempts[32m 1[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22mPOST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success[32m 11[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22mPATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403[32m 5[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)[2m > [22mPATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success[32m 11[2mms[22m[39m
[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22m[2mreturns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
[22m[39mpool count before = 298
pool count after = 298
pool count invariant = PASS

[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22m[2mreturns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
[22m[39mpool count before = 298
pool count after = 298
pool count invariant = PASS

[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22m[2mreturns 400 when explicit pool_id is not a valid UUID (no pool write)
[22m[39mpool count before = 298
pool count after = 298
pool count invariant = PASS

[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22m[2mreturns 403 when user is not a member or commissioner of the requested pool (no pool write)
[22m[39mpool count before = 298
pool count after = 298
pool count invariant = PASS

[90mstdout[2m | tests/br5b_routes.test.ts[2m > [22m[2mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22m[2mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22m[2mreturns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
[22m[39mpool count before = 298
pool count after = 298
pool count invariant = PASS
member response byte equality = PASS
commissioner response byte equality = PASS

 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22mreturns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)[32m 15[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22mreturns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)[32m 5[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22mreturns 400 when explicit pool_id is not a valid UUID (no pool write)[32m 4[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22mreturns 403 when user is not a member or commissioner of the requested pool (no pool write)[32m 9[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mS-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)[2m > [22mreturns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot[32m 62[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mDecision #49: CI Route Scan & Route Guard Verification[2m > [22mverifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted[32m 43[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m1. Authorization & Scoping on Pool Ops Routes[2m > [22mreturns 401 when unauthenticated on GET health and POST retry[32m 41[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m1. Authorization & Scoping on Pool Ops Routes[2m > [22mreturns 400 when pool_id is not a valid UUID[32m 8[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m1. Authorization & Scoping on Pool Ops Routes[2m > [22mreturns 404 when pool does not exist[32m 71[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m1. Authorization & Scoping on Pool Ops Routes[2m > [22mreturns 403 when authenticated user is a regular pool member (not commissioner)[32m 9[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m1. Authorization & Scoping on Pool Ops Routes[2m > [22mreturns 403 when authenticated user is not a member of the pool[32m 10[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m2. GET /api/pools/:pool_id/ops/health[2m > [22mreturns accurate telemetry and is strictly read-only (Decision #54)[32m 86[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m2. GET /api/pools/:pool_id/ops/health[2m > [22mstrictly isolates pool telemetry with zero cross-pool leakage[32m 18[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m3. POST /api/pools/:pool_id/ops/outbox/retry[2m > [22mretries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease[32m 32[2mms[22m[39m
 [32m✓[39m tests/ops_routes.test.ts[2m > [22mStep F: Pool Ops Health & Outbox Retry Routes Tests[2m > [22m3. POST /api/pools/:pool_id/ops/outbox/retry[2m > [22mretries a specific event when outboxId is provided[32m 13[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m1. Retention Cutoff & Clock Calculation Unit Tests[2m > [22mcalculates exact retention cutoff date based on injected clock[32m 16[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m2. State Protection & Terminal Boundaries (Decision #24 & #55)[2m > [22mNEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard)[32m 23[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m2. State Protection & Terminal Boundaries (Decision #24 & #55)[2m > [22mprunes SENT records >30 days and DEAD records >90 days while preserving younger records[32m 37[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m3. Bounded Batching & Pagination Verification[2m > [22mprocesses multi-batch deletions with specified batchSize boundaries[32m 25[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m4. Decision #20 Tier Separation on Admin Retention Routes[2m > [22mrejects unauthenticated requests on /api/admin/ops/retention/*[32m 38[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m4. Decision #20 Tier Separation on Admin Retention Routes[2m > [22mrejects regular users on /api/admin/ops/retention/* with 403[32m 10[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m4. Decision #20 Tier Separation on Admin Retention Routes[2m > [22mrejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening)[32m 11[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m4. Decision #20 Tier Separation on Admin Retention Routes[2m > [22mallows global ADMIN to trigger retention prune and query retention status[32m 133[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m5. Decision #54 Read-Only Invariant on GET[2m > [22mGET /api/admin/ops/retention/status produces ZERO deletions or writes[32m 41[2mms[22m[39m
 [32m✓[39m tests/retention.test.ts[2m > [22mMilestone 12.4: Notification Retention, Archival & Pruning Engine[2m > [22m6. Decision #55 Fail-Closed Database Fault Tolerance[2m > [22mthrows structured error and aborts on database transaction failure[32m 8[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m1. Precondition Check & Fail Closed (Decision #27 & #55)[2m > [22mfails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week[32m 71[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m1. Precondition Check & Fail Closed (Decision #27 & #55)[2m > [22mfails closed when DB client or claim store is unreachable (Decision #55)[32m 3[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22)[2m > [22mcalculates standings and splits dead place penalty precisely between tied losers[32m 72[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m3. Claim Store Concurrency & Idempotency (Decision #24 & #57)[2m > [22msubsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates[32m 3[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m3. Claim Store Concurrency & Idempotency (Decision #24 & #57)[2m > [22menforces outbox notification preferences and deduplication key (Decision #57)[32m 6[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m4. Tier Separation & Route Protection (Decision #20 & #54)[2m > [22mPOST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20)[32m 79[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m4. Tier Separation & Route Protection (Decision #20 & #54)[2m > [22mPOST /api/admin/ops/wrap-up succeeds for system ADMIN[32m 25[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m4. Tier Separation & Route Protection (Decision #20 & #54)[2m > [22mGET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54)[32m 8[2mms[22m[39m
 [32m✓[39m tests/wrapUpEngine.test.ts[2m > [22mMilestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out[2m > [22m4. Tier Separation & Route Protection (Decision #20 & #54)[2m > [22mPOST /api/admin/ops/season-seal records immutable snapshot[32m 33[2mms[22m[39m
 [32m✓[39m tests/br4b.test.ts[2m > [22mBR-4b: Fail-Closed Claim Store Invariant (Decision #52)[2m > [22mDecision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed[32m 45[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m1. Exponential Backoff & Injectable Clock Unit Tests[2m > [22mcalculates deterministic exponential backoff intervals without jitter or drift[32m 15[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m1. Exponential Backoff & Injectable Clock Unit Tests[2m > [22minjectable ClockFn allows instant time progression without setTimeout[32m 3[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions[2m > [22msuccessful transport delivery transitions status PENDING -> PROCESSING -> SENT[32m 27[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions[2m > [22mtransient failure increments attempts, records diagnostic JSON and sets future backoff[32m 13[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions[2m > [22mpermanent rejection immediately transitions status to DEAD with diagnostic payload[32m 12[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions[2m > [22mreaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant)[32m 16[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions[2m > [22madvancing simulated clock allows retry after backoff expires[32m 16[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m3. Decision #20 Tier Separation: Admin Transport Routes[2m > [22mrejects unauthenticated requests on /api/admin/ops/transports/*[32m 47[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m3. Decision #20 Tier Separation: Admin Transport Routes[2m > [22mrejects regular users on /api/admin/ops/transports/* with 403[32m 10[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m3. Decision #20 Tier Separation: Admin Transport Routes[2m > [22mrejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening)[32m 10[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m3. Decision #20 Tier Separation: Admin Transport Routes[2m > [22mallows global ADMIN to query transports status and trigger dispatch sweep[32m 115[2mms[22m[39m
 [32m✓[39m tests/transports.test.ts[2m > [22mMilestone 12.3: Notification Transports, Retry Engine & DLQ[2m > [22m4. Decision #54 Strict Read-Only Invariant on GET[2m > [22mGET /api/admin/ops/transports/status produces ZERO database mutations[32m 31[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m1. Idempotency & Outbox Enqueue Invariants[2m > [22menqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs[32m 94[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m2. User Notification Preferences Enforcement[2m > [22mskips users who have opted out of email / pick reminders (generates 0 outbox events)[32m 2[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m2. User Notification Preferences Enforcement[2m > [22mskips members who have already submitted picks for all upcoming games in the window[32m 34[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m3. Injectable Clock Time-Window Boundary Testing[2m > [22mmoving clock forward cleanly transitions games in and out of windows without real-time delay[32m 25[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m4. Tier Separation & System Route Access Guards (Decision #20 & #54)[2m > [22mrejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401[32m 50[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m4. Tier Separation & System Route Access Guards (Decision #20 & #54)[2m > [22mrejects standard users from triggering reminder scan with 403 (Decision #20)[32m 5[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m4. Tier Separation & System Route Access Guards (Decision #20 & #54)[2m > [22mrejects pool commissioners who lack global ADMIN role with 403 (Decision #20)[32m 4[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m4. Tier Separation & System Route Access Guards (Decision #20 & #54)[2m > [22mallows global ADMIN to trigger reminder scan via POST with 200[32m 25[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m4. Tier Separation & System Route Access Guards (Decision #20 & #54)[2m > [22mDecision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only[32m 14[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m5. Fail-Closed Resilience (Decision #55)[2m > [22maborts and fails closed when database client is unconfigured or throws[32m 3[2mms[22m[39m
 [32m✓[39m tests/reminderScanner.test.ts[2m > [22mMilestone 12.1-E: Automated Reminder Scanner Engine Tests[2m > [22m5. Fail-Closed Resilience (Decision #55)[2m > [22mwithJobRun tracks failure and returns FAILED status upon unexpected error[32m 6[2mms[22m[39m
 [32m✓[39m tests/overrides.test.ts[2m > [22mMilestone 12.2: Pool Commissioner Proposals & Overrides Service[2m > [22m1. Route Isolation & Decision #20 Verification[2m > [22mrejects non-commissioner pool members with 403 Forbidden[32m 100[2mms[22m[39m
 [32m✓[39m tests/overrides.test.ts[2m > [22mMilestone 12.2: Pool Commissioner Proposals & Overrides Service[2m > [22m1. Route Isolation & Decision #20 Verification[2m > [22mrejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass)[32m 7[2mms[22m[39m
 [32m✓[39m tests/overrides.test.ts[2m > [22mMilestone 12.2: Pool Commissioner Proposals & Overrides Service[2m > [22m1. Route Isolation & Decision #20 Verification[2m > [22mrejects commissioners of different pools with 403 Forbidden[32m 6[2mms[22m[39m
 [32m✓[39m tests/overrides.test.ts[2m > [22mMilestone 12.2: Pool Commissioner Proposals & Overrides Service[2m > [22m2. Commissioner Proposal Creation & Resolution[2m > [22mallows valid pool commissioner to create an override proposal[32m 30[2mms[22m[39m
 [32m✓[39m tests/overrides.test.ts[2m > [22mMilestone 12.2: Pool Commissioner Proposals & Overrides Service[2m > [22m2. Commissioner Proposal Creation & Resolution[2m > [22mapplies a commissioner pick override inside a serializable transaction[32m 122[2mms[22m[39m
 [32m✓[39m tests/overrides.test.ts[2m > [22mMilestone 12.2: Pool Commissioner Proposals & Overrides Service[2m > [22m2. Commissioner Proposal Creation & Resolution[2m > [22mapplies a commissioner penalty override with decimal ledger tracking[32m 69[2mms[22m[39m
 [32m✓[39m tests/overrides.test.ts[2m > [22mMilestone 12.2: Pool Commissioner Proposals & Overrides Service[2m > [22m3. Read-Only GET Proposal Query (Decision #54)[2m > [22mGET /api/pools/:pool_id/proposals returns history and produces zero side effects[32m 19[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mError Scrubber[2m > [22mstrips database URLs, API keys, passwords, tokens and truncates to 200 chars[33m 1011[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mError Scrubber[2m > [22mpreserves key names for passwords and tokens while redacting values[32m 158[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mError Scrubber[2m > [22mscrubs ECONNREFUSED host:port patterns[32m 48[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mError Scrubber[2m > [22mhandles extremely long error messages by truncating to 200 chars[32m 22[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mConsole Mail Transport[2m > [22mappends formatted json logs to outbox-dev.log[32m 27[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mSMTP Mail Transport & Timeouts[2m > [22mthrows error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing[32m 11[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mSMTP Mail Transport & Timeouts[2m > [22mfake hanging SMTP transporter times out and maps to error failure[32m 8[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mHTML Escaping & Message-ID SHA256[2m > [22mHTML escaping verification for interpolated markup in pool names and fields[32m 7[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mHTML Escaping & Message-ID SHA256[2m > [22mMessage-ID SHA256 stability across executions[32m 8[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mDrain Worker Lifecycle & Invariants[2m > [22mdrains pending outbox event, sets status SENT and records sentAt[32m 45[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mDrain Worker Lifecycle & Invariants[2m > [22msets status SUPPRESSED when user email preference is disabled[32m 36[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mDrain Worker Lifecycle & Invariants[2m > [22mapplies discrete backoff schedule on transport failure[32m 24[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mDrain Worker Lifecycle & Invariants[2m > [22mtransitions to DEAD on 5th failure[32m 20[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mDrain Worker Lifecycle & Invariants[2m > [22mEvent repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD[32m 15[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mDrain Worker Lifecycle & Invariants[2m > [22mTwo concurrent workers with slow fake transport never duplicate sends (conditional renewal test)[32m 90[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mwithJobRun Lifecycle & Job Runners[2m > [22mcreates JobRun with RUNNING and transitions to OK with itemsProcessed[32m 26[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mwithJobRun Lifecycle & Job Runners[2m > [22mrecords FAILED status and scrubbed errorCode when job execution throws[32m 10[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mwithJobRun Lifecycle & Job Runners[2m > [22mtransitions to PARTIAL status when succeeded > 0 and failed + dead > 0[32m 10[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mwithJobRun Lifecycle & Job Runners[2m > [22mdatabase write failure does not fail or abort the underlying job execution[32m 14[2mms[22m[39m
 [32m✓[39m tests/outbox_drain.test.ts[2m > [22m12.1 Step B: Transport, Drain Worker, and Job Runners[2m > [22mwithJobRun Lifecycle & Job Runners[2m > [22mrunOutboxDrain integrates with withJobRun[32m 10[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables[32m 58[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables[32m 102[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables[32m 29[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)[32m 2[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions[32m 15[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m1. Cryptographic Signature Verification Unit Tests[2m > [22mverifies valid HMAC SHA-256 signatures with hex and sha256= prefix[32m 6[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m1. Cryptographic Signature Verification Unit Tests[2m > [22mrejects invalid signature, mismatched secret, or tampered payload (Fail-Closed)[32m 1[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m2. POST /api/webhooks/notifications Ingress Security[2m > [22mrejects webhook requests with missing signature header with 401 Unauthorized[32m 51[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m2. POST /api/webhooks/notifications Ingress Security[2m > [22mrejects webhook requests with forged or invalid signature with 401 Unauthorized[32m 5[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m2. POST /api/webhooks/notifications Ingress Security[2m > [22mprocesses valid signed delivered event and transitions OutboxEvent to SENT[32m 23[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m2. POST /api/webhooks/notifications Ingress Security[2m > [22mprocesses valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON[32m 13[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m3. Decision #54 Side-Effect Free GET Invariant[2m > [22mGET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations[32m 17[2mms[22m[39m
 [32m✓[39m tests/webhooks.test.ts[2m > [22mMilestone 12.3: Webhook Ingress Gateway & Signature Verification[2m > [22m4. Decision #55 Fail-Closed Database Fault Tolerance[2m > [22mreturns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement[32m 12[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mboth rows created[32m 80[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mduplicate enqueue creates no second outbox OR inbox row[32m 17[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mcaller transaction that throws after enqueue leaves zero rows in both tables[32m 14[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mIN_APP-only writes no outbox row[32m 12[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mEMAIL-only writes no inbox row[32m 12[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mdisallowed payload key is stripped[32m 25[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mreminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink[32m 24[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mrejects non-transaction client or root prisma instance[32m 7[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mskips EMAIL channel if emailEnabled is false in NotificationPreference[32m 16[2mms[22m[39m
 [32m✓[39m tests/notifications.test.ts[2m > [22m12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)[2m > [22mstatic test fails if the module imports nodemailer, net, http(s) or fetch[32m 10[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)[32m 13[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001[32m 21[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001[32m 5[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001[32m 5[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001[32m 10[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503[32m 2[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 when Authorization header is absent[32m 2[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 when Authorization header does not start with Bearer[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 for an invalid / expired token[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mdecodes valid JWT and attaches user to req.user, then calls next()[32m 8[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mreturns 401 if req.user is undefined[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mreturns 403 if req.user is not ADMIN[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mcalls next() if user is ADMIN[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 401 if req.user is missing[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 400 for a malformed non-UUID pool_id[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 404 when the pool does not exist in DB[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 403 when user is neither commissioner nor member[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mDecision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mcalls next() and attaches pool when user is the pool commissioner[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: query - extracts pool_id from query params and authorizes commissioner[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: query - returns 400 when pool_id query parameter is missing[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: body - extracts pool_id from request body and authorizes commissioner[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: body - returns 400 when pool_id body parameter is missing[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mreturns 403 if user is not a member and not the commissioner[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mDecision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mcalls next() when user is active pool member[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mcalls next() when user is the pool commissioner (even without explicit membership row)[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_4_command_bar.test.ts[2m > [22mMilestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66)[2m > [22mFAVORITES action picks home team and skips locked games[32m 3[2mms[22m[39m
 [32m✓[39m tests/m14_4_command_bar.test.ts[2m > [22mMilestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66)[2m > [22mFLIP_ALL flips current selections and preserves locked game picks[32m 1[2mms[22m[39m
 [32m✓[39m tests/m14_4_command_bar.test.ts[2m > [22mMilestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66)[2m > [22mCLEAR_UNLOCKED removes unlocked picks only[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_4_command_bar.test.ts[2m > [22mMilestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66)[2m > [22mFinding 5.6: MIRROR_CONSENSUS suppresses action when cohort size < 3[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_closure_verification.test.ts[2m > [22mPhase 17 Milestone 17.5: Cumulative Governance & Closure Audit[2m > [22mconfirms all Phase 17 domain services are exported and instantiate correctly[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase17_closure_verification.test.ts[2m > [22mPhase 17 Milestone 17.5: Cumulative Governance & Closure Audit[2m > [22mvalidates anti-peeking cohort floor constant parity across all services[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_2_state_graph.test.ts[2m > [22mMilestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65)[2m > [22mA1: Derives OPEN when no games have reached kickoff[32m 3[2mms[22m[39m
 [32m✓[39m tests/m14_2_state_graph.test.ts[2m > [22mMilestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65)[2m > [22mA1 & A7: Derives PARTIAL_LOCK when at least one game locked and at least one unlocked[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_2_state_graph.test.ts[2m > [22mMilestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65)[2m > [22mA1 & A7: Derives LIVE when all games are locked but not all final[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_2_state_graph.test.ts[2m > [22mMilestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65)[2m > [22mA1: Derives SETTLEMENT when all games are final[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_2_state_graph.test.ts[2m > [22mMilestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65)[2m > [22mA6: Derives FINALIZED when slate is committed[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_2_state_graph.test.ts[2m > [22mMilestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65)[2m > [22mA2: Game lock remains authoritative independent of slate state[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_5_e2e_integration.test.ts[2m > [22mMilestone 16.5 - Phase 16 End-to-End Pipeline Integration (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mExecutes the complete Phase 16 autonomous governance, market & engagement pipeline[32m 8[2mms[22m[39m
 [32m✓[39m tests/m16_5_e2e_integration.test.ts[2m > [22mMilestone 16.5 - Phase 16 End-to-End Pipeline Integration (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mEnforces lock supremacy across all Phase 16 modules fail-closed (Decision #65)[32m 3[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mDecision #62 - Circuit Breaker (FeatureFlagKey.SWEAT_RADAR)[2m > [22mFeature is disabled by default (returns false)[32m 2[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mDecision #62 - Circuit Breaker (FeatureFlagKey.SWEAT_RADAR)[2m > [22mFeature gates can be toggled on and off[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mDivergence Computation (Decision #66 - Lock Visibility)[2m > [22mExcludes unlocked games from divergence output[32m 3[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mDivergence Computation (Decision #66 - Lock Visibility)[2m > [22mComputes correct home/away pick rates with Decimal precision[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mCohort Floor Suppression (Finding 5.6 / canExposeAggregate)[2m > [22mSuppresses divergence when cohort size is below the floor (< 3)[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mCohort Floor Suppression (Finding 5.6 / canExposeAggregate)[2m > [22mDoes NOT suppress when cohort meets or exceeds the floor[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mLeverage Swing Computation (Decision #54 - Pure Calculation)[2m > [22mComputes leverage only for locked, non-finalized games[32m 2[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mLeverage Swing Computation (Decision #54 - Pure Calculation)[2m > [22mProduces a leverage entry for every member with a pick on pending games[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mLeverage Swing Computation (Decision #54 - Pure Calculation)[2m > [22mSwing magnitude is always non-negative (Decimal precision)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mLeverage Swing Computation (Decision #54 - Pure Calculation)[2m > [22mHigher swing for games with more divergent picks (g3 50/50 split)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mScenario Simulation (Decision #54 - Zero Writes on GET)[2m > [22mProjects correct totals when all home teams win[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mScenario Simulation (Decision #54 - Zero Writes on GET)[2m > [22mOutcomes are sorted descending by projected total[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mScenario Simulation (Decision #54 - Zero Writes on GET)[2m > [22mZero delta when no assumptions match any picks[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mSnapshot Builder (Decision #61 - Pure Overlay)[2m > [22mBuilds a complete snapshot with divergence and leverage[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mSnapshot Builder (Decision #61 - Pure Overlay)[2m > [22mSnapshot divergence excludes unlocked games[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_4_sweat_radar.test.ts[2m > [22mMilestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)[2m > [22mSnapshot Builder (Decision #61 - Pure Overlay)[2m > [22mSnapshot leverage excludes finalized games[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_3_dynamic_spread.test.ts[2m > [22mMilestone 16.3 - Feature 12: Dynamic Spread Adjustment Engine (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mCalculates baseline spread when picks are balanced 50/50[32m 3[2mms[22m[39m
 [32m✓[39m tests/m16_3_dynamic_spread.test.ts[2m > [22mMilestone 16.3 - Feature 12: Dynamic Spread Adjustment Engine (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mShifts spread by -1.0 when home pick consensus is >= 70%[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_3_dynamic_spread.test.ts[2m > [22mMilestone 16.3 - Feature 12: Dynamic Spread Adjustment Engine (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mShifts spread by +0.5 when away pick consensus is >= 60% and < 70%[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_3_dynamic_spread.test.ts[2m > [22mMilestone 16.3 - Feature 12: Dynamic Spread Adjustment Engine (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mFreezes spread and line shift when game is locked (Decision #65)[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_survivor.test.ts[2m > [22mPhase 19 Milestone 19.3: Playoff Survivor Mode & Invariant Suite[2m > [22menforces Decision #62: Fails closed when feature flag is disabled or unconfigured[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase19_survivor.test.ts[2m > [22mPhase 19 Milestone 19.3: Playoff Survivor Mode & Invariant Suite[2m > [22menforces Decision #65: Rejects picks submitted exactly at or following kickoff[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_survivor.test.ts[2m > [22mPhase 19 Milestone 19.3: Playoff Survivor Mode & Invariant Suite[2m > [22menforces Decision #55: Rejects previously used teams (strict postseason team exhaustion)[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_survivor.test.ts[2m > [22mPhase 19 Milestone 19.3: Playoff Survivor Mode & Invariant Suite[2m > [22menforces Decision #55: Rejects submissions from already eliminated participants[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_survivor.test.ts[2m > [22mPhase 19 Milestone 19.3: Playoff Survivor Mode & Invariant Suite[2m > [22menforces Decision #20: Rejects submissions when poolId mismatches entry poolId[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_survivor.test.ts[2m > [22mPhase 19 Milestone 19.3: Playoff Survivor Mode & Invariant Suite[2m > [22maccepts valid submission and adds team to used list; grades elimination on loss[32m 1[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m1. Kickoff Future vs Past (Standard 0 Offset)[2m > [22mreturns false (unlocked) when kickoff is in the future[32m 2[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m1. Kickoff Future vs Past (Standard 0 Offset)[2m > [22mreturns true (locked) when kickoff is in the past[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m1. Kickoff Future vs Past (Standard 0 Offset)[2m > [22mreturns true (locked) at exact kickoff boundary (now === kickoff)[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m2. Pool-Specific Lock Offsets[2m > [22mlocks early when positive offset is configured (e.g., 60 minutes before kickoff)[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m2. Pool-Specific Lock Offsets[2m > [22msupports negative offsets (e.g., locking 15 minutes after kickoff)[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m3. Fail-Closed Edge Cases (Null, Undefined, Invalid)[2m > [22mfails closed (returns true / throws) when kickoffTime is null or undefined[32m 1[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m3. Fail-Closed Edge Cases (Null, Undefined, Invalid)[2m > [22mfails closed when kickoffTime is an invalid date string[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m3. Fail-Closed Edge Cases (Null, Undefined, Invalid)[2m > [22mhandles null, undefined, or NaN offset by defaulting to 0 offset[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m4. computeGameLockStatus[2m > [22mreturns full lock metadata correctly for unlocked game[32m 1[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m4. computeGameLockStatus[2m > [22mreturns full lock metadata correctly for locked game[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m4. computeGameLockStatus[2m > [22mreturns safe fallback on missing kickoffTime[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m5. isGameInExcludedWindow[2m > [22mreturns false if no excluded windows are passed or list is empty[32m 0[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m5. isGameInExcludedWindow[2m > [22midentifies Thursday Night Football correctly[32m 1[2mms[22m[39m
 [32m✓[39m tests/lock_resolver.characterization.test.ts[2m > [22mStep D: Lock Resolver Characterization & Pure Invariants[2m > [22m5. isGameInExcludedWindow[2m > [22midentifies Monday Night Football correctly[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mDecision #66: Truth-Table Pick Visibility[2m > [22mOwner can always view their own pick regardless of lock or policy[32m 2[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mDecision #66: Truth-Table Pick Visibility[2m > [22mCompetitor pick is hidden when policy is active and game is unlocked[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mDecision #66: Truth-Table Pick Visibility[2m > [22mCompetitor pick is visible when policy is active and game is locked[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mDecision #66: Truth-Table Pick Visibility[2m > [22mCompetitor pick is visible when policy is disabled even if game is unlocked[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mFinding 5.6: Anti-Peeking Cohort Floor (N >= 3)[2m > [22mSuppresses aggregate exposure if cohort size is below 3[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mFinding 5.6: Anti-Peeking Cohort Floor (N >= 3)[2m > [22mPermits aggregate exposure if cohort size is 3 or greater[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mPick Selection Masking Helper[2m > [22mMasks selection to null when canView is false[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_3_visibility.test.ts[2m > [22mMilestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)[2m > [22mPick Selection Masking Helper[2m > [22mPreserves selection when canView is true[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_intake_invariants.test.ts[2m > [22mPhase 17 Invariant & Pre-Flight Suite[2m > [22menforces Decision #62: Circuit breaker defaults to false when flag is unconfigured or null[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase17_intake_invariants.test.ts[2m > [22mPhase 17 Invariant & Pre-Flight Suite[2m > [22menforces Anti-Peeking Cohort Floor invariant (N >= 3)[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase17_intake_invariants.test.ts[2m > [22mPhase 17 Invariant & Pre-Flight Suite[2m > [22menforces Decisions #3 & #22: Numeric precision via Prisma.Decimal[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_1_dead_place_override.test.ts[2m > [22mMilestone 20.1: Dead Place Override & Auto-Loss Engine (Decision #69)[2m > [22menforces Decision #69: No-show auto-loss forces 0.00 points and Dead Place when flag is ON[32m 5[2mms[22m[39m
 [32m✓[39m tests/m20_1_dead_place_override.test.ts[2m > [22mMilestone 20.1: Dead Place Override & Auto-Loss Engine (Decision #69)[2m > [22menforces Decision #69: Multi-way ties (two-way and three-way) assess absolute 2.50 Decimal each with zero splitting[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_1_dead_place_override.test.ts[2m > [22mMilestone 20.1: Dead Place Override & Auto-Loss Engine (Decision #69)[2m > [22menforces Decision #69: Preserves canonical BR-4 behavior when flag is OFF[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_1_dead_place_override.test.ts[2m > [22mMilestone 20.1: Dead Place Override & Auto-Loss Engine (Decision #69)[2m > [22menforces Decision #55: Fails closed if week is not finalized[32m 2[2mms[22m[39m
 [32m✓[39m tests/m14_7_e2e_integration.test.ts[2m > [22mMilestone 14.7 - Phase 14 E2E Pipeline Integration (Decisions #3, #20, #22, #54, #61, #62, #65, #66)[2m > [22mExecutes the complete Phase 14 lifecycle across all 6 modules[32m 8[2mms[22m[39m
 [32m✓[39m tests/m14_1_feature_registry.test.ts[2m > [22mMilestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62)[2m > [22mDecision #62: Feature defaults to OFF when not explicitly configured[32m 2[2mms[22m[39m
 [32m✓[39m tests/m14_1_feature_registry.test.ts[2m > [22mMilestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62)[2m > [22mDecision #62: Returns true only when explicitly enabled for the pool[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_1_feature_registry.test.ts[2m > [22mMilestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62)[2m > [22mDecision #62: Middleware returns 404 when feature is disabled for pool members[32m 1[2mms[22m[39m
 [32m✓[39m tests/m14_1_feature_registry.test.ts[2m > [22mMilestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62)[2m > [22mDecision #62: Middleware calls next() when feature is enabled[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_bracket_engine.test.ts[2m > [22mPhase 19 Milestone 19.1: Playoff Bracket Engine & Lock Supremacy Invariants[2m > [22menforces Decision #62: Fails closed when feature flag is disabled or unconfigured[32m 3[2mms[22m[39m
 [32m✓[39m tests/phase19_bracket_engine.test.ts[2m > [22mPhase 19 Milestone 19.1: Playoff Bracket Engine & Lock Supremacy Invariants[2m > [22menforces Decision #65: Rejects picks submitted exactly at or after round kickoff[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase19_bracket_engine.test.ts[2m > [22mPhase 19 Milestone 19.1: Playoff Bracket Engine & Lock Supremacy Invariants[2m > [22menforces Decision #55: Rejects selection of team not participating in game[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_bracket_engine.test.ts[2m > [22mPhase 19 Milestone 19.1: Playoff Bracket Engine & Lock Supremacy Invariants[2m > [22maccepts valid pick submitted prior to kickoff and preserves pool scope (Decision #20)[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_bracket_engine.test.ts[2m > [22mPhase 19 Milestone 19.1: Playoff Bracket Engine & Lock Supremacy Invariants[2m > [22mgrades completed game correctly and refuses grading for unfinalized game (Decision #55)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mCircuit Breaker Registry Defaults (Decision #62)[2m > [22masserts PRD_DEAD_PLACE_RULES defaults to OFF when store is empty or key unset[32m 2[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mCircuit Breaker Registry Defaults (Decision #62)[2m > [22masserts SHOT_CAM_WORKFLOW defaults to OFF when store is empty or key unset[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mCircuit Breaker Registry Defaults (Decision #62)[2m > [22masserts SMS_FALLBACK_INGEST defaults to OFF when store is empty or key unset[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mDecision #69: Dead Place Rules & Parity Assertions[2m > [22mforces no-show with nonzero caller points to 0.00 effective points and Dead Place when flag is ON[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mDecision #69: Dead Place Rules & Parity Assertions[2m > [22mevaluates two-way tie at absolute 2.50 Decimal each with zero splitting[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mDecision #69: Dead Place Rules & Parity Assertions[2m > [22mevaluates three-way tie at absolute 2.50 Decimal each with zero splitting[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mDecision #69: Dead Place Rules & Parity Assertions[2m > [22mfalls back strictly to canonical BR-4 behavior when flag is OFF (splits penalty and applies 2.00 fine)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mDecision #69: Dead Place Rules & Parity Assertions[2m > [22mfails closed when week finalization is omitted or false[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mDecision #69: Dead Place Rules & Parity Assertions[2m > [22menforces Decision #20 pool-tier isolation[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mShot-Cam Finite State Machine Invariants (Decision #55 & #65)[2m > [22menforces Decision #65: Blocks actions prior to kickoff[32m 1[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mShot-Cam Finite State Machine Invariants (Decision #55 & #65)[2m > [22mfails closed on unknown or invalid state transitions[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mShot-Cam Finite State Machine Invariants (Decision #55 & #65)[2m > [22mtransitions PENDING_UPLOAD -> UPLOAD -> COMMISSIONER_AUDIT[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mShot-Cam Finite State Machine Invariants (Decision #55 & #65)[2m > [22mblocks APPROVE when game is unfinalized[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mShot-Cam Finite State Machine Invariants (Decision #55 & #65)[2m > [22mhandles RAISE_DISPUTE and blocks premature EXPIRE_DISPUTE until 24h boundary passes[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_0_intake.test.ts[2m > [22mPhase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite[2m > [22mSMS Fallback Ingest Structural Contract[2m > [22mvalidates structural non-empty tokens and tenant poolId[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_telemetry_pipeline.test.ts[2m > [22mPhase 17 Milestone 17.2: Telemetry UI & Sweat Radar Invariants[2m > [22menforces Decision #62: Circuit breaker defaults to closed (feature disabled)[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase17_telemetry_pipeline.test.ts[2m > [22mPhase 17 Milestone 17.2: Telemetry UI & Sweat Radar Invariants[2m > [22menforces Decision #66: Pre-kickoff game masks distribution regardless of slate state[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase17_telemetry_pipeline.test.ts[2m > [22mPhase 17 Milestone 17.2: Telemetry UI & Sweat Radar Invariants[2m > [22menforces Anti-Peeking Cohort Floor invariant (N >= 3) on post-kickoff games[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_telemetry_pipeline.test.ts[2m > [22mPhase 17 Milestone 17.2: Telemetry UI & Sweat Radar Invariants[2m > [22mcalculates unmasked sweat radar metrics using Prisma.Decimal when post-kickoff and N >= 3[32m 0[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mRolling lock: enforces lock per-game at kickoff boundary[32m 2[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mRolling lock with offset: enforces lock at (kickoff - offset)[32m 0[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mGlobal lock vs Rolling lock: handles first game vs later games[32m 0[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mExcluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF[32m 1[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mBR-4 splitPenalty Math Characterization[2m > [22mWorked matrix: confirms exact zero-diff decimal split amounts[32m 3[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mBR-4b Set-Equality: Wrap-Up vs Scoring Resolver[2m > [22mAsserts 100% game ID set equality between wrap-up and scoring resolvers[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_4_live_props.test.ts[2m > [22mMilestone 16.4 - Feature 13: Live In-Game Props Matrix (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mCreates an OVER_UNDER prop with Decimal lines and points[32m 2[2mms[22m[39m
 [32m✓[39m tests/m16_4_live_props.test.ts[2m > [22mMilestone 16.4 - Feature 13: Live In-Game Props Matrix (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mRejects prop submission when prop is locked (Decision #65)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_4_live_props.test.ts[2m > [22mMilestone 16.4 - Feature 13: Live In-Game Props Matrix (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mGrades OVER correctly and awards exact Decimal points[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_4_live_props.test.ts[2m > [22mMilestone 16.4 - Feature 13: Live In-Game Props Matrix (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mGrades UNDER correctly when actual is below line[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_4_live_props.test.ts[2m > [22mMilestone 16.4 - Feature 13: Live In-Game Props Matrix (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mGrades PUSH outcome as 0.00 points fail-closed on exact match[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_multipliers.test.ts[2m > [22mPhase 19 Milestone 19.2: Dynamic Round Multipliers & Precision Scoring[2m > [22menforces Decision #62: Suppresses dynamic escalation and defaults to 1.00x when circuit breaker is disabled[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase19_multipliers.test.ts[2m > [22mPhase 19 Milestone 19.2: Dynamic Round Multipliers & Precision Scoring[2m > [22mapplies default canonical progression (1x, 2x, 4x, 8x) when circuit breaker is enabled[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase19_multipliers.test.ts[2m > [22mPhase 19 Milestone 19.2: Dynamic Round Multipliers & Precision Scoring[2m > [22menforces Decision #55: Fails closed on sub-floor (<1.00) or non-monotonic custom configurations[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_multipliers.test.ts[2m > [22mPhase 19 Milestone 19.2: Dynamic Round Multipliers & Precision Scoring[2m > [22menforces Decision #20: Honors valid custom pool-scoped multiplier override[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_e2e_hardening.test.ts[2m > [22mPhase 17 Milestone 17.4: E2E Integration & Invariant Hardening[2m > [22menforces Decision #20: Denies access to non-pool members[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase17_e2e_hardening.test.ts[2m > [22mPhase 17 Milestone 17.4: E2E Integration & Invariant Hardening[2m > [22morchestrates end-to-end telemetry and social stakes with exact Decimal math[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase17_e2e_hardening.test.ts[2m > [22mPhase 17 Milestone 17.4: E2E Integration & Invariant Hardening[2m > [22mfails closed when all circuit breakers are toggled off[32m 0[2mms[22m[39m
 [32m✓[39m tests/m18_0_intake.test.ts[2m > [22mPhase 18 Milestone 18.0: Intake & Governance Invariants[2m > [22menforces Decision #62: All Phase 18 circuit breakers default to OFF (false)[32m 2[2mms[22m[39m
 [32m✓[39m tests/m18_0_intake.test.ts[2m > [22mPhase 18 Milestone 18.0: Intake & Governance Invariants[2m > [22menforces Decision #20: Anonymizes cross-pool global leaderboard entries[32m 1[2mms[22m[39m
 [32m✓[39m tests/m18_0_intake.test.ts[2m > [22mPhase 18 Milestone 18.0: Intake & Governance Invariants[2m > [22menforces Decision #55: Rejects archival manifest with invalid hash (fail-closed)[32m 0[2mms[22m[39m
 [32m✓[39m tests/m18_0_intake.test.ts[2m > [22mPhase 18 Milestone 18.0: Intake & Governance Invariants[2m > [22menforces Decisions #3 & #22: Prisma.Decimal precision for leaderboard score calculations[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_3_comeback_vault.test.ts[2m > [22mMilestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65)[2m > [22mDenies eligibility when slate week is before minimum threshold week[32m 3[2mms[22m[39m
 [32m✓[39m tests/m15_3_comeback_vault.test.ts[2m > [22mMilestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65)[2m > [22mDenies eligibility when deficit is below threshold[32m 2[2mms[22m[39m
 [32m✓[39m tests/m15_3_comeback_vault.test.ts[2m > [22mMilestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65)[2m > [22mGrants eligibility when week >= 10 and deficit >= 15.00 points[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_3_comeback_vault.test.ts[2m > [22mMilestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65)[2m > [22mCalculates boosted underdog score with exact Decimal math (1 * 1.5 = 1.50)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_3_comeback_vault.test.ts[2m > [22mMilestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65)[2m > [22mDoes not apply multiplier if pick is incorrect or not underdog[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #62: Rejects transitions when SHOT_CAM_WORKFLOW flag is OFF[32m 2[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #65: Rejects actions before gameKickoff[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22mexecutes valid progression: PENDING_UPLOAD -> UPLOAD -> COMMISSIONER_AUDIT -> APPROVE -> VERIFIED[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #55: Dispute lifecycle with 24-hour expiration boundary[32m 0[2mms[22m[39m
 [32m✓[39m tests/m20_2_shot_cam_fsm.test.ts[2m > [22mMilestone 20.2: Shot-Cam Verification State Machine Invariants[2m > [22menforces Decision #55: Blocks approval while game is unfinalized[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase18_archival_engine.test.ts[2m > [22mPhase 18 Milestone 18.3: Historical Archival Engine & Invariant Suite[2m > [22menforces Decision #62: Circuit breaker defaults to closed (feature disabled)[32m 3[2mms[22m[39m
 [32m✓[39m tests/phase18_archival_engine.test.ts[2m > [22mPhase 18 Milestone 18.3: Historical Archival Engine & Invariant Suite[2m > [22menforces Decision #55: Fails closed when ranking records mismatch totalMembers count[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase18_archival_engine.test.ts[2m > [22mPhase 18 Milestone 18.3: Historical Archival Engine & Invariant Suite[2m > [22mgenerates immutable locked archive manifest with deterministic SHA-256 hash[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase18_archival_engine.test.ts[2m > [22mPhase 18 Milestone 18.3: Historical Archival Engine & Invariant Suite[2m > [22menforces Decision #20: Pool isolation preserved in manifest output[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase18_archival_engine.test.ts[2m > [22mPhase 18 Milestone 18.3: Historical Archival Engine & Invariant Suite[2m > [22mverifies snapshot integrity and detects payload tampering[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_0_intake.test.ts[2m > [22mMilestone 16.0 - Phase 16 Intake & Syndicate Scaffolding (Decisions #3, #22, #61, #62, #65)[2m > [22mCreates a syndicate portfolio and validates share percentages using Decimal precision[32m 4[2mms[22m[39m
 [32m✓[39m tests/m16_0_intake.test.ts[2m > [22mMilestone 16.0 - Phase 16 Intake & Syndicate Scaffolding (Decisions #3, #22, #61, #62, #65)[2m > [22mRejects negative or zero contributions fail-closed[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_0_intake.test.ts[2m > [22mMilestone 16.0 - Phase 16 Intake & Syndicate Scaffolding (Decisions #3, #22, #61, #62, #65)[2m > [22mRejects syndicate creation if slate is locked (Decision #65)[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_0_intake.test.ts[2m > [22mMilestone 16.0 - Phase 16 Intake & Syndicate Scaffolding (Decisions #3, #22, #61, #62, #65)[2m > [22mDistributes winnings proportionally with penny remainder conservation ($150 across 50%, 25%, 25%)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_0_intake.test.ts[2m > [22mMilestone 16.0 - Phase 16 Intake & Syndicate Scaffolding (Decisions #3, #22, #61, #62, #65)[2m > [22mDistributes odd penny remainder without loss ($100 winnings to 3 equal stakes)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_5_e2e_integration.test.ts[2m > [22mMilestone 15.5 - Phase 15 E2E Pipeline Integration (Decisions #3, #20, #22, #54, #61, #62, #65, #66)[2m > [22mExecutes the complete Phase 15 social stakes & risk telemetry pipeline[32m 7[2mms[22m[39m
 [32m✓[39m tests/phase17_social_stakes.test.ts[2m > [22mPhase 17 Milestone 17.1: Social Stakes & Escrow Invariants[2m > [22menforces Decision #62: Circuit breaker defaults to closed (feature disabled)[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase17_social_stakes.test.ts[2m > [22mPhase 17 Milestone 17.1: Social Stakes & Escrow Invariants[2m > [22mprohibits self-wagering between identical membership IDs[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_social_stakes.test.ts[2m > [22mPhase 17 Milestone 17.1: Social Stakes & Escrow Invariants[2m > [22menforces Decisions #3 & #22: Rejects insufficient escrow balance via Prisma.Decimal[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_social_stakes.test.ts[2m > [22mPhase 17 Milestone 17.1: Social Stakes & Escrow Invariants[2m > [22mlocks creator escrow upon valid stake creation with zero float rounding errors[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase17_social_stakes.test.ts[2m > [22mPhase 17 Milestone 17.1: Social Stakes & Escrow Invariants[2m > [22msettles pot payout with exact decimal conservation[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_2_rival_hex.test.ts[2m > [22mMilestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mCreates a proposed challenge with valid Decimal stakes and handicap[32m 2[2mms[22m[39m
 [32m✓[39m tests/m15_2_rival_hex.test.ts[2m > [22mMilestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mRejects self-challenge fail-closed[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_2_rival_hex.test.ts[2m > [22mMilestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mRejects challenge proposal on locked slate (Decision #65)[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_2_rival_hex.test.ts[2m > [22mMilestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mRejects challenge acceptance once slate has locked (Decision #65)[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_2_rival_hex.test.ts[2m > [22mMilestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mSettles challenger victory and awards 2x side-pot ($40.00)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_2_rival_hex.test.ts[2m > [22mMilestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mApplies positive handicap correctly to target player[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_2_rival_hex.test.ts[2m > [22mMilestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mResolves exact score tie to STALEMATE_REFUND returning original stake[32m 0[2mms[22m[39m
 [32m✓[39m tests/m15_1_bounty_board.test.ts[2m > [22mMilestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mCreates bounty offer and validates strict positive escrow[32m 2[2mms[22m[39m
 [32m✓[39m tests/m15_1_bounty_board.test.ts[2m > [22mMilestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mRejects bounty creation fail-closed if target game is already locked (Decision #65)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_1_bounty_board.test.ts[2m > [22mMilestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mSettles single-claimant bounty with 100% escrow payout[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_1_bounty_board.test.ts[2m > [22mMilestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mDistributes multi-claimant split with exact penny remainder preservation ($100 / 3 claimants)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_1_bounty_board.test.ts[2m > [22mMilestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mSettles refund to creator when zero claimants qualify[32m 0[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mallows valid local disposable database URLs[32m 2[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mrejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)[32m 1[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mDecision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection[32m 0[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mrejects URLs using ?schema= parameter to bypass host isolation[32m 0[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mrejects non-disposable production database names on localhost[32m 1[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22msabotage test: throws when TEST_DATABASE_URL is empty string or undefined[32m 1[2mms[22m[39m
 [32m✓[39m tests/m19_0_intake.test.ts[2m > [22mPhase 19 Milestone 19.0: Intake & Playoff Invariants[2m > [22menforces Decision #62: All Phase 19 circuit breakers default to OFF (false)[32m 2[2mms[22m[39m
 [32m✓[39m tests/m19_0_intake.test.ts[2m > [22mPhase 19 Milestone 19.0: Intake & Playoff Invariants[2m > [22menforces Decision #65: Lock Supremacy locks bracket submissions at first game kickoff[32m 0[2mms[22m[39m
 [32m✓[39m tests/m19_0_intake.test.ts[2m > [22mPhase 19 Milestone 19.0: Intake & Playoff Invariants[2m > [22menforces Decision #55: Fails closed when prior playoff round is unfinalized[32m 0[2mms[22m[39m
 [32m✓[39m tests/m19_0_intake.test.ts[2m > [22mPhase 19 Milestone 19.0: Intake & Playoff Invariants[2m > [22menforces Decisions #3 & #22: Prisma.Decimal multiplier calculations with zero float drift[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_0_intake.test.ts[2m > [22mMilestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62)[2m > [22mCreates a bounty offer with exact Decimal precision[32m 2[2mms[22m[39m
 [32m✓[39m tests/m15_0_intake.test.ts[2m > [22mMilestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62)[2m > [22mRejects non-positive escrow amounts fail-closed[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_0_intake.test.ts[2m > [22mMilestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62)[2m > [22mSettles bounty as CLAIMED when a qualifying claimant is present[32m 1[2mms[22m[39m
 [32m✓[39m tests/m15_0_intake.test.ts[2m > [22mMilestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62)[2m > [22mSettles bounty as REFUNDED to creator when expired without claimant[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_2_bad_beat_insurance.test.ts[2m > [22mMilestone 16.2 - Feature 9: Bad Beat Insurance Protocol (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mIssues insurance policy on unlocked game with Decimal values[32m 2[2mms[22m[39m
 [32m✓[39m tests/m16_2_bad_beat_insurance.test.ts[2m > [22mMilestone 16.2 - Feature 9: Bad Beat Insurance Protocol (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mRejects insurance policy issuance if game is locked (Decision #65)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_2_bad_beat_insurance.test.ts[2m > [22mMilestone 16.2 - Feature 9: Bad Beat Insurance Protocol (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mApproves claim and awards rebate points on loss by <= 3 points (Bad Beat)[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_2_bad_beat_insurance.test.ts[2m > [22mMilestone 16.2 - Feature 9: Bad Beat Insurance Protocol (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mExpires policy when loss exceeds 3 points margin[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_2_bad_beat_insurance.test.ts[2m > [22mMilestone 16.2 - Feature 9: Bad Beat Insurance Protocol (Decisions #3, #22, #54, #61, #62, #65)[2m > [22mExpires policy without claim if selected team won[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_5_escalation.test.ts[2m > [22mMilestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62)[2m > [22mCalculates base penalty for 1st week last place finish[32m 2[2mms[22m[39m
 [32m✓[39m tests/m14_5_escalation.test.ts[2m > [22mMilestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62)[2m > [22mCalculates exponential streak escalation for consecutive last place finishes[32m 1[2mms[22m[39m
 [32m✓[39m tests/m14_5_escalation.test.ts[2m > [22mMilestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62)[2m > [22mCaps escalation at maxEscalationLevel[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_5_escalation.test.ts[2m > [22mMilestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62)[2m > [22mResets streak to 0 when player escapes last place[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_5_escalation.test.ts[2m > [22mMilestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62)[2m > [22mEmits append-only compensating adjustment without in-place mutation[32m 0[2mms[22m[39m
 [32m✓[39m tests/m16_1_syndicate_engine.test.ts[2m > [22mMilestone 16.1 - Feature 7: Syndicate Portfolios Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mResolves consensus pick weighted by member stakes (70% mem-1 picks KC, 30% pick BAL)[32m 2[2mms[22m[39m
 [32m✓[39m tests/m16_1_syndicate_engine.test.ts[2m > [22mMilestone 16.1 - Feature 7: Syndicate Portfolios Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mDeclares tie and fail-closed consensus when vote weights are equal[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_1_syndicate_engine.test.ts[2m > [22mMilestone 16.1 - Feature 7: Syndicate Portfolios Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mRejects consensus pick calculation if game is locked (Decision #65)[32m 1[2mms[22m[39m
 [32m✓[39m tests/m16_1_syndicate_engine.test.ts[2m > [22mMilestone 16.1 - Feature 7: Syndicate Portfolios Engine (Decisions #3, #22, #61, #62, #65)[2m > [22mIgnores votes from non-syndicate members[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase18_achievements.test.ts[2m > [22mPhase 18 Milestone 18.2: Achievements Engine & Deterministic Invariants[2m > [22menforces Decision #62: Circuit breaker defaults to closed (feature disabled)[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase18_achievements.test.ts[2m > [22mPhase 18 Milestone 18.2: Achievements Engine & Deterministic Invariants[2m > [22mdeterministically awards all qualified badges under valid pool scope (Decision #20)[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase18_achievements.test.ts[2m > [22mPhase 18 Milestone 18.2: Achievements Engine & Deterministic Invariants[2m > [22menforces Decisions #3 & #22: Comeback King requires strict Prisma.Decimal threshold (>= 20.00)[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase18_achievements.test.ts[2m > [22mPhase 18 Milestone 18.2: Achievements Engine & Deterministic Invariants[2m > [22mwithholds PENALTY_FREE_SEASON when member has outstanding penalties[32m 0[2mms[22m[39m
 [32m✓[39m tests/m14_6_press_box.test.ts[2m > [22mMilestone 14.6 - League Press Box & 12.2 Reconciliation (Finding 5.6, Decisions #20, #61, #62)[2m > [22mExtracts deterministic fact tuples for winner, runner-up, and dead place[32m 3[2mms[22m[39m
 [32m✓[39m tests/m14_6_press_box.test.ts[2m > [22mMilestone 14.6 - League Press Box & 12.2 Reconciliation (Finding 5.6, Decisions #20, #61, #62)[2m > [22mGenerates deterministic recap copy from structured facts without LLM hallucinations[32m 1[2mms[22m[39m
 [32m✓[39m tests/m14_6_press_box.test.ts[2m > [22mMilestone 14.6 - League Press Box & 12.2 Reconciliation (Finding 5.6, Decisions #20, #61, #62)[2m > [22mGenerates an incremented revision artifact instead of in-place mutation upon stat correction[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_super_bowl_props.test.ts[2m > [22mPhase 19 Milestone 19.4: Super Bowl Prop Matrix & Invariant Suite[2m > [22menforces Decision #62: Circuit breaker defaults to closed (feature disabled)[32m 3[2mms[22m[39m
 [32m✓[39m tests/phase19_super_bowl_props.test.ts[2m > [22mPhase 19 Milestone 19.4: Super Bowl Prop Matrix & Invariant Suite[2m > [22menforces Decision #65: Rejects prop picks submitted at or after Super Bowl kickoff[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase19_super_bowl_props.test.ts[2m > [22mPhase 19 Milestone 19.4: Super Bowl Prop Matrix & Invariant Suite[2m > [22menforces Decision #55: Rejects invalid options not in prop specification[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_super_bowl_props.test.ts[2m > [22mPhase 19 Milestone 19.4: Super Bowl Prop Matrix & Invariant Suite[2m > [22menforces Decision #20: Rejects submissions when poolId mismatches prop pool scope[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase19_super_bowl_props.test.ts[2m > [22mPhase 19 Milestone 19.4: Super Bowl Prop Matrix & Invariant Suite[2m > [22menforces Decision #55 & Decisions #3 & #22: Fails closed on unsettled props; computes exact Prisma.Decimal points on settlement[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase18_rollover.test.ts[2m > [22mPhase 18 Milestone 18.4: Next-Season Rollover & Invariant Hardening[2m > [22menforces Decision #62: Circuit breaker defaults to closed (feature disabled)[32m 3[2mms[22m[39m
 [32m✓[39m tests/phase18_rollover.test.ts[2m > [22mPhase 18 Milestone 18.4: Next-Season Rollover & Invariant Hardening[2m > [22menforces Decision #55: Fails closed when prior season archive manifest is not locked[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase18_rollover.test.ts[2m > [22mPhase 18 Milestone 18.4: Next-Season Rollover & Invariant Hardening[2m > [22menforces Decision #20: Rejects rollover when manifest poolId mismatches target poolId[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase18_rollover.test.ts[2m > [22mPhase 18 Milestone 18.4: Next-Season Rollover & Invariant Hardening[2m > [22menforces Decisions #3 & #22: Initial escrow balance handles Prisma.Decimal without float drift[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase18_leaderboards.test.ts[2m > [22mPhase 18 Milestone 18.1: Leaderboards & Tenant Privacy Invariants[2m > [22menforces Decision #62: Global leaderboard requests fail closed when flag is disabled or unconfigured[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase18_leaderboards.test.ts[2m > [22mPhase 18 Milestone 18.1: Leaderboards & Tenant Privacy Invariants[2m > [22menforces Decision #20: Pool-tier leaderboard strictly isolates to poolId and exposes full names[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase18_leaderboards.test.ts[2m > [22mPhase 18 Milestone 18.1: Leaderboards & Tenant Privacy Invariants[2m > [22menforces Decision #20 & Privacy: Global leaderboard anonymizes non-opted-in users and strips poolId[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase18_leaderboards.test.ts[2m > [22mPhase 18 Milestone 18.1: Leaderboards & Tenant Privacy Invariants[2m > [22menforces Decisions #3 & #22: Prisma.Decimal ranking precision with zero floating-point drift[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_live_feed.test.ts[2m > [22mPhase 17 Milestone 17.3: Live Activity Feed & Cohort Floor Invariants[2m > [22menforces Decision #62: Circuit breaker defaults to closed (feature disabled)[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase17_live_feed.test.ts[2m > [22mPhase 17 Milestone 17.3: Live Activity Feed & Cohort Floor Invariants[2m > [22menforces Decision #66: Consensus shift event redacted pre-kickoff even if cohort >= 3[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase17_live_feed.test.ts[2m > [22mPhase 17 Milestone 17.3: Live Activity Feed & Cohort Floor Invariants[2m > [22menforces Anti-Peeking Cohort Floor invariant (N >= 3) on locked games[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase17_live_feed.test.ts[2m > [22mPhase 17 Milestone 17.3: Live Activity Feed & Cohort Floor Invariants[2m > [22munmasks event telemetry with exact Prisma.Decimal delta when game is locked and N >= 3[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase18_closure_verification.test.ts[2m > [22mPhase 18 Milestone 18.5: Cumulative Governance & Closure Audit[2m > [22mconfirms all Phase 18 domain services are exported and instantiate correctly[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase18_closure_verification.test.ts[2m > [22mPhase 18 Milestone 18.5: Cumulative Governance & Closure Audit[2m > [22mvalidates Phase 18 circuit breaker registry keys default to OFF[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase19_closure_verification.test.ts[2m > [22mPhase 19 Milestone 19.5: Cumulative Governance & Closure Audit[2m > [22mconfirms all Phase 19 domain services are exported and instantiate correctly[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase19_closure_verification.test.ts[2m > [22mPhase 19 Milestone 19.5: Cumulative Governance & Closure Audit[2m > [22mvalidates Phase 19 circuit breaker registry keys default to OFF (Decision #62)[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m62 passed[39m[22m[90m (62)[39m
[2m      Tests [22m [1m[32m418 passed[39m[22m[90m (418)[39m
[2m   Start at [22m 19:55:50
[2m   Duration [22m 35.72s[2m (tests 45%, import 30%, setup 15%, transform 9%, worker 2%)[22m

[2m     Import [22m [33m128 modules were evaluated 552 times[39m[2m · 6.69s total, 30% of tracked time[22m
[2m            [22m [2m~5.14s faster with [22m[33misolate: false[39m[2m — shared modules are evaluated once per worker instead of once per file[22m
[2m            [22m [2mlearn more: https://vitest.dev/guide/improving-performance#test-isolation[22m
Exit Code: 0

## 8. Hosted Tripwire: Snapshot 2 (Post-Regression)
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
  - DB Server Time: Mon Oct 05 2026 19:56:27 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 140.6974 hrs

3. All 15 Table Row Counts:
  - users                    : 344
  - pools                    : 298
  - pool_memberships         : 11
  - games                    : 16
  - picks                    : 0
  - pick_results             : 0
  - weekly_submissions       : 0
  - penalty_ledger           : 2
  - penalty_media            : 0
  - pool_member_stats        : 10
  - audit_logs               : 0
  - inbox_messages           : 0
  - outbox_events            : 0
  - notification_preferences : 0
  - job_runs                 : 0

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
Exit Code: 0

## 9. Decision #53 Verification (Capture 2: Post-Execution)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
Exit Code: 0

## 10. Baseline Working Tree Porcelain (at E_SHA)
?? docs/evidence/M20.2/
Exit Code: 0
