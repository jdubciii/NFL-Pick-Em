import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Skull, 
  Flame, 
  Trophy, 
  Crown, 
  RefreshCw, 
  Percent, 
  Wine, 
  AlertTriangle, 
  ArrowUpDown,
  TrendingDown
} from 'lucide-react';

export interface CumulativeMember {
  user_id: string;
  email: string;
  total_shots_drank: number;
  first_place_finishes: number;
  dead_place_finishes: number;
  total_picks: number;
  correct_picks: number;
  accuracy_percentage: number;
  updated_at: string;
}

export interface CumulativeResponse {
  pool_id: string;
  pool_name: string;
  total_pool_shots: number;
  leaderboard: CumulativeMember[];
}

interface PoolOption {
  id: string;
  name: string;
}

/**
 * Formats incoming cumulative shots value into an odometer readout with padded whole number portion and exact 2-decimal precision.
 * Example: 1 -> { wholeDigits: ['0','0','0','1'], decimalDigits: ['0','0'], formatted: '0001.00', numericValue: 1.0 }
 * Example: 0.5 -> { wholeDigits: ['0','0','0','0'], decimalDigits: ['5','0'], formatted: '0000.50', numericValue: 0.5 }
 */
export const parseAndFormatOdometer = (
  rawVal: number | string | null | undefined,
  padDigits = 4
): { wholeDigits: string[]; decimalDigits: string[]; formatted: string; numericValue: number } => {
  const numericValue = typeof rawVal === 'number'
    ? (isNaN(rawVal) ? 0 : rawVal)
    : parseFloat(String(rawVal || 0)) || 0;
  const fixedStr = numericValue.toFixed(2);
  const [wholePart, decimalPart] = fixedStr.split('.');
  const paddedWhole = wholePart.padStart(padDigits, '0');
  const wholeDigits = paddedWhole.split('');
  const decimalDigits = (decimalPart || '00').split('');

  return {
    wholeDigits,
    decimalDigits,
    formatted: `${paddedWhole}.${decimalPart || '00'}`,
    numericValue,
  };
};

export const WallOfShame: React.FC = () => {
  const { token } = useAuth();
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [cumulativeData, setCumulativeData] = useState<CumulativeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'shots' | 'wins' | 'dead_place' | 'accuracy'>('shots');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 1. Fetch available pools
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await fetch('/api/pools', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch pools');
        const data = await res.json();
        setPools(data);
        if (data.length > 0) {
          setSelectedPoolId(data[0].id);
        }
      } catch (err: any) {
        console.error('Error loading pools:', err);
        setError('Failed to load league pools.');
      }
    };

    fetchPools();
  }, [token]);

  // 2. Fetch cumulative leaderboard when pool or sort changes
  const fetchCumulativeStats = async (poolId: string) => {
    if (!poolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pools/${poolId}/leaderboard/cumulative?sort_by=${sortBy}&order=${sortOrder}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load cumulative standings.');
      }

      const data: CumulativeResponse = await res.json();
      setCumulativeData(data);
    } catch (err: any) {
      console.error('Error fetching cumulative stats:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPoolId) {
      fetchCumulativeStats(selectedPoolId);
    }
  }, [selectedPoolId, sortBy, sortOrder]);

  const handleSort = (field: 'shots' | 'wins' | 'dead_place' | 'accuracy') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Identify reigning dead place monarch (user with max dead_place_finishes > 0)
  const deadPlaceLeader = cumulativeData?.leaderboard.reduce<CumulativeMember | null>((prev, current) => {
    if (current.dead_place_finishes === 0) return prev;
    if (!prev || current.dead_place_finishes > prev.dead_place_finishes) {
      return current;
    }
    return prev;
  }, null);

  const odometerData = parseAndFormatOdometer(cumulativeData?.total_pool_shots);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Pool Selection */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                WALL OF <span className="text-rose-500">SHAME</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Season-long penalty ledger, shot debt tracker & Dead Place Hall of Infamy
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {pools.length > 1 && (
            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => selectedPoolId && fetchCumulativeStats(selectedPoolId)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Banner Row: Dead Place Crown + Shot Odometer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Dead Place Crown Banner (2 Cols) */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/70 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-rose-950/40">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Dead Place Monarch</span>
              </div>

              {deadPlaceLeader ? (
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white truncate max-w-md">
                    {deadPlaceLeader.email}
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    Has finished dead last in{' '}
                    <span className="font-extrabold text-rose-400">
                      {deadPlaceLeader.dead_place_finishes} week{deadPlaceLeader.dead_place_finishes > 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-slate-400">No Monarch Crowned Yet</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Execute weekly finalization wrap-up to assign the Dead Place crown.
                  </p>
                </div>
              )}
            </div>

            {deadPlaceLeader && (
              <div className="flex items-center space-x-4 bg-slate-950/80 border border-rose-500/30 rounded-2xl p-4 sm:p-5 shadow-inner">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-rose-400 font-mono">
                    {deadPlaceLeader.dead_place_finishes}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                    Dead Finishes
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-800" />
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                    {(parseFloat(String(deadPlaceLeader.total_shots_drank ?? 0)) || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                    Shots Drank
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Shot Odometer (1 Col) */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/60 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-amber-950/30 flex flex-col justify-between">
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Shot Odometer</span>
            </div>
            <Wine className="w-6 h-6 text-amber-400/60" />
          </div>

          <div className="my-6">
            {/* Mechanical Odometer Wheels Readout */}
            <div className="inline-flex items-center bg-slate-950 p-2 sm:p-2.5 rounded-2xl border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              {/* Whole Digits */}
              <div className="flex space-x-1">
                {odometerData.wholeDigits.map((digit, idx) => (
                  <div
                    key={`whole-${idx}`}
                    className="w-8 h-11 sm:w-10 sm:h-14 bg-gradient-to-b from-slate-900 via-black to-slate-900 rounded-lg border border-slate-700/80 shadow-inner flex items-center justify-center font-mono font-black text-xl sm:text-3xl text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              {/* Decimal Point */}
              <div className="px-1 text-xl sm:text-3xl font-mono font-black text-amber-500 animate-pulse flex items-end pb-1.5 sm:pb-2">
                .
              </div>

              {/* Fractional Digits (Split Penalty Precision) */}
              <div className="flex space-x-1">
                {odometerData.decimalDigits.map((digit, idx) => (
                  <div
                    key={`dec-${idx}`}
                    className="w-8 h-11 sm:w-10 sm:h-14 bg-gradient-to-b from-amber-950/80 via-black to-amber-950/80 rounded-lg border border-amber-600/60 shadow-inner flex items-center justify-center font-mono font-black text-xl sm:text-3xl text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                Pool Shots Total
              </span>
              <span className="font-mono text-xs font-bold text-amber-400/90">
                {odometerData.formatted}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Total cumulative shots consumed across all members in {cumulativeData?.pool_name || 'League'}.
            </p>
          </div>

          <div className="w-full bg-slate-900/90 rounded-full h-2.5 border border-slate-800 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(10, odometerData.numericValue * 5))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cumulative Stats Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cyan-400" />
              Season-Long Cumulative Standings
            </h3>
            <p className="text-xs text-slate-400">
              Complete aggregate metrics across all simulated and finalized game weeks
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            {cumulativeData?.leaderboard.length || 0} Pool Members Enrolled
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-black tracking-wider uppercase text-slate-400">
                <th className="py-4 px-6">Rank & Member</th>
                <th className="py-4 px-4 text-center cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => handleSort('accuracy')}>
                  <div className="flex items-center justify-center space-x-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Correct Picks %</span>
                    <ArrowUpDown className="w-3 h-3 ml-1 opacity-60" />
                  </div>
                </th>
                <th className="py-4 px-4 text-center cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => handleSort('wins')}>
                  <div className="flex items-center justify-center space-x-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>1st Place Wins</span>
                    <ArrowUpDown className="w-3 h-3 ml-1 opacity-60" />
                  </div>
                </th>
                <th className="py-4 px-4 text-center cursor-pointer hover:text-rose-400 transition-colors" onClick={() => handleSort('dead_place')}>
                  <div className="flex items-center justify-center space-x-1">
                    <Skull className="w-3.5 h-3.5 text-rose-400" />
                    <span>Dead Finishes</span>
                    <ArrowUpDown className="w-3 h-3 ml-1 opacity-60" />
                  </div>
                </th>
                <th className="py-4 px-6 text-right cursor-pointer hover:text-amber-400 transition-colors" onClick={() => handleSort('shots')}>
                  <div className="flex items-center justify-end space-x-1">
                    <Wine className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cumulative Shots</span>
                    <ArrowUpDown className="w-3 h-3 ml-1 opacity-60" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading && !cumulativeData ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                      <span>Loading Wall of Shame records...</span>
                    </div>
                  </td>
                </tr>
              ) : cumulativeData?.leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No cumulative records found for this pool.
                  </td>
                </tr>
              ) : (
                cumulativeData?.leaderboard.map((member, idx) => {
                  const isDeadLeader = deadPlaceLeader?.user_id === member.user_id && member.dead_place_finishes > 0;
                  const shotsNum = typeof member.total_shots_drank === 'number'
                    ? (isNaN(member.total_shots_drank) ? 0 : member.total_shots_drank)
                    : (parseFloat(String(member.total_shots_drank ?? 0)) || 0);
                  const isTopShooter = shotsNum > 0 && idx === 0 && sortBy === 'shots';

                  return (
                    <tr
                      key={member.user_id}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isDeadLeader ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Rank & User */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-xs font-bold text-slate-400 w-5">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center space-x-2">
                              <span>{member.email}</span>
                              {isDeadLeader && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  👑 SHAME
                                </span>
                              )}
                              {isTopShooter && !isDeadLeader && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  🔥 MOST SHOTS
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {member.correct_picks} correct / {member.total_picks} picks
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Accuracy % */}
                      <td className="py-4 px-4 text-center font-mono">
                        <span className="font-bold text-cyan-400">
                          {member.accuracy_percentage.toFixed(1)}%
                        </span>
                      </td>

                      {/* 1st Place Finishes */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                            member.first_place_finishes > 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'text-slate-500'
                          }`}
                        >
                          {member.first_place_finishes}
                        </span>
                      </td>

                      {/* Dead Place Finishes */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                            member.dead_place_finishes > 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-extrabold'
                              : 'text-slate-500'
                          }`}
                        >
                          {member.dead_place_finishes}
                        </span>
                      </td>

                      {/* Cumulative Shots Drank */}
                      <td className="py-4 px-6 text-right font-mono">
                        <div className="flex items-center justify-end space-x-2">
                          <span
                            className={`text-base font-black ${
                              shotsNum > 0
                                ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                                : 'text-slate-500'
                            }`}
                          >
                            {shotsNum.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-500">shots</span>
                        </div>
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
