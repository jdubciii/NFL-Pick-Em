import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { assertDisposableUrl, assertDisposableServer } from '../../src/db/safeguards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(rootDir, '.env') });

const localRehearsalUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';
const localDefaultUrl = localRehearsalUrl.replace(/\/pickem_[a-zA-Z0-9_-]+/, '/postgres');

async function resetRehearsal() {
  console.log('=== RESET REHEARSAL DATABASE (Decision #35) ===\n');

  // 1. Assert URL safety
  assertDisposableUrl(localRehearsalUrl);
  console.log('✅ URL Safety verified (localhost, no schema, pickem_rehearsal).');

  // 2. Terminate existing connections and recreate database
  const prismaAdmin = new PrismaClient({ datasources: { db: { url: localDefaultUrl } } });
  try {
    console.log('Terminating active connections to pickem_rehearsal...');
    await prismaAdmin.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'pickem_rehearsal' AND pid <> pg_backend_pid();
    `).catch(() => {});

    console.log('Dropping and recreating pickem_rehearsal...');
    await prismaAdmin.$executeRawUnsafe(`DROP DATABASE IF EXISTS pickem_rehearsal;`);
    await prismaAdmin.$executeRawUnsafe(`CREATE DATABASE pickem_rehearsal OWNER postgres;`);
    await prismaAdmin.$executeRawUnsafe(`ALTER DATABASE pickem_rehearsal SET timezone = 'UTC';`);
    await prismaAdmin.$executeRawUnsafe(`ALTER DATABASE pickem_rehearsal SET app.disposable = 'true';`);
    console.log('✅ pickem_rehearsal database recreated with timezone=UTC and app.disposable=true.');
  } finally {
    await prismaAdmin.$disconnect();
  }

  // 3. Connect to fresh pickem_rehearsal, assert server sentinel, and bootstrap roles
  const prismaRehearsal = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });
  try {
    await assertDisposableServer(prismaRehearsal);
    console.log('✅ Server sentinel app.disposable verified.');

    const roles = ['anon', 'authenticated', 'service_role'];
    for (const r of roles) {
      await prismaRehearsal.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${r}') THEN
            CREATE ROLE ${r} NOLOGIN;
          END IF;
        END $$;
      `);
      console.log(`✅ Role '${r}' provisioned.`);
    }
  } finally {
    await prismaRehearsal.$disconnect();
  }

  // 4. Run prisma migrate deploy
  console.log('\n--- Running prisma migrate deploy on pickem_rehearsal ---');
  const deployOutput = execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: localRehearsalUrl },
    cwd: rootDir,
    encoding: 'utf8',
  });
  console.log(deployOutput);

  // 5. Verification check
  const prismaVerify = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });
  try {
    const migs = await prismaVerify.$queryRawUnsafe(`
      SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;
    `);
    console.log('Applied Migrations:');
    console.table(migs);

    const wrapupCheck = await prismaVerify.$queryRawUnsafe(`
      SELECT to_regclass('public.weekly_wrapups')::text AS wrapups_table;
    `);
    console.log(`weekly_wrapups exists in public: ${wrapupCheck[0]?.wrapups_table !== null} (Expected: false)`);
  } finally {
    await prismaVerify.$disconnect();
  }
}

resetRehearsal().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});
