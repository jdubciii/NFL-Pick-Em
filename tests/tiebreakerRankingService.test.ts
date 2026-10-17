import { describe, it, expect } from 'vitest';
import {
  calculateRankingsAndPenalties,
  compareTiebreakerPredictions,
  MemberEntry,
} from '../src/services/tiebreakerRankingService';

describe('Canonical Tiebreaker Ranking & Penalty Contract (P41-TIEBREAKER-CONTRACT-2026-10-17-01)', () => {
  const ACTUAL_TOTAL = 45.0; // Official combined final score

  describe('compareTiebreakerPredictions', () => {
    it('ranks closer over prediction above farther under prediction', () => {
      // Actual: 45. A: 47 (distance 2, over), B: 42 (distance 3, under)
      const cmp = compareTiebreakerPredictions(47, 42, ACTUAL_TOTAL);
      expect(cmp).toBeLessThan(0); // A beats B
    });

    it('ranks equal-distance under prediction above over prediction', () => {
      // Actual: 45. A: 43 (distance 2, under), B: 47 (distance 2, over)
      const cmp = compareTiebreakerPredictions(43, 47, ACTUAL_TOTAL);
      expect(cmp).toBeLessThan(0); // A beats B (under beats over)
    });

    it('handles decimal precision and hundredth-based comparisons', () => {
      // Actual: 45.00. A: 45.24 (dist 0.24), B: 45.25 (dist 0.25)
      const cmp = compareTiebreakerPredictions(45.24, 45.25, ACTUAL_TOTAL);
      expect(cmp).toBeLessThan(0);
    });

    it('retains shared rank for identical predictions', () => {
      const cmp = compareTiebreakerPredictions(48.5, 48.5, ACTUAL_TOTAL);
      expect(cmp).toBe(0);
    });

    it('retains shared rank for missing/missing ties', () => {
      const cmp = compareTiebreakerPredictions(null, null, ACTUAL_TOTAL);
      expect(cmp).toBe(0);
    });

    it('ranks valid zero prediction above missing (null)', () => {
      const cmp = compareTiebreakerPredictions(0.0, null, ACTUAL_TOTAL);
      expect(cmp).toBeLessThan(0); // 0.00 is valid, null is missing
    });

    it('ranks valid prediction above undefined or empty string', () => {
      expect(compareTiebreakerPredictions(50, undefined, ACTUAL_TOTAL)).toBeLessThan(0);
      expect(compareTiebreakerPredictions(50, '', ACTUAL_TOTAL)).toBeLessThan(0);
    });
  });

  describe('calculateRankingsAndPenalties', () => {
    it('enforces higher pick score beating lower score regardless of tiebreaker prediction', () => {
      const members: MemberEntry[] = [
        { userId: 'u1', score: 10, tieBreakerPrediction: null }, // high score, no prediction
        { userId: 'u2', score: 9, tieBreakerPrediction: 45.0 },  // lower score, exact prediction
      ];

      const res = calculateRankingsAndPenalties(members, { actualFinalTotal: ACTUAL_TOTAL });
      expect(res[0].userId).toBe('u1');
      expect(res[0].rank).toBe(1);
      expect(res[0].shots).toBe(0);

      expect(res[1].userId).toBe('u2');
      expect(res[1].rank).toBe(2);
      expect(res[1].shots).toBe(2.5); // 2-member field bottom
    });

    it('orders standard fully ordered 10-member field to aggregate 13.5 shots', () => {
      const members: MemberEntry[] = [
        { userId: 'm1', score: 10, tieBreakerPrediction: 45.0 },
        { userId: 'm2', score: 9, tieBreakerPrediction: 44.0 },
        { userId: 'm3', score: 8, tieBreakerPrediction: 43.0 },
        { userId: 'm4', score: 7, tieBreakerPrediction: 42.0 },
        { userId: 'm5', score: 6, tieBreakerPrediction: 41.0 },
        { userId: 'm6', score: 5, tieBreakerPrediction: 40.0 },
        { userId: 'm7', score: 4, tieBreakerPrediction: 39.0 },
        { userId: 'm8', score: 3, tieBreakerPrediction: 38.0 },
        { userId: 'm9', score: 2, tieBreakerPrediction: 37.0 },
        { userId: 'm10', score: 1, tieBreakerPrediction: 36.0 },
      ];

      const res = calculateRankingsAndPenalties(members, { actualFinalTotal: ACTUAL_TOTAL });

      // Ranks 1 to 10
      expect(res.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      // Rank 1: 0 shots
      expect(res[0].shots).toBe(0);
      expect(res[0].isSafeHaven).toBe(true);

      // Ranks 2-6: 1 shot each
      for (let i = 1; i <= 5; i++) {
        expect(res[i].shots).toBe(1);
      }

      // Ranks 7-9: 2 shots each
      for (let i = 6; i <= 8; i++) {
        expect(res[i].shots).toBe(2);
      }

      // Rank 10: 2.5 shots (Dead Place Monarch)
      expect(res[9].shots).toBe(2.5);
      expect(res[9].isDeadPlace).toBe(true);

      // Aggregate shots: 0 + 5*1 + 3*2 + 2.5 = 13.5
      const totalShots = res.reduce((acc, r) => acc + r.shots, 0);
      expect(totalShots).toBe(13.5);
    });

    it('evaluates T-6 spanning 6th and 7th positions with 1 shot each and legitimately differing aggregate', () => {
      // 10 members: positions 6 and 7 tie on score and prediction
      const members: MemberEntry[] = [
        { userId: 'm1', score: 10, tieBreakerPrediction: 45.0 }, // rank 1 -> 0
        { userId: 'm2', score: 9, tieBreakerPrediction: 45.0 },  // rank 2 -> 1
        { userId: 'm3', score: 8, tieBreakerPrediction: 45.0 },  // rank 3 -> 1
        { userId: 'm4', score: 7, tieBreakerPrediction: 45.0 },  // rank 4 -> 1
        { userId: 'm5', score: 6, tieBreakerPrediction: 45.0 },  // rank 5 -> 1
        { userId: 'm6', score: 5, tieBreakerPrediction: 40.0 },  // rank 6 (tied) -> 1
        { userId: 'm7', score: 5, tieBreakerPrediction: 40.0 },  // rank 6 (tied) -> 1
        { userId: 'm8', score: 3, tieBreakerPrediction: 45.0 },  // rank 8 -> 2
        { userId: 'm9', score: 2, tieBreakerPrediction: 45.0 },  // rank 9 -> 2
        { userId: 'm10', score: 1, tieBreakerPrediction: 45.0 }, // rank 10 -> 2.5
      ];

      const res = calculateRankingsAndPenalties(members, { actualFinalTotal: ACTUAL_TOTAL });

      const ranks = res.map((r) => r.rank);
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 6, 8, 9, 10]);

      // T-6 gets 1 shot each (non-bottom shared rank)
      const t6_1 = res.find((r) => r.userId === 'm6')!;
      const t6_2 = res.find((r) => r.userId === 'm7')!;
      expect(t6_1.shots).toBe(1);
      expect(t6_2.shots).toBe(1);
      expect(t6_1.isSharedRank).toBe(true);

      // Aggregate shots: 0 + 4*1 + 2*1 + 2*2 + 2.5 = 12.5 shots
      const totalShots = res.reduce((acc, r) => acc + r.shots, 0);
      expect(totalShots).toBe(12.5);
    });

    it('evaluates joint 9th/10th last place with 2.5 shots each', () => {
      // 10 members: positions 9 and 10 tie on score and prediction
      const members: MemberEntry[] = [
        { userId: 'm1', score: 10, tieBreakerPrediction: 45.0 },
        { userId: 'm2', score: 9, tieBreakerPrediction: 45.0 },
        { userId: 'm3', score: 8, tieBreakerPrediction: 45.0 },
        { userId: 'm4', score: 7, tieBreakerPrediction: 45.0 },
        { userId: 'm5', score: 6, tieBreakerPrediction: 45.0 },
        { userId: 'm6', score: 5, tieBreakerPrediction: 45.0 },
        { userId: 'm7', score: 4, tieBreakerPrediction: 45.0 },
        { userId: 'm8', score: 3, tieBreakerPrediction: 45.0 },
        { userId: 'm9', score: 2, tieBreakerPrediction: 30.0 }, // tied last
        { userId: 'm10', score: 2, tieBreakerPrediction: 30.0 }, // tied last
      ];

      const res = calculateRankingsAndPenalties(members, { actualFinalTotal: ACTUAL_TOTAL });

      const ranks = res.map((r) => r.rank);
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 9]);

      // Both joint Dead Place Monarchs get 2.5 shots each
      const m9 = res.find((r) => r.userId === 'm9')!;
      const m10 = res.find((r) => r.userId === 'm10')!;
      expect(m9.shots).toBe(2.5);
      expect(m9.isDeadPlace).toBe(true);
      expect(m10.shots).toBe(2.5);
      expect(m10.isDeadPlace).toBe(true);

      // Total shots = 0 + 5*1 + 2*2 + 2*2.5 = 14.0 shots
      const totalShots = res.reduce((acc, r) => acc + r.shots, 0);
      expect(totalShots).toBe(14.0);
    });

    it('evaluates shared first place where all co-winners receive Safe Haven and 0 shots', () => {
      const members: MemberEntry[] = [
        { userId: 'm1', score: 10, tieBreakerPrediction: 44.0 }, // tied first
        { userId: 'm2', score: 10, tieBreakerPrediction: 44.0 }, // tied first
        { userId: 'm3', score: 8, tieBreakerPrediction: 40.0 },
        { userId: 'm4', score: 6, tieBreakerPrediction: 40.0 },
      ];

      const res = calculateRankingsAndPenalties(members, { actualFinalTotal: ACTUAL_TOTAL });
      expect(res[0].rank).toBe(1);
      expect(res[0].shots).toBe(0);
      expect(res[0].isSafeHaven).toBe(true);

      expect(res[1].rank).toBe(1);
      expect(res[1].shots).toBe(0);
      expect(res[1].isSafeHaven).toBe(true);

      expect(res[2].rank).toBe(3);
      expect(res[2].shots).toBe(1);

      expect(res[3].rank).toBe(4);
      expect(res[3].shots).toBe(2.5); // bottom of field
    });

    it('evaluates entire eligible field tied first with 0 shots and no Dead Place Monarch', () => {
      const members: MemberEntry[] = [
        { userId: 'm1', score: 7, tieBreakerPrediction: null },
        { userId: 'm2', score: 7, tieBreakerPrediction: null },
        { userId: 'm3', score: 7, tieBreakerPrediction: null },
      ];

      const res = calculateRankingsAndPenalties(members, { actualFinalTotal: ACTUAL_TOTAL });
      for (const r of res) {
        expect(r.rank).toBe(1);
        expect(r.shots).toBe(0);
        expect(r.isSafeHaven).toBe(true);
        expect(r.isDeadPlace).toBe(false);
      }
    });

    it('evaluates two-member field properly', () => {
      // Winner: rank 1 (0 shots), Loser: rank 2 (2.5 shots)
      const members: MemberEntry[] = [
        { userId: 'u1', score: 8, tieBreakerPrediction: 45.0 },
        { userId: 'u2', score: 6, tieBreakerPrediction: 45.0 },
      ];

      const res = calculateRankingsAndPenalties(members, { actualFinalTotal: ACTUAL_TOTAL });
      expect(res[0].rank).toBe(1);
      expect(res[0].shots).toBe(0);
      expect(res[1].rank).toBe(2);
      expect(res[1].shots).toBe(2.5);
      expect(res[1].isDeadPlace).toBe(true);

      // Two members tied:
      const tiedMembers: MemberEntry[] = [
        { userId: 'u1', score: 8, tieBreakerPrediction: 45.0 },
        { userId: 'u2', score: 8, tieBreakerPrediction: 45.0 },
      ];
      const tiedRes = calculateRankingsAndPenalties(tiedMembers, { actualFinalTotal: ACTUAL_TOTAL });
      expect(tiedRes[0].shots).toBe(0);
      expect(tiedRes[1].shots).toBe(0);
    });

    it('respects tiebreakerOffered: false safeguard without penalizing missing predictions', () => {
      // Current-week safeguard: members had no entry UI
      const members: MemberEntry[] = [
        { userId: 'm1', score: 9, tieBreakerPrediction: null },
        { userId: 'm2', score: 9, tieBreakerPrediction: null },
        { userId: 'm3', score: 7, tieBreakerPrediction: null },
      ];

      const res = calculateRankingsAndPenalties(members, {
        actualFinalTotal: ACTUAL_TOTAL,
        tiebreakerOffered: false, // entry was NOT offered
      });

      expect(res[0].rank).toBe(1);
      expect(res[0].shots).toBe(0);
      expect(res[1].rank).toBe(1);
      expect(res[1].shots).toBe(0);
      expect(res[2].rank).toBe(3);
      expect(res[2].shots).toBe(2.5);
    });
  });
});
