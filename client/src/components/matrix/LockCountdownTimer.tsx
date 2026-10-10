import React, { useState, useEffect } from 'react';

interface LockCountdownTimerProps {
  onLockExpired?: () => void;
}

export const LockCountdownTimer: React.FC<LockCountdownTimerProps> = ({ onLockExpired }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600); // 1-hour pre-lock demo

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onLockExpired) onLockExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onLockExpired]);

  const hours = Math.floor(secondsRemaining / 3600);
  const mins = Math.floor((secondsRemaining % 3600) / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isLocked = secondsRemaining === 0;

  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-slate-950/95 border-b border-slate-800 backdrop-blur font-mono flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isLocked ? 'bg-rose-500' : 'bg-amber-400 animate-ping'}`} />
        <span className="text-[10px] font-black text-slate-300 tracking-wider uppercase">
          {isLocked ? '🔒 SLATE LOCKED' : 'PRE-LOCK COUNTDOWN (1:00 PM ET)'}
        </span>
      </div>
      <div className="text-xs font-black tracking-widest text-cyan-300">
        {isLocked ? '00:00:00 [LOCKED]' : timeFormatted}
      </div>
    </div>
  );
};
