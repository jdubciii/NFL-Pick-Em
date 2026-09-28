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
  console.log('🌱 Starting database seed (Phase 6: League Simulation & Leaderboard Population)...');

  // 1. Clean existing records in correct foreign key deletion order
  console.log('🧹 Cleaning existing tables...');
  await prisma.pickResult.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pick.deleteMany();
  await prisma.poolMembership.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleaned up old records.');

  // 2. Hash default password
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 3. Create Primary Admin User
  console.log('👤 Creating primary admin user...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@nflpickem.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin created: ${admin.email} (ID: ${admin.id})`);

  // 4. Create 9 Dummy Users
  console.log('👥 Creating 9 mock users...');
  const createdUsers: typeof admin[] = [];
  for (const mock of MOCK_USERS) {
    const user = await prisma.user.create({
      data: {
        email: mock.email,
        passwordHash,
        role: Role.USER,
      },
    });
    createdUsers.push(user);
  }
  console.log(`✅ Created ${createdUsers.length} mock users.`);

  // 5. Create 'Main League' Pool assigned to Admin
  console.log('🏆 Creating "Main League" Pool...');
  const pool = await prisma.pool.create({
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
  console.log(`✅ Created pool: "${pool.name}" (ID: ${pool.id})`);

  // 6. Insert PoolMembership records for Admin + all 9 users
  console.log('📋 Enrolling admin and 9 users into pool memberships...');
  const allLeagueUsers = [admin, ...createdUsers];
  
  await prisma.poolMembership.createMany({
    data: allLeagueUsers.map((user) => ({
      poolId: pool.id,
      userId: user.id,
      status: Status.ACTIVE,
    })),
  });
  console.log(`✅ Enrolled all ${allLeagueUsers.length} users into "${pool.name}".`);

  // 7. Insert 16 Historical NFL Games with FINAL status and past kickoffs
  console.log('🏈 Seeding 16 historical completed NFL games...');
  const now = Date.now();
  const createdGames = await prisma.$transaction(
    MOCK_HISTORICAL_GAMES.map((gameData) => {
      const kickoffTime = new Date(now - gameData.hoursAgo * 60 * 60 * 1000);
      return prisma.game.create({
        data: {
          externalGameId: gameData.externalGameId,
          homeTeamId: gameData.homeTeamId,
          awayTeamId: gameData.awayTeamId,
          kickoffTime,
          status: GameStatus.FINAL,
          homeScore: gameData.homeScore,
          awayScore: gameData.awayScore,
        },
      });
    })
  );

  const seededGameIds = createdGames.map((g) => g.id);
  console.log(`✅ Seeded ${createdGames.length} historical games with FINAL scores.`);

  // 8. Generate Randomized Picks for each user across all 16 games
  console.log('🎲 Simulating weekly picks across all users and games...');
  const picksToInsert: {
    poolId: string;
    userId: string;
    gameId: string;
    selectedTeamId: string | null;
    submittedById: string;
  }[] = [];

  for (const user of allLeagueUsers) {
    for (const game of createdGames) {
      const rand = Math.random();
      let selectedTeamId: string | null;

      if (rand < 0.45) {
        selectedTeamId = game.homeTeamId;
      } else if (rand < 0.90) {
        selectedTeamId = game.awayTeamId;
      } else {
        selectedTeamId = null; // 10% chance of omitted pick
      }

      picksToInsert.push({
        poolId: pool.id,
        userId: user.id,
        gameId: game.id,
        selectedTeamId,
        submittedById: user.id,
      });
    }
  }

  await prisma.pick.createMany({
    data: picksToInsert,
  });
  console.log(`✅ Created ${picksToInsert.length} picks (${allLeagueUsers.length} users × ${createdGames.length} games).`);

  // 9. Execute Scoring Engine to calculate points and commit immutable PickResult records
  console.log('📊 Executing scoring engine across all seeded games...');
  const gradedResults = await gradeFinalizedGames(seededGameIds);
  console.log(`✅ Graded and finalized ${gradedResults.length} pick results in database.`);

  console.log('\n==================================================');
  console.log('🎉 Full League Simulation & Seed Completed Successfully!');
  console.log('==================================================');
  console.log('Credentials for Testing:');
  console.log('  Admin User:   admin@nflpickem.com / Password123!');
  console.log('  Regular User: alice@nflpickem.com / Password123!');
  console.log('  (All 9 mock users share password: Password123!)');
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
