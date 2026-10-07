const { PrismaClient, PenaltyMediaStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedShotCamFixture() {
  console.log('====================================================');
  console.log('📸 SEEDING SHOT-CAM FIXTURE (WEEK 4 DEAD PLACE MONARCH)');
  console.log('====================================================\n');

  // 1. Fetch Main League pool
  const pool = await prisma.pool.findFirst({
    where: { name: 'Main League' },
  });

  if (!pool) {
    throw new Error('Main League pool not found');
  }

  // 2. Fetch Big Jack and Jack
  const bigJack = await prisma.user.findUnique({
    where: { email: 'bigjack@nflpickem.com' },
  });

  const jack = await prisma.user.findUnique({
    where: { email: 'jack@nflpickem.com' },
  });

  if (!bigJack || !jack) {
    throw new Error('Users Big Jack or Jack not found');
  }

  console.log(`✓ Pool: ${pool.name} (${pool.id})`);
  console.log(`✓ Dead Place Subject: Big Jack (${bigJack.email} - ${bigJack.id})`);
  console.log(`✓ Commissioner: Jack (${jack.email} - ${jack.id})`);

  // 3. Upsert PenaltyLedger record for Week 4 Dead Place Monarch (2.5 shots)
  const existingPenalty = await prisma.penaltyLedger.findFirst({
    where: {
      poolId: pool.id,
      userId: bigJack.id,
      weekNumber: 4,
    },
  });

  const disputeReason = '[DISPUTED] Dead Place Monarch (Week 4 - 8 PTS) | Dispute Reason: Claimed flight delay caused missed London kickoff window.';
  // Set creation time to 9 hours and 38 minutes ago so ~14h 22m remains in 24h countdown
  const fixtureCreatedAt = new Date(Date.now() - (9 * 3600 * 1000 + 38 * 60 * 1000));

  let penalty;
  if (existingPenalty) {
    penalty = await prisma.penaltyLedger.update({
      where: { id: existingPenalty.id },
      data: {
        delta: 2.5,
        reason: disputeReason,
        createdAt: fixtureCreatedAt,
        createdById: jack.id,
      },
    });
    console.log(`✓ Updated existing Week 4 PenaltyLedger record (${penalty.id})`);
  } else {
    penalty = await prisma.penaltyLedger.create({
      data: {
        poolId: pool.id,
        userId: bigJack.id,
        weekNumber: 4,
        delta: 2.5,
        reason: disputeReason,
        createdAt: fixtureCreatedAt,
        createdById: jack.id,
      },
    });
    console.log(`✓ Created new Week 4 PenaltyLedger record (${penalty.id})`);
  }

  // 4. Upsert PenaltyMedia proof record
  const penaltyMedia = await prisma.penaltyMedia.upsert({
    where: { penaltyId: penalty.id },
    update: {
      storagePath: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mediaType: 'video/mp4',
      status: PenaltyMediaStatus.PENDING,
      confirmedBy: null,
      createdAt: new Date(),
    },
    create: {
      penaltyId: penalty.id,
      poolId: pool.id,
      userId: bigJack.id,
      storagePath: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mediaType: 'video/mp4',
      status: PenaltyMediaStatus.PENDING,
    },
  });

  console.log(`✓ Upserted PenaltyMedia proof for Big Jack (${penaltyMedia.id})`);

  // 5. Update PoolMemberStat
  await prisma.poolMemberStat.upsert({
    where: {
      poolId_userId: {
        poolId: pool.id,
        userId: bigJack.id,
      },
    },
    update: {
      totalShotsDrank: 2.5,
      deadPlaceFinishes: 1,
    },
    create: {
      poolId: pool.id,
      userId: bigJack.id,
      totalShotsDrank: 2.5,
      firstPlaceFinishes: 0,
      deadPlaceFinishes: 1,
    },
  });

  // 6. Record AuditLog entry
  await prisma.auditLog.create({
    data: {
      actorId: jack.id,
      action: 'SEED_SHOT_CAM_FIXTURE',
      targetEntityId: penalty.id,
      newValue: {
        poolId: pool.id,
        userId: bigJack.id,
        weekNumber: 4,
        penaltyShots: 2.5,
        status: 'DISPUTED',
      },
    },
  });

  console.log('\n====================================================');
  console.log('📸 SHOT-CAM FIXTURE SEEDED: Big Jack has active Week 4 DISPUTED status with 2.5 shots.');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

seedShotCamFixture().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
