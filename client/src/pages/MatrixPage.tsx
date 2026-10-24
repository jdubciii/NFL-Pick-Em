import React, { useState, useMemo, useEffect } from 'react';
import { RivalCrosshairsDuel } from '../components/matrix/RivalCrosshairsDuel';
import { LoneWolfBadge } from '../components/matrix/LoneWolfBadge';
import { StackedAvatarCluster, CampParticipant } from '../components/matrix/StackedAvatarCluster';
import { TugOfWarDrawer } from '../components/matrix/TugOfWarDrawer';
import { LiveGametrackStream, LiveGameflowCardData } from '../components/matrix/LiveGametrackStream';
import { EmptyStateWireframe } from '../components/common/EmptyStateWireframe';
import { AppHeader } from '../components/common/AppHeader';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { scopedExpressFetch } from '../lib/apiClient';
import {
  computeSlateTopology,
  computeDuelComparison,
  RawGameDefinition,
  UserSubmittedPick
} from '../services/pregameTopologyService';
import {
  deriveAutopilotProvenance,
  RawGameLine
} from '../services/autopilotTopologyService';
import { isKickoffLocked, evaluateSlateLockSummary, evaluateCanonicalGameLock } from '../services/lockEnforcementService';
import { evaluatePickVisibility } from '../services/openSlatePolicyService';
import { getCurrentNFLWeek } from '../services/nflCalendarService';
import { fetchLiveNFLScores, LiveGame } from '../services/liveScoreService';
import { resolveAuthoritativeSlate } from '../services/authoritativeSlateClientService';
import { classifyPickDistributionBadge } from '../services/dependableInfoService';
import {
  executeExplicitReactionOperation,
  applyIdempotentReactionMutation,
  summarizeReactionsForTarget,
  validateCanonicalReactionTarget,
  ReactionEntry,
  ReactionCode,
  CanonicalReactionTarget,
} from '../services/poolSocialService';

export const MatrixPage: React.FC = () => {
  const { user } = useAuth();
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const currentUserId = user?.id || 'u1';
  const currentUserName = user?.email ? user.email.split('@')[0] : 'You';

  const [selectedWeek, setSelectedWeek] = useState<number>(() => getCurrentNFLWeek());
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [poolMembers, setPoolMembers] = useState<{ userId: string; userName: string; isAutopilot: boolean }[]>([]);
  const [poolPicks, setPoolPicks] = useState<UserSubmittedPick[]>([]);
  const [slateGames, setSlateGames] = useState<any[]>([]);
  const [gameReactions, setGameReactions] = useState<ReactionEntry[]>([]);

  const handleToggleGameReaction = (gameId: string, code: ReactionCode) => {
    const target: CanonicalReactionTarget = {
      poolId: activePoolId,
      season: 2026,
      week: selectedWeek,
      targetKind: 'CANONICAL_GAME',
      entityId: gameId,
    };
    const val = validateCanonicalReactionTarget(target);
    const chips = val.canonicalKey
      ? summarizeReactionsForTarget(gameReactions, val.canonicalKey, user?.id || 'u1')
      : [];
    const currentChip = chips.find((c) => c.code === code);
    const operation = currentChip?.viewerSelected ? 'REMOVE' : 'SET';

    const result = executeExplicitReactionOperation({
      existingEntries: gameReactions,
      target,
      operation,
      reactionCode: code,
      authenticatedActorId: user?.id || 'u1',
      authenticatedActorName: user?.email ? user.email.split('@')[0] : 'jack.w.cone',
      authorizedPoolId: activePoolId,
    });
    if (result.ok) {
      setGameReactions(result.entries);
    }

    try {
      scopedExpressFetch(`/api/pools/${activePoolId}/reactions`, {
        method: operation === 'REMOVE' ? 'DELETE' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetKind: 'CANONICAL_GAME',
          targetEntityId: gameId,
          season: 2026,
          week: selectedWeek,
          settlementRevision: 0,
          reactionCode: code,
          operation,
        }),
      }).catch(() => {});
    } catch {}
  };

  const [clockNow, setClockNow] = useState<number>(Date.now());
  const [renderedWeek, setRenderedWeek] = useState<number>(selectedWeek);
  const [settingsRetryGen, setSettingsRetryGen] = useState<number>(0);
  const [slateRetryGen, setSlateRetryGen] = useState<number>(0);

  const [settingsState, setSettingsState] = useState<{
    poolId: string;
    status: 'LOADING' | 'READY' | 'ERROR';
    offset: number;
    errorMessage?: string;
  }>({
    poolId: activePoolId,
    status: 'LOADING',
    offset: 0,
  });

  const [slateLoadError, setSlateLoadError] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch pool settings for offset (owned state keyed to activePoolId)
  useEffect(() => {
    let isMounted = true;
    setSettingsState({
      poolId: activePoolId,
      status: 'LOADING',
      offset: 0,
    });

    async function loadPoolSettings() {
      try {
        const { data, error } = await supabase
          .from('pools')
          .select('id, settings')
          .eq('id', activePoolId)
          .maybeSingle();

        if (!isMounted) return;
        if (error || !data || !data.settings || typeof data.settings !== 'object') {
          setSettingsState({
            poolId: activePoolId,
            status: 'ERROR',
            offset: 0,
            errorMessage: 'Failed to retrieve pool settings.',
          });
          return;
        }
        const settings = (data.settings as any) || {};
        const rawOff = settings.lock_offset ?? settings.lockOffset ?? 0;
        const off = Number(rawOff);
        if (Number.isFinite(off) && off >= 0) {
          setSettingsState({
            poolId: activePoolId,
            status: 'READY',
            offset: off,
          });
        } else {
          setSettingsState({
            poolId: activePoolId,
            status: 'ERROR',
            offset: 0,
            errorMessage: 'Invalid pool lock offset configuration.',
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setSettingsState({
            poolId: activePoolId,
            status: 'ERROR',
            offset: 0,
            errorMessage: err?.message || 'Failed to retrieve pool settings.',
          });
        }
      }
    }
    loadPoolSettings();
    return () => {
      isMounted = false;
    };
  }, [activePoolId, settingsRetryGen]);

  // Load live scores, authoritative slate, and submitted picks
  useEffect(() => {
    let isMounted = true;
    setLoadingGames(true);
    setSlateLoadError(false);
    setLiveGames([]);
    setSlateGames([]);
    setPoolPicks([]);

    const loadData = async () => {
      try {
        const liveData = await fetchLiveNFLScores(selectedWeek).catch(() => [] as LiveGame[]);
        if (!isMounted) return;
        setLiveGames(liveData);

        // Query active members
        const { data: membersData, error: membersErr } = await supabase
          .from('pool_memberships')
          .select('user_id, role, users(id, email, display_name)')
          .eq('pool_id', activePoolId)
          .eq('status', 'ACTIVE');

        if (!isMounted) return;
        if (membersErr) {
          setSlateLoadError(true);
          return;
        }

        let membersList: { userId: string; userName: string; isAutopilot: boolean }[] = [];
        if (membersData && membersData.length > 0) {
          membersList = membersData.map((m: any) => {
            const u = m.users;
            const isCurrent = m.user_id === user?.id;
            const displayName = u?.display_name || (u?.email ? u.email.split('@')[0] : m.user_id.slice(0, 8));
            return {
              userId: m.user_id,
              userName: isCurrent ? `${displayName} (You)` : displayName,
              isAutopilot: false,
            };
          });
          setPoolMembers(membersList);
        } else {
          setPoolMembers([{ userId: currentUserId, userName: `${currentUserName} (You)`, isAutopilot: false }]);
        }

        // Authoritative slate resolution (no raw unverified fallback)
        const resolution = await resolveAuthoritativeSlate({
          supabase,
          activePoolId,
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: selectedWeek,
          liveScores: liveData,
        });

        if (!isMounted) return;

        if (resolution.source === 'FAILED_CLOSED') {
          setSlateGames([]);
          setPoolPicks([]);
          setSlateLoadError(true);
          return;
        }

        if (resolution.games.length > 0) {
          setSlateGames(resolution.games);

          // Query submitted picks for accepted games
          const acceptedGameIds = Array.from(
            new Set(
              resolution.games
                .flatMap((g: any) => [String(g.id), g.externalGameId ? String(g.externalGameId) : null])
                .filter(Boolean)
            )
          );

          const { data: dbPicks, error: picksErr } = await supabase
            .from('picks')
            .select('user_id, game_id, selected_team')
            .eq('pool_id', activePoolId)
            .in('game_id', acceptedGameIds);

          if (!isMounted) return;

          if (picksErr) {
            setSlateLoadError(true);
            return;
          }

          if (dbPicks && dbPicks.length > 0) {
            const memberNameMap = new Map<string, string>();
            membersList.forEach((m) => memberNameMap.set(m.userId, m.userName));

            const mappedPicks: UserSubmittedPick[] = dbPicks.map((p: any) => ({
              userId: p.user_id,
              userName: memberNameMap.get(p.user_id) || (p.user_id === user?.id ? currentUserName : p.user_id.slice(0, 8)),
              gameId: String(p.game_id),
              selectedTeam: p.selected_team,
              isAutopilot: false,
            }));
            setPoolPicks(mappedPicks);
          } else {
            setPoolPicks([]);
          }
        } else {
          setSlateGames([]);
          setPoolPicks([]);
        }
      } catch (err) {
        console.error('Failed to query matrix data:', err);
        if (isMounted) setSlateLoadError(true);
      } finally {
        if (isMounted) {
          setRenderedWeek(selectedWeek);
          setLoadingGames(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedWeek, activePoolId, user?.id, currentUserId, currentUserName, slateRetryGen]);

  const isSettingsLoading = settingsState.status === 'LOADING' || settingsState.poolId !== activePoolId;
  const isSettingsError = settingsState.status === 'ERROR' && settingsState.poolId === activePoolId;
  const isSettingsReady = settingsState.status === 'READY' && settingsState.poolId === activePoolId;

  const isSyncing = loadingGames || renderedWeek !== selectedWeek || isSettingsLoading;
  const hasLoadError = isSettingsError || slateLoadError;

  const poolOffset = isSettingsReady ? settingsState.offset : 0;

  const currentNFLWeek = getCurrentNFLWeek();
  const isPastWeek = selectedWeek < currentNFLWeek;
  const isCurrentOrFutureWeek = selectedWeek >= currentNFLWeek;

  const slateSummary = useMemo(() => {
    return evaluateSlateLockSummary(slateGames, liveGames, poolOffset, clockNow);
  }, [slateGames, liveGames, poolOffset, clockNow]);

  const allGamesFinal = slateSummary.allGamesFinal;
  const matrixPhase = slateSummary.phaseLabel;
  const allGamesUpcoming = slateSummary.openCount > 0 && !slateSummary.anyStartedOrFinal;

  const shouldShowLeverage = hasLoadError || poolPicks.length === 0 || allGamesUpcoming;

  const handleRetry = () => {
    setSettingsRetryGen((g) => g + 1);
    setSlateRetryGen((g) => g + 1);
  };

  const [activeTab, setActiveTab] = useState<'LEVERAGE' | 'GAMETRACK'>(
    shouldShowLeverage ? 'LEVERAGE' : 'GAMETRACK'
  );

  useEffect(() => {
    if (shouldShowLeverage) {
      setActiveTab('LEVERAGE');
    } else {
      setActiveTab('GAMETRACK');
    }
  }, [shouldShowLeverage, selectedWeek]);

  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);

  const handleSelectRival = (rivalId: string | null) => {
    setSelectedRivalId(rivalId);
    try {
      if (rivalId) {
        localStorage.setItem('pickem_selected_rival_id', rivalId);
      } else {
        localStorage.removeItem('pickem_selected_rival_id');
      }
    } catch (_) {}
  };

  const [expandedTugGameId, setExpandedTugGameId] = useState<string | null>(null);
  const [showTopologyToast, setShowTopologyToast] = useState<boolean>(true);
  const [matrixFilter, setMatrixFilter] = useState<'ALL' | 'SPLIT' | 'MY_PICKS' | 'CONSENSUS'>('ALL');

  const rawGames: RawGameDefinition[] = useMemo(() => {
    return liveGames.map((g) => ({
      gameId: g.id,
      homeTeam: g.homeTeam.code,
      awayTeam: g.awayTeam.code,
      spread: 0,
    }));
  }, [liveGames]);

  const topology = useMemo(() => {
    return computeSlateTopology(
      activePoolId,
      selectedWeek,
      poolPicks,
      rawGames,
      poolPicks.length > 0 ? 1 : 3
    );
  }, [activePoolId, selectedWeek, poolPicks, rawGames]);

  const filteredGames = useMemo(() => {
    return rawGames.filter((game) => {
      const gameDist = topology.games.find((g) => g.gameId === game.gameId);
      const isConsensus = Boolean(gameDist?.isConsensus);
      if (matrixFilter === 'SPLIT') return !isConsensus;
      if (matrixFilter === 'CONSENSUS') return isConsensus;
      if (matrixFilter === 'MY_PICKS') {
        return poolPicks.some((p) => p.gameId === game.gameId && p.userId === currentUserId);
      }
      return true;
    });
  }, [rawGames, topology, matrixFilter, poolPicks, currentUserId]);

  const autopilotUsers = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const u of poolMembers) {
      const provenance = deriveAutopilotProvenance(u.userId, poolPicks, rawGames as RawGameLine[]);
      map.set(u.userId, provenance.isAutopilot);
    }
    return map;
  }, [poolMembers, poolPicks, rawGames]);

  const duelComparison = useMemo(() => {
    if (!selectedRivalId) return null;
    const rival = poolMembers.find((u) => u.userId === selectedRivalId);
    if (!rival) return null;
    const me = poolMembers.find((u) => u.userId === currentUserId) || {
      userId: currentUserId,
      userName: currentUserName,
    };
    return computeDuelComparison(
      currentUserId,
      me.userName,
      rival.userId,
      rival.userName,
      poolPicks,
      rawGames
    );
  }, [selectedRivalId, poolMembers, currentUserId, currentUserName, poolPicks, rawGames]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Unified Top Branding Banner with Consolidated Status Pills */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope={isSyncing ? 'SYNCING...' : `WEEK ${selectedWeek}`}
        phase={isSyncing ? 'SYNCING' : hasLoadError ? 'STATUS_UNAVAILABLE' : matrixPhase}
        rightContent={
          isSyncing ? (
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-700 bg-zinc-800 text-zinc-400">
                SYNCING
              </div>
            </div>
          ) : hasLoadError ? (
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-800 bg-zinc-900 text-zinc-500">
                UNAVAILABLE
              </div>
            </div>
          ) : slateSummary.total === 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-800 bg-zinc-900 text-zinc-500">
                UNAVAILABLE
              </div>
            </div>
          ) : slateSummary.allGamesFinal ? (
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-700 bg-zinc-800 text-zinc-400">
                WEEK {selectedWeek} FINAL
              </div>
            </div>
          ) : slateSummary.isBadgeOpen ? (
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-500/30 bg-cyan-500/15 text-cyan-400">
                {slateSummary.lockBadgeText}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-700 bg-zinc-800 text-zinc-400">
                {slateSummary.lockBadgeText}
              </div>
            </div>
          )
        }
      />

      <div className="p-4 max-w-md mx-auto font-sans">

      {/* Header & Persistent Tab Switcher (Leverage vs Gametrack) */}
      <header className="my-3 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider text-cyan-400">
              THE MATRIX
            </h1>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <select
                aria-label="Select Matrix Week"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent text-cyan-300 font-bold text-xs py-0.5 px-2 rounded focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="bg-zinc-900 text-zinc-200">
                    Week {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {activeTab === 'LEVERAGE' ? 'Pre-Lock Leverage Board' : 'Live Drive Progression'}
          </p>
        </div>

        {/* Segmented Controller: Preserving Gametrack */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => {
              setSelectedRivalId(null);
              setActiveTab('LEVERAGE');
            }}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'LEVERAGE'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚔️ LEVERAGE
          </button>
          <button
            onClick={() => setActiveTab('GAMETRACK')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'GAMETRACK'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏈 GAMETRACK
          </button>
        </div>
      </header>

      {/* Floating Topology Update Toast */}
      {showTopologyToast && activeTab === 'LEVERAGE' && (
        <div className="mb-3 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400 shadow-md text-center font-mono text-[10px] text-cyan-300 font-bold flex items-center justify-between animate-fade-in">
          <span>{allGamesUpcoming ? '📡 Real-time sync ready · Awaiting kickoff' : '📡 Live score updates connected'}</span>
          <button
            onClick={() => setShowTopologyToast(false)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: LIVE GAMETRACK & DRIVE FLOW */}
      {activeTab === 'GAMETRACK' && (
        isSyncing ? (
          <EmptyStateWireframe
            header="[ SYNCING SLATE ]"
            subtitle={`[ LOADING WEEK ${selectedWeek} ]`}
            contextDetail="Fetching authoritative slate games and league picks..."
          />
        ) : hasLoadError ? (
          <div className="space-y-4">
            <EmptyStateWireframe
              header="[ DATA UNAVAILABLE ]"
              subtitle="[ LEAGUE DATA COULD NOT BE VERIFIED ]"
              contextDetail="Failed to verify pool settings, memberships, or slate picks for this week. Please retry."
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs font-mono font-bold text-cyan-400 rounded-lg transition-colors cursor-pointer"
              >
                [ RETRY TELEMETRY INTAKE ]
              </button>
            </div>
          </div>
        ) : (
          <LiveGametrackStream weekNumber={selectedWeek} />
        )
      )}

      {/* TAB 2: PRE-LOCK LEVERAGE BOARD */}
      {activeTab === 'LEVERAGE' && (
        isSyncing ? (
          <EmptyStateWireframe
            header="[ SYNCING SLATE ]"
            subtitle={`[ LOADING WEEK ${selectedWeek} ]`}
            contextDetail="Fetching authoritative slate games and league picks..."
          />
        ) : hasLoadError ? (
          <div className="space-y-4">
            <EmptyStateWireframe
              header="[ DATA UNAVAILABLE ]"
              subtitle="[ LEAGUE DATA COULD NOT BE VERIFIED ]"
              contextDetail="Failed to verify pool settings, memberships, or slate picks for this week. Please retry."
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs font-mono font-bold text-cyan-400 rounded-lg transition-colors cursor-pointer"
              >
                [ RETRY TELEMETRY INTAKE ]
              </button>
            </div>
          </div>
        ) : poolPicks.length === 0 ? (
          <EmptyStateWireframe
            header="[ AWAITING LEAGUE ACTION ]"
            subtitle="[ NO PICKS SUBMITTED ]"
            contextDetail="No pool picks have been submitted for this week yet. Leverage board unlocks once picks are registered."
          />
        ) : (
        <>
          {duelComparison ? (
            <RivalCrosshairsDuel
              duel={duelComparison}
              onCloseDuel={() => handleSelectRival(null)}
            />
          ) : (
            <div className="space-y-4">
              {/* Member Selector Bar (Autopilot machine scanlines attribution) */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  SELECT RIVAL TO ENGAGE 1-ON-1 DUEL MODE
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {poolMembers.filter((u) => u.userId !== currentUserId).map((user) => {
                    const isMachine = autopilotUsers.get(user.userId);

                    return (
                      <button
                        key={user.userId}
                        onClick={() => handleSelectRival(user.userId)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs transition relative overflow-hidden ${
                          isMachine
                            ? 'border-cyan-400 text-cyan-200 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.1)_50%,transparent_75%)] shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-cyan-400'
                        }`}
                      >
                        <span>{isMachine ? '🤖' : '👤'}</span>
                        <span className="font-bold">{user.userName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Matrix Filter Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setMatrixFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    matrixFilter === 'ALL'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({rawGames.length})
                </button>
                <button
                  onClick={() => setMatrixFilter('SPLIT')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    matrixFilter === 'SPLIT'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Split Picks
                </button>
                <button
                  onClick={() => setMatrixFilter('MY_PICKS')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    matrixFilter === 'MY_PICKS'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  My Picks
                </button>
                <button
                  onClick={() => setMatrixFilter('CONSENSUS')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    matrixFilter === 'CONSENSUS'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Consensus
                </button>
              </div>

              {/* Matchup Distribution & Avatar Clusters */}
              <div className="space-y-2.5 font-mono">
                {filteredGames.map((game) => {
                  const gameDist = topology.games.find((g) => g.gameId === game.gameId);
                  const isConsensus = gameDist?.isConsensus;

                  const awayCamp: CampParticipant[] = poolPicks
                    .filter((p) => p.gameId === game.gameId && p.selectedTeam === game.awayTeam)
                    .map((p) => ({
                      userId: p.userId,
                      userName: p.userName,
                      team: p.selectedTeam,
                      isAutopilot: autopilotUsers.get(p.userId)
                    }));

                  const homeCamp: CampParticipant[] = poolPicks
                    .filter((p) => p.gameId === game.gameId && p.selectedTeam === game.homeTeam)
                    .map((p) => ({
                      userId: p.userId,
                      userName: p.userName,
                      team: p.selectedTeam,
                      isAutopilot: autopilotUsers.get(p.userId)
                    }));

                  const totalPickers = awayCamp.length + homeCamp.length;
                  let distBadge: { text: string; className: string } | null = null;
                  if (totalPickers > 0) {
                    if (awayCamp.length === totalPickers || homeCamp.length === totalPickers) {
                      distBadge = {
                        text: `🤝 ${totalPickers} OF ${totalPickers} CONSENSUS`,
                        className: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
                      };
                    } else if (totalPickers === 2 && awayCamp.length === 1 && homeCamp.length === 1) {
                      classifyPickDistributionBadge(1, 2, game.awayTeam);
                      distBadge = {
                        text: `⚡ SPLIT DECISION (1 OF 2)`,
                        className: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
                      };
                    } else if (totalPickers >= 3 && awayCamp.length === 1) {
                      classifyPickDistributionBadge(1, totalPickers, game.awayTeam);
                      distBadge = {
                        text: `🐺 LONE WOLF (1 OF ${totalPickers}) [${game.awayTeam}]`,
                        className: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
                      };
                    } else if (totalPickers >= 3 && homeCamp.length === 1) {
                      classifyPickDistributionBadge(1, totalPickers, game.homeTeam);
                      distBadge = {
                        text: `🐺 LONE WOLF (1 OF ${totalPickers}) [${game.homeTeam}]`,
                        className: 'bg-purple-950/80 text-purple-700 border-purple-700/60',
                      };
                    }
                  }

                  return (
                    <div
                      key={game.gameId}
                      className={`p-3 rounded-xl border transition-all duration-700 ${
                        isConsensus
                          ? 'bg-slate-900/70 border-slate-800/80 opacity-80'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {game.awayTeam} @ {game.homeTeam}
                          </span>
                          {game.spread && game.spread !== 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                              {game.spread > 0 ? `+${game.spread}` : game.spread}
                            </span>
                          ) : null}
                        </div>
                        {distBadge ? (
                          <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider inline-flex items-center gap-1 ${distBadge.className}`}>
                            {distBadge.text}
                          </span>
                        ) : isConsensus ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800/90 text-cyan-300 border border-slate-700 font-bold">
                            {gameDist?.totalPicks} of {gameDist?.totalPicks} picked {gameDist?.consensusTeam}
                          </span>
                        ) : null}
                      </div>

                      {/* Pick Distribution Percentages Bar */}
                      {(awayCamp.length + homeCamp.length) > 0 && (
                        <div className="mb-2">
                          {(() => {
                            const total = awayCamp.length + homeCamp.length;
                            const awayPct = Math.round((awayCamp.length / total) * 100);
                            const homePct = 100 - awayPct;
                            return (
                              <>
                                <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
                                  <span className="text-cyan-400">{game.awayTeam} {awayPct}% ({awayCamp.length})</span>
                                  <span className="text-amber-400">{homePct}% ({homeCamp.length}) {game.homeTeam}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                                  <div style={{ width: `${awayPct}%` }} className="bg-cyan-500 h-full transition-all duration-500" />
                                  <div style={{ width: `${homePct}%` }} className="bg-amber-500 h-full transition-all duration-500" />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Stacked Avatar Camp Clusters */}
                      <div
                        onClick={() =>
                          setExpandedTugGameId(expandedTugGameId === game.gameId ? null : game.gameId)
                        }
                        className="cursor-pointer py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition"
                      >
                        <StackedAvatarCluster
                          participants={awayCamp}
                          teamLabel={game.awayTeam}
                          isAway={true}
                        />
                        <span className="text-[9px] text-slate-500 font-bold uppercase">
                          VS (TUG OF WAR)
                        </span>
                        <StackedAvatarCluster
                          participants={homeCamp}
                          teamLabel={game.homeTeam}
                          isAway={false}
                        />
                      </div>

                      {/* Expandable Tug-of-War Drawer */}
                      {expandedTugGameId === game.gameId && (
                        <TugOfWarDrawer
                          gameMatchup={`${game.awayTeam} @ ${game.homeTeam}`}
                          awayTeam={game.awayTeam}
                          homeTeam={game.homeTeam}
                          awayCamp={awayCamp}
                          homeCamp={homeCamp}
                          onClose={() => setExpandedTugGameId(null)}
                        />
                      )}

                      {/* Canonical Reaction Strip */}
                      {(() => {
                        const target: CanonicalReactionTarget = {
                          poolId: activePoolId,
                          season: 2026,
                          week: selectedWeek,
                          targetKind: 'CANONICAL_GAME',
                          entityId: game.gameId,
                        };
                        const val = validateCanonicalReactionTarget(target);
                        const chips = val.canonicalKey
                          ? summarizeReactionsForTarget(gameReactions, val.canonicalKey, user?.id || 'u1')
                          : [];
                        return (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                  REACTIONS
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(
                                      new CustomEvent('open-pool-lounge', {
                                        detail: {
                                          contextCard: {
                                            targetKind: 'CANONICAL_GAME',
                                            season: 2026,
                                            week: selectedWeek,
                                            entityId: game.gameId,
                                            settlementRevision: 0,
                                            title: `${game.awayTeam} @ ${game.homeTeam}`,
                                            subtitle: `Week ${selectedWeek} Matchup Discussion`,
                                            deepLinkTab: 'matrix',
                                          },
                                        },
                                      })
                                    );
                                  }}
                                  className="px-2 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 text-[9px] font-mono font-bold flex items-center gap-1 transition active:scale-95"
                                  title="Discuss this game in Pool Lounge"
                                >
                                  <span>💬</span>
                                  <span>Talk about this game</span>
                                </button>
                              </div>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 font-mono">
                                SESSION PREVIEW · P41-S2
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {chips.map((chip) => (
                                <button
                                  key={chip.code}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleGameReaction(game.gameId, chip.code);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition border flex items-center gap-1 ${
                                    chip.viewerSelected
                                      ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                  }`}
                                >
                                  <span>{chip.emoji}</span>
                                  <span>{chip.label}</span>
                                  {chip.count > 0 && (
                                    <span className="ml-0.5 px-1 py-0.1 rounded-full bg-slate-800 text-[9px] text-white">
                                      {chip.count}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
        )
      )}
      </div>
    </div>
  );
};

export default MatrixPage;
