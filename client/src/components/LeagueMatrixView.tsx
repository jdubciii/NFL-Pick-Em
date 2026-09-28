import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Grid,
  Lock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Trophy,
  Beer,
  Target,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

export interface MatrixMemberColumn {
  user_id: string;
  email: string;
  displayName?: string;
}

export interface MatrixGameRow {
  game_id: string;
  external_game_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_time: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  home_score: number | null;
  away_score: number | null;
  spread?: number | null;
}

export interface MatrixPickCell {
  pick_id: string | null;
  selected_team_id: string | null;
  is_masked: boolean;
  is_correct?: boolean | null;
  points_awarded?: number | null;
}

export interface MatrixMemberSummary {
  user_id: string;
  weekly_wins: number;
  tiebreaker_guess: number | null;
  cumulative_shots: number;
}

export interface MatrixResponsePayload {
  metadata: {
    pool_id: string;
    week_number: number;
    picking_mode: string;
    hide_picks_until_kickoff: boolean;
  };
  columns: MatrixMemberColumn[];
  rows: MatrixGameRow[];
  cells: Record<string, Record<string, MatrixPickCell>>;
  summary: Record<string, MatrixMemberSummary>;
}

export interface PoolSummary {
  id: string;
  name: string;
}

export const LeagueMatrixView: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [matrixData, setMatrixData] = useState<MatrixResponsePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available pools
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await fetch('/api/pools', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: PoolSummary[] = await res.json();
          setPools(data);
          if (data.length > 0 && !selectedPoolId) {
            setSelectedPoolId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load pools:', err);
      }
    };

    if (token) {
      fetchPools();
    }
  }, [token]);

  // Fetch Matrix data
  const fetchMatrix = useCallback(async () => {
    if (!selectedPoolId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/pools/${selectedPoolId}/matrix?week_no=${selectedWeek}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load matrix (status ${response.status})`);
      }

      const data: MatrixResponsePayload = await response.json();
      setMatrixData(data);
    } catch (err: any) {
      console.error('Matrix fetch error:', err);
      setError(err.message || 'An error occurred while fetching the league matrix.');
    } finally {
      setLoading(false);
    }
  }, [selectedPoolId, selectedWeek, token]);

  useEffect(() => {
    if (selectedPoolId) {
      fetchMatrix();
    }
  }, [selectedPoolId, selectedWeek, fetchMatrix]);

  const formatKickoff = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl shadow-black/40">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Grid className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Square Sheet Matrix
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Week {selectedWeek}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Full league spreadsheet with live anti-peeking masking & precision scoring
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Pool Selector */}
          {pools.length > 1 && (
            <div className="relative">
              <select
                value={selectedPoolId}
                onChange={(e) => setSelectedPoolId(e.target.value)}
                className="appearance-none bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
              >
                {pools.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Week Selector */}
          <div className="relative">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="appearance-none bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w} className="bg-slate-900 text-white">
                  Week {w}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchMatrix}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Anti-Peeking / Rules Banner */}
      {matrixData?.metadata?.hide_picks_until_kickoff && (
        <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Anti-Peeking Active:</strong> Opponents' picks remain masked with a lock icon until their respective game kicks off.
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !matrixData && (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Loading square sheet matrix...</p>
        </div>
      )}

      {/* Spreadsheet Matrix Table */}
      {matrixData && (
        <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="overflow-x-auto max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <table className="w-full text-left border-collapse min-w-[700px]">
              {/* Table Header: Members (Columns) */}
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950">
                  {/* Top-Left Sticky Corner */}
                  <th
                    scope="col"
                    className="sticky top-0 left-0 z-40 bg-slate-950/95 backdrop-blur-md px-4 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-400 border-r border-slate-800 min-w-[220px] max-w-[240px] shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span>Game Matchup</span>
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </th>

                  {/* Member Column Headers (Sticky Top) */}
                  {matrixData.columns.map((col) => {
                    const isSelf = col.user_id === currentUser?.id;
                    const displayName = col.displayName || col.email.split('@')[0];

                    return (
                      <th
                        key={col.user_id}
                        scope="col"
                        className={`sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md px-3 py-3 text-center min-w-[120px] max-w-[150px] border-r border-slate-800/80 transition-colors ${
                          isSelf ? 'bg-cyan-950/40 text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black uppercase ${
                              isSelf
                                ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 shadow-md shadow-cyan-500/20'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {displayName.charAt(0)}
                          </div>
                          <span className="text-xs font-bold truncate max-w-[110px]" title={col.email}>
                            {displayName}
                          </span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              You
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body: Games (Rows) */}
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {matrixData.rows.map((game, rowIdx) => {
                  const isFinal = game.status === 'FINAL';
                  const isInProgress = game.status === 'IN_PROGRESS';

                  return (
                    <tr
                      key={game.game_id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        rowIdx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/70'
                      }`}
                    >
                      {/* Sticky Left Column: Game Info */}
                      <td className="sticky left-0 z-20 bg-slate-950/95 backdrop-blur-md px-4 py-3.5 border-r border-slate-800 min-w-[220px] max-w-[240px] shadow-sm">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-white tracking-wide">
                              {game.away_team_id} <span className="text-slate-500 font-normal text-xs">@</span> {game.home_team_id}
                            </span>
                            {isFinal ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Final
                              </span>
                            ) : isInProgress ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                                Live
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-800/60">
                                {formatKickoff(game.kickoff_time)}
                              </span>
                            )}
                          </div>

                          {(isFinal || isInProgress) && (
                            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                              <span>Score:</span>
                              <span className="font-bold text-slate-200">
                                {game.away_score ?? 0} - {game.home_score ?? 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Pick Cells */}
                      {matrixData.columns.map((col) => {
                        const cell = matrixData.cells[game.game_id]?.[col.user_id];
                        const isMasked = cell?.is_masked;
                        const pick = cell?.selected_team_id;
                        const isCorrect = cell?.is_correct;
                        const isSelf = col.user_id === currentUser?.id;

                        // Styling depending on game status and outcome
                        let cellBackground = 'bg-transparent';
                        let textColor = 'text-slate-200';

                        if (isMasked) {
                          cellBackground = 'bg-slate-950/60';
                        } else if (isFinal) {
                          if (isCorrect === true) {
                            cellBackground = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300';
                            textColor = 'text-emerald-300 font-black';
                          } else if (isCorrect === false) {
                            cellBackground = 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300';
                            textColor = 'text-rose-300 font-semibold';
                          } else {
                            cellBackground = 'bg-slate-900/40 text-slate-400';
                          }
                        } else if (isSelf) {
                          cellBackground = 'bg-cyan-950/15';
                        }

                        return (
                          <td
                            key={col.user_id}
                            className={`px-3 py-3 text-center border-r border-slate-800/60 transition-all ${cellBackground}`}
                          >
                            {isMasked ? (
                              <div
                                className="flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400"
                                title="Pick hidden until kickoff (Anti-Peeking)"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Lock
                                </span>
                              </div>
                            ) : pick ? (
                              <div className="flex items-center justify-center space-x-1.5">
                                <span className={`text-xs font-black tracking-wide ${textColor}`}>
                                  {pick}
                                </span>
                                {isFinal && isCorrect === true && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                                {isFinal && isCorrect === false && (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 select-none">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Summary Rows (Sticky Bottom) */}
              <tfoot className="border-t-2 border-slate-700 bg-slate-950/95 font-bold">
                {/* 1. Tiebreaker Guess Row */}
                <tr className="border-b border-slate-800/80">
                  <td className="sticky left-0 z-20 bg-slate-950/95 backdrop-blur-md px-4 py-3 border-r border-slate-800 text-xs text-indigo-300 font-extrabold flex items-center space-x-2">
                    <Target className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Tiebreaker Guess</span>
                  </td>
                  {matrixData.columns.map((col) => {
                    const guess = matrixData.summary[col.user_id]?.tiebreaker_guess;
                    return (
                      <td
                        key={col.user_id}
                        className="px-3 py-3 text-center border-r border-slate-800/60 text-xs font-mono font-black text-indigo-300"
                      >
                        {guess !== null && guess !== undefined ? `${guess} pts` : '—'}
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Weekly Wins Row */}
                <tr className="border-b border-slate-800/80">
                  <td className="sticky left-0 z-20 bg-slate-950/95 backdrop-blur-md px-4 py-3 border-r border-slate-800 text-xs text-emerald-300 font-extrabold flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Weekly Wins</span>
                  </td>
                  {matrixData.columns.map((col) => {
                    const wins = matrixData.summary[col.user_id]?.weekly_wins ?? 0;
                    return (
                      <td
                        key={col.user_id}
                        className="px-3 py-3 text-center border-r border-slate-800/60 text-xs font-black text-emerald-300"
                      >
                        {wins}
                      </td>
                    );
                  })}
                </tr>

                {/* 3. Cumulative Shots Row */}
                <tr>
                  <td className="sticky left-0 z-20 bg-slate-950/95 backdrop-blur-md px-4 py-3 border-r border-slate-800 text-xs text-amber-300 font-extrabold flex items-center space-x-2">
                    <Beer className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Cumulative Shots</span>
                  </td>
                  {matrixData.columns.map((col) => {
                    const shots = matrixData.summary[col.user_id]?.cumulative_shots ?? 0;
                    return (
                      <td
                        key={col.user_id}
                        className="px-3 py-3 text-center border-r border-slate-800/60 text-xs font-mono font-black text-amber-300"
                      >
                        {Number(shots).toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueMatrixView;
