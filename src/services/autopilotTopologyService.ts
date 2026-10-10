export interface RawGameLine {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  spread: number; // e.g. -2.5 (home favored)
}

export interface UserSubmittedPick {
  userId: string;
  userName: string;
  gameId: string;
  selectedTeam: string;
}

export interface AutopilotProvenanceResult {
  userId: string;
  isAutopilot: boolean;
  presetType?: 'FAVORITES' | 'CONTRARIAN';
  matchingCount: number;
  totalPicks: number;
}

export interface CompressedGameDistribution {
  away: number;
  home: number;
  loneWolfUserId: string | null;
  loneWolfTeam: string | null;
  isConsensus: boolean;
}

export interface CompressedTopologyDelta {
  event: 'TOPOLOGY_UPDATED';
  poolId: string;
  timestamp: string;
  lockedCohortCount: number;
  distribution: Record<string, CompressedGameDistribution>;
}

/**
 * Derives Autopilot Provenance strictly at runtime (Decision #61 Zero DDL).
 * Compares user picks against Tuesday frozen lines.
 * Enforces Shatter Rule: modifying a single pick revokes Autopilot status entirely.
 */
export function deriveAutopilotProvenance(
  userId: string,
  userPicks: UserSubmittedPick[],
  games: RawGameLine[]
): AutopilotProvenanceResult {
  const userPicksForGames = userPicks.filter((p) => p.userId === userId);
  const totalPicks = games.length;

  if (userPicksForGames.length < totalPicks || totalPicks === 0) {
    return {
      userId,
      isAutopilot: false,
      matchingCount: 0,
      totalPicks
    };
  }

  let favoritesMatches = 0;
  let contrarianMatches = 0;

  for (const game of games) {
    const pick = userPicksForGames.find((p) => p.gameId === game.gameId);
    if (!pick) continue;

    // Tuesday Vegas Favorites: spread < 0 favors home; spread > 0 favors away
    const favoriteTeam = game.spread <= 0 ? game.homeTeam : game.awayTeam;
    const underdogTeam = game.spread <= 0 ? game.awayTeam : game.homeTeam;

    if (pick.selectedTeam === favoriteTeam) {
      favoritesMatches++;
    }
    if (pick.selectedTeam === underdogTeam) {
      contrarianMatches++;
    }
  }

  // All-or-nothing Autopilot condition
  if (favoritesMatches === totalPicks) {
    return {
      userId,
      isAutopilot: true,
      presetType: 'FAVORITES',
      matchingCount: favoritesMatches,
      totalPicks
    };
  }

  if (contrarianMatches === totalPicks) {
    return {
      userId,
      isAutopilot: true,
      presetType: 'CONTRARIAN',
      matchingCount: contrarianMatches,
      totalPicks
    };
  }

  // Shatter Override triggered: user manually edited at least 1 pick
  return {
    userId,
    isAutopilot: false,
    matchingCount: Math.max(favoritesMatches, contrarianMatches),
    totalPicks
  };
}

/**
 * Generates an optimized, compressed SSE delta map for TOPOLOGY_UPDATED broadcasts.
 */
export function generateCompressedTopologyDelta(
  poolId: string,
  userPicks: UserSubmittedPick[],
  games: RawGameLine[]
): CompressedTopologyDelta {
  const distinctUsers = new Set(userPicks.map((p) => p.userId));
  const lockedCohortCount = distinctUsers.size;

  const distributionMap: Record<string, CompressedGameDistribution> = {};

  for (const game of games) {
    const picksForGame = userPicks.filter((p) => p.gameId === game.gameId);
    const homeCount = picksForGame.filter((p) => p.selectedTeam === game.homeTeam).length;
    const awayCount = picksForGame.filter((p) => p.selectedTeam === game.awayTeam).length;
    const total = picksForGame.length;

    let loneWolfUserId: string | null = null;
    let loneWolfTeam: string | null = null;
    const isConsensus = total > 0 && (homeCount === total || awayCount === total);

    if (total >= 3) {
      if (homeCount === 1 && awayCount === total - 1) {
        const wolf = picksForGame.find((p) => p.selectedTeam === game.homeTeam);
        loneWolfUserId = wolf ? wolf.userId : null;
        loneWolfTeam = game.homeTeam;
      } else if (awayCount === 1 && homeCount === total - 1) {
        const wolf = picksForGame.find((p) => p.selectedTeam === game.awayTeam);
        loneWolfUserId = wolf ? wolf.userId : null;
        loneWolfTeam = game.awayTeam;
      }
    }

    distributionMap[game.gameId] = {
      away: awayCount,
      home: homeCount,
      loneWolfUserId,
      loneWolfTeam,
      isConsensus
    };
  }

  return {
    event: 'TOPOLOGY_UPDATED',
    poolId,
    timestamp: new Date().toISOString(),
    lockedCohortCount,
    distribution: distributionMap
  };
}

/**
 * Simulates a debounced topology broadcast (500ms debounce buffer).
 */
export function createDebouncedTopologyBroadcaster(
  delayMs: number = 500,
  broadcastCallback: (delta: CompressedTopologyDelta) => void
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingDelta: CompressedTopologyDelta | null = null;

  return {
    scheduleBroadcast: (delta: CompressedTopologyDelta) => {
      pendingDelta = delta;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (pendingDelta) {
          broadcastCallback(pendingDelta);
          pendingDelta = null;
        }
      }, delayMs);
    },
    flush: () => {
      if (timer && pendingDelta) {
        clearTimeout(timer);
        broadcastCallback(pendingDelta);
        pendingDelta = null;
      }
    }
  };
}
