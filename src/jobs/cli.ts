import { runOutboxDrain, runReminderScan } from './jobRunner';

const command = process.argv[2];

async function main() {
  if (command === 'drain') {
    const { jobRun, drainResult } = await runOutboxDrain();
    console.log('Outbox drain finished:', jobRun.status, JSON.stringify(drainResult));
    process.exit(jobRun.status === 'OK' ? 0 : 1);
  } else if (command === 'remind') {
    const { jobRun, enqueuedCount } = await runReminderScan();
    console.log('Reminder scan finished:', jobRun.status, 'enqueued:', enqueuedCount);
    process.exit(jobRun.status === 'OK' ? 0 : 1);
  } else {
    console.error('Unknown job command:', command);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Job CLI fatal error:', err);
  process.exit(1);
});
