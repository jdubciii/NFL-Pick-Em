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
      className="relative w-full h-[320px] cursor-pointer select-none [perspective:1000px] mb-5 font-mono group"
    >
      <div
        className={`w-full h-full duration-500 [transform-style:preserve-3d] transition-transform ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* FRONT: Glamour Trading Card */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(0deg)] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/80 border-2 border-cyan-500/70 shadow-glow-cyan p-4 flex flex-col justify-between overflow-hidden">
          {/* Carbon weave overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:10px_10px]"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative z-10 flex items-center justify-between border-b border-cyan-500/30 pb-2">
            <span className="text-[11px] font-black text-cyan-300 tracking-wider uppercase">
              SEASON 2026 TRADING CARD
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 font-extrabold text-cyan-200 shadow-glow-cyan">
              RANK #{profile.seasonRank}
            </span>
          </div>

          <div className="relative z-10 text-center my-auto space-y-2">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-900 border-2 border-cyan-400 shadow-glow-cyan flex items-center justify-center text-2xl font-black text-white">
              {profile.avatarInitials}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wider text-white">
                {profile.userName}
              </h2>
              <div className="inline-block mt-1 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500 text-[10px] font-black text-rose-300 tracking-widest uppercase shadow-glow-rose">
                👑 {profile.primaryTitle}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px]">
            <span className="text-slate-400 font-semibold">
              RECORD: <strong className="text-emerald-400">{profile.activeStreak}</strong>
            </span>
            <span className="text-[10px] text-cyan-400 font-bold tracking-wider animate-pulse">
              TAP TO FLIP [PENALTY HISTORY] ➔
            </span>
          </div>
        </div>

        {/* BACK: Stark Monospace Rap Sheet (Corrected [transform:rotateY(180deg)] to eliminate mirroring) */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl bg-black border-2 border-rose-500/70 shadow-glow-rose p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
            <span className="text-[11px] font-black text-rose-400 tracking-wider uppercase">
              LEAGUE RAP SHEET // VERIFIED
            </span>
            <span className="text-[10px] text-slate-500">OFFICIAL LOG</span>
          </div>

          <div className="space-y-2.5 my-auto text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Picks Submitted:</span>
              <span className="font-black text-white">{profile.totalPicksLifetime}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Pick Accuracy:</span>
              <span className="font-black text-cyan-400">{profile.accuracyPct}%</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Shots Cleared:</span>
              <span className="font-black text-emerald-400">{profile.metrics.servedCleared.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-rose-950/40 border border-rose-500/60 shadow-glow-rose">
              <span className="text-rose-300 font-bold">Outstanding Debt:</span>
              <span className="font-black text-rose-400 text-sm">{profile.metrics.outstandingDebt.toFixed(2)} SHOTS</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400">
            <span>MEMBER ID: #{profile.userId}</span>
            <span className="text-rose-400 font-bold">TAP TO RETURN ➔</span>
          </div>
        </div>
      </div>
    </div>
  );
};
