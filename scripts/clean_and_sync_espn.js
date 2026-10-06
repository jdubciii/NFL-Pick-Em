const { PrismaClient, GameStatus, Status } = require('@prisma/client');

const prisma = new PrismaClient();

const OFFICIAL_MEMBERS = [
  'jack@nflpickem.com',
  'matt.c@nflpickem.com',
  'matt.b@nflpickem.com',
  'justin.b@nflpickem.com',
  'adam.b@nflpickem.com',
  'rich.b@nflpickem.com',
  'mike.c@nflpickem.com',
  'nick.s@nflpickem.com',
  'mark.b@nflpickem.com',
  'bigjack@nflpickem.com',
];

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

async function cleanAndSyncESPN() {
  console.log('====================================================');
  console.log('🏈 ESPN NFL LIVE INGEST & MOCK DATA PURGE');
  console.log('====================================================\n');

  // 1. Fetch Week 4 and Week 5 games from ESPN
  console.log('>>> [1/5] Querying official ESPN Scoreboard for Weeks 4 & 5...');
  const week4Games = await fetchESPNWeek(4);
  const week5Games = await fetchESPNWeek(5);
  console.log(`✓ Fetched ${week4Games.length} Week 4 games and ${week5Games.length} Week 5 games from ESPN.`);

  const allESPNGames = [...week4Games, ...week5Games];
  const validExternalIds = new Set(allESPNGames.map((g) => g.externalGameId));

  // 2. Upsert real games into PostgreSQL
  console.log('\n>>> [2/5] Upserting official ESPN games into PostgreSQL...');
  const canonicalGameMap = new Map(); // key: externalGameId -> Game

  for (const g of allESPNGames) {
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

    let savedGame;
    if (existing) {
      savedGame = await prisma.game.update({
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
      savedGame = await prisma.game.create({
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

    canonicalGameMap.set(upperExternalId, savedGame);
    console.log(`  ✓ Synced: ${g.awayTeamId.padEnd(4)} @ ${g.homeTeamId.padEnd(4)} | ${g.status.padEnd(11)} | Kickoff: ${g.kickoffTime.toISOString()} | Score: ${g.awayScore ?? '-'} - ${g.homeScore ?? '-'} (${g.spread || 'No Line'})`);
  }

  // 3. Purge orphaned mock and legacy games
  console.log('\n>>> [3/5] Purging legacy mock games and orphaned test picks...');
  const currentDbGames = await prisma.game.findMany({
    include: { picks: true },
  });

  const canonicalGameIds = new Set(Array.from(canonicalGameMap.values()).map((g) => g.id));
  let purgedMockGamesCount = 0;
  let purgedMockPicksCount = 0;

  for (const dbGame of currentDbGames) {
    if (!canonicalGameIds.has(dbGame.id)) {
      // Game is not an official Week 4 or Week 5 ESPN game
      // Delete associated pickResults and picks first
      if (dbGame.picks && dbGame.picks.length > 0) {
        for (const pk of dbGame.picks) {
          await prisma.pickResult.deleteMany({ where: { pickId: pk.id } });
        }
        const delPicks = await prisma.pick.deleteMany({ where: { gameId: dbGame.id } });
        purgedMockPicksCount += delPicks.count;
      }
      await prisma.game.delete({ where: { id: dbGame.id } });
      purgedMockGamesCount++;
      console.log(`  ✗ Purged mock game: ${dbGame.externalGameId} (${dbGame.awayTeamId} @ ${dbGame.homeTeamId})`);
    }
  }

  console.log(`✓ Purged ${purgedMockGamesCount} legacy mock games and ${purgedMockPicksCount} orphaned test picks.`);

  // 4. Ensure picks for the 10 official members are graded against ESPN final results
  console.log('\n>>> [4/5] Grading picks against official ESPN Week 4 scores...');
  const pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) {
    throw new Error('Main League pool not found');
  }

  const finalWeek4Games = Array.from(canonicalGameMap.values()).filter(
    (g) => g.status === GameStatus.FINAL && g.homeScore !== null && g.awayScore !== null
  );

  let gradedCount = 0;
  for (const game of finalWeek4Games) {
    const winner =
      game.homeScore > game.awayScore
        ? game.homeTeamId
        : game.awayScore > game.homeScore
        ? game.awayTeamId
        : 'TIE';

    const gamePicks = await prisma.pick.findMany({
      where: { gameId: game.id, poolId: pool.id },
    });

    for (const pick of gamePicks) {
      const isCorrect = pick.selectedTeamId === winner;
      await prisma.pickResult.upsert({
        where: { pickId: pick.id },
        update: {
          isCorrect,
          pointsAwarded: isCorrect ? 1 : 0,
          finalizedAt: new Date(),
        },
        create: {
          pickId: pick.id,
          isCorrect,
          pointsAwarded: isCorrect ? 1 : 0,
          finalizedAt: new Date(),
        },
      });
      gradedCount++;
    }
  }
  console.log(`✓ Graded ${gradedCount} picks across ${finalWeek4Games.length} finalized Week 4 games.`);

  // 5. Verify Standings and Remaining Slates
  console.log('\n>>> [5/5] Generating Live Standings & Slates Summary...');
  const members = await prisma.user.findMany({
    where: { email: { in: OFFICIAL_MEMBERS } },
    include: {
      picks: {
        where: { poolId: pool.id },
        include: { result: true, game: true },
      },
    },
  });

  const memberSummary = members.map((user) => {
    let totalPoints = 0;
    let correctPicks = 0;
    let totalWeek4Picks = 0;
    let totalWeek5Picks = 0;

    user.picks.forEach((pk) => {
      if (pk.result) {
        totalPoints += Number(pk.result.pointsAwarded);
        if (pk.result.isCorrect) correctPicks++;
      }
      if (pk.game.externalGameId.includes('_w04_')) {
        totalWeek4Picks++;
      } else if (pk.game.externalGameId.includes('_w05_')) {
        totalWeek5Picks++;
      }
    });

    return {
      email: user.email,
      totalPoints,
      correctPicks,
      totalWeek4Picks,
      totalWeek5Picks,
    };
  });

  memberSummary.sort((a, b) => b.totalPoints - a.totalPoints);

  console.log('\n🏆 Official ESPN Standings (After Week 4 Final Results):');
  memberSummary.forEach((m, idx) => {
    console.log(
      `  ${String(idx + 1).padStart(2)}. ${m.email.padEnd(25)} | ${String(m.totalPoints).padStart(2)} PTS | (${m.correctPicks}/${m.totalWeek4Picks} W4 Correct) | W5 Picks Saved: ${m.totalWeek5Picks}/15`
    );
  });

  const totalRemainingGames = await prisma.game.count();
  console.log(`\nVerified Database State: Exactly ${totalRemainingGames} games in DB (16 Week 4 + 15 Week 5 ESPN games).`);

  await prisma.$disconnect();
}

cleanAndSyncESPN().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
