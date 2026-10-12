import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchLiveNFLScores, LiveGame } from '../services/liveScoreService';
import {
  calculateProvisionalStandings,
  ProvisionalStanding,
  ProvisionalStandingsResult,
  UserStandingRef,
  SlateGame,
  UserPickItem,
  TiebreakerData
} from '../services/sweatProjectionService';
import { RivalryShowdown } from '../components/radar/RivalryShowdown';

export const RadarPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeViewMode, setActiveViewMode] = useState<'LEAGUE' | 'RIVALRY'>('LEAGUE');
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);

  const [liveScores, setLiveScores] = useState<LiveGame[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isStale, setIsStale] = useState<boolean>(false);
  const liveScoresRef = useRef<LiveGame[]>([]);

  // Simulation what-if state
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [simulationFlippedPicks, setSimulationFlippedPicks] = useState<boolean>(false);

  // Pool & slate data (bound strictly to live database pool state)
  const [members, setMembers] = useState<UserStandingRef[]>([]);
  const [games, setGames] = useState<SlateGame[]>([]);
  const [picks, setPicks] = useState<UserPickItem[]>([]);
  const [tiebreakers] = useState<TiebreakerData | undefined>(undefined);

  // Track live scores with fallback to retain last-good telemetry
  useEffect(() => {
    let isMounted = true;

    const pullTelemetry = async () => {
      try {
        const data = await fetchLiveNFLScores();
        if (!isMounted) return;
        if (data && data.length > 0) {
          setLiveScores(data);
          liveScoresRef.current = data;
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setIsStale(false);
        } else if (liveScoresRef.current.length > 0) {
          setIsStale(true);
        }
      } catch (err) {
        if (!isMounted) return;
        if (liveScoresRef.current.length > 0) {
          setIsStale(true);
        }
      }
    };

    pullTelemetry();
    const timer = setInterval(pullTelemetry, 30000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Fetch pool data if token is active
  useEffect(() => {
    if (!token) return;
    const loadPoolMatrix = async () => {
      try {
        const poolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
        const res = await fetch(`/api/pools/${poolId}/matrix?week_no=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const matrix = await res.json();
          if (matrix.columns && matrix.columns.length > 0) {
            const mappedMembers: UserStandingRef[] = matrix.columns.map((col: any) => ({
              id: col.user_id,
              name: col.displayName || col.email || col.user_id,
            }));
            setMembers(mappedMembers);
          }
          if (matrix.rows && matrix.rows.length > 0) {
            const mappedGames: SlateGame[] = matrix.rows.map((row: any) => ({
              id: row.game_id,
              homeTeam: row.home_team_id,
              awayTeam: row.away_team_id,
              spread: row.spread,
              kickoffTime: row.kickoff_time,
            }));
            setGames(mappedGames);
          }
          if (matrix.cells && matrix.rows && matrix.columns) {
            const mappedPicks: UserPickItem[] = [];
            for (const row of matrix.rows) {
              for (const col of matrix.columns) {
                const cell = matrix.cells[row.game_id]?.[col.user_id];
                if (cell && cell.selected_team_id) {
                  mappedPicks.push({
                    userId: col.user_id,
                    gameId: row.game_id,
                    selectedTeam: cell.selected_team_id,
                    isSubmitted: true,
                    isHidden: cell.is_hidden,
                  });
                }
              }
            }
            if (mappedPicks.length > 0) {
              setPicks(mappedPicks);
            }
          }
        }
      } catch (err) {
        // Fall back gracefully
      }
    };

    loadPoolMatrix();
  }, [token]);

  // Effective picks respecting what-if simulation
  const effectivePicks = useMemo(() => {
    if (!simulationFlippedPicks) return picks;
    // Simulate DAL winning in g2
    return picks.map((p) => {
      if (p.userId === 'u1' && p.gameId === 'g2') {
        return { ...p, selectedTeam: 'DAL' };
      }
      return p;
    });
  }, [picks, simulationFlippedPicks]);

  // Compute Sunday Sweat provisional projections
  const provisionalResult: ProvisionalStandingsResult = useMemo(() => {
    return calculateProvisionalStandings(
      members,
      games,
      liveScores,
      effectivePicks,
      tiebreakers
    );
  }, [members, games, liveScores, effectivePicks, tiebreakers]);

  // Find user's standing
  const currentUserId = user?.id || 'u1';
  const currentUserRef: UserStandingRef = useMemo(() => {
    const found = members.find((m) => m.id === currentUserId);
    if (found) return found;
    return { id: currentUserId, name: user?.email ? user.email.split('@')[0] : 'Jack (Commissioner)' };
  }, [members, currentUserId, user?.email]);

  const userStanding = useMemo(() => {
    return (
      provisionalResult.find(
        (s) =>
          s.userId === currentUserId ||
          (user?.email === 'jack.w.cone@gmail.com' && s.userName.toLowerCase().includes('jack')) ||
          s.userName.includes('(Commissioner)')
      ) || provisionalResult[0]
    );
  }, [provisionalResult, currentUserId, user?.email]);

  // Active swing game for the user
  const activeSwingGame = userStanding?.swingGame || provisionalResult.swingGame || null;

  // Find live matchup details for the swing game
  const swingLiveMatch = useMemo(() => {
    if (!activeSwingGame) return null;
    return liveScores.find((l) => l.id === activeSwingGame.gameId);
  }, [activeSwingGame, liveScores]);

  // Rank-Change feedback & pulse animation (isolated from What-If simulation)
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const isInitialMountRef = useRef<boolean>(true);
  const [pulsingUserIds, setPulsingUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (provisionalResult.length === 0) return;
    // Decision: Prevent simulation states from polluting consecutive rank snapshot history
    if (isSimulationActive) return;

    if (isInitialMountRef.current) {
      const initialMap = new Map<string, number>();
      for (const s of provisionalResult) {
        initialMap.set(s.userId, s.provisionalRank);
      }
      prevRanksRef.current = initialMap;
      isInitialMountRef.current = false;
      return;
    }

    const changed = new Set<string>();
    const newMap = new Map<string, number>();

    for (const s of provisionalResult) {
      const prev = prevRanksRef.current.get(s.userId);
      if (prev !== undefined && prev !== s.provisionalRank) {
        changed.add(s.userId);
      }
      newMap.set(s.userId, s.provisionalRank);
    }

    prevRanksRef.current = newMap;

    if (changed.size > 0) {
      setPulsingUserIds(changed);
      const timer = setTimeout(() => {
        setPulsingUserIds(new Set());
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [provisionalResult, isSimulationActive]);

  const handleToggleSimulation = () => {
    setIsSimulationActive(!isSimulationActive);
    setSimulationFlippedPicks(!simulationFlippedPicks);
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(45);
    }
  };

  const handleResetSimulation = () => {
    setIsSimulationActive(false);
    setSimulationFlippedPicks(false);
  };

  // Charter Penalty Tier Alignment:
  // Rank 1: SAFE HAVEN (0s)
  // Ranks 2–6: DANGER ZONE (1s)
  // Ranks 7–9: THE DROP (2s)
  // Rank 10: THE PIT (2.5s)
  const renderTierBadge = (tier: ProvisionalStanding['tier']) => {
    switch (tier) {
      case 'SAFE_HAVEN':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-950 border border-emerald-500/60 text-emerald-300">SAFE HAVEN (0s)</span>;
      case 'DANGER_ZONE':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-950 border border-amber-500/60 text-amber-300">DANGER ZONE (1s)</span>;
      case 'THE_DROP':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-950 border border-orange-500/60 text-orange-300">THE DROP (2s)</span>;
      case 'PIT':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-950 border border-rose-500 text-rose-300">THE PIT (2.5s)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28 max-w-md mx-auto font-sans">
      {/* 1. Sticky Simulation Warning Banner */}
      {isSimulationActive && (
        <div className="sticky top-0 z-40 -mx-4 px-4 py-2 bg-amber-950/95 border-b border-amber-400 font-mono text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-black text-amber-200 uppercase tracking-wider">
              ⚡ WHAT-IF SIMULATION ACTIVE
            </span>
          </div>
          <button
            onClick={handleResetSimulation}
            className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] hover:bg-amber-400"
          >
            RETURN TO LIVE
          </button>
        </div>
      )}

      {/* 2. Header: Sunday Radar Telemetry Header */}
      <header className="mb-3 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <h1 className="text-lg font-black tracking-wider text-cyan-400">
            SUNDAY RADAR
          </h1>
          <p className="text-xs text-slate-400">Sunday Sweat Projections &amp; Showdowns</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          {isSimulationActive ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950 border border-amber-500/80 text-amber-300 font-bold text-[10px] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>SIMULATED WHAT-IF SCENARIO</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>LIVE PROJECTION</span>
            </div>
          )}
          {lastUpdated && !isSimulationActive && (
            <span className="text-[9px] text-slate-500">{lastUpdated}</span>
          )}
        </div>
      </header>

      {/* 3. Header Toggle: [ LEAGUE PROJECTION ] | [ RIVALRY DUEL ] */}
      <div className="grid grid-cols-2 p-1 bg-slate-900/90 border border-slate-800 rounded-xl mb-4 font-mono text-xs">
        <button
          onClick={() => setActiveViewMode('LEAGUE')}
          className={`py-1.5 rounded-lg font-black transition ${
            activeViewMode === 'LEAGUE'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          LEAGUE PROJECTION
        </button>
        <button
          onClick={() => setActiveViewMode('RIVALRY')}
          className={`py-1.5 rounded-lg font-black transition ${
            activeViewMode === 'RIVALRY'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          RIVALRY DUEL
        </button>
      </div>

      {/* 4. Stale / Offline Telemetry Alert Badge */}
      {isStale && !isSimulationActive && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-300 text-[10px] font-mono mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-bold">STALE TELEMETRY (AWAITING RECONNECT)</span>
        </div>
      )}

      {/* VIEW MODE 1: RIVALRY SHOWDOWN */}
      {activeViewMode === 'RIVALRY' ? (
        <RivalryShowdown
          currentUser={currentUserRef}
          members={members}
          standings={provisionalResult}
          games={games}
          liveScores={liveScores}
          picks={effectivePicks}
          selectedRivalId={selectedRivalId}
          onSelectRival={(id) => setSelectedRivalId(id)}
          onBackToLeague={() => setActiveViewMode('LEAGUE')}
        />
      ) : (
        /* VIEW MODE 2: LEAGUE PROJECTION */
        <>
          {/* Above-the-fold: Authenticated User Standing Snapshot */}
          {userStanding && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border-2 border-cyan-500/50 shadow-glow-cyan mb-4 font-mono">
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                  YOUR PROVISIONAL STANDING
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-200">
                    RANK #{userStanding.provisionalRank}
                  </span>
                  {renderTierBadge(userStanding.tier)}
                </div>
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
                  <span className="text-[9px] text-amber-400 font-bold">TOTAL</span>
                  <p className="text-base font-black text-amber-300">{userStanding.totalProvisionalPoints}</p>
                </div>
              </div>

              {/* Deterministic status text replacing fake percentage badges */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400 font-bold">Status:</span>
                <span className="text-amber-300 font-bold">
                  {userStanding.statusText || 'Gameday Active'}
                </span>
              </div>
            </div>
          )}

          {/* SWING GAME CARD (Prominent Top Section) */}
          <div className="mb-4 font-mono">
            {activeSwingGame ? (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-lg">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span>⚡ SWING GAME // GAMEDAY LEVERAGE</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/60 text-amber-300">
                    LEVERAGE {activeSwingGame.leverageScore.toFixed(1)}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">
                      {activeSwingGame.matchup}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {swingLiveMatch
                        ? `${swingLiveMatch.awayTeam.code} ${swingLiveMatch.awayTeam.score} @ ${swingLiveMatch.homeTeam.code} ${swingLiveMatch.homeTeam.score}`
                        : 'AWAITING KICKOFF'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span>
                      Status:{' '}
                      <strong className="text-slate-200">
                        {swingLiveMatch && swingLiveMatch.status !== 'SCHEDULED'
                          ? swingLiveMatch.status === 'FINAL'
                            ? 'FINAL'
                            : `Q${swingLiveMatch.period} ${swingLiveMatch.clock}`
                          : activeSwingGame.gameStatus}
                      </strong>
                    </span>
                    <span>
                      Your Pick:{' '}
                      <strong className="text-amber-300 font-black">
                        {activeSwingGame.userPick}
                      </strong>
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-amber-200/90 italic px-1">
                  {activeSwingGame.impactDescription}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
                  [ NO DECISIVE SWING GAME ]
                </div>
                <p className="text-xs text-slate-400">
                  All active matchups stabilized or slate complete.
                </p>
              </div>
            )}
          </div>

          {/* SUNDAY SWEAT PROVISIONAL STANDINGS */}
          <div className="space-y-2 font-mono">
            <div className="flex justify-between items-center px-1 mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                SUNDAY SWEAT PROVISIONAL STANDINGS
              </span>
              <button
                onClick={handleToggleSimulation}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950 font-bold transition"
              >
                {isSimulationActive ? 'RESET WHAT-IF' : 'TEST WHAT-IF'}
              </button>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
              <div className="col-span-2">RANK</div>
              <div className="col-span-4">MEMBER</div>
              <div className="col-span-2 text-center">BANK</div>
              <div className="col-span-2 text-center">LIVE</div>
              <div className="col-span-2 text-right">TOTAL</div>
            </div>

            {members.length <= 1 ? (
              <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl font-mono space-y-2">
                <span className="text-3xl block animate-pulse">⏳</span>
                <p className="text-sm font-bold text-slate-300">Waiting for league members to join...</p>
                <p className="text-xs text-slate-500">
                  Live provisional standings and rivalry duel projections activate once competitors are admitted.
                </p>
              </div>
            ) : (
              provisionalResult.map((p, idx) => {
              const isUser =
                (user?.email === 'jack.w.cone@gmail.com' && (p.userId === user?.id || p.userName.toLowerCase().includes('jack'))) ||
                p.userId === currentUserId ||
                p.userName.includes('(Commissioner)');
              const isPulsing = pulsingUserIds.has(p.userId);
              const isThePit = p.tier === 'PIT';

              return (
                <React.Fragment key={p.userId}>
                  <div
                    onClick={() => {
                      if (!isUser) {
                        setSelectedRivalId(p.userId);
                        setActiveViewMode('RIVALRY');
                      }
                    }}
                    className={`p-2.5 rounded-xl border grid grid-cols-12 items-center text-xs transition duration-300 cursor-pointer ${
                      isPulsing ? 'ring-1 ring-amber-400 bg-amber-500/10 motion-reduce:animate-none' : ''
                    } ${
                      isUser
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-glow-cyan'
                        : isThePit
                        ? 'bg-rose-950/30 border-rose-900/60 hover:border-rose-700'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Rank & Movement Delta */}
                    <div className="col-span-2 flex items-center gap-1">
                      <span
                        className={`font-black ${
                          p.provisionalRank === 1
                            ? 'text-emerald-400'
                            : isThePit
                            ? 'text-rose-500'
                            : 'text-slate-300'
                        }`}
                      >
                        #{p.provisionalRank}
                      </span>
                      {p.rankDelta > 0 ? (
                        <span className="text-emerald-400 font-bold text-[9px]">▲+{p.rankDelta}</span>
                      ) : p.rankDelta < 0 ? (
                        <span className="text-rose-400 font-bold text-[9px]">▼{p.rankDelta}</span>
                      ) : (
                        <span className="text-slate-600 font-semibold text-[9px]">—</span>
                      )}
                    </div>

                    {/* Member Name & Tier */}
                    <div className="col-span-4 flex flex-col justify-center">
                      <span className={`font-bold truncate text-[11px] ${isUser ? 'text-white' : 'text-slate-300'}`}>
                        {p.userName}
                      </span>
                      <div className="mt-0.5">{renderTierBadge(p.tier)}</div>
                    </div>

                    {/* Banked Points */}
                    <div className="col-span-2 text-center text-slate-400 font-medium text-[11px]">
                      {p.bankedPoints}
                    </div>

                    {/* Live Points */}
                    <div className="col-span-2 text-center text-cyan-400 font-bold text-[11px]">
                      +{p.livePoints}
                    </div>

                    {/* Provisional Total */}
                    <div className="col-span-2 text-right">
                      <span className="font-black text-white text-[12px]">
                        {p.totalProvisionalPoints}
                      </span>
                    </div>
                  </div>

                  {/* Visual Divider before The Pit */}
                  {idx === provisionalResult.length - 2 && (
                    <div className="my-1 border-t-2 border-dashed border-rose-500/40 relative text-center">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-[8px] font-black text-rose-400 uppercase tracking-widest">
                        ▼ THE DROP // THE PIT BOUNDARY ▼
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}

            <div className="pt-2 text-center">
              <p className="text-[9px] text-slate-500 font-mono">
                * Provisional live standings. Tap any rival row to launch head-to-head duel. Official settlement post-audit.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RadarPage;
