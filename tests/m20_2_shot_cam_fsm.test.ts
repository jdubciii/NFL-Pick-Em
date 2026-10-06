import { describe, it, expect } from 'vitest';
import { FeatureFlagKey } from '../src/config/featureFlags';
import { ShotCamService, ShotCamWorkflowState } from '../src/services/shotCamService';
import { ShotCamTransitionEvent } from '../src/services/phase20CoreService';

describe('Milestone 20.2: Shot-Cam Verification State Machine Invariants', () => {
  const poolId = 'pool_league_private_10';
  const kickoff = new Date('2026-10-08T18:00:00.000Z');
  const postKickoff = new Date('2026-10-08T19:00:00.000Z');

  const baseWorkflow: ShotCamWorkflowState = ShotCamService.initializeWorkflow(
    'media_1',
    'pen_1',
    poolId,
    'user_1',
    kickoff,
    false
  );

  it('enforces Decision #62: Rejects transitions when SHOT_CAM_WORKFLOW flag is OFF', () => {
    const uploadEvent: ShotCamTransitionEvent = {
      eventType: 'UPLOAD',
      actorUserId: 'user_1',
      timestamp: postKickoff,
    };

    const result = ShotCamService.processTransition(baseWorkflow, uploadEvent, { SHOT_CAM_WORKFLOW: false });
    expect(result.success).toBe(false);
    expect(result.error).toContain('CIRCUIT_BREAKER_TRIPPED');
  });

  it('enforces Decision #65: Rejects actions before gameKickoff', () => {
    const earlyEvent: ShotCamTransitionEvent = {
      eventType: 'UPLOAD',
      actorUserId: 'user_1',
      timestamp: new Date('2026-10-08T17:59:59.000Z'),
    };

    const result = ShotCamService.processTransition(baseWorkflow, earlyEvent, { SHOT_CAM_WORKFLOW: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain('LOCK_SUPREMACY_VIOLATION');
  });

  it('executes valid progression: PENDING_UPLOAD -> UPLOAD -> COMMISSIONER_AUDIT -> APPROVE -> VERIFIED', () => {
    // 1. Upload media
    const uploadRes = ShotCamService.processTransition(
      baseWorkflow,
      { eventType: 'UPLOAD', actorUserId: 'user_1', timestamp: postKickoff },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(uploadRes.success).toBe(true);
    expect(uploadRes.newState?.currentState).toBe('COMMISSIONER_AUDIT');

    // 2. Approve (requires finalized game)
    const finalizedState: ShotCamWorkflowState = {
      ...uploadRes.newState!,
      isGameFinalized: true,
    };

    const approveRes = ShotCamService.processTransition(
      finalizedState,
      { eventType: 'APPROVE', actorUserId: 'commish_1', timestamp: new Date('2026-10-08T22:00:00.000Z') },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(approveRes.success).toBe(true);
    expect(approveRes.newState?.currentState).toBe('VERIFIED');
    expect(ShotCamService.isVerified(approveRes.newState!)).toBe(true);
  });

  it('enforces Decision #55: Dispute lifecycle with 24-hour expiration boundary', () => {
    // State in COMMISSIONER_AUDIT
    const auditState: ShotCamWorkflowState = {
      ...baseWorkflow,
      currentState: 'COMMISSIONER_AUDIT',
      isGameFinalized: true,
    };

    const disputeTime = new Date('2026-10-08T20:00:00.000Z');
    const raiseRes = ShotCamService.processTransition(
      auditState,
      { eventType: 'RAISE_DISPUTE', actorUserId: 'peer_1', timestamp: disputeTime },
      { SHOT_CAM_WORKFLOW: true }
    );

    expect(raiseRes.success).toBe(true);
    expect(raiseRes.newState?.currentState).toBe('DISPUTE_WINDOW_ACTIVE');
    expect(raiseRes.newState?.disputeWindowExpiresAt?.getTime()).toBe(
      new Date('2026-10-09T20:00:00.000Z').getTime()
    );

    // Premature expire attempt before 24h
    const earlyExpire = ShotCamService.processTransition(
      raiseRes.newState!,
      { eventType: 'EXPIRE_DISPUTE', actorUserId: 'commish_1', timestamp: new Date('2026-10-09T19:59:59.000Z') },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(earlyExpire.success).toBe(false);
    expect(earlyExpire.error).toContain('DISPUTE_WINDOW_ACTIVE');

    // Valid expire at 24h boundary
    const validExpire = ShotCamService.processTransition(
      raiseRes.newState!,
      { eventType: 'EXPIRE_DISPUTE', actorUserId: 'commish_1', timestamp: new Date('2026-10-09T20:00:01.000Z') },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(validExpire.success).toBe(true);
    expect(validExpire.newState?.currentState).toBe('COMMISSIONER_AUDIT');
  });

  it('enforces Decision #55: Blocks approval while game is unfinalized', () => {
    const auditUnfinalized: ShotCamWorkflowState = {
      ...baseWorkflow,
      currentState: 'COMMISSIONER_AUDIT',
      isGameFinalized: false,
    };

    const approveRes = ShotCamService.processTransition(
      auditUnfinalized,
      { eventType: 'APPROVE', actorUserId: 'commish_1', timestamp: new Date('2026-10-08T21:00:00.000Z') },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(approveRes.success).toBe(false);
    expect(approveRes.error).toContain('UNFINALIZED_GAME');
  });
});
