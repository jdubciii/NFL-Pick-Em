import { app } from './server';
import { startLiveScheduleDaemon, stopLiveScheduleDaemon } from './services/liveScheduleDaemon';
import { startLiveScorePoller, stopLiveScorePoller } from './services/liveScorePoller';
import { isBackgroundJobsEnabled } from './services/advisoryLockService';

const PORT = process.env.PORT || 3000;

export { startLiveScorePoller, stopLiveScorePoller };

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  if (isBackgroundJobsEnabled()) {
    console.log('[BackgroundJobs] 🚀 BACKGROUND_JOBS_ENABLED=true: Starting background ingest & scoring daemons.');
    startLiveScheduleDaemon();
    startLiveScorePoller();
  } else {
    console.log('[BackgroundJobs] ⏸️ BACKGROUND_JOBS_ENABLED is false or not set: Background daemons disabled (safe default).');
  }
});

// Graceful lifecycle shutdown for Render / container restarts
const handleShutdown = (signal: string) => {
  console.log(`[Server] Received ${signal}. Stopping background workers and closing HTTP listener...`);
  stopLiveScheduleDaemon();
  stopLiveScorePoller();
  server.close(() => {
    console.log('[Server] HTTP listener closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
