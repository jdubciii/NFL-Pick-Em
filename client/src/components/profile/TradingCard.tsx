import React, { useState } from 'react';
import type { UserRapSheetProfile } from '../../services/reputationEngineService';

interface TradingCardProps {
  profile: UserRapSheetProfile;
}

export const TradingCard: React.FC<TradingCardProps> = ({ profile }) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  return (
    <div
      onClick={() => setIsFlipped((prev) => !prev)}
      className="relative w-full h-[320px] cursor-pointer select-none perspective-[1000px] mb-5 font-mono"
    >
      <div
        className={`w-full h-full duration-500 transform-style-preserve-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT: The Glamour Trading Card */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/70 border-2 border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.25)] p-4 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-60" />

          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
            <span className="text-[11px] font-black text-cyan-300 tracking-wider uppercase">
              LEAGUE TRADING CARD // S2026
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 font-extrabold text-cyan-200">
              RANK #{profile.seasonRank}
            </span>
          </div>

          <div className="text-center my-auto space-y-2">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-900 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center text-2xl font-black text-white">
              {profile.avatarInitials}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wider text-white">
                {profile.userName}
              </h2>
              <div className="inline-block mt-1 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500 text-[10px] font-black text-rose-300 tracking-widest uppercase shadow-sm">
                👑 {profile.primaryTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[11px]">
            <span className="text-slate-400 font-semibold">
              STREAK: <strong className="text-emerald-400">{profile.activeStreak}</strong>
            </span>
            <span className="text-[10px] text-cyan-400/80 animate-pulse font-bold">
              TAP TO FLIP [RAP SHEET] ➔
            </span>
          </div>
        </div>

        {/* BACK: The Stark Monospace Rap Sheet */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-black border-2 border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.25)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
            <span className="text-[11px] font-black text-rose-400 tracking-wider uppercase">
              CRIMINAL RAP SHEET // STATS
            </span>
            <span className="text-[10px] text-slate-500">DOSSIER CLASSIFIED</span>
          </div>

          <div className="space-y-2.5 my-auto text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">LIFETIME PICKS FILED:</span>
              <span className="font-black text-white">{profile.totalPicksLifetime}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">HISTORICAL ACCURACY:</span>
              <span className="font-black text-cyan-400">{profile.accuracyPct}%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">TOTAL SHOTS CONSUMED:</span>
              <span className="font-black text-emerald-400">{profile.metrics.servedCleared.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-rose-950/40 border border-rose-500/60">
              <span className="text-rose-300 font-bold">ACTIVE UNFULFILLED DEBT:</span>
              <span className="font-black text-rose-400 text-sm">{profile.metrics.outstandingDebt.toFixed(2)} SHOTS</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400">
            <span>AUDIT HASH: #DOSSIER-S2026</span>
            <span className="text-rose-400 font-bold">TAP TO RETURN ➔</span>
          </div>
        </div>
      </div>
    </div>
  );
};
