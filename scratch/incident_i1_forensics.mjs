import { createRequire } from 'module';
const require = createRequire('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/package.json');

const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/.env' });

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const hostedUrl = process.env.DATABASE_URL || '';
const prismaHosted = new PrismaClient({ datasources: { db: { url: hostedUrl } } });

async function runForensics() {
  console.log('=== INCIDENT I-1 FORENSICS ON HOSTED DATABASE ===\n');

  const evidenceDir = 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/docs/evidence/I-1';
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // F1. Baseline table counts
  console.log('--- F1: Baseline Public Table Row Counts ---');
  const counts = await prismaHosted.$queryRawUnsafe(`
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
  console.table(counts);

  // F2. Ledger row integrity
  console.log('\n--- F2: Ledger Row Integrity Check ---');
  const ledgerRows = await prismaHosted.$queryRawUnsafe(`
    SELECT id, pool_id, user_id, delta::text, reason, created_by, created_at 
    FROM public.penalty_ledger ORDER BY created_at;
  `);
  console.log('Ledger rows:', ledgerRows);

  // F3. Wrapups in public check
  console.log('\n--- F3: Check weekly_wrapups in public ---');
  const wrapupsInPublic = await prismaHosted.$queryRawUnsafe(`
    SELECT to_regclass('public.weekly_wrapups')::text AS wrapups_in_public;
  `);
  console.log('wrapups_in_public:', wrapupsInPublic);

  // F4. Trigger intact check
  console.log('\n--- F4: BR-1 Trigger Intact Check ---');
  const triggerIntact = await prismaHosted.$queryRawUnsafe(`
    SELECT count(*) = 2 AS intact 
    FROM pg_trigger 
    WHERE tgrelid = 'public.penalty_ledger'::regclass 
      AND NOT tgisinternal 
      AND tgenabled IN ('O','A') 
      AND tgname IN ('penalty_ledger_no_update_delete','penalty_ledger_no_truncate');
  `);
  console.log('intact:', triggerIntact);

  // F5. Public RLS status
  console.log('\n--- F5: Public Table RLS Status ---');
  const rlsStatus = await prismaHosted.$queryRawUnsafe(`
    SELECT relname, relrowsecurity, relforcerowsecurity 
    FROM pg_class 
    WHERE relnamespace = 'public'::regnamespace 
      AND relkind = 'r' 
      AND relname NOT LIKE '_prisma%' 
    ORDER BY relname;
  `);
  console.table(rlsStatus);

  // F6. Entanglement Queries (All 4 must return 0 rows)
  console.log('\n--- F6: Schema Entanglement Audits ---');

  // E1. Cross-schema foreign keys
  const crossFks = await prismaHosted.$queryRawUnsafe(`
    SELECT 
      tc.table_schema AS src_schema, tc.table_name AS src_table, kcu.column_name AS src_col,
      ccu.table_schema AS tgt_schema, ccu.table_name AS tgt_table, ccu.column_name AS tgt_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ((tc.table_schema = 'public' AND ccu.table_schema = 'rehearsal')
        OR (tc.table_schema = 'rehearsal' AND ccu.table_schema = 'public'));
  `);
  console.log(`E1. Cross-schema FKs count: ${crossFks.length}`);

  // E2. Functions/triggers in public referencing rehearsal
  const crossFuncs = await prismaHosted.$queryRawUnsafe(`
    SELECT p.proname, n.nspname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) ILIKE '%rehearsal%';
  `);
  console.log(`E2. Public functions referencing rehearsal count: ${crossFuncs.length}`);

  // E3. Database / role default search_path referencing rehearsal
  const searchPaths = await prismaHosted.$queryRawUnsafe(`
    SELECT rolname, rolconfig::text FROM pg_roles WHERE rolconfig::text ILIKE '%rehearsal%'
    UNION ALL
    SELECT setrole::text, setconfig::text FROM pg_db_role_setting WHERE setconfig::text ILIKE '%rehearsal%';
  `);
  console.log(`E3. Role/DB config referencing rehearsal count: ${searchPaths.length}`);

  // E4. Views crossing schemas
  const crossViews = await prismaHosted.$queryRawUnsafe(`
    SELECT table_schema, table_name, view_definition 
    FROM information_schema.views 
    WHERE (table_schema = 'public' AND view_definition ILIKE '%rehearsal%')
       OR (table_schema = 'rehearsal' AND view_definition ILIKE '%public%');
  `);
  console.log(`E4. Cross-schema views count: ${crossViews.length}`);

  // Check rehearsal schema existence before dump
  const rehearsalExists = await prismaHosted.$queryRawUnsafe(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'rehearsal';
  `);
  console.log(`Rehearsal schema exists on hosted: ${rehearsalExists.length > 0}`);

  if (rehearsalExists.length > 0) {
    // Dump rehearsal schema structure to docs/evidence/I-1/rehearsal_schema_dump.sql
    console.log('\n--- Dumping rehearsal schema structure ---');
    const rehearsalCols = await prismaHosted.$queryRawUnsafe(`
      SELECT table_name, column_name, ordinal_position, column_default, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'rehearsal'
      ORDER BY table_name, ordinal_position;
    `);

    const rehearsalTriggers = await prismaHosted.$queryRawUnsafe(`
      SELECT event_object_table, trigger_name, action_timing, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'rehearsal'
      ORDER BY event_object_table, trigger_name;
    `);

    let rehearsalDump = `-- REHEARSAL SCHEMA DUMP BEFORE DROP (Incident I-1 Evidence)\n-- Captured at ${new Date().toISOString()}\n\n`;
    rehearsalDump += `-- COLUMNS:\n` + JSON.stringify(rehearsalCols, null, 2) + `\n\n`;
    rehearsalDump += `-- TRIGGERS:\n` + JSON.stringify(rehearsalTriggers, null, 2) + `\n`;

    fs.writeFileSync(path.join(evidenceDir, 'rehearsal_schema_dump.sql'), rehearsalDump, 'utf8');
    console.log('✅ Rehearsal schema dump saved to docs/evidence/I-1/rehearsal_schema_dump.sql');
  }

  const allChecksPass = 
    counts.find(c => c.t === 'users')?.cnt === 10 &&
    counts.find(c => c.t === 'pools')?.cnt === 1 &&
    counts.find(c => c.t === 'pool_memberships')?.cnt === 10 &&
    counts.find(c => c.t === 'games')?.cnt === 16 &&
    counts.find(c => c.t === 'picks')?.cnt === 160 &&
    counts.find(c => c.t === 'pick_results')?.cnt === 160 &&
    counts.find(c => c.t === 'weekly_submissions')?.cnt === 0 &&
    counts.find(c => c.t === 'penalty_media')?.cnt === 0 &&
    counts.find(c => c.t === 'pool_member_stats')?.cnt === 10 &&
    counts.find(c => c.t === 'audit_logs')?.cnt === 10 &&
    wrapupsInPublic[0]?.wrapups_in_public === null &&
    triggerIntact[0]?.intact === true &&
    crossFks.length === 0 &&
    crossFuncs.length === 0 &&
    searchPaths.length === 0 &&
    crossViews.length === 0;

  console.log('\n--- Drop Precondition Verdict ---');
  console.log(`ALL ISOLATION & INTEGRITY CHECKS PASSED: ${allChecksPass}`);

  return {
    allChecksPass,
    counts,
    ledgerRows,
    wrapupsInPublic,
    triggerIntact,
    rlsStatus,
    crossFks,
    crossFuncs,
    searchPaths,
    crossViews
  };
}

runForensics()
  .then((res) => {
    console.log('Forensics check completed.');
  })
  .catch((e) => {
    console.error('Forensics error:', e);
    process.exit(1);
  })
  .finally(() => prismaHosted.$disconnect());
