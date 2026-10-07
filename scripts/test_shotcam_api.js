const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) throw new Error('No pool');

  const penalty = await prisma.penaltyLedger.findFirst({
    where: { poolId: pool.id, weekNumber: 4 },
    include: {
      membership: { include: { user: true } },
      media: { include: { confirmer: true } },
    },
  });

  console.log('✅ Shot-Cam Active Fixture Verified in DB:');
  console.log({
    penaltyId: penalty.id,
    subject: penalty.membership.user.email,
    delta: Number(penalty.delta),
    reason: penalty.reason,
    createdAt: penalty.createdAt.toISOString(),
    mediaPath: penalty.media?.storagePath,
    mediaStatus: penalty.media?.status,
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
