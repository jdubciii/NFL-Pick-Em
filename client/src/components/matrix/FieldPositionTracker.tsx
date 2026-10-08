import React from 'react';

export interface FieldPositionTrackerProps {
  absolutePosition?: number; // 0 to 100 (0% = Away End Zone, 100% = Home End Zone)
  yardline?: number; // legacy fallback
  downAndDistance?: string; // e.g. "1st & Goal"
  possession?: 'AWAY' | 'HOME';
  awayTeam?: string;
  homeTeam?: string;
  lineOfScrimmage?: string; // e.g. "BUF 7"
  sideOfField?: string;
  isRedZone?: boolean;
}

export const FieldPositionTracker: React.FC<FieldPositionTrackerProps> = ({
  absolutePosition = 93,
  yardline,
  downAndDistance = '1st & Goal',
  possession = 'AWAY',
  awayTeam = 'KC',
  homeTeam = 'BUF',
  lineOfScrimmage = 'BUF 7',
  sideOfField,
  isRedZone = true,
}) => {
  const effectiveBallLocation = lineOfScrimmage || sideOfField || 'BUF 7';
  const effectivePosition = absolutePosition ?? yardline ?? 93;
  // Option A Standard: Away team (Left) drives Right (▶); Home team (Right) drives Left (◀)
  const chevron = possession === 'AWAY' ? '▶' : '◀';

  return (
    <div className="w-full space-y-1.5 font-mono select-none">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center space-x-1.5 font-black text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>
            {downAndDistance} {chevron}
          </span>
        </div>

        {isRedZone && (
          <span className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/80 text-[10px] font-black text-rose-300 tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse">
            RED ZONE
          </span>
        )}

        <div className="flex items-center space-x-1 text-slate-300 font-bold">
          <span className="text-[10px] text-slate-500 uppercase">BALL:</span>
          <span className="text-white font-black">{effectiveBallLocation}</span>
        </div>
      </div>

      {/* 100-Yard Field Strip */}
      <div className="relative w-full h-4 bg-emerald-950/80 border border-emerald-800/60 rounded-md overflow-hidden flex items-center shadow-inner">
        {/* Left End Zone (Away: Fixed at 0%) */}
        <div className="w-[8%] h-full bg-cyan-950/80 border-r border-emerald-700/60 flex items-center justify-center text-[8px] font-black text-cyan-400">
          {awayTeam}
        </div>

        {/* 20-Yard Line Marker (Left) */}
        <div className="absolute left-[24%] top-0 bottom-0 w-px bg-emerald-700/30" />

        {/* 50-Yard Center Marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500/40 z-10" />

        {/* 20-Yard Line Marker (Right) */}
        <div className="absolute right-[24%] top-0 bottom-0 w-px bg-emerald-700/30" />

        {/* Glowing Football Indicator (Positioned directly by absolutePosition 0-100%) */}
        <div
          style={{ left: `${Math.min(92, Math.max(8, effectivePosition))}%` }}
          className="absolute -translate-x-1/2 flex items-center justify-center z-20 transition-all duration-700"
        >
          <div className="h-3 w-3 rounded-full bg-amber-400 ring-2 ring-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse" />
        </div>

        {/* Right End Zone (Home: Fixed at 100%) */}
        <div className="ml-auto w-[8%] h-full bg-indigo-950/80 border-l border-emerald-700/60 flex items-center justify-center text-[8px] font-black text-indigo-400">
          {homeTeam}
        </div>
      </div>
    </div>
  );
};
