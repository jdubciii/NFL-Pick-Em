import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLiveNFLScores, processLiveScoreUpdate, LiveGame } from '../client/src/services/liveScoreService';
import { isKickoffLocked } from '../client/src/services/lockEnforcementService';

describe('ESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 1. Valid ESPN Payload Mapping into LiveGame objects
  it('maps valid ESPN scoreboard payload accurately into LiveGame objects', async () => {
    const mockEspnPayload = {
      events: [
        {
          id: '401671801',
          name: 'Kansas City Chiefs at Baltimore Ravens',
          shortName: 'KC @ BAL',
          status: {
            displayClock: '04:12',
            period: 3,
            type: {
              name: 'STATUS_IN_PROGRESS',
              description: 'In Progress'
            }
          },
          competitions: [
            {
              situation: {
                downDistanceText: '3rd & 4 at BAL 12',
                isRedZone: true
              },
              competitors: [
                {
                  homeAway: 'home',
                  team: { abbreviation: 'BAL', displayName: 'Baltimore Ravens' },
                  score: '20'
                },
                {
                  homeAway: 'away',
                  team: { abbreviation: 'KC', displayName: 'Kansas City Chiefs' },
                  score: '24'
                }
              ]
            }
          ]
        },
        {
          id: '401671802',
          name: 'Dallas Cowboys at Philadelphia Eagles',
          shortName: 'DAL @ PHI',
          status: {
            displayClock: '00:00',
            period: 4,
            type: {
              name: 'STATUS_FINAL',
              description: 'Final'
            }
          },
          competitions: [
            {
              situation: {
                downDistanceText: '',
                isRedZone: false
              },
              competitors: [
                {
                  homeAway: 'home',
                  team: { abbreviation: 'PHI', displayName: 'Philadelphia Eagles' },
                  score: '27'
                },
                {
                  homeAway: 'away',
                  team: { abbreviation: 'DAL', displayName: 'Dallas Cowboys' },
                  score: '17'
                }
              ]
            }
          ]
        }
      ]
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEspnPayload
    });
    vi.stubGlobal('fetch', mockFetch);

    const games: LiveGame[] = await fetchLiveNFLScores();

    expect(games).toHaveLength(2);

    // Verify Game 1 (In Progress, Red Zone)
    expect(games[0].id).toBe('401671801');
    expect(games[0].name).toBe('Kansas City Chiefs at Baltimore Ravens');
    expect(games[0].shortName).toBe('KC @ BAL');
    expect(games[0].status).toBe('IN_PROGRESS');
    expect(games[0].clock).toBe('04:12');
    expect(games[0].period).toBe(3);
    expect(games[0].isRedZone).toBe(true);
    expect(games[0].downDistanceText).toBe('3rd & 4 at BAL 12');
    expect(games[0].homeTeam).toEqual({ code: 'BAL', name: 'Baltimore Ravens', score: '20' });
    expect(games[0].awayTeam).toEqual({ code: 'KC', name: 'Kansas City Chiefs', score: '24' });

    // Verify Game 2 (Final)
    expect(games[1].id).toBe('401671802');
    expect(games[1].status).toBe('FINAL');
    expect(games[1].isRedZone).toBe(false);
    expect(games[1].homeTeam.score).toBe('27');
    expect(games[1].awayTeam.score).toBe('17');
  });

  // 2. Resilient Fallback: Circuit Breakers for 500 error, network offline, malformed JSON
  it('falls back gracefully to empty array on HTTP 500 error without throwing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });
    vi.stubGlobal('fetch', mockFetch);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const games = await fetchLiveNFLScores();

    expect(games).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('falls back gracefully to empty array on offline network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch: NetworkOffline'));
    vi.stubGlobal('fetch', mockFetch);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const games = await fetchLiveNFLScores();

    expect(games).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('falls back gracefully on malformed JSON payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('Unexpected token in JSON'); }
    });
    vi.stubGlobal('fetch', mockFetch);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const games = await fetchLiveNFLScores();

    expect(games).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  // 3. Integrated Feed Isolation & State Preservation (Ruling C9 Compliance)
  it('exercises integrated consumer state preservation: isolates telemetry from user picks and kickoff locks', async () => {
    const referenceNow = new Date('2026-10-11T17:05:00.000Z');

    interface ConsumerState {
      games: LiveGame[];
      userPicks: { gameId: string; selection: string; locked: boolean }[];
      kickoffLocks: Record<string, boolean>;
    }

    const kickoffTimes: Record<string, string> = {
      '401671801': '2026-10-11T17:00:00.000Z',
      '401671802': '2026-10-11T20:20:00.000Z',
    };

    const initialConsumerState: ConsumerState = {
      games: [],
      userPicks: [
        {
          gameId: '401671801',
          selection: 'BAL',
          locked: isKickoffLocked(kickoffTimes['401671801'], referenceNow),
        },
        {
          gameId: '401671802',
          selection: 'PHI',
          locked: isKickoffLocked(kickoffTimes['401671802'], referenceNow),
        },
      ],
      kickoffLocks: {
        '401671801': isKickoffLocked(kickoffTimes['401671801'], referenceNow),
        '401671802': isKickoffLocked(kickoffTimes['401671802'], referenceNow),
      },
    };

    // Deep baseline snapshot to verify strict immutability of consumer picks and locks
    const expectedPicksSnapshot = JSON.parse(JSON.stringify(initialConsumerState.userPicks));
    const expectedLocksSnapshot = JSON.parse(JSON.stringify(initialConsumerState.kickoffLocks));

    // Initial boundary assertions
    expect(initialConsumerState.userPicks[0].locked).toBe(true);  // Past kickoff locked
    expect(initialConsumerState.userPicks[1].locked).toBe(false); // Future kickoff open
    expect(initialConsumerState.kickoffLocks['401671801']).toBe(true);
    expect(initialConsumerState.kickoffLocks['401671802']).toBe(false);

    let consumerState: ConsumerState = {
      games: initialConsumerState.games,
      userPicks: initialConsumerState.userPicks,
      kickoffLocks: initialConsumerState.kickoffLocks,
    };

    // Step 1: Live score update arrives
    const incomingScoresBatch1: LiveGame[] = [
      {
        id: '401671801',
        name: 'Kansas City Chiefs at Baltimore Ravens',
        shortName: 'KC @ BAL',
        status: 'IN_PROGRESS',
        clock: '08:30',
        period: 2,
        isRedZone: false,
        downDistanceText: '1st & 10 at KC 40',
        homeTeam: { code: 'BAL', name: 'Baltimore Ravens', score: '14' },
        awayTeam: { code: 'KC', name: 'Kansas City Chiefs', score: '10' },
      },
    ];

    const inputGamesArg1 = [...incomingScoresBatch1];
    const updatedGames1 = processLiveScoreUpdate(consumerState.games, inputGamesArg1);

    // Assert returns new array reference without mutating input argument
    expect(updatedGames1).not.toBe(inputGamesArg1);
    expect(updatedGames1).toHaveLength(1);
    expect(updatedGames1[0].id).toBe('401671801');
    expect(inputGamesArg1).toEqual(incomingScoresBatch1);

    // Apply games update to consumer state (mirroring LiveGametrackStream / MatrixPage)
    consumerState = { ...consumerState, games: updatedGames1 };

    // Assert userPicks and kickoffLocks remain strictly unmutated
    expect(consumerState.userPicks).toEqual(expectedPicksSnapshot);
    expect(consumerState.kickoffLocks).toEqual(expectedLocksSnapshot);
    expect(initialConsumerState.userPicks).toEqual(expectedPicksSnapshot);
    expect(initialConsumerState.kickoffLocks).toEqual(expectedLocksSnapshot);

    // Step 2: Score change arrives (e.g. BAL 21 - KC 10)
    const incomingScoresBatch2: LiveGame[] = [
      {
        id: '401671801',
        name: 'Kansas City Chiefs at Baltimore Ravens',
        shortName: 'KC @ BAL',
        status: 'IN_PROGRESS',
        clock: '02:15',
        period: 2,
        isRedZone: true,
        downDistanceText: '1st & Goal at KC 3',
        homeTeam: { code: 'BAL', name: 'Baltimore Ravens', score: '21' },
        awayTeam: { code: 'KC', name: 'Kansas City Chiefs', score: '10' },
      },
    ];

    const inputGamesArg2 = [...incomingScoresBatch2];
    const updatedGames2 = processLiveScoreUpdate(consumerState.games, inputGamesArg2);

    expect(updatedGames2).not.toBe(inputGamesArg2);
    expect(updatedGames2[0].homeTeam.score).toBe('21');
    expect(inputGamesArg2).toEqual(incomingScoresBatch2);

    consumerState = { ...consumerState, games: updatedGames2 };

    // Assert userPicks and kickoffLocks remain strictly unmutated after score change
    expect(consumerState.userPicks).toEqual(expectedPicksSnapshot);
    expect(consumerState.kickoffLocks).toEqual(expectedLocksSnapshot);

    // Step 3: Network error dropout ([] fallback)
    const emptyDropoutBatch: LiveGame[] = [];
    const updatedGames3 = processLiveScoreUpdate(consumerState.games, emptyDropoutBatch);

    // Fallback preservation: existing games telemetry retained on network drop
    expect(updatedGames3).toBe(consumerState.games);
    expect(updatedGames3).toHaveLength(1);
    expect(updatedGames3[0].homeTeam.score).toBe('21');

    consumerState = { ...consumerState, games: updatedGames3 };

    // Assert userPicks and kickoffLocks remain strictly unmutated after network drop
    expect(consumerState.userPicks).toEqual(expectedPicksSnapshot);
    expect(consumerState.kickoffLocks).toEqual(expectedLocksSnapshot);
    expect(consumerState.userPicks[0].locked).toBe(true);
    expect(consumerState.userPicks[1].locked).toBe(false);
    expect(isKickoffLocked(kickoffTimes['401671801'], referenceNow)).toBe(true);
    expect(isKickoffLocked(kickoffTimes['401671802'], referenceNow)).toBe(false);
  });
});
