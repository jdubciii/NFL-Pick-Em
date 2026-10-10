import React from 'react';

export interface LiveGameflowCardData {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  spread: number;
  quarter: string;
  timeRemaining: string;
  possession: string;
  downAndDistance: string;
  yardLine: number; // <= 20 is red zone
  isFinal: boolean;
}

interface LiveGametrackStreamProps {
  games: LiveGameflowCardData[];
}

export const LiveGametrackStream: React.FC<LiveGametrackStreamProps> = ({ games }) => {
  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
          🏈 LIVE GAMETRACK &amp; DRIVE PROGRESSION
        </span>
        <span className="text-[9px] text-slate-400">REAL-TIME TELEMETRY</span>
      </div>

      {games.map((g) => {
        const isRedZone = g.yardLine <= 20 && !g.isFinal;

        return (
          <div
            key={g.gameId}
            className={`p-3.5 rounded-xl border transition-all ${
              isRedZone
                ? 'bg-rose-950/30 border-rose-500/80 shadow-[inset_0_0_20px_rgba(244,63,94,0.2)]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            {/* Header: Quarter, Clock, Red Zone */}
            <div className="flex items-center justify-between text-[11px] mb-2 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${g.isFinal ? 'bg-slate-500' : 'bg-emerald-400 animate-pulse'}`} />
                <span className="font-bold text-slate-300">
                  {g.isFinal ? 'FINAL' : `${g.quarter} - ${g.timeRemaining}`}
                </span>
              </div>
              {isRedZone && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black animate-pulse">
                  RED ZONE [{g.possession}]
                </span>
              )}
            </div>

            {/* Scoreboard Line */}
            <div className="flex items-center justify-between my-2 text-sm font-black">
              <div className="flex items-center gap-2">
                <span className={g.possession === g.awayTeam && !g.isFinal ? 'text-amber-400' : 'text-white'}>
                  {g.awayTeam} {g.awayScore}
                </span>
                <span className="text-slate-500 font-normal">@</span>
                <span className={g.possession === g.homeTeam && !g.isFinal ? 'text-amber-400' : 'text-white'}>
                  {g.homeTeam} {g.homeScore}
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">
                Line: {g.spread > 0 ? `+${g.spread}` : g.spread}
              </span>
            </div>

            {/* Down, Distance & Possession Yard Line */}
            {!g.isFinal && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span className="font-semibold text-slate-300">
                  🏈 {g.possession} ball: {g.downAndDistance}
                </span>
                <span>Ball on {g.yardLine} YD</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
