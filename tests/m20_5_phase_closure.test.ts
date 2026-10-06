import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase20CoreService, FeatureFlagKey, WeeklyScoreEntry } from '../src/services/phase20CoreService';
import { ShotCamService, ShotCamWorkflowState } from '../src/services/shotCamService';
import { AutopilotService, SmsFallbackIngestService, GameSlateMatchup } from '../src/services/autopilotService';
import { GamedayIntegrationService, MatrixMemberPick, LiveGameStatus } from '../src/services/gamedayIntegrationService';

describe('Milestone 20.5: Phase 20 Comprehensive Closure & E2E Integration Suite', () => {
  const poolId = 'pool_league_private_10';
  const kickoff = new Date('2026-10-08T18:00:00.000Z');
  const liveTime = new Date('2026-10-08T19:30:00.000Z');

  it('validates Decision #69 Dead Place penalty calculation end-to-end', () => {
    const scores: WeeklyScoreEntry[] = [
      { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('14.00'), picksCount: 16 },
      { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('11.00'), picksCount: 16 },
      { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('5.00'), picksCount: 0 }, // no-show
    ];

    const results = Phase20CoreService.evaluateDeadPlacePenalties(scores, true, true);
    const dead = results.find((r) => r.userId === 'u3')!;
    expect(dead.isDeadPlace).toBe(true);
    expect(dead.effectivePoints.toFixed(2)).toBe('0.00');
    expect(dead.penaltyShotsOwed.toFixed(2)).toBe('2.50');
    expect(dead.flatFineOwed.toFixed(2)).toBe('0.00');
  });

  it('validates Shot-Cam FSM with Decision #65 lock supremacy and 24h dispute lifecycle', () => {
    const wf = ShotCamService.initializeWorkflow('m_1', 'pen_1', poolId, 'u_pen', kickoff, false);

    // Blocked before kickoff
    const pre = ShotCamService.processTransition(
      wf,
      { eventType: 'UPLOAD', actorUserId: 'u_pen', timestamp: new Date('2026-10-08T17:59:00.000Z') },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(pre.success).toBe(false);

    // Allowed post-kickoff
    const uploaded = ShotCamService.processTransition(
      wf,
      { eventType: 'UPLOAD', actorUserId: 'u_pen', timestamp: liveTime },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(uploaded.success).toBe(true);
    expect(uploaded.newState?.currentState).toBe('COMMISSIONER_AUDIT');
  });

  it('validates Autopilot preset generation and SMS Fallback Ingest contracts', () => {
    const matchups: GameSlateMatchup[] = [
      { gameId: 'g1', homeTeam: 'KC', awayTeam: 'BAL', kickoff: new Date('2026-10-08T20:00:00.000Z'), spreadHome: -3.5 },
    ];
    const picks = AutopilotService.generatePicks(matchups, 'FAVORITES', liveTime);
    expect(picks[0].selectedTeam).toBe('KC');
    expect(picks[0].isLocked).toBe(false);

    const userPhoneMap = new Map([['+15555550100', 'u1']]);
    const sms = SmsFallbackIngestService.ingestMessage(
      {
        messageSid: 'SM_CLOSURE_01',
        fromPhoneNumber: '+15555550100',
        body: 'KC',
        timestamp: liveTime,
        poolId,
        idempotencyKey: 'IDEM_CLOSURE_01',
        webhookSignature: 'valid_sig',
      },
      userPhoneMap,
      { SMS_FALLBACK_INGEST: true }
    );
    expect(sms.status).toBe('ACCEPTED');
    expect(sms.parsedPicks).toEqual(['KC']);
  });

  it('validates pure read projection for Gameday Board and Sweat Radar (Decision #54)', () => {
    const members = Array.from({ length: 10 }, (_, i) => ({ userId: `u${i + 1}`, displayName: `P${i + 1}` }));
    const picks: MatrixMemberPick[] = members.map((m, i) => ({
      userId: m.userId,
      displayName: m.displayName,
      gameId: 'g1',
      selectedTeam: i === 9 ? 'BAL' : 'KC',
    }));
    const games: LiveGameStatus[] = [
      { gameId: 'g1', homeTeam: 'KC', awayTeam: 'BAL', homeScore: 24, awayScore: 20, quarter: 'Final', isFinal: true, kickoff },
    ];

    const board = GamedayIntegrationService.calculateGamedayBoard(poolId, members, picks, games, true);
    expect(board.totalMembers).toBe(10);
    expect(board.loneWolfAlerts.length).toBe(1);
    expect(board.projectedStandings[9].userId).toBe('u10');
    expect(board.projectedStandings[9].isProjectedDeadPlace).toBe(true);
    expect(board.projectedStandings[9].projectedPenaltyShots.toFixed(2)).toBe('2.50');
  });
});
