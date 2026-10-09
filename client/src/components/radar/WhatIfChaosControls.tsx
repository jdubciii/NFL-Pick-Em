import React from 'react';
import type { LiveGameTelemetry, WhatIfScenario } from '../../services/radarSimulationEngine';

interface WhatIfChaosControlsProps {
  games: LiveGameTelemetry[];
  whatIfs: WhatIfScenario[];
  onToggleDelta: (gameId: string, team: 'HOME' | 'AWAY', delta: number) => void;
  onReset: () => void;
}

export const WhatIfChaosControls: React.FC<WhatIfChaosControlsProps> = ({
  games,
  whatIfs,
  onToggleDelta,
  onReset
}) => {
  const liveGames = games.filter(g => g.status === 'IN_PROGRESS');

  if (liveGames.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-slate-900/90 rounded-lg border border-cyan-500/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">WHAT-IF CHAOS ENGINE (INV-6 IN-MEMORY)</span>
        {whatIfs.length > 0 && (
          <button
            onClick={onReset}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-600/80 text-white font-bold hover:bg-rose-500"
          >
            RESET
          </button>
        )}
      </div>

      <div className="space-y-2">
        {liveGames.map(game => {
          const currentWhatIf = whatIfs.find(w => w.gameId === game.gameId);
          const homeDelta = currentWhatIf?.scoreDeltaHome || 0;
          const awayDelta = currentWhatIf?.scoreDeltaAway || 0;

          return (
            <div key={game.gameId} className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded border border-slate-800">
              <div className="font-mono text-slate-300 font-semibold">
                {game.awayTeam} ({game.awayScore + awayDelta}) @ {game.homeTeam} ({game.homeScore + homeDelta})
                <span className="ml-1 text-[10px] text-cyan-400">[{game.spread > 0 ? '+' : ''}{game.spread}]</span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <button
                  onClick={() => onToggleDelta(game.gameId, 'HOME', 3)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-cyan-900 border border-slate-600 rounded text-[10px] text-slate-200"
                >
                  +{game.homeTeam} FG
                </button>
                <button
                  onClick={() => onToggleDelta(game.gameId, 'AWAY', 3)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-cyan-900 border border-slate-600 rounded text-[10px] text-slate-200"
                >
                  +{game.awayTeam} FG
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
