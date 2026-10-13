import React, { useState, useEffect } from 'react';
import { fetchLiveNFLScores, processLiveScoreUpdate, LiveGame } from '../../services/liveScoreService';

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
  games?: (LiveGame | LiveGameflowCardData)[];
  weekNumber?: number;
}

export const LiveGametrackStream: React.FC<LiveGametrackStreamProps> = ({ games: propGames, weekNumber = 5 }) => {
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchLiveNFLScores(weekNumber).then((data) => {
      if (isMounted) {
        setLiveGames((prev) => processLiveScoreUpdate(prev, data));
      }
    });

    const interval = setInterval(() => {
      fetchLiveNFLScores(weekNumber).then((data) => {
        if (isMounted) {
          setLiveGames((prev) => processLiveScoreUpdate(prev, data));
        }
      });
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [weekNumber]);

  const activeGames: (LiveGame | LiveGameflowCardData)[] =
    propGames && propGames.length > 0 ? propGames : liveGames;

  if (!activeGames || activeGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40 my-4 font-mono">
        <div className="text-emerald-400 font-bold tracking-widest uppercase text-xs mb-1">[ NO GAMES IN PROGRESS ]</div>
        <p className="text-slate-400 text-xs">Live drive progression and red zone telemetry activate at 1:00 PM ET kickoff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
          🏈 LIVE GAMETRACK &amp; DRIVE PROGRESSION
        </span>
        <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ESPN LIVE FEED
        </span>
      </div>

      {activeGames.map((item) => {
        const isEspnGame = 'homeTeam' in item && typeof item.homeTeam === 'object';

        const gameId = isEspnGame ? (item as LiveGame).id : (item as LiveGameflowCardData).gameId;
        const awayCode = isEspnGame ? (item as LiveGame).awayTeam.code : (item as LiveGameflowCardData).awayTeam;
        const homeCode = isEspnGame ? (item as LiveGame).homeTeam.code : (item as LiveGameflowCardData).homeTeam;
        const awayScore = isEspnGame ? (item as LiveGame).awayTeam.score : (item as LiveGameflowCardData).awayScore;
        const homeScore = isEspnGame ? (item as LiveGame).homeTeam.score : (item as LiveGameflowCardData).homeScore;
        const espnGame = item as LiveGame;
        const isFinal = isEspnGame
          ? espnGame.status === 'FINAL'
          : (item as LiveGameflowCardData).isFinal;
        const isScheduled = isEspnGame && espnGame.status === 'SCHEDULED';
        const isHalftime = isEspnGame && (
          espnGame.displayClock === 'HALFTIME' ||
          espnGame.clock === 'HALFTIME' ||
          espnGame.periodLabel === 'HALF'
        );
        const isRedZone = isEspnGame
          ? Boolean(espnGame.isRedZone)
          : (item as LiveGameflowCardData).yardLine <= 20 && !isFinal;
        const timeHeader = isEspnGame
          ? isFinal
            ? 'FINAL'
            : isHalftime
            ? 'HALFTIME'
            : isScheduled
            ? 'SCHEDULED'
            : `${espnGame.periodLabel || `Q${espnGame.period}`} - ${espnGame.displayClock || espnGame.clock}`
          : isFinal
          ? 'FINAL'
          : `${(item as LiveGameflowCardData).quarter} - ${(item as LiveGameflowCardData).timeRemaining}`;
        const situation = isEspnGame
          ? espnGame.downDistanceText
          : `${(item as LiveGameflowCardData).possession} ball: ${(item as LiveGameflowCardData).downAndDistance} (Ball on ${(item as LiveGameflowCardData).yardLine} YD)`;

        return (
          <div
            key={gameId}
            className={`p-3.5 rounded-xl border transition-all ${
              isRedZone
                ? 'bg-rose-950/30 border-rose-500/80 shadow-[inset_0_0_20px_rgba(244,63,94,0.2)]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            {/* Header: Quarter, Clock, Red Zone */}
            <div className="flex items-center justify-between text-[11px] mb-2 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                {isHalftime ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold uppercase text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    LIVE • HALFTIME
                  </span>
                ) : (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFinal ? 'bg-slate-500' : isScheduled ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    <span className="font-bold text-slate-300">{timeHeader}</span>
                  </>
                )}
              </div>
              {isRedZone && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black animate-pulse">
                  RED ZONE
                </span>
              )}
            </div>

            {/* Scoreboard Line */}
            <div className="flex items-center justify-between my-2 text-sm font-black">
              <div className="flex items-center gap-2">
                <span className="text-white">
                  {awayCode} <span className="text-amber-400">{awayScore}</span>
                </span>
                <span className="text-slate-500 font-normal">@</span>
                <span className="text-white">
                  {homeCode} <span className="text-amber-400">{homeScore}</span>
                </span>
              </div>
              {isEspnGame ? (
                <span className="text-[10px] text-cyan-400 font-bold truncate max-w-[120px]">
                  {(item as LiveGame).shortName || (item as LiveGame).name}
                </span>
              ) : (
                <span className="text-[10px] text-cyan-400 font-bold">
                  Line: {(item as LiveGameflowCardData).spread > 0 ? `+${(item as LiveGameflowCardData).spread}` : (item as LiveGameflowCardData).spread}
                </span>
              )}
            </div>

            {/* Down, Distance & Possession Yard Line */}
            {!isFinal && situation && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span className="font-semibold text-slate-300">
                  🏈 {situation}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
