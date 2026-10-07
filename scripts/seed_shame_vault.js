const { PrismaClient, PenaltyMediaStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedShameVault() {
  console.log('====================================================');
  console.log('🏛️ SEEDING WALL OF SHAME PUNISHMENT VAULT & SHOT-CAM FEED');
  console.log('====================================================\n');

  // 1. Fetch Main League pool
  const pool = await prisma.pool.findFirst({
    where: { name: 'Main League' },
  });

  if (!pool) {
    throw new Error('Main League pool not found');
  }

  // 2. Fetch users
  const users = await prisma.user.findMany();
  const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  const jack = userMap.get('jack@nflpickem.com');
  const nick = userMap.get('nick.s@nflpickem.com');
  const mark = userMap.get('mark.b@nflpickem.com');
  const mattC = userMap.get('matt.c@nflpickem.com');
  const bigJack = userMap.get('bigjack@nflpickem.com');

  if (!jack || !nick || !mark || !mattC || !bigJack) {
    throw new Error('Required league members not found in database.');
  }

  console.log(`✓ Target Pool: ${pool.name} (${pool.id})`);
  console.log(`✓ Found all 5 penalty subject members.`);

  // 3. Define Historical Penalty Fixtures (Weeks 1 to 4)
  const penaltyFixtures = [
    {
      weekNumber: 1,
      user: nick,
      delta: 2.0,
      reason: '[SERVED] Lost London kickoff tiebreaker by 14 points - 2 down the hatch 💀',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      status: PenaltyMediaStatus.CONFIRMED,
      confirmerId: jack.id,
      isSpotlight: false,
      reactions: { '💀': 14, '🍺': 9, '🔥': 6 },
      createdAt: new Date(Date.now() - 21 * 24 * 3600 * 1000 + 4 * 3600 * 1000), // ~3 weeks ago
    },
    {
      weekNumber: 2,
      user: mark,
      delta: 2.0,
      reason: '[SERVED] Lowest score Week 2 (7 pts) - Double tequila shot punishment served like a champ',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      status: PenaltyMediaStatus.CONFIRMED,
      confirmerId: jack.id,
      isSpotlight: false,
      reactions: { '💀': 8, '🍺': 16, '🔥': 4 },
      createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000 + 6 * 3600 * 1000), // ~2 weeks ago
    },
    {
      weekNumber: 3,
      user: mattC,
      delta: 1.0,
      reason: '[SERVED] Faded Chiefs upset on Sunday Night Football - single bourbon penalty downed with zero chaser',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      status: PenaltyMediaStatus.CONFIRMED,
      confirmerId: jack.id,
      isSpotlight: true, // SHOT OF THE WEEK!
      reactions: { '💀': 22, '🍺': 19, '🔥': 31 },
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 3 * 3600 * 1000), // ~1 week ago
    },
    {
      weekNumber: 4,
      user: bigJack,
      delta: 2.5,
      reason: '[DISPUTED] Dead Place Monarch (Week 4 - 8 PTS) | Dispute Reason: Claimed flight delay caused missed London kickoff window.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      status: PenaltyMediaStatus.PENDING,
      confirmerId: null,
      isSpotlight: false,
      reactions: { '💀': 29, '🍺': 12, '🔥': 18 },
      createdAt: new Date(Date.now() - (9 * 3600 * 1000 + 38 * 60 * 1000)), // ~9.5 hours ago
    },
  ];

  // 4. Upsert PenaltyLedger and PenaltyMedia for each fixture
  for (const item of penaltyFixtures) {
    // Ensure pool membership
    await prisma.poolMembership.upsert({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: item.user.id,
        },
      },
      update: {},
      create: {
        poolId: pool.id,
        userId: item.user.id,
      },
    });

    let penalty = await prisma.penaltyLedger.findFirst({
      where: {
        poolId: pool.id,
        userId: item.user.id,
        weekNumber: item.weekNumber,
      },
    });

    if (!penalty) {
      penalty = await prisma.penaltyLedger.create({
        data: {
          poolId: pool.id,
          userId: item.user.id,
          weekNumber: item.weekNumber,
          delta: item.delta,
          reason: item.reason,
          createdAt: item.createdAt,
          createdById: jack.id,
        },
      });
    }

    const media = await prisma.penaltyMedia.upsert({
      where: { penaltyId: penalty.id },
      update: {
        storagePath: item.videoUrl,
        mediaType: 'video/mp4',
        status: item.status,
        confirmedBy: item.confirmerId,
        createdAt: item.createdAt,
      },
      create: {
        penaltyId: penalty.id,
        poolId: pool.id,
        userId: item.user.id,
        storagePath: item.videoUrl,
        mediaType: 'video/mp4',
        status: item.status,
        confirmedBy: item.confirmerId,
        createdAt: item.createdAt,
      },
    });

    // Record AuditLog for Spotlight and Reactions metadata
    await prisma.auditLog.create({
      data: {
        actorId: jack.id,
        action: 'SEED_SHAME_MEDIA_METADATA',
        targetEntityId: media.id,
        newValue: {
          poolId: pool.id,
          mediaId: media.id,
          penaltyId: penalty.id,
          weekNumber: item.weekNumber,
          isSpotlight: item.isSpotlight,
          reactions: item.reactions,
          caption: item.reason,
        },
      },
    });

    console.log(`✓ Seeded Week ${item.weekNumber} penalty & video proof for ${item.user.email} (Media ID: ${media.id})`);
  }

  console.log('\n====================================================');
  console.log('🏛️ PUNISHMENT VAULT SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

seedShameVault().catch((err) => {
  console.error('Error seeding shame vault:', err);
  prisma.$disconnect();
  process.exit(1);
});
