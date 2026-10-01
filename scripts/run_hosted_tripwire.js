const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

const isNegativeControl = process.argv.includes('--negative-control') || process.argv.includes('--dummy-localhost');

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

async function runHostedTripwire(targetUrl) {
  console.log('=== HOSTED DATABASE TRIPWIRE (R-12.2-AG) ===\n');

  let dbUrl = targetUrl;
  if (!dbUrl) {
    if (isNegativeControl) {
      dbUrl = 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';
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

  if (!dbUrl) {
    console.error('ERROR: No connection string found in .env.hosted or environment.');
    process.exit(1);
  }

  console.log(`Target Host: ${redactUrl(dbUrl)}`);

  // Inverse Guard: parse host and strictly require Supabase pooler/direct host
  let host = '';
  try {
    const parsed = new URL(dbUrl);
    host = parsed.hostname;
  } catch (e) {
    console.error(`ERROR: Failed to parse DATABASE_URL: ${e.message}`);
    process.exit(1);
  }

  console.log(`Parsed Hostname: ${host}`);

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.includes('local')) {
    console.error('SAFETY_ERROR: Refusing to run against localhost.');
    throw new Error('Refusing to run against localhost: Inverse Guard requires hosted Supabase database (*.pooler.supabase.com or *.supabase.co)');
  }

  const isSupabase = host.endsWith('.supabase.com') || host.endsWith('.supabase.co') || host.includes('pooler.supabase.com');
  if (!isSupabase) {
    console.error(`SAFETY_ERROR: Host '${host}' is not a recognized Supabase hosted endpoint.`);
    throw new Error(`Refusing to run: Host '${host}' is not *.pooler.supabase.com or *.supabase.co`);
  }

  console.log('✅ Inverse Guard verified: Target is confirmed hosted Supabase database.\n');

  const tripwireSql = `
SELECT count(*) as pools_count FROM pools;
SELECT count(*) as users_count FROM users;
SELECT count(*) as penalty_ledger_count FROM penalty_ledger;
SELECT count(*) as weekly_submissions_count FROM weekly_submissions;
SELECT now() as server_time;
SELECT EXTRACT(EPOCH FROM (now() - '2026-10-01T06:15Z'::timestamptz))/3600 as hours_since_t0;
SELECT to_regclass('public.weekly_wrapups') as to_regclass;
`;

  console.log('1. Executing SQL via prisma db execute --stdin...');
  try {
    const isWindows = process.platform === 'win32';
    const shellCmd = isWindows ? 'powershell' : '/bin/sh';
    const execCmd = `npx prisma db execute --url="${dbUrl}" --stdin`;
    const shellArgs = isWindows ? ['-NoProfile', '-Command', execCmd] : ['-c', execCmd];

    const result = spawnSync(shellCmd, shellArgs, {
      input: tripwireSql,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      maxBuffer: 1024 * 1024 * 10,
    });

    const rawOut = ((result.stdout || '') + (result.stderr || '')).trim();
    const safeOut = rawOut.replace(/postgres:[^@]+@/g, 'postgres:****@');
    console.log(safeOut || 'Script executed successfully.');
  } catch (err) {
    console.warn(`Prisma db execute notice: ${err.message}`);
  }

  console.log('\n2. Retrieving Exact Query Results via Database Connection...');
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const timeRes = await prisma.$queryRawUnsafe(`SELECT now() as server_time;`);
    console.log('Database Server Time:', timeRes);

    const hoursRes = await prisma.$queryRawUnsafe(
      `SELECT EXTRACT(EPOCH FROM (now() - '2026-10-01T06:15Z'::timestamptz))/3600 as hours_since_t0;`
    );
    console.log('Hours Since T0 (2026-10-01T06:15Z):', hoursRes);

    const regclassRes = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`
    );
    console.log('to_regclass(public.weekly_wrapups):', regclassRes);

    const tables = ['pools', 'users', 'penalty_ledger', 'weekly_submissions'];
    console.log('\nTable Row Counts:');
    for (const tbl of tables) {
      try {
        const countRes = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${tbl}";`);
        console.log(`  - ${tbl}: ${countRes[0]?.count ?? '0'}`);
      } catch (err) {
        console.log(`  - ${tbl}: (query error / table missing: ${err.message})`);
      }
    }

    console.log('\n✅ Hosted Tripwire executed successfully.');
  } catch (error) {
    console.error('ERROR during query execution:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runHostedTripwire().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runHostedTripwire, redactUrl };
