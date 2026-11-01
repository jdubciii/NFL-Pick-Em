import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { WallOfShamePage } from '../client/src/pages/WallOfShamePage';
import { calculateProvisionalStandings, type SlateGame, type UserPickItem } from '../client/src/services/sweatProjectionService';
import { getJackWeek8HomeSpread, type LiveGame } from '../client/src/services/liveScoreService';

function setupMockDom() {
  const listeners: Record<string, Function[]> = {};
  const mockDoc = {
    visibilityState: 'visible',
    createElement: (tag: string) => ({
      tagName: tag.toUpperCase(),
      children: [] as any[],
      childNodes: [] as any[],
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      appendChild(child: any) {
        this.children.push(child);
        this.childNodes.push(child);
        return child;
      },
      removeChild(child: any) {
        this.children = this.children.filter((c: any) => c !== child);
        this.childNodes = this.childNodes.filter((c: any) => c !== child);
        return child;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      get textContent(): string {
        return this.children.map((c: any) => (typeof c === 'string' ? c : c.textContent || '')).join('');
      },
      set textContent(val: string) {
        this.children = [val];
        this.childNodes = [val];
      },
    }),
    addEventListener: (event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: Function) => {
      listeners[event] = (listeners[event] || []).filter((f) => f !== fn);
    },
    dispatchEvent: (event: { type: string }) => {
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
  };
  return { mockDoc, listeners };
}

describe('HAG-41 Ladder and Radar selective ATS scoring parity', () => {
  it('resolves Jack Week 8 spreads on WallOfShame matrix games even when DB spread is null', () => {
    const rawMatrixRow = {
      game_id: 'db-cin',
      external_game_id: 'espn-cin',
      home_team_id: 'CIN',
      away_team_id: 'TEN',
      kickoff_time: '2026-11-01T18:00:00Z',
      spread: null, // Null in Supabase matrix
    };

    const spread = getJackWeek8HomeSpread(8, rawMatrixRow.away_team_id, rawMatrixRow.home_team_id, 2026) ?? (rawMatrixRow.spread ?? undefined);
    expect(spread).toBe(-10.5);

    const jaxRow = { home_team_id: 'JAX', away_team_id: 'IND', spread: null };
    expect(getJackWeek8HomeSpread(8, jaxRow.away_team_id, jaxRow.home_team_id, 2026)).toBe(-10.5);

    const dalRow = { home_team_id: 'DAL', away_team_id: 'ARI', spread: null };
    expect(getJackWeek8HomeSpread(8, dalRow.away_team_id, dalRow.home_team_id, 2026)).toBe(-7.5);

    const detRow = { home_team_id: 'DET', away_team_id: 'MIN', spread: null };
    expect(getJackWeek8HomeSpread(8, detRow.away_team_id, detRow.home_team_id, 2026)).toBeNull();
  });

  it('produces identical standings where Jack is #1 under ATS and jcone2 is not #1', () => {
    const members = [
      { id: 'u-jack', name: 'jack.w.cone' },
      { id: 'u-jcone2', name: 'jcone2' },
    ];

    // Games with approved Week 8 spreads
    const games: SlateGame[] = [
      { id: 'g-cin', externalGameId: 'espn-cin', homeTeam: 'CIN', awayTeam: 'TEN', weekNumber: 8, seasonYear: 2026, spread: -10.5 },
      { id: 'g-jax', externalGameId: 'espn-jax', homeTeam: 'JAX', awayTeam: 'IND', weekNumber: 8, seasonYear: 2026, spread: -10.5 },
      { id: 'g-det', externalGameId: 'espn-det', homeTeam: 'DET', awayTeam: 'MIN', weekNumber: 8, seasonYear: 2026 }, // Straight up
    ];

    // Scores where favorites win straight up but underdogs cover:
    // CIN 14, TEN 13 (TEN +10.5 covers)
    // JAX 24, IND 17 (IND +10.5 covers)
    // DET 28, MIN 21 (DET wins straight up)
    const liveScores: LiveGame[] = [
      { id: 'espn-cin', name: 'TEN @ CIN', shortName: 'TEN @ CIN', status: 'FINAL', clock: 'FINAL', period: 4, seasonYear: 2026, homeTeam: { code: 'CIN', name: 'Bengals', score: '14' }, awayTeam: { code: 'TEN', name: 'Titans', score: '13' } },
      { id: 'espn-jax', name: 'IND @ JAX', shortName: 'IND @ JAX', status: 'FINAL', clock: 'FINAL', period: 4, seasonYear: 2026, homeTeam: { code: 'JAX', name: 'Jaguars', score: '24' }, awayTeam: { code: 'IND', name: 'Colts', score: '17' } },
      { id: 'espn-det', name: 'MIN @ DET', shortName: 'MIN @ DET', status: 'FINAL', clock: 'FINAL', period: 4, seasonYear: 2026, homeTeam: { code: 'DET', name: 'Lions', score: '28' }, awayTeam: { code: 'MIN', name: 'Vikings', score: '21' } },
    ];

    // Jack picked covers (TEN, IND) and DET.
    // jcone2 picked favorites straight up (CIN, JAX) and MIN.
    const picks: UserPickItem[] = [
      { userId: 'u-jack', gameId: 'g-cin', selectedTeam: 'TEN', isSubmitted: true },
      { userId: 'u-jack', gameId: 'g-jax', selectedTeam: 'IND', isSubmitted: true },
      { userId: 'u-jack', gameId: 'g-det', selectedTeam: 'DET', isSubmitted: true },
      { userId: 'u-jcone2', gameId: 'g-cin', selectedTeam: 'CIN', isSubmitted: true },
      { userId: 'u-jcone2', gameId: 'g-jax', selectedTeam: 'JAX', isSubmitted: true },
      { userId: 'u-jcone2', gameId: 'g-det', selectedTeam: 'MIN', isSubmitted: true },
    ];

    // 1. Without ATS provenance (the bug in deployed 2a6c931):
    const unspreadGames: SlateGame[] = games.map((g) => ({
      id: g.id, externalGameId: g.externalGameId, homeTeam: g.homeTeam, awayTeam: g.awayTeam,
      // Missing weekNumber, seasonYear, spread
    }));
    const buggyStandings = calculateProvisionalStandings(members, unspreadGames, liveScores, picks);
    // Under buggy straight-up scoring: jcone2 gets 2 pts (CIN, JAX won) and Jack gets 1 pt (DET won).
    expect(buggyStandings.find((s) => s.userId === 'u-jcone2')?.totalProvisionalPoints).toBe(2);
    expect(buggyStandings.find((s) => s.userId === 'u-jack')?.totalProvisionalPoints).toBe(1);
    expect(buggyStandings[0].userId).toBe('u-jcone2'); // jcone2 was wrongly #1 on Ladder!

    // 2. With ATS provenance (the fix):
    const correctStandings = calculateProvisionalStandings(members, games, liveScores, picks);
    // Under ATS scoring: Jack gets 3 pts (TEN +10.5 covered, IND +10.5 covered, DET won), jcone2 gets 0 pts.
    expect(correctStandings.find((s) => s.userId === 'u-jack')?.totalProvisionalPoints).toBe(3);
    expect(correctStandings.find((s) => s.userId === 'u-jcone2')?.totalProvisionalPoints).toBe(0);
    expect(correctStandings[0].userId).toBe('u-jack'); // Jack is correctly #1!
    expect(correctStandings[0].tier).toBe('SAFE_HAVEN');
    expect(correctStandings[1].tier).toBe('PIT');
  });
});
