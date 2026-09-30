import { createRequire } from 'module';
const require = createRequire('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/package.json');

const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/.env' });

const { PrismaClient } = require('@prisma/client');

const hostedUrl = process.env.DATABASE_URL || '';
const prismaHosted = new PrismaClient({ datasources: { db: { url: hostedUrl } } });

async function executeGuardedDrop() {
  console.log('=== EXECUTING GUARDED DROP OF REHEARSAL SCHEMA ON HOSTED DB ===\n');

  console.log('Running DROP SCHEMA IF EXISTS rehearsal CASCADE...');
  await prismaHosted.$executeRawUnsafe(`DROP SCHEMA IF EXISTS rehearsal CASCADE;`);
  console.log('✅ DROP SCHEMA rehearsal CASCADE executed successfully.');

  console.log('\n--- Post-Drop Re-Verification ---');
  const rehearsalExists = await prismaHosted.$queryRawUnsafe(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'rehearsal';
  `);
  console.log(`Rehearsal schema exists on hosted: ${rehearsalExists.length > 0} (Expected: false)`);

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
  console.table(publicCounts);

  const triggerIntact = await prismaHosted.$queryRawUnsafe(`
    SELECT count(*) = 2 AS intact 
    FROM pg_trigger 
    WHERE tgrelid = 'public.penalty_ledger'::regclass 
      AND NOT tgisinternal 
      AND tgenabled IN ('O','A') 
      AND tgname IN ('penalty_ledger_no_update_delete','penalty_ledger_no_truncate');
  `);
  console.log('Trigger intact:', triggerIntact[0]?.intact);
}

executeGuardedDrop()
  .catch((e) => {
    console.error('Drop execution error:', e);
    process.exit(1);
  })
  .finally(() => prismaHosted.$disconnect());
