import { createRequire } from 'module';
const require = createRequire('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/package.json');

const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/.env' });

const { PrismaClient } = require('@prisma/client');

const hostedUrl = process.env.DATABASE_URL || '';
const prismaHosted = new PrismaClient({ datasources: { db: { url: hostedUrl } } });

async function runProvenanceAudit() {
  console.log('=== SECTION 1: HOSTED POST-DROP VERIFICATION & LEDGER PROVENANCE ===\n');

  await prismaHosted.$executeRawUnsafe(`SET TRANSACTION READ ONLY;`);

  // 1. Schema check
  const rehearsalNamespace = await prismaHosted.$queryRawUnsafe(`
    SELECT count(*)::int AS cnt FROM pg_namespace WHERE nspname = 'rehearsal';
  `);
  console.log(`pg_namespace count for 'rehearsal': ${rehearsalNamespace[0].cnt} (Expected: 0)`);

  // 2. Full Table Counts (F1)
  const publicCounts = await prismaHosted.$queryRawUnsafe(`
    SELECT 'users' AS t, count(*)::int AS cnt FROM public.users
    UNION ALL SELECT 'pools', count(*)::int FROM public.pools
    UNION ALL SELECT 'pool_memberships', count(*)::int FROM public.pool_memberships
    UNION ALL SELECT 'games', count(*)::int FROM public.games
    UNION ALL SELECT 'picks', count(*)::int FROM public.picks
    UNION ALL SELECT 'pick_results', count(*)::int FROM public.pick_results
    UNION ALL SELECT 'weekly_submissions', count(*)::int FROM public.weekly_submissions
    UNION ALL SELECT 'penalty_ledger', count(*)::int FROM public.penalty_ledger
    UNION ALL SELECT 'penalty_media', count(*)::int FROM public.penalty_media
    UNION ALL SELECT 'pool_member_stats', count(*)::int FROM public.pool_member_stats
    UNION ALL SELECT 'audit_logs', count(*)::int FROM public.audit_logs
    ORDER BY t;
  `);
  console.log('\n--- Public Table Inventory ---');
  console.table(publicCounts);

  // 3. Penalty Ledger Rows Detailed Provenance
  const ledgerRows = await prismaHosted.$queryRawUnsafe(`
    SELECT 
      pl.id,
      pl.pool_id,
      pl.user_id,
      u.email AS user_email,
      pl.delta::text,
      pl.reason,
      pl.week_number,
      pl.created_by,
      cu.email AS created_by_email,
      pl.created_at
    FROM public.penalty_ledger pl
    LEFT JOIN public.users u ON u.id = pl.user_id
    LEFT JOIN public.users cu ON cu.id = pl.created_by
    ORDER BY pl.created_at ASC;
  `);
  console.log('\n--- Penalty Ledger Rows ---');
  console.log(JSON.stringify(ledgerRows, null, 2));

  // 4. pg_stat_statements query if available
  try {
    const statStatements = await prismaHosted.$queryRawUnsafe(`
      SELECT query, calls, total_exec_time, rows 
      FROM pg_stat_statements 
      WHERE query ILIKE '%penalty_ledger%' 
      ORDER BY total_exec_time DESC 
      LIMIT 10;
    `);
    console.log('\n--- pg_stat_statements (penalty_ledger queries) ---');
    console.table(statStatements);
  } catch (err) {
    console.log('\npg_stat_statements check:', err.message.split('\n')[0]);
  }
}

runProvenanceAudit()
  .catch((e) => {
    console.error('Audit error:', e);
    process.exit(1);
  })
  .finally(() => prismaHosted.$disconnect());
