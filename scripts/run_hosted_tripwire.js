const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

function redactUrl(rawUrl) {
  if (!rawUrl) return '(undefined)';
  try {
    const parsed = new URL(rawUrl);
    const user = parsed.username ? parsed.username.split('.')[0] + '.[REDACTED]' : '[REDACTED]';
    return `${parsed.protocol}//${user}:****@${parsed.host}${parsed.pathname}`;
  } catch (e) {
    return rawUrl.replace(/:[^:@]+@/, ':****@');
  }
}

function sanitizeOutput(text) {
  if (!text) return '';
  return text
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://[REDACTED]:****@')
    .replace(/password=[^\s;&]+/gi, 'password=****')
    .replace(/:[A-Za-z0-9_!@#$%^&*()\-+=]+@/g, ':****@');
}

async function runHostedTripwire(targetUrl) {
  console.log('=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===\n');

  let dbUrl = targetUrl;
  const args = process.argv.slice(2);
  
  if (!dbUrl) {
    if (args.includes('--dummy-localhost') || args.includes('--negative-control')) {
      dbUrl = 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';
    } else if (args.includes('--dummy-127.0.0.1')) {
      dbUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/pickem_rehearsal';
    } else {
      const explicitUrlArg = args.find(a => a.startsWith('postgres://') || a.startsWith('postgresql://'));
      if (explicitUrlArg) {
        dbUrl = explicitUrlArg;
      } else {
        const envHostedPath = path.resolve(__dirname, '../.env.hosted');
        if (fs.existsSync(envHostedPath)) {
          const envConfig = dotenv.parse(fs.readFileSync(envHostedPath));
          dbUrl = envConfig.DATABASE_URL || envConfig.DIRECT_URL || envConfig.TEST_DATABASE_URL;
        }
        if (!dbUrl) {
          dbUrl = process.env.DATABASE_URL;
        }
      }
    }
  }

  if (!dbUrl) {
    console.error('ERROR: No connection string found in .env.hosted or environment.');
    process.exit(1);
  }

  console.log(`Target Host: ${redactUrl(dbUrl)}`);

  // Parse hostname for Inverse Guard
  let host = '';
  try {
    const parsed = new URL(dbUrl);
    host = parsed.hostname;
  } catch (e) {
    console.error(`ERROR: Failed to parse DATABASE_URL: ${e.message}`);
    process.exit(1);
  }

  console.log(`Parsed Hostname: ${host}`);

  // Strict Inverse Guard enforcement
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.includes('localhost') || host.includes('127.0.0.1')) {
    console.error('SAFETY_ERROR: Refusing to run against localhost.');
    throw new Error('Refusing to run against localhost');
  }

  const isSupabase = host.endsWith('.supabase.com') || host.endsWith('.supabase.co') || host.includes('pooler.supabase.com');
  if (!isSupabase) {
    console.error(`SAFETY_ERROR: Host '${host}' is not a recognized Supabase hosted endpoint.`);
    throw new Error(`Refusing to run: Host '${host}' is not *.pooler.supabase.com or *.supabase.co`);
  }

  console.log('✅ Inverse Guard verified: Target is confirmed hosted Supabase database.\n');

  console.log('Connecting via Node pg client to stream exact query rows...\n');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // 1. Host Class, Database, Current User, Server Version
    const dbInfoRes = await client.query(`SELECT current_database(), current_user, version();`);
    const dbInfo = dbInfoRes.rows[0];
    console.log('1. Database Identity & Server Info:');
    console.log(`  - Database: ${dbInfo.current_database}`);
    console.log(`  - Current User: ${dbInfo.current_user}`);
    console.log(`  - Version: ${dbInfo.version}`);

    // 2. Server Time & Hours Since T0
    const timeRes = await client.query(
      `SELECT now() AS db_now, EXTRACT(EPOCH FROM (now() - TIMESTAMPTZ '2026-09-30T06:14:37Z'))/3600 AS hours_since_t0;`
    );
    const timeInfo = timeRes.rows[0];
    console.log('\n2. Timestamp & Drift Metrics:');
    console.log(`  - DB Server Time: ${timeInfo.db_now}`);
    console.log(`  - Hours Since T0 (2026-09-30T06:14:37Z): ${Number(timeInfo.hours_since_t0).toFixed(4)} hrs`);

    // 3. All 11 Table Counts
    const countsSql = `
      SELECT 'users' t, count(*) FROM users
      UNION ALL SELECT 'pools', count(*) FROM pools
      UNION ALL SELECT 'pool_memberships', count(*) FROM pool_memberships
      UNION ALL SELECT 'games', count(*) FROM games
      UNION ALL SELECT 'picks', count(*) FROM picks
      UNION ALL SELECT 'pick_results', count(*) FROM pick_results
      UNION ALL SELECT 'weekly_submissions', count(*) FROM weekly_submissions
      UNION ALL SELECT 'penalty_ledger', count(*) FROM penalty_ledger
      UNION ALL SELECT 'penalty_media', count(*) FROM penalty_media
      UNION ALL SELECT 'pool_member_stats', count(*) FROM pool_member_stats
      UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs;
    `;
    const countsRes = await client.query(countsSql);
    console.log('\n3. All 11 Table Row Counts:');
    for (const row of countsRes.rows) {
      console.log(`  - ${row.t.padEnd(20)}: ${row.count}`);
    }

    // 4. public.weekly_wrapups table existence check
    const wrapupRes = await client.query(`SELECT to_regclass('public.weekly_wrapups') AS to_regclass;`);
    console.log(`\n4. to_regclass('public.weekly_wrapups'): ${wrapupRes.rows[0].to_regclass ?? 'NULL'}`);

    // 5. Applied Migrations
    const migsRes = await client.query(`SELECT migration_name FROM _prisma_migrations ORDER BY started_at;`);
    console.log(`\n5. Applied Migrations (${migsRes.rows.length} total):`);
    for (const m of migsRes.rows) {
      console.log(`  - ${m.migration_name}`);
    }

    // 6. Penalty Ledger Triggers Intact
    const triggerRes = await client.query(`
      SELECT count(*) = 2 AS intact 
      FROM pg_trigger 
      WHERE tgrelid='public.penalty_ledger'::regclass 
        AND NOT tgisinternal 
        AND tgenabled IN ('O','A')
        AND tgname IN ('penalty_ledger_no_update_delete','penalty_ledger_no_truncate');
    `);
    console.log(`\n6. Penalty Ledger Immutability Triggers Intact: ${triggerRes.rows[0].intact ? 'TRUE' : 'FALSE'}`);

    // 7. RLS Status across public tables
    const rlsRes = await client.query(`
      SELECT count(*) FILTER (WHERE relrowsecurity) AS rls_on, count(*) AS tables 
      FROM pg_class 
      WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p');
    `);
    const rlsInfo = rlsRes.rows[0];
    console.log(`\n7. Row-Level Security: rls_on: ${rlsInfo.rls_on}/${rlsInfo.tables}`);

    console.log('\n✅ Hosted Tripwire executed successfully.');
  } catch (error) {
    console.error('ERROR during query execution:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

if (require.main === module) {
  runHostedTripwire().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runHostedTripwire, redactUrl, sanitizeOutput };
