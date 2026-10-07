import React, { useEffect, useState } from 'react';
import { formatDisputeCountdown, isUnderUrgencyThreshold } from '../../services/SocialStakesEngine';

interface DisputeCountdownClockProps {
  expiresAt: string; // ISO date string
  onExpire?: () => void;
}

export const DisputeCountdownClock: React.FC<DisputeCountdownClockProps> = ({ expiresAt, onExpire }) => {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemainingMs(diff);
      if (diff === 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const isUrgent = isUnderUrgencyThreshold(remainingMs);

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
        isUrgent
          ? 'bg-rose-950/90 border-rose-500/80 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
          : 'bg-slate-900/90 border-slate-700 text-slate-300'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isUrgent ? 'bg-rose-500' : 'bg-cyan-400'}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {isUrgent ? 'DISPUTE EXPIRING:' : 'DISPUTE WINDOW:'}
      </span>
      <span className="font-black tabular-nums tracking-widest text-white">
        {formatDisputeCountdown(remainingMs)}
      </span>
    </div>
  );
};
