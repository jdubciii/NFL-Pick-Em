import { createRequire } from 'module';
const require = createRequire('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/package.json');

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const localDefaultUrl = 'postgresql://postgres:postgres@localhost:5432/postgres';
const localRehearsalUrl = 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

async function bootstrap() {
  console.log('=== STEP 1: Connect to localhost:5432 postgres and provision pickem_rehearsal ===');
  
  const prismaAdmin = new PrismaClient({ datasources: { db: { url: localDefaultUrl } } });

  try {
    // 1. Create database and settings
    await prismaAdmin.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pickem_rehearsal') THEN
          CREATE DATABASE pickem_rehearsal OWNER postgres;
        END IF;
      END $$;
    `).catch(async () => {
      // Direct SQL if DO block cannot run CREATE DATABASE
      await prismaAdmin.$executeRawUnsafe(`CREATE DATABASE pickem_rehearsal OWNER postgres;`).catch(() => {});
    });

    await prismaAdmin.$executeRawUnsafe(`ALTER DATABASE pickem_rehearsal SET timezone = 'UTC';`);
    await prismaAdmin.$executeRawUnsafe(`ALTER DATABASE pickem_rehearsal SET app.disposable = 'true';`);
    console.log('✅ pickem_rehearsal created with timezone=UTC and app.disposable=true');
  } finally {
    await prismaAdmin.$disconnect();
  }

  console.log('\n=== STEP 2: Connect to pickem_rehearsal and configure roles ===');
  const prismaRehearsal = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });

  try {
    // Bootstrap roles
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
      console.log(`✅ Role '${r}' verified/created.`);
    }

    // Run identity query
    console.log('\n=== STEP 3: Run Database Identity & Sentinel Check ===');
    const identity = await prismaRehearsal.$queryRawUnsafe(`
      SELECT 
        current_database(), 
        current_setting('app.disposable', true) AS disposable_sentinel, 
        inet_server_addr()::text AS server_addr, 
        inet_server_port() AS server_port, 
        version();
    `);
    console.log('Identity Query Result:', JSON.stringify(identity, null, 2));

    const tz = await prismaRehearsal.$queryRawUnsafe(`SHOW timezone;`);
    console.log('Timezone:', JSON.stringify(tz, null, 2));
  } finally {
    await prismaRehearsal.$disconnect();
  }

  console.log('\n=== STEP 4: Run prisma migrate deploy on pickem_rehearsal ===');
  const migrateOutput = execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: localRehearsalUrl },
    cwd: 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em',
    encoding: 'utf8',
  });
  console.log(migrateOutput);

  // Re-connect to list migrations from _prisma_migrations
  const prismaVerify = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });
  try {
    const migs = await prismaVerify.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name;
    `);
    console.log('\n=== Applied Migrations Inventory ===');
    console.log(`Total Migrations: ${migs.length}`);
    migs.forEach((m, idx) => console.log(`  [${idx + 1}] ${m.migration_name}`));
  } finally {
    await prismaVerify.$disconnect();
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
