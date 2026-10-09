import { app } from './server';
import { startLiveScheduleDaemon } from './services/liveScheduleDaemon';
import { LiveScoreboardService } from './services/LiveScoreboardService';
import prisma from './db/client';
import { GameStatus } from '@prisma/client';

const PORT = process.env.PORT || 3000;

// --- LIVE_SCOREBOARD_POLLER (Phase 27 Live Testing) ---
export const startLiveScorePoller = () => {
  console.log('[LiveScoreboard] Initializing 15s ESPN polling daemon...');
  setInterval(async () => {
    try {
      const liveGames = await LiveScoreboardService.fetchLiveScores();
      for (const game of liveGames) {
        if (game.isLive || game.isFinal) {
          const gameStatus = game.isFinal ? GameStatus.FINAL : (game.isLive ? GameStatus.IN_PROGRESS : GameStatus.SCHEDULED);
          await prisma.game.updateMany({
            where: {
              OR: [
                { awayTeamId: game.awayTeam, homeTeamId: game.homeTeam },
                { awayTeamId: game.homeTeam, homeTeamId: game.awayTeam },
                { awayTeamId: game.awayTeam.toUpperCase(), homeTeamId: game.homeTeam.toUpperCase() },
                { awayTeamId: game.homeTeam.toUpperCase(), homeTeamId: game.awayTeam.toUpperCase() }
              ]
            },
            data: {
              awayScore: game.awayScore,
              homeScore: game.homeScore,
              status: gameStatus,
            }
          });
        }
      }
    } catch (err) {
      // Non-blocking log
    }
  }, 15000); // 15-second interval
};

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  startLiveScheduleDaemon();
  startLiveScorePoller();
});
// --- END LIVE_SCOREBOARD_POLLER ---
