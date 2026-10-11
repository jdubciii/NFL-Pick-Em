import React, { useState, useEffect, useMemo } from 'react';
import { fetchLiveNFLScores, LiveGame } from '../services/liveScoreService';
import { EmptyStateWireframe } from '../components/common/EmptyStateWireframe';
import {
  OFFICIAL_WEEK_5_GAMES,
  reconcileRadarStandings,
  identifyDecisiveGame,
  PlayerStandingTelemetry
} from '../services/radarLiveConsequencesService';

const SAMPLE_INITIAL_PLAYERS = [
  { userId: 'u1', userName: 'Jack (You)', bankedPoints: 7, livePicksWinning: 2 },
];

export const RadarPage: React.FC = () => {
  const [liveScores, setLiveScores] = useState<LiveGame[]>([]);
  useEffect(() => {
    fetchLiveNFLScores().then(data => { if (data && data.length > 0) setLiveScores(data); });
    const timer = setInterval(() => {
      fetchLiveNFLScores().then(data => { if (data && data.length > 0) setLiveScores(data); });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const isGamedayActive = liveScores.length > 0 || true;
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [whatIfDallasWins, setWhatIfDallasWins] = useState<boolean>(false);
  const [isDemoGameday, setIsDemoGameday] = useState<boolean>(true);

  // Compute standings with mathematical equity reconciliation
  const standings = useMemo(() => {
    let players = [...SAMPLE_INITIAL_PLAYERS];
    if (whatIfDallasWins) {
      // Simulate DAL cover: Jack loses 1 pt, Dave gains 1 pt
      players = players.map((p) => {
        if (p.userId === 'u1') return { ...p, livePicksWinning: p.livePicksWinning - 1 };
        if (p.userId === 'u2') return { ...p, livePicksWinning: p.livePicksWinning + 1 };
        return p;
      });
    }
    return reconcileRadarStandings(players);
  }, [whatIfDallasWins]);

  const userStanding = standings.find((s) => s.userId === 'u1') || standings[0];
  const decisiveGame = useMemo(() => {
    return identifyDecisiveGame(userStanding.currentRank, OFFICIAL_WEEK_5_GAMES);
  }, [userStanding.currentRank]);

  const handleToggleSimulation = () => {
    setIsSimulationActive(!isSimulationActive);
    setWhatIfDallasWins(!whatIfDallasWins);
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(45);
    }
  };

  const handleResetSimulation = () => {
    setIsSimulationActive(false);
    setWhatIfDallasWins(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28 max-w-md mx-auto font-sans">
      {/* 1. Sticky Simulation Warning Banner */}
      {isSimulationActive && (
        <div className="sticky top-0 z-40 -mx-4 px-4 py-2 bg-cyan-950/95 border-b border-cyan-400 font-mono text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-black text-cyan-200 uppercase tracking-wider">
              ⚡ WHAT-IF SIMULATION ACTIVE
            </span>
          </div>
          <button
            onClick={handleResetSimulation}
            className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black text-[10px] hover:bg-cyan-400"
          >
            RETURN TO LIVE
          </button>
        </div>
      )}

      {/* 2. Header: De-Jargoned Consumer Copy */}
      <header className="mb-4 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <h1 className="text-lg font-black tracking-wider text-cyan-400">
            SUNDAY RADAR
          </h1>
          <p className="text-xs text-slate-400">Live Standings &amp; Gameday Sweat</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
            LIVE GAMEDAY // WEEK 5
          </span>
        </div>
      </header>

      {!isGamedayActive || standings.length === 0 || OFFICIAL_WEEK_5_GAMES.length === 0 ? (
        <EmptyStateWireframe
          header="[ 14 MATCHUPS PENDING KICKOFF ]"
          subtitle="[ SUNDAY 1:00 PM LOCK INCOMING ]"
          contextDetail="All 14 matchups are pending kickoff with zero live scores. Live standing equity, podium probabilities, and danger seat telemetry will activate on Sunday opening drive."
        />
      ) : (
        <>
          {/* 3. ABOVE-THE-FOLD: Your Standing If Current Results Held */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border-2 border-cyan-500/50 shadow-glow-cyan mb-4 font-mono">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                YOUR STANDING (IF CURRENT RESULTS HELD)
              </span>
          <span className="text-xs font-black px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-200">
            RANK #{userStanding.currentRank}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 my-3 text-center">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-bold">BANKED PTS</span>
            <p className="text-base font-black text-white">{userStanding.bankedPoints}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[9px] text-cyan-400 font-bold">LIVE PTS</span>
            <p className="text-base font-black text-cyan-300">+{userStanding.livePoints}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[9px] text-amber-400 font-bold">WIN EQUITY</span>
            <p className="text-base font-black text-amber-300">{userStanding.winEquityPct}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
          <span className="text-slate-400">
            Current Tier Penalty:{' '}
            <strong className="text-white">{userStanding.penaltyShots.toFixed(2)}s</strong>
          </span>
          <span className="text-emerald-400 font-bold">
            Podium: {userStanding.podiumPct}%
          </span>
        </div>
      </div>

        {/* Decisive Game / Highest Leverage */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-4 font-mono">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-2">
            <span>⚡ DECISIVE GAME // GAMEDAY LEVERAGE</span>
            <span className="text-slate-500 text-[10px]">PEER PICKS</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">Awaiting peer pick submissions across active league members.</p>
            <p className="text-[10px] text-slate-500 mt-1">Live head-to-head leverage and comeback simulations unlock once peer slates lock.</p>
          </div>
        </div>

      {/* 5. PROVISIONAL CHARTER TIER LADDER */}
      <div className="space-y-2 font-mono">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            PROVISIONAL TIER STANDINGS
          </span>
          <span className="text-[9px] text-slate-500">CHARTER TIERS</span>
        </div>

        {standings.map((p, idx) => {
          const isUser = p.userId === 'u1';
          const isDropLine = idx === 5; // Between 6th and 7th place

          return (
            <React.Fragment key={p.userId}>
              <div
                className={`p-2 rounded-xl border flex items-center justify-between text-xs transition ${
                  isUser
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-glow-cyan'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-black ${
                      p.rank === 1
                        ? 'text-emerald-400'
                        : p.rank === 10
                        ? 'text-rose-500'
                        : 'text-slate-300'
                    }`}
                  >
                    #{p.rank}
                  </span>
                  <span className={`font-bold ${isUser ? 'text-white' : 'text-slate-300'}`}>
                    {p.userName}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-semibold">{p.totalPoints} pts</span>
                  <span
                    className={`font-black text-[11px] px-2 py-0.5 rounded ${
                      p.penaltyShots === 0
                        ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                        : p.penaltyShots === 1
                        ? 'bg-amber-950 border border-amber-500/60 text-amber-300'
                        : p.penaltyShots === 2
                        ? 'bg-rose-950/80 border border-rose-500/60 text-rose-300'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {p.penaltyShots.toFixed(2)}s
                  </span>
                </div>
              </div>

              {/* Visceral Drop Line Divider between 6th & 7th place */}
              {isDropLine && (
                <div className="my-1 border-t-2 border-dashed border-rose-500/50 relative text-center">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-[8px] font-black text-rose-400 uppercase tracking-widest">
                    ▼ THE DROP (1.00s ➔ 2.00s STEP) ▼
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      </>
    )}
  </div>
);
};

export default RadarPage;

