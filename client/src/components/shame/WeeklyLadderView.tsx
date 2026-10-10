import React, { useState, useEffect } from 'react';
import type { SettledLadderParticipant } from '../../services/wallOfShameConsolidationService';

interface WeeklyLadderViewProps {
  ladder: SettledLadderParticipant[];
  onTriggerFtaDemo?: () => void;
}

export const WeeklyLadderView: React.FC<WeeklyLadderViewProps> = ({ ladder }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600 * 24 + 1800);

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
  const dangerTier1 = ladder.filter((m) => m.tier === 'DANGER_LOW');
  const dangerTier2 = ladder.filter((m) => m.tier === 'DANGER_HIGH');
  const pitMember = ladder.find((m) => m.tier === 'PIT');

  return (
    <div className="w-full space-y-4 p-3 font-mono">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
          WEEK RESULTS // LADDER BREAKDOWN
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
          OFFICIAL CHARTER TIERS
        </span>
      </div>

      {/* 1. Safe Haven (0.00 Shots) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase">
            SAFE HAVEN // 1ST PLACE (0 SHOTS)
          </span>
          <span className="text-[9px] text-emerald-500 font-bold">0.00s</span>
        </div>
        {safeMembers.map((m) => (
          <div
            key={m.userId}
            className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-900 flex items-center justify-between text-xs text-slate-300"
          >
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-400">#{m.rank}</span>
              <span className="font-bold">{m.userName}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">CLEARED (SAFE)</span>
          </div>
        ))}
      </div>

      {/* 2. Danger Zone Tier 1 (2nd–6th Place: 1.00 Shot) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-amber-400 uppercase">
            DANGER ZONE // 2ND–6TH PLACE (1.00 SHOT)
          </span>
          <span className="text-[9px] text-amber-400 font-bold">1.00s</span>
        </div>
        {dangerTier1.map((m) => (
          <div
            key={m.userId}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400">#{m.rank}</span>
              <span className="font-semibold text-slate-200">{m.userName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-300 font-black">1.00s</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                {m.fsmDisplayStatus}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 6TH / 7TH DANGER FAULT LINE */}
      <div className="my-1 border-t-2 border-dashed border-rose-500/50 relative text-center">
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-[9px] font-black text-rose-400 uppercase tracking-widest">
          ▼ THE DROP (1.00s ➔ 2.00s STEP) ▼
        </span>
      </div>

      {/* 3. Danger Zone Tier 2 (7th–9th Place: 2.00 Shots) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-rose-400 uppercase">
            HIGH DANGER // 7TH–9TH PLACE (2.00 SHOTS)
          </span>
          <span className="text-[9px] text-rose-400 font-bold">2.00s</span>
        </div>
        {dangerTier2.map((m) => (
          <div
            key={m.userId}
            className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/40 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-rose-400">#{m.rank}</span>
              <span className="font-semibold text-slate-100">{m.userName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-rose-300 font-black">2.00s</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                {m.fsmDisplayStatus}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. The Pit (10th Place: 2.50 Shots) */}
      {pitMember && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-black text-rose-400 px-1 uppercase tracking-wider">
            THE PIT // 10TH PLACE DEAD PLACE
          </span>

          <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/80 shadow-glow-rose space-y-3">
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
                <p className="text-[9px] text-rose-200 uppercase font-bold">
                  {pitMember.fsmDisplayStatus}
                </p>
              </div>
            </div>

            {/* Executioner's Clock with WCAG Compliant Text Contrast */}
            <div className="p-3 rounded-xl bg-slate-950/95 border border-rose-500/70 text-center space-y-1">
              <p className="text-[10px] text-rose-200 font-bold uppercase tracking-widest">
                TIME TO SUBMIT EVIDENCE (SUBMISSION DEADLINE)
              </p>
              <p className="text-2xl font-mono font-black tracking-widest text-rose-400 tabular-nums">
                {formatHoursClock(secondsRemaining)}
              </p>
              <p className="text-[9px] text-slate-300">
                Deadline: 48h from finalization before +2.00 Failure to Appear escalation
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
