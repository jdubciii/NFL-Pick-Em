import React from 'react';

interface FieldPositionTrackerProps {
  possession: 'HOME' | 'AWAY';
  yardline: number; // 0 to 100 (50 is midfield)
  downAndDistance?: string; // e.g., '3rd & 8'
  sideOfField?: string; // e.g., 'KC 28'
  isRedZone?: boolean;
}

export const FieldPositionTracker: React.FC<FieldPositionTrackerProps> = ({
  possession,
  yardline,
  downAndDistance,
  sideOfField,
  isRedZone = false
}) => {
  // Normalize yardline coordinate across the 100-yard visual field
  const clamped = Math.max(5, Math.min(95, yardline));

  return (
    <div className="w-full space-y-1 my-2">
      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
        <span className="text-cyan-400">{downAndDistance || '1st & 10'}</span>
        {isRedZone && (
          <span className="px-1.5 py-0.2 rounded bg-rose-600/90 text-white text-[9px] uppercase tracking-wider font-extrabold animate-pulse">
            RED ZONE
          </span>
        )}
        <span>{sideOfField || 'MIDFIELD'}</span>
      </div>

      {/* Field Grid Visualization */}
      <div className="relative h-4 w-full bg-emerald-950/80 rounded-md border border-emerald-700/50 overflow-hidden flex items-center shadow-inner">
        {/* Yard Markers */}
        <div className="absolute inset-0 flex justify-between px-2 text-[8px] font-mono text-emerald-600/70 select-none">
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span className="font-bold text-emerald-400">50</span>
          <span>40</span>
          <span>30</span>
          <span>20</span>
          <span>10</span>
        </div>

        {/* Yardlines Subtle Dividers */}
        <div className="absolute inset-0 grid grid-cols-10 divide-x divide-emerald-800/30" />

        {/* Ball Location Indicator */}
        <div
          className="absolute top-0 bottom-0 w-2.5 -ml-1.25 flex items-center justify-center transition-all duration-700"
          style={{ left: `${clamped}%` }}
        >
          <div className="h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] border border-white" />
        </div>
      </div>
    </div>
  );
};
