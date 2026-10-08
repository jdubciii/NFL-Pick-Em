import React from 'react';

export interface FieldPositionTrackerProps {
  absolutePosition?: number; // 0 to 100 strictly between goal lines (0 = Away Goal Line, 100 = Home Goal Line)
  yardline?: number;        // fallback
  downAndDistance?: string;  // e.g. "1st & Goal"
  possession?: 'AWAY' | 'HOME';
  awayTeam?: string;
  homeTeam?: string;
  lineOfScrimmage?: string;  // e.g. "BUF 7"
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
  const effectivePos = absolutePosition ?? yardline ?? 93;

  // Arrow pointing toward target goal line
  const chevron = possession === 'AWAY' ? '▶' : '◀';

  // Dynamic possession color: Cyan for Away, Rose/Pink for Home (matching pick polarity bars)
  const possessionColor = possession === 'AWAY' ? 'text-cyan-400' : 'text-rose-400';
  const possessionPing = possession === 'AWAY' ? 'bg-cyan-400' : 'bg-rose-400';

  return (
    <div className="w-full space-y-1.5 font-mono select-none">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className={`flex items-center space-x-1.5 font-black ${possessionColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${possessionPing} animate-ping`} />
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

      {/* 100-Yard Field Track with External End Zones */}
      <div className="flex items-center w-full h-4 bg-slate-950 border border-slate-800 rounded-md overflow-hidden shadow-inner">
        {/* Away End Zone (Left of 0-yard line) */}
        <div className="w-[10%] h-full bg-cyan-950 border-r border-slate-700 flex items-center justify-center text-[8px] font-black text-cyan-400 shrink-0">
          {awayTeam}
        </div>

        {/* 100-Yard Field of Play (0 to 100) */}
        <div className="relative flex-1 h-full bg-emerald-950/80">
          {/* 20-Yard Line Hashes */}
          <div className="absolute left-[20%] top-0 bottom-0 w-px bg-emerald-700/40" />
          <div className="absolute right-[20%] top-0 bottom-0 w-px bg-emerald-700/40" />

          {/* 50-Yard Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500/50 z-10" />

          {/* Football Marker (Positioned 0% to 100% of the field of play) */}
          <div
            style={{ left: `${Math.min(98, Math.max(2, effectivePos))}%` }}
            className="absolute -translate-x-1/2 flex items-center justify-center z-20 transition-all duration-700 top-0.5"
          >
            <div className="h-3 w-3 rounded-full bg-amber-400 ring-2 ring-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-pulse" />
          </div>
        </div>

        {/* Home End Zone (Right of 100-yard line) */}
        <div className="w-[10%] h-full bg-rose-950 border-l border-slate-700 flex items-center justify-center text-[8px] font-black text-rose-400 shrink-0">
          {homeTeam}
        </div>
      </div>
    </div>
  );
};
