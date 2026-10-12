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

  // AUTO_LIVE_SYNC_INTERVAL: Poll slate every 10s during live games
  React.useEffect(() => {
    const liveInterval = setInterval(() => {
      const hasLiveGame = games.some((g: any) => g.isLive || g.status === 'IN_PROGRESS');
      if (hasLiveGame) {
        if (typeof fetchGames === 'function') {
          fetchGames();
        }
      }
    }, 10000);
    return () => clearInterval(liveInterval);
  }, [games, fetchGames]);

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
   * Clears all unlocked picks across the active slate.
   */
  const handleClearAllPicks = async () => {
    if (isUserLocked || !pool) return;
    const unlockedPickedGames = games.filter((g) => !isGameLocked(g) && g.userPick);
    if (unlockedPickedGames.length === 0) return;

    // Optimistically clear picks in local state
    setGames((prev) =>
      prev.map((g) => (!isGameLocked(g) ? { ...g, userPick: null } : g))
    );

    try {
      await Promise.all(
        unlockedPickedGames.map((game) =>
          fetch('/api/picks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              pool_id: pool.id,
              game_id: game.id,
              selected_team_id: null,
            }),
          })
        )
      );
      triggerHaptic('impactMedium');
    } catch (err) {
      console.error('Failed to clear all picks:', err);
    }
  };

  /**
   * Applies quick-fill presets through the QuickFillSafetyEngine with a 7-second undo grace period.
   */
  const handleApplyPreset = (updatedPicks: Record<string, string | null>, presetDescription: string) => {
    if (isUserLocked) {
      setFeedbackMessage({ text: 'Matchups locked: kickoff has passed.', type: 'error' });
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
      {/* Streamlined Mobile Top Bar: Week Tag + View Switcher + Lock Pill */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl select-none">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] font-mono font-black text-cyan-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            WEEK 5
          </span>
          <div className="inline-flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 shadow-inner">
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
        </div>

        {/* Dedicated Compact Lock Pill - Fits comfortably within 100vw */}
        <button
          type="button"
          onClick={toggleUserLock}
          className={`whitespace-nowrap text-xs px-2.5 py-1 max-w-[140px] truncate rounded-xl border font-mono font-black transition-all shadow-sm shrink-0 ${
            isUserLocked
              ? 'bg-amber-950/90 border-amber-500/80 text-amber-300 ring-1 ring-amber-500/30'
              : 'bg-cyan-950/80 border-cyan-600/80 text-cyan-300 hover:bg-cyan-900'
          }`}
          title={isUserLocked ? '🔒 Locked (Kickoff)' : '🔒 Submitted (Open)'}
        >
          <span className="truncate">{isUserLocked ? '🔒 Locked (Kickoff)' : '🔒 Submitted (Open)'}</span>
        </button>
      </div>

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
          <p className="text-xs text-slate-400">No active matchup slate available for this week.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
              matchups={games.map((g: any) => ({
                id: g.id,
                gameId: g.id,
                awayTeam: g.awayTeamId,
                homeTeam: g.homeTeamId,
                awayScore: g.awayScore ?? undefined,
                homeScore: g.homeScore ?? undefined,
                isLive: Boolean(g.isLive || g.status === 'IN_PROGRESS'),
                gameStatus: g.gameStatus || g.status,
                possession: g.possession,
                inRedZone: g.inRedZone,
                startTime: formatKickoff(g.kickoffTime),
                spread: typeof g.spread === 'number' ? `${g.spread}` : (typeof g.spread === 'string' ? g.spread : undefined),
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
              onClearAllPicks={handleClearAllPicks}
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
