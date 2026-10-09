import { describe, it, expect, vi } from 'vitest';
import { LiveScoreboardService } from '../src/services/LiveScoreboardService';

describe('LiveScoreboardService', () => {
  it('parses live ESPN events into LiveGameStatus schema', async () => {
    const mockApiResponse = {
      events: [
        {
          id: '401671800',
          status: {
            type: {
              shortDetail: 'Q3 08:42',
              state: 'in',
            },
          },
          competitions: [
            {
              situation: {
                possession: 'DAL',
                isRedZone: true,
              },
              competitors: [
                {
                  homeAway: 'home',
                  score: '21',
                  team: { abbreviation: 'DAL' },
                },
                {
                  homeAway: 'away',
                  score: '17',
                  team: { abbreviation: 'TB' },
                },
              ],
            },
          ],
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
    vi.stubGlobal('fetch', mockFetch);

    const scores = await LiveScoreboardService.fetchLiveScores();

    expect(scores).toHaveLength(1);
    expect(scores[0]).toEqual({
      gameId: '401671800',
      homeTeam: 'DAL',
      awayTeam: 'TB',
      homeScore: 21,
      awayScore: 17,
      status: 'Q3 08:42',
      isLive: true,
      isFinal: false,
      possession: 'DAL',
      inRedZone: true,
    });

    vi.unstubAllGlobals();
  });

  it('handles fetch network failures gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const scores = await LiveScoreboardService.fetchLiveScores();
    expect(scores).toEqual([]);

    vi.unstubAllGlobals();
  });
});
