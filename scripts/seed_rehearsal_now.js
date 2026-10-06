const { PrismaClient, Role, Status, GameStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Password123!';

const LEAGUE_MEMBERS = [
  { email: 'admin@nflpickem.com', name: 'Commissioner (Admin)', role: Role.ADMIN },
  { email: 'jack@nflpickem.com', name: 'Jack (You)', role: Role.USER },
  { email: 'alice@nflpickem.com', name: 'Alice Cooper', role: Role.USER },
  { email: 'bob@nflpickem.com', name: 'Bob Martinez', role: Role.USER },
  { email: 'charlie@nflpickem.com', name: 'Charlie Davis', role: Role.USER },
  { email: 'david@nflpickem.com', name: 'David Wilson', role: Role.USER },
  { email: 'emma@nflpickem.com', name: 'Emma Watson', role: Role.USER },
  { email: 'frank@nflpickem.com', name: 'Frank Thomas', role: Role.USER },
  { email: 'grace@nflpickem.com', name: 'Grace Hopper', role: Role.USER },
  { email: 'henry@nflpickem.com', name: 'Henry Ford', role: Role.USER },
];

const SLATE_GAMES = [
  { externalGameId: 'prod_g01', homeTeamId: 'KC', awayTeamId: 'BAL', homeScore: 27, awayScore: 20, hoursOffset: -48, status: GameStatus.FINAL },
  { externalGameId: 'prod_g02', homeTeamId: 'PHI', awayTeamId: 'GB', homeScore: 34, awayScore: 29, hoursOffset: -48, status: GameStatus.FINAL },
  { externalGameId: 'prod_g03', homeTeamId: 'DET', awayTeamId: 'LAR', homeScore: 26, awayScore: 20, hoursOffset: -24, status: GameStatus.FINAL },
  { externalGameId: 'prod_g04', homeTeamId: 'BUF', awayTeamId: 'ARI', homeScore: 34, awayScore: 28, hoursOffset: -24, status: GameStatus.FINAL },
  { externalGameId: 'prod_g05', homeTeamId: 'MIA', awayTeamId: 'JAX', homeScore: 20, awayScore: 17, hoursOffset: -24, status: GameStatus.FINAL },
  { externalGameId: 'prod_g06', homeTeamId: 'CIN', awayTeamId: 'NE', homeScore: 10, awayScore: 16, hoursOffset: -24, status: GameStatus.FINAL },
  { externalGameId: 'prod_g07', homeTeamId: 'IND', awayTeamId: 'HOU', homeScore: 27, awayScore: 29, hoursOffset: -20, status: GameStatus.FINAL },
  { externalGameId: 'prod_g08', homeTeamId: 'CHI', awayTeamId: 'TEN', homeScore: 24, awayScore: 17, hoursOffset: -20, status: GameStatus.FINAL },
  { externalGameId: 'prod_g09', homeTeamId: 'SF', awayTeamId: 'DAL', homeScore: null, awayScore: null, hoursOffset: 4, status: GameStatus.SCHEDULED },
  { externalGameId: 'prod_g10', homeTeamId: 'SEA', awayTeamId: 'LAR', homeScore: null, awayScore: null, hoursOffset: 6, status: GameStatus.SCHEDULED },
  { externalGameId: 'prod_g11', homeTeamId: 'LAC', awayTeamId: 'DEN', homeScore: null, awayScore: null, hoursOffset: 24, status: GameStatus.SCHEDULED },
  { externalGameId: 'prod_g12', homeTeamId: 'MIN', awayTeamId: 'GB', homeScore: null, awayScore: null, hoursOffset: 24, status: GameStatus.SCHEDULED },
  { externalGameId: 'prod_g13', homeTeamId: 'NYG', awayTeamId: 'WAS', homeScore: null, awayScore: null, hoursOffset: 28, status: GameStatus.SCHEDULED },
  { externalGameId: 'prod_g14', homeTeamId: 'ATL', awayTeamId: 'NO', homeScore: null, awayScore: null, hoursOffset: 28, status: GameStatus.SCHEDULED },
  { externalGameId: 'prod_g15', homeTeamId: 'CLE', awayTeamId: 'PIT', homeScore: null, awayScore: null, hoursOffset: 32, status: GameStatus.SCHEDULED },
  { externalGameId: 'prod_g16', homeTeamId: 'TB', awayTeamId: 'CAR', homeScore: null, awayScore: null, hoursOffset: 32, status: GameStatus.SCHEDULED },
];

async function main() {
  console.log('Clearing old picks and games...');
  await prisma.pickResult.deleteMany();
  await prisma.pick.deleteMany();
  await prisma.game.deleteMany();

  console.log('Upserting 10 Users...');
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

  console.log('Ensuring "Main League" Pool...');
  let pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) {
    pool = await prisma.pool.create({
      data: {
        name: 'Main League',
        adminId: users[0].id,
        settings: { lock_offset: 0, points_per_win: 1, week_number: 1 },
        status: Status.ACTIVE,
      },
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

  console.log('Creating slate games...');
  const now = Date.now();
  const createdGames = [];
  for (const g of SLATE_GAMES) {
    const kickoffTime = new Date(now + g.hoursOffset * 3600 * 1000);
    const game = await prisma.game.create({
      data: {
        externalGameId: g.externalGameId,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        kickoffTime,
        status: g.status,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
      },
    });
    createdGames.push(game);
  }

  console.log('Generating picks...');
  const picks = [];
  const completedGames = createdGames.filter(g => g.status === GameStatus.FINAL);

  for (const user of users) {
    for (const game of createdGames) {
      const pickHome = Math.random() > 0.4;
      const selected = (game.status === GameStatus.SCHEDULED && user.email === 'jack@nflpickem.com')
        ? null
        : (pickHome ? game.homeTeamId : game.awayTeamId);

      if (selected) {
        picks.push({
          poolId: pool.id,
          userId: user.id,
          gameId: game.id,
          selectedTeamId: selected,
          submittedById: user.id,
        });
      }
    }
  }
  await prisma.pick.createMany({ data: picks });

  const allPicks = await prisma.pick.findMany({
    where: { gameId: { in: completedGames.map(g => g.id) } },
    include: { game: true },
  });

  const pickResults = [];
  for (const p of allPicks) {
    const winningTeam = p.game.homeScore > p.game.awayScore ? p.game.homeTeamId : p.game.awayTeamId;
    const isCorrect = p.selectedTeamId === winningTeam;
    pickResults.push({
      pickId: p.id,
      pointsAwarded: isCorrect ? 1.0 : 0.0,
      isCorrect,
    });
  }

  if (pickResults.length > 0) {
    await prisma.pickResult.createMany({ data: pickResults });
  }

  console.log('Rehearsal data seeded successfully.');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
