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
  UserPickItem,
  TiebreakerData,
} from '../services/sweatProjectionService';
import { scopedExpressFetch } from '../lib/apiClient';
import { evaluateSlateLockSummary } from '../services/lockEnforcementService';
import { resolveAuthoritativeSlate } from '../services/authoritativeSlateClientService';

export interface WallOfShamePageProps {
  poolId?: string;
  season?: number;
  seasonType?: number;
  week?: number;
}

interface ScopedLadderSnapshot {
  userId?: string;
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

  const reqGenRef = useRef(0);

  const initialPoolId = propPoolId || '';
  const initialSeason = propSeason || 2026;
  const initialSeasonType = propSeasonType || 2;
  const initialWeek = propWeek ?? 0;

  const [snapshot, setSnapshot] = useState<ScopedLadderSnapshot>({
    userId: user?.id,
    poolId: initialPoolId,
    season: initialSeason,
    seasonType: initialSeasonType,
    week: initialWeek,
    ladderData: [],
    status: 'LOADING',
    scoreStatus: 'STATUS_UNAVAILABLE',
    isSettled: false,
    observedAt: new Date().toISOString(),
    isStale: false,
  });

  const loadScopedData = useCallback(async (isRefresh: boolean = false) => {
    const currentGen = ++reqGenRef.current;

    // Reset view state on refresh/retry to avoid leaving prior safe claims
    if (isRefresh) {
      setSnapshot((prev) => ({
        ...prev,
        ladderData: [],
        status: 'LOADING',
        scoreStatus: 'STATUS_UNAVAILABLE',
        isStale: true,
      }));
    }

    try {
      // 1. Resolve active pool & scope without hardcoded fallbacks (Fail Closed: Decision #55)
      let resolvedPoolId = propPoolId;
      let resolvedSeason = propSeason;
      let resolvedSeasonType = propSeasonType;
      let resolvedWeek = propWeek;

      if (!resolvedPoolId && user?.id) {
        const { data: memberData } = await supabase
          .from('pool_memberships')
          .select('pool_id, pools(settings)')
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE')
          .maybeSingle();

        if (reqGenRef.current !== currentGen) return;

        if (memberData?.pool_id) {
          resolvedPoolId = memberData.pool_id;
          const settings = (memberData.pools as any)?.settings;
          if (!resolvedSeason && settings?.season) resolvedSeason = Number(settings.season);
          if (!resolvedSeasonType && settings?.season_type) resolvedSeasonType = Number(settings.season_type);
          if (resolvedWeek === undefined && settings?.current_week !== undefined) {
            resolvedWeek = Number(settings.current_week);
          }
        }
      }

      resolvedSeason = resolvedSeason || 2026;
      resolvedSeasonType = resolvedSeasonType || 2;

      // Fail closed when scope cannot be resolved or is invalid
      const isWeekValid = resolvedWeek !== undefined && resolvedWeek !== null && Number.isInteger(resolvedWeek) && resolvedWeek >= 1 && resolvedWeek <= 18;
      const isSeasonValid = resolvedSeason === 2026;
      const isSeasonTypeValid = resolvedSeasonType === 2;

      if (!resolvedPoolId || !isWeekValid || !isSeasonValid || !isSeasonTypeValid) {
        if (reqGenRef.current !== currentGen) return;
        setSnapshot({
          userId: user?.id,
          poolId: resolvedPoolId || '',
          season: resolvedSeason || 2026,
          seasonType: resolvedSeasonType || 2,
          week: resolvedWeek ?? 0,
          ladderData: [],
          status: 'EMPTY',
          scoreStatus: 'STATUS_UNAVAILABLE',
          isSettled: false,
          observedAt: new Date().toISOString(),
          isStale: false,
          errorMessage: 'Active pool or week scope could not be resolved or is unsupported.',
        });
        return;
      }

      const targetPoolId: string = resolvedPoolId;
      const targetSeason: number = resolvedSeason;
      const targetSeasonType: number = resolvedSeasonType;
      const targetWeek: number = resolvedWeek as number;

      setSnapshot((prev) => ({
        ...prev,
        userId: user?.id,
        poolId: targetPoolId,
        season: targetSeason,
        seasonType: targetSeasonType,
        week: targetWeek,
        ladderData: [],
        status: 'LOADING',
        scoreStatus: 'STATUS_UNAVAILABLE',
        isSettled: false,
        errorMessage: undefined,
        isStale: false,
      }));

      // 2. Parallel authoritative data fetch for resolved scope
      const [membersResult, wrapupResult, matrixResult, liveScores] = await Promise.all([
        supabase
          .from('pool_memberships')
          .select('user_id, role, users(id, email, display_name)')
          .eq('pool_id', targetPoolId)
          .eq('status', 'ACTIVE'),
        supabase
          .from('weekly_wrapups')
          .select('pool_id, week_number, summary, completed_at')
          .eq('pool_id', targetPoolId)
          .eq('week_number', targetWeek)
          .maybeSingle(),
        scopedExpressFetch(`/api/pools/${targetPoolId}/matrix?week_no=${targetWeek}`).catch(() => null),
        fetchLiveNFLScores(targetWeek).catch(() => [] as LiveGame[]),
      ]);

      if (reqGenRef.current !== currentGen) return;

      // Check participant load error
      if (membersResult.error) {
        setSnapshot((prev) => ({
          ...prev,
          userId: user?.id,
          poolId: targetPoolId,
          season: targetSeason,
          seasonType: targetSeasonType,
          week: targetWeek,
          ladderData: [],
          status: 'ERROR',
          scoreStatus: 'STATUS_UNAVAILABLE',
          isSettled: false,
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
          userId: user?.id,
          poolId: targetPoolId,
          season: targetSeason,
          seasonType: targetSeasonType,
          week: targetWeek,
          ladderData: [],
          status: 'EMPTY',
          scoreStatus: 'STATUS_UNAVAILABLE',
          isSettled: false,
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
        return;
      }

      // 3. Resolve gamesList and complete matrix picks
      let gamesList: any[] = [];
      let matrixPicks: UserPickItem[] = [];
      let isMatrixComplete = false;

      if (matrixResult && matrixResult.ok) {
        try {
          const matrix = await matrixResult.json();
          if (reqGenRef.current !== currentGen) return;
          const isScopeMatch =
            matrix &&
            (!matrix.metadata ||
              (matrix.metadata.pool_id === targetPoolId &&
                Number(matrix.metadata.week_number) === targetWeek));

          if (
            isScopeMatch &&
            Array.isArray(matrix.rows) &&
            matrix.rows.length > 0
          ) {
            gamesList = matrix.rows.map((row: any) => ({
              id: String(row.game_id),
              externalGameId: row.external_game_id ? String(row.external_game_id) : String(row.game_id),
              homeTeam: row.home_team_id,
              awayTeam: row.away_team_id,
              spread: row.spread,
              kickoffTime: row.kickoff_time,
            }));

            const hasValidMetadata =
              Boolean(matrix.metadata) &&
              matrix.metadata.pool_id === targetPoolId &&
              Number(matrix.metadata.week_number) === targetWeek;

            const hasAllMemberColumns =
              Array.isArray(matrix.columns) &&
              members.every((m: any) =>
                matrix.columns.some((c: any) => (c.user_id || c.id) === m.user_id)
              );
            const hasAllRowCells =
              matrix.cells &&
              typeof matrix.cells === 'object' &&
              matrix.rows.every((row: any) => {
                const gCells = matrix.cells[row.game_id];
                return gCells && typeof gCells === 'object' && members.every((m: any) => gCells[m.user_id] !== undefined);
              });

            if (hasValidMetadata && hasAllMemberColumns && hasAllRowCells) {
              isMatrixComplete = true;
              for (const row of matrix.rows) {
                const gId = String(row.game_id);
                const gCells = matrix.cells[gId];
                for (const m of members) {
                  const cell = gCells[m.user_id];
                  if (cell && cell.selected_team_id) {
                    matrixPicks.push({
                      userId: m.user_id,
                      gameId: gId,
                      selectedTeam: cell.selected_team_id,
                      isSubmitted: true,
                      isHidden: false,
                    });
                  }
                }
              }
            }
          }
        } catch (_) {}
      }

      if (reqGenRef.current !== currentGen) return;

      if (gamesList.length === 0) {
        const resolution = await resolveAuthoritativeSlate({
          supabase,
          activePoolId: targetPoolId,
          seasonYear: targetSeason,
          seasonType: targetSeasonType,
          weekNumber: targetWeek,
          liveScores,
        });

        if (reqGenRef.current !== currentGen) return;

        if (resolution.source !== 'FAILED_CLOSED' && Array.isArray(resolution.games) && resolution.games.length > 0) {
          gamesList = resolution.games.map((g: any) => ({
            id: String(g.id),
            externalGameId: g.externalGameId ? String(g.externalGameId) : String(g.id),
            homeTeam: g.homeTeamId,
            awayTeam: g.awayTeamId,
            spread: g.spread,
            kickoffTime: g.kickoffTime,
          }));
        }
      }

      // 4. Official Settled Contract Verification (Finding 1 & 3)
      let isOfficialSettled = false;
      const wrapup = wrapupResult.error ? null : wrapupResult.data;
      if (
        wrapup &&
        wrapup.completed_at &&
        wrapup.pool_id === targetPoolId &&
        Number(wrapup.week_number) === targetWeek &&
        wrapup.summary &&
        typeof wrapup.summary === 'object'
      ) {
        const sum = wrapup.summary as any;
        const isScopeMatch =
          sum.poolId === targetPoolId &&
          Number(sum.season) === targetSeason &&
          Number(sum.seasonType) === targetSeasonType &&
          Number(sum.weekNumber) === targetWeek;

        if (isScopeMatch && Array.isArray(sum.standings) && sum.standings.length > 0) {
          const isValidStandings = sum.standings.every(
            (s: any) =>
              s &&
              typeof s.userId === 'string' &&
              typeof s.score === 'number' &&
              Number.isFinite(s.score) &&
              typeof s.rank === 'number' &&
              Number.isInteger(s.rank) &&
              s.rank >= 1 &&
              typeof s.shots === 'number' &&
              Number.isFinite(s.shots) &&
              s.shots >= 0 &&
              typeof s.isSafeHaven === 'boolean' &&
              typeof s.isDeadPlace === 'boolean'
          );
          if (isValidStandings) {
            isOfficialSettled = true;
          }
        }
      }

      if (isOfficialSettled && wrapup?.summary) {
        const settledStandings: any[] = (wrapup.summary as any).standings;
        const userMap = new Map(members.map((m: any) => [m.user_id, m]));

        const mappedLadder = settledStandings.map((s: any) => {
          const m = userMap.get(s.userId);
          let displayName = m?.users?.display_name || (m?.users?.email ? m.users.email.split('@')[0] : s.userId);
          if (m?.role === 'COMMISSIONER' || m?.role === 'ADMIN') {
            displayName = `${displayName} (Commissioner)`;
          }
          const shotsNum = Number(s.shots);
          let tier = 'DANGER_LOW';
          let statusText = s.isSafeHaven ? 'CLEARED (SAFE)' : s.isDeadPlace ? 'DEAD PLACE' : 'Settled';
          let fsmStatus = s.isSafeHaven ? 'Safe Haven' : 'Settled';

          if (s.isSafeHaven || shotsNum === 0) {
            tier = 'SAFE HAVEN';
            statusText = 'CLEARED (SAFE)';
            fsmStatus = 'Safe Haven';
          } else if (s.isDeadPlace) {
            tier = 'PIT';
            statusText = 'DEAD PLACE';
            fsmStatus = 'Dead Place Monarch';
          } else if (shotsNum === 2) {
            tier = 'DANGER_HIGH';
            statusText = '2 SHOTS';
            fsmStatus = 'The Drop';
          } else if (shotsNum === 1) {
            tier = 'DANGER_LOW';
            statusText = '1 SHOT';
            fsmStatus = 'Danger Zone';
          }

          return {
            rank: s.rank,
            displayRank: `#${s.rank}`,
            userId: s.userId,
            userName: displayName,
            name: displayName,
            shots: formatShotUnit(shotsNum),
            penaltyShots: shotsNum,
            status: statusText,
            fsmDisplayStatus: fsmStatus,
            tier,
            points: s.score,
          };
        });

        let settledScoreStatus: ScopedLadderSnapshot['scoreStatus'] = 'STATUS_UNAVAILABLE';
        if (Array.isArray(liveScores) && liveScores.length > 0 && gamesList.length > 0) {
          const scoreMap = new Map<string, any>();
          for (const sc of liveScores) {
            if (sc && sc.id) scoreMap.set(String(sc.id), sc);
          }
          const allFinal = gamesList.every((g) => {
            const sc = scoreMap.get(g.externalGameId) || scoreMap.get(g.id);
            return (sc?.status || '').toUpperCase() === 'FINAL';
          });
          const anyLive = gamesList.some((g) => {
            const sc = scoreMap.get(g.externalGameId) || scoreMap.get(g.id);
            const st = (sc?.status || '').toUpperCase();
            return st === 'IN_PROGRESS' || st === 'LIVE' || st === 'HALFTIME';
          });
          settledScoreStatus = allFinal ? 'ALL_GAMES_FINAL' : anyLive ? 'GAMES_LIVE' : 'STATUS_UNAVAILABLE';
        }

        setSnapshot({
          userId: user?.id,
          poolId: targetPoolId,
          season: targetSeason,
          seasonType: targetSeasonType,
          week: targetWeek,
          ladderData: mappedLadder,
          status: 'READY',
          scoreStatus: settledScoreStatus,
          isSettled: true,
          observedAt: new Date().toISOString(),
          isStale: false,
        });
        return;
      }

      if (gamesList.length === 0) {
        setSnapshot((prev) => ({
          ...prev,
          userId: user?.id,
          poolId: targetPoolId,
          season: targetSeason,
          seasonType: targetSeasonType,
          week: targetWeek,
          ladderData: [],
          status: 'ERROR',
          scoreStatus: 'STATUS_UNAVAILABLE',
          isSettled: false,
          errorMessage: `No active games found for Week ${targetWeek}.`,
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
        return;
      }

      // 5. Query user picks using accepted game IDs if matrix was incomplete
      let resolvedPicks: UserPickItem[] = matrixPicks;
      if (!isMatrixComplete) {
        const acceptedGameIds = Array.from(
          new Set(
            gamesList
              .flatMap((g) => [g.id, g.externalGameId])
              .filter(Boolean)
              .map(String)
          )
        );

        const { data: dbPicks, error: picksErr } = await supabase
          .from('picks')
          .select('user_id, game_id, selected_team')
          .eq('pool_id', targetPoolId)
          .in('game_id', acceptedGameIds);

        if (reqGenRef.current !== currentGen) return;

        if (picksErr) {
          setSnapshot((prev) => ({
            ...prev,
            userId: user?.id,
            poolId: targetPoolId,
            season: targetSeason,
            seasonType: targetSeasonType,
            week: targetWeek,
            ladderData: [],
            status: 'ERROR',
            scoreStatus: 'STATUS_UNAVAILABLE',
            isSettled: false,
            errorMessage: 'Failed to retrieve member picks for this week.',
            observedAt: new Date().toISOString(),
            isStale: false,
          }));
          return;
        }

        resolvedPicks = (dbPicks || []).map((p: any) => ({
          userId: p.user_id,
          gameId: String(p.game_id),
          selectedTeam: p.selected_team,
          isSubmitted: true,
          isHidden: false,
        }));
      }

      // 6. Strict Telemetry Validation (Finding 3)
      const coverage = validateTelemetryCoverage(gamesList, liveScores);

      if (coverage.isIncomplete || !coverage.isReady) {
        setSnapshot({
          userId: user?.id,
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
          userId: user?.id,
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

      // 7. Fetch Tiebreaker Inputs (Finding 2)
      let tiebreakerData: TiebreakerData | undefined = undefined;
      if (targetWeek !== 6) {
        try {
          const tbRes = await scopedExpressFetch(
            `/api/pools/${targetPoolId}/tiebreaker?week=${targetWeek}&season=${targetSeason}`
          );
          if (reqGenRef.current !== currentGen) return;

          if (!tbRes || !tbRes.ok) {
            setSnapshot({
              userId: user?.id,
              poolId: targetPoolId,
              season: targetSeason,
              seasonType: targetSeasonType,
              week: targetWeek,
              ladderData: [],
              status: 'INCOMPLETE_TELEMETRY',
              scoreStatus: 'STATUS_UNAVAILABLE',
              isSettled: false,
              errorMessage: 'Tiebreaker data could not be verified for this week.',
              observedAt: new Date().toISOString(),
              isStale: false,
            });
            return;
          }

          const tbJson = await tbRes.json();
          if (reqGenRef.current !== currentGen) return;

          if (!tbJson || typeof tbJson !== 'object') {
            setSnapshot({
              userId: user?.id,
              poolId: targetPoolId,
              season: targetSeason,
              seasonType: targetSeasonType,
              week: targetWeek,
              ladderData: [],
              status: 'INCOMPLETE_TELEMETRY',
              scoreStatus: 'STATUS_UNAVAILABLE',
              isSettled: false,
              errorMessage: 'Malformed tiebreaker response received.',
              observedAt: new Date().toISOString(),
              isStale: false,
            });
            return;
          }

          if (tbJson.status === 'UNRESOLVED') {
            setSnapshot({
              userId: user?.id,
              poolId: targetPoolId,
              season: targetSeason,
              seasonType: targetSeasonType,
              week: targetWeek,
              ladderData: [],
              status: 'INCOMPLETE_TELEMETRY',
              scoreStatus: 'STATUS_UNAVAILABLE',
              isSettled: false,
              errorMessage: 'Tiebreaker designation is unresolved for this week.',
              observedAt: new Date().toISOString(),
              isStale: false,
            });
            return;
          }

          if (tbJson.tiebreakerOffered) {
            const designatedEventId = String(tbJson.eventId || tbJson.designatedGame?.id || '');
            if (!designatedEventId) {
              setSnapshot({
                userId: user?.id,
                poolId: targetPoolId,
                season: targetSeason,
                seasonType: targetSeasonType,
                week: targetWeek,
                ladderData: [],
                status: 'INCOMPLETE_TELEMETRY',
                scoreStatus: 'STATUS_UNAVAILABLE',
                isSettled: false,
                errorMessage: 'Designated tiebreaker event is missing.',
                observedAt: new Date().toISOString(),
                isStale: false,
              });
              return;
            }

            const isEventInSlate = gamesList.some(
              (g) => g.id === designatedEventId || g.externalGameId === designatedEventId
            );
            if (!isEventInSlate) {
              setSnapshot({
                userId: user?.id,
                poolId: targetPoolId,
                season: targetSeason,
                seasonType: targetSeasonType,
                week: targetWeek,
                ladderData: [],
                status: 'INCOMPLETE_TELEMETRY',
                scoreStatus: 'STATUS_UNAVAILABLE',
                isSettled: false,
                errorMessage: 'Designated tiebreaker event is missing from weekly slate.',
                observedAt: new Date().toISOString(),
                isStale: false,
              });
              return;
            }

            if (!Array.isArray(tbJson.readiness)) {
              setSnapshot({
                userId: user?.id,
                poolId: targetPoolId,
                season: targetSeason,
                seasonType: targetSeasonType,
                week: targetWeek,
                ladderData: [],
                status: 'INCOMPLETE_TELEMETRY',
                scoreStatus: 'STATUS_UNAVAILABLE',
                isSettled: false,
                errorMessage: 'Tiebreaker readiness payload is invalid.',
                observedAt: new Date().toISOString(),
                isStale: false,
              });
              return;
            }

            // Verify member readiness coverage: every active member must be covered in readiness
            const readinessUserIds = new Set(tbJson.readiness.map((r: any) => r?.userId).filter(Boolean));
            const hasFullMemberCoverage = members.every((m: any) => readinessUserIds.has(m.user_id));
            if (!hasFullMemberCoverage) {
              setSnapshot({
                userId: user?.id,
                poolId: targetPoolId,
                season: targetSeason,
                seasonType: targetSeasonType,
                week: targetWeek,
                ladderData: [],
                status: 'INCOMPLETE_TELEMETRY',
                scoreStatus: 'STATUS_UNAVAILABLE',
                isSettled: false,
                errorMessage: 'Tiebreaker readiness does not cover all active pool members.',
                observedAt: new Date().toISOString(),
                isStale: false,
              });
              return;
            }

            const preds: Record<string, number> = {};
            for (const item of tbJson.readiness) {
              if (item && item.userId && item.prediction !== null && item.prediction !== undefined) {
                const pVal = Number(item.prediction);
                if (!Number.isFinite(pVal) || pVal < 0 || pVal > 999.99) {
                  setSnapshot({
                    userId: user?.id,
                    poolId: targetPoolId,
                    season: targetSeason,
                    seasonType: targetSeasonType,
                    week: targetWeek,
                    ladderData: [],
                    status: 'INCOMPLETE_TELEMETRY',
                    scoreStatus: 'STATUS_UNAVAILABLE',
                    isSettled: false,
                    errorMessage: 'Malformed tiebreaker prediction value encountered.',
                    observedAt: new Date().toISOString(),
                    isStale: false,
                  });
                  return;
                }
                preds[item.userId] = pVal;
              }
            }

            let actualTotalScore: number | undefined = undefined;
            const liveGame = (liveScores || []).find((s: any) => String(s?.id) === designatedEventId);
            if (!liveGame) {
              setSnapshot({
                userId: user?.id,
                poolId: targetPoolId,
                season: targetSeason,
                seasonType: targetSeasonType,
                week: targetWeek,
                ladderData: [],
                status: 'INCOMPLETE_TELEMETRY',
                scoreStatus: 'STATUS_UNAVAILABLE',
                isSettled: false,
                errorMessage: 'Live scoring telemetry for designated tiebreaker event is missing.',
                observedAt: new Date().toISOString(),
                isStale: false,
              });
              return;
            }

            if ((liveGame.status || '').toUpperCase() === 'FINAL') {
              const h = Number(liveGame.homeTeam?.score);
              const a = Number(liveGame.awayTeam?.score);
              if (Number.isFinite(h) && Number.isFinite(a) && h >= 0 && a >= 0) {
                actualTotalScore = h + a;
              }
            }

            tiebreakerData = {
              actualTotalScore,
              userPredictions: preds,
            };
          }
        } catch (err) {
          if (reqGenRef.current !== currentGen) return;
          setSnapshot({
            userId: user?.id,
            poolId: targetPoolId,
            season: targetSeason,
            seasonType: targetSeasonType,
            week: targetWeek,
            ladderData: [],
            status: 'INCOMPLETE_TELEMETRY',
            scoreStatus: 'STATUS_UNAVAILABLE',
            isSettled: false,
            errorMessage: 'Network error retrieving tiebreaker information.',
            observedAt: new Date().toISOString(),
            isStale: false,
          });
          return;
        }
      }

      if (reqGenRef.current !== currentGen) return;

      // 8. Calculate Provisional Standings
      const mappedMembers = members.map((m: any) => {
        const u = m.users;
        let displayName = u?.display_name || (u?.email ? u.email.split('@')[0] : m.user_id);
        if (m.role === 'COMMISSIONER' || m.role === 'ADMIN') {
          displayName = `${displayName} (Commissioner)`;
        }
        return { id: m.user_id, name: displayName };
      });

      const standings = calculateProvisionalStandings(
        mappedMembers,
        gamesList,
        liveScores,
        resolvedPicks,
        tiebreakerData
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

      // 9. Derive Truthful Slate Progress Status (Finding 5)
      const slateSummary = evaluateSlateLockSummary(gamesList, liveScores, 0);

      let resolvedScoreStatus: ScopedLadderSnapshot['scoreStatus'] = 'GAMES_NOT_STARTED';
      if (slateSummary.allGamesFinal) {
        resolvedScoreStatus = 'ALL_GAMES_FINAL';
      } else if (slateSummary.anyGameLive) {
        resolvedScoreStatus = 'GAMES_LIVE';
      } else if (slateSummary.anyStartedOrFinal && slateSummary.anyUpcoming) {
        resolvedScoreStatus = 'WEEK_IN_PROGRESS';
      }

      setSnapshot({
        userId: user?.id,
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
          ladderData: [],
          isSettled: false,
          scoreStatus: 'STATUS_UNAVAILABLE',
          status: 'ERROR',
          errorMessage: err?.message || 'Failed to load ladder data.',
          observedAt: new Date().toISOString(),
          isStale: false,
        }));
      }
    }
  }, [propPoolId, propSeason, propSeasonType, propWeek, user?.id]);

  useEffect(() => {
    let isMounted = true;
    loadScopedData(false);
    return () => {
      isMounted = false;
      reqGenRef.current += 1; // Invalidate any in-flight async operations on unmount
    };
  }, [loadScopedData]);

  const currentUserId = user?.id || 'viewer';

  // Prevent scope collision: render loading immediately if snapshot scope does not match requested scope (Finding 2 & 4)
  const isScopeMismatch =
    (snapshot.userId ?? null) !== (user?.id ?? null) ||
    (propPoolId !== undefined && snapshot.poolId !== propPoolId) ||
    (propSeason !== undefined && snapshot.season !== propSeason) ||
    (propSeasonType !== undefined && snapshot.seasonType !== propSeasonType) ||
    (propWeek !== undefined && snapshot.week !== propWeek);

  const effectiveStatus: LadderViewStatus = isScopeMismatch ? 'LOADING' : snapshot.status;
  const effectiveLadder = isScopeMismatch ? [] : snapshot.ladderData;
  const effectiveScoreStatus = isScopeMismatch ? 'STATUS_UNAVAILABLE' : snapshot.scoreStatus;
  const effectiveIsSettled = isScopeMismatch ? false : snapshot.isSettled;
  const currentWeekDisplay = propWeek ?? snapshot.week;

  const demoRecords: AuthoritativeWeeklyStandingRow[] = useMemo(() => [
    {
      season: 2026,
      week: 5,
      poolId: snapshot.poolId,
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
  ], [snapshot.poolId, currentUserId, user?.email]);

  const seasonStory = useMemo(() => {
    return deriveSeasonStoryViewModel({
      isLoading: false,
      season: snapshot.season,
      poolId: snapshot.poolId,
      viewerUserId: currentUserId,
      rawRecords: inspectSettledFixture ? demoRecords : [],
      currentOutstandingShotDebt: 0,
    });
  }, [snapshot.poolId, snapshot.season, currentUserId, inspectSettledFixture, demoRecords]);

  // Unified phase label mapping per contract
  const headerPhase = useMemo(() => {
    if (isScopeMismatch) return 'STATUS UNAVAILABLE';
    if (activeTab === 'infamy') return 'SETTLED';
    if (effectiveIsSettled) return 'SETTLED';
    if (effectiveScoreStatus === 'ALL_GAMES_FINAL') return 'ALL GAMES FINAL';
    if (effectiveScoreStatus === 'GAMES_LIVE') return 'GAMES LIVE';
    if (effectiveScoreStatus === 'WEEK_IN_PROGRESS') return 'WEEK IN PROGRESS';
    if (effectiveScoreStatus === 'GAMES_NOT_STARTED') return 'GAMES NOT STARTED';
    return 'STATUS UNAVAILABLE';
  }, [isScopeMismatch, activeTab, effectiveIsSettled, effectiveScoreStatus]);

  // Unified right badge mapping per contract
  const headerRightBadge = useMemo(() => {
    if (isScopeMismatch) {
      return (
        <div className="px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500 font-bold text-[10px]">
          <span>LOADING</span>
        </div>
      );
    }
    if (activeTab === 'infamy') {
      return (
        <div className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-400 font-bold text-[10px]">
          <span>AUDITED</span>
        </div>
      );
    }
    if (effectiveIsSettled) {
      return (
        <div className="px-2 py-0.5 rounded-full border border-emerald-700 bg-emerald-900/60 text-emerald-300 font-bold text-[10px]">
          <span>OFFICIALLY SETTLED</span>
        </div>
      );
    }
    if (effectiveScoreStatus === 'ALL_GAMES_FINAL') {
      return (
        <div className="px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 font-bold text-[10px]">
          <span>WEEK {currentWeekDisplay} FINAL · SETTLEMENT NOT CONFIRMED</span>
        </div>
      );
    }
    if (effectiveStatus === 'READY') {
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
  }, [isScopeMismatch, activeTab, effectiveIsSettled, effectiveScoreStatus, effectiveStatus, currentWeekDisplay]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Unified Top Branding Banner */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope={activeTab === 'infamy' ? 'SEASON LEDGER' : `WEEK ${currentWeekDisplay}`}
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
            Zero penalty shot videos have been uploaded for Week {currentWeekDisplay}.
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
            ladder={effectiveLadder}
            status={effectiveStatus}
            weekNumber={currentWeekDisplay}
            isSettled={effectiveIsSettled}
            scoreStatus={effectiveScoreStatus}
            errorMessage={isScopeMismatch ? undefined : snapshot.errorMessage}
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
            currentWeek={currentWeekDisplay}
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
