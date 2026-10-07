import React from 'react';

export interface TickerGame {
  id: string;
  away: string;
  home: string;
  awayScore: number;
  homeScore: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  clock?: string;
}

interface TopGamedayTickerProps {
  games: TickerGame[];
}

export const TopGamedayTicker: React.FC<TopGamedayTickerProps> = ({ games }) => {
  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 overflow-x-auto py-2 px-3 flex items-center space-x-4 scrollbar-none will-change-transform transform-gpu hover:pause active:pause">
      <div className="flex items-center space-x-1.5 pr-3 border-r border-slate-800 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">NFL TICKER</span>
      </div>
      {games.map((g) => (
        <div key={g.id} className="flex items-center space-x-2 text-xs font-mono shrink-0 px-2 py-1 bg-slate-900 rounded border border-slate-800">
          <div className="flex flex-col font-bold">
            <span className={g.awayScore > g.homeScore ? 'text-white' : 'text-slate-400'}>{g.away} {g.status !== 'SCHEDULED' ? g.awayScore : ''}</span>
            <span className={g.homeScore > g.awayScore ? 'text-white' : 'text-slate-400'}>{g.home} {g.status !== 'SCHEDULED' ? g.homeScore : ''}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-extrabold uppercase pl-1">{g.clock || g.status}</span>
        </div>
      ))}
    </div>
  );
};
