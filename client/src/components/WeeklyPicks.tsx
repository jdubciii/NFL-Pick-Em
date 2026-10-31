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
import { isKickoffLocked, evaluateCanonicalGameLock, evaluateSlateLockSummary } from '../services/lockEnforcementService';
import { fetchLiveNFLScores, type LiveGame } from '../services/liveScoreService';
import { getCurrentNFLWeek } from '../services/nflCalendarService';
import { resolveCanonicalGameKickoff, areTeamIdentitiesEquivalent, normalizeTeamIdentity } from '../services/dependableInfoService';
import {
  resolveAuthoritativeSlate,
  getHighestCachedSlateRevision,
  saveScopedSlateRevisionCache,
} from '../services/authoritativeSlateClientService';
import type { MatrixResponsePayload } from './LeagueMatrixView';
import { AppHeader } from './common/AppHeader';
import { EmptyStateWireframe } from './common/EmptyStateWireframe';
import {
  reconcileCloudPicks,
  filterPresetEligiblePicks,
  validateBatchOutcomes,
} from './weeklyPicksHelpers';
export {
  reconcileCloudPicks,
  filterPresetEligiblePicks,
  validateBatchOutcomes,
} from './weeklyPicksHelpers';

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
  lock_offset?: number;
  hide_picks_until_kickoff?: boolean;
}

const DEFAULT_POOL: PoolInfo = {
  id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
  name: 'Main League',
  hide_picks_until_kickoff: false,
};

function parseAndValidateLockOffset(rawOffset: any): { valid: true; offset: number } | { valid: false } {
  if (rawOffset === undefined || rawOffset === null) {
    return { valid: true, offset: 0 };
  }
  if (typeof rawOffset === 'boolean') {
    return { valid: false };
  }
  if (typeof rawOffset === 'string' && rawOffset.trim() === '') {
    return { valid: false };
  }
  const num = Number(rawOffset);
  if (Number.isFinite(num) && num >= 0) {
    return { valid: true, offset: num };
  }
  return { valid: false };
}

export const WeeklyPicks: React.FC = () => {
  const { token, user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState<number>(() => getCurrentNFLWeek());
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const activePoolId = DEFAULT_POOL.id;
  const [settingsRetryGen, setSettingsRetryGen] = useState<number>(0);
  const [poolSettingsState, setPoolSettingsState] = useState<{
    poolId: string;
    status: 'LOADING' | 'READY' | 'ERROR';
    offset: number;
    errorMessage?: string;
  }>({
    poolId: activePoolId,
    status: 'LOADING',
    offset: 0,
  });
  const settingsGenRef = React.useRef(0);

  const [games, setGames] = useState<GameItem[]>([]);
  const [liveScores, setLiveScores] = useState<LiveGame[]>([]);
  const [pool, setPool] = useState<PoolInfo | null>(DEFAULT_POOL);
  const [matrixData, setMatrixData] = useState<MatrixResponsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPickForGameId, setSavingPickForGameId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [now, setNow] = useState(new Date());
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

  const [picksViewMode, setPicksViewMode] = useState<'swipe' | 'list'>(() => {
    try {
      const saved = typeof localStorage !== 'undefined'
        ? (localStorage.getItem('pickem_preferred_view_mode') || localStorage.getItem('picks_view_preference'))
        : null;
      return (saved === 'swipe' || saved === 'list') ? (saved as 'swipe' | 'list') : 'swipe';
    } catch (_) {
      return 'swipe';
    }
  });

  const [snackbarState, setSnackbarState] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ''
  });

  interface PendingBulkAction {
    type: 'PRESET' | 'CLEAR';
    description: string;
    updatedPicks?: Record<string, string | null>;
    presetType?: any;
    editableCount: number;
    lockedCount: number;
  }
  const [pendingBulkAction, setPendingBulkAction] = useState<PendingBulkAction | null>(null);
  const [lastBulkSnapshot, setLastBulkSnapshot] = useState<Record<string, string> | null>(null);

  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  const [conflictedGameIds, setConflictedGameIds] = useState<Set<string>>(new Set());
  const [, setPickMutationStatus] = useState<Record<string, 'SAVING' | 'CONFIRMED' | 'FAILED'>>({});

  const getUniquePickedCount = useCallback((gameList: GameItem[], picksMap: Record<string, string>) => {
    return gameList.filter((g) => {
      const ext = String((g as any).externalGameId || (g as any).external_game_id || '');
      return Boolean(picksMap[g.id] || (ext && picksMap[ext]) || g.userPick);
    }).length;
  }, []);

  // Dedicated pool settings readiness effect with current-pool/request generation ownership
  useEffect(() => {
    let isMounted = true;
    const currentGen = ++settingsGenRef.current;
    const targetPoolId = activePoolId;

    setPoolSettingsState({
      poolId: targetPoolId,
      status: 'LOADING',
      offset: 0,
    });

    async function loadPoolSettings() {
      try {
        const { data, error } = await supabase
          .from('pools')
          .select('id, name, settings')
          .eq('id', targetPoolId)
          .maybeSingle();

        if (!isMounted || currentGen !== settingsGenRef.current) return;

        if (error || !data || !data.settings || typeof data.settings !== 'object') {
          setPoolSettingsState({
            poolId: targetPoolId,
            status: 'ERROR',
            offset: 0,
            errorMessage: 'Failed to retrieve pool settings.',
          });
          return;
        }

        const settings = (data.settings as any) || {};
        const rawOffset = settings.lock_offset ?? settings.lockOffset;
        const validation = parseAndValidateLockOffset(rawOffset);

        if (validation.valid) {
          setPoolSettingsState({
            poolId: targetPoolId,
            status: 'READY',
            offset: validation.offset,
          });
          if (data.name) {
            setPool((prev) => (prev ? { ...prev, name: data.name } : { id: targetPoolId, name: data.name }));
          }
        } else {
          setPoolSettingsState({
            poolId: targetPoolId,
            status: 'ERROR',
            offset: 0,
            errorMessage: 'Invalid pool lock offset configuration.',
          });
        }
      } catch (err: any) {
        if (isMounted && currentGen === settingsGenRef.current) {
          setPoolSettingsState({
            poolId: targetPoolId,
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

  // USER STATE ISOLATION:
  // When user changes or on initial mount, IMMEDIATELY reset in-memory pick state
  useEffect(() => {
    setUserPicks({});
  }, [user?.id]);

  const userPicksCacheKey = `picks_${user?.id}_${activePoolId}_w${selectedWeek}`;

  const [isPicksProtected, setIsPicksProtected] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('user_picks_protected') === 'true';
    } catch (_) {
      return false;
    }
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
      const pickedCount = getUniquePickedCount(games, userPicks);
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

    // 1. Rehydrate initial cached state if available for instant render
    // Use exact delimited scope and find highest cached revision (no w7 matching w17 prefix bug)
    let cachedGames: GameItem[] = [];
    try {
      const cached = getHighestCachedSlateRevision(localStorage, activePoolId, 2026, 2, selectedWeek);
      if (cached && cached.games) {
        cachedGames = [...cached.games].sort(
          (a, b) => new Date(a.kickoffTime || a.kickoff_time).getTime() - new Date(b.kickoffTime || b.kickoff_time).getTime()
        );
        setGames(cachedGames);
      }
    } catch (_) {}

    try {
      // Fetch live scores for enrichment
      let fetchedScores: LiveGame[] = [];
      try {
        fetchedScores = await fetchLiveNFLScores(selectedWeek);
        setLiveScores(fetchedScores);
      } catch (scoreErr) {
        console.warn('Live score enrichment warning:', scoreErr);
        setLiveScores([]);
      }

      // 2. Authoritative Persisted Fetch using shared production resolver
      const resolution = await resolveAuthoritativeSlate({
        supabase,
        activePoolId,
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: selectedWeek,
        liveScores: fetchedScores,
      });

      if (resolution.source === 'FAILED_CLOSED' || resolution.games.length === 0) {
        // Honest empty slate when unimported or manifest missing/errored
        setGames([]);
        setLiveScores([]);
        setLastUpdatedTime(null);
        setIsOffline(false);
        setLoading(false);
        return;
      }

      const mappedGames = resolution.games;
      setIsOffline(false);

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
            const recon = reconcileCloudPicks(dbPicks, mappedGames || []);
            const cloudMap = recon.cloudMap;
            setConflictedGameIds(recon.conflictedGameIds);

            if (recon.logicalConflictGameIds.size > 0) {
              setFeedbackMessage({
                text: `Ambiguous pick records detected: ${recon.logicalConflictGameIds.size} matchup(s) have duplicate rows in database. Conflict state preserved; ordinary save disabled pending resolution.`,
                type: 'error',
              });
            }

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
      const mergedGames = mappedGames.map((g) => ({
        ...g,
        userPick: userPicksMap[g.id] || userPicksMap[(g as any).externalGameId] || userPicksMap[(g as any).external_game_id] || null,
      }));

      // Strictly sort chronologically by kickoff timestamp (Decision #66)
      const sortedGames = [...mergedGames].sort(
        (a, b) => new Date(a.kickoffTime || (a as any).kickoff_time).getTime() - new Date(b.kickoffTime || (b as any).kickoff_time).getTime()
      );

      setGames(sortedGames);

      // Persisted observation/acceptance sync timestamp (R5)
      const syncIso = resolution.lastUpdatedIso;
      if (syncIso) {
        const syncDate = new Date(syncIso);
        setLastUpdatedTime(
          !isNaN(syncDate.getTime())
            ? syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Unknown'
        );
      } else {
        setLastUpdatedTime(null);
      }

      if (resolution.manifest?.revision != null) {
        saveScopedSlateRevisionCache(
          localStorage,
          activePoolId,
          2026,
          2,
          selectedWeek,
          resolution.manifest.revision,
          sortedGames
        );
      }

      // 4. Prefetch matrix if available
      if (token) {
        try {
          const matrixRes = await scopedExpressFetch(`/api/pools/${activePoolId}/matrix`);
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
          const cached = getHighestCachedSlateRevision(localStorage, activePoolId, 2026, 2, selectedWeek);
          if (cached && cached.games) {
            const sortedFallback = [...cached.games].sort(
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

  const isSettingsLoading = poolSettingsState.status === 'LOADING' || poolSettingsState.poolId !== activePoolId;
  const isSettingsError = poolSettingsState.status === 'ERROR' && poolSettingsState.poolId === activePoolId;
  const isSettingsReady = poolSettingsState.status === 'READY' && poolSettingsState.poolId === activePoolId;

  const isSyncing = loading || isSettingsLoading;

  const isGameLocked = (game: GameItem): boolean => {
    if (!isSettingsReady) {
      return true; // Fail closed: pending, failed, missing, or malformed settings deny entry
    }
    return evaluateCanonicalGameLock(game as any, poolSettingsState.offset, now).isLocked;
  };

  const formatKickoff = (isoString: string) => formatGameKickoff(isoString);

  const isGameKickoffLocked = (g: GameItem) => isGameLocked(g);

  const slateSummary = evaluateSlateLockSummary(
    games,
    liveScores,
    isSettingsReady ? poolSettingsState.offset : NaN,
    now
  );
  const allLocked = slateSummary.allGamesLocked;
  const lockedCount = slateSummary.lockedCount;
  const openCount = isSettingsReady ? slateSummary.openCount : 0;
  const allCompleted = slateSummary.allGamesFinal;
  const anyLive = slateSummary.anyGameLive;
  const anyStartedOrFinal = slateSummary.anyStartedOrFinal;
  const anyUpcoming = slateSummary.anyUpcoming;

  let phaseLabel: string;
  let lockBadgeText: string;
  let isBadgeOpen = false;

  if (isSyncing) {
    phaseLabel = 'SYNCING';
    lockBadgeText = 'SYNCING';
    isBadgeOpen = false;
  } else if (isSettingsError) {
    phaseLabel = 'Status unavailable';
    lockBadgeText = 'UNAVAILABLE';
    isBadgeOpen = false;
  } else {
    phaseLabel = slateSummary.phaseLabel;
    lockBadgeText = slateSummary.lockBadgeText;
    isBadgeOpen = slateSummary.isBadgeOpen;
  }

  const handleRetry = () => {
    setSettingsRetryGen((g) => g + 1);
    fetchGames();
  };

  const handlePick = async (game: GameItem, selectedTeamId: string): Promise<boolean> => {
    if (isPicksProtected) {
      setFeedbackMessage({
        text: 'Picks are protected against accidental edits. Tap PICKS PROTECTED at the top to unlock.',
        type: 'error'
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
      triggerHaptic('impactHeavy');
      return false;
    }
    if (!pool) return false;
    if (!isSettingsReady) {
      setFeedbackMessage({
        text: 'Pool settings unavailable. Picks locked.',
        type: 'error'
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
      return false;
    }
    if (isGameLocked(game) || isKickoffLocked(game.kickoffTime, now)) {
      const formattedTime = formatKickoff(game.kickoffTime);
      setFeedbackMessage({ text: `Matchup locked: Kickoff passed on ${formattedTime}.`, type: 'error' });
      setTimeout(() => setFeedbackMessage(null), 3500);
      return false;
    }

    const gameExt = String((game as any).externalGameId || (game as any).external_game_id || '');
    if (conflictedGameIds.has(String(game.id)) || (gameExt && conflictedGameIds.has(gameExt))) {
      setFeedbackMessage({
        text: 'DUPLICATE_CONFLICT: Matchup has conflicting duplicate database records. Ordinary save disabled pending resolution.',
        type: 'error',
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
      return false;
    }

    setSavingPickForGameId(game.id);
    setPickMutationStatus((prev) => ({ ...prev, [game.id]: 'SAVING' }));

    const isUnselecting = areTeamIdentitiesEquivalent(userPicks[game.id] || game.userPick, selectedTeamId);
    const teamToSend = isUnselecting ? null : selectedTeamId;

    // Snapshot previous state for rollback on persistence failure
    const prevUserPicks = { ...userPicks };
    const prevGames = [...games];

    // Optimistically update local state
    const updatedUserPicks = { ...userPicks };
    const ext = String((game as any).externalGameId || (game as any).external_game_id || '');
    if (teamToSend) {
      updatedUserPicks[game.id] = teamToSend;
      if (ext) updatedUserPicks[ext] = teamToSend;
    } else {
      delete updatedUserPicks[game.id];
      if (ext) delete updatedUserPicks[ext];
    }
    setUserPicks(updatedUserPicks);

    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, userPick: teamToSend } : g))
    );

    let saveSuccess = false;
    let saveError: any = null;

    // Single mutation contract: Canonical backend mutation
    let activeToken = token;
    if (!activeToken) {
      try {
        activeToken = (await supabase.auth.getSession()).data.session?.access_token || null;
      } catch (_) {}
    }

    if (!activeToken) {
      saveError = new Error('Authentication required to save pick.');
    } else {
      try {
        const res = await scopedExpressFetch(`/api/pools/${pool.id}/picks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({
            pool_id: pool.id,
            game_id: game.id,
            selected_team_id: teamToSend,
            week: selectedWeek,
          }),
        });
        if (res.ok) {
          saveSuccess = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          saveError = new Error(errData.error || `Server error (${res.status})`);
        }
      } catch (err: any) {
        saveError = err;
      }
    }

    setSavingPickForGameId(null);

    if (saveSuccess) {
      setPickMutationStatus((prev) => ({ ...prev, [game.id]: 'CONFIRMED' }));
      try {
        localStorage.setItem(userPicksCacheKey, JSON.stringify(updatedUserPicks));
      } catch (e) {
        console.warn('localStorage save warning:', e);
      }
      triggerHaptic('impactLight');
      return true;
    } else {
      // Rollback optimistic state and present user-facing failure state with retry
      setUserPicks(prevUserPicks);
      setGames(prevGames);
      try {
        localStorage.setItem(userPicksCacheKey, JSON.stringify(prevUserPicks));
      } catch (_) {}
      setPickMutationStatus((prev) => ({ ...prev, [game.id]: 'FAILED' }));
      triggerHaptic('impactHeavy');
      setFeedbackMessage({
        text: `Failed to save pick: ${saveError?.message || 'Network error'}. Tap pick to retry.`,
        type: 'error'
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
      return false;
    }
  };

  /**
   * Clears all unlocked picks across the active slate.
   */
  /**
   * Clears all unlocked picks across the active slate.
   */
  const performClearAllPicks = async () => {
    if (isPicksProtected || !pool || !user?.id || !isSettingsReady) return;
    const unlockedPickedGames = games.filter((g) => !isGameLocked(g) && !isGameKickoffLocked(g) && g.userPick);
    if (unlockedPickedGames.length === 0) return;

    let activeToken = token;
    if (!activeToken) {
      try {
        activeToken = (await supabase.auth.getSession()).data.session?.access_token || null;
      } catch (_) {}
    }

    if (!activeToken || !pool?.id) {
      setFeedbackMessage({
        text: 'Authentication required. Please sign in to clear picks.',
        type: 'error',
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
      return;
    }

    try {
      const batchPayload = unlockedPickedGames.map((game) => ({
        game_id: game.id,
        selected_team_id: null,
        week: selectedWeek,
      }));
      const res = await scopedExpressFetch(`/api/pools/${pool.id}/picks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          pool_id: pool.id,
          picks: batchPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Clear picks failed: server status ${res.status}`);
      }

      let batchData: any;
      try {
        batchData = await res.json();
      } catch {
        throw new Error('MALFORMED_RESPONSE: Unable to parse server response as JSON.');
      }

      const requestedItems = unlockedPickedGames.map((g) => ({ gameId: g.id, expectedTeam: null }));
      const validation = validateBatchOutcomes(requestedItems, batchData, games);

      const confirmedClearedGames = unlockedPickedGames.filter((g) => validation.confirmedSavedCanonicalIds.has(String(g.id)));
      const failedGames = unlockedPickedGames.filter((g) => !validation.confirmedSavedCanonicalIds.has(String(g.id)));

      // Update state ONLY for games that were confirmed cleared (SAVED)
      const nextUserPicks = { ...userPicks };
      confirmedClearedGames.forEach((g) => {
        delete nextUserPicks[g.id];
        const ext = String((g as any).externalGameId || (g as any).external_game_id || '');
        if (ext) delete nextUserPicks[ext];
      });
      setUserPicks(nextUserPicks);
      setGames((prev) =>
        prev.map((g) => (validation.confirmedSavedCanonicalIds.has(String(g.id)) ? { ...g, userPick: null } : g))
      );
      try {
        localStorage.setItem(userPicksCacheKey, JSON.stringify(nextUserPicks));
      } catch (e) {
        console.warn('localStorage clear warning:', e);
      }

      if (failedGames.length > 0 || !validation.isValid) {
        setFeedbackMessage({
          text: `Cleared ${confirmedClearedGames.length} picks. ${failedGames.length} matchup(s) failed or locked.`,
          type: 'error',
        });
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        setFeedbackMessage({ text: 'All unlocked picks cleared.', type: 'success' });
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
      triggerHaptic('impactMedium');
    } catch (err: any) {
      setFeedbackMessage({
        text: `Failed to clear picks: ${err.message || 'Network error'}. Picks preserved.`,
        type: 'error',
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleClearAllPicks = () => {
    if (!isSettingsReady) {
      setFeedbackMessage({ text: 'Pool settings unavailable. Picks locked.', type: 'error' });
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }
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
  const performApplyPreset = (
    updatedPicks: Record<string, string | null>,
    presetDescription: string,
    presetType?: any
  ) => {
    if (isPicksProtected || !pool || !isSettingsReady) return;

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

    const { eligiblePicks, candidateGames, hasExcludedConflicts } = filterPresetEligiblePicks(
      updatedPicks,
      games,
      conflictedGameIds,
      isGameLocked,
      isGameKickoffLocked
    );

    if (candidateGames.length === 0) {
      setFeedbackMessage({
        text: hasExcludedConflicts
          ? 'Cannot apply preset: all target matchups have unresolved duplicate conflicts.'
          : 'No editable matchups available to apply preset.',
        type: 'error',
      });
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }

    // 1. Optimistically update local state strictly for eligible (unlocked, non-conflicted) games
    setGames((prev) =>
      prev.map((game) => {
        if (eligiblePicks[game.id]) {
          return { ...game, userPick: eligiblePicks[game.id] };
        }
        return game;
      })
    );

    // 2. Open 7s Undo Snackbar
    setSnackbarState({
      isOpen: true,
      message: `${presetDescription}. Tap Undo to revert.`
    });

    // 3. Stage in safety engine with commit callback, passing actual preset type and confirmed updatedPicks
    quickFillSafetyEngine.stagePreset(
      slateItems,
      currentPicksMap,
      presetType || 'CUSTOM',
      async (_enginePicks) => {
        try {
          const batchPayload = candidateGames.map((g) => ({
            game_id: g.id,
            selected_team_id: eligiblePicks[g.id],
            week: selectedWeek,
          }));

          let activeToken = token;
          if (!activeToken) {
            try {
              activeToken = (await supabase.auth.getSession()).data.session?.access_token || null;
            } catch (_) {}
          }

          if (!activeToken || !pool?.id) {
            throw new Error('Authentication required to persist preset.');
          }

          try {
            const batchRes = await scopedExpressFetch(`/api/pools/${pool.id}/picks/batch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${activeToken}`,
              },
              body: JSON.stringify({
                pool_id: pool.id,
                picks: batchPayload,
              }),
            });

            if (!batchRes.ok) {
              throw new Error(`Preset save failed: server status ${batchRes.status}`);
            }

            let batchData: any;
            try {
              batchData = await batchRes.json();
            } catch {
              throw new Error('MALFORMED_RESPONSE: Unable to parse server response as JSON.');
            }

            const requestedItems = candidateGames.map((g) => ({
              gameId: g.id,
              expectedTeam: eligiblePicks[g.id],
            }));

            const validation = validateBatchOutcomes(requestedItems, batchData, games);

            // Apply ONLY confirmed picks matching successful SAVED results
            const confirmedPicksMap = { ...currentPicksMap };
            candidateGames.forEach((g) => {
              if (validation.confirmedSavedCanonicalIds.has(String(g.id))) {
                const team = validation.confirmedSavedPicks[g.id] || eligiblePicks[g.id];
                confirmedPicksMap[g.id] = team;
                const ext = String((g as any).externalGameId || (g as any).external_game_id || '');
                if (ext) confirmedPicksMap[ext] = team;
              }
            });

            setUserPicks(confirmedPicksMap);
            setGames((prev) =>
              prev.map((g) => {
                if (validation.confirmedSavedCanonicalIds.has(String(g.id))) {
                  return { ...g, userPick: validation.confirmedSavedPicks[g.id] || eligiblePicks[g.id] };
                }
                return { ...g, userPick: currentPicksMap[g.id] ?? null };
              })
            );
            try {
              localStorage.setItem(userPicksCacheKey, JSON.stringify(confirmedPicksMap));
            } catch (e) {
              console.warn('localStorage preset save warning:', e);
            }

            if (validation.failedCanonicalIds.size > 0 || !validation.isValid) {
              setFeedbackMessage({
                text: `Saved ${validation.confirmedSavedCanonicalIds.size} picks. ${validation.failedCanonicalIds.size} matchup(s) failed or locked.`,
                type: 'error',
              });
              setTimeout(() => setFeedbackMessage(null), 4000);
            } else {
              setFeedbackMessage({ text: 'Preset saved successfully.', type: 'success' });
              setTimeout(() => setFeedbackMessage(null), 3000);
            }
            triggerHaptic('selection');
          } catch (netErr: any) {
            // Revert optimistic preset state and notify user
            setUserPicks(currentPicksMap);
            setGames((prev) =>
              prev.map((g) => ({
                ...g,
                userPick: currentPicksMap[g.id] ?? null,
              }))
            );
            try {
              localStorage.setItem(userPicksCacheKey, JSON.stringify(currentPicksMap));
            } catch (_) {}
            setFeedbackMessage({
              text: `Failed to save preset: ${netErr?.message || 'Server error'}. Selections reverted.`,
              type: 'error',
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
          }
        } catch (err: any) {
          console.error('Error auto-saving preset:', err);
          setUserPicks(currentPicksMap);
          setGames((prev) =>
            prev.map((g) => ({
              ...g,
              userPick: currentPicksMap[g.id] ?? null,
            }))
          );
          try {
            localStorage.setItem(userPicksCacheKey, JSON.stringify(currentPicksMap));
          } catch (_) {}
          setFeedbackMessage({
            text: `Failed to save preset: ${err?.message || 'Error'}. Selections reverted.`,
            type: 'error',
          });
          setTimeout(() => setFeedbackMessage(null), 4000);
        }
      },
      updatedPicks
    );
  };

  const handleApplyPreset = (
    updatedPicks: Record<string, string | null>,
    presetDescription: string,
    presetType?: any
  ) => {
    if (!isSettingsReady) {
      setFeedbackMessage({ text: 'Pool settings unavailable. Picks locked.', type: 'error' });
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }
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
      presetType,
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
      performApplyPreset(action.updatedPicks, action.description, action.presetType);
    }
    setPendingBulkAction(null);
  };

  const handleUndoLastBulk = async () => {
    if (!lastBulkSnapshot || isPicksProtected || !user?.id) return;

    let activeToken = token;
    if (!activeToken) {
      try {
        activeToken = (await supabase.auth.getSession()).data.session?.access_token || null;
      } catch (_) {}
    }

    if (!activeToken || !pool?.id) {
      setFeedbackMessage({
        text: 'Authentication required. Please sign in to undo bulk action.',
        type: 'error',
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
      return;
    }

    const gamesToRestore: { gameId: string; team: string | null }[] = [];
    for (const g of games) {
      if (!isGameLocked(g) && !isGameKickoffLocked(g)) {
        if (lastBulkSnapshot[g.id]) {
          gamesToRestore.push({ gameId: g.id, team: lastBulkSnapshot[g.id] });
        } else if (userPicks[g.id] || g.userPick) {
          // Explicit null mutation for previously unpicked games
          gamesToRestore.push({ gameId: g.id, team: null });
        }
      }
    }

    if (gamesToRestore.length === 0) {
      setLastBulkSnapshot(null);
      setFeedbackMessage({ text: 'No editable matchups to restore.', type: 'success' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    try {
      const batchPayload = gamesToRestore.map((item) => ({
        game_id: item.gameId,
        selected_team_id: item.team,
        week: selectedWeek,
      }));
      const res = await scopedExpressFetch(`/api/pools/${pool.id}/picks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          pool_id: pool.id,
          picks: batchPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Restore picks failed: server status ${res.status}`);
      }

      let batchData: any;
      try {
        batchData = await res.json();
      } catch {
        throw new Error('MALFORMED_RESPONSE: Unable to parse server response as JSON.');
      }

      const requestedItems = gamesToRestore.map((item) => ({ gameId: item.gameId, expectedTeam: item.team }));
      const validation = validateBatchOutcomes(requestedItems, batchData, games);

      const confirmedRestoredGames = gamesToRestore.filter((item) => validation.confirmedSavedCanonicalIds.has(String(item.gameId)));
      const failedRestoreGames = gamesToRestore.filter((item) => !validation.confirmedSavedCanonicalIds.has(String(item.gameId)));

      // Update state ONLY for games confirmed restored (SAVED)
      // Synchronize/remove BOTH canonical UUID and alias keys for confirmed selection/null (Ruling -03)
      const nextUserPicks = { ...userPicks };
      confirmedRestoredGames.forEach((item) => {
        const matched = games.find(
          (g) => String(g.id) === String(item.gameId) || String((g as any).externalGameId || (g as any).external_game_id) === String(item.gameId)
        );
        const canonicalId = matched ? String(matched.id) : String(item.gameId);
        const extId = matched ? String((matched as any).externalGameId || (matched as any).external_game_id || '') : '';

        if (item.team) {
          nextUserPicks[canonicalId] = item.team;
          if (extId) nextUserPicks[extId] = item.team;
        } else {
          delete nextUserPicks[canonicalId];
          if (extId) delete nextUserPicks[extId];
        }
      });

      setUserPicks(nextUserPicks);
      setGames((prev) =>
        prev.map((g) => (validation.confirmedSavedCanonicalIds.has(String(g.id)) ? { ...g, userPick: nextUserPicks[g.id] ?? null } : g))
      );
      try {
        localStorage.setItem(userPicksCacheKey, JSON.stringify(nextUserPicks));
      } catch (_) {}

      triggerHaptic('impactMedium');

      if (failedRestoreGames.length > 0 || !validation.isValid) {
        setFeedbackMessage({
          text: `Restored ${confirmedRestoredGames.length} picks. ${failedRestoreGames.length} matchup(s) failed or locked.`,
          type: 'error',
        });
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        setLastBulkSnapshot(null);
        setFeedbackMessage({ text: 'Last bulk action undone.', type: 'success' });
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    } catch (err: any) {
      setFeedbackMessage({
        text: `Failed to undo bulk action: ${err.message || 'Network error'}. Picks not restored.`,
        type: 'error',
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
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

  const [isRefreshingSchedule, setIsRefreshingSchedule] = useState<boolean>(false);
  const handleCommissionerRefresh = async () => {
    if (!activePoolId) return;
    setIsRefreshingSchedule(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await scopedExpressFetch(`/api/pools/${activePoolId}/slate/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          poolId: activePoolId,
          season: 2026,
          seasonType: 2,
          weekNumber: selectedWeek,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.reason || `HTTP ${res.status}`);
      }
      setFeedbackMessage({ text: `Week ${selectedWeek} schedule & scores refreshed.`, type: 'success' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      await fetchGames();
    } catch (err: any) {
      setFeedbackMessage({ text: `Refresh failed: ${err.message}`, type: 'error' });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setIsRefreshingSchedule(false);
    }
  };

  const setShowWeekModal = setIsWeekModalOpen;
  const viewMode = picksViewMode;
  const setViewMode = handleTogglePicksView;
  const toastMessage = feedbackMessage?.text;

  return (
    <div className="w-full">
      {/* ROW 1 (Branding & Controls) */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope={isSyncing ? 'SYNCING...' : `WEEK ${selectedWeek}`}
        phase={phaseLabel}
        rightContent={
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border flex items-center gap-1 ${
              isBadgeOpen
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              {isBadgeOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              <span>{lockBadgeText}</span>
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
                  : games.length > 0 && getUniquePickedCount(games, userPicks) >= games.length
                  ? 'SUBMITTED · EDITABLE'
                  : 'DRAFT · UNSUBMITTED'
              }
            >
              {isPicksProtected ? <Lock className="w-3 h-3 text-amber-400"/> : <Unlock className="w-3 h-3 text-zinc-400"/>}
              <span className="hidden xs:inline">
                {isPicksProtected
                  ? 'LOCKED'
                  : games.length > 0 && getUniquePickedCount(games, userPicks) >= games.length
                  ? 'SUBMITTED'
                  : 'DRAFT'}
              </span>
            </button>
          </div>
        }
      />

      {/* ROW 2 (Sub-navigation) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800/50">
          {/* Week Selector Dropdown & Commissioner Controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowWeekModal(true)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700/80 text-white text-xs font-bold">
              <span>WEEK {selectedWeek}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400"/>
            </button>
            {((pool as any)?.admin_id === user?.id || (pool as any)?.adminId === user?.id) && (
              <button
                type="button"
                onClick={handleCommissionerRefresh}
                disabled={isRefreshingSchedule}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-bold transition disabled:opacity-50"
                title="Refresh schedule & scores from authoritative ESPN source"
              >
                <RefreshCw className={`w-3 h-3 text-cyan-400 ${isRefreshingSchedule ? 'animate-spin' : ''}`} />
                <span className="inline text-[11px] font-bold">Schedule & Scores</span>
              </button>
            )}
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
            <span>🛡️ Accidental-Edit Guard Active: Your {getUniquePickedCount(games, userPicks) || games.length} submitted picks are counted in the pool. Tap 'Unlock to Edit' to change any game whose official kickoff has not passed ({games.filter((g) => isKickoffLocked(g.kickoffTime)).length} of {games.length} kickoff-locked).</span>
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

      {/* Settings Error Banner */}
      {isSettingsError && (
        <div className="mx-4 my-3 p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span>⚠️ [ DATA UNAVAILABLE ] {poolSettingsState.errorMessage || 'Failed to verify pool settings. Picks are locked.'}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs font-mono font-bold text-cyan-400 transition cursor-pointer"
          >
            [ RETRY TELEMETRY INTAKE ]
          </button>
        </div>
      )}

      {/* Content Rendering */}
      {isSyncing && games.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-medium">Loading NFL matchups and live odds...</p>
        </div>
      ) : isSettingsError && games.length === 0 ? (
        <div className="py-12 px-4 max-w-md mx-auto text-center space-y-4">
          <EmptyStateWireframe
            header="[ DATA UNAVAILABLE ]"
            subtitle="[ POOL SETTINGS COULD NOT BE VERIFIED ]"
            contextDetail={poolSettingsState.errorMessage || 'Failed to verify pool settings. Picks entry is locked.'}
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

          {/* Inline Weekly Tiebreaker Card (Section 6) - collapsed by default so the first game is visible without scrolling; tap to expand */}
          <details className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <summary className="cursor-pointer text-xs font-bold text-zinc-200 font-mono">WEEK {selectedWeek} TIEBREAKER - tap to expand</summary>
            <div className="pt-2">
              <WeeklyTiebreakerCard
                week={selectedWeek}
                poolId={activePoolId}
                hasPicksWithoutTiebreaker={Object.keys(userPicks).length > 0}
              />
            </div>
          </details>

          {/* Quick-Fill Presets Toolbar */}
          <PickPresetControls
            games={games}
            isGameLocked={isGameLocked}
            onApplyPreset={handleApplyPreset}
            matrixCells={matrixData?.cells}
            matrixMembers={matrixData?.columns}
            hidePicksUntilKickoff={false}
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
                startTime: ((g as any).isKickoffConfirmed === false || (g as any).is_kickoff_confirmed === false || new Date(g.kickoffTime).getTime() <= 0) ? 'TBD · Kickoff Unconfirmed' : formatKickoff(g.kickoffTime),
                kickoffTime: g.kickoffTime,
                spread: typeof g.spread === 'number' ? `${g.spread}` : (typeof g.spread === 'string' ? g.spread : undefined),
                favoriteLine: (g as any).favoriteLine ?? undefined,
                awayRecord: (g as any).awayRecord ?? undefined,
                homeRecord: (g as any).homeRecord ?? undefined,
                selectedTeam: g.userPick,
                isLocked: ((g as any).isKickoffConfirmed === false || (g as any).is_kickoff_confirmed === false || new Date(g.kickoffTime).getTime() <= 0) || isGameLocked(g) || isGameKickoffLocked(g),
              }))}
              onSelectPick={async (gameId, team) => {
                const targetGame = games.find((g) => g.id === gameId);
                if (targetGame) {
                  return await handlePick(targetGame, team);
                }
                return false;
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
                kickoffTime: ((g as any).isKickoffConfirmed === false || (g as any).is_kickoff_confirmed === false || new Date(g.kickoffTime).getTime() <= 0) ? 'TBD · Kickoff Unconfirmed' : formatKickoff(g.kickoffTime),
                isLocked: ((g as any).isKickoffConfirmed === false || (g as any).is_kickoff_confirmed === false || new Date(g.kickoffTime).getTime() <= 0) || isGameLocked(g) || isGameKickoffLocked(g),
                spread: typeof g.spread === 'number' ? `${g.spread}` : undefined,
                favoriteLine: (g as any).favoriteLine ?? undefined,
                awayRecord: (g as any).awayRecord ?? undefined,
                homeRecord: (g as any).homeRecord ?? undefined,
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

          {/* Authoritative ESPN Slate Status & Timestamp - footer, not header, so it does not push games off screen */}
          {lastUpdatedTime && (
            <div className="px-4 py-1 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Authoritative ESPN Sync
              </span>
              <span>Last updated: {lastUpdatedTime}</span>
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

                const curWeek = getCurrentNFLWeek(now);
                if (week < curWeek) {
                  statusText = 'Completed';
                  statusClass = 'text-zinc-400 bg-zinc-900 border-zinc-800';
                } else if (week === curWeek) {
                  statusText = 'Active / Open';
                  statusClass = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
                } else {
                  statusText = 'Upcoming Slate';
                  statusClass = 'text-cyan-400 bg-cyan-950/20 border-cyan-800/40';
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
