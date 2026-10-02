import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'prisma/migrations');

const dirs = fs.readdirSync(migrationsDir).filter(d => {
  return fs.statSync(path.join(migrationsDir, d)).isDirectory() && d.includes('12_1_a_outbox_inbox_core');
});

if (dirs.length === 0) {
  console.error('FATAL: Could not find migration directory containing "12_1_a_outbox_inbox_core"');
  process.exit(1);
}

const targetDir = path.join(migrationsDir, dirs[0]);
const targetFile = path.join(targetDir, 'migration.sql');

if (!fs.existsSync(targetFile)) {
  console.error(`FATAL: migration.sql does not exist at ${targetFile}`);
  process.exit(1);
}

const rlsSql = `
-- Decision #15: Deny-by-default Data API access
REVOKE ALL ON inbox_messages FROM anon, authenticated;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON outbox_events FROM anon, authenticated;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON notification_preferences FROM anon, authenticated;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON job_runs FROM anon, authenticated;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

-- Enforce constraints per Directive 4.2
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0);
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_offsets_cardinality_check CHECK (cardinality(reminder_offsets_hours) <= 5);
`;

const currentContent = fs.readFileSync(targetFile, 'utf8');
if (currentContent.includes('REVOKE ALL ON inbox_messages')) {
  console.log('RLS snippet already present in migration.sql');
} else {
  fs.appendFileSync(targetFile, rlsSql, 'utf8');
  console.log(`✅ Appended RLS and security constraints to ${targetFile}`);
}
