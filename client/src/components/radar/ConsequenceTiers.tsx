import React from 'react';
import type { ParticipantStandings } from '../../services/radarSimulationEngine';

interface ConsequenceTiersProps {
  standings: ParticipantStandings[];
}

export const ConsequenceTiers: React.FC<ConsequenceTiersProps> = ({ standings }) => {
  return (
    <div className="w-full space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase font-mono">Tier 1: Safe Haven (0 Shots)</span>
          <span className="text-[11px] text-slate-400 font-mono">Survival Lock</span>
        </div>
        {standings.filter(s => s.tier === 'SAFE').map(p => (
          <div key={p.userId} className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-400 text-sm">#{p.rank}</span>
              <span className="font-bold text-white text-sm">{p.userName}</span>
              {p.threatenedByRedZone && (
                <span className="text-[10px] px-1.5 py-0.5 bg-rose-600/80 text-white rounded font-bold animate-pulse">RED ZONE THREAT</span>
              )}
            </div>
            <div className="text-right font-mono">
              <div className="text-emerald-300 font-extrabold text-sm">{p.totalProjectedPoints.toFixed(1)} pts</div>
              <div className="text-[10px] text-slate-400">+{p.leadOverDanger.toFixed(1)} over danger</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-bold tracking-wider text-amber-400 uppercase font-mono">Tier 2: The Danger Zone (1.0 - 2.0 Shots)</span>
          <span className="text-[11px] text-slate-400 font-mono">Volatile</span>
        </div>
        <div className="space-y-1.5">
          {standings.filter(s => s.tier === 'DANGER_ZONE').map(p => (
            <div key={p.userId} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-400 text-xs">#{p.rank}</span>
                <span className="font-medium text-slate-200 text-xs">{p.userName}</span>
                {p.threatenedByRedZone && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-rose-600/80 text-white rounded font-bold animate-pulse">RED ZONE THREAT</span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-amber-400 font-bold">{p.penaltyShots} shots</span>
                <span className="text-slate-200 font-bold">{p.totalProjectedPoints.toFixed(1)} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-bold tracking-wider text-rose-400 uppercase font-mono">Tier 3: Dead Place (Decision #69)</span>
          <span className="text-[11px] text-rose-400 font-mono font-bold">Absolute 2.50 Shots</span>
        </div>
        {standings.filter(s => s.tier === 'DEAD_PLACE').map(p => (
          <div key={p.userId} className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-rose-400 text-sm">#{p.rank}</span>
              <span className="font-extrabold text-white text-sm">{p.userName}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-rose-600 text-white font-black rounded uppercase">DEAD PLACE</span>
            </div>
            <div className="text-right font-mono">
              <div className="text-rose-300 font-black text-sm">{p.totalProjectedPoints.toFixed(1)} pts</div>
              <div className="text-[10px] text-rose-400 font-semibold">-{p.gapToSafety.toFixed(1)} pts to safety</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
