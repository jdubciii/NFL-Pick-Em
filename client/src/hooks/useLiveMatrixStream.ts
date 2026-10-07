import { useEffect, useState } from 'react';

export interface ScoreUpdatePayload {
  gameId: string;
  homeScore: number;
  awayScore: number;
  quarter: string | null;
  clock: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL';
}

export const useLiveMatrixStream = (poolId: string = 'pool-main') => {
  const [latestUpdate, setLatestUpdate] = useState<ScoreUpdatePayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const sseUrl = `/api/stream/gameday?poolId=${encodeURIComponent(poolId)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('CONNECTED', () => {
      setIsConnected(true);
    });

    eventSource.addEventListener('SCORE_UPDATE', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLatestUpdate(data);
      } catch (err) {
        console.error('Failed to parse SSE SCORE_UPDATE', err);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [poolId]);

  return { latestUpdate, isConnected };
};
