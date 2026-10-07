import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Clock, CheckCircle2, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { ViewportSelector, type ViewportMode } from './ViewportSelector';
import { LeagueMatrixView, type MatrixResponsePayload } from './LeagueMatrixView';
import { PickPresetControls } from './PickPresetControls';
import { formatGameKickoff } from '../utils/dateUtils';

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
  const [viewportMode, setViewportMode] = useState<ViewportMode>(() => {
    return (localStorage.getItem('nfl_pickem_viewport') as ViewportMode) || 'cards';
  });

  const handleViewportChange = (mode: ViewportMode) => {
    setViewportMode(mode);
    try {
      localStorage.setItem('nfl_pickem_viewport', mode);
    } catch {
      // Ignore localStorage errors
    }
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
          console.warn('Matrix background fetch failed:', mErr);
        }
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Error fetching slate.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handlePick = async (game: GameItem, selectedTeamId: string) => {
    if (!pool) return;

    // Visual lock pre-check
    const lockOffsetMinutes = pool.lock_offset || 0;
    const lockTime = new Date(new Date(game.kickoffTime).getTime() - lockOffsetMinutes * 60 * 1000);
    if (now.getTime() >= lockTime.getTime()) {
      setFeedbackMessage({ text: 'This matchup is locked. Picks cannot be modified.', type: 'error' });
      return;
    }

    const isTogglingOff = game.userPick === selectedTeamId;
    const teamToSend = isTogglingOff ? null : selectedTeamId;

    setSavingPickForGameId(game.id);

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit pick.');
      }

      // Optimistically update local state
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, userPick: teamToSend } : g))
      );

      setFeedbackMessage({
        text: teamToSend ? `Selected ${teamToSend} to win!` : 'Pick cleared.',
        type: 'success',
      });

      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to submit pick.', type: 'error' });
    } finally {
      setSavingPickForGameId(null);
    }
  };

  const handleApplyPreset = async (updatedPicks: Record<string, string | null>, presetDescription: string) => {
    if (!pool) return;

    // 1. Optimistically update local state
    setGames((prev) =>
      prev.map((game) => {
        if (Object.prototype.hasOwnProperty.call(updatedPicks, game.id)) {
          return { ...game, userPick: updatedPicks[game.id] };
        }
        return game;
      })
    );

    setFeedbackMessage({
      text: `${presetDescription} (Saving...)`,
      type: 'success',
    });

    try {
      // 2. Dispatch batch pick submissions
      const entries = Object.entries(updatedPicks);
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
        // Fallback to concurrent individual pick submissions
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

      setFeedbackMessage({
        text: `${presetDescription} — Saved to pool!`,
        type: 'success',
      });

      // 3. Re-fetch matrix data so Square Sheet reflects the picks immediately
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
      setFeedbackMessage({
        text: `Preset applied locally, but failed to save: ${err.message}`,
        type: 'error',
      });
    }

    setTimeout(() => setFeedbackMessage(null), 4000);
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-6 glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>{pool?.name || 'Active Pool'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {viewportMode === 'matrix' ? 'Square Sheet Matrix' : 'Weekly Matchup Slate'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {viewportMode === 'matrix'
              ? 'Full league spreadsheet with live anti-peeking masking & precision scoring.'
              : `Select a team to lock in your pick. Games lock automatically ${
                  pool?.lock_offset ? `${pool.lock_offset}m prior to kickoff` : 'at kickoff'
                }.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Top-Level Viewport Toggle (Cards / Slate / Matrix) */}
          <ViewportSelector
            activeMode={viewportMode}
            onChange={handleViewportChange}
          />

          {viewportMode !== 'matrix' && (
            <button
              onClick={fetchGames}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Slate</span>
            </button>
          )}
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

      {/* Conditional Viewport Rendering */}
      {viewportMode === 'matrix' ? (
        <div className="animate-fade-in">
          <LeagueMatrixView hideHeader={true} />
        </div>
      ) : loading && games.length === 0 ? (
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

          {viewportMode === 'slate' ? (
            /* High-Density Slate Table View */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md overflow-hidden shadow-xl animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Matchup</th>
                  <th className="py-3.5 px-4">Kickoff</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Away Team</th>
                  <th className="py-3.5 px-4 text-center">Home Team</th>
                  <th className="py-3.5 px-4 text-center">Your Pick</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {games.map((game) => {
                  const locked = isGameLocked(game);
                  const isHomeSelected = game.userPick === game.homeTeamId;
                  const isAwaySelected = game.userPick === game.awayTeamId;
                  const isSaving = savingPickForGameId === game.id;

                  return (
                    <tr
                      key={game.id}
                      className={`hover:bg-slate-850/50 transition-colors ${
                        locked ? 'opacity-85' : ''
                      }`}
                    >
                      {/* Matchup */}
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        <span>{game.awayTeamId}</span>
                        <span className="text-slate-500 mx-1.5 font-normal">@</span>
                        <span>{game.homeTeamId}</span>
                      </td>

                      {/* Kickoff */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {formatKickoff(game.kickoffTime)}
                      </td>

                      {/* Lock Status */}
                      <td className="py-3.5 px-4 text-center">
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
                      </td>

                      {/* Away Team Pick Button */}
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handlePick(game, game.awayTeamId)}
                          disabled={locked || isSaving}
                          className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs transition-all w-24 ${
                            isAwaySelected
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-sm shadow-cyan-950/50 ring-1 ring-cyan-400'
                              : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-750'
                          } ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                        >
                          {game.awayTeamId}
                        </button>
                      </td>

                      {/* Home Team Pick Button */}
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handlePick(game, game.homeTeamId)}
                          disabled={locked || isSaving}
                          className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs transition-all w-24 ${
                            isHomeSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-sm shadow-cyan-950/50 ring-1 ring-cyan-400'
                              : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-750'
                          } ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                        >
                          {game.homeTeamId}
                        </button>
                      </td>

                      {/* Selected Pick */}
                      <td className="py-3.5 px-4 text-center">
                        {game.userPick ? (
                          <span className="inline-flex items-center space-x-1 font-bold text-cyan-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{game.userPick}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Score / Result */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">
                        {game.awayScore !== null && game.homeScore !== null
                          ? `${game.awayScore} - ${game.homeScore}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Default Interactive Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {games.map((game) => {
            const locked = isGameLocked(game);
            const isHomeSelected = game.userPick === game.homeTeamId;
            const isAwaySelected = game.userPick === game.awayTeamId;
            const isSaving = savingPickForGameId === game.id;

            return (
              <div
                key={game.id}
                className={`glass-card rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                  locked
                    ? 'border-slate-800/80 opacity-90'
                    : 'border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-cyan-950/20'
                }`}
              >
                {/* Top Status & Lock Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatKickoff(game.kickoffTime)}</span>
                  </div>

                  {game.status === 'IN_PROGRESS' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>LIVE</span>
                    </span>
                  ) : locked ? (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/90 text-amber-400 border border-amber-500/30">
                      <Lock className="w-3 h-3" />
                      <span>{game.status === 'FINAL' ? 'FINAL' : 'LOCKED'}</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span>OPEN</span>
                    </span>
                  )}
                </div>

                {/* Matchup Team Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-4">
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
    </div>
  );
};
