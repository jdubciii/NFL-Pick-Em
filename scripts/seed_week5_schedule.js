const { PrismaClient, GameStatus } = require('@prisma/client');
const prisma = new PrismaClient();

const WEEK5_GAMES = [
  {
    externalGameId: '2026_w05_TB_DAL',
    oldExternalGameId: '2026_w05_dal_tb',
    homeTeamId: 'DAL',
    awayTeamId: 'TB',
    kickoffTime: new Date('2026-10-09T00:15:00.000Z'), // Thu 8:15 PM ET
    spread: -3.5,
  },
  {
    externalGameId: '2026_w05_PHI_JAX',
    oldExternalGameId: '2026_w05_jax_phi',
    homeTeamId: 'JAX',
    awayTeamId: 'PHI',
    kickoffTime: new Date('2026-10-11T13:30:00.000Z'), // Sun 9:30 AM ET (London)
    spread: 2.5,
  },
  {
    externalGameId: '2026_w05_LV_NE',
    oldExternalGameId: '2026_w05_ne_lv',
    homeTeamId: 'NE',
    awayTeamId: 'LV',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: -1.5,
  },
  {
    externalGameId: '2026_w05_CHI_GB',
    oldExternalGameId: '2026_w05_gb_chi',
    homeTeamId: 'GB',
    awayTeamId: 'CHI',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: -4.5,
  },
  {
    externalGameId: '2026_w05_CIN_MIA',
    oldExternalGameId: '2026_w05_mia_cin',
    homeTeamId: 'MIA',
    awayTeamId: 'CIN',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: 3.0,
  },
  {
    externalGameId: '2026_w05_MIN_NO',
    oldExternalGameId: '2026_w05_no_min',
    homeTeamId: 'NO',
    awayTeamId: 'MIN',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: 1.0,
  },
  {
    externalGameId: '2026_w05_HOU_TEN',
    oldExternalGameId: '2026_w05_ten_hou',
    homeTeamId: 'TEN',
    awayTeamId: 'HOU',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: 6.0,
  },
  {
    externalGameId: '2026_w05_IND_PIT',
    oldExternalGameId: '2026_w05_pit_ind',
    homeTeamId: 'PIT',
    awayTeamId: 'IND',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: -3.0,
  },
  {
    externalGameId: '2026_w05_CLE_NYJ',
    oldExternalGameId: '2026_w05_nyj_cle',
    homeTeamId: 'NYJ',
    awayTeamId: 'CLE',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: -2.5,
  },
  {
    externalGameId: '2026_w05_NYG_WAS',
    oldExternalGameId: '2026_w05_was_nyg',
    homeTeamId: 'WAS',
    awayTeamId: 'NYG',
    kickoffTime: new Date('2026-10-11T17:00:00.000Z'), // Sun 1:00 PM ET
    spread: -6.5,
  },
  {
    externalGameId: '2026_w05_DEN_LAC',
    oldExternalGameId: '2026_w05_lac_den',
    homeTeamId: 'LAC',
    awayTeamId: 'DEN',
    kickoffTime: new Date('2026-10-11T20:05:00.000Z'), // Sun 4:05 PM ET
    spread: -4.0,
  },
  {
    externalGameId: '2026_w05_DET_ARI',
    oldExternalGameId: '2026_w05_ari_det',
    homeTeamId: 'ARI',
    awayTeamId: 'DET',
    kickoffTime: new Date('2026-10-11T20:25:00.000Z'), // Sun 4:25 PM ET
    spread: 3.5,
  },
  {
    externalGameId: '2026_w05_SF_SEA',
    oldExternalGameId: '2026_w05_sea_sf',
    homeTeamId: 'SEA',
    awayTeamId: 'SF',
    kickoffTime: new Date('2026-10-11T20:25:00.000Z'), // Sun 4:25 PM ET
    spread: 1.5,
  },
  {
    externalGameId: '2026_w05_BAL_ATL',
    oldExternalGameId: '2026_w05_atl_bal',
    homeTeamId: 'ATL',
    awayTeamId: 'BAL',
    kickoffTime: new Date('2026-10-12T00:20:00.000Z'), // Sun 8:20 PM ET (SNF)
    spread: 3.0,
  },
  {
    externalGameId: '2026_w05_BUF_LAR',
    oldExternalGameId: '2026_w05_lar_buf',
    homeTeamId: 'LAR',
    awayTeamId: 'BUF',
    kickoffTime: new Date('2026-10-13T00:15:00.000Z'), // Mon 8:15 PM ET (MNF)
    spread: 2.5,
  },
];

async function seedWeek5() {
  console.log('>>> [Week 5 Seeder] Consolidating and updating Week 5 NFL games with exact UTC kickoff timestamps...');

  for (const g of WEEK5_GAMES) {
    // 1. Find or create the target uppercase game
    let targetGame = await prisma.game.findUnique({
      where: { externalGameId: g.externalGameId },
    });

    if (!targetGame) {
      targetGame = await prisma.game.create({
        data: {
          externalGameId: g.externalGameId,
          homeTeamId: g.homeTeamId,
          awayTeamId: g.awayTeamId,
          kickoffTime: g.kickoffTime,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      });
    } else {
      targetGame = await prisma.game.update({
        where: { id: targetGame.id },
        data: {
          homeTeamId: g.homeTeamId,
          awayTeamId: g.awayTeamId,
          kickoffTime: g.kickoffTime,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      });
    }

    // 2. If old lowercase game exists, migrate picks to targetGame and delete old game
    if (g.oldExternalGameId) {
      const oldGame = await prisma.game.findUnique({
        where: { externalGameId: g.oldExternalGameId },
        include: { picks: true },
      });

      if (oldGame && oldGame.id !== targetGame.id) {
        for (const p of oldGame.picks) {
          // Move pick to target game if not already present
          const existingTargetPick = await prisma.pick.findUnique({
            where: {
              poolId_userId_gameId: {
                poolId: p.poolId,
                userId: p.userId,
                gameId: targetGame.id,
              },
            },
          });

          if (!existingTargetPick) {
            await prisma.pick.update({
              where: { id: p.id },
              data: { gameId: targetGame.id },
            });
          } else {
            await prisma.pick.delete({
              where: { id: p.id },
            });
          }
        }

        await prisma.game.delete({
          where: { id: oldGame.id },
        });
        console.log(`Migrated picks and pruned duplicate game: ${g.oldExternalGameId}`);
      }
    }
  }

  // Double check total Week 5 games
  const allW5 = await prisma.game.findMany({
    where: { externalGameId: { contains: 'w05' } },
    orderBy: { kickoffTime: 'asc' },
  });

  console.log(`\nVerified: Exactly ${allW5.length} Week 5 NFL games in PostgreSQL:`);
  allW5.forEach((g, idx) => {
    console.log(`  ${idx + 1}. ${g.externalGameId.padEnd(20)} ${g.awayTeamId} @ ${g.homeTeamId} (Kickoff UTC: ${g.kickoffTime.toISOString()})`);
  });

  await prisma.$disconnect();
}

seedWeek5().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
