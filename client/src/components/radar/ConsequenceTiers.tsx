import React from 'react';
import type { ParticipantStandings } from '../../services/radarSimulationEngine';
import { TheDropDivider } from './TheDropDivider';

interface ConsequenceTiersProps {
  standings: ParticipantStandings[];
  isSimulating: boolean;
}

export const ConsequenceTiers: React.FC<ConsequenceTiersProps> = ({ standings, isSimulating }) => {
  return (
    <div className="w-full space-y-3 font-sans">
      {/* Tier 1: Safe Haven */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase font-mono">Tier 1: Safe Haven (0 Shots)</span>
          <span className="text-[11px] text-slate-400 font-mono">Survival Lock</span>
        </div>
        {standings.filter(s => s.tier === 'SAFE').map(p => (
          <div
            key={p.userId}
            className={`p-3 rounded-lg bg-emerald-900/10 border border-emerald-500/50 flex items-center justify-between transition-all duration-300 ${
              p.threatenedByRedZone ? 'border-red-500/70 animate-pulse' : ''
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-black text-emerald-400 text-sm">#{p.rank}</span>
              <span className="font-bold text-white text-sm">{p.userName}</span>
              {p.threatenedByRedZone && (
                <span className="text-[9px] px-1.5 py-0.5 bg-rose-600 text-white rounded font-mono font-black animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  RED ZONE THREAT
                </span>
              )}
            </div>
            <div className="text-right font-mono">
              <div className={`font-extrabold text-sm ${isSimulating ? 'text-cyan-300' : 'text-emerald-300'}`}>
                {p.totalProjectedPoints.toFixed(1)} pts
              </div>
              <div className="text-[10px] text-slate-400">+{p.leadOverDanger.toFixed(1)} over danger</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier 2: The Danger Zone (Positions 2 through 9) */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-bold tracking-wider text-amber-400 uppercase font-mono">Tier 2: The Danger Zone (1.0 - 2.0 Shots)</span>
          <span className="text-[11px] text-slate-400 font-mono">Volatile Exposure</span>
        </div>
        <div className="space-y-1.5">
          {standings.filter(s => s.tier === 'DANGER_ZONE').map(p => (
            <div
              key={p.userId}
              className={`p-2.5 rounded-lg bg-transparent border border-slate-800 flex items-center justify-between transition-all duration-200 ${
                p.threatenedByRedZone ? 'border-red-500/70 animate-pulse bg-rose-950/20' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-400 text-xs">#{p.rank}</span>
                <span className="font-medium text-slate-200 text-xs">{p.userName}</span>
                {p.threatenedByRedZone && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-rose-600/90 text-white rounded font-mono font-bold animate-pulse">
                    RED ZONE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-amber-400/90 font-bold">{p.penaltyShots} shots</span>
                <span className={`font-bold ${isSimulating ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {p.totalProjectedPoints.toFixed(1)} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visceral Demarcation Barrier: THE DROP */}
      <TheDropDivider />

      {/* Tier 3: Dead Place (Position 10 - Decision #69 Absolute 2.50 Shots) */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-bold tracking-wider text-rose-400 uppercase font-mono">Tier 3: Dead Place (Decision #69)</span>
          <span className="text-[11px] text-rose-400 font-mono font-black">2.50 SHOTS</span>
        </div>
        {standings.filter(s => s.isDeadPlace || s.tier === 'DEAD_PLACE').map(p => (
          <div
            key={p.userId}
            className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/80 shadow-[inset_0_0_20px_rgba(225,29,72,0.15)] flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-black text-rose-400 text-sm">#{p.rank}</span>
              <span className="font-black text-white text-sm">{p.userName}</span>
              <span className="text-[9px] px-2 py-0.5 bg-rose-600 text-white font-mono font-black rounded uppercase tracking-wider shadow-sm shadow-rose-900">
                MONARCH CANDIDATE
              </span>
            </div>
            <div className="text-right font-mono">
              <div className={`font-black text-sm ${isSimulating ? 'text-cyan-300' : 'text-rose-300'}`}>
                {p.totalProjectedPoints.toFixed(1)} pts
              </div>
              <div className="text-[10px] text-rose-400 font-bold">-{p.gapToSafety.toFixed(1)} to 8th safety</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
