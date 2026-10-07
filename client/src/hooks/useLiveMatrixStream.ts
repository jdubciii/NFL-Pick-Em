import { useEffect, useState } from 'react';

export interface ScoreUpdatePayload {
  gameId: string;
  homeScore: number;
  awayScore: number;
  quarter: string | null;
  clock: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL';
}

export interface DriveDeltaPayload {
  gameId: string;
  patches: { op: string; path: string; value: any }[];
  timestamp: string;
}

export const useLiveMatrixStream = (poolId: string = 'pool-main') => {
  const [latestUpdate, setLatestUpdate] = useState<ScoreUpdatePayload | null>(null);
  const [latestDelta, setLatestDelta] = useState<DriveDeltaPayload | null>(null);
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

    eventSource.addEventListener('DRIVE_DELTA', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLatestDelta(data);
      } catch (err) {
        console.error('Failed to parse SSE DRIVE_DELTA', err);
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

  return { latestUpdate, latestDelta, isConnected };
};
