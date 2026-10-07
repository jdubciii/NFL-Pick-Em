import React, { useState } from 'react';

interface GameDistribution {
  gameId: string;
  matchup: string;
  homeTeam: string;
  awayTeam: string;
  homePicks: number;
  awayPicks: number;
  kickoffTime: string;
  isLocked: boolean;
}

interface MobileMatrixDrawerProps {
  distributions: GameDistribution[];
  activePoolId: string;
  selectedGameId?: string;
  onSelectGame?: (gameId: string) => void;
}

export const MobileMatrixDrawer: React.FC<MobileMatrixDrawerProps> = ({
  distributions,
  selectedGameId,
  onSelectGame
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 shadow-2xl transition-all duration-300">
      <div 
        className="flex items-center justify-between px-4 py-3 bg-slate-800 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Matchup Drawer</span>
          <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{distributions.length} Games</span>
        </div>
        <button 
          type="button" 
          aria-label={isOpen ? 'Collapse matchup drawer' : 'Expand matchup drawer'}
          className="text-slate-400 hover:text-white text-sm font-bold"
        >
          {isOpen ? '↓ Collapse' : '↑ View Live Slate'}
        </button>
      </div>

      {isOpen && (
        <div className="max-h-72 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800">
          {distributions.map((dist) => {
            const isSelected = dist.gameId === selectedGameId;
            return (
              <div 
                key={dist.gameId}
                onClick={() => onSelectGame?.(dist.gameId)}
                className={`pt-2 flex items-center justify-between cursor-pointer rounded p-2 transition-colors ${
                  isSelected ? 'bg-slate-800/80 ring-1 ring-emerald-500' : 'hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-white">{dist.matchup}</div>
                  <div className="text-xs text-slate-400">Kickoff: {new Date(dist.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-200">
                    <span className="text-emerald-400">{dist.awayTeam} ({dist.awayPicks})</span> @ <span className="text-indigo-400">{dist.homeTeam} ({dist.homePicks})</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${dist.isLocked ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-900/60 text-emerald-300'}`}>
                    {dist.isLocked ? 'Locked' : 'Open'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
