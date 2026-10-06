const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Database Verification: 2026 NFL Season (Weeks 1-18) ===');
  let total = 0;
  for (let w = 1; w <= 18; w++) {
    const padded = w < 10 ? `_w0${w}_` : `_w${w}_`;
    const games = await prisma.game.findMany({
      where: { externalGameId: { contains: padded } },
      orderBy: { kickoffTime: 'asc' },
    });
    total += games.length;
    const finalCount = games.filter(g => g.status === 'FINAL').length;
    const scheduledCount = games.filter(g => g.status === 'SCHEDULED').length;
    const sample = games[0] ? `${games[0].awayTeamId} @ ${games[0].homeTeamId} (${games[0].kickoffTime.toISOString()})` : 'None';
    console.log(`Week ${String(w).padStart(2)}: ${String(games.length).padStart(2)} games | ${finalCount} FINAL, ${scheduledCount} SCHED | First game: ${sample}`);
  }
  console.log(`\nTotal verified games: ${total}`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
