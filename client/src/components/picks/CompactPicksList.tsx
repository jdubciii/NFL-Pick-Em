import React from 'react';

export interface CompactGameRow {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  kickoffTime: string;
  isLocked: boolean;
  spread?: string;
}

interface CompactPicksListProps {
  games: CompactGameRow[];
  selectedPicks: Record<string, string>;
  onSelectTeam: (gameId: string, team: string) => void;
}

export const CompactPicksList: React.FC<CompactPicksListProps> = ({
  games,
  selectedPicks,
  onSelectTeam
}) => {
  return (
    <div className="space-y-2 pb-24">
      {games.map((g) => {
        const selected = selectedPicks[g.gameId];
        return (
          <div
            key={g.gameId}
            className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow-sm text-xs font-mono"
          >
            {/* Away Team Select Button */}
            <button
              disabled={g.isLocked}
              onClick={() => onSelectTeam(g.gameId, g.awayTeam)}
              className={`flex-1 py-2 px-3 rounded-lg border font-black transition-all flex items-center justify-between ${
                selected === g.awayTeam
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-white hover:border-slate-700'
              } ${g.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{g.awayTeam}</span>
              {selected === g.awayTeam && <span>✓</span>}
            </button>

            {/* At Separator / Kickoff Info */}
            <div className="px-3 flex flex-col items-center justify-center shrink-0 text-[10px] text-slate-500 font-bold">
              <span>@</span>
              <span>{g.kickoffTime}</span>
            </div>

            {/* Home Team Select Button */}
            <button
              disabled={g.isLocked}
              onClick={() => onSelectTeam(g.gameId, g.homeTeam)}
              className={`flex-1 py-2 px-3 rounded-lg border font-black transition-all flex items-center justify-between ${
                selected === g.homeTeam
                  ? 'bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-white hover:border-slate-700'
              } ${g.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{g.homeTeam}</span>
              {selected === g.homeTeam && <span>✓</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
};
