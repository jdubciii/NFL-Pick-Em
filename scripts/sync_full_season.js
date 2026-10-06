const { PrismaClient, GameStatus } = require('@prisma/client');

const prisma = new PrismaClient();

function normalizeTeam(abbrev) {
  if (!abbrev) return 'UNK';
  const clean = abbrev.trim().toUpperCase();
  if (clean === 'WSH') return 'WAS';
  return clean;
}

function mapStatus(statusName, state, completed) {
  const normState = state?.toLowerCase();
  const normName = statusName?.toUpperCase();

  if (
    completed === true ||
    normState === 'post' ||
    normName === 'STATUS_FINAL' ||
    normName === 'STATUS_FINAL_OVERTIME' ||
    normName === 'STATUS_FINAL_PEN'
  ) {
    return GameStatus.FINAL;
  }

  if (
    normState === 'in' ||
    normName === 'STATUS_IN_PROGRESS' ||
    normName === 'STATUS_HALFTIME' ||
    normName === 'STATUS_END_PERIOD'
  ) {
    return GameStatus.IN_PROGRESS;
  }

  return GameStatus.SCHEDULED;
}

async function fetchESPNWeek(weekNumber) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${weekNumber}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'NFL-Pick-Em-Sync/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`ESPN fetch failed for week ${weekNumber}: ${res.status}`);
  }

  const data = await res.json();
  const events = data.events || [];

  return events.map((event) => {
    const comp = event.competitions?.[0];
    const competitors = comp?.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');

    const homeTeamId = normalizeTeam(home?.team?.abbreviation || 'HOME');
    const awayTeamId = normalizeTeam(away?.team?.abbreviation || 'AWAY');

    const statusObj = event.status?.type || comp?.status?.type;
    const status = mapStatus(statusObj?.name, statusObj?.state, statusObj?.completed);

    const isLiveOrFinal = status === GameStatus.IN_PROGRESS || status === GameStatus.FINAL;
    const homeScore = isLiveOrFinal && home?.score !== undefined ? parseInt(home.score, 10) : null;
    const awayScore = isLiveOrFinal && away?.score !== undefined ? parseInt(away.score, 10) : null;

    const spreadDetails = comp?.odds?.[0]?.details || null;
    const paddedWeek = String(weekNumber).padStart(2, '0');
    const externalGameId = `2026_w${paddedWeek}_${awayTeamId}_${homeTeamId}`;

    return {
      externalGameId,
      espnId: event.id,
      weekNumber,
      homeTeamId,
      awayTeamId,
      homeTeamName: home?.team?.displayName || homeTeamId,
      awayTeamName: away?.team?.displayName || awayTeamId,
      kickoffTime: new Date(event.date || comp?.date),
      status,
      homeScore: Number.isNaN(homeScore) ? null : homeScore,
      awayScore: Number.isNaN(awayScore) ? null : awayScore,
      spread: spreadDetails,
    };
  });
}

async function syncFullSeason() {
  console.log('====================================================');
  console.log('🏈 INGESTING FULL 2026 NFL REGULAR SEASON (WEEKS 1–18)');
  console.log('====================================================\n');

  const allIngestedGameIds = new Set();
  let totalGamesUpserted = 0;

  for (let week = 1; week <= 18; week++) {
    process.stdout.write(`>>> [Week ${String(week).padStart(2)}] Fetching from ESPN... `);
    const games = await fetchESPNWeek(week);
    process.stdout.write(`(${games.length} games) -> Upserting into DB... `);

    for (const g of games) {
      const paddedWeek = String(g.weekNumber).padStart(2, '0');
      const lowerExternalId = `2026_w${paddedWeek}_${g.awayTeamId.toLowerCase()}_${g.homeTeamId.toLowerCase()}`;
      const upperExternalId = g.externalGameId;

      let existing = await prisma.game.findFirst({
        where: {
          OR: [
            { externalGameId: upperExternalId },
            { externalGameId: lowerExternalId },
            { externalGameId: `espn_${g.espnId}` },
            {
              AND: [
                { homeTeamId: g.homeTeamId },
                { awayTeamId: g.awayTeamId },
                {
                  kickoffTime: {
                    gte: new Date(g.kickoffTime.getTime() - 24 * 3600 * 1000),
                    lte: new Date(g.kickoffTime.getTime() + 24 * 3600 * 1000),
                  },
                },
              ],
            },
          ],
        },
      });

      const commissionerNotes = g.spread ? `Spread: ${g.spread}` : existing?.commissionerNotes ?? null;

      let saved;
      if (existing) {
        saved = await prisma.game.update({
          where: { id: existing.id },
          data: {
            externalGameId: upperExternalId,
            homeTeamId: g.homeTeamId,
            awayTeamId: g.awayTeamId,
            kickoffTime: g.kickoffTime,
            status: g.status,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            commissionerNotes,
          },
        });
      } else {
        saved = await prisma.game.create({
          data: {
            externalGameId: upperExternalId,
            homeTeamId: g.homeTeamId,
            awayTeamId: g.awayTeamId,
            kickoffTime: g.kickoffTime,
            status: g.status,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            commissionerNotes,
          },
        });
      }

      allIngestedGameIds.add(saved.id);
      totalGamesUpserted++;
    }

    console.log(`✓ Done`);
  }

  console.log(`\n✓ Successfully upserted ${totalGamesUpserted} games across 18 weeks.`);

  // Purge any non-ESPN legacy or orphan games
  const allDbGames = await prisma.game.findMany({ include: { picks: true } });
  let purgedCount = 0;
  for (const dbGame of allDbGames) {
    if (!allIngestedGameIds.has(dbGame.id)) {
      if (dbGame.picks && dbGame.picks.length > 0) {
        for (const pk of dbGame.picks) {
          await prisma.pickResult.deleteMany({ where: { pickId: pk.id } });
        }
        await prisma.pick.deleteMany({ where: { gameId: dbGame.id } });
      }
      await prisma.game.delete({ where: { id: dbGame.id } });
      purgedCount++;
      console.log(`  ✗ Purged legacy orphan game: ${dbGame.externalGameId}`);
    }
  }
  if (purgedCount > 0) {
    console.log(`✓ Purged ${purgedCount} orphaned mock games.`);
  }

  // Re-grade finalized picks for Week 4
  const pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (pool) {
    const finalGames = await prisma.game.findMany({
      where: {
        status: GameStatus.FINAL,
        homeScore: { not: null },
        awayScore: { not: null },
      },
    });

    let gradedPicks = 0;
    for (const game of finalGames) {
      const winner =
        game.homeScore > game.awayScore
          ? game.homeTeamId
          : game.awayScore > game.homeScore
          ? game.awayTeamId
          : 'TIE';

      const picks = await prisma.pick.findMany({
        where: { gameId: game.id, poolId: pool.id },
      });

      for (const pk of picks) {
        const isCorrect = pk.selectedTeamId === winner;
        await prisma.pickResult.upsert({
          where: { pickId: pk.id },
          update: {
            isCorrect,
            pointsAwarded: isCorrect ? 1 : 0,
            finalizedAt: new Date(),
          },
          create: {
            pickId: pk.id,
            isCorrect,
            pointsAwarded: isCorrect ? 1 : 0,
            finalizedAt: new Date(),
          },
        });
        gradedPicks++;
      }
    }
    console.log(`✓ Re-graded ${gradedPicks} picks across ${finalGames.length} finalized season games.`);
  }

  const finalGameCount = await prisma.game.count();
  console.log(`\n====================================================`);
  console.log(`🏈 INGEST COMPLETE: Exactly ${finalGameCount} 2026 NFL regular season games in database.`);
  console.log(`====================================================\n`);

  await prisma.$disconnect();
}

syncFullSeason().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
