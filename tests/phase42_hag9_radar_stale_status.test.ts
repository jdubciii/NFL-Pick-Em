import { describe, it, expect } from 'vitest';
import {
  calculateProvisionalStandings,
  isFinalStatus,
  UserStandingRef,
  SlateGame,
  UserPickItem,
} from '../client/src/services/sweatProjectionService';
import {
  calculateRivalryShowdown,
} from '../client/src/services/rivalryShowdownService';
import { LiveGame } from '../client/src/services/liveScoreService';

describe('HAG-9: Authoritative FINAL Status Priority Over Stale Live Feed', () => {
  describe('isFinalStatus helper', () => {
    it('accurately identifies final status variants across systems', () => {
      expect(isFinalStatus('FINAL')).toBe(true);
      expect(isFinalStatus('final')).toBe(true);
      expect(isFinalStatus('F')).toBe(true);
      expect(isFinalStatus('COMPLETED')).toBe(true);
      expect(isFinalStatus('SETTLED')).toBe(true);
      expect(isFinalStatus('STATUS_FINAL')).toBe(true);
      expect(isFinalStatus('  final  ')).toBe(true);

      expect(isFinalStatus('SCHEDULED')).toBe(false);
      expect(isFinalStatus('IN_PROGRESS')).toBe(false);
      expect(isFinalStatus('LIVE')).toBe(false);
      expect(isFinalStatus('HALFTIME')).toBe(false);
      expect(isFinalStatus(null)).toBe(false);
      expect(isFinalStatus(undefined)).toBe(false);
      expect(isFinalStatus('')).toBe(false);
    });
  });

  describe('Rivalry Showdown shared-picks list (Bug 2)', () => {
    it('sets status to FINAL instead of SCHEDULED when database game is FINAL even if live feed is SCHEDULED', () => {
      const user: UserStandingRef = { id: 'u_jack', name: 'Jack' };
      const rival: UserStandingRef = { id: 'u_dave', name: 'Dave' };

      // Thursday game CAR @ GB is authoritative FINAL in DB (CAR 19, GB 27)
      const games: SlateGame[] = [
        {
          id: 'game-car-gb-uuid',
          homeTeam: 'GB',
          awayTeam: 'CAR',
          status: 'FINAL',
          homeScore: 27,
          awayScore: 19,
        },
      ];

      // Stale live feed says SCHEDULED with no scores
      const staleLiveScores: LiveGame[] = [
        {
          id: 'game-car-gb-uuid',
          name: 'CAR @ GB',
          shortName: 'CAR @ GB',
          status: 'SCHEDULED',
          clock: '00:00',
          period: 0,
          isRedZone: false,
          downDistanceText: '',
          homeTeam: { code: 'GB', name: 'Green Bay Packers', score: '0' },
          awayTeam: { code: 'CAR', name: 'Carolina Panthers', score: '0' },
        },
      ];

      // Both picked GB
      const userPicks: UserPickItem[] = [
        {
          userId: 'u_jack',
          gameId: 'game-car-gb-uuid',
          selectedTeam: 'GB',
          isSubmitted: true,
        },
      ];
      const rivalPicks: UserPickItem[] = [
        {
          userId: 'u_dave',
          gameId: 'game-car-gb-uuid',
          selectedTeam: 'GB',
          isSubmitted: true,
        },
      ];

      const result = calculateRivalryShowdown(
        user,
        rival,
        games,
        staleLiveScores,
        userPicks,
        rivalPicks
      );

      // 1. sharedPicks must have status FINAL, NEVER SCHEDULED
      expect(result.sharedPicks).toHaveLength(1);
      expect(result.sharedPicks[0].matchup).toBe('CAR @ GB');
      expect(result.sharedPicks[0].selectedTeam).toBe('GB');
      expect(result.sharedPicks[0].status).toBe('FINAL');
      expect(result.sharedPicks[0].status).not.toBe('SCHEDULED');

      // 2. Both users should have banked the GB win (+1)
      expect(result.userPoints.banked).toBe(1);
      expect(result.rivalPoints.banked).toBe(1);
      expect(result.userPoints.live).toBe(0);
      expect(result.rivalPoints.live).toBe(0);

      // 3. Finished game must never be a battleground
      expect(result.battlegrounds).toHaveLength(0);
    });

    it('does not add finished games with differing selections to active battlegrounds', () => {
      const user: UserStandingRef = { id: 'u_jack', name: 'Jack' };
      const rival: UserStandingRef = { id: 'u_dave', name: 'Dave' };

      const games: SlateGame[] = [
        {
          id: 'game-car-gb-uuid',
          homeTeam: 'GB',
          awayTeam: 'CAR',
          status: 'FINAL',
          homeScore: 27,
          awayScore: 19,
        },
      ];

      // Stale live feed says SCHEDULED
      const staleLiveScores: LiveGame[] = [
        {
          id: 'game-car-gb-uuid',
          name: 'CAR @ GB',
          shortName: 'CAR @ GB',
          status: 'SCHEDULED',
          clock: '00:00',
          period: 0,
          isRedZone: false,
          downDistanceText: '',
          homeTeam: { code: 'GB', name: 'Green Bay Packers', score: '0' },
          awayTeam: { code: 'CAR', name: 'Carolina Panthers', score: '0' },
        },
      ];

      // User picked GB (won), rival picked CAR (lost)
      const userPicks: UserPickItem[] = [
        {
          userId: 'u_jack',
          gameId: 'game-car-gb-uuid',
          selectedTeam: 'GB',
          isSubmitted: true,
        },
      ];
      const rivalPicks: UserPickItem[] = [
        {
          userId: 'u_dave',
          gameId: 'game-car-gb-uuid',
          selectedTeam: 'CAR',
          isSubmitted: true,
        },
      ];

      const result = calculateRivalryShowdown(
        user,
        rival,
        games,
        staleLiveScores,
        userPicks,
        rivalPicks
      );

      // Finished game is settled: Jack got 1, Dave got 0
      expect(result.userPoints.banked).toBe(1);
      expect(result.rivalPoints.banked).toBe(0);
      expect(result.pointGap).toBe(1);

      // Completed game must NOT appear in active battlegrounds
      expect(result.battlegrounds).toHaveLength(0);
      expect(result.duelDecider).toBeNull();
    });
  });

  describe('Provisional Standings & Swing Game Selection (Bug 1)', () => {
    it('keeps reported finished game in swing card without hiding it, and resolves status to FINAL', () => {
      const members: UserStandingRef[] = [
        { id: 'u_jack', name: 'Jack' },
        { id: 'u_dave', name: 'Dave' },
      ];

      // CAR @ GB has high leverage spread, DB status is FINAL
      const games: SlateGame[] = [
        {
          id: 'game-car-gb',
          homeTeam: 'GB',
          awayTeam: 'CAR',
          status: 'FINAL',
          homeScore: 27,
          awayScore: 19,
          spread: -7.5,
        },
      ];

      // Stale live telemetry says SCHEDULED
      const liveScores: LiveGame[] = [
        {
          id: 'game-car-gb',
          name: 'CAR @ GB',
          shortName: 'CAR @ GB',
          status: 'SCHEDULED',
          clock: '00:00',
          period: 0,
          isRedZone: false,
          downDistanceText: '',
          homeTeam: { code: 'GB', name: 'Green Bay Packers', score: '0' },
          awayTeam: { code: 'CAR', name: 'Carolina Panthers', score: '0' },
        },
      ];

      const picks: UserPickItem[] = [
        { userId: 'u_jack', gameId: 'game-car-gb', selectedTeam: 'GB' },
        { userId: 'u_dave', gameId: 'game-car-gb', selectedTeam: 'GB' },
      ];

      const standings = calculateProvisionalStandings(members, games, liveScores, picks);
      const jackStanding = standings.find((s) => s.userId === 'u_jack')!;

      // 1. CAR @ GB is not hidden or removed from the card
      expect(jackStanding.swingGame).not.toBeNull();
      expect(jackStanding.swingGame?.gameId).toBe('game-car-gb');
      expect(jackStanding.swingGame?.matchup).toBe('CAR @ GB');

      // 2. Its status is resolved to FINAL, never SCHEDULED
      expect(jackStanding.swingGame?.gameStatus).toBe('FINAL');
      expect(jackStanding.swingGame?.gameStatus).not.toBe('SCHEDULED');
    });

    it('when CAR @ GB is evaluated as swing game with stale live SCHEDULED, its status is FINAL and never SCHEDULED', () => {
      // Direct simulation: CAR @ GB on slate with stale live SCHEDULED
      const members: UserStandingRef[] = [{ id: 'u_jack', name: 'Jack' }];
      const games: SlateGame[] = [
        {
          id: 'game-car-gb',
          homeTeam: 'GB',
          awayTeam: 'CAR',
          status: 'FINAL',
          homeScore: 27,
          awayScore: 19,
        },
      ];
      const liveScores: LiveGame[] = [
        {
          id: 'game-car-gb',
          name: 'CAR @ GB',
          shortName: 'CAR @ GB',
          status: 'SCHEDULED',
          clock: '00:00',
          period: 0,
          isRedZone: false,
          downDistanceText: '',
          homeTeam: { code: 'GB', name: 'Green Bay Packers', score: '0' },
          awayTeam: { code: 'CAR', name: 'Carolina Panthers', score: '0' },
        },
      ];
      const picks: UserPickItem[] = [
        { userId: 'u_jack', gameId: 'game-car-gb', selectedTeam: 'GB' },
      ];

      const standings = calculateProvisionalStandings(members, games, liveScores, picks);
      const jackStanding = standings.find((s) => s.userId === 'u_jack')!;

      // The swing game card is NOT hidden/removed
      expect(jackStanding.swingGame).not.toBeNull();
      expect(jackStanding.swingGame?.gameId).toBe('game-car-gb');
      expect(jackStanding.swingGame?.matchup).toBe('CAR @ GB');

      // Crucially, its status is FINAL, NEVER SCHEDULED
      expect(jackStanding.swingGame?.gameStatus).toBe('FINAL');
      expect(jackStanding.swingGame?.gameStatus).not.toBe('SCHEDULED');
    });
  });

  describe('Radar Swing Game Card display rendering logic', () => {
    it('renders FINAL status with final score (CAR 19 @ GB 27) when authoritative game is FINAL and live feed is SCHEDULED', () => {
      // Replicate the exact display resolution logic implemented in RadarPage
      const activeSwingGame = {
        gameId: 'game-car-gb',
        matchup: 'CAR @ GB',
        userPick: 'GB',
        gameStatus: 'SCHEDULED', // even if stale
      };

      const games: SlateGame[] = [
        {
          id: 'game-car-gb',
          homeTeam: 'GB',
          awayTeam: 'CAR',
          status: 'FINAL',
          homeScore: 27,
          awayScore: 19,
        },
      ];

      const swingLiveMatch: LiveGame = {
        id: 'game-car-gb',
        name: 'CAR @ GB',
        shortName: 'CAR @ GB',
        status: 'SCHEDULED', // stale live feed
        clock: '00:00',
        period: 0,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'GB', name: 'Green Bay Packers', score: '0' },
        awayTeam: { code: 'CAR', name: 'Carolina Panthers', score: '0' },
      };

      const matchingGame = games.find((g) => g.id === activeSwingGame.gameId);
      const isFinal = isFinalStatus(activeSwingGame.gameStatus) || isFinalStatus((matchingGame as any)?.status) || isFinalStatus(swingLiveMatch?.status);

      expect(isFinal).toBe(true);

      // Score resolution
      const awayCode = swingLiveMatch?.awayTeam?.code || matchingGame?.awayTeam || '';
      const homeCode = swingLiveMatch?.homeTeam?.code || matchingGame?.homeTeam || '';

      const awayScore = matchingGame?.awayScore !== undefined
        ? String(matchingGame.awayScore)
        : swingLiveMatch?.awayTeam?.score;
      const homeScore = matchingGame?.homeScore !== undefined
        ? String(matchingGame.homeScore)
        : swingLiveMatch?.homeTeam?.score;

      const scoreText = `${awayCode} ${awayScore} @ ${homeCode} ${homeScore}`;
      const statusText = isFinal ? 'FINAL' : 'SCHEDULED';

      expect(statusText).toBe('FINAL');
      expect(statusText).not.toBe('SCHEDULED');
      expect(scoreText).toBe('CAR 19 @ GB 27');
    });
  });
});
