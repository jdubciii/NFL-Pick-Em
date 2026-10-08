import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, CheckCircle2, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { PickPresetControls } from './PickPresetControls';
import { CompactPicksList } from './picks/CompactPicksList';
import { SwipePickDeck } from './picks/SwipePickDeck';
import { UndoSnackbar } from './picks/UndoSnackbar';
import { quickFillSafetyEngine, SlateGameItem } from '../services/QuickFillSafetyEngine';
import { formatGameKickoff } from '../utils/dateUtils';
import { triggerHaptic } from '../utils/haptics';
import type { MatrixResponsePayload } from './LeagueMatrixView';

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
}

export interface PoolInfo {
  id: string;
  name: string;
  lock_offset: number;
  hide_picks_until_kickoff?: boolean;
}

export const WeeklyPicks: React.FC = () => {
  const { token, user } = useAuth();
  const [games, setGames] = useState<GameItem[]>([]);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [matrixData, setMatrixData] = useState<MatrixResponsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPickForGameId, setSavingPickForGameId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [now, setNow] = useState(new Date());

  const [picksViewMode, setPicksViewMode] = useState<'swipe' | 'list'>(() => {
    const saved = localStorage.getItem('picks_view_preference');
    return (saved === 'swipe' || saved === 'list') ? (saved as 'swipe' | 'list') : 'swipe';
  });

  const [snackbarState, setSnackbarState] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ''
  });

  const [isUserLocked, setIsUserLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nfl_picks_user_locked_w5') === 'true';
    } catch {
      return false;
    }
  });

  const toggleUserLock = () => {
    setIsUserLocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nfl_picks_user_locked_w5', String(next));
      } catch (e) {
        console.error(e);
      }
      triggerHaptic('selection');
      return next;
    });
  };

  const handleTogglePicksView = (mode: 'swipe' | 'list') => {
    setPicksViewMode(mode);
    try {
      localStorage.setItem('picks_view_preference', mode);
    } catch {}
  };

  // Update clock every 10 seconds for real-time lock updates
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/games', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to load NFL matchups.');
      }
      const data = await response.json();
      const allGames: GameItem[] = data.games || [];
      const upcomingOnly = allGames.filter((g) => g.status === 'SCHEDULED' || new Date(g.kickoffTime) > new Date());
      setGames(upcomingOnly.length > 0 ? upcomingOnly : allGames);
      setPool(data.pool || null);

      if (data.pool?.id) {
        try {
          const matrixRes = await fetch(`/api/pools/${data.pool.id}/matrix`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (matrixRes.ok) {
            const mData = await matrixRes.json();
            setMatrixData(mData);
          }
        } catch (mErr) {
          console.warn('Matrix prefetch warning:', mErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setFeedbackMessage({
        text: err.message || 'Error loading slate',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handlePick = async (game: GameItem, selectedTeamId: string) => {
    if (isUserLocked) {
      setFeedbackMessage({ text: 'Picks are locked. Tap "LOCKED" button to edit picks.', type: 'error' });
      return;
    }
    if (!pool) return;
    if (isGameLocked(game)) {
      setFeedbackMessage({ text: 'This game is locked.', type: 'error' });
      return;
    }

    setSavingPickForGameId(game.id);
    const isUnselecting = game.userPick === selectedTeamId;
    const teamToSend = isUnselecting ? null : selectedTeamId;

    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: pool.id,
          game_id: game.id,
          selected_team_id: teamToSend,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to submit pick');
      }

      // Optimistically update local state
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, userPick: teamToSend } : g))
      );

      triggerHaptic('impactLight');

      setFeedbackMessage({
        text: teamToSend ? `Selected ${teamToSend} to win!` : 'Pick cleared.',
        type: 'success',
      });

      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      setFeedbackMessage({ text: err.message, type: 'error' });
    } finally {
      setSavingPickForGameId(null);
    }
  };

  /**
   * Applies quick-fill presets through the QuickFillSafetyEngine with a 7-second undo grace period.
   */
  const handleApplyPreset = (updatedPicks: Record<string, string | null>, presetDescription: string) => {
    if (isUserLocked) {
      setFeedbackMessage({ text: 'Picks are locked. Tap "LOCKED" button to edit picks.', type: 'error' });
      return;
    }
    if (!pool) return;

    const slateItems: SlateGameItem[] = games.map((g) => ({
      gameId: g.id,
      awayTeam: g.awayTeamId,
      homeTeam: g.homeTeamId,
      favorite: typeof g.spread === 'number' ? (g.spread < 0 ? g.homeTeamId : g.awayTeamId) : g.homeTeamId,
      isLocked: isGameLocked(g),
    }));

    const currentPicksMap: Record<string, string> = {};
    for (const g of games) {
      if (g.userPick) currentPicksMap[g.id] = g.userPick;
    }

    // 1. Optimistically update local state
    setGames((prev) =>
      prev.map((game) => {
        if (Object.prototype.hasOwnProperty.call(updatedPicks, game.id)) {
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
          const entries = Object.entries(finalPicks);
          const batchPayload = entries.map(([gameId, selectedTeamId]) => ({
            game_id: gameId,
            selected_team_id: selectedTeamId,
          }));

          const batchRes = await fetch('/api/picks/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              pool_id: pool.id,
              picks: batchPayload,
            }),
          });

          if (!batchRes.ok) {
            await Promise.all(
              entries.map(([gameId, selectedTeamId]) =>
                fetch('/api/picks', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
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

          triggerHaptic('selection');

          // Sync matrix
          try {
            const matrixRes = await fetch(`/api/pools/${pool.id}/matrix`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (matrixRes.ok) {
              const mData = await matrixRes.json();
              setMatrixData(mData);
            }
          } catch (mErr) {
            console.warn('Failed to sync matrix:', mErr);
          }
        } catch (err: any) {
          console.error('Error auto-saving preset:', err);
        }
      }
    );
  };

  const handleUndoPreset = () => {
    const reverted = quickFillSafetyEngine.triggerUndo();
    setGames((prev) =>
      prev.map((g) => ({
        ...g,
        userPick: reverted[g.id] ?? null,
      }))
    );
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 p-2.5 sm:p-6 glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>{pool?.name || 'Main League'} • Week 5</span>
          </div>
          <h2 className="hidden md:block text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Weekly Matchup Slate
          </h2>
          <p className="hidden md:block text-xs sm:text-sm text-slate-400 mt-1">
            {`Select a team to lock in your pick. Games lock automatically ${
              pool?.lock_offset ? `${pool.lock_offset}m prior to kickoff` : 'at kickoff'
            }.`}
          </p>
        </div>

        {/* Streamlined Header Bar: [ Swipe | List ] + Locked Toggle + Working Refresh */}
        <div className="flex items-center justify-between gap-2 py-2 px-1 select-none">
          {/* Segmented View Mode: Swipe (Default) & List */}
          <div className="inline-flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => handleTogglePicksView('swipe')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                picksViewMode === 'swipe' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Swipe
            </button>
            <button
              type="button"
              onClick={() => handleTogglePicksView('list')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                picksViewMode === 'list' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>

          {/* Action Controls: Compact Lock & Working Refresh */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleUserLock}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl border text-xs font-mono font-black transition-all shadow-sm ${
                isUserLocked
                  ? 'bg-amber-950/90 border-amber-500/80 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <span>{isUserLocked ? '🔒' : '🔓'}</span>
              <span>{isUserLocked ? 'LOCKED' : 'EDIT'}</span>
            </button>

            <button
              type="button"
              onClick={fetchGames}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white active:scale-90 transition-transform"
              title="Refresh Picks Slate"
            >
              🔄
            </button>
          </div>
        </div>
      </div>


      {/* Content Rendering */}
      {loading && games.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-medium">Loading NFL matchups and live odds...</p>
        </div>
      ) : (
        <div className="space-y-5">
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
              matchups={games.map((g) => ({
                id: g.id,
                gameId: g.id,
                awayTeam: g.awayTeamId,
                homeTeam: g.homeTeamId,
                startTime: formatKickoff(g.kickoffTime),
                spread: typeof g.spread === 'number' ? `${g.spread}` : undefined,
                selectedTeam: g.userPick,
                isLocked: isGameLocked(g),
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
              isUserLocked={isUserLocked}
            />
          ) : (
            /* High-Density Compact List View */
            <CompactPicksList
              games={games.map((g) => ({
                gameId: g.id,
                awayTeam: g.awayTeamId,
                homeTeam: g.homeTeamId,
                kickoffTime: formatKickoff(g.kickoffTime),
                isLocked: isGameLocked(g),
                spread: typeof g.spread === 'number' ? `${g.spread}` : undefined,
              }))}
              selectedPicks={games.reduce((acc, g) => {
                if (g.userPick) acc[g.id] = g.userPick;
                return acc;
              }, {} as Record<string, string>)}
              onSelectTeam={(gameId, team) => {
                const targetGame = games.find((g) => g.id === gameId);
                if (targetGame) handlePick(targetGame, team);
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
    </div>
  );
};
