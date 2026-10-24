import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShameSegmentedHeader } from '../components/shame/ShameSegmentedHeader';
import { WeeklyLadderView, LadderViewStatus } from '../components/shame/WeeklyLadderView';
import { AppHeader } from '../components/common/AppHeader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatShotUnit } from '../services/dependableInfoService';
import {
  deriveSeasonStoryViewModel,
  AuthoritativeWeeklyStandingRow,
} from '../services/seasonStoryService';
import { WeeklyRecapCardView } from '../components/shame/WeeklyRecapCardView';
import { fetchLiveNFLScores, LiveGame } from '../services/liveScoreService';
import {
  calculateProvisionalStandings,
  validateTelemetryCoverage,
} from '../services/sweatProjectionService';
import { scopedExpressFetch } from '../lib/apiClient';

export interface WallOfShamePageProps {
  poolId?: string;
  season?: number;
  seasonType?: number;
  week?: number;
}

interface ScopedLadderSnapshot {
  poolId: string;
  season: number;
  seasonType: number;
  week: number;
  ladderData: any[];
  status: LadderViewStatus;
  scoreStatus: 'STATUS_UNAVAILABLE' | 'GAMES_NOT_STARTED' | 'GAMES_LIVE' | 'WEEK_IN_PROGRESS' | 'ALL_GAMES_FINAL';
  isSettled: boolean;
  errorMessage?: string;
  observedAt: string;
  isStale: boolean;
}

export function WallOfShamePage({
  poolId: propPoolId,
  season: propSeason,
  seasonType: propSeasonType,
  week: propWeek,
}: WallOfShamePageProps = {}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'reels' | 'ladder' | 'infamy'>('ladder');
  const [inspectSettledFixture, setInspectSettledFixture] = useState<boolean>(false);

  const defaultPoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const targetPoolId = propPoolId || defaultPoolId;
  const targetSeason = propSeason || 2026;
  const targetSeasonType = propSeasonType || 2;
  const targetWeek = propWeek || 6;

  const reqGenRef = useRef(0);

  const [snapshot, setSnapshot] = useState<ScopedLadderSnapshot>({
    poolId: targetPoolId,
    season: targetSeason,
    seasonType: targetSeasonType,
    week: targetWeek,
    ladderData: [],
    status: 'LOADING',
    scoreStatus: 'STATUS_UNAVAILABLE',
    isSettled: false,
    observedAt: new Date().toISOString(),
    isStale: false,
  });

  const loadScopedData = useCallback(async (isRefresh: boolean = false) => {
    const currentGen = ++reqGenRef.current;

    if (!isRefresh) {
      setSnapshot((prev) => ({
        ...prev,
        poolId: targetPoolId,
        season: targetSeason,
        seasonType: targetSeasonType,
        week: targetWeek,
        ladderData: [],
        status: 'LOADING',
        scoreStatus: 'STATUS_UNAVAILABLE',
        errorMessage: undefined,
        isStale: false,
      }));
    } else {
      setSnapshot((prev) => ({
        ...prev,
        isStale: true,
      }));
    }

    try {
      // 1. Parallel authoritative data fetching for explicit scope
      const [membersResult, wrapupResult, penaltiesResult, matrixResult, picksResult, liveScores] = await Promise.all([
        supabase
          .from('pool_memberships')
          .select('user_id, role, users(id, email, display_name)')
          .eq('pool_id', targetPoolId)
          .eq('status', 'ACTIVE'),
        supabase
          .from('weekly_wrapups')
          .select('id, pool_id, week_number')
          .eq('pool_id', targetPoolId)
          .eq('week_number', targetWeek)
          .maybeSingle(),
        supabase
          .from('penalty_ledger')
          .select('*')
          .eq('pool_id', targetPoolId),
        scopedExpressFetch(`/api/pools/${targetPoolId}/matrix?week_no=${targetWeek}`).catch(() => null),
        supabase
          .from('picks')
          .select('user_id, matchup_id, game_id, selected_team, week')
          .eq('pool_id', targetPoolId)
          .eq('week', targetWeek),
        fetchLiveNFLScores(targetWeek).catch(() => [] as LiveGame[]),
      ]);

      // Guard against stale asynchronous resolution
      if (reqGenRef.current !== currentGen) {
        return;
      }

      // Check for participant load errors
      if (membersResult.error) {
        setSnapshot((prev) => ({
          ...prev,
          status: 'ERROR',
          errorMessage: 'Failed to retrieve active pool memberships.',
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
        return;
      }

      const members = membersResult.data || [];
      if (members.length === 0) {
        setSnapshot((prev) => ({
          ...prev,
          ladderData: [],
          status: 'EMPTY',
          scoreStatus: 'STATUS_UNAVAILABLE',
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
        return;
      }

      // Check official settlement proof
      const isOfficialSettled = Boolean(
        wrapupResult.data &&
        wrapupResult.data.pool_id === targetPoolId &&
        Number(wrapupResult.data.week_number) === targetWeek
      );

      // Check penalty ledger for settled debts
      const penalties = penaltiesResult.data || [];
      const penaltiesByUser = new Map<string, any[]>();
      let hasSettledPenalties = false;
      for (const p of penalties) {
        const list = penaltiesByUser.get(p.user_id) || [];
        list.push(p);
        penaltiesByUser.set(p.user_id, list);
        if (Number(p.delta || 0) > 0) {
          hasSettledPenalties = true;
        }
      }

      // PATH A: Authoritative Official Settlement
      if (isOfficialSettled && hasSettledPenalties) {
        const mappedLadder = members.map((m: any, idx: number) => {
          const u = m.users;
          let displayName = u?.display_name || (u?.email ? u.email.split('@')[0] : m.user_id);
          if (m.role === 'COMMISSIONER' || m.role === 'ADMIN') {
            displayName = `${displayName} (Commissioner)`;
          }

          const userPenalties = penaltiesByUser.get(m.user_id) || [];
          const totalDebt = userPenalties.reduce((sum, p) => sum + Number(p.delta || 0), 0);

          if (totalDebt <= 0) {
            return {
              rank: 1,
              displayRank: '#1',
              userId: m.user_id,
              userName: displayName,
              name: displayName,
              shots: '0 shots',
              penaltyShots: 0,
              status: 'CLEARED (SAFE)',
              fsmDisplayStatus: 'Safe Haven',
              tier: 'SAFE HAVEN',
            };
          }

          let tier = 'DANGER_LOW';
          let status = 'Settled';
          if (totalDebt >= 2.5) {
            tier = 'PIT';
            status = 'Awaiting Video';
          } else if (totalDebt >= 2.0) {
            tier = 'DANGER_HIGH';
            status = 'High Risk';
          }

          return {
            rank: idx + 1,
            displayRank: `#${idx + 1}`,
            userId: m.user_id,
            userName: displayName,
            name: displayName,
            shots: formatShotUnit(totalDebt),
            penaltyShots: totalDebt,
            status,
            fsmDisplayStatus: status,
            tier,
          };
        });

        setSnapshot({
          poolId: targetPoolId,
          season: targetSeason,
          seasonType: targetSeasonType,
          week: targetWeek,
          ladderData: mappedLadder,
          status: 'READY',
          scoreStatus: 'ALL_GAMES_FINAL',
          isSettled: true,
          observedAt: new Date().toISOString(),
          isStale: false,
        });
        return;
      }

      // PATH B: Provisional Sweat Standings Path
      let gamesList: any[] = [];
      if (matrixResult && matrixResult.ok) {
        try {
          const matrix = await matrixResult.json();
          if (matrix && Array.isArray(matrix.rows)) {
            gamesList = matrix.rows.map((row: any) => ({
              id: String(row.game_id),
              homeTeam: row.home_team_id,
              awayTeam: row.away_team_id,
              spread: row.spread,
              kickoffTime: row.kickoff_time,
            }));
          }
        } catch (_) {}
      }

      if (gamesList.length === 0) {
        // Fallback query to games table
        const { data: dbGames } = await supabase
          .from('games')
          .select('id, home_team_id, away_team_id, kickoff_time')
          .eq('season', targetSeason)
          .eq('season_type', targetSeasonType)
          .eq('week', targetWeek);

        if (Array.isArray(dbGames) && dbGames.length > 0) {
          gamesList = dbGames.map((g) => ({
            id: String(g.id),
            homeTeam: g.home_team_id,
            awayTeam: g.away_team_id,
            kickoffTime: g.kickoff_time,
          }));
        }
      }

      if (gamesList.length === 0) {
        setSnapshot((prev) => ({
          ...prev,
          ladderData: [],
          status: 'ERROR',
          errorMessage: `No active games found for Week ${targetWeek}.`,
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
        return;
      }

      // Check picks access error
      if (picksResult.error) {
        setSnapshot((prev) => ({
          ...prev,
          status: 'ERROR',
          errorMessage: 'Failed to retrieve member picks for this week.',
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
        return;
      }

      // Validate telemetry coverage before calculation
      const coverage = validateTelemetryCoverage(gamesList, liveScores);

      if (coverage.isIncomplete || !coverage.isReady) {
        setSnapshot({
          poolId: targetPoolId,
          season: targetSeason,
          seasonType: targetSeasonType,
          week: targetWeek,
          ladderData: [],
          status: 'INCOMPLETE_TELEMETRY',
          scoreStatus: 'STATUS_UNAVAILABLE',
          isSettled: false,
          errorMessage: 'Authoritative telemetry for one or more scoring events is missing or invalid.',
          observedAt: new Date().toISOString(),
          isStale: false,
        });
        return;
      }

      if (coverage.isAllPregame) {
        setSnapshot({
          poolId: targetPoolId,
          season: targetSeason,
          seasonType: targetSeasonType,
          week: targetWeek,
          ladderData: [],
          status: 'GAMES_NOT_STARTED',
          scoreStatus: 'GAMES_NOT_STARTED',
          isSettled: false,
          observedAt: new Date().toISOString(),
          isStale: false,
        });
        return;
      }

      // Map participant and pick inputs for sweat projection
      const mappedMembers = members.map((m: any) => {
        const u = m.users;
        let displayName = u?.display_name || (u?.email ? u.email.split('@')[0] : m.user_id);
        if (m.role === 'COMMISSIONER' || m.role === 'ADMIN') {
          displayName = `${displayName} (Commissioner)`;
        }
        return { id: m.user_id, name: displayName };
      });

      const userPicks = (picksResult.data || []).map((p: any) => ({
        userId: p.user_id,
        gameId: String(p.game_id || p.matchup_id),
        selectedTeam: p.selected_team,
        isSubmitted: true,
        isHidden: false,
      }));

      const standings = calculateProvisionalStandings(
        mappedMembers,
        gamesList,
        liveScores,
        userPicks
      );

      const mappedLadder = standings.map((entry) => {
        let tier = 'DANGER_LOW';
        let status = `${entry.projectedPenalty.toFixed(2)} Shots`;
        let fsmDisplayStatus = 'Provisional';

        if (entry.tier === 'SAFE_HAVEN') {
          tier = 'SAFE HAVEN';
          status = 'PROJECTED SAFE';
          fsmDisplayStatus = 'Safe Haven';
        } else if (entry.tier === 'DANGER_ZONE') {
          tier = 'DANGER_LOW';
          status = 'Projected 1.00 Shot';
          fsmDisplayStatus = 'Danger Zone';
        } else if (entry.tier === 'THE_DROP') {
          tier = 'DANGER_HIGH';
          status = 'Projected 2.00 Shots';
          fsmDisplayStatus = 'The Drop';
        } else if (entry.tier === 'PIT') {
          tier = 'PIT';
          status = 'Projected Dead Place';
          fsmDisplayStatus = 'Dead Place Monarch';
        }

        const rankStr = entry.isTied ? `T-#${entry.provisionalRank}` : `#${entry.provisionalRank}`;

        return {
          rank: entry.provisionalRank,
          displayRank: rankStr,
          userId: entry.userId,
          userName: entry.userName,
          name: entry.userName,
          shots: `${entry.projectedPenalty.toFixed(2)} shots`,
          penaltyShots: entry.projectedPenalty,
          status,
          fsmDisplayStatus,
          tier,
          points: entry.totalProvisionalPoints,
        };
      });

      // Derive score status
      const allFinal = liveScores.length > 0 && liveScores.every((g) => (g.status || '').toUpperCase() === 'FINAL');
      const anyLive = liveScores.some((g) => ['IN_PROGRESS', 'LIVE', 'HALFTIME'].includes((g.status || '').toUpperCase()));
      const anyStarted = liveScores.some((g) => (g.status || '').toUpperCase() === 'FINAL' || ['IN_PROGRESS', 'LIVE', 'HALFTIME'].includes((g.status || '').toUpperCase()));
      const anyUpcoming = liveScores.some((g) => (g.status || '').toUpperCase() === 'SCHEDULED');

      let resolvedScoreStatus: ScopedLadderSnapshot['scoreStatus'] = 'GAMES_NOT_STARTED';
      if (allFinal) {
        resolvedScoreStatus = 'ALL_GAMES_FINAL';
      } else if (anyLive) {
        resolvedScoreStatus = 'GAMES_LIVE';
      } else if (anyStarted && anyUpcoming) {
        resolvedScoreStatus = 'WEEK_IN_PROGRESS';
      }

      setSnapshot({
        poolId: targetPoolId,
        season: targetSeason,
        seasonType: targetSeasonType,
        week: targetWeek,
        ladderData: mappedLadder,
        status: 'READY',
        scoreStatus: resolvedScoreStatus,
        isSettled: false,
        observedAt: new Date().toISOString(),
        isStale: false,
      });
    } catch (err: any) {
      if (reqGenRef.current === currentGen) {
        setSnapshot((prev) => ({
          ...prev,
          status: 'ERROR',
          errorMessage: err?.message || 'Failed to load ladder data.',
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
      }
    }
  }, [targetPoolId, targetSeason, targetSeasonType, targetWeek]);

  useEffect(() => {
    loadScopedData(false);
  }, [loadScopedData]);

  const currentUserId = user?.id || 'viewer';

  const demoRecords: AuthoritativeWeeklyStandingRow[] = useMemo(() => [
    {
      season: 2026,
      week: 5,
      poolId: targetPoolId,
      userId: currentUserId,
      displayName: user?.email ? user.email.split('@')[0] : 'You',
      rank: 1,
      isTiedRank: false,
      participantCount: 2,
      correctPicks: 10,
      totalGames: 14,
      weeklyShotsIncurred: 0,
      tierName: 'SAFE HAVEN',
      isOfficiallySettled: true,
      settlementRevision: '1 (Official)',
    },
  ], [targetPoolId, currentUserId, user?.email]);

  const seasonStory = useMemo(() => {
    return deriveSeasonStoryViewModel({
      isLoading: false,
      season: targetSeason,
      poolId: targetPoolId,
      viewerUserId: currentUserId,
      rawRecords: inspectSettledFixture ? demoRecords : [],
      currentOutstandingShotDebt: 0,
    });
  }, [targetPoolId, targetSeason, currentUserId, inspectSettledFixture, demoRecords]);

  // Unified phase label mapping per contract
  const headerPhase = useMemo(() => {
    if (activeTab === 'infamy') return 'SETTLED';
    if (snapshot.isSettled) return 'SETTLED';
    if (snapshot.scoreStatus === 'ALL_GAMES_FINAL') return 'ALL GAMES FINAL';
    if (snapshot.scoreStatus === 'GAMES_LIVE') return 'GAMES LIVE';
    if (snapshot.scoreStatus === 'WEEK_IN_PROGRESS') return 'WEEK IN PROGRESS';
    if (snapshot.scoreStatus === 'GAMES_NOT_STARTED') return 'GAMES NOT STARTED';
    return 'STATUS UNAVAILABLE';
  }, [activeTab, snapshot.isSettled, snapshot.scoreStatus]);

  // Unified right badge mapping per contract
  const headerRightBadge = useMemo(() => {
    if (activeTab === 'infamy') {
      return (
        <div className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-400 font-bold text-[10px]">
          <span>AUDITED</span>
        </div>
      );
    }
    if (snapshot.isSettled) {
      return (
        <div className="px-2 py-0.5 rounded-full border border-emerald-700 bg-emerald-900/60 text-emerald-300 font-bold text-[10px]">
          <span>OFFICIALLY SETTLED</span>
        </div>
      );
    }
    if (snapshot.scoreStatus === 'ALL_GAMES_FINAL') {
      return (
        <div className="px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 font-bold text-[10px]">
          <span>WEEK {targetWeek} FINAL · PROVISIONAL</span>
        </div>
      );
    }
    if (snapshot.status === 'READY') {
      return (
        <div className="px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 font-bold text-[10px]">
          <span>PROVISIONAL</span>
        </div>
      );
    }
    return (
      <div className="px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500 font-bold text-[10px]">
        <span>UNAVAILABLE</span>
      </div>
    );
  }, [activeTab, snapshot.isSettled, snapshot.scoreStatus, snapshot.status, targetWeek]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Unified Top Branding Banner */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope={activeTab === 'infamy' ? 'SEASON LEDGER' : `WEEK ${targetWeek}`}
        phase={headerPhase}
        rightContent={headerRightBadge}
      />

      {/* Persistent 3-Tab Segmented Header */}
      <ShameSegmentedHeader activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Tab 1: Reels Feed (Scoped Empty State) */}
      {activeTab === 'reels' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-3xl">
            🎬
          </div>
          <div className="text-amber-400 font-bold text-sm tracking-wider uppercase mb-1">
            [ NO ACTIVE PENALTY REELS ]
          </div>
          <p className="text-slate-300 text-xs max-w-xs leading-relaxed mb-1">
            Zero penalty shot videos have been uploaded for Week {targetWeek}.
          </p>
          <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed mb-6 font-mono">
            Prior settled obligations: 0 outstanding penalty reels.
          </p>
          <button 
            onClick={() => setActiveTab('ladder')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition"
          >
            VIEW SHOT DEBT LADDER →
          </button>
        </div>
      )}

      {/* Tab 2: Live Shot Debt Ladder (Parent Owned Readiness & Scoped Snapshot) */}
      {activeTab === 'ladder' && (
        <div className="flex-1 p-4">
          <WeeklyLadderView
            ladder={snapshot.ladderData}
            status={snapshot.status}
            weekNumber={targetWeek}
            isSettled={snapshot.isSettled}
            scoreStatus={snapshot.scoreStatus}
            errorMessage={snapshot.errorMessage}
            onRetry={() => loadScopedData(true)}
            observedAt={snapshot.observedAt}
            isStale={snapshot.isStale}
          />
        </div>
      )}

      {/* Tab 3: Hall of Infamy, Season Story & Weekly Recap Cards */}
      {activeTab === 'infamy' && (
        <div className="flex-1 p-4 space-y-4">
          {/* Season Story Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div>
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  AUTHORITATIVE SEASON STORY
                </div>
                <div className="text-xs text-slate-300 font-bold">
                  {seasonStory.headline}
                </div>
              </div>
              <button
                onClick={() => setInspectSettledFixture((prev) => !prev)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition border ${
                  inspectSettledFixture
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {inspectSettledFixture ? 'RESET TO LIVE LEAGUE' : 'INSPECT SETTLED FIXTURE'}
              </button>
            </div>

            {inspectSettledFixture && (
              <div className="mb-3 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[10px]">
                <span className="font-bold">DEMO FIXTURE:</span> Simulating 1 settled week to verify personal/league story progression on hardware while live Week 6 is unsettled.
              </div>
            )}

            <div className="text-xs text-slate-400 leading-relaxed mb-3">
              {seasonStory.statusMessage}
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center mb-3">
              <div>
                <div className="text-[9px] text-slate-500 uppercase">Settled Slates</div>
                <div className="text-xs font-bold text-slate-200">{seasonStory.settledWeeksCount}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase">Pick Accuracy</div>
                <div className="text-xs font-bold text-cyan-400">{seasonStory.accuracyPercentLabel}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase">Safe Havens</div>
                <div className="text-xs font-bold text-emerald-400">{seasonStory.safeHavenFinishes ?? 0}</div>
              </div>
            </div>

            {seasonStory.weeklyNodes.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Settled Weekly Audit Trail
                </div>
                {seasonStory.weeklyNodes.map((node) => (
                  <div
                    key={node.week}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-200">
                        Week {node.week} · <span className="text-cyan-400">{node.rankLabel}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {node.participationBadge} · {node.settlementRevisionLabel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-400">
                        {node.weeklyChargeLabel}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {node.pickRecordLabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Recap Card Exporter Component */}
          <WeeklyRecapCardView
            currentWeek={targetWeek}
            liveParticipants={snapshot.ladderData.map((l, idx) => ({
              userId: l.userId || `u-${idx}`,
              displayName: l.displayName || `Player ${idx + 1}`,
              rank: l.rank || idx + 1,
              points: 0,
              totalGames: 14,
              shotsIncurred: l.shotsOwed || 0,
              tierName: l.tier || 'SAFE HAVEN',
              tiebreakResolved: true,
            }))}
            viewerUserId={user?.id || 'viewer'}
          />
        </div>
      )}
    </div>
  );
}

export default WallOfShamePage;
