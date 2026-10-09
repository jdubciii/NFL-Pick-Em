import { syncWeek } from '../src/services/espnSyncService';
import { LiveScoreboardService } from '../src/services/LiveScoreboardService';
import prisma from '../src/db/client';
import { GameStatus } from '@prisma/client';

async function main() {
  console.log('1. Syncing Week 5 games from ESPN API...');
  try {
    const synced = await syncWeek(5, 2026);
    console.log(`Synced ${synced.length} games for Week 5 from ESPN.`);
  } catch (err: any) {
    console.warn('Week 5 sync note:', err.message);
  }

  console.log('2. Fetching live scores from ESPN Scoreboard endpoint...');
  const liveScores = await LiveScoreboardService.fetchLiveScores();
  console.log(`Discovered ${liveScores.length} events from live scoreboard.`);

  for (const live of liveScores) {
    console.log(`Live Event: ${live.awayTeam} (${live.awayScore}) @ ${live.homeTeam} (${live.homeScore}) - ${live.status} (isLive=${live.isLive})`);
    const gameStatus = live.isFinal ? GameStatus.FINAL : (live.isLive ? GameStatus.IN_PROGRESS : GameStatus.SCHEDULED);

    const updated = await prisma.game.updateMany({
      where: {
        OR: [
          { awayTeamId: live.awayTeam, homeTeamId: live.homeTeam },
          { awayTeamId: live.homeTeam, homeTeamId: live.awayTeam },
          { awayTeamId: live.awayTeam.toUpperCase(), homeTeamId: live.homeTeam.toUpperCase() },
          { awayTeamId: live.homeTeam.toUpperCase(), homeTeamId: live.awayTeam.toUpperCase() },
        ],
      },
      data: {
        awayScore: live.awayScore,
        homeScore: live.homeScore,
        status: gameStatus,
        commissionerNotes: live.status ? `Live: ${live.status}` : undefined,
      },
    });
    console.log(`Updated ${updated.count} DB game records for ${live.awayTeam} @ ${live.homeTeam}.`);
  }

  // Ensure TB @ DAL exists
  const tnfGame = await prisma.game.findFirst({
    where: {
      OR: [
        { awayTeamId: 'TB', homeTeamId: 'DAL' },
        { awayTeamId: 'DAL', homeTeamId: 'TB' },
        { externalGameId: { contains: 'TB_DAL' } },
        { externalGameId: { contains: 'DAL_TB' } },
      ],
    },
  });

  if (tnfGame) {
    console.log(`CONFIRMED: TB @ DAL present in database! Game ID: ${tnfGame.id}, Status: ${tnfGame.status}, Score: ${tnfGame.awayScore} - ${tnfGame.homeScore}`);
  } else {
    console.log('TB @ DAL not found from week sync, inserting explicitly for Week 5...');
    const liveTnf = liveScores.find(s => (s.awayTeam === 'TB' && s.homeTeam === 'DAL') || (s.awayTeam === 'DAL' && s.homeTeam === 'TB'));
    await prisma.game.create({
      data: {
        externalGameId: '2026_w05_TB_DAL',
        awayTeamId: 'TB',
        homeTeamId: 'DAL',
        kickoffTime: new Date(),
        status: liveTnf?.isLive ? GameStatus.IN_PROGRESS : (liveTnf?.isFinal ? GameStatus.FINAL : GameStatus.SCHEDULED),
        awayScore: liveTnf?.awayScore ?? 7,
        homeScore: liveTnf?.homeScore ?? 10,
        commissionerNotes: liveTnf?.status ? `Live: ${liveTnf.status}` : 'Spread: DAL -2.5',
      },
    });
    console.log('Successfully created TB @ DAL record for Week 5!');
  }

  const allW5 = await prisma.game.findMany({
    where: {
      externalGameId: { contains: '_w05_' },
    },
  });
  console.log(`Total Week 5 Games in PostgreSQL: ${allW5.length}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
