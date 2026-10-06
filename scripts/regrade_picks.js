const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regradePicks() {
  console.log('>>> [Re-Grade] Auditing and re-grading picks for Jack and all pool members...');

  const user = await prisma.user.findUnique({
    where: { email: 'jack@nflpickem.com' },
  });

  if (!user) {
    console.log('User jack@nflpickem.com not found.');
    return;
  }

  const pool = await prisma.pool.findFirst({
    where: { name: 'Main League' },
  });

  if (!pool) {
    console.log('Main League pool not found.');
    return;
  }

  // 1. Fetch all picks across all pool members for finalized games
  const picks = await prisma.pick.findMany({
    where: {
      poolId: pool.id,
      game: {
        OR: [
          { status: 'FINAL' },
          { AND: [{ homeScore: { not: null } }, { awayScore: { not: null } }] },
        ],
      },
    },
    include: {
      user: true,
      game: true,
      result: true,
    },
  });

  console.log(`Found ${picks.length} picks on finalized games.`);

  let updatedCount = 0;
  for (const pick of picks) {
    const game = pick.game;
    let winner = null;
    if (game.homeScore !== null && game.awayScore !== null) {
      if (game.homeScore > game.awayScore) winner = game.homeTeamId;
      else if (game.awayScore > game.homeScore) winner = game.awayTeamId;
    }

    const isCorrect = Boolean(winner && pick.selectedTeamId && pick.selectedTeamId === winner);
    const pointsAwarded = isCorrect ? 1.0 : 0.0;

    await prisma.pickResult.upsert({
      where: { pickId: pick.id },
      update: {
        isCorrect,
        pointsAwarded,
      },
      create: {
        pickId: pick.id,
        isCorrect,
        pointsAwarded,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully verified/updated ${updatedCount} PickResult records.`);

  // 2. Fetch Jack's updated score
  const jackPicks = await prisma.pick.findMany({
    where: {
      userId: user.id,
      poolId: pool.id,
    },
    include: {
      result: true,
    },
  });

  const jackPoints = jackPicks.reduce((acc, p) => acc + (p.result ? Number(p.result.pointsAwarded) : 0), 0);
  const jackCorrect = jackPicks.filter((p) => p.result && p.result.isCorrect).length;

  console.log(`\n========================================`);
  console.log(`Jack's Graded Performance:`);
  console.log(`  - Total Finalized Picks Evaluated: ${jackPicks.length}`);
  console.log(`  - Correct Picks: ${jackCorrect}`);
  console.log(`  - Banked Points: ${jackPoints} PTS`);
  console.log(`========================================\n`);

  // 3. Print overall pool leaderboard
  const allMembers = await prisma.poolMembership.findMany({
    where: { poolId: pool.id },
    include: { user: true },
  });

  const summary = [];
  for (const m of allMembers) {
    const mPicks = await prisma.pick.findMany({
      where: { userId: m.userId, poolId: pool.id },
      include: { result: true },
    });
    const totalPts = mPicks.reduce((acc, p) => acc + (p.result ? Number(p.result.pointsAwarded) : 0), 0);
    const correct = mPicks.filter((p) => p.result && p.result.isCorrect).length;
    summary.push({
      email: m.user.email,
      points: totalPts,
      correct,
      total: mPicks.length,
    });
  }

  summary.sort((a, b) => b.points - a.points || b.correct - a.correct);

  console.log('Live Graded Standings:');
  summary.forEach((s, idx) => {
    console.log(`  #${idx + 1}. ${s.email.padEnd(25)} ${s.points} PTS (${s.correct}/${s.total} correct)`);
  });

  await prisma.$disconnect();
}

regradePicks().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
