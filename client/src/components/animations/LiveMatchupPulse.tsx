import React from 'react';

interface LiveMatchupPulseProps {
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  clock?: string;
}

export const LiveMatchupPulse: React.FC<LiveMatchupPulseProps> = ({ status, clock }) => {
  if (status !== 'IN_PROGRESS') return null;

  return (
    <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/50">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
      </span>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 font-mono">
        LIVE {clock ? `• ${clock}` : ''}
      </span>
    </div>
  );
};
