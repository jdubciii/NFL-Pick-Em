/**
 * Canonical Tiebreaker Ranking & Penalty Service
 * Authority: P41-TIEBREAKER-CONTRACT-2026-10-17-01
 * 
 * Rules:
 * 1. Higher final pick score always takes precedence over every tiebreaker criterion.
 * 2. Within each equal pick-score group:
 *    a. A valid, timely submitted prediction ranks above no prediction (null/undefined).
 *       (0.00 is a valid prediction; null is missing, NOT zero).
 *    b. Among valid predictions, smaller absolute distance from the designated game's
 *       official combined FINAL score (including overtime) wins.
 *    c. For equal absolute distance, a prediction at or below the final total ranks
 *       above one exceeding it (under/equal beats over).
 *    d. If still indistinguishable, retain a shared rank.
 * 3. Exact decimal arithmetic using integer hundredths to eliminate floating-point drift.
 * 4. Competition ranking: 1, 2, 2, 4.
 * 5. Ratified ten-member schedule:
 *    - Place 1: 0 shots (Safe Haven)
 *    - Place 2–6: 1 shot
 *    - Place 7–9: 2 shots
 *    - Place 10 / Dead Place: 2.5 shots
 *    Ties:
 *    - Shared first: everyone at that rank gets Safe Haven and 0 shots.
 *    - Shared non-bottom rank: each gets the charge for that shared rank.
 *    - Shared last below first: all joint Dead Place Monarchs receive 2.5 shots each.
 *    - Entire eligible field tied first: all owe 0 shots and there is no distinct Dead Place Monarch.
 *    - No dividing or averaging tied charges.
 */

export interface MemberEntry {
  userId: string;
  score: number; // Pick score (correct picks or points)
  tieBreakerPrediction?: number | string | null;
}

export interface RankedMemberResult {
  userId: string;
  score: number;
  tieBreakerPrediction: number | null;
  tiebreakerDistance: number | null;
  rank: number;
  shots: number;
  isSafeHaven: boolean;
  isDeadPlace: boolean;
  isSharedRank: boolean;
}

export interface TiebreakerRankingOptions {
  actualFinalTotal?: number | null; // Combined final score including OT
  tiebreakerOffered?: boolean; // false if entry was not offered (current-week safeguard)
}

/**
 * Compares two predictions against the official combined final score.
 * Returns negative if A ranks higher than B, positive if B ranks higher than A, 0 if tied.
 */
export function compareTiebreakerPredictions(
  aPred: number | string | null | undefined,
  bPred: number | string | null | undefined,
  actualFinalTotal: number
): number {
  const parsePrediction = (val: number | string | null | undefined): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const aVal = parsePrediction(aPred);
  const bVal = parsePrediction(bPred);

  const aHasPred = aVal !== null;
  const bHasPred = bVal !== null;

  // 1. Valid prediction ranks above no prediction
  if (aHasPred && !bHasPred) return -1;
  if (!aHasPred && bHasPred) return 1;
  if (!aHasPred && !bHasPred) return 0; // Both missing -> tied

  // 2. Both valid: exact hundredths integer arithmetic
  const aHundredths = Math.round(aVal! * 100);
  const bHundredths = Math.round(bVal! * 100);
  const actualHundredths = Math.round(actualFinalTotal * 100);

  const aDist = Math.abs(aHundredths - actualHundredths);
  const bDist = Math.abs(bHundredths - actualHundredths);

  if (aDist < bDist) return -1;
  if (aDist > bDist) return 1;

  // 3. Equal distance: under or equal beats over
  const aUnderOrEqual = aHundredths <= actualHundredths;
  const bUnderOrEqual = bHundredths <= actualHundredths;

  if (aUnderOrEqual && !bUnderOrEqual) return -1;
  if (!aUnderOrEqual && bUnderOrEqual) return 1;

  // 4. Still indistinguishable -> retain shared rank
  return 0;
}

/**
 * Computes official competition rankings and penalty shots for a field of members.
 */
export function calculateRankingsAndPenalties(
  members: MemberEntry[],
  options: TiebreakerRankingOptions = {}
): RankedMemberResult[] {
  if (!members || members.length === 0) {
    return [];
  }

  const tiebreakerOffered = options.tiebreakerOffered !== false;
  const actualTotal = options.actualFinalTotal;
  const canEvaluateTiebreaker = tiebreakerOffered && actualTotal !== null && actualTotal !== undefined;

  // 1. Group members by pick score descending
  // Convert score to exact hundredths integer for reliable grouping
  const scoreMap = new Map<number, MemberEntry[]>();
  for (const m of members) {
    const scoreVal = typeof m.score === 'number' ? m.score : Number(m.score) || 0;
    const scoreHundredths = Math.round(scoreVal * 100);
    if (!scoreMap.has(scoreHundredths)) {
      scoreMap.set(scoreHundredths, []);
    }
    scoreMap.get(scoreHundredths)!.push({
      ...m,
      score: scoreVal,
    });
  }

  const sortedScoreKeys = Array.from(scoreMap.keys()).sort((a, b) => b - a);

  // 2. Within each score group, order members using tiebreaker if offered
  // We produce an array of tied subgroups: each element of `orderedSubgroups`
  // is an array of members who are completely indistinguishable (shared rank).
  const orderedSubgroups: MemberEntry[][] = [];

  for (const scoreKey of sortedScoreKeys) {
    const groupMembers = scoreMap.get(scoreKey)!;

    if (!canEvaluateTiebreaker || groupMembers.length === 1) {
      if (!canEvaluateTiebreaker) {
        orderedSubgroups.push(groupMembers);
      } else {
        orderedSubgroups.push(groupMembers);
      }
      continue;
    }

    // Sort group members using tiebreaker comparison
    // We group identical tiebreaker results together
    const tiebreakerClusters: MemberEntry[][] = [];

    for (const member of groupMembers) {
      let placed = false;
      for (const cluster of tiebreakerClusters) {
        const cmp = compareTiebreakerPredictions(
          member.tieBreakerPrediction,
          cluster[0].tieBreakerPrediction,
          actualTotal!
        );
        if (cmp === 0) {
          cluster.push(member);
          placed = true;
          break;
        }
      }
      if (!placed) {
        tiebreakerClusters.push([member]);
      }
    }

    // Sort clusters among themselves
    tiebreakerClusters.sort((c1, c2) => {
      return compareTiebreakerPredictions(
        c1[0].tieBreakerPrediction,
        c2[0].tieBreakerPrediction,
        actualTotal!
      );
    });

    for (const cluster of tiebreakerClusters) {
      orderedSubgroups.push(cluster);
    }
  }

  // 3. Assign competition ranks: 1, 2, 2, 4
  const preRanked: Array<{
    member: MemberEntry;
    rank: number;
    isSharedRank: boolean;
    tiebreakerDistance: number | null;
  }> = [];

  let currentRank = 1;
  for (const subgroup of orderedSubgroups) {
    const isShared = subgroup.length > 1;
    for (const member of subgroup) {
      let distance: number | null = null;
      if (canEvaluateTiebreaker && member.tieBreakerPrediction !== null && member.tieBreakerPrediction !== undefined && member.tieBreakerPrediction !== '') {
        const num = Number(member.tieBreakerPrediction);
        if (!isNaN(num)) {
          distance = Math.round(Math.abs(num - actualTotal!) * 100) / 100;
        }
      }

      preRanked.push({
        member,
        rank: currentRank,
        isSharedRank: isShared,
        tiebreakerDistance: distance,
      });
    }
    currentRank += subgroup.length;
  }

  // 4. Calculate penalties according to the ratified schedule
  const isEntireFieldTiedFirst = preRanked.every((p) => p.rank === 1);
  const maxRank = Math.max(...preRanked.map((p) => p.rank));

  const results: RankedMemberResult[] = preRanked.map((item) => {
    const rawPred = item.member.tieBreakerPrediction;
    const parsedPred = rawPred !== null && rawPred !== undefined && rawPred !== '' && !isNaN(Number(rawPred))
      ? Number(rawPred)
      : null;

    let shots = 0;
    let isSafeHaven = false;
    let isDeadPlace = false;

    if (isEntireFieldTiedFirst || item.rank === 1) {
      shots = 0;
      isSafeHaven = true;
      isDeadPlace = false;
    } else if (item.rank === maxRank) {
      shots = 2.5;
      isSafeHaven = false;
      isDeadPlace = true;
    } else {
      isSafeHaven = false;
      isDeadPlace = false;
      if (item.rank >= 2 && item.rank <= 6) {
        shots = 1.0;
      } else if (item.rank >= 7 && item.rank <= 9) {
        shots = 2.0;
      } else {
        shots = 2.5;
      }
    }

    return {
      userId: item.member.userId,
      score: item.member.score,
      tieBreakerPrediction: parsedPred,
      tiebreakerDistance: item.tiebreakerDistance,
      rank: item.rank,
      shots,
      isSafeHaven,
      isDeadPlace,
      isSharedRank: item.isSharedRank,
    };
  });

  return results;
}
