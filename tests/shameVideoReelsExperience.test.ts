import { describe, it, expect } from 'vitest';
import {
  deriveNarrativeBadges,
  HistoricalWeekRecord
} from '../src/services/reputationEngineService';

describe('M34.3 Video-First Experience & Narrative Badge Receipts', () => {
  it('generates specific defining moment receipts for Escape Artist badge', () => {
    const history: HistoricalWeekRecord[] = [
      {
        weekNumber: 2,
        rank: 9,
        totalParticipants: 10,
        points: 6.2,
        isDeadPlace: false,
        isDangerSeat: true,
        marginToDeadPlace: 0.5,
        isAutopilot: false,
        isWeeklyWinner: false
      }
    ];

    const badges = deriveNarrativeBadges(history);
    const escapeArtist = badges.find((b) => b.id === 'ESCAPE_ARTIST');

    expect(escapeArtist).toBeDefined();
    expect(escapeArtist?.isEarned).toBe(true);
    expect(escapeArtist?.definingMoment).toContain("Detroit's final drive");
    expect(escapeArtist?.definingMoment).toContain('Week 2');
    expect(escapeArtist?.definingMoment).toContain('0.5 pt margin');
  });

  it('generates specific defining moment receipts for Dead Place Monarch badge', () => {
    const history: HistoricalWeekRecord[] = [
      { weekNumber: 1, rank: 10, totalParticipants: 10, points: 5, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 3, rank: 10, totalParticipants: 10, points: 4, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 4, rank: 10, totalParticipants: 10, points: 3, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: false, isWeeklyWinner: false }
    ];

    const badges = deriveNarrativeBadges(history);
    const monarch = badges.find((b) => b.id === 'DEAD_PLACE_MONARCH');

    expect(monarch).toBeDefined();
    expect(monarch?.isEarned).toBe(true);
    expect(monarch?.definingMoment).toContain('Crowned after Week 4');
    expect(monarch?.definingMoment).toContain('3 Dead Place finishes recorded');
  });
});
