import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  Phase20CoreService,
  FeatureFlagKey,
  WeeklyScoreEntry,
  ShotCamWorkflowState,
  SmsIngestPayload,
} from '../src/services/phase20CoreService';

describe('Phase 20 Milestone 20.0: Scaffolding, Decision #69 & Invariant Suite', () => {
  const poolId = 'pool_league_private_10';

  describe('Circuit Breaker Registry Defaults (Decision #62)', () => {
    it('asserts PRD_DEAD_PLACE_RULES defaults to OFF when store is empty or key unset', () => {
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.PRD_DEAD_PLACE_RULES)).toBe(false);
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.PRD_DEAD_PLACE_RULES, {})).toBe(false);
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.PRD_DEAD_PLACE_RULES, { PRD_DEAD_PLACE_RULES: false })).toBe(false);
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.PRD_DEAD_PLACE_RULES, { PRD_DEAD_PLACE_RULES: true })).toBe(true);
    });

    it('asserts SHOT_CAM_WORKFLOW defaults to OFF when store is empty or key unset', () => {
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.SHOT_CAM_WORKFLOW)).toBe(false);
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.SHOT_CAM_WORKFLOW, {})).toBe(false);
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.SHOT_CAM_WORKFLOW, { SHOT_CAM_WORKFLOW: true })).toBe(true);
    });

    it('asserts SMS_FALLBACK_INGEST defaults to OFF when store is empty or key unset', () => {
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.SMS_FALLBACK_INGEST)).toBe(false);
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.SMS_FALLBACK_INGEST, {})).toBe(false);
      expect(Phase20CoreService.isFlagEnabled(FeatureFlagKey.SMS_FALLBACK_INGEST, { SMS_FALLBACK_INGEST: true })).toBe(true);
    });
  });

  describe('Decision #69: Dead Place Rules & Parity Assertions', () => {
    it('forces no-show with nonzero caller points to 0.00 effective points and Dead Place when flag is ON', () => {
      const entries: WeeklyScoreEntry[] = [
        { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
        { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('5.00'), picksCount: 16 },
        { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('12.00'), picksCount: 0 },
      ];

      const res = Phase20CoreService.evaluateDeadPlacePenalties(entries, true, true);
      const u3 = res.find((r) => r.userId === 'u3')!;

      expect(u3.effectivePoints.toFixed(2)).toBe('0.00');
      expect(u3.isDeadPlace).toBe(true);
      expect(u3.penaltyShotsOwed.toFixed(2)).toBe('2.50');
      expect(u3.flatFineOwed.toFixed(2)).toBe('0.00');
    });

    it('evaluates two-way tie at absolute 2.50 Decimal each with zero splitting', () => {
      const entries: WeeklyScoreEntry[] = [
        { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
        { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
        { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
      ];

      const res = Phase20CoreService.evaluateDeadPlacePenalties(entries, true, true);
      const tied = res.filter((r) => r.isDeadPlace);
      expect(tied.length).toBe(2);
      expect(tied[0].penaltyShotsOwed.toFixed(2)).toBe('2.50');
      expect(tied[1].penaltyShotsOwed.toFixed(2)).toBe('2.50');
    });

    it('evaluates three-way tie at absolute 2.50 Decimal each with zero splitting', () => {
      const entries: WeeklyScoreEntry[] = [
        { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
        { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
        { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
        { userId: 'u4', membershipId: 'm4', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
      ];

      const res = Phase20CoreService.evaluateDeadPlacePenalties(entries, true, true);
      const tied = res.filter((r) => r.isDeadPlace);
      expect(tied.length).toBe(3);
      expect(tied[0].penaltyShotsOwed.toFixed(2)).toBe('2.50');
      expect(tied[1].penaltyShotsOwed.toFixed(2)).toBe('2.50');
      expect(tied[2].penaltyShotsOwed.toFixed(2)).toBe('2.50');
    });

    it('falls back strictly to canonical BR-4 behavior when flag is OFF (splits penalty and applies 2.00 fine)', () => {
      const entries: WeeklyScoreEntry[] = [
        { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
        { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
        { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
      ];

      const res = Phase20CoreService.evaluateDeadPlacePenalties(entries, false, true);
      const tied = res.filter((r) => r.isDeadPlace);
      expect(tied.length).toBe(2);
      expect(tied[0].penaltyShotsOwed.toFixed(2)).toBe('1.25');
      expect(tied[1].penaltyShotsOwed.toFixed(2)).toBe('1.25');
      expect(tied[0].flatFineOwed.toFixed(2)).toBe('2.00');
    });

    it('fails closed when week finalization is omitted or false', () => {
      const entries: WeeklyScoreEntry[] = [
        { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
      ];
      expect(() => Phase20CoreService.evaluateDeadPlacePenalties(entries, true, undefined)).toThrow('WEEK_NOT_FINALIZED');
      expect(() => Phase20CoreService.evaluateDeadPlacePenalties(entries, true, false)).toThrow('WEEK_NOT_FINALIZED');
    });

    it('enforces Decision #20 pool-tier isolation', () => {
      const mixed: WeeklyScoreEntry[] = [
        { userId: 'u1', membershipId: 'm1', poolId: 'pool_A', totalPoints: new Prisma.Decimal('5.00'), picksCount: 16 },
        { userId: 'u2', membershipId: 'm2', poolId: 'pool_B', totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
      ];
      expect(() => Phase20CoreService.evaluateDeadPlacePenalties(mixed, true, true)).toThrow('POOL_ISOLATION_VIOLATION');
    });
  });

  describe('Shot-Cam Finite State Machine Invariants (Decision #55 & #65)', () => {
    const kickoff = new Date('2026-10-08T18:00:00.000Z');
    const baseState: ShotCamWorkflowState = {
      mediaId: 'med_01',
      penaltyId: 'pen_01',
      poolId,
      userId: 'usr_01',
      currentState: 'PENDING_UPLOAD',
      isGameFinalized: false,
      gameKickoff: kickoff,
      history: [],
    };

    it('enforces Decision #65: Blocks actions prior to kickoff', () => {
      const preKickoff = Phase20CoreService.transitionShotCam(baseState, {
        eventType: 'UPLOAD',
        actorUserId: 'usr_01',
        timestamp: new Date('2026-10-08T17:59:59.000Z'),
      });
      expect(preKickoff.success).toBe(false);
      expect(preKickoff.error).toContain('LOCK_SUPREMACY_VIOLATION');
    });

    it('fails closed on unknown or invalid state transitions', () => {
      const invalid = Phase20CoreService.transitionShotCam(baseState, {
        eventType: 'APPROVE',
        actorUserId: 'admin_1',
        timestamp: new Date('2026-10-08T19:00:00.000Z'),
      });
      expect(invalid.success).toBe(false);
      expect(invalid.error).toContain('INVALID_STATE_TRANSITION');
    });

    it('transitions PENDING_UPLOAD -> UPLOAD -> COMMISSIONER_AUDIT', () => {
      const upload = Phase20CoreService.transitionShotCam(baseState, {
        eventType: 'UPLOAD',
        actorUserId: 'usr_01',
        timestamp: new Date('2026-10-08T19:00:00.000Z'),
      });
      expect(upload.success).toBe(true);
      expect(upload.state.currentState).toBe('COMMISSIONER_AUDIT');
    });

    it('blocks APPROVE when game is unfinalized', () => {
      const auditState: ShotCamWorkflowState = {
        ...baseState,
        currentState: 'COMMISSIONER_AUDIT',
        isGameFinalized: false,
      };

      const unfinalized = Phase20CoreService.transitionShotCam(auditState, {
        eventType: 'APPROVE',
        actorUserId: 'admin_1',
        timestamp: new Date('2026-10-08T20:00:00.000Z'),
      });
      expect(unfinalized.success).toBe(false);
      expect(unfinalized.error).toContain('UNFINALIZED_GAME');
    });

    it('handles RAISE_DISPUTE and blocks premature EXPIRE_DISPUTE until 24h boundary passes', () => {
      const auditState: ShotCamWorkflowState = {
        ...baseState,
        currentState: 'COMMISSIONER_AUDIT',
        isGameFinalized: true,
      };

      const raiseTime = new Date('2026-10-08T20:00:00.000Z');
      const raised = Phase20CoreService.transitionShotCam(auditState, {
        eventType: 'RAISE_DISPUTE',
        actorUserId: 'member_2',
        timestamp: raiseTime,
      });

      expect(raised.success).toBe(true);
      expect(raised.state.currentState).toBe('DISPUTE_WINDOW_ACTIVE');
      const expectedExpiry = new Date('2026-10-09T20:00:00.000Z');
      expect(raised.state.disputeWindowExpiresAt?.getTime()).toBe(expectedExpiry.getTime());

      // Premature expiration attempt
      const earlyExpire = Phase20CoreService.transitionShotCam(raised.state, {
        eventType: 'EXPIRE_DISPUTE',
        actorUserId: 'admin_1',
        timestamp: new Date('2026-10-09T19:59:59.000Z'),
      });
      expect(earlyExpire.success).toBe(false);
      expect(earlyExpire.error).toContain('DISPUTE_WINDOW_ACTIVE');

      // Valid expiration attempt at or after 24h boundary
      const validExpire = Phase20CoreService.transitionShotCam(raised.state, {
        eventType: 'EXPIRE_DISPUTE',
        actorUserId: 'admin_1',
        timestamp: new Date('2026-10-09T20:00:01.000Z'),
      });
      expect(validExpire.success).toBe(true);
      expect(validExpire.state.currentState).toBe('COMMISSIONER_AUDIT');
    });
  });

  describe('SMS Fallback Ingest Structural Contract', () => {
    it('validates structural non-empty tokens and tenant poolId', () => {
      const valid: SmsIngestPayload = {
        messageSid: 'SM123',
        fromPhoneNumber: '+15555550100',
        body: 'KC, BUF',
        timestamp: new Date('2026-10-08T17:30:00.000Z'),
        poolId,
        idempotencyKey: 'idem_1',
        webhookSignature: 'sig_valid',
      };
      expect(Phase20CoreService.validateSmsIngestStructure(valid).valid).toBe(true);

      const invalid = { ...valid, webhookSignature: '' };
      expect(Phase20CoreService.validateSmsIngestStructure(invalid).valid).toBe(false);
    });
  });
});
