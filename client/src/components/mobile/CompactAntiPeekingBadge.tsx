import React, { useState } from 'react';

interface CompactAntiPeekingBadgeProps {
  hiddenGameCount: number;
}

export const CompactAntiPeekingBadge: React.FC<CompactAntiPeekingBadgeProps> = ({ hiddenGameCount }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (hiddenGameCount === 0) return null;

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800/90 border border-amber-500/40 text-amber-300 text-[11px] font-medium hover:bg-slate-700/80 transition-colors cursor-pointer select-none"
      >
        <span>🔒</span>
        <span className="font-mono font-bold">{hiddenGameCount} Locked</span>
      </button>

      {showTooltip && (
        <div className="absolute top-full left-0 mt-1 z-30 w-56 p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 shadow-2xl backdrop-blur-sm">
          <p className="font-semibold text-amber-400 mb-0.5">Anti-Peeking Active</p>
          <p className="text-[11px] text-slate-300 leading-tight">
            Picks remain strictly masked until each individual game's scheduled kickoff timestamp.
          </p>
        </div>
      )}
    </div>
  );
};
