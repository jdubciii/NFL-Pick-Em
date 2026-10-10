import React from 'react';
import type { ParticipantStandings } from '../../services/radarSimulationEngine';

interface DangerSeatStripProps {
  standings: ParticipantStandings[];
  isSimulating: boolean;
}

export const DangerSeatStrip: React.FC<DangerSeatStripProps> = ({ standings, isSimulating }) => {
  if (standings.length < 10) return null;

  const leader = standings[0];
  const survivalBorder = standings[1];
  const dangerSeat9 = standings[8];
  const deadPlace10 = standings[9];

  return (
    <div className="w-full mb-4 space-y-2">
      {isSimulating && (
        <div className="bg-cyan-950/80 border border-cyan-500/60 rounded-md py-1 px-3 text-center text-xs font-semibold tracking-wider text-cyan-300 animate-pulse">
          IN-MEMORY SIMULATION ACTIVE (CHAOS ENGINE)
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg border bg-slate-900/90 border-emerald-500/40 shadow-sm shadow-emerald-950/50 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20">
            <span className="font-bold tracking-wider text-emerald-400">SURVIVAL LINE</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">0 SHOTS</span>
          </div>
          <div className="pt-1.5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-bold truncate max-w-[90px]">1. {leader.userName}</span>
              <span className="text-emerald-400 font-bold">{leader.totalProjectedPoints.toFixed(1)} pts</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span className="truncate max-w-[90px]">2. {survivalBorder.userName}</span>
              <span>{survivalBorder.totalProjectedPoints.toFixed(1)} pts</span>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg border bg-slate-900/90 border-rose-500/50 shadow-sm shadow-rose-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1 border-b border-rose-500/20">
            <span className="font-bold tracking-wider text-rose-400">DEAD PLACE SEAT</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-extrabold">2.50 SHOTS</span>
          </div>
          <div className="pt-1.5 space-y-1">
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span className="truncate max-w-[90px]">9. {dangerSeat9.userName}</span>
              <span>{dangerSeat9.totalProjectedPoints.toFixed(1)} pts</span>
            </div>
            <div className="flex justify-between items-center text-rose-300 font-bold">
              <span className="truncate max-w-[90px]">10. {deadPlace10.userName}</span>
              <span className="text-rose-400 font-bold">{deadPlace10.totalProjectedPoints.toFixed(1)} pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
