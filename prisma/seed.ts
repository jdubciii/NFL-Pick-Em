import { PrismaClient, Role, Status, GameStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { gradeFinalizedGames } from '../src/services/scoringEngine';

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

// 16 Mock Historical NFL Games for a completed past week
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

export async function main() {
  console.log('🌱 Starting database seed (Safe Idempotent Mode)...');

  // 1. Clean non-restricted transactional tables without cascading into append-only penalty_ledger
  console.log('🧹 Purging transactional tables (preserving penalty_ledger & memberships)...');
  try {
    await prisma.pickResult.deleteMany();
    await prisma.pick.deleteMany();
  } catch (err) {
    console.log('⚠️️ Notice: Skipped partial deletion due to constraints.');
  }

  // 2. Hash default password
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 3. Upsert Primary Admin User
  console.log('👤 Upserting primary admin user...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nflpickem.com' },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      email: 'admin@nflpickem.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin verified: ${admin.email} (ID: ${admin.id})`);

  // 4. Upsert 9 Dummy Users
  console.log('👥 Upserting 9 mock users...');
  const createdUsers: typeof admin[] = [];
  for (const mock of MOCK_USERS) {
    const user = await prisma.user.upsert({
      where: { email: mock.email },
      update: { passwordHash, role: Role.USER },
      create: {
        email: mock.email,
        passwordHash,
        role: Role.USER,
      },
    });
    createdUsers.push(user);
  }
  console.log(`✅ Verified ${createdUsers.length} mock users.`);

  // 5. Upsert 'Main League' Pool assigned to Admin
  console.log('🏆 Finding or creating "Main League" Pool...');
  let pool = await prisma.pool.findFirst({
    where: { name: 'Main League' },
  });

  if (!pool) {
    pool = await prisma.pool.create({
      data: {
        name: 'Main League',
        adminId: admin.id,
        settings: {
          lock_offset: 0,
          points_per_win: 1,
        },
        status: Status.ACTIVE,
      },
    });
  }
  console.log(`✅ Pool active: "${pool.name}" (ID: ${pool.id})`);

  // 6. Idempotently ensure PoolMembership records for Admin + 9 users
  console.log('📋 Ensuring pool memberships...');
  const allLeagueUsers = [admin, ...createdUsers];

  for (const user of allLeagueUsers) {
    const existingMembership = await prisma.poolMembership.findFirst({
      where: { poolId: pool.id, userId: user.id },
    });

    if (!existingMembership) {
      await prisma.poolMembership.create({
        data: {
          poolId: pool.id,
          userId: user.id,
          status: Status.ACTIVE,
        },
      });
    }
  }
  console.log(`✅ Enrolled ${allLeagueUsers.length} users into "${pool.name}".`);

  // 7. Upsert 16 Historical NFL Games with FINAL status
  console.log('🏈 Upserting 16 historical completed NFL games...');
  const now = Date.now();
  const seededGameIds: string[] = [];

  for (const gameData of MOCK_HISTORICAL_GAMES) {
    const kickoffTime = new Date(now - gameData.hoursAgo * 60 * 60 * 1000);

    const game = await prisma.game.upsert({
      where: { externalGameId: gameData.externalGameId },
      update: {
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        status: GameStatus.FINAL,
        kickoffTime,
      },
      create: {
        externalGameId: gameData.externalGameId,
        homeTeamId: gameData.homeTeamId,
        awayTeamId: gameData.awayTeamId,
        kickoffTime,
        status: GameStatus.FINAL,
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
      },
    });
    seededGameIds.push(game.id);
  }
  console.log(`✅ Seeded and verified ${seededGameIds.length} historical games.`);

  // 8. Generate Picks for users across games
  console.log('🎲 Simulating weekly picks across all users and games...');
  const picksToInsert: {
    poolId: string;
    userId: string;
    gameId: string;
    selectedTeamId: string | null;
    submittedById: string;
  }[] = [];

  for (const user of allLeagueUsers) {
    for (const gameData of MOCK_HISTORICAL_GAMES) {
      const gameRecord = await prisma.game.findUnique({
        where: { externalGameId: gameData.externalGameId },
      });
      if (!gameRecord) continue;

      const rand = Math.random();
      let selectedTeamId: string | null;

      if (rand < 0.45) {
        selectedTeamId = gameRecord.homeTeamId;
      } else if (rand < 0.90) {
        selectedTeamId = gameRecord.awayTeamId;
      } else {
        selectedTeamId = null;
      }

      picksToInsert.push({
        poolId: pool.id,
        userId: user.id,
        gameId: gameRecord.id,
        selectedTeamId,
        submittedById: user.id,
      });
    }
  }

  await prisma.pick.createMany({
    data: picksToInsert,
  });
  console.log(`✅ Created ${picksToInsert.length} picks.`);

  // 9. Execute Scoring Engine to grade and populate PickResult
  console.log('📊 Executing scoring engine across all seeded games...');
  const gradedResults = await gradeFinalizedGames(seededGameIds);
  console.log(`✅ Graded and finalized ${gradedResults.length} pick results in database.`);

  console.log('\n==================================================');
  console.log('🎉 Full League Simulation & Seed Completed Successfully!');
  console.log('==================================================');
  console.log('Credentials for Testing:');
  console.log('  Admin User:   admin@nflpickem.com / Password123!');
  console.log('  Regular User: alice@nflpickem.com / Password123!');
  console.log('==================================================\n');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seed failed with error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}