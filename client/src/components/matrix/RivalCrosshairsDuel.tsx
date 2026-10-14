import React, { useState } from 'react';
import type { DuelComparisonResult } from '../../services/pregameTopologyService';

interface RivalCrosshairsDuelProps {
  duel: DuelComparisonResult;
  onCloseDuel: () => void;
}

export const RivalCrosshairsDuel: React.FC<RivalCrosshairsDuelProps> = ({ duel, onCloseDuel }) => {
  const [isTargetLocked, setIsTargetLocked] = useState<boolean>(false);

  const handleLockTarget = () => {
    setIsTargetLocked(true);
    // Haptic taunt pulse emulation
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
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

      {/* Tale of the Tape: Pre-Game Win Probability Tug-of-War Bar */}
      <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-emerald-400">
            {duel.targetUserName} ({duel.targetWinProbabilityPct}%)
          </span>
          <span className="text-rose-400">
            {duel.rivalUserName} ({duel.rivalWinProbabilityPct}%)
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex border border-slate-700">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${duel.targetWinProbabilityPct}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${duel.rivalWinProbabilityPct}%` }}
          />
        </div>
        <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider pt-0.5">
          VEGAS CONSENSUS TUG-OF-WAR
        </p>
      </div>

      {/* Side-by-Side Comparison Columns */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider px-1 font-bold">
          <span>MATCHUP / SPREAD</span>
          <div className="flex gap-8">
            <span className="text-emerald-400">{duel.targetUserName}</span>
            <span className="text-rose-400">{duel.rivalUserName}</span>
          </div>
        </div>

        {duel.differingPicks.map((pick) => (
          <div
            key={pick.gameId}
            className={`relative p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              isTargetLocked
                ? 'bg-rose-950/20 border-rose-500/80 shadow-[inset_0_0_15px_rgba(244,63,94,0.15)]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            {isTargetLocked && (
              <div className="absolute inset-0 pointer-events-none border border-rose-500/40 rounded-xl flex items-center justify-center opacity-20">
                <span className="text-2xl">🎯</span>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-white">{pick.gameMatchup}</p>
              <p className="text-[10px] text-cyan-400">
                Spread: {pick.spread > 0 ? `+${pick.spread}` : pick.spread}
              </p>
            </div>
            <div className="flex items-center gap-6 font-bold text-xs">
              <span className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                {pick.targetPick}
              </span>
              <span className="text-slate-600 font-normal">vs</span>
              <span className="px-2 py-1 rounded bg-rose-950/80 border border-rose-500/60 text-rose-300">
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

      {/* Haptic Target Lock Button */}
      <div>
        {isTargetLocked ? (
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-center text-xs font-black text-rose-300 tracking-wider animate-pulse">
            🎯 TARGET LOCKED // RIVAL CROSSHAIR ACTIVE
          </div>
        ) : (
          <button
            onClick={handleLockTarget}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-mono font-black text-xs uppercase tracking-widest transition shadow-lg shadow-rose-950"
          >
            [ 🎯 LOCK TARGET ON {duel.rivalUserName} ]
          </button>
        )}
      </div>
    </div>
  );
};
