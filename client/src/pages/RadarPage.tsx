import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { scopedExpressFetch } from '../lib/apiClient';
import { getCurrentNFLWeek } from '../services/nflCalendarService';
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
import { WatchPartyBigBoardModal } from '../components/radar/WatchPartyBigBoardModal';
import { AppHeader } from '../components/common/AppHeader';
import {
  buildPersonalRootingQueue,
  evaluateLateGameEscape,
  RootingQueueItem,
  LateGameEscapeScenario
} from '../services/dependableInfoService';
import {
  createEmptyReceiptSession,
  observeProjectionSnapshot,
  SweatReceiptSessionState,
  ProjectionSnapshot,
} from '../services/sweatReceiptService';

export const RadarPage: React.FC = () => {
  const { user, token } = useAuth();
  const activeWeek = getCurrentNFLWeek();
  const [activeViewMode, setActiveViewMode] = useState<'LEAGUE' | 'RIVALRY'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'RIVALRY') return 'RIVALRY';
    }
    return 'LEAGUE';
  });
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRival = params.get('rival');
      if (urlRival) return urlRival;
      return localStorage.getItem('pickem_selected_rival_id');
    }
    return null;
  });

  const handleSelectRival = (id: string | null) => {
    setSelectedRivalId(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('pickem_selected_rival_id', id);
      else localStorage.removeItem('pickem_selected_rival_id');
    }
  };

  const [liveScores, setLiveScores] = useState<LiveGame[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isStale, setIsStale] = useState<boolean>(false);
  const liveScoresRef = useRef<LiveGame[]>([]);

  // Simulation what-if state
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [simulationFlippedPicks, setSimulationFlippedPicks] = useState<boolean>(false);

  // Session-bounded sweat receipts (live memory)
  const [receiptSession, setReceiptSession] = useState<SweatReceiptSessionState>(() => createEmptyReceiptSession());
  const [isBigBoardOpen, setIsBigBoardOpen] = useState<boolean>(false);

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
        const activeWeek = getCurrentNFLWeek();
        const data = await fetchLiveNFLScores(activeWeek);
        if (!isMounted) return;
        if (data && data.length > 0) {
          setLiveScores(data);
          liveScoresRef.current = data;
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setIsStale(false);
          setGames((prev) => {
            if (prev.length > 0) return prev;
            return data.map((ls) => ({
              id: ls.id,
              homeTeam: ls.homeTeam.code,
              awayTeam: ls.awayTeam.code,
              spread: 0,
              kickoffTime: new Date().toISOString(),
            }));
          });
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

  // Fetch pool data: active members, games, and live picks from Supabase
  useEffect(() => {
    let isMounted = true;
    const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    const activeWeek = getCurrentNFLWeek();

    const loadPoolData = async () => {
      try {
        // 1. Query all active members in the pool (Step 2)
        const { data: activeMembers } = await supabase
          .from('pool_memberships')
          .select('user_id, role, users(id, email, display_name)')
          .eq('pool_id', activePoolId)
          .eq('status', 'ACTIVE');

        if (!isMounted) return;

        if (activeMembers && activeMembers.length > 0) {
          const currentMembership: any = activeMembers.find((m: any) => m.user_id === user?.id);
          const currentU: any = Array.isArray(currentMembership?.users) ? currentMembership.users[0] : currentMembership?.users;
          const currentDisplayName = currentU?.display_name || (user?.email ? user.email.split('@')[0] : 'You');
          const currentMember: UserStandingRef = {
            id: user?.id || 'current',
            name: currentDisplayName,
          };

          const rivals = activeMembers.filter((m: any) => m.user_id !== user?.id);
          const mappedRivals: UserStandingRef[] = rivals.map((m: any) => {
            const u: any = Array.isArray(m.users) ? m.users[0] : m.users;
            const displayName = u?.display_name || (u?.email ? u.email.split('@')[0] : m.user_id);
            return {
              id: m.user_id,
              name: displayName,
            };
          });

          setMembers([currentMember, ...mappedRivals]);
          if (mappedRivals.length > 0) {
            const savedRival = typeof window !== 'undefined' ? localStorage.getItem('pickem_selected_rival_id') : null;
            const rivalToSelect = (savedRival && mappedRivals.some((r) => r.id === savedRival))
              ? savedRival
              : mappedRivals[0].id;
            handleSelectRival(rivalToSelect);
          }
        } else {
          setMembers([]);
        }

        // 2. Fetch picks from public.picks for the active week
        const { data: dbPicks } = await supabase
          .from('picks')
          .select('user_id, matchup_id, game_id, selected_team, week')
          .eq('pool_id', activePoolId)
          .eq('week', activeWeek);

        if (!isMounted) return;

        if (dbPicks && dbPicks.length > 0) {
          // Week 8 fix: same alias approach as Matrix. Picks may carry the
          // DB UUID or the ESPN external id, while Radar games may carry
          // either, depending on whether the backend matrix or ESPN
          // telemetry wins. An alias copy only matches a game list using
          // the other id system, so it never double counts a game.
          let aliasMap = new Map<string, string>();
          try {
            const { data: gameRows } = await supabase
              .from('games')
              .select('id, external_game_id')
              .eq('week', activeWeek);
            (gameRows || []).forEach((g: any) => {
              if (g.id && g.external_game_id) {
                aliasMap.set(String(g.id), String(g.external_game_id));
                aliasMap.set(String(g.external_game_id), String(g.id));
              }
            });
          } catch (_) {}
          const mappedPicks: UserPickItem[] = dbPicks.flatMap((p: any) => {
            const base: UserPickItem = {
              userId: p.user_id,
              gameId: String(p.game_id || p.matchup_id),
              selectedTeam: p.selected_team,
              isSubmitted: true,
              isHidden: false,
            };
            const alias = aliasMap.get(base.gameId);
            return alias && alias !== base.gameId ? [base, { ...base, gameId: alias }] : [base];
          });
          setPicks(mappedPicks);
        }

        // Fallback to pool matrix endpoint if available
        try {
          const res = await scopedExpressFetch(`/api/pools/${activePoolId}/matrix?week_no=${activeWeek}`);
          if (res.ok) {
            const matrix = await res.json();
            if (matrix.rows && matrix.rows.length > 0) {
              setGames(matrix.rows.map((row: any) => ({
                id: row.game_id,
                homeTeam: row.home_team_id,
                awayTeam: row.away_team_id,
                spread: row.spread,
                kickoffTime: row.kickoff_time,
              })));
            }
          }
        } catch (_) {}
      } catch (err) {
        console.warn('Radar pool data load error:', err);
      }
    };

    loadPoolData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, token]);

  // Effective picks respecting what-if simulation
  const effectivePicks = useMemo(() => {
    if (!simulationFlippedPicks || !user?.id) return picks;
    const firstUserPick = picks.find((p) => p.userId === user.id);
    if (!firstUserPick) return picks;
    return picks.map((p) => {
      if (p.userId === user.id && p.gameId === firstUserPick.gameId) {
        return { ...p, selectedTeam: p.selectedTeam };
      }
      return p;
    });
  }, [picks, simulationFlippedPicks, user?.id]);

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
  const currentUserId = user?.id || '';
  const currentUserRef: UserStandingRef = useMemo(() => {
    const found = members.find((m) => m.id === currentUserId);
    if (found) return found;
    return { id: currentUserId, name: user?.email ? user.email.split('@')[0] : 'You' };
  }, [members, currentUserId, user?.email]);

  const userStanding = useMemo(() => {
    return provisionalResult.find((s) => s.userId === currentUserId) || provisionalResult[0];
  }, [provisionalResult, currentUserId]);

  // Active swing game for the user
  const activeSwingGame = userStanding?.swingGame || provisionalResult.swingGame || null;

  // Find live matchup details for the swing game
  const swingLiveMatch = useMemo(() => {
    if (!activeSwingGame) return null;
    return liveScores.find((l) => l.id === activeSwingGame.gameId);
  }, [activeSwingGame, liveScores]);

  // Determine active rival for head-to-head calculations
  const activeRival = useMemo(() => {
    const available = members.filter((m) => m.id !== currentUserId);
    if (selectedRivalId) {
      const found = available.find((r) => r.id === selectedRivalId);
      if (found) return found;
    }
    if (userStanding && available.length > 0) {
      const uRank = userStanding.provisionalRank;
      const closest = provisionalResult.find(
        (s) => s.userId !== currentUserId && Math.abs(s.provisionalRank - uRank) === 1
      );
      if (closest) {
        const match = available.find((r) => r.id === closest.userId);
        if (match) return match;
      }
    }
    return available[0] || null;
  }, [members, currentUserId, selectedRivalId, userStanding, provisionalResult]);

  // Pass 3 & 4: Personal Rooting Queue with deterministic duel margin tracking
  const personalRootingQueue: RootingQueueItem[] = useMemo(() => {
    const activeRivalStanding = activeRival ? provisionalResult.find((s) => s.userId === activeRival.id) : null;
    const currentViewerGap = (userStanding && activeRivalStanding)
      ? userStanding.totalProvisionalPoints - activeRivalStanding.totalProvisionalPoints
      : 0;

    const queueGames = games.map((g) => {
      const vPick = effectivePicks.find((p) => p.gameId === g.id && p.userId === currentUserId)?.selectedTeam || '';
      const rPick = activeRival
        ? effectivePicks.find((p) => p.gameId === g.id && p.userId === activeRival.id)?.selectedTeam
        : null;
      const liveG = liveScores.find((ls) => ls.id === g.id);
      const status = liveG?.status || (g as any).status || 'SCHEDULED';
      return {
        gameId: g.id,
        awayTeam: g.awayTeam,
        homeTeam: g.homeTeam,
        viewerPick: vPick,
        rivalPick: rPick,
        status,
        changesTier: Boolean(userStanding && userStanding.tier !== 'SAFE_HAVEN'),
      };
    });
    return buildPersonalRootingQueue(queueGames, {
      maxItems: 3,
      rivalDisplayName: activeRival?.name || 'your rival',
      currentViewerGap,
    });
  }, [games, effectivePicks, currentUserId, activeRival, liveScores, userStanding, provisionalResult]);

  // Pass 3 & 4: Bounded Late-Game Escape Scenario with simulation exclusion & member count gating
  const escapeScenario: LateGameEscapeScenario | null = useMemo(() => {
    if (!userStanding) return null;
    const leader = provisionalResult[0];
    const targetSafePoints = leader ? leader.totalProvisionalPoints : userStanding.totalProvisionalPoints;

    const disagreementGames = games
      .filter((g) => {
        const vPick = effectivePicks.find((p) => p.gameId === g.id && p.userId === currentUserId)?.selectedTeam;
        const rPick = activeRival
          ? effectivePicks.find((p) => p.gameId === g.id && p.userId === activeRival.id)?.selectedTeam
          : null;
        const liveG = liveScores.find((ls) => ls.id === g.id);
        const st = (liveG?.status || (g as any).status || 'SCHEDULED').toUpperCase();
        const isSettled = st === 'FINAL' || st === 'F' || st === 'COMPLETED' || st === 'SETTLED';
        if (isSettled || !vPick) return false;
        return Boolean(rPick && rPick !== vPick);
      })
      .map((g) => {
        const vPick = effectivePicks.find((p) => p.gameId === g.id && p.userId === currentUserId)?.selectedTeam || '';
        return {
          gameId: g.id,
          awayTeam: g.awayTeam,
          homeTeam: g.homeTeam,
          viewerPick: vPick,
        };
      });

    return evaluateLateGameEscape({
      viewerPoints: userStanding.totalProvisionalPoints,
      targetSafePoints,
      remainingDisagreementGames: disagreementGames,
      holdsTiebreakerEdge: null,
      activeMemberCount: members.length,
      isSimulation: isSimulationActive,
    });
  }, [userStanding, provisionalResult, games, effectivePicks, currentUserId, activeRival, liveScores, members.length, isSimulationActive]);

  // Session Sweat Receipts: observe projection transitions
  useEffect(() => {
    if (!userStanding || !activeRival || isSimulationActive) return;
    const activeRivalStanding = provisionalResult.find((s) => s.userId === activeRival.id);
    if (!activeRivalStanding) return;

    const snapshot: ProjectionSnapshot = {
      poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
      week: activeWeek,
      viewerId: userStanding.userId,
      viewerName: currentUserRef.name || 'You',
      rivalId: activeRival.id,
      rivalName: activeRival.name,
      viewerPoints: userStanding.totalProvisionalPoints,
      rivalPoints: activeRivalStanding.totalProvisionalPoints,
      viewerProjectedTier: userStanding.tier,
      isSimulation: isSimulationActive,
      isStale,
      observedAtIso: new Date().toISOString(),
    };

    setReceiptSession((prev) => observeProjectionSnapshot(prev, snapshot));
  }, [
    userStanding?.totalProvisionalPoints,
    userStanding?.tier,
    activeRival?.id,
    provisionalResult,
    isSimulationActive,
    isStale,
    activeWeek,
    currentUserRef.name,
  ]);

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

  const formatShotUnit = (shots: number) => (shots === 1 ? '1 shot' : `${shots} shots`);

  // Charter Penalty Tier Alignment:
  // Rank 1: SAFE HAVEN (0 shots)
  // Ranks 2–6: DANGER ZONE (1 shot)
  // Ranks 7–9: THE DROP (2 shots)
  // Rank 10: THE PIT (2.5 shots)
  const renderTierBadge = (tier: ProvisionalStanding['tier']) => {
    switch (tier) {
      case 'SAFE_HAVEN':
        return <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-950 border border-emerald-500/60 text-emerald-300">SAFE HAVEN (0 shots)</span>;
      case 'DANGER_ZONE':
        return <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-950 border border-amber-500/60 text-amber-300">DANGER ZONE ({formatShotUnit(1)})</span>;
      case 'THE_DROP':
        return <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-950 border border-orange-500/60 text-orange-300">THE DROP ({formatShotUnit(2)})</span>;
      case 'PIT':
        return <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-950 border border-rose-500 text-rose-300">THE PIT ({formatShotUnit(2.5)})</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Unified Top Branding Banner */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope={`WEEK ${activeWeek}`}
        phase={
          liveScores.length > 0 && liveScores.every((g) => (g.status || '').toUpperCase() === 'FINAL')
            ? 'SETTLED'
            : liveScores.some((g) => ['IN_PROGRESS', 'LIVE', 'HALFTIME'].includes((g.status || '').toUpperCase()))
            ? 'GAMES LIVE'
            : 'PRE-KICKOFF'
        }
        rightContent={
          isSimulationActive ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950 border border-amber-500/80 text-amber-300 font-bold text-[10px] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>SIMULATED</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 font-bold text-[10px]">
              <span>PROJECTION</span>
            </div>
          )
        }
      />

      <div className="p-4 max-w-md mx-auto font-sans">
        {/* 1. Sticky Simulation Warning Banner */}
        {isSimulationActive && (
          <div className="sticky top-14 z-30 -mx-4 px-4 py-2 bg-amber-950/95 border-b border-amber-400 font-mono text-xs flex items-center justify-between shadow-lg mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-black text-amber-200 uppercase tracking-wider text-[11px] leading-tight">
                🧪 SANDBOX SIMULATION MODE — Hypothetical projections only. Excluded from Sweat Receipts and official League History.
              </span>
            </div>
            <button
              onClick={handleResetSimulation}
              className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-black text-[10px] hover:bg-amber-400 shrink-0 ml-2"
            >
              EXIT SANDBOX
            </button>
          </div>
        )}

        {/* 2. Header: Sunday Radar Telemetry Header */}
        <header className="mb-3 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
          <div>
            <h1 className="text-xl font-black text-cyan-400 tracking-tight">
              SUNDAY RADAR
            </h1>
            <p className="text-xs text-slate-400">Sunday Sweat Projections &amp; Showdowns</p>
          </div>
          {lastUpdated && !isSimulationActive && (
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono">{lastUpdated}</span>
            </div>
          )}
        </header>

        {/* Watch Party Big Board Action Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsBigBoardOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/70 border border-cyan-500/50 hover:border-cyan-400 active:scale-95 text-cyan-300 font-mono font-black text-xs uppercase tracking-wider flex items-center justify-between transition shadow-lg shadow-cyan-950/40"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">📺</span>
              <span>OPEN WATCH PARTY BIG BOARD</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/40">
              ARENA VIEW →
            </span>
          </button>
        </div>

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
          onSelectRival={(id) => handleSelectRival(id)}
          onBackToLeague={() => setActiveViewMode('LEAGUE')}
          selectedWeek={activeWeek}
          receipts={receiptSession.receipts}
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
                  {(userStanding.bankedPoints === 0 && userStanding.livePoints === 0)
                    ? (userStanding.statusText === 'Holding Safe Haven on tiebreaker'
                        ? 'Joint #1 on points · Tiebreak pending'
                        : userStanding.statusText || 'Joint #1 on points · Tiebreak pending')
                    : (userStanding.statusText || 'Gameday Active')}
                </span>
              </div>
            </div>
          )}

          {/* Pass 3: PERSONAL ROOTING QUEUE CARD */}
          {personalRootingQueue.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30 border border-emerald-500/40 shadow-lg mb-4 font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <span>🎯 PERSONAL ROOTING QUEUE // WHO YOU NEED NOW</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-black">
                  TOP {personalRootingQueue.length}
                </span>
              </div>
              <div className="space-y-2">
                {personalRootingQueue.map((item, qIdx) => (
                  <div key={item.gameId} className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-black text-white">
                        {qIdx + 1}. Root for <span className="text-emerald-400">{item.rootForTeam}</span> ({item.matchupLabel})
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase ${
                        item.reasonBadge === 'TIER ESCAPE'
                          ? 'bg-purple-950 border-purple-500 text-purple-300'
                          : item.reasonBadge === 'DUEL SWING'
                          ? 'bg-amber-950 border-amber-500 text-amber-300'
                          : 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      }`}>
                        {item.reasonBadge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {item.consequenceText}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pass 3: BOUNDED LATE-GAME ESCAPE / CLINCH BANNER */}
          {escapeScenario && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-md mb-4 font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <span>🛟 ESCAPE / CLINCH SCENARIO</span>
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase ${
                  escapeScenario.canMathematicallyEscape
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950 border-rose-500 text-rose-300'
                }`}>
                  {escapeScenario.headline}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {escapeScenario.requirementSummary}
              </p>
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
                      {(() => {
                        const isLiveOrFinal = Boolean(
                          swingLiveMatch && ['IN_PROGRESS', 'LIVE', 'HALFTIME', 'FINAL'].includes((swingLiveMatch.status || '').toUpperCase())
                        );
                        if (swingLiveMatch && isLiveOrFinal) {
                          return `${swingLiveMatch.awayTeam.code} ${swingLiveMatch.awayTeam.score} @ ${swingLiveMatch.homeTeam.code} ${swingLiveMatch.homeTeam.score}`;
                        }
                        if (swingLiveMatch) {
                          return `${swingLiveMatch.awayTeam.code} @ ${swingLiveMatch.homeTeam.code}`;
                        }
                        return activeSwingGame.matchup || 'AWAITING KICKOFF';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span>
                      Status:{' '}
                      <strong className="text-slate-200">
                        {(() => {
                          const isLiveOrFinal = Boolean(
                            swingLiveMatch && ['IN_PROGRESS', 'LIVE', 'HALFTIME', 'FINAL'].includes((swingLiveMatch.status || '').toUpperCase())
                          );
                          if (swingLiveMatch && isLiveOrFinal) {
                            return (swingLiveMatch.status as string) === 'FINAL'
                              ? 'FINAL'
                              : (swingLiveMatch.status as string) === 'HALFTIME'
                              ? 'HALFTIME'
                              : `${(swingLiveMatch.period && swingLiveMatch.period >= 5) ? 'OT' : (swingLiveMatch.period ? `Q${swingLiveMatch.period}` : 'LIVE')} ${swingLiveMatch.clock || ''}`.trim();
                          }
                          return activeSwingGame.gameStatus || 'PRE-KICKOFF';
                        })()}
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
                {isSimulationActive ? 'EXIT SANDBOX' : 'SANDBOX SIMULATOR'}
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
              const isUser = p.userId === currentUserId || (Boolean(user?.id) && p.userId === user?.id);
              const isPulsing = pulsingUserIds.has(p.userId);
              const isThePit = p.tier === 'PIT';

              return (
                <React.Fragment key={p.userId}>
                  {/* Visual Divider before The Drop / The Pit */}
                  {(() => {
                    const prevMember = idx > 0 ? provisionalResult[idx - 1] : null;
                    const isTiedWithPrev = prevMember && (
                      p.provisionalRank === prevMember.provisionalRank ||
                      p.totalProvisionalPoints === prevMember.totalProvisionalPoints ||
                      p.tier === prevMember.tier
                    );
                    const showDropBoundary = Boolean(
                      prevMember &&
                      !isTiedWithPrev &&
                      (p.tier !== prevMember.tier || (p.projectedPenalty ?? 0) > (prevMember.projectedPenalty ?? 0)) &&
                      (p.tier === 'THE_DROP' || p.tier === 'PIT' || (p.projectedPenalty ?? 0) >= 2)
                    );
                    return showDropBoundary ? (
                      <div className="my-1 border-t-2 border-dashed border-rose-500/40 relative text-center">
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-[8px] font-black text-rose-400 uppercase tracking-widest">
                          ▼ THE DROP // THE PIT BOUNDARY ▼
                        </span>
                      </div>
                    ) : null;
                  })()}

                  <div
                    onClick={() => {
                      if (!isUser) {
                        handleSelectRival(p.userId);
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

      {/* Watch Party Big Board Modal */}
      <WatchPartyBigBoardModal
        isOpen={isBigBoardOpen}
        onClose={() => setIsBigBoardOpen(false)}
        activeWeek={activeWeek}
        poolTitle="MAIN LEAGUE"
        phaseLabel={
          liveScores.some((g) => ['FINAL', 'F', 'COMPLETED'].includes((g.status || '').toUpperCase()))
            ? 'SETTLED · PROVISIONAL'
            : liveScores.some((g) => ['IN_PROGRESS', 'LIVE', 'HALFTIME'].includes((g.status || '').toUpperCase()))
            ? 'GAMES LIVE · PROVISIONAL'
            : 'PRE-KICKOFF · PROVISIONAL'
        }
        isSimulation={isSimulationActive}
        members={members}
        standings={provisionalResult}
        games={games}
        liveScores={liveScores}
        picks={effectivePicks}
        personalRootingQueue={personalRootingQueue}
        currentUser={currentUserRef}
        rivalUser={activeRival}
      />
    </div>
  );
};

export default RadarPage;
