import React from 'react';

interface DangerSeatTickerProps {
  deadPlaceMemberName?: string;
  pointsDeficit?: number;
  liveOutsCount?: number;
}

export const DangerSeatTicker: React.FC<DangerSeatTickerProps> = ({
  deadPlaceMemberName = 'Big Jack',
  pointsDeficit = 3,
  liveOutsCount = 2
}) => {
  return (
    <div className="w-full bg-rose-950/90 border border-rose-500/70 rounded-2xl px-4 py-2.5 shadow-lg shadow-rose-950/30 flex items-center justify-between text-white font-mono select-none animate-pulse mb-4">
      <div className="flex items-center space-x-2.5">
        <span className="text-base">🚨</span>
        <div>
          <div className="text-xs font-black text-rose-200 tracking-wide uppercase">
            THE DANGER SEAT: {deadPlaceMemberName}
          </div>
          <div className="text-[10px] text-rose-300">
            Trailing by {pointsDeficit} picks · Needs {liveOutsCount} upsets to survive Dead Place
          </div>
        </div>
      </div>
      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-900 border border-rose-400 text-white shrink-0">
        2.5 Shots
      </span>
    </div>
  );
};
