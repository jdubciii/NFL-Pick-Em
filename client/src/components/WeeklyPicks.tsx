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

  const [picksViewMode, setPicksViewMode] = useState<'swipe' | 'list' | 'cards'>(() => {
    const saved = localStorage.getItem('picks_view_preference');
    return (saved === 'swipe' || saved === 'list' || saved === 'cards') ? (saved as 'swipe' | 'list' | 'cards') : 'swipe';
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

  const handleTogglePicksView = (mode: 'swipe' | 'list' | 'cards') => {
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

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Density Toggle (Swipe | List | Cards) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => handleTogglePicksView('swipe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                picksViewMode === 'swipe'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Swipe
            </button>
            <button
              type="button"
              onClick={() => handleTogglePicksView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                picksViewMode === 'list'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => handleTogglePicksView('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                picksViewMode === 'cards'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cards
            </button>
          </div>

          {/* Animated User Picks Lock/Unlock Guard */}
          <button
            type="button"
            onClick={() => {
              toggleUserLock();
              try {
                if ((window as any).Capacitor?.isPluginAvailable('Haptics')) {
                  (window as any).Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
                }
              } catch (_) {}
            }}
            className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-300 shadow-md select-none active:scale-95 ${
              isUserLocked
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 shadow-amber-950/50 ring-1 ring-amber-500/30'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-cyan-500/60 hover:text-white shadow-slate-950/40'
            }`}
            title={isUserLocked ? 'Picks are protected against accidental clicks. Tap to unlock.' : 'Tap to lock picks and prevent accidental selections.'}
          >
            {/* Animated SVG Padlock Icon */}
            <div className="relative flex items-center justify-center w-4 h-4">
              {isUserLocked ? (
                /* Closed Padlock with Shackle Snap Animation */
                <svg
                  className="w-4 h-4 text-amber-400 transform transition-transform duration-300 scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              ) : (
                /* Open Padlock with Shifted Shackle */
                <svg
                  className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transform transition-transform duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>

            {/* Dynamic Two-Line Verbiage */}
            <div className="flex flex-col text-left leading-tight">
              <span className={`text-[11px] font-black tracking-wide ${isUserLocked ? 'text-amber-300' : 'text-slate-200'}`}>
                {isUserLocked ? 'PICKS LOCKED' : 'EDIT PICKS'}
              </span>
              <span className={`text-[9px] font-medium tracking-tight ${isUserLocked ? 'text-amber-400/80' : 'text-slate-400'}`}>
                {isUserLocked ? 'Tap to unlock' : 'Tap to protect'}
              </span>
            </div>

            {/* Glowing Beacon Pill */}
            <span
              className={`w-1.5 h-1.5 rounded-full ml-0.5 ${
                isUserLocked
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse'
                  : 'bg-slate-600 group-hover:bg-cyan-400 transition-colors'
              }`}
            />
          </button>

          <button
            onClick={fetchGames}
            disabled={loading}
            className="flex items-center space-x-1.5 p-2 sm:px-4 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
            title="Refresh Slate"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh Slate</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border transition-all animate-fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

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
          ) : picksViewMode === 'list' ? (
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
          ) : (
            /* Cards View: Grid of Matchup Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
              {games.map((game) => {
                const locked = isGameLocked(game);
                const isHomeSelected = game.userPick === game.homeTeamId;
                const isAwaySelected = game.userPick === game.awayTeamId;
                const isSaving = savingPickForGameId === game.id;

                return (
                  <div
                    key={game.id}
                    className={`rounded-2xl border transition-all duration-300 p-3.5 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4 ${
                      locked
                        ? 'bg-slate-900/40 border-slate-800/60 opacity-85'
                        : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700 shadow-lg'
                    }`}
                  >
                    {/* Card Header: Kickoff & Status */}
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
                      <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
                        <span>{formatKickoff(game.kickoffTime)}</span>
                      </div>
                      <div>
                        {game.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>LIVE</span>
                          </span>
                        ) : locked ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-400 border border-amber-500/30">
                            <Lock className="w-3 h-3" />
                            <span>{game.status === 'FINAL' ? 'FINAL' : 'LOCKED'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            OPEN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pick Options (Away vs Home) */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {/* Away Team Option */}
                      <button
                        onClick={() => handlePick(game, game.awayTeamId)}
                        disabled={locked || isSaving}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 relative group ${
                          isAwaySelected
                            ? 'ring-2 ring-cyan-500 bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                            : Boolean(game.userPick)
                            ? 'bg-slate-900/80 border-slate-800 opacity-40 grayscale-[30%] hover:opacity-80 transition-opacity duration-200'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 opacity-100'
                        } ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            AWAY
                          </span>
                          {isAwaySelected && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[9px] font-extrabold tracking-wider animate-scale-in">
                              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                              <span>SELECTED</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                          {game.awayTeamId}
                        </div>
                        {game.awayScore !== null && (
                          <div className="text-sm font-bold text-slate-300 mt-1">
                            Score: {game.awayScore}
                          </div>
                        )}
                      </button>

                      {/* Home Team Option */}
                      <button
                        onClick={() => handlePick(game, game.homeTeamId)}
                        disabled={locked || isSaving}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 relative group ${
                          isHomeSelected
                            ? 'ring-2 ring-cyan-500 bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                            : Boolean(game.userPick)
                            ? 'bg-slate-900/80 border-slate-800 opacity-40 grayscale-[30%] hover:opacity-80 transition-opacity duration-200'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 opacity-100'
                        } ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            HOME
                          </span>
                          {isHomeSelected && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[9px] font-extrabold tracking-wider animate-scale-in">
                              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                              <span>SELECTED</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                          {game.homeTeamId}
                        </div>
                        {game.homeScore !== null && (
                          <div className="text-sm font-bold text-slate-300 mt-1">
                            Score: {game.homeScore}
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Footer State Info */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {game.userPick ? (
                          <span className="text-slate-300">
                            Your Pick: <strong className="text-cyan-400 font-bold">{game.userPick}</strong>
                          </span>
                        ) : (
                          <span className="text-amber-400/80 italic font-medium">No pick submitted</span>
                        )}
                      </span>
                      {isSaving && (
                        <span className="text-cyan-400 flex items-center space-x-1 animate-pulse font-semibold">
                          <span>Saving...</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
