const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Load .env.hosted if present, otherwise .env
if (fs.existsSync(path.resolve(__dirname, '../.env.hosted'))) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.hosted') });
} else {
  dotenv.config();
}

const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

async function runTripwire() {
  console.log('=== TRIPWIRE EXECUTION ===');
  console.log(`Target Database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const timeRes = await prisma.$queryRawUnsafe(`SELECT now() as current_time;`);
    console.log('Database Time:', timeRes);

    const hoursRes = await prisma.$queryRawUnsafe(
      `SELECT EXTRACT(EPOCH FROM (now() - '2026-10-01T06:15Z'::timestamptz))/3600 as hours_since_t0;`
    );
    console.log('Hours Since T0:', hoursRes);

    const regclassRes = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`
    );
    console.log('Regclass weekly_wrapups:', regclassRes);

    const tables = ['pools', 'users', 'games', 'picks', 'pool_memberships', 'penalty_ledger'];
    console.log('Table Row Counts:');
    for (const tbl of tables) {
      try {
        const countRes = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${tbl}";`);
        console.log(`  - ${tbl}: ${countRes[0]?.count ?? '0'}`);
      } catch (err) {
        console.log(`  - ${tbl}: (query error or table does not exist: ${err.message})`);
      }
    }
  } catch (error) {
    console.error('Tripwire Execution Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTripwire();
