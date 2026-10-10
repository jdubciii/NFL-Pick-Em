import React, { useState, useEffect } from 'react';
import type { SettledLadderParticipant } from '../../services/wallOfShameConsolidationService';

interface WeeklyLadderViewProps {
  ladder: SettledLadderParticipant[];
  onTriggerFtaDemo?: () => void;
}

export const WeeklyLadderView: React.FC<WeeklyLadderViewProps> = ({
  ladder,
  onTriggerFtaDemo
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600 * 24 + 1800); // 24h 30m demo

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHoursClock = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const safeMembers = ladder.filter((m) => m.tier === 'SAFE');
  const dangerMembers = ladder.filter((m) => m.tier === 'DANGER');
  const pitMember = ladder.find((m) => m.tier === 'PIT');

  return (
    <div className="w-full space-y-4 p-3 font-mono">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
          AUTOPSY // FINALIZED WEEK LADDER
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
          SETTLED LADDER
        </span>
      </div>

      {/* 1. TOP: SAFE HAVEN (MUTED ROWS) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-emerald-400 px-1 uppercase">
          Safe Haven (0.00 Shots)
        </span>
        {safeMembers.map((m) => (
          <div
            key={m.userId}
            className="p-2 rounded-lg bg-slate-950/40 border border-slate-900 flex items-center justify-between text-xs text-slate-500"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">#{m.rank}</span>
              <span className="text-slate-400">{m.userName}</span>
            </div>
            <span className="text-[10px] text-emerald-500/80 font-bold">CLEARED (SAFE)</span>
          </div>
        ))}
      </div>

      {/* 2. MIDDLE: DANGER ZONE (AMBER BORDERS) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-amber-400 px-1 uppercase">
          Danger Zone (1.00 - 2.00 Shots)
        </span>
        {dangerMembers.map((m) => (
          <div
            key={m.userId}
            className="p-2.5 rounded-lg bg-slate-900/80 border border-amber-500/40 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400">#{m.rank}</span>
              <span className="font-semibold text-slate-200">{m.userName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-300 font-bold">{m.penaltyShots.toFixed(2)}s</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                SETTLED
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. BOTTOM: THE PIT (DARK RED CONTAINER & EXECUTIONER CLOCK) */}
      {pitMember && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-black text-rose-400 px-1 uppercase tracking-wider">
            THE PIT // 10TH PLACE DEAD PLACE
          </span>

          <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.3)] space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">💀</span>
                <div>
                  <p className="text-sm font-black text-white">{pitMember.userName}</p>
                  <p className="text-[9px] text-rose-300 font-bold uppercase">
                    DEAD PLACE MONARCH
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-rose-400">
                  {pitMember.penaltyShots.toFixed(2)} SHOTS
                </p>
                <p className="text-[9px] text-rose-300/80 uppercase font-bold">
                  STATUS: {pitMember.fsmStatus}
                </p>
              </div>
            </div>

            {/* The Executioner's Clock (Submission Deadline) */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-rose-500/60 text-center space-y-1">
              <p className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
                TIME TO SUBMIT EVIDENCE (EXECUTIONER'S CLOCK)
              </p>
              <p className="text-xl font-black tracking-widest text-rose-400 animate-pulse">
                {formatHoursClock(secondsRemaining)}
              </p>
              <p className="text-[9px] text-slate-400">
                Deadline: 48h from finalization before +2.00 Failure to Appear escalation
              </p>
            </div>

            {/* Failure to Appear Escalation Stamp */}
            {pitMember.isFailureToAppear && (
              <div className="p-3 rounded-xl bg-rose-950 border-2 border-rose-500 text-center animate-bounce">
                <span className="text-xs font-black text-white tracking-widest bg-rose-600 px-2 py-1 rounded">
                  [ FAILURE TO APPEAR // +2.00 SHOTS STAMPED ]
                </span>
                <p className="text-[10px] text-rose-300 mt-1.5 font-bold">
                  DEBT ESCALATED TO 4.50 SHOTS
                </p>
              </div>
            )}

            {onTriggerFtaDemo && (
              <button
                onClick={onTriggerFtaDemo}
                className="w-full py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold transition"
              >
                [ SIMULATE 48H DEADLINE EXPIRATION (+2.00 FTA) ]
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
