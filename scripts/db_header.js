import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('=== DB Header & Rehearsal Verification ===\n');
  try {
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, inet_server_addr(), inet_server_port();`;
    console.log('1. Database Identity:');
    console.log(JSON.stringify(dbInfo, null, 2));

    const migrations = await prisma.$queryRaw`SELECT migration_name, started_at, finished_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at ASC;`;
    console.log('\n2. Applied Migrations:');
    console.log(JSON.stringify(migrations, null, 2));

    console.log('\n3. Prisma Migrate Status:');
    try {
      const statusOutput = execSync('npx prisma migrate status', {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
        shell: true,
      });
      console.log(statusOutput.replace(/\x00/g, '').trim());
    } catch (e) {
      console.log((e.stdout && e.stdout.toString().trim()) || (e.stderr && e.stderr.toString().trim()) || e.message);
    }
  } catch (err) {
    console.error('Error during db_header execution:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
