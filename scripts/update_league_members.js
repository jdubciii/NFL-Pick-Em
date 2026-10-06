const { PrismaClient, Role, Status } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const OFFICIAL_MEMBERS = [
  { oldEmail: 'jack@nflpickem.com', email: 'jack@nflpickem.com', name: 'Jack (You)', role: Role.ADMIN, initials: 'JC' },
  { oldEmail: 'admin@nflpickem.com', email: 'matt.c@nflpickem.com', name: 'Matt Cone', role: Role.USER, initials: 'MC' },
  { oldEmail: 'alice@nflpickem.com', email: 'matt.b@nflpickem.com', name: 'Matt Brickner', role: Role.USER, initials: 'MB' },
  { oldEmail: 'bob@nflpickem.com', email: 'justin.b@nflpickem.com', name: 'Justin Brickner', role: Role.USER, initials: 'JB' },
  { oldEmail: 'charlie@nflpickem.com', email: 'adam.b@nflpickem.com', name: 'Adam Brickner', role: Role.USER, initials: 'AB' },
  { oldEmail: 'david@nflpickem.com', email: 'rich.b@nflpickem.com', name: 'Rich Brickner', role: Role.USER, initials: 'RB' },
  { oldEmail: 'emma@nflpickem.com', email: 'mike.c@nflpickem.com', name: 'Mike Cone', role: Role.USER, initials: 'MK' },
  { oldEmail: 'frank@nflpickem.com', email: 'nick.s@nflpickem.com', name: 'Nick Santos', role: Role.USER, initials: 'NS' },
  { oldEmail: 'grace@nflpickem.com', email: 'mark.b@nflpickem.com', name: 'Mark Brickner', role: Role.USER, initials: 'MR' },
  { oldEmail: 'henry@nflpickem.com', email: 'bigjack@nflpickem.com', name: 'Big Jack', role: Role.USER, initials: 'BJ' },
];

async function updateLeagueMembers() {
  console.log('>>> [League Roster Update] Updating 10 league members with official names and emails...');

  const pool = await prisma.pool.findFirst({ where: { name: 'Main League' } });
  if (!pool) {
    throw new Error('Main League pool not found');
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  for (const m of OFFICIAL_MEMBERS) {
    // Check if user exists by new email first
    let user = await prisma.user.findUnique({ where: { email: m.email } });

    if (!user && m.oldEmail && m.oldEmail !== m.email) {
      // Check if user exists by old email and rename
      const oldUser = await prisma.user.findUnique({ where: { email: m.oldEmail } });
      if (oldUser) {
        user = await prisma.user.update({
          where: { id: oldUser.id },
          data: {
            email: m.email,
            role: m.role,
            passwordHash,
          },
        });
        console.log(`Renamed user: ${m.oldEmail} -> ${m.email} (${m.name})`);
      }
    }

    if (!user) {
      // Create user if neither existed
      user = await prisma.user.create({
        data: {
          email: m.email,
          role: m.role,
          passwordHash,
        },
      });
      console.log(`Created user: ${m.email} (${m.name})`);
    } else {
      // Update role & password
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: m.role, passwordHash },
      });
    }

    // Ensure pool membership
    const membership = await prisma.poolMembership.findUnique({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      await prisma.poolMembership.create({
        data: {
          poolId: pool.id,
          userId: user.id,
          status: Status.ACTIVE,
        },
      });
      console.log(`Enrolled ${m.email} into Main League.`);
    }
  }

  // Verify exactly 10 members in pool
  const officialEmails = OFFICIAL_MEMBERS.map((m) => m.email);
  const deleted = await prisma.poolMembership.deleteMany({
    where: {
      poolId: pool.id,
      user: {
        email: { notIn: officialEmails },
      },
    },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} non-roster memberships.`);
  }

  const activeMembers = await prisma.poolMembership.findMany({
    where: { poolId: pool.id },
    include: { user: true },
    orderBy: { user: { email: 'asc' } },
  });

  console.log(`\nVerified: Exactly ${activeMembers.length} Active Members in Main League:`);
  activeMembers.forEach((mem, idx) => {
    const meta = OFFICIAL_MEMBERS.find((m) => m.email === mem.user.email);
    console.log(`  ${idx + 1}. ${mem.user.email.padEnd(25)} -> ${meta?.name || 'Unknown'} [${meta?.initials}] (${mem.user.role})`);
  });

  await prisma.$disconnect();
}

updateLeagueMembers().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
