import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { scopedExpressFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, CheckCircle2, AlertCircle, RefreshCw, Shield, ChevronDown, WifiOff, X, Calendar } from 'lucide-react';
import { PickPresetControls } from './PickPresetControls';
import { CompactPicksList } from './picks/CompactPicksList';
import { SwipePickDeck } from './picks/SwipePickDeck';
import { UndoSnackbar } from './picks/UndoSnackbar';
import { WeeklyTiebreakerCard } from './picks/WeeklyTiebreakerCard';
import { quickFillSafetyEngine, SlateGameItem } from '../services/QuickFillSafetyEngine';
import { formatGameKickoff } from '../utils/dateUtils';
import { triggerHaptic } from '../utils/haptics';
import { isKickoffLocked } from '../services/lockEnforcementService';
import { fetchLiveNFLScores } from '../services/liveScoreService';
import { getCurrentNFLWeek } from '../services/nflCalendarService';
import { resolveCanonicalGameKickoff, areTeamIdentitiesEquivalent, normalizeTeamIdentity } from '../services/dependableInfoService';
import type { MatrixResponsePayload } from './LeagueMatrixView';
import { AppHeader } from './common/AppHeader';

export interface GameItem {
  id: string;
  externalGameId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  homeScore: number | null;
  awayScore: number | null;
  spread?: number | null;
  userPick: string | null;
  pickId: string | null;
  isLive?: boolean;
  gameStatus?: 'FINAL' | 'LIVE' | 'SCHEDULED' | string;
  displayClock?: string;
  periodLabel?: string;
  possession?: string;
  inRedZone?: boolean;
}

export interface PoolInfo {
  id: string;
  name: string;
  lock_offset: number;
  hide_picks_until_kickoff?: boolean;
}

const DEFAULT_POOL: PoolInfo = {
  id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
  name: 'Main League',
  lock_offset: 0,
  hide_picks_until_kickoff: true,
};

export const WeeklyPicks: React.FC = () => {
  const { token, user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState<number>(() => getCurrentNFLWeek());
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [games, setGames] = useState<GameItem[]>([]);
  const [pool, setPool] = useState<PoolInfo | null>(DEFAULT_POOL);
  const [matrixData, setMatrixData] = useState<MatrixResponsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPickForGameId, setSavingPickForGameId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [now, setNow] = useState(new Date());

  const [picksViewMode, setPicksViewMode] = useState<'swipe' | 'list'>(() => {
    const saved = localStorage.getItem('pickem_preferred_view_mode') || localStorage.getItem('picks_view_preference');
    return (saved === 'swipe' || saved === 'list') ? (saved as 'swipe' | 'list') : 'swipe';
  });

  const [snackbarState, setSnackbarState] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ''
  });

  interface PendingBulkAction {
    type: 'PRESET' | 'CLEAR';
    description: string;
    updatedPicks?: Record<string, string | null>;
    editableCount: number;
    lockedCount: number;
  }
  const [pendingBulkAction, setPendingBulkAction] = useState<PendingBulkAction | null>(null);
  const [lastBulkSnapshot, setLastBulkSnapshot] = useState<Record<string, string> | null>(null);

  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  // USER STATE ISOLATION:
  // When user changes or on initial mount, IMMEDIATELY reset in-memory pick state
  useEffect(() => {
    setUserPicks({});
  }, [user?.id]);

  const userPicksCacheKey = `picks_${user?.id}_${activePoolId}_w${selectedWeek}`;

  const [isPicksProtected, setIsPicksProtected] = useState<boolean>(() => {
    return localStorage.getItem('user_picks_protected') === 'true';
  });

  const togglePicksProtection = () => {
    const next = !isPicksProtected;
    setIsPicksProtected(next);
    localStorage.setItem('user_picks_protected', String(next));
    triggerHaptic('selection');
  };

  // Network online/offline detection

  const handleTogglePicksView = (mode: 'swipe' | 'list') => {
    setPicksViewMode(mode);
    try {
      localStorage.setItem('pickem_preferred_view_mode', mode);
      localStorage.setItem('picks_view_preference', mode);
    } catch {}
  };

  // Smart Mode Default: when no saved preference exists, default to 'list' if all games picked, else 'swipe'
  useEffect(() => {
    const saved = localStorage.getItem('pickem_preferred_view_mode') || localStorage.getItem('picks_view_preference');
    if (!saved && games.length > 0) {
      const pickedCount = Object.keys(userPicks).filter((k) => Boolean(userPicks[k])).length;
      if (pickedCount === games.length) {
        setPicksViewMode('list');
      } else {
        setPicksViewMode('swipe');
      }
    }
  }, [games.length, userPicks]);

  // Update clock every 10 seconds for real-time lock updates
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const slateCacheKey = `picks_slate_${activePoolId}_w${selectedWeek}`;

    // 1. Rehydrate initial cached state if available for instant render
    let cachedGames: GameItem[] = [];
    try {
      const cachedStr = localStorage.getItem(slateCacheKey);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        cachedGames = [...parsed].sort(
          (a, b) => new Date(a.kickoffTime || a.kickoff_time).getTime() - new Date(b.kickoffTime || b.kickoff_time).getTime()
        );
        setGames(cachedGames);
      }
    } catch (_) {}

    try {
      // 2. Fetch live scores and ESPN scoreboard API for selectedWeek
      let liveScoresMap = new Map<string, any>();
      try {
        const liveScores = await fetchLiveNFLScores(selectedWeek);
        liveScores.forEach((ls) => {
          liveScoresMap.set(ls.id, ls);
          liveScoresMap.set(`${ls.awayTeam.code}@${ls.homeTeam.code}`, ls);
        });
      } catch (scoreErr) {
        console.warn('Live score fetch warning:', scoreErr);
      }

      const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${selectedWeek}`;
      const response = await fetch(espnUrl);

      if (!response.ok) {
        throw new Error(`ESPN responded with status ${response.status}`);
      }

      const data = await response.json();
      setIsOffline(false);

      // Map ESPN events to GameItem enriched with live scores
      const espnGames: GameItem[] = (data.events || []).map((event: any) => {
        const competition = event.competitions?.[0];
        const competitors = competition?.competitors || [];
        const home = competitors.find((c: any) => c.homeAway === 'home') || {};
        const away = competitors.find((c: any) => c.homeAway === 'away') || {};
        const rawHomeAbbr = home.team?.abbreviation || 'HOM';
        const rawAwayAbbr = away.team?.abbreviation || 'AWY';
        const homeAbbr = normalizeTeamIdentity(rawHomeAbbr);
        const awayAbbr = normalizeTeamIdentity(rawAwayAbbr);
        const statusName = event.status?.type?.name || '';
        const statusDetail = event.status?.type?.detail || event.status?.type?.description || event.status?.type?.shortDetail || '';
        const isHalftime = statusName === 'STATUS_HALFTIME' || statusDetail.toLowerCase().includes('halftime');

        const liveScore =
          liveScoresMap.get(event.id) ||
          liveScoresMap.get(`${awayAbbr}@${homeAbbr}`);

        let mappedStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' = 'SCHEDULED';
        if (liveScore?.status) {
          mappedStatus = liveScore.status;
        } else if (statusName === 'STATUS_FINAL') {
          mappedStatus = 'FINAL';
        } else if (isHalftime || statusName === 'STATUS_IN_PROGRESS') {
          mappedStatus = 'IN_PROGRESS';
        }

        let gameStatus: 'FINAL' | 'LIVE' | 'SCHEDULED' = 'SCHEDULED';
        if (mappedStatus === 'FINAL') {
          gameStatus = 'FINAL';
        } else if (mappedStatus === 'IN_PROGRESS') {
          gameStatus = 'LIVE';
        }

        const homeScoreVal =
          liveScore?.homeTeam?.score != null && !isNaN(parseInt(liveScore.homeTeam.score, 10))
            ? parseInt(liveScore.homeTeam.score, 10)
            : home.score
            ? parseInt(home.score, 10)
            : null;
        const awayScoreVal =
          liveScore?.awayTeam?.score != null && !isNaN(parseInt(liveScore.awayTeam.score, 10))
            ? parseInt(liveScore.awayTeam.score, 10)
            : away.score
            ? parseInt(away.score, 10)
            : null;

        const displayClockVal =
          liveScore?.displayClock ||
          (isHalftime ? 'HALFTIME' : event.status?.displayClock || '0:00');
        const rawPeriod = Number(event.status?.period) || 1;
        const periodLabelVal =
          liveScore?.periodLabel ||
          (mappedStatus === 'FINAL' ? 'FINAL' : isHalftime ? 'HALF' : (rawPeriod >= 5 ? 'OT' : `Q${rawPeriod}`));

        let spread: number | null = null;
        const oddsDetail = competition?.odds?.[0]?.details;
        if (oddsDetail) {
          const match = oddsDetail.match(/-?[\d.]+/);
          if (match) spread = parseFloat(match[0]);
        }

        const canonicalKo = resolveCanonicalGameKickoff({
          id: event.id,
          awayTeam: awayAbbr,
          homeTeam: homeAbbr,
          kickoffIso: event.date,
          season: 2026,
          seasonType: 2,
          week: selectedWeek,
        });

        return {
          id: canonicalKo.gameId,
          externalGameId: event.id,
          homeTeamId: homeAbbr,
          awayTeamId: awayAbbr,
          kickoffTime: canonicalKo.kickoffIso,
          status: mappedStatus,
          homeScore: homeScoreVal,
          awayScore: awayScoreVal,
          spread,
          userPick: null,
          pickId: null,
          isLive: mappedStatus === 'IN_PROGRESS',
          gameStatus,
          displayClock: displayClockVal,
          periodLabel: periodLabelVal,
          possession: competition?.situation?.possession,
          inRedZone: Boolean(competition?.situation?.isRedZone),
        };
      });

      // 3. Rehydrate user picks from localStorage and Supabase strictly scoped by active user
      let userPicksMap: Record<string, string> = {};
      try {
        const savedPicks = localStorage.getItem(userPicksCacheKey);
        if (savedPicks) {
          userPicksMap = JSON.parse(savedPicks);
          setUserPicks(userPicksMap);
        }
      } catch (_) {}

      // Query Supabase for cloud picks strictly filtered by active user
      if (user?.id) {
        try {
          const { data: dbPicks, error } = await supabase
            .from('picks')
            .select('game_id, matchup_id, selected_team')
            .eq('pool_id', activePoolId)
            .eq('user_id', user.id)
            .eq('week', selectedWeek);

          if (dbPicks && Array.isArray(dbPicks) && dbPicks.length > 0) {
            const cloudMap: Record<string, string> = {};
            dbPicks.forEach((p: any) => {
              const gId = p.game_id || p.matchup_id;
              if (gId && p.selected_team) {
                cloudMap[String(gId)] = p.selected_team;
              }
            });
            userPicksMap = cloudMap;
            setUserPicks(cloudMap);
            try {
              localStorage.setItem(userPicksCacheKey, JSON.stringify(cloudMap));
            } catch (_) {}
          } else {
            // If cloud returns empty array, check user-scoped localStorage cache before defaulting to empty
            try {
              const saved = localStorage.getItem(userPicksCacheKey);
              if (saved) {
                userPicksMap = JSON.parse(saved);
                setUserPicks(userPicksMap);
              }
            } catch (_) {}
          }
        } catch (sbErr) {
          console.warn('Supabase picks rehydration warning:', sbErr);
        }
      }

      // Merge picks onto games
      const mergedGames = espnGames.map((g) => ({
        ...g,
        userPick: userPicksMap[g.id] || null,
      }));

      // Strictly sort chronologically by kickoff timestamp (Decision #66)
      const sortedGames = [...mergedGames].sort(
        (a, b) => new Date(a.kickoffTime || (a as any).kickoff_time).getTime() - new Date(b.kickoffTime || (b as any).kickoff_time).getTime()
      );

      setGames(sortedGames);
      try {
        localStorage.setItem(slateCacheKey, JSON.stringify(sortedGames));
      } catch (_) {}

      // 4. Load pool info & prefetch matrix if available
      try {
        const { data: poolData } = await supabase
          .from('pools')
          .select('*')
          .eq('id', DEFAULT_POOL.id)
          .maybeSingle();

        if (poolData) {
          setPool({
            id: poolData.id,
            name: poolData.name,
            lock_offset: poolData.settings?.lock_offset || 0,
            hide_picks_until_kickoff: poolData.settings?.hide_picks_until_kickoff ?? true,
          });
        }
      } catch (_) {}

      if (token) {
        try {
          const matrixRes = await scopedExpressFetch(`/api/pools/${DEFAULT_POOL.id}/matrix`);
          if (matrixRes.ok) {
            const mData = await matrixRes.json();
            setMatrixData(mData);
          }
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('Network error fetching games slate:', err);
      setIsOffline(true);
      // Gracefully fall back to cached games without raising raw "Failed to fetch" banner
      if (cachedGames.length === 0) {
        try {
          const fallbackCached = localStorage.getItem(slateCacheKey);
          if (fallbackCached) {
            const parsed = JSON.parse(fallbackCached);
            const sortedFallback = [...parsed].sort(
              (a, b) => new Date(a.kickoffTime || a.kickoff_time).getTime() - new Date(b.kickoffTime || b.kickoff_time).getTime()
            );
            setGames(sortedFallback);
          }
        } catch (_) {}
      }
    } finally {
      setLoading(false);
    }
  }, [selectedWeek, token, user?.id]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // AUTO_LIVE_SYNC_INTERVAL: Poll slate every 10s during live games
  React.useEffect(() => {
    const liveInterval = setInterval(() => {
      const hasLiveGame = games.some((g: any) => g.isLive || g.status === 'IN_PROGRESS');
      if (hasLiveGame && !isOffline) {
        if (typeof fetchGames === 'function') {
          fetchGames();
        }
      }
    }, 10000);
    return () => clearInterval(liveInterval);
  }, [games, fetchGames, isOffline]);

  const handlePick = async (game: GameItem, selectedTeamId: string) => {
    if (isPicksProtected) {
      setFeedbackMessage({
        text: 'Picks are protected against accidental edits. Tap PICKS PROTECTED at the top to unlock.',
        type: 'error'
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
      triggerHaptic('impactHeavy');
      return;
    }
    if (!pool) return;
    if (isGameLocked(game) || isKickoffLocked(game.kickoffTime, now)) {
      const formattedTime = formatKickoff(game.kickoffTime);
      setFeedbackMessage({ text: `Matchup locked: Kickoff passed on ${formattedTime}.`, type: 'error' });
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }

    setSavingPickForGameId(game.id);
    const isUnselecting = areTeamIdentitiesEquivalent(userPicks[game.id] || game.userPick, selectedTeamId);
    const teamToSend = isUnselecting ? null : selectedTeamId;

    // 1. Optimistically update local state
    const updatedUserPicks = { ...userPicks };
    if (teamToSend) {
      updatedUserPicks[game.id] = teamToSend;
    } else {
      delete updatedUserPicks[game.id];
    }
    setUserPicks(updatedUserPicks);

    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, userPick: teamToSend } : g))
    );

    // 2. Persist to localStorage
    try {
      localStorage.setItem(userPicksCacheKey, JSON.stringify(updatedUserPicks));
    } catch (e) {
      console.warn('localStorage save warning:', e);
    }

    // 3. Persist directly to Supabase cloud
    if (user?.id) {
      try {
        if (teamToSend) {
          const { error } = await supabase.from('picks').upsert({
            pool_id: activePoolId,
            user_id: user.id,
            week: selectedWeek,
            game_id: String(game.id),
            selected_team: teamToSend,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'pool_id,user_id,week,game_id'
          });
          if (error) console.error('Failed to persist pick to Supabase:', error);
        } else {
          const { error } = await supabase.from('picks').delete().match({
            pool_id: activePoolId,
            user_id: user.id,
            week: selectedWeek,
            game_id: String(game.id),
          });
          if (error) console.warn('Supabase pick delete warning:', error);
        }
      } catch (sbErr) {
        console.warn('Supabase pick persist warning:', sbErr);
      }
    }

    // 4. Background notification to backend API if configured
    if (token) {
      scopedExpressFetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pool_id: pool.id,
          game_id: game.id,
          selected_team_id: teamToSend,
        }),
      }).catch((err) => console.warn('Backend proxy save warning:', err));
    }

    triggerHaptic('impactLight');
    setSavingPickForGameId(null);
  };

  /**
   * Clears all unlocked picks across the active slate.
   */
  /**
   * Clears all unlocked picks across the active slate.
   */
  const performClearAllPicks = async () => {
    if (isPicksProtected || !pool || !user?.id) return;
    const unlockedPickedGames = games.filter((g) => !isGameLocked(g) && !isGameKickoffLocked(g) && g.userPick);
    if (unlockedPickedGames.length === 0) return;

    // Optimistically clear picks in local state
    const updatedUserPicks = { ...userPicks };
    unlockedPickedGames.forEach((g) => delete updatedUserPicks[g.id]);
    setUserPicks(updatedUserPicks);

    setGames((prev) =>
      prev.map((g) => (!isGameLocked(g) && !isGameKickoffLocked(g) ? { ...g, userPick: null } : g))
    );

    // Clear in localStorage
    try {
      localStorage.setItem(userPicksCacheKey, JSON.stringify(updatedUserPicks));
    } catch (e) {
      console.warn('localStorage clear warning:', e);
    }

    // Clear in Supabase
    try {
      await Promise.all(
        unlockedPickedGames.map((game) =>
          supabase.from('picks').delete().match({
            pool_id: activePoolId,
            user_id: user.id,
            matchup_id: game.id,
          })
        )
      );
    } catch (sbErr) {
      console.warn('Supabase clear warning:', sbErr);
    }

    // Backend proxy if configured
    if (token) {
      Promise.all(
        unlockedPickedGames.map((game) =>
          scopedExpressFetch('/api/picks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pool_id: pool.id,
              game_id: game.id,
              selected_team_id: null,
            }),
          })
        )
      ).catch((err) => console.warn('Backend clear warning:', err));
    }

    triggerHaptic('impactMedium');
  };

  const handleClearAllPicks = () => {
    if (isPicksProtected) {
      setFeedbackMessage({
        text: 'Picks are protected against accidental edits. Tap PICKS PROTECTED at the top to unlock.',
        type: 'error',
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
      triggerHaptic('impactHeavy');
      return;
    }
    const editablePicked = games.filter((g) => !isGameLocked(g) && !isGameKickoffLocked(g) && (userPicks[g.id] || g.userPick));
    const lockedCount = games.filter((g) => isGameLocked(g) || isGameKickoffLocked(g)).length;
    if (editablePicked.length === 0) return;
    setPendingBulkAction({
      type: 'CLEAR',
      description: 'Clear all picks',
      editableCount: editablePicked.length,
      lockedCount,
    });
  };

  /**
   * Applies quick-fill presets through the QuickFillSafetyEngine with a 7-second undo grace period.
   */
  const performApplyPreset = (updatedPicks: Record<string, string | null>, presetDescription: string) => {
    if (isPicksProtected || !pool) return;

    const slateItems: SlateGameItem[] = games.map((g) => ({
      gameId: g.id,
      awayTeam: g.awayTeamId,
      homeTeam: g.homeTeamId,
      favorite: typeof g.spread === 'number' ? (g.spread < 0 ? g.homeTeamId : g.awayTeamId) : g.homeTeamId,
      isLocked: isGameLocked(g) || isGameKickoffLocked(g),
    }));

    const currentPicksMap: Record<string, string> = {};
    for (const g of games) {
      if (g.userPick) currentPicksMap[g.id] = g.userPick;
    }

    // 1. Optimistically update local state
    setGames((prev) =>
      prev.map((game) => {
        if (!isGameLocked(game) && !isGameKickoffLocked(game) && Object.prototype.hasOwnProperty.call(updatedPicks, game.id)) {
          return { ...game, userPick: updatedPicks[game.id] };
        }
        return game;
      })
    );

    // 2. Open 7s Undo Snackbar
    setSnackbarState({
      isOpen: true,
      message: `${presetDescription}. Tap Undo to revert.`
    });

    // 3. Stage in safety engine with commit callback
    quickFillSafetyEngine.stagePreset(
      slateItems,
      currentPicksMap,
      'FAVORITES',
      async (finalPicks) => {
        try {
          // Persist to localStorage
          try {
            const savedMap = JSON.parse(localStorage.getItem(userPicksCacheKey) || '{}');
            Object.assign(savedMap, finalPicks);
            setUserPicks(savedMap);
            localStorage.setItem(userPicksCacheKey, JSON.stringify(savedMap));
          } catch (e) {
            console.warn('localStorage preset save warning:', e);
          }

          // Persist to Supabase
          if (user?.id) {
            try {
              const upsertRows = Object.entries(finalPicks).map(([gameId, selectedTeamId]) => ({
                pool_id: activePoolId,
                user_id: user.id,
                week: selectedWeek,
                game_id: String(gameId),
                selected_team: selectedTeamId,
                updated_at: new Date().toISOString(),
              }));
              await supabase.from('picks').upsert(upsertRows, { onConflict: 'pool_id,user_id,week,game_id' });
            } catch (sbErr) {
              console.warn('Supabase preset save warning:', sbErr);
            }
          }

          // Backend proxy if configured
          if (token) {
            const entries = Object.entries(finalPicks);
            const batchPayload = entries.map(([gameId, selectedTeamId]) => ({
              game_id: gameId,
              selected_team_id: selectedTeamId,
            }));

            try {
              const batchRes = await scopedExpressFetch('/api/picks/batch', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  pool_id: pool.id,
                  picks: batchPayload,
                }),
              });

              if (!batchRes.ok) {
                await Promise.all(
                  entries.map(([gameId, selectedTeamId]) =>
                    scopedExpressFetch('/api/picks', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        pool_id: pool.id,
                        game_id: gameId,
                        selected_team_id: selectedTeamId,
                      }),
                    })
                  )
                );
              }
            } catch (proxyErr) {
              console.warn('Backend proxy batch warning:', proxyErr);
            }
          }

          triggerHaptic('selection');
        } catch (err: any) {
          console.error('Error auto-saving preset:', err);
        }
      }
    );
  };

  const handleApplyPreset = (updatedPicks: Record<string, string | null>, presetDescription: string) => {
    if (isPicksProtected) {
      setFeedbackMessage({
        text: 'Picks are protected against accidental edits. Tap PICKS PROTECTED at the top to unlock.',
        type: 'error'
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
      triggerHaptic('impactHeavy');
      return;
    }
    const isClear = Object.values(updatedPicks).length > 0 && Object.values(updatedPicks).every((v) => v === null);
    const editableGames = games.filter((g) => !isGameLocked(g) && !isGameKickoffLocked(g));
    const lockedCount = games.filter((g) => isGameLocked(g) || isGameKickoffLocked(g)).length;
    setPendingBulkAction({
      type: isClear ? 'CLEAR' : 'PRESET',
      description: presetDescription,
      updatedPicks,
      editableCount: editableGames.length,
      lockedCount,
    });
  };

  const executeBulkAction = async (action: PendingBulkAction) => {
    // Snapshot current unlocked picks before changing
    const snapshot: Record<string, string> = {};
    for (const g of games) {
      if (!isGameLocked(g) && !isGameKickoffLocked(g) && (userPicks[g.id] || g.userPick)) {
        snapshot[g.id] = userPicks[g.id] || (g.userPick as string);
      }
    }
    setLastBulkSnapshot(snapshot);

    if (action.type === 'CLEAR') {
      await performClearAllPicks();
    } else if (action.type === 'PRESET' && action.updatedPicks) {
      performApplyPreset(action.updatedPicks, action.description);
    }
    setPendingBulkAction(null);
  };

  const handleUndoLastBulk = async () => {
    if (!lastBulkSnapshot || isPicksProtected || !user?.id) return;
    const restoredUserPicks = { ...userPicks };
    const gamesToRestore: { gameId: string; team: string }[] = [];

    for (const g of games) {
      if (!isGameLocked(g) && !isGameKickoffLocked(g)) {
        if (lastBulkSnapshot[g.id]) {
          restoredUserPicks[g.id] = lastBulkSnapshot[g.id];
          gamesToRestore.push({ gameId: g.id, team: lastBulkSnapshot[g.id] });
        } else {
          delete restoredUserPicks[g.id];
        }
      }
    }

    setUserPicks(restoredUserPicks);
    setGames((prev) =>
      prev.map((g) => {
        if (!isGameLocked(g) && !isGameKickoffLocked(g)) {
          return { ...g, userPick: restoredUserPicks[g.id] || null };
        }
        return g;
      })
    );

    try {
      localStorage.setItem(userPicksCacheKey, JSON.stringify(restoredUserPicks));
    } catch (_) {}

    try {
      if (gamesToRestore.length > 0) {
        const rows = gamesToRestore.map((item) => ({
          pool_id: activePoolId,
          user_id: user.id,
          week: selectedWeek,
          game_id: item.gameId,
          selected_team: item.team,
          updated_at: new Date().toISOString(),
        }));
        await supabase.from('picks').upsert(rows, { onConflict: 'pool_id,user_id,week,game_id' });
      }
    } catch (err) {
      console.warn('Undo bulk restore warning:', err);
    }

    setLastBulkSnapshot(null);
    triggerHaptic('impactMedium');
    setFeedbackMessage({ text: 'Last bulk action undone.', type: 'success' });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleUndoPreset = () => {
    const reverted = quickFillSafetyEngine.triggerUndo();
    setUserPicks(reverted);
    setGames((prev) =>
      prev.map((g) => ({
        ...g,
        userPick: reverted[g.id] ?? null,
      }))
    );
    try {
      localStorage.setItem(userPicksCacheKey, JSON.stringify(reverted));
    } catch (_) {}
    setSnackbarState({ isOpen: false, message: '' });
    triggerHaptic('impactMedium');
    setFeedbackMessage({ text: 'Preset selections reverted.', type: 'success' });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleSnackbarExpire = () => {
    quickFillSafetyEngine.flushCommit();
    setSnackbarState({ isOpen: false, message: '' });
  };

  const isGameLocked = (game: GameItem): boolean => {
    if (game.status === 'IN_PROGRESS' || game.status === 'FINAL') {
      return true;
    }
    const lockOffsetMinutes = pool?.lock_offset || 0;
    const lockTime = new Date(new Date(game.kickoffTime).getTime() - lockOffsetMinutes * 60 * 1000);
    return now.getTime() >= lockTime.getTime();
  };

  const formatKickoff = (isoString: string) => formatGameKickoff(isoString);

  const isGameKickoffLocked = (g: GameItem): boolean => {
    if (g.status === 'IN_PROGRESS' || g.status === 'FINAL' || g.gameStatus === 'LIVE' || g.gameStatus === 'FINAL' || g.isLive) {
      return true;
    }
    return isKickoffLocked(g.kickoffTime || (g as any).kickoff_time, now);
  };
  const allLocked = games.length > 0 && games.every(g => isGameKickoffLocked(g));
  const lockedCount = games.filter(g => isGameKickoffLocked(g)).length;
  const openCount = games.length - lockedCount;
  const allCompleted = games.length > 0 && games.every(g => g.status === 'FINAL' || g.gameStatus === 'FINAL');

  const setShowWeekModal = setIsWeekModalOpen;
  const viewMode = picksViewMode;
  const setViewMode = handleTogglePicksView;
  const slateStatus: 'OPEN' | 'LOCKED' = (allLocked || allCompleted || games.length === 0) ? 'LOCKED' : (openCount > 0 ? 'OPEN' : 'LOCKED');
  const toastMessage = feedbackMessage?.text;

  return (
    <div className="w-full">
      {/* ROW 1 (Branding & Controls) */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope={`WEEK ${selectedWeek}`}
        phase={
          games.some((g) => g.isLive || g.status === 'IN_PROGRESS' || g.gameStatus === 'LIVE')
            ? 'GAMES LIVE'
            : allCompleted
            ? 'SETTLED'
            : 'PRE-KICKOFF'
        }
        rightContent={
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border flex items-center gap-1 ${
              slateStatus === 'OPEN' 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              {slateStatus === 'OPEN' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              <span>{slateStatus === 'OPEN' ? 'OPEN' : 'LOCKED'}</span>
            </div>

            <button
              onClick={togglePicksProtection}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold border transition-all ${
                isPicksProtected
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
              title={
                isPicksProtected
                  ? 'SUBMITTED · EDIT LOCKED (TAP TO EDIT)'
                  : games.length > 0 && Object.keys(userPicks).filter((k) => Boolean(userPicks[k])).length >= games.length
                  ? 'SUBMITTED · EDITABLE'
                  : 'DRAFT · UNSUBMITTED'
              }
            >
              {isPicksProtected ? <Lock className="w-3 h-3 text-amber-400"/> : <Unlock className="w-3 h-3 text-zinc-400"/>}
              <span className="hidden xs:inline">
                {isPicksProtected
                  ? 'LOCKED'
                  : games.length > 0 && Object.keys(userPicks).filter((k) => Boolean(userPicks[k])).length >= games.length
                  ? 'SUBMITTED'
                  : 'DRAFT'}
              </span>
            </button>
          </div>
        }
      />

      {/* ROW 2 (Sub-navigation) */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/50">
          {/* Week Selector Dropdown */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowWeekModal(true)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700/80 text-white text-xs font-bold">
              <span>WEEK {selectedWeek}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400"/>
            </button>
            {isOffline && (
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="hidden xs:inline">OFFLINE</span>
              </div>
            )}
          </div>

          {/* Swipe / List Segmented Toggle */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button onClick={() => setViewMode('swipe')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'swipe' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-400 hover:text-white'}`}>Swipe</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-400 hover:text-white'}`}>List</button>
          </div>
        </div>

      {/* Accidental-Edit Guard Explanatory Sub-Banner */}
      {isPicksProtected && (
        <div className="mx-4 mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <span>🛡️ Accidental-Edit Guard Active: Your {Object.keys(userPicks).filter((k) => Boolean(userPicks[k])).length || games.length} submitted picks are counted in the pool. Tap 'Unlock to Edit' to change any game whose official kickoff has not passed ({lockedCount} of {games.length} kickoff-locked).</span>
          </div>
          <button
            onClick={togglePicksProtection}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-[11px] uppercase tracking-wider transition"
          >
            Unlock to Edit
          </button>
        </div>
      )}

      {/* Floating Warning/Feedback Toast (Non-reflowing fixed overlay) */}
      {toastMessage && (
        <div className="fixed top-20 left-4 right-4 z-50 flex items-center justify-center p-3 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Content Rendering */}
      {loading && games.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-medium">Loading NFL matchups and live odds...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="py-20 text-center font-mono text-sm text-slate-400 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-md mx-auto">
          <span className="text-3xl mb-3 block animate-pulse">🏈</span>
          <p className="font-bold text-slate-200 uppercase tracking-wide mb-1">Slate Unavailable</p>
          <p className="text-xs text-slate-400">No active matchup slate available for Week {selectedWeek}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bulk Action Confirmation Banner */}
          {pendingBulkAction && (
            <div className="p-3 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-fade-in">
              <div className="text-xs">
                <span className="font-bold text-cyan-300 uppercase tracking-wide mr-2">Confirm Bulk Action:</span>
                <span>
                  {pendingBulkAction.type === 'CLEAR'
                    ? `Clear all ${pendingBulkAction.editableCount} editable picks${pendingBulkAction.lockedCount > 0 ? ` (${pendingBulkAction.lockedCount} locked games stay fixed)` : ''}?`
                    : `Apply preset to ${pendingBulkAction.editableCount} editable games${pendingBulkAction.lockedCount > 0 ? ` (${pendingBulkAction.lockedCount} locked games stay fixed)` : ''}?`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => executeBulkAction(pendingBulkAction)}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setPendingBulkAction(null)}
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors border border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Pre-Lock Undo Last Bulk Action Pill */}
          {lastBulkSnapshot && !pendingBulkAction && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs animate-fade-in">
              <span>Bulk action applied.</span>
              <button
                onClick={handleUndoLastBulk}
                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Undo Last Bulk Action
              </button>
            </div>
          )}

          {/* Inline Weekly Tiebreaker Card (Section 6) */}
          <WeeklyTiebreakerCard
            week={selectedWeek}
            poolId={activePoolId}
            hasPicksWithoutTiebreaker={Object.keys(userPicks).length > 0}
          />

          {/* Quick-Fill Presets Toolbar */}
          <PickPresetControls
            games={games}
            isGameLocked={isGameLocked}
            onApplyPreset={handleApplyPreset}
            matrixCells={matrixData?.cells}
            matrixMembers={matrixData?.columns}
            hidePicksUntilKickoff={
              matrixData?.metadata?.hide_picks_until_kickoff ??
              pool?.hide_picks_until_kickoff ??
              true
            }
            currentUserId={user?.id}
            disabled={loading || games.length === 0}
          />

          {picksViewMode === 'swipe' ? (
            /* Fast-Decision Tinder-Style Swipe Deck */
            <SwipePickDeck
              key={`swipe-deck-week-${selectedWeek}`}
              matchups={games.map((g: any) => ({
                id: g.id,
                gameId: g.id,
                awayTeam: g.awayTeamId,
                homeTeam: g.homeTeamId,
                awayScore: g.awayScore ?? undefined,
                homeScore: g.homeScore ?? undefined,
                isLive: Boolean(g.isLive || g.status === 'IN_PROGRESS' || g.gameStatus === 'LIVE'),
                gameStatus: (g.gameStatus === 'FINAL' || g.status === 'FINAL' ? 'FINAL' : g.gameStatus === 'LIVE' || g.status === 'IN_PROGRESS' || g.isLive ? 'LIVE' : 'SCHEDULED'),
                displayClock: g.displayClock,
                periodLabel: g.periodLabel,
                possession: g.possession,
                inRedZone: g.inRedZone,
                startTime: formatKickoff(g.kickoffTime),
                kickoffTime: g.kickoffTime,
                spread: typeof g.spread === 'number' ? `${g.spread}` : (typeof g.spread === 'string' ? g.spread : undefined),
                selectedTeam: g.userPick,
                isLocked: isGameLocked(g) || isGameKickoffLocked(g),
              }))}
              onSelectPick={(gameId, team) => {
                const targetGame = games.find((g) => g.id === gameId);
                if (targetGame) handlePick(targetGame, team);
                try {
                  if ((window as any).Capacitor?.isPluginAvailable('Haptics')) {
                    (window as any).Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
                  }
                } catch (_) {}
              }}
              onClearAllPicks={handleClearAllPicks}
              isUserLocked={isPicksProtected}
              isPicksProtected={isPicksProtected}
            />
          ) : (
            /* High-Density Compact List View */
            <CompactPicksList
              games={games.map((g) => ({
                gameId: g.id,
                awayTeam: g.awayTeamId,
                homeTeam: g.homeTeamId,
                kickoffTime: formatKickoff(g.kickoffTime),
                isLocked: isGameLocked(g) || isGameKickoffLocked(g),
                spread: typeof g.spread === 'number' ? `${g.spread}` : undefined,
                gameStatus: (g.gameStatus === 'FINAL' || g.status === 'FINAL' ? 'FINAL' : g.gameStatus === 'LIVE' || g.status === 'IN_PROGRESS' || g.isLive ? 'LIVE' : 'SCHEDULED') as 'FINAL' | 'LIVE' | 'SCHEDULED',
                homeScore: g.homeScore,
                awayScore: g.awayScore,
                displayClock: g.displayClock,
                periodLabel: g.periodLabel,
              }))}
              selectedPicks={userPicks}
              onSelectTeam={(gameId, team) => {
                const targetGame = games.find((g) => g.id === gameId);
                if (targetGame) handlePick(targetGame, team);
              }}
              isPicksProtected={isPicksProtected}
              onLockedClick={(g) => {
                if (isPicksProtected) {
                  setFeedbackMessage({
                    text: 'Picks are protected against accidental edits. Tap PICKS PROTECTED at the top to unlock.',
                    type: 'error',
                  });
                  setTimeout(() => setFeedbackMessage(null), 3500);
                  triggerHaptic('impactHeavy');
                } else if (g.isLocked) {
                  setFeedbackMessage({
                    text: `Matchup locked: Kickoff passed on ${g.kickoffTime}.`,
                    type: 'error',
                  });
                  setTimeout(() => setFeedbackMessage(null), 3500);
                  triggerHaptic('impactHeavy');
                }
              }}
            />
          )}
        </div>
      )}

      {/* 7-Second Undo Snackbar */}
      <UndoSnackbar
        isOpen={snackbarState.isOpen}
        message={snackbarState.message}
        onUndo={handleUndoPreset}
        onExpire={handleSnackbarExpire}
      />

      {/* Interactive Week Selection Sheet / Modal (Weeks 1 to 18) */}
      {isWeekModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsWeekModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black font-mono tracking-wider text-zinc-100 uppercase">
                  Select NFL Slate Week
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWeekModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[60vh]">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => {
                const isSelected = week === selectedWeek;
                let statusText = 'Upcoming';
                let statusClass = 'text-zinc-500 bg-zinc-900 border-zinc-800';

                if (week < 5) {
                  statusText = 'Completed';
                  statusClass = 'text-zinc-400 bg-zinc-900 border-zinc-800';
                } else if (week === 5) {
                  statusText = 'Finalizing';
                  statusClass = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
                } else if (week === 6) {
                  statusText = 'Open for Picks';
                  statusClass = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
                }

                return (
                  <button
                    key={week}
                    type="button"
                    onClick={() => {
                      setSelectedWeek(week);
                      localStorage.setItem('nfl_picks_active_week', String(week));
                      setIsWeekModalOpen(false);
                      triggerHaptic('selection');
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/40 text-cyan-100'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm">Week {week}</span>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-cyan-500/20">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border ${statusClass}`}>
                      Week {week} ({statusText})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
