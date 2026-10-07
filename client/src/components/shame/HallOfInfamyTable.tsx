import React, { useState } from 'react';
import { InfamyRecord, InfamySortCriteria, sortHallOfInfamy } from '../../services/SocialStakesEngine';

interface HallOfInfamyTableProps {
  records: InfamyRecord[];
}

export const HallOfInfamyTable: React.FC<HallOfInfamyTableProps> = ({ records }) => {
  const [criteria, setCriteria] = useState<InfamySortCriteria>('MOST_SHOTS');
  const sorted = sortHallOfInfamy(records, criteria);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 space-y-4 shadow-xl text-white">
      {/* Header and Toggle Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-black font-serif uppercase tracking-tight text-rose-400 flex items-center space-x-2">
            <span>👑 Hall of Infamy</span>
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Historical penalty ledger & all-time shame rankings.</p>
        </div>

        {/* Sort Controls */}
        <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setCriteria('MOST_SHOTS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              criteria === 'MOST_SHOTS' ? 'bg-rose-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🍺 Shots
          </button>
          <button
            type="button"
            onClick={() => setCriteria('MOST_DEAD_PLACES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              criteria === 'MOST_DEAD_PLACES' ? 'bg-rose-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            💀 Dead Places
          </button>
          <button
            type="button"
            onClick={() => setCriteria('HIGHEST_DEBT')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              criteria === 'HIGHEST_DEBT' ? 'bg-rose-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📉 Max Debt
          </button>
        </div>
      </div>

      {/* Leaderboard Rows */}
      <div className="space-y-2 font-mono text-xs">
        {sorted.map((r, idx) => (
          <div
            key={r.memberId}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              idx === 0
                ? 'bg-rose-950/40 border-rose-500/50 shadow-md shadow-rose-950/20'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="w-6 text-center font-bold text-slate-400">#{idx + 1}</span>
              <span className="font-bold text-white">{r.name}</span>
            </div>

            <div className="flex items-center space-x-4 tabular-nums">
              <div className="text-right">
                <div className="font-black text-rose-400">{r.shotsDrank} 🍺</div>
                <div className="text-[10px] text-slate-500">Shots</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-300">{r.deadPlaceFinishes} 💀</div>
                <div className="text-[10px] text-slate-500">Finishes</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-amber-400">{r.maxSingleWeekDebt}x</div>
                <div className="text-[10px] text-slate-500">Max Debt</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
