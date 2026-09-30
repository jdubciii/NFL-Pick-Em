import { createRequire } from 'module';
const require = createRequire('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/package.json');

const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/.env.hosted' });

const { PrismaClient } = require('@prisma/client');

const hostedUrl = process.env.DATABASE_URL || '';
const prismaHosted = new PrismaClient({ datasources: { db: { url: hostedUrl } } });

async function runSection2() {
  console.log('=== SECTION 2: LEDGER ROW PROVENANCE COMPLETION ===\n');

  await prismaHosted.$executeRawUnsafe(`SET TRANSACTION READ ONLY;`);

  const ledgerRows = await prismaHosted.$queryRawUnsafe(`
    SELECT 
      id,
      pool_id,
      user_id,
      substring(user_id::text, 1, 8) AS user_id_prefix,
      length(user_id::text) AS user_id_len,
      delta::text,
      reason,
      week_number,
      created_by,
      substring(created_by::text, 1, 8) AS created_by_prefix,
      length(created_by::text) AS created_by_len,
      created_at
    FROM public.penalty_ledger
    ORDER BY created_at ASC;
  `);

  console.log('--- Hosted Penalty Ledger Detailed Records ---');
  console.log(JSON.stringify(ledgerRows, null, 2));

  // Query application name and query details from pg_stat_activity / pg_stat_statements if present
  try {
    const statQueries = await prismaHosted.$queryRawUnsafe(`
      SELECT query, calls, rows 
      FROM pg_stat_statements 
      WHERE query ILIKE '%penalty_ledger%' AND query ILIKE '%INSERT%'
      ORDER BY total_exec_time DESC;
    `);
    console.log('\n--- pg_stat_statements Insert Queries ---');
    console.table(statQueries);
  } catch (e) {
    console.log('pg_stat_statements notice:', e.message.split('\n')[0]);
  }
}

runSection2()
  .catch((err) => console.error(err))
  .finally(() => prismaHosted.$disconnect());
