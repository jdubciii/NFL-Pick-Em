export interface MemberSlateInput {
  id: string;
  name: string;
  bankedPoints: number;
  remainingPicks: {
    gameId: string;
    pick: 'HOME' | 'AWAY';
    winProb: number;
  }[];
}

export interface SimulationResult {
  memberId: string;
  name: string;
  projectedPoints: number;
  winEquity: number;
  deadPlaceRisk: number;
}

export class BackendMonteCarloEngine {
  simulateSlate(members: MemberSlateInput[], runs: number = 1000): SimulationResult[] {
    const memberScores: Record<string, { totalPoints: number; wins: number; deadFinishes: number }> = {};

    for (const m of members) {
      memberScores[m.id] = { totalPoints: 0, wins: 0, deadFinishes: 0 };
    }

    const uniqueGames = new Map<string, number>();
    for (const m of members) {
      for (const p of m.remainingPicks) {
        if (!uniqueGames.has(p.gameId)) {
          uniqueGames.set(p.gameId, p.winProb);
        }
      }
    }

    for (let r = 0; r < runs; r++) {
      const gameOutcomes: Record<string, 'HOME' | 'AWAY'> = {};
      for (const [gameId, awayWinProb] of uniqueGames.entries()) {
        gameOutcomes[gameId] = Math.random() < awayWinProb ? 'AWAY' : 'HOME';
      }

      const runPoints: { id: string; points: number }[] = [];
      for (const m of members) {
        let pts = m.bankedPoints;
        for (const p of m.remainingPicks) {
          if (gameOutcomes[p.gameId] === p.pick) {
            pts += 1;
          }
        }
        memberScores[m.id].totalPoints += pts;
        runPoints.push({ id: m.id, points: pts });
      }

      runPoints.sort((a, b) => b.points - a.points);
      const topScore = runPoints[0].points;
      const bottomScore = runPoints[runPoints.length - 1].points;

      for (const item of runPoints) {
        if (item.points === topScore) memberScores[item.id].wins += 1;
        if (item.points === bottomScore) memberScores[item.id].deadFinishes += 1;
      }
    }

    return members.map((m) => {
      const stats = memberScores[m.id];
      return {
        memberId: m.id,
        name: m.name,
        projectedPoints: Number((stats.totalPoints / runs).toFixed(1)),
        winEquity: Number(((stats.wins / runs) * 100).toFixed(1)),
        deadPlaceRisk: Number(((stats.deadFinishes / runs) * 100).toFixed(1))
      };
    });
  }
}

export const backendMonteCarloEngine = new BackendMonteCarloEngine();
