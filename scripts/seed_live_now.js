const { PrismaClient, Role, Status, GameStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Password123!';

const LEAGUE_MEMBERS = [
  { email: 'jack@nflpickem.com', name: 'Jack (You)', role: Role.USER },
  { email: 'admin@nflpickem.com', name: 'Commissioner (Admin)', role: Role.ADMIN },
  { email: 'alice@nflpickem.com', name: 'Alice Cooper', role: Role.USER },
  { email: 'bob@nflpickem.com', name: 'Bob Martinez', role: Role.USER },
  { email: 'charlie@nflpickem.com', name: 'Charlie Davis', role: Role.USER },
  { email: 'david@nflpickem.com', name: 'David Wilson', role: Role.USER },
  { email: 'emma@nflpickem.com', name: 'Emma Watson', role: Role.USER },
  { email: 'frank@nflpickem.com', name: 'Frank Thomas', role: Role.USER },
  { email: 'grace@nflpickem.com', name: 'Grace Hopper', role: Role.USER },
  { email: 'henry@nflpickem.com', name: 'Henry Ford', role: Role.USER },
];

// Real NFL 2026 Week 4 Completed Games
const COMPLETED_WEEK_4_GAMES = [
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

// Real NFL 2026 Week 5 Upcoming Games (Starting Thursday Oct 8, 2026)
const UPCOMING_WEEK_5_GAMES = [
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

async function seedLiveEnvironment() {
  console.log('>>> [1/6] Cleaning legacy picks, results, and old games...');
  await prisma.pickResult.deleteMany();
  await prisma.pick.deleteMany();
  await prisma.game.deleteMany();

  console.log('>>> [2/6] Upserting 10 League Users...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const users = [];
  for (const m of LEAGUE_MEMBERS) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { role: m.role, passwordHash },
      create: { email: m.email, role: m.role, passwordHash },
    });
    users.push(user);
  }

  console.log('>>> [3/6] Configuring "Main League" Pool (Deleting test pools)...');
  await prisma.poolMembership.deleteMany({
    where: { pool: { name: { startsWith: 'Admin Ops' } } }
  }).catch(() => {});
  await prisma.pool.deleteMany({
    where: { name: { startsWith: 'Admin Ops' } }
  }).catch(() => {});

  let pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) {
    pool = await prisma.pool.create({
      data: {
        name: 'Main League',
        adminId: users[1].id,
        settings: { lock_offset: 0, points_per_win: 1, week_number: 5 },
        status: Status.ACTIVE,
      },
    });
  } else {
    pool = await prisma.pool.update({
      where: { id: pool.id },
      data: { settings: { lock_offset: 0, points_per_win: 1, week_number: 5 } }
    });
  }

  // Enroll ALL 10 users into Main League
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

  console.log('>>> [4/6] Seeding Real NFL Games...');
  const allCreatedGames = [];

  for (const g of COMPLETED_WEEK_4_GAMES) {
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
    allCreatedGames.push(game);
  }

  for (const g of UPCOMING_WEEK_5_GAMES) {
    const game = await prisma.game.create({
      data: {
        externalGameId: g.externalGameId,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        kickoffTime: new Date(g.kickoff),
        status: GameStatus.SCHEDULED,
      },
    });
    allCreatedGames.push(game);
  }

  console.log('>>> [5/6] Creating Picks & Grading Leaderboard...');
  const picks = [];
  const completedGames = allCreatedGames.filter(g => g.status === GameStatus.FINAL);

  // Generate completed Week 4 picks for all 10 users to populate Leaderboard
  for (const user of users) {
    for (const game of completedGames) {
      const pickHome = Math.random() > 0.45;
      picks.push({
        poolId: pool.id,
        userId: user.id,
        gameId: game.id,
        selectedTeamId: pickHome ? game.homeTeamId : game.awayTeamId,
        submittedById: user.id,
      });
    }
  }

  // Pre-seed some Week 5 picks for other members so the Square Sheet Matrix is populated
  const upcomingGames = allCreatedGames.filter(g => g.status === GameStatus.SCHEDULED);
  for (const user of users) {
    if (user.email === 'jack@nflpickem.com') continue; // Jack can pick live!
    for (const game of upcomingGames) {
      const pickHome = Math.random() > 0.5;
      picks.push({
        poolId: pool.id,
        userId: user.id,
        gameId: game.id,
        selectedTeamId: pickHome ? game.homeTeamId : game.awayTeamId,
        submittedById: user.id,
      });
    }
  }

  await prisma.pick.createMany({ data: picks });

  // Grade completed games
  const allCompletedPicks = await prisma.pick.findMany({
    where: { gameId: { in: completedGames.map(g => g.id) } },
    include: { game: true },
  });

  const pickResults = [];
  for (const p of allCompletedPicks) {
    const winner = p.game.homeScore > p.game.awayScore ? p.game.homeTeamId : p.game.awayTeamId;
    const isCorrect = p.selectedTeamId === winner;
    pickResults.push({
      pickId: p.id,
      pointsAwarded: isCorrect ? 1.0 : 0.0,
      isCorrect,
    });
  }

  if (pickResults.length > 0) {
    await prisma.pickResult.createMany({ data: pickResults });
  }

  console.log('\n=============================================================');
  console.log(`✅ LIVE ENVIRONMENT RESTORED!`);
  console.log(`- Active Pool: "${pool.name}" (ID: ${pool.id})`);
  console.log(`- 10 Active Members (including Jack & Admin)`);
  console.log(`- 16 Real NFL Week 4 Completed Games (Leaderboard Populated)`);
  console.log(`- 15 Real NFL Week 5 Upcoming Games (Live Weekly Picks Active)`);
  console.log('=============================================================\n');

  await prisma.$disconnect();
}

seedLiveEnvironment().catch((err) => {
  console.error('Fatal seed error:', err);
  prisma.$disconnect();
  process.exit(1);
});
