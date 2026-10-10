import { describe, it, expect } from 'vitest';
import {
  calculateUserDebtMetrics,
  deriveNarrativeBadges,
  calculateHeadToHeadStats,
  HistoricalWeekRecord
} from '../src/services/reputationEngineService';

describe('M31.1 Reputation Engine & Multi-Metric Penalty Ledger', () => {
  it('correctly aggregates multi-metric ledger balances and audit trail', () => {
    const rawLedger = [
      { id: '1', createdAt: '2026-09-01T00:00:00Z', amount: '+2.50', reason: 'Week 1 Dead Place' },
      { id: '2', createdAt: '2026-09-03T00:00:00Z', amount: '-2.50', reason: 'Week 1 Cleared' },
      { id: '3', createdAt: '2026-09-08T00:00:00Z', amount: '+2.50', reason: 'Week 2 Dead Place' },
      { id: '4', createdAt: '2026-09-10T00:00:00Z', amount: '+0.50', reason: 'Contempt of Court' }
    ];

    const metrics = calculateUserDebtMetrics(rawLedger);

    expect(metrics.lifetimeAssigned).toBe(5.50);
    expect(metrics.servedCleared).toBe(2.50);
    expect(metrics.outstandingDebt).toBe(3.00);
    expect(metrics.auditTrail).toHaveLength(4);
    expect(metrics.auditTrail[3].runningBalance).toBe(3.00);
  });

  it('correctly derives Dead Place Monarch badge when 10th place count >= 3', () => {
    const monarchHistory: HistoricalWeekRecord[] = [
      { weekNumber: 1, rank: 10, totalParticipants: 10, points: 5, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 2, rank: 10, totalParticipants: 10, points: 4, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 3, rank: 10, totalParticipants: 10, points: 3, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: false, isWeeklyWinner: false }
    ];

    const badges = deriveNarrativeBadges(monarchHistory);
    const monarch = badges.find((b) => b.id === 'DEAD_PLACE_MONARCH');

    expect(monarch?.isEarned).toBe(true);
  });

  it('correctly derives Escape Artist badge when surviving 9th place by < 1.0 point', () => {
    const escapeHistory: HistoricalWeekRecord[] = [
      { weekNumber: 1, rank: 9, totalParticipants: 10, points: 6.2, isDeadPlace: false, isDangerSeat: true, marginToDeadPlace: 0.5, isAutopilot: false, isWeeklyWinner: false }
    ];

    const badges = deriveNarrativeBadges(escapeHistory);
    const escape = badges.find((b) => b.id === 'ESCAPE_ARTIST');

    expect(escape?.isEarned).toBe(true);
  });

  it('correctly derives The Machine badge when using Autopilot for 3 consecutive weeks', () => {
    const machineHistory: HistoricalWeekRecord[] = [
      { weekNumber: 1, rank: 5, totalParticipants: 10, points: 7, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 2, isAutopilot: true, isWeeklyWinner: false },
      { weekNumber: 2, rank: 6, totalParticipants: 10, points: 6, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 2, isAutopilot: true, isWeeklyWinner: false },
      { weekNumber: 3, rank: 4, totalParticipants: 10, points: 8, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 3, isAutopilot: true, isWeeklyWinner: false }
    ];

    const badges = deriveNarrativeBadges(machineHistory);
    const machine = badges.find((b) => b.id === 'THE_MACHINE');

    expect(machine?.isEarned).toBe(true);
  });

  it('correctly derives Ghost badge when 0 dead places and 0 wins across >= 3 weeks', () => {
    const ghostHistory: HistoricalWeekRecord[] = [
      { weekNumber: 1, rank: 5, totalParticipants: 10, points: 7, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 2, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 2, rank: 6, totalParticipants: 10, points: 6, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 2, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 3, rank: 4, totalParticipants: 10, points: 8, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 3, isAutopilot: false, isWeeklyWinner: false }
    ];

    const badges = deriveNarrativeBadges(ghostHistory);
    const ghost = badges.find((b) => b.id === 'GHOST');

    expect(ghost?.isEarned).toBe(true);
  });

  it('calculates head-to-head records and danger seat forces', () => {
    const userAHistory: HistoricalWeekRecord[] = [
      { weekNumber: 1, rank: 2, totalParticipants: 10, points: 9, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 4, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 2, rank: 5, totalParticipants: 10, points: 6, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 2, isAutopilot: false, isWeeklyWinner: false }
    ];

    const userBHistory: HistoricalWeekRecord[] = [
      { weekNumber: 1, rank: 9, totalParticipants: 10, points: 5, isDeadPlace: false, isDangerSeat: true, marginToDeadPlace: 0.5, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 2, rank: 4, totalParticipants: 10, points: 7, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 3, isAutopilot: false, isWeeklyWinner: false }
    ];

    const h2h = calculateHeadToHeadStats('uA', 'UserA', 'uB', 'UserB', userAHistory, userBHistory);

    expect(h2h.targetWins).toBe(1);
    expect(h2h.rivalWins).toBe(1);
    expect(h2h.ties).toBe(0);
  });
});
