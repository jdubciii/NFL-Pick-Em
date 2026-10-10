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
    <div className="mt-5 p-3.5 bg-slate-900/95 rounded-xl border border-cyan-500/40 shadow-lg shadow-cyan-950/40 font-mono">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold text-cyan-400 tracking-wider">TACTILE CHAOS CONTROLS (INV-6)</span>
        </div>
        {whatIfs.length > 0 && (
          <button
            onClick={onReset}
            className="text-[11px] px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-black tracking-wide transition shadow-sm shadow-rose-950"
          >
            RESET TO LIVE
          </button>
        )}
      </div>

      <div className="space-y-3">
        {liveGames.map(game => {
          const currentWhatIf = whatIfs.find(w => w.gameId === game.gameId);
          const homeDelta = currentWhatIf?.scoreDeltaHome || 0;
          const awayDelta = currentWhatIf?.scoreDeltaAway || 0;
          const hasDelta = homeDelta !== 0 || awayDelta !== 0;

          return (
            <div
              key={game.gameId}
              className={`p-3 rounded-lg border transition-all ${
                hasDelta
                  ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-900/30'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-200">
                  <span className={awayDelta !== 0 ? 'text-cyan-300 font-extrabold' : ''}>
                    {game.awayTeam} {game.awayScore + awayDelta}
                  </span>
                  {' @ '}
                  <span className={homeDelta !== 0 ? 'text-cyan-300 font-extrabold' : ''}>
                    {game.homeTeam} {game.homeScore + homeDelta}
                  </span>
                  <span className="ml-1.5 text-[10px] text-cyan-400/80">
                    [{game.spread > 0 ? '+' : ''}{game.spread}]
                  </span>
                </div>
                {game.isRedZone && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-rose-600 text-white font-black rounded animate-pulse">
                    RED ZONE
                  </span>
                )}
              </div>

              {/* Large Ergonomic Touch Targets */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onToggleDelta(game.gameId, 'AWAY', 3)}
                    className="flex-1 py-2 px-1 rounded-md bg-slate-800 hover:bg-cyan-900/60 active:scale-95 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-bold text-slate-200 text-center transition"
                  >
                    +{game.awayTeam} FG
                  </button>
                  <button
                    onClick={() => onToggleDelta(game.gameId, 'AWAY', 6)}
                    className="flex-1 py-2 px-1 rounded-md bg-slate-800 hover:bg-cyan-900/60 active:scale-95 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-bold text-cyan-300 text-center transition"
                  >
                    +{game.awayTeam} TD
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onToggleDelta(game.gameId, 'HOME', 3)}
                    className="flex-1 py-2 px-1 rounded-md bg-slate-800 hover:bg-cyan-900/60 active:scale-95 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-bold text-slate-200 text-center transition"
                  >
                    +{game.homeTeam} FG
                  </button>
                  <button
                    onClick={() => onToggleDelta(game.gameId, 'HOME', 6)}
                    className="flex-1 py-2 px-1 rounded-md bg-slate-800 hover:bg-cyan-900/60 active:scale-95 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-bold text-cyan-300 text-center transition"
                  >
                    +{game.homeTeam} TD
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
