import React from 'react';
import type { RivalryLeverageResult } from '../../services/slateFinaleService';

interface RivalryLeverageDrawerProps {
  leverage: RivalryLeverageResult | null;
  onClose: () => void;
}

export const RivalryLeverageDrawer: React.FC<RivalryLeverageDrawerProps> = ({ leverage, onClose }) => {
  if (!leverage) return null;

  return (
    <div className="mt-2.5 p-3 rounded-lg bg-slate-950/90 border border-cyan-500/50 shadow-md shadow-cyan-950/50 font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="font-bold text-cyan-300 uppercase tracking-wider">
            RIVALRY LEVERAGE: VS {leverage.rivalUserName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
        >
          CLOSE
        </button>
      </div>

      <p className="my-2 text-[11px] font-sans text-slate-300 leading-snug font-semibold bg-slate-900/80 p-2 rounded border border-slate-800">
        🎯 {leverage.summaryMicrocopy}
      </p>

      {leverage.deltaPicks.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Active Disagreement Fault Lines ({leverage.deltaPicks.length})
          </span>
          {leverage.deltaPicks.map((d) => (
            <div
              key={d.gameId}
              className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[11px]"
            >
              <div className="font-semibold text-slate-200 truncate max-w-[150px]">
                {d.gameMatchup}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">You: {d.userSelection}</span>
                <span className="text-slate-500">vs</span>
                <span className="text-rose-400 font-bold">Rival: {d.rivalSelection}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 italic py-1">
          No differing active picks. Outcome depends on banked margins.
        </div>
      )}
    </div>
  );
};
