import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Clock, CheckCircle2, AlertCircle, RefreshCw, Shield } from 'lucide-react';

export interface GameItem {
  id: string;
  externalGameId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  homeScore: number | null;
  awayScore: number | null;
  userPick: string | null;
  pickId: string | null;
}

export interface PoolInfo {
  id: string;
  name: string;
  lock_offset: number;
}

export const WeeklyPicks: React.FC = () => {
  const { token } = useAuth();
  const [games, setGames] = useState<GameItem[]>([]);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPickForGameId, setSavingPickForGameId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [now, setNow] = useState(new Date());

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
      setGames(data.games || []);
      setPool(data.pool || null);
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

  const isGameLocked = (game: GameItem): boolean => {
    if (game.status === 'IN_PROGRESS' || game.status === 'FINAL') {
      return true;
    }
    const lockOffsetMinutes = pool?.lock_offset || 0;
    const lockTime = new Date(new Date(game.kickoffTime).getTime() - lockOffsetMinutes * 60 * 1000);
    return now.getTime() >= lockTime.getTime();
  };

  const formatKickoff = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 glass-panel rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>{pool?.name || 'Active Pool'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Weekly Matchup Slate
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Click any team to lock in your prediction. Games lock automatically{' '}
            {pool?.lock_offset ? `${pool.lock_offset}m prior to kickoff` : 'at kickoff'}.
          </p>
        </div>

        <button
          onClick={fetchGames}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Slate</span>
        </button>
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

      {/* Matchups Grid */}
      {loading && games.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-medium">Loading NFL matchups and live odds...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

                  {locked ? (
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
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                    } ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        AWAY
                      </span>
                      {isAwaySelected && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-scale-in" />
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
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                    } ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        HOME
                      </span>
                      {isHomeSelected && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-scale-in" />
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
  );
};
