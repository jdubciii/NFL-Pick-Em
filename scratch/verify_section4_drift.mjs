import { createRequire } from 'module';
const require = createRequire('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/package.json');

const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/.env' });

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

const localUrl = 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';
const hostedEnv = dotenv.parse(fs.readFileSync('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/.env.hosted'));
const hostedUrl = hostedEnv.DATABASE_URL;

const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } });
const prismaHosted = new PrismaClient({ datasources: { db: { url: hostedUrl } } });

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

async function runSection4() {
  console.log('=== SECTION 4: BR-0 DRIFT RESOLUTION & NORMALIZED SCHEMA COMPARISON ===\n');

  // 1. Migrations on local pickem_rehearsal
  const localMigs = await prismaLocal.$queryRawUnsafe(`
    SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;
  `);
  console.log('--- Migrations on pickem_rehearsal ---');
  console.table(localMigs);

  // 2. Check prisma/migrations directory
  const migrationDirs = fs.readdirSync('c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/prisma/migrations')
    .filter(f => !f.startsWith('.') && fs.statSync(`c:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/prisma/migrations/${f}`).isDirectory());
  console.log('--- Migration directories in prisma/migrations ---');
  console.log(migrationDirs);

  // 3. Schema DDL comparison
  async function getSchemaDDL(client, schema) {
    const cols = await client.$queryRawUnsafe(`
      SELECT table_name, column_name, ordinal_position, column_default, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_schema = '${schema}' AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name, column_name;
    `);

    const tables = await client.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE' AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name;
    `);

    const triggers = await client.$queryRawUnsafe(`
      SELECT event_object_table, trigger_name, action_timing, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = '${schema}'
      ORDER BY event_object_table, trigger_name;
    `);

    let normalized = `-- Normalized Schema Dump for schema=${schema}\n`;
    for (const t of tables) {
      normalized += `\nTABLE: ${t.table_name}\n`;
      const tCols = cols.filter(c => c.table_name === t.table_name);
      for (const c of tCols) {
        normalized += `  COLUMN ${c.column_name} TYPE ${c.udt_name} NULLABLE=${c.is_nullable} DEFAULT=${c.column_default}\n`;
      }
    }
    normalized += `\nTRIGGERS:\n`;
    for (const trg of triggers) {
      normalized += `  TRIGGER ${trg.trigger_name} ON ${trg.event_object_table} ${trg.action_timing} ${trg.event_manipulation}\n`;
    }
    return normalized;
  }

  const hostedDDL = await getSchemaDDL(prismaHosted, 'public');
  const localDDL = await getSchemaDDL(prismaLocal, 'public');

  const normHosted = hostedDDL.replace(/schema=public/g, 'schema=normalized');
  const normLocal = localDDL.replace(/schema=public/g, 'schema=normalized');

  const hostedHash = sha256(normHosted);
  const localHash = sha256(normLocal);

  console.log('\n--- Normalized Schema Hashes ---');
  console.log(`Hosted Public SHA-256:         ${hostedHash}`);
  console.log(`Local pickem_rehearsal SHA-256: ${localHash}`);
  console.log(`Hash Exact Match:              ${hostedHash === localHash}`);
  console.log(`Diff byte size:                ${Math.abs(normHosted.length - normLocal.length)} bytes`);
}

runSection4()
  .catch((err) => console.error(err))
  .finally(() => {
    prismaLocal.$disconnect();
    prismaHosted.$disconnect();
  });
