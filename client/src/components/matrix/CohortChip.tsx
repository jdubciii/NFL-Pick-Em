import React from 'react';

export interface MemberPickStatus {
  memberId: string;
  initials: string;
  avatarUrl?: string;
  matchState: 'WINNING' | 'LOSING' | 'TIED' | 'WON' | 'LOST' | 'PENDING';
}

interface CohortChipProps {
  status: MemberPickStatus;
  isCurrentUser?: boolean;
}

export const CohortChip: React.FC<CohortChipProps> = ({ status, isCurrentUser }) => {
  const getStyle = () => {
    switch (status.matchState) {
      case 'WINNING':
        return 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20';
      case 'LOSING':
        return 'bg-slate-800/80 border-slate-700/60 text-slate-400 opacity-75';
      case 'WON':
        return 'bg-emerald-700 border-emerald-500 text-white font-bold';
      case 'LOST':
        return 'bg-rose-950/80 border-rose-800 text-rose-400 line-through opacity-70';
      case 'TIED':
        return 'bg-amber-950/70 border-amber-500/60 text-amber-300';
      case 'PENDING':
      default:
        return 'bg-slate-800/90 border-slate-700 text-slate-300';
    }
  };

  return (
    <div
      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full border text-xs select-none transition-all duration-300 ${getStyle()} ${
        isCurrentUser ? 'ring-2 ring-cyan-400 font-extrabold' : ''
      }`}
    >
      <span>{status.initials}</span>
      {status.matchState === 'WON' && <span>✓</span>}
    </div>
  );
};
