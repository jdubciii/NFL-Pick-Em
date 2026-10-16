import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Flame, AlertTriangle, RefreshCw, Medal, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { scopedExpressFetch } from '../lib/apiClient';

export interface LeaderboardEntry {
  user_id: string;
  email: string;
  total_points: number;
  correct_picks: number;
  total_picks: number;
  is_weekly_loser: boolean;
}

export interface PoolSummary {
  id: string;
  name: string;
}

const MEMBER_DISPLAY_MAP: Record<string, string> = {
  'jack@nflpickem.com': 'Jack (You)',
  'matt.c@nflpickem.com': 'Matt Cone',
  'matt.b@nflpickem.com': 'Matt Brickner',
  'justin.b@nflpickem.com': 'Justin Brickner',
  'adam.b@nflpickem.com': 'Adam Brickner',
  'rich.b@nflpickem.com': 'Rich Brickner',
  'mike.c@nflpickem.com': 'Mike Cone',
  'nick.s@nflpickem.com': 'Nick Santos',
  'mark.b@nflpickem.com': 'Mark Brickner',
  'bigjack@nflpickem.com': 'Big Jack',
};

function formatDisplayName(email: string): string {
  if (!email) return 'Unknown';
  const lower = email.toLowerCase();
  if (MEMBER_DISPLAY_MAP[lower]) {
    return MEMBER_DISPLAY_MAP[lower];
  }
  const username = email.split('@')[0];
  return username.charAt(0).toUpperCase() + username.slice(1);
}

export const Leaderboard: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [poolName, setPoolName] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available pools
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await scopedExpressFetch('/api/pools');
        if (res.ok) {
          const data: PoolSummary[] = await res.json();
          setPools(data);
          if (data.length > 0) {
            const savedPoolId = localStorage.getItem('active_pool_id');
            const mainPool =
              data.find((p) => p.name === 'Main League') ||
              (savedPoolId ? data.find((p) => p.id === savedPoolId) : undefined) ||
              data[0];
            if (mainPool) {
              setSelectedPoolId(mainPool.id);
              localStorage.setItem('active_pool_id', mainPool.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load pools:', err);
      }
    };

    fetchPools();
  }, [token]);

  const fetchLeaderboard = useCallback(async () => {
    if (!selectedPoolId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await scopedExpressFetch(`/api/pools/${selectedPoolId}/leaderboard`);

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard standings.');
      }

      const data = await response.json();
      setPoolName(data.pool_name || 'NFL Pick \'Em Pool');
      setLeaderboard(data.leaderboard || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading standings.');
    } finally {
      setLoading(false);
    }
  }, [selectedPoolId, token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs shadow-sm shadow-amber-500/20">
          <Medal className="w-4 h-4 text-amber-400" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 font-black text-xs">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 font-black text-xs">
          3
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-slate-500 font-bold text-xs border border-slate-800">
        {rank}
      </div>
    );
  };

  const topScorer = leaderboard[0];
  const weeklyLoser = leaderboard.find((u) => u.is_weekly_loser);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 glass-panel rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>Official Standings</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {poolName || 'Pool Leaderboard'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Live graded standings calculated automatically from immutable finalized results.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {pools.length > 1 && (
            <select
              value={selectedPoolId}
              onChange={(e) => {
                setSelectedPoolId(e.target.value);
                localStorage.setItem('active_pool_id', e.target.value);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-cyan-500"
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Highlight Banners */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Leader */}
          <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-slate-900/60 to-slate-900/80 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Flame className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                Current Pool Leader
              </div>
              <div className="text-sm font-extrabold text-white truncate max-w-[180px]">
                {topScorer ? formatDisplayName(topScorer.email) : 'N/A'}
              </div>
              <div className="text-xs text-amber-300/80 font-bold mt-0.5">
                {Math.round(topScorer?.total_points || 0)} Total Points
              </div>
            </div>
          </div>

          {/* Total Participants */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 bg-slate-900/60 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active Participants
              </div>
              <div className="text-2xl font-black text-white">
                {leaderboard.length} Members
              </div>
            </div>
          </div>

          {/* Weekly Loser / Penalty Alert */}
          <div className="glass-card rounded-2xl p-5 border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-slate-900/60 to-slate-900/80 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center space-x-1">
                <span>🚨 Weekly Loser</span>
              </div>
              <div className="text-sm font-extrabold text-rose-200 truncate max-w-[180px]">
                {weeklyLoser ? formatDisplayName(weeklyLoser.email) : 'None yet'}
              </div>
              <div className="text-xs text-rose-400/80 font-bold mt-0.5">
                {weeklyLoser ? `${Math.round(weeklyLoser.total_points)} Points (2.5 Shots Due)` : 'All tied'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/70 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6 text-center w-16">Rank</th>
                <th className="py-4 px-6">Participant</th>
                <th className="py-4 px-6 text-center">Correct Picks</th>
                <th className="py-4 px-6 text-center">Total Submitted</th>
                <th className="py-4 px-6 text-center">Accuracy</th>
                <th className="py-4 px-6 text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <span className="text-xs text-slate-400 font-medium">Calculating standings...</span>
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs italic">
                    No participants or graded picks in this pool yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrent = currentUser?.id === entry.user_id;
                  const isLoser = entry.is_weekly_loser;
                  const accuracy = entry.total_picks > 0 
                    ? Math.round((entry.correct_picks / entry.total_picks) * 100) 
                    : 0;
                  const displayName = formatDisplayName(entry.email);

                  return (
                    <tr
                      key={entry.user_id}
                      className={`transition-colors duration-150 ${
                        isLoser
                          ? 'bg-rose-950/35 border-l-4 border-l-rose-500 hover:bg-rose-950/50'
                          : isCurrent
                          ? 'bg-cyan-950/25 border-l-4 border-l-cyan-400 hover:bg-cyan-950/40'
                          : rank === 1
                          ? 'bg-amber-950/15 hover:bg-slate-900/80'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">{getRankBadge(rank)}</div>
                      </td>

                      {/* Participant & Badges */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                            <span className={`font-semibold ${isLoser ? 'text-rose-200' : 'text-white'}`}>
                              {displayName}
                            </span>

                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                YOU
                              </span>
                            )}

                            {isLoser && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shadow-sm shadow-rose-500/20">
                                <span>🚨</span>
                                <span>2.5 SHOTS DUE</span>
                              </span>
                            )}
                          </div>
                          {entry.email && displayName !== entry.email && !displayName.includes(entry.email) && (
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {entry.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Correct Picks */}
                      <td className="py-4 px-6 text-center font-bold text-slate-200">
                        <div className="inline-flex items-center space-x-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{entry.correct_picks}</span>
                        </div>
                      </td>

                      {/* Total Picks */}
                      <td className="py-4 px-6 text-center font-medium text-slate-400">
                        {entry.total_picks}
                      </td>

                      {/* Accuracy */}
                      <td className="py-4 px-6 text-center">
                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300">
                          {accuracy}%
                        </span>
                      </td>

                      {/* Total Points */}
                      <td className="py-4 px-6 text-right">
                        <span className={`text-lg font-black tracking-tight ${
                          isLoser
                            ? 'text-rose-400 font-extrabold'
                            : rank === 1
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}>
                          {Math.round(entry.total_points)} <span className="text-xs font-normal text-slate-500">PTS</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
