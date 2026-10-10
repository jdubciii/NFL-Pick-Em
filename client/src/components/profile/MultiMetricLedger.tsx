import React, { useState } from 'react';
import type { AggregatedDebtMetrics } from '../../services/reputationEngineService';

interface MultiMetricLedgerProps {
  metrics: AggregatedDebtMetrics;
}

export const MultiMetricLedger: React.FC<MultiMetricLedgerProps> = ({ metrics }) => {
  const [showAuditTrail, setShowAuditTrail] = useState<boolean>(false);

  return (
    <div className="w-full space-y-4 font-mono">
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center flex flex-col justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            LIFETIME ASSIGNED
          </span>
          <span className="text-base font-black text-slate-200 my-1">
            {metrics.lifetimeAssigned.toFixed(2)}
          </span>
          <span className="text-[8px] text-slate-500">SHOTS</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center flex flex-col justify-between">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
            SERVED / CLEARED
          </span>
          <span className="text-base font-black text-emerald-300 my-1">
            {metrics.servedCleared.toFixed(2)}
          </span>
          <span className="text-[8px] text-emerald-500">FULFILLED</span>
        </div>

        <div className="p-3 rounded-xl bg-rose-950/50 border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] text-center flex flex-col justify-between">
          <span className="text-[9px] font-black text-rose-300 uppercase tracking-widest animate-pulse">
            OUTSTANDING DEBT
          </span>
          <span className="text-xl font-black text-rose-400 my-0.5 tracking-tight">
            {metrics.outstandingDebt.toFixed(2)}
          </span>
          <span className="text-[8px] font-bold text-rose-300">DUE LEAGUE</span>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
        <div
          onClick={() => setShowAuditTrail((prev) => !prev)}
          className="cursor-pointer flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <span>📜</span>
            <span>CHRONOLOGICAL LEDGER AUDIT TRAIL</span>
          </span>
          <span className="text-[10px] text-cyan-400">
            {showAuditTrail ? 'HIDE ▲' : 'EXPAND ▼'}
          </span>
        </div>

        {showAuditTrail && (
          <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-2 text-xs">
            {metrics.auditTrail.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{item.date}</span>
                    <span
                      className={`font-black ${
                        item.type === 'SERVED'
                          ? 'text-emerald-400'
                          : item.type === 'CONTEMPT'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans truncate max-w-[200px]">
                    {item.description}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-black ${
                      item.amount < 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.amount > 0 ? `+${item.amount.toFixed(2)}` : item.amount.toFixed(2)}
                  </span>
                  <div className="text-[9px] text-slate-500">
                    Bal: {item.runningBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
