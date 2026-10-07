import { Router, Request, Response } from 'express';
import { gamedayStreamHub } from '../services/GamedayStreamHub';

const router = Router();

router.get('/api/stream/gameday', (req: Request, res: Response) => {
  const poolId = (req.query.poolId as string) || 'pool-main';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const send = (chunk: string) => {
    res.write(chunk);
  };

  gamedayStreamHub.registerClient(clientId, poolId, send);
  res.write(gamedayStreamHub.formatSSE('CONNECTED', { clientId, poolId, timestamp: new Date().toISOString() }));

  req.on('close', () => {
    gamedayStreamHub.unregisterClient(clientId);
  });
});

export default router;
