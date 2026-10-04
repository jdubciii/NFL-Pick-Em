import { PickVisibilityService } from './pickVisibility';

export interface CommandBarActionRequest {
  action: 'NEXT_UNPICKED' | 'FAVORITES' | 'FLIP_ALL' | 'MIRROR_CONSENSUS' | 'CLEAR_UNLOCKED';
  poolId: string;
  membershipId: string;
  slateGames: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    isLocked: boolean;
  }>;
  currentPicks: Record<string, string>; // gameId -> team
  consensusData?: {
    gameId: string;
    consensusTeam: string;
    sampleSize: number;
  }[];
}

export interface CommandBarActionResult {
  updatedPicks: Record<string, string>;
  rejectedGames: string[]; // gameIds that were locked and could not be altered
  appliedAction: string;
}

export class MatrixCommandBarService {
  static executeSweep(req: CommandBarActionRequest): CommandBarActionResult {
    const updated = { ...req.currentPicks };
    const rejected: string[] = [];

    switch (req.action) {
      case 'FAVORITES':
        // Default favorites heuristic: pick home team on unlocked games
        for (const game of req.slateGames) {
          if (game.isLocked) {
            rejected.push(game.id);
            continue;
          }
          updated[game.id] = game.homeTeam;
        }
        break;

      case 'FLIP_ALL':
        // Flip selections on all unlocked games
        for (const game of req.slateGames) {
          if (game.isLocked) {
            rejected.push(game.id);
            continue;
          }
          const current = updated[game.id];
          if (current === game.homeTeam) {
            updated[game.id] = game.awayTeam;
          } else if (current === game.awayTeam) {
            updated[game.id] = game.homeTeam;
          } else {
            updated[game.id] = game.homeTeam; // Default if unpicked
          }
        }
        break;

      case 'CLEAR_UNLOCKED':
        // Clear picks only on unlocked games
        for (const game of req.slateGames) {
          if (game.isLocked) {
            rejected.push(game.id);
            continue;
          }
          delete updated[game.id];
        }
        break;

      case 'MIRROR_CONSENSUS':
        // Finding 5.6: Anti-leakage guard using PickVisibilityService cohort floor (N >= 3)
        if (!req.consensusData) break;

        for (const consensus of req.consensusData) {
          const game = req.slateGames.find(g => g.id === consensus.gameId);
          if (!game || game.isLocked) {
            if (game?.isLocked) rejected.push(game.id);
            continue;
          }

          // Must satisfy anti-peeking cohort floor
          if (PickVisibilityService.canExposeAggregate(consensus.sampleSize)) {
            updated[game.id] = consensus.consensusTeam;
          }
        }
        break;

      case 'NEXT_UNPICKED':
      default:
        // No-op for sweep calculation; UI navigation indicator
        break;
    }

    return {
      updatedPicks: updated,
      rejectedGames: rejected,
      appliedAction: req.action
    };
  }
}
