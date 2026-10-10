import React from 'react';
import type { HeadToHeadStats } from '../../services/reputationEngineService';

interface HeadToHeadDrawerProps {
  stats: HeadToHeadStats | null;
  onClose: () => void;
}

export const HeadToHeadDrawer: React.FC<HeadToHeadDrawerProps> = ({ stats, onClose }) => {
  if (!stats) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-3 font-mono">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-cyan-500 shadow-2xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
            ⚔️ HEAD-TO-HEAD TALE OF THE TAPE
          </span>
          <button
            onClick={onClose}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
          >
            CLOSE
          </button>
        </div>

        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center text-xs font-bold text-cyan-200">
          {stats.summaryMicrocopy}
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40">
            <p className="text-[10px] text-slate-400 font-bold uppercase">{stats.targetUserName}</p>
            <p className="text-2xl font-black text-emerald-400 my-1">{stats.targetWins}</p>
            <p className="text-[9px] text-slate-500">WINS</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/40">
            <p className="text-[10px] text-slate-400 font-bold uppercase">{stats.rivalUserName}</p>
            <p className="text-2xl font-black text-rose-400 my-1">{stats.rivalWins}</p>
            <p className="text-[9px] text-slate-500">WINS</p>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center text-xs text-slate-300">
          ⚡ Ties Recorded: <strong className="text-white">{stats.ties}</strong> | Danger Seat Forced:{' '}
          <strong className="text-rose-400">{stats.targetDangerSeatVictories || 0} times</strong>
        </div>
      </div>
    </div>
  );
};
