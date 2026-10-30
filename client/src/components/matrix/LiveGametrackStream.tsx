import React, { useState, useEffect } from 'react';
import { fetchLiveNFLScores, processLiveScoreUpdate, LiveGame } from '../../services/liveScoreService';
import { getCurrentNFLWeek } from '../../services/nflCalendarService';

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


function formatKickoffAZ(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
  } catch (_) { return null; }
}

export const LiveGametrackStream: React.FC<LiveGametrackStreamProps> = ({
  games: propGames,
  weekNumber = getCurrentNFLWeek()
}) => {
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

  const allFinal =
    activeGames.length > 0 &&
    activeGames.every((item) => {
      const isEspnGame = 'homeTeam' in item && typeof item.homeTeam === 'object';
      return isEspnGame
        ? (item as LiveGame).status === 'FINAL'
        : (item as LiveGameflowCardData).isFinal;
    });

  const allUpcoming =
    activeGames.length > 0 &&
    activeGames.every((item) => {
      const isEspnGame = 'homeTeam' in item && typeof item.homeTeam === 'object';
      return isEspnGame
        ? (item as LiveGame).status === 'SCHEDULED'
        : !(item as LiveGameflowCardData).isFinal;
    });

  if (!activeGames || activeGames.length === 0) {
    if (weekNumber < getCurrentNFLWeek()) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40 my-4 font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold mb-2">
            <span>WEEK {weekNumber} FINAL</span>
          </div>
          <p className="text-zinc-500 text-xs">All Week {weekNumber} games have concluded.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40 my-4 font-mono">
        <p className="text-slate-400 text-xs">Live drive progression and red zone telemetry activate at kickoff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between px-1 mb-1">
        {allFinal ? (
          <span className="text-xs font-black tracking-widest text-zinc-400 uppercase">
            🏈 WEEK {weekNumber} FINAL SCORES
          </span>
        ) : allUpcoming ? (
          <span className="text-xs font-black tracking-widest text-cyan-400 uppercase">
            🏈 WEEK {weekNumber} SLATE
          </span>
        ) : (
          <>
            <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
              🏈 LIVE GAMETRACK &amp; DRIVE PROGRESSION
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ESPN LIVE FEED
            </span>
          </>
        )}
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
            : `${(espnGame.period && espnGame.period >= 5) ? 'OT' : (espnGame.periodLabel || (espnGame.period ? `Q${espnGame.period}` : 'LIVE'))} - ${espnGame.displayClock || espnGame.clock || ''}`
          : isFinal
          ? 'FINAL'
          : `${(item as LiveGameflowCardData).quarter === 'Q5' || (item as LiveGameflowCardData).quarter === '5' ? 'OT' : (item as LiveGameflowCardData).quarter} - ${(item as LiveGameflowCardData).timeRemaining}`;
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
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold uppercase text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    LIVE • HALFTIME
                  </span>
                ) : (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFinal ? 'bg-zinc-500' : isScheduled ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    <span className="font-bold text-slate-300">{timeHeader}</span>
                  </>
                )}
              </div>
              {isRedZone && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-rose-600 text-white font-black animate-pulse">
                  RED ZONE
                </span>
              )}
            </div>

            {/* Scoreboard Line */}
            <div className="flex items-center justify-between my-2 text-sm font-black">
              <div className="flex items-center gap-2">
                {isScheduled ? (
                  <span className="text-white">
                    {awayCode}{isEspnGame && espnGame.awayTeam?.record ? <span className="text-slate-400 font-bold text-xs"> {espnGame.awayTeam.record}</span> : null} <span className="text-slate-300 font-normal">@</span> {homeCode}{isEspnGame && espnGame.homeTeam?.record ? <span className="text-slate-400 font-bold text-xs"> {espnGame.homeTeam.record}</span> : null}
                  </span>
                ) : (
                  <>
                    <span className="text-white">
                      {awayCode} <span className="text-amber-400">{awayScore}</span>
                    </span>
                    <span className="text-slate-300 font-normal">@</span>
                    <span className="text-white">
                      {homeCode} <span className="text-amber-400">{homeScore}</span>
                    </span>
                  </>
                )}
              </div>
              {isScheduled ? (
                <span className="text-sm font-black text-white whitespace-nowrap">
                  {isEspnGame ? (formatKickoffAZ((item as LiveGame).dateTime) || 'Kickoff TBD') : 'Kickoff TBD'}
                </span>
              ) : isEspnGame ? (
                <span className="text-xs text-cyan-400 font-bold truncate max-w-[120px]">
                  {(item as LiveGame).shortName || (item as LiveGame).name}
                </span>
              ) : (
                <span className="text-xs text-cyan-400 font-bold">
                  Line: {(item as LiveGameflowCardData).spread > 0 ? `+${(item as LiveGameflowCardData).spread}` : (item as LiveGameflowCardData).spread}
                </span>
              )}
            </div>

            {isScheduled && isEspnGame && espnGame.favoriteLine ? (
              <div className="text-xs text-slate-300 font-bold pt-1">
                FAV: {espnGame.favoriteLine}
              </div>
            ) : null}

            {/* Down, Distance & Possession Yard Line */}
            {!isFinal && situation && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
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
export default LiveGametrackStream;
