const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OFFICIAL_EMAILS = [
  'jack@nflpickem.com',
  'admin@nflpickem.com',
  'alice@nflpickem.com',
  'bob@nflpickem.com',
  'charlie@nflpickem.com',
  'david@nflpickem.com',
  'emma@nflpickem.com',
  'frank@nflpickem.com',
  'grace@nflpickem.com',
  'henry@nflpickem.com',
];

async function cleanup() {
  console.log('>>> Auditing pool memberships in Main League...');
  const pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) {
    console.log('Main League pool not found.');
    return;
  }

  // Remove memberships not in official 10
  const deletedMemberships = await prisma.poolMembership.deleteMany({
    where: {
      poolId: pool.id,
      user: {
        email: {
          notIn: OFFICIAL_EMAILS,
        },
      },
    },
  });
  console.log(`Deleted ${deletedMemberships.count} orphaned pool memberships.`);

  // Remove picks from non-official users
  const deletedPicks = await prisma.pick.deleteMany({
    where: {
      poolId: pool.id,
      user: {
        email: {
          notIn: OFFICIAL_EMAILS,
        },
      },
    },
  });
  console.log(`Deleted ${deletedPicks.count} orphaned picks.`);

  // List active members
  const activeMemberships = await prisma.poolMembership.findMany({
    where: { poolId: pool.id },
    include: { user: true },
    orderBy: { user: { email: 'asc' } },
  });

  console.log(`\nActive Members in Main League (${activeMemberships.length}):`);
  activeMemberships.forEach((m, idx) => {
    console.log(`  ${idx + 1}. ${m.user.email} (${m.user.role})`);
  });

  await prisma.$disconnect();
}

cleanup().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
