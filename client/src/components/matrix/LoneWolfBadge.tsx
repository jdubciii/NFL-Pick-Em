import React from 'react';

interface LoneWolfBadgeProps {
  team: string;
}

export const LoneWolfBadge: React.FC<LoneWolfBadgeProps> = ({ team }) => {
  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400 shadow-[0_0_12px_rgba(234,179,8,0.5)] font-mono animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
      <span className="text-[9px] font-black text-amber-300 tracking-wider uppercase">
        LONE WOLF [{team}]
      </span>
    </div>
  );
};
