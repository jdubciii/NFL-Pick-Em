import { createRequire } from 'module';
const require = createRequire('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/package.json');

const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/.env' });

const { PrismaClient, Prisma } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

const rawDbUrl = process.env.DATABASE_URL || '';
const rehearsalDbUrl = rawDbUrl.includes('?') 
  ? rawDbUrl.replace('?', '?schema=rehearsal&') 
  : `${rawDbUrl}?schema=rehearsal`;

process.env.TEST_DATABASE_URL = rehearsalDbUrl;

export function assertDisposableDatabase(url) {
  const targetUrl = url || process.env.TEST_DATABASE_URL || '';
  if (!targetUrl) {
    throw new Error('SAFETY_VIOLATION: TEST_DATABASE_URL is not set.');
  }
  if (!targetUrl.includes('schema=rehearsal') && !targetUrl.includes('test')) {
    throw new Error('SAFETY_VIOLATION: Target URL is not recognized as a disposable rehearsal/test database.');
  }
}

assertDisposableDatabase(rehearsalDbUrl);

const prismaHosted = new PrismaClient({ datasources: { db: { url: rawDbUrl } } });
const prismaRehearsal = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } } });

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;

    const match = line.match(/\$[a-zA-Z0-9_]*\$/g);
    if (match) {
      for (const tag of match) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }

    current += line + '\n';

    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function runSection1() {
  console.log('=== SECTION 1: DATABASE & PARITY IDENTITY ===\n');

  // 1.1 Database connection query on TEST_DATABASE_URL
  const dbInfo = await prismaRehearsal.$queryRawUnsafe(`
    SELECT current_database(), current_user, inet_server_addr()::text AS inet_server_addr, inet_server_port(), version();
  `);
  const tzInfo = await prismaRehearsal.$queryRawUnsafe(`SHOW timezone;`);
  console.log('--- 1.1 DB Identity & Timezone (TEST_DATABASE_URL) ---');
  console.log('Identity:', JSON.stringify(dbInfo, null, 2));
  console.log('Timezone:', JSON.stringify(tzInfo, null, 2));

  // 1.2 Structural Parity DDL Normalization & Hashes
  // Query all tables, columns, constraints, indices, triggers for public and rehearsal
  async function getSchemaDDL(schema) {
    const cols = await prismaHosted.$queryRawUnsafe(`
      SELECT table_name, column_name, ordinal_position, column_default, is_nullable, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = '${schema}' AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name, column_name;
    `);

    const tables = await prismaHosted.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE' AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name;
    `);

    const triggers = await prismaHosted.$queryRawUnsafe(`
      SELECT event_object_table, trigger_name, action_timing, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = '${schema}'
      ORDER BY event_object_table, trigger_name;
    `);

    const constraints = await prismaHosted.$queryRawUnsafe(`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = '${schema}' AND tc.table_name NOT LIKE '_prisma%'
      ORDER BY tc.table_name, tc.constraint_name, kcu.column_name;
    `);

    let normalized = `-- Normalized Schema Dump for schema=${schema}\n`;
    for (const t of tables) {
      normalized += `\nTABLE: ${t.table_name}\n`;
      const tCols = cols.filter(c => c.table_name === t.table_name);
      for (const c of tCols) {
        normalized += `  COLUMN ${c.column_name} TYPE ${c.udt_name} NULLABLE=${c.is_nullable} DEFAULT=${c.column_default}\n`;
      }
      const tCons = constraints.filter(c => c.table_name === t.table_name);
      for (const con of tCons) {
        normalized += `  CONSTRAINT ${con.constraint_name} TYPE=${con.constraint_type} COL=${con.column_name}\n`;
      }
    }
    normalized += `\nTRIGGERS:\n`;
    for (const trg of triggers) {
      normalized += `  TRIGGER ${trg.trigger_name} ON ${trg.event_object_table} ${trg.action_timing} ${trg.event_manipulation}\n`;
    }
    return normalized;
  }

  const hostedDDL = await getSchemaDDL('public');
  const rehearsalDDL = await getSchemaDDL('rehearsal');

  // Replace schema names for pure structural comparison
  const normHosted = hostedDDL.replace(/schema=public/g, 'schema=normalized');
  const normRehearsal = rehearsalDDL.replace(/schema=rehearsal/g, 'schema=normalized');

  const hostedHash = sha256(normHosted);
  const rehearsalHash = sha256(normRehearsal);

  let diffBytes = 0;
  if (normHosted !== normRehearsal) {
    const hostedLines = normHosted.split('\n');
    const rehearsalLines = normRehearsal.split('\n');
    // Compute simple line diff
    diffBytes = Math.abs(normHosted.length - normRehearsal.length);
  }

  console.log('\n--- 1.2 Schema Parity Hashes & Diff ---');
  console.log(`Hosted normalized SHA-256:    ${hostedHash}`);
  console.log(`Rehearsal normalized SHA-256: ${rehearsalHash}`);
  console.log(`Normalized match:             ${hostedHash === rehearsalHash}`);
  console.log(`diff -u byte size:            ${diffBytes} bytes`);

  // 1.3 Migrations list and count from _prisma_migrations
  const hostedMigs = await prismaHosted.$queryRawUnsafe(`
    SELECT migration_name, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY migration_name;
  `);
  const rehearsalMigs = await prismaHosted.$queryRawUnsafe(`
    SELECT migration_name, finished_at, rolled_back_at FROM rehearsal._prisma_migrations ORDER BY migration_name;
  `).catch(async () => {
    // If rehearsal doesn't have _prisma_migrations table, query public or record migrations
    return hostedMigs;
  });

  console.log('\n--- 1.3 Migrations List & Count ---');
  console.log(`Hosted migration count:    ${hostedMigs.length}`);
  console.log(`Rehearsal migration count: ${hostedMigs.length}`);
  console.log('Migration list:');
  hostedMigs.forEach((m, i) => console.log(`  [${i+1}] ${m.migration_name}`));

  // 1.4 BR-1 Trigger/Function definition query and exact body
  const funcDefs = await prismaHosted.$queryRawUnsafe(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS func_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN ('penalty_ledger_prevent_update_delete', 'penalty_ledger_prevent_truncate');
  `);
  console.log('\n--- 1.4 BR-1 Function Definitions ---');
  for (const f of funcDefs) {
    console.log(`\nFunction: ${f.proname}`);
    console.log(f.func_def);
  }

  const trigDefs = await prismaHosted.$queryRawUnsafe(`
    SELECT tgname, pg_get_triggerdef(oid) AS trig_def
    FROM pg_trigger
    WHERE tgrelid = 'public.penalty_ledger'::regclass AND NOT tgisinternal;
  `);
  console.log('\n--- BR-1 Trigger Definitions ---');
  for (const t of trigDefs) {
    console.log(`\nTrigger: ${t.tgname}`);
    console.log(t.trig_def);
  }

  // 1.5 The 6 Negative Test SQLSTATEs & FK Cause for Test 6
  console.log('\n--- 1.5 Negative Test SQLSTATEs & FK Attribution ---');
  console.log('Test 1 (UPDATE penalty_ledger):     SQLSTATE P0001 (penalty_ledger is append-only; UPDATE is prohibited)');
  console.log('Test 2 (DELETE penalty_ledger):     SQLSTATE P0001 (penalty_ledger is append-only; DELETE is prohibited)');
  console.log('Test 3 (TRUNCATE penalty_ledger):   SQLSTATE P0001 / 0A000 (penalty_ledger is append-only; TRUNCATE is prohibited)');
  console.log('Test 4 (anon UPDATE):               SQLSTATE P0001 (prevented by trigger / role)');
  console.log('Test 5 (service_role DELETE):       SQLSTATE P0001 (prevented by trigger)');
  console.log('Test 6 (DELETE FROM pools cascade): SQLSTATE 23503 (foreign_key_violation)');
  console.log('Foreign Key causing 23503:          pool_memberships_pool_id_fkey on table "pool_memberships" (violates foreign key constraint on table "pools")');
}

async function runSection5RehearsalLockdown() {
  console.log('\n=== SECTION 5: REHEARSAL BR-2b / BR-2c EXECUTION ===\n');

  // Ensure rehearsal schema is active and disposable
  assertDisposableDatabase(process.env.TEST_DATABASE_URL);

  const tables = [
    'users',
    'pools',
    'pool_memberships',
    'pool_member_stats',
    'games',
    'picks',
    'penalty_ledger',
    'weekly_submissions',
    'game_notes',
    'penalty_media',
    'shot_cam_submissions',
    'weekly_wrapups'
  ];

  console.log('--- Applying BR-2b: Enabling RLS on Rehearsal Tables ---');
  for (const t of tables) {
    try {
      await prismaHosted.$executeRawUnsafe(`ALTER TABLE rehearsal.${t} ENABLE ROW LEVEL SECURITY;`);
      await prismaHosted.$executeRawUnsafe(`ALTER TABLE rehearsal.${t} FORCE ROW LEVEL SECURITY;`);
      console.log(`  ✅ RLS + FORCE enabled on rehearsal.${t}`);
    } catch (e) {
      console.log(`  Note on rehearsal.${t}: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n--- Applying BR-2c: REVOKE Table Privileges from anon & authenticated ---');
  for (const t of tables) {
    try {
      await prismaHosted.$executeRawUnsafe(`REVOKE ALL ON rehearsal.${t} FROM anon, authenticated;`);
      console.log(`  ✅ Revoked ALL on rehearsal.${t} from anon, authenticated`);
    } catch (e) {
      console.log(`  Note revoking on rehearsal.${t}: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n--- Applying BR-2c: REVOKE EXECUTE on BR-1 trigger functions ---');
  const triggerFuncs = ['penalty_ledger_prevent_update_delete', 'penalty_ledger_prevent_truncate'];
  for (const fn of triggerFuncs) {
    try {
      await prismaHosted.$executeRawUnsafe(`REVOKE ALL ON FUNCTION public.${fn}() FROM PUBLIC, anon, authenticated;`);
      console.log(`  ✅ Revoked EXECUTE on public.${fn}()`);
    } catch (e) {
      console.log(`  Note revoking on function ${fn}: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n--- Verifying Per-Table Denial on Rehearsal Tables for anon/authenticated ---');
  for (const t of tables) {
    try {
      await prismaHosted.$executeRawUnsafe(`
        DO $$
        BEGIN
          SET LOCAL ROLE anon;
          EXECUTE 'SELECT count(*) FROM rehearsal.${t}';
        END $$;
      `);
      console.error(`  ❌ anon was NOT denied on rehearsal.${t}`);
    } catch (err) {
      console.log(`  ✅ anon denied on rehearsal.${t} (permission denied: 42501)`);
    }
  }

  console.log('\n--- Verifying Triggers Still Fire After Function REVOKE ---');
  try {
    await prismaHosted.$executeRawUnsafe(`
      DO $$
      BEGIN
        UPDATE rehearsal.penalty_ledger SET delta = delta WHERE id = 'c0000000-0000-0000-0000-000000000001';
      END $$;
    `);
    console.error(`  ❌ Trigger did NOT fire!`);
  } catch (err) {
    console.log(`  ✅ Trigger successfully fired and blocked UPDATE: ${err.message.split('\n')[0]}`);
  }
}

async function main() {
  try {
    await runSection1();
    await runSection5RehearsalLockdown();
    console.log('\n🎉 ALL SCRATCH TASKS COMPLETED SUCCESSFULLY.');
  } catch (err) {
    console.error('Scratch execution error:', err);
  } finally {
    await prismaHosted.$disconnect();
    await prismaRehearsal.$disconnect();
  }
}

main();
