const { PrismaClient, Role, Status, GameStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Password123!';

const MOCK_USERS = [
  { email: 'alice@nflpickem.com', name: 'Alice Cooper' },
  { email: 'bob@nflpickem.com', name: 'Bob Martinez' },
  { email: 'charlie@nflpickem.com', name: 'Charlie Davis' },
  { email: 'david@nflpickem.com', name: 'David Wilson' },
  { email: 'emma@nflpickem.com', name: 'Emma Watson' },
  { email: 'frank@nflpickem.com', name: 'Frank Thomas' },
  { email: 'grace@nflpickem.com', name: 'Grace Hopper' },
  { email: 'henry@nflpickem.com', name: 'Henry Ford' },
  { email: 'isabella@nflpickem.com', name: 'Isabella Ross' },
];

const MOCK_HISTORICAL_GAMES = [
  { externalGameId: 'seed_game_01', homeTeamId: 'KC', awayTeamId: 'BAL', homeScore: 27, awayScore: 20, hoursAgo: 96 },
  { externalGameId: 'seed_game_02', homeTeamId: 'PHI', awayTeamId: 'GB', homeScore: 34, awayScore: 29, hoursAgo: 90 },
  { externalGameId: 'seed_game_03', homeTeamId: 'DET', awayTeamId: 'LAR', homeScore: 26, awayScore: 20, hoursAgo: 72 },
  { externalGameId: 'seed_game_04', homeTeamId: 'BUF', awayTeamId: 'ARI', homeScore: 34, awayScore: 28, hoursAgo: 72 },
  { externalGameId: 'seed_game_05', homeTeamId: 'MIA', awayTeamId: 'JAX', homeScore: 20, awayScore: 17, hoursAgo: 72 },
  { externalGameId: 'seed_game_06', homeTeamId: 'CIN', awayTeamId: 'NE', homeScore: 10, awayScore: 16, hoursAgo: 72 },
  { externalGameId: 'seed_game_07', homeTeamId: 'IND', awayTeamId: 'HOU', homeScore: 27, awayScore: 29, hoursAgo: 72 },
  { externalGameId: 'seed_game_08', homeTeamId: 'CHI', awayTeamId: 'TEN', homeScore: 24, awayScore: 17, hoursAgo: 72 },
  { externalGameId: 'seed_game_09', homeTeamId: 'ATL', awayTeamId: 'PIT', homeScore: 10, awayScore: 18, hoursAgo: 72 },
  { externalGameId: 'seed_game_10', homeTeamId: 'NO', awayTeamId: 'CAR', homeScore: 47, awayScore: 10, hoursAgo: 72 },
  { externalGameId: 'seed_game_11', homeTeamId: 'SEA', awayTeamId: 'DEN', homeScore: 26, awayScore: 20, hoursAgo: 68 },
  { externalGameId: 'seed_game_12', homeTeamId: 'LAC', awayTeamId: 'LV', homeScore: 22, awayScore: 10, hoursAgo: 68 },
  { externalGameId: 'seed_game_13', homeTeamId: 'CLE', awayTeamId: 'DAL', homeScore: 17, awayScore: 33, hoursAgo: 68 },
  { externalGameId: 'seed_game_14', homeTeamId: 'TB', awayTeamId: 'WAS', homeScore: 37, awayScore: 20, hoursAgo: 68 },
  { externalGameId: 'seed_game_15', homeTeamId: 'NYG', awayTeamId: 'MIN', homeScore: 6, awayScore: 28, hoursAgo: 68 },
  { externalGameId: 'seed_game_16', homeTeamId: 'SF', awayTeamId: 'NYJ', homeScore: 32, awayScore: 19, hoursAgo: 48 },
];

async function run() {
  console.log('>>> [1/5] Removing pick results and picks...');
  await prisma.pickResult.deleteMany();
  await prisma.pick.deleteMany();

  console.log('>>> [2/5] Purging legacy repeated games...');
  await prisma.game.deleteMany();

  console.log('>>> [3/5] Seeding 16 unique games...');
  const now = Date.now();
  for (const g of MOCK_HISTORICAL_GAMES) {
    const kickoffTime = new Date(now - g.hoursAgo * 3600 * 1000);
    await prisma.game.create({
      data: {
        externalGameId: g.externalGameId,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        kickoffTime: kickoffTime,
        status: GameStatus.FINAL,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
      },
    });
  }

  console.log('>>> [4/5] Verifying users and pool...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nflpickem.com' },
    update: { passwordHash, role: Role.ADMIN },
    create: { email: 'admin@nflpickem.com', passwordHash, role: Role.ADMIN },
  });

  const createdUsers = [admin];
  for (const u of MOCK_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: Role.USER },
      create: { email: u.email, passwordHash, role: Role.USER },
    });
    createdUsers.push(user);
  }

  let pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) {
    pool = await prisma.pool.create({
      data: {
        name: 'Main League',
        adminId: admin.id,
        settings: { lock_offset: 0, points_per_win: 1 },
        status: Status.ACTIVE,
      },
    });
  }

  for (const user of createdUsers) {
    const mem = await prisma.poolMembership.findFirst({
      where: { poolId: pool.id, userId: user.id },
    });
    if (!mem) {
      await prisma.poolMembership.create({
        data: { poolId: pool.id, userId: user.id, status: Status.ACTIVE },
      });
    }
  }

  console.log('>>> [5/5] Generating fresh picks...');
  const allGames = await prisma.game.findMany();
  const picks = [];

  for (const user of createdUsers) {
    for (const game of allGames) {
      const rand = Math.random();
      const choice = rand < 0.5 ? game.homeTeamId : game.awayTeamId;
      picks.push({
        poolId: pool.id,
        userId: user.id,
        gameId: game.id,
        selectedTeamId: choice,
        submittedById: user.id,
      });
    }
  }

  await prisma.pick.createMany({ data: picks });

  const totalGames = await prisma.game.count();
  const totalPicks = await prisma.pick.count();
  console.log(`\nSUCCESS: Seeded ${totalGames} games and ${totalPicks} picks for pool "${pool.name}".`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('Fatal error during execution:', err);
  prisma.$disconnect();
  process.exit(1);
});
