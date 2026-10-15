import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DuelComparisonResult } from '../../services/pregameTopologyService';

interface RivalCrosshairsDuelProps {
  duel: DuelComparisonResult;
  onCloseDuel: () => void;
}

export const RivalCrosshairsDuel: React.FC<RivalCrosshairsDuelProps> = ({ duel, onCloseDuel }) => {
  const navigate = useNavigate();

  const handleOpenInRadar = () => {
    if (duel.rivalUserId) {
      try {
        localStorage.setItem('pickem_selected_rival_id', duel.rivalUserId);
      } catch (_) {}
    }
    navigate(`/radar?mode=RIVALRY${duel.rivalUserId ? `&rival=${duel.rivalUserId}` : ''}`);
  };

  return (
    <div className="w-full rounded-2xl bg-slate-950 border border-cyan-500/50 shadow-2xl p-4 font-mono space-y-4">
      {/* Top Header & Close */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
            ⚔️ 1-ON-1 DUEL MODE // RIVAL CROSSHAIRS
          </span>
        </div>
        <button
          onClick={onCloseDuel}
          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
        >
          FULL MATRIX
        </button>
      </div>

      {/* Dynamic Summary Banner */}
      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center font-bold text-xs text-cyan-200">
        {duel.summaryMicrocopy}
      </div>

      {/* Deterministic Point Consequence Breakdown Bar */}
      {(() => {
        const differingCount = duel.differingPicksCount ?? duel.differingPicks.length;
        const sharedCount = duel.matchingPicksCount ?? Math.max(0, duel.totalGames - differingCount);
        const total = differingCount + sharedCount;
        const splitPct = total > 0 ? Math.round((differingCount / total) * 100) : 0;
        const sharedPct = 100 - splitPct;

        return (
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              POINT CONSEQUENCE BREAKDOWN
            </div>
            <div className="flex flex-wrap gap-y-1 gap-x-3 justify-between items-center text-[11px] font-bold">
              <span className="text-amber-400">
                Split Picks: {differingCount} game{differingCount === 1 ? '' : 's'} ({differingCount} pt max swing)
              </span>
              <span className="text-cyan-400">
                Shared Picks: {sharedCount} game{sharedCount === 1 ? '' : 's'} (0 pt gap leverage)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex border border-slate-700">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${splitPct}%` }}
              />
              <div
                className="h-full bg-cyan-600 transition-all duration-500"
                style={{ width: `${sharedPct}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider pt-0.5">
              DETERMINISTIC DUEL LEVERAGE // SPLIT VS. SHARED SLATE
            </p>
          </div>
        );
      })()}

      {/* Side-by-Side Comparison Columns */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider px-1 font-bold">
          <span>MATCHUP / SPREAD</span>
          <div className="flex gap-8">
            <span className="text-cyan-400">{duel.targetUserName}</span>
            <span className="text-amber-400">{duel.rivalUserName}</span>
          </div>
        </div>

        {duel.differingPicks.map((pick) => (
          <div
            key={pick.gameId}
            className="relative p-2.5 rounded-xl border bg-slate-900/90 border-slate-800 flex items-center justify-between transition-all"
          >
            <div>
              <p className="text-xs font-bold text-white">{pick.gameMatchup}</p>
              {pick.spread && pick.spread !== 0 ? (
                <p className="text-[10px] text-cyan-400">
                  Spread: {pick.spread > 0 ? `+${pick.spread}` : pick.spread}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-6 font-bold text-xs">
              <span className="px-2 py-1 rounded bg-cyan-950/80 border border-cyan-500/60 text-cyan-300">
                {pick.targetPick}
              </span>
              <span className="text-slate-600 font-normal">vs</span>
              <span className="px-2 py-1 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300">
                {pick.rivalPick}
              </span>
            </div>
          </div>
        ))}

        {duel.rivalPicksCount === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center font-mono">
            <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block mb-1">Picks Pending</span>
            <p className="text-zinc-400 text-xs">
              {duel.rivalUserName} has not submitted any picks yet ({duel.targetPicksCount ?? 0} submitted by you).
            </p>
          </div>
        ) : duel.differingPicks.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900 text-center text-xs text-slate-400 italic">
            Zero differing picks. Both participants are in complete lockstep.
          </div>
        ) : null}
      </div>

      {/* Navigation to Radar Rivalry Duel */}
      <div>
        <button
          onClick={handleOpenInRadar}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-mono font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
        >
          <span>⚔️ Open Duel in Radar →</span>
        </button>
      </div>
    </div>
  );
};

