export interface RecapFactTuple {
  type: 'WEEKLY_WINNER' | 'DEAD_PLACE' | 'CLOSEST_SURVIVOR' | 'CONTRARIAN_HERO';
  subjectMembershipId: string;
  metric: string;
  value: string;
  sourceSnapshotId: string;
}

export interface WeeklyRecapArtifact {
  poolId: string;
  weekNo: number;
  revisionNumber: number;
  headline: string;
  narrativeBody: string;
  facts: RecapFactTuple[];
  generatedAt: Date;
}

export interface SettledPlayerStanding {
  membershipId: string;
  displayName: string;
  score: number;
  rank: number;
  correctPicksCount: number;
  totalPicksCount: number;
  isDeadPlace: boolean;
}

export class LeaguePressBoxService {
  // Reconciled with Milestone 12.2: Deterministic fact extraction from settled slate outcomes
  static extractFacts(
    poolId: string,
    weekNo: number,
    snapshotId: string,
    standings: SettledPlayerStanding[]
  ): RecapFactTuple[] {
    if (!standings || standings.length === 0) return [];

    const sorted = [...standings].sort((a, b) => b.score - a.score);
    const facts: RecapFactTuple[] = [];

    // 1. Weekly Winner
    const winner = sorted[0];
    facts.push({
      type: 'WEEKLY_WINNER',
      subjectMembershipId: winner.membershipId,
      metric: 'points',
      value: winner.score.toString(),
      sourceSnapshotId: snapshotId
    });

    // 2. Dead Place (Last Place)
    const deadPlace = sorted[sorted.length - 1];
    facts.push({
      type: 'DEAD_PLACE',
      subjectMembershipId: deadPlace.membershipId,
      metric: 'rank',
      value: deadPlace.rank.toString(),
      sourceSnapshotId: snapshotId
    });

    // 3. Closest Survivor (Runner-up or narrow escape)
    if (sorted.length > 2) {
      const runnerUp = sorted[1];
      facts.push({
        type: 'CLOSEST_SURVIVOR',
        subjectMembershipId: runnerUp.membershipId,
        metric: 'points',
        value: runnerUp.score.toString(),
        sourceSnapshotId: snapshotId
      });
    }

    return facts;
  }

  // Generates deterministic narrative copy (zero hallucination risk)
  static generateRecap(
    poolId: string,
    weekNo: number,
    facts: RecapFactTuple[],
    standings: SettledPlayerStanding[],
    revisionNumber: number = 1
  ): WeeklyRecapArtifact {
    const winnerFact = facts.find(f => f.type === 'WEEKLY_WINNER');
    const deadFact = facts.find(f => f.type === 'DEAD_PLACE');

    const winner = standings.find(s => s.membershipId === winnerFact?.subjectMembershipId);
    const deadPlace = standings.find(s => s.membershipId === deadFact?.subjectMembershipId);

    const winnerName = winner ? winner.displayName : 'Unknown';
    const deadName = deadPlace ? deadPlace.displayName : 'Unknown';

    const headline = revisionNumber > 1
      ? `Week ${weekNo} Official Recap (Revision ${revisionNumber}): ${winnerName} Takes the Slate`
      : `Week ${weekNo} Official Recap: ${winnerName} Takes the Slate`;

    const narrativeBody = `Week ${weekNo} action is in the books! ${winnerName} secured first place with ${winnerFact?.value || 0} points. On the cold side of the board, ${deadName} lands in the Dead Place ladder.`;

    return {
      poolId,
      weekNo,
      revisionNumber,
      headline,
      narrativeBody,
      facts,
      generatedAt: new Date()
    };
  }

  // Revision engine handling administrative stat corrections
  static createRecapRevision(
    previousRecap: WeeklyRecapArtifact,
    correctedStandings: SettledPlayerStanding[],
    newSnapshotId: string
  ): WeeklyRecapArtifact {
    const updatedFacts = this.extractFacts(
      previousRecap.poolId,
      previousRecap.weekNo,
      newSnapshotId,
      correctedStandings
    );

    return this.generateRecap(
      previousRecap.poolId,
      previousRecap.weekNo,
      updatedFacts,
      correctedStandings,
      previousRecap.revisionNumber + 1
    );
  }
}
