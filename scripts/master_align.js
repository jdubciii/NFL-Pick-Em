const { PrismaClient, Role, Status, GameStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function executeMasterRepair() {
  console.log('>>> [1/5] Purging old picks, results, and games...');
  await prisma.pickResult.deleteMany();
  await prisma.pick.deleteMany();
  await prisma.game.deleteMany();

  // Clean up non-main league pools
  await prisma.poolMembership.deleteMany({
    where: { pool: { NOT: { name: 'Main League' } } }
  }).catch(() => {});
  await prisma.pool.deleteMany({
    where: { NOT: { name: 'Main League' } }
  }).catch(() => {});

  console.log('>>> [2/5] Upserting 10 league members with Jack as ADMIN...');
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const LEAGUE_MEMBERS = [
    { email: 'jack@nflpickem.com', name: 'Jack (You)', role: Role.ADMIN },
    { email: 'matt.c@nflpickem.com', name: 'Matt Cone', role: Role.USER },
    { email: 'matt.b@nflpickem.com', name: 'Matt Brickner', role: Role.USER },
    { email: 'justin.b@nflpickem.com', name: 'Justin Brickner', role: Role.USER },
    { email: 'adam.b@nflpickem.com', name: 'Adam Brickner', role: Role.USER },
    { email: 'rich.b@nflpickem.com', name: 'Rich Brickner', role: Role.USER },
    { email: 'mike.c@nflpickem.com', name: 'Mike Cone', role: Role.USER },
    { email: 'nick.s@nflpickem.com', name: 'Nick Santos', role: Role.USER },
    { email: 'mark.b@nflpickem.com', name: 'Mark Brickner', role: Role.USER },
    { email: 'bigjack@nflpickem.com', name: 'Big Jack', role: Role.USER },
  ];

  const users = [];
  for (const m of LEAGUE_MEMBERS) {
    const u = await prisma.user.upsert({
      where: { email: m.email },
      update: { role: m.role, passwordHash },
      create: { email: m.email, role: m.role, passwordHash },
    });
    users.push(u);
  }

  console.log('>>> [3/5] Setting up "Main League" pool with Jack as Commissioner...');
  let pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) {
    pool = await prisma.pool.create({
      data: {
        name: 'Main League',
        adminId: users[0].id,
        settings: { lock_offset: 0, points_per_win: 1, week_number: 5 },
        status: Status.ACTIVE,
      },
    });
  } else {
    pool = await prisma.pool.update({
      where: { id: pool.id },
      data: {
        adminId: users[0].id,
        settings: { lock_offset: 0, points_per_win: 1, week_number: 5 },
        status: Status.ACTIVE,
      }
    });
  }

  for (const u of users) {
    const mem = await prisma.poolMembership.findFirst({
      where: { poolId: pool.id, userId: u.id },
    });
    if (!mem) {
      await prisma.poolMembership.create({
        data: { poolId: pool.id, userId: u.id, status: Status.ACTIVE },
      });
    }
  }

  console.log('>>> [4/5] Seeding NFL 2026 Week 4 (Final) & Week 5 (Scheduled) Games...');
  // 16 Finalized Week 4 Games
  const W4 = [
    { externalGameId: '2026_w04_cle_pit', homeTeamId: 'CLE', awayTeamId: 'PIT', homeScore: 27, awayScore: 24, kickoff: '2026-10-01T20:15:00Z' },
    { externalGameId: '2026_w04_was_ind', homeTeamId: 'WAS', awayTeamId: 'IND', homeScore: 13, awayScore: 30, kickoff: '2026-10-04T13:30:00Z' },
    { externalGameId: '2026_w04_hou_dal', homeTeamId: 'HOU', awayTeamId: 'DAL', homeScore: 30, awayScore: 34, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_chi_nyj', homeTeamId: 'CHI', awayTeamId: 'NYJ', homeScore: 23, awayScore: 12, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_buf_ne',  homeTeamId: 'BUF', awayTeamId: 'NE',  homeScore: 26, awayScore: 29, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_cin_jax', homeTeamId: 'CIN', awayTeamId: 'JAX', homeScore: 17, awayScore: 22, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_nyg_ari', homeTeamId: 'NYG', awayTeamId: 'ARI', homeScore: 36, awayScore: 24, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_bal_ten', homeTeamId: 'BAL', awayTeamId: 'TEN', homeScore: 24, awayScore: 18, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_phi_lar', homeTeamId: 'PHI', awayTeamId: 'LAR', homeScore: 20, awayScore: 24, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_tb_gb',   homeTeamId: 'TB',  awayTeamId: 'GB',  homeScore: 14, awayScore: 17, kickoff: '2026-10-04T17:00:00Z' },
    { externalGameId: '2026_w04_min_mia', homeTeamId: 'MIN', awayTeamId: 'MIA', homeScore: 15, awayScore: 10, kickoff: '2026-10-04T20:05:00Z' },
    { externalGameId: '2026_w04_lv_kc',   homeTeamId: 'LV',  awayTeamId: 'KC',  homeScore: 27, awayScore: 30, kickoff: '2026-10-04T20:25:00Z' },
    { externalGameId: '2026_w04_sf_den',  homeTeamId: 'SF',  awayTeamId: 'DEN', homeScore: 24, awayScore: 14, kickoff: '2026-10-04T20:25:00Z' },
    { externalGameId: '2026_w04_sea_lac', homeTeamId: 'SEA', awayTeamId: 'LAC', homeScore: 30, awayScore: 23, kickoff: '2026-10-04T20:25:00Z' },
    { externalGameId: '2026_w04_car_det', homeTeamId: 'CAR', awayTeamId: 'DET', homeScore: 32, awayScore: 26, kickoff: '2026-10-04T20:20:00Z' },
    { externalGameId: '2026_w04_no_atl',  homeTeamId: 'NO',  awayTeamId: 'ATL', homeScore: 24, awayScore: 45, kickoff: '2026-10-05T20:15:00Z' },
  ];

  // 15 Upcoming Week 5 Games
  const W5 = [
    { externalGameId: '2026_w05_dal_tb',  homeTeamId: 'DAL', awayTeamId: 'TB',  kickoff: '2026-10-08T20:15:00Z' },
    { externalGameId: '2026_w05_jax_phi', homeTeamId: 'JAX', awayTeamId: 'PHI', kickoff: '2026-10-11T09:30:00Z' },
    { externalGameId: '2026_w05_ne_lv',   homeTeamId: 'NE',  awayTeamId: 'LV',  kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_gb_chi',  homeTeamId: 'GB',  awayTeamId: 'CHI', kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_mia_cin', homeTeamId: 'MIA', awayTeamId: 'CIN', kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_no_min',  homeTeamId: 'NO',  awayTeamId: 'MIN', kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_ten_hou', homeTeamId: 'TEN', awayTeamId: 'HOU', kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_pit_ind', homeTeamId: 'PIT', awayTeamId: 'IND', kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_nyj_cle', homeTeamId: 'NYJ', awayTeamId: 'CLE', kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_was_nyg', homeTeamId: 'WAS', awayTeamId: 'NYG', kickoff: '2026-10-11T13:00:00Z' },
    { externalGameId: '2026_w05_lac_den', homeTeamId: 'LAC', awayTeamId: 'DEN', kickoff: '2026-10-11T16:05:00Z' },
    { externalGameId: '2026_w05_sea_sf',  homeTeamId: 'SEA', awayTeamId: 'SF',  kickoff: '2026-10-11T16:25:00Z' },
    { externalGameId: '2026_w05_ari_det', homeTeamId: 'ARI', awayTeamId: 'DET', kickoff: '2026-10-11T16:25:00Z' },
    { externalGameId: '2026_w05_atl_bal', homeTeamId: 'ATL', awayTeamId: 'BAL', kickoff: '2026-10-11T20:20:00Z' },
    { externalGameId: '2026_w05_lar_buf', homeTeamId: 'LAR', awayTeamId: 'BUF', kickoff: '2026-10-12T20:15:00Z' },
  ];

  const createdW4 = [];
  for (const g of W4) {
    const game = await prisma.game.create({
      data: {
        externalGameId: g.externalGameId,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        kickoffTime: new Date(g.kickoff),
        status: GameStatus.FINAL,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
      },
    });
    createdW4.push(game);
  }

  const createdW5 = [];
  for (const g of W5) {
    const game = await prisma.game.create({
      data: {
        externalGameId: g.externalGameId,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        kickoffTime: new Date(g.kickoff),
        status: GameStatus.SCHEDULED,
      },
    });
    createdW5.push(game);
  }

  console.log('>>> [5/5] Generating Staggered Realistic Graded Picks and Cumulative Stats...');
  // Target win counts for 10 members: 14, 13, 13, 12, 11, 11, 10, 10, 9, 8 wins out of 16 games
  const targetWins = [14, 13, 13, 12, 11, 11, 10, 10, 9, 8];

  const allPicksToCreate = [];
  const pickResultsToCreate = [];

  for (let uIdx = 0; uIdx < users.length; uIdx++) {
    const user = users[uIdx];
    const desiredWins = targetWins[uIdx] || 10;
    let winsCount = 0;

    for (let gIdx = 0; gIdx < createdW4.length; gIdx++) {
      const game = createdW4[gIdx];
      const winner = game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
      const loser = game.homeScore > game.awayScore ? game.awayTeamId : game.homeTeamId;

      // Assign winner until desiredWins reached, then loser
      const shouldWin = winsCount < desiredWins && (16 - gIdx <= desiredWins - winsCount || Math.random() < (desiredWins / 16));
      if (shouldWin) winsCount++;

      const selectedTeamId = shouldWin ? winner : loser;

      const pick = await prisma.pick.create({
        data: {
          poolId: pool.id,
          userId: user.id,
          gameId: game.id,
          selectedTeamId,
          submittedById: user.id,
        },
      });

      pickResultsToCreate.push({
        pickId: pick.id,
        pointsAwarded: shouldWin ? 1.0 : 0.0,
        isCorrect: shouldWin,
      });
    }

    // Week 5 picks for competitors
    if (user.email !== 'jack@nflpickem.com') {
      for (const game of createdW5) {
        const pickHome = Math.random() > 0.5;
        allPicksToCreate.push({
          poolId: pool.id,
          userId: user.id,
          gameId: game.id,
          selectedTeamId: pickHome ? game.homeTeamId : game.awayTeamId,
          submittedById: user.id,
        });
      }
    }

    // Upsert PoolMemberStat cache
    await prisma.poolMemberStat.upsert({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: user.id,
        },
      },
      update: {
        totalShotsDrank: uIdx === users.length - 1 ? 2 : 0,
        firstPlaceFinishes: uIdx === 0 ? 1 : 0,
        deadPlaceFinishes: uIdx === users.length - 1 ? 1 : 0,
      },
      create: {
        poolId: pool.id,
        userId: user.id,
        totalShotsDrank: uIdx === users.length - 1 ? 2 : 0,
        firstPlaceFinishes: uIdx === 0 ? 1 : 0,
        deadPlaceFinishes: uIdx === users.length - 1 ? 1 : 0,
      },
    }).catch(() => {});
  }

  if (allPicksToCreate.length > 0) {
    await prisma.pick.createMany({ data: allPicksToCreate });
  }
  if (pickResultsToCreate.length > 0) {
    await prisma.pickResult.createMany({ data: pickResultsToCreate });
  }

  console.log('\n=============================================================');
  console.log('✓ MASTER ALIGNMENT COMPLETE');
  console.log('✓ Leaderboard: 10 users ranked with realistic scores (8–14 wins)');
  console.log('✓ Week 4: 16 Finalized games with full graded results');
  console.log('✓ Week 5: 15 Scheduled upcoming games for active user picks');
  console.log('✓ Admin Override: Jack configured as Pool Admin / Commissioner');
  console.log('=============================================================\n');

  await prisma.$disconnect();
}

executeMasterRepair().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
