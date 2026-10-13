import React, { useState, useEffect } from 'react';

interface LockCountdownTimerProps {
  onLockExpired?: () => void;
  isLocked?: boolean;
  allUpcoming?: boolean;
  allFinal?: boolean;
  weekNumber?: number;
}

export const LockCountdownTimer: React.FC<LockCountdownTimerProps> = ({
  onLockExpired,
  isLocked = false,
  allUpcoming = false,
  allFinal = false,
  weekNumber = 6
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(isLocked ? 0 : 3600);

  useEffect(() => {
    if (isLocked || allUpcoming || allFinal) return;
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
  }, [isLocked, allUpcoming, allFinal, onLockExpired]);

  const hours = Math.floor(secondsRemaining / 3600);
  const mins = Math.floor((secondsRemaining % 3600) / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // If all games are upcoming (kickoff in the future, e.g. Week 6 on Tuesday morning)
  if (allUpcoming) {
    return (
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-slate-950/95 border-b border-slate-800 backdrop-blur font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>AWAITING KICKOFF</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
          <span>SLATE OPEN</span>
        </div>
      </div>
    );
  }

  // If selected week is past and all games are finished (e.g. Week 5)
  if (allFinal) {
    return (
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-slate-950/95 border-b border-slate-800 backdrop-blur font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold">
            <span>WEEK {weekNumber} FINAL</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-zinc-400">
          COMPLETED SLATE
        </div>
      </div>
    );
  }

  // Active / Live slate
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-slate-950/95 border-b border-slate-800 backdrop-blur font-mono flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isLocked ? 'bg-zinc-500' : 'bg-amber-400 animate-ping'
          }`}
        />
        <span className="text-[10px] font-black text-slate-300 tracking-wider uppercase">
          {isLocked ? 'GAMEDAY LIVE' : 'PRE-LOCK COUNTDOWN'}
        </span>
      </div>
      <div className="text-xs font-black tracking-widest text-zinc-400">
        {isLocked ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold">
            <span>WEEK {weekNumber} FINAL</span>
          </div>
        ) : (
          timeFormatted
        )}
      </div>
    </div>
  );
};
