import React, { useState, useEffect, useCallback } from 'react';
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
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  Play,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Beer,
  Video,
  Eye,
  SlidersHorizontal,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { MechanicalRollingOdometer } from './animations/MechanicalRollingOdometer';
import { DisputeCountdownClock } from './shame/DisputeCountdownClock';
import { EmojiReactionTray } from './shame/EmojiReactionTray';
import { HallOfInfamyTable } from './shame/HallOfInfamyTable';
import type { InfamyRecord } from '../services/SocialStakesEngine';


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

export interface ShameVaultItem {
  id: string;
  penaltyId: string;
  userId: string;
  displayName: string;
  initials: string;
  email: string;
  shots: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  weekNumber: number;
  isSpotlight: boolean;
  reactions: Record<string, number>;
  createdAt: string;
  confirmedBy?: string | null;
  isMonarch: boolean;
}

interface PoolOption {
  id: string;
  name: string;
}

const LEAGUE_MEMBER_CHIPS = [
  { label: 'All Members', value: 'ALL' },
  { label: 'Big Jack', value: 'bigjack@nflpickem.com' },
  { label: 'Matt Cone', value: 'matt.c@nflpickem.com' },
  { label: 'Matt Brickner', value: 'matt.b@nflpickem.com' },
  { label: 'Jack (You)', value: 'jack@nflpickem.com' },
  { label: 'Justin Brickner', value: 'justin.b@nflpickem.com' },
  { label: 'Adam Brickner', value: 'adam.b@nflpickem.com' },
  { label: 'Rich Brickner', value: 'rich.b@nflpickem.com' },
  { label: 'Mike Cone', value: 'mike.c@nflpickem.com' },
  { label: 'Nick Santos', value: 'nick.s@nflpickem.com' },
  { label: 'Mark Brickner', value: 'mark.b@nflpickem.com' },
];

const mockInfamyRecords: InfamyRecord[] = [
  { memberId: 'm1', name: 'Big Jack', shotsDrank: 4, deadPlaceFinishes: 2, maxSingleWeekDebt: 2.5 },
  { memberId: 'm2', name: 'Matt Brickner', shotsDrank: 8, deadPlaceFinishes: 3, maxSingleWeekDebt: 3 },
  { memberId: 'm3', name: 'Justin Brickner', shotsDrank: 5, deadPlaceFinishes: 1, maxSingleWeekDebt: 2 },
  { memberId: 'm4', name: 'Nick S.', shotsDrank: 2, deadPlaceFinishes: 1, maxSingleWeekDebt: 1 },
  { memberId: 'm5', name: 'Mike C.', shotsDrank: 1, deadPlaceFinishes: 0, maxSingleWeekDebt: 1 },
];

/**
 * Formats incoming cumulative shots value into an odometer readout with padded whole number portion and exact 2-decimal precision.
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

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const dayName = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dayName} • ${timeStr}`;
  } catch {
    return isoString;
  }
}

const getStoredReactions = (): Record<string, Record<string, boolean>> => {
  try {
    const raw = localStorage.getItem('penalty_reactions_v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoredReaction = (mediaId: string, emoji: string, active: boolean) => {
  try {
    const current = getStoredReactions();
    if (!current[mediaId]) current[mediaId] = {};
    current[mediaId][emoji] = active;
    localStorage.setItem('penalty_reactions_v1', JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save reaction to localStorage', err);
  }
};

export const WallOfShame: React.FC = () => {
  const { token, user } = useAuth();
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'vault' | 'cumulative'>('vault');

  // Multi-Metric Odometer State
  const [odometerUnit, setOdometerUnit] = useState<'shots' | 'fifths' | 'oz'>('shots');

  // Vault state
  const [vaultItems, setVaultItems] = useState<ShameVaultItem[]>([]);
  const [spotlightItem, setSpotlightItem] = useState<ShameVaultItem | null>(null);
  const [vaultLoading, setVaultLoading] = useState<boolean>(true);
  const [spotlightingId, setSpotlightingId] = useState<string | null>(null);

  // Reaction Persistent Active State
  const [userReactions, setUserReactions] = useState<Record<string, Record<string, boolean>>>(() => getStoredReactions());

  // Vault filter states
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('ALL');
  const [selectedPenaltyType, setSelectedPenaltyType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cumulative state
  const [cumulativeData, setCumulativeData] = useState<CumulativeResponse | null>(null);
  const [cumulativeLoading, setCumulativeLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'shots' | 'wins' | 'dead_place' | 'accuracy'>('shots');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const isCommissioner =
    user?.role === 'ADMIN' ||
    user?.email?.toLowerCase() === 'jack@nflpickem.com' ||
    user?.email?.toLowerCase() === 'admin@nflpickem.com';

  // 1. Fetch available pools with resilient Default Resolution
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await fetch('/api/pools', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch pools');
        const data: PoolOption[] = await res.json();
        setPools(data);
        if (data.length > 0) {
          const savedPoolId = localStorage.getItem('active_pool_id');
          const activePool =
            data.find((p) => p.name === 'Main League') ||
            (savedPoolId ? data.find((p) => p.id === savedPoolId) : undefined) ||
            data[0];

          if (activePool) {
            setSelectedPoolId(activePool.id);
            localStorage.setItem('active_pool_id', activePool.id);
          }
        }
      } catch (err: any) {
        console.error('Error loading pools:', err);
        setError('Failed to load league pools.');
      }
    };

    if (token) {
      fetchPools();
    }
  }, [token]);

  const handlePoolChange = (poolId: string) => {
    setSelectedPoolId(poolId);
    localStorage.setItem('active_pool_id', poolId);
  };

  // 2. Fetch Wall of Shame Punishment Vault items
  const fetchVault = useCallback(async () => {
    if (!token) return;
    setVaultLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMember !== 'ALL') params.append('memberId', selectedMember);
      if (selectedWeek !== 'ALL') params.append('week', selectedWeek);
      if (selectedPenaltyType !== 'ALL') params.append('penaltyType', selectedPenaltyType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const endpoint = selectedPoolId
        ? `/api/pools/${selectedPoolId}/shame/vault${queryStr}`
        : `/api/shame/vault${queryStr}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load punishment vault records.');
      }

      const data = await res.json();
      setVaultItems(data.vault || []);
      setSpotlightItem(data.spotlightItem || null);
    } catch (err: any) {
      console.error('Error loading shame vault:', err);
    } finally {
      setVaultLoading(false);
    }
  }, [selectedPoolId, selectedMember, selectedWeek, selectedPenaltyType, searchQuery, token]);

  // 3. Fetch cumulative stats
  const fetchCumulativeStats = useCallback(async (poolId: string) => {
    if (!poolId || !token) return;
    setCumulativeLoading(true);
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
    } finally {
      setCumulativeLoading(false);
    }
  }, [sortBy, sortOrder, token]);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  useEffect(() => {
    if (selectedPoolId) {
      fetchCumulativeStats(selectedPoolId);
    }
  }, [selectedPoolId, fetchCumulativeStats]);

  const handleRefresh = () => {
    fetchVault();
    if (selectedPoolId) fetchCumulativeStats(selectedPoolId);
  };

  // Commissioner Action: Feature Video as Shot of the Week
  const handleFeatureSpotlight = async (mediaId: string) => {
    if (!isCommissioner) return;
    setSpotlightingId(mediaId);
    setError(null);
    setSuccessMessage(null);

    try {
      const endpoint = selectedPoolId
        ? `/api/pools/${selectedPoolId}/shame/${mediaId}/spotlight`
        : `/api/shame/${mediaId}/spotlight`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to set Shot of the Week.');
      }

      setSuccessMessage('Successfully updated Shot of the Week spotlight!');
      setTimeout(() => setSuccessMessage(null), 4000);

      // Refresh vault to update hero showcase
      fetchVault();
    } catch (err: any) {
      setError(err.message || 'Error updating spotlight.');
    } finally {
      setSpotlightingId(null);
    }
  };

  // Persistent Reaction Click
  const handleReaction = async (mediaId: string, emoji: '💀' | '🍺' | '🔥') => {
    const isCurrentlyActive = Boolean(userReactions[mediaId]?.[emoji]);
    const newActive = !isCurrentlyActive;

    // Update local storage and component active state
    saveStoredReaction(mediaId, emoji, newActive);
    setUserReactions((prev) => ({
      ...prev,
      [mediaId]: {
        ...(prev[mediaId] || {}),
        [emoji]: newActive,
      },
    }));

    // Optimistic update of count
    setVaultItems((prev) =>
      prev.map((it) => {
        if (it.id === mediaId) {
          const currentCount = it.reactions?.[emoji] || 0;
          return {
            ...it,
            reactions: {
              ...it.reactions,
              [emoji]: Math.max(0, currentCount + (newActive ? 1 : -1)),
            },
          };
        }
        return it;
      })
    );

    if (spotlightItem && spotlightItem.id === mediaId) {
      const currentCount = spotlightItem.reactions?.[emoji] || 0;
      setSpotlightItem({
        ...spotlightItem,
        reactions: {
          ...spotlightItem.reactions,
          [emoji]: Math.max(0, currentCount + (newActive ? 1 : -1)),
        },
      });
    }

    try {
      const endpoint = selectedPoolId
        ? `/api/pools/${selectedPoolId}/shame/${mediaId}/react`
        : `/api/shame/${mediaId}/react`;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.warn('Reaction error:', err);
    }
  };

  const handleSort = (field: 'shots' | 'wins' | 'dead_place' | 'accuracy') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Identify reigning dead place monarch
  const deadPlaceLeader = cumulativeData?.leaderboard.reduce<CumulativeMember | null>((prev, current) => {
    if (current.dead_place_finishes === 0) return prev;
    if (!prev || current.dead_place_finishes > prev.dead_place_finishes) {
      return current;
    }
    return prev;
  }, null);

  // Conversion Metric Calculations
  const rawTotalShots = cumulativeData?.total_pool_shots ?? 7.5;
  const currentWeek = 4;
  const fifthsDowned = rawTotalShots / 17; // 17 shots per 750ml bottle (1.5oz)
  const volumeOz = rawTotalShots * 1.5; // 1.5oz per shot
  const seasonPace = (rawTotalShots / Math.max(1, currentWeek)) * 18;

  // Selected Odometer Display Value
  const displayedOdometerValue =
    odometerUnit === 'fifths'
      ? fifthsDowned
      : odometerUnit === 'oz'
      ? volumeOz
      : rawTotalShots;

  const odometerData = parseAndFormatOdometer(displayedOdometerValue);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header & Pool Selection */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/25">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                WALL OF <span className="text-rose-500">SHAME</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Searchable Punishment Vault, Shot of the Week highlight & season-long penalty hall of infamy
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'vault'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Punishment Vault</span>
            </button>
            <button
              onClick={() => setActiveTab('cumulative')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'cumulative'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Standings & Odometer</span>
            </button>
          </div>

          {pools.length > 1 && (
            <select
              value={selectedPoolId}
              onChange={(e) => handlePoolChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold"
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRefresh}
            disabled={vaultLoading || cumulativeLoading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${vaultLoading || cumulativeLoading ? 'animate-spin text-rose-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TOP BANNER ROW: Dead Place Crown + Enhanced Shot Odometer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Dead Place Crown Banner (7 Cols) */}
        <div className="lg:col-span-6 relative overflow-hidden rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/70 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-rose-950/40 flex flex-col justify-between">
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
                  <h2 className="text-xl font-bold text-slate-400">Big Jack (Week 4 Monarch)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Finished dead last in Week 4 with 8 PTS (2.5 penalty shots assigned).
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 bg-slate-950/80 border border-rose-500/30 rounded-2xl p-4 sm:p-5 shadow-inner">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-rose-400 font-mono">
                  {deadPlaceLeader?.dead_place_finishes || 1}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Dead Finishes
                </div>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                  {(parseFloat(String(deadPlaceLeader?.total_shots_drank ?? 2.5)) || 2.5).toFixed(1)}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Shots Drank
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <DisputeCountdownClock expiresAt={new Date(Date.now() + 4 * 3600 * 1000 + 5 * 60 * 1000).toISOString()} />
              <EmojiReactionTray />
            </div>
            <span className="text-[11px] font-mono">Week 4 Tiebreaker: -14 PTS</span>
          </div>
        </div>

        {/* 2. Enhanced Shot Odometer with Multi-Metric Ticker & Degenerate Conversions (6 Cols) */}
        <div className="lg:col-span-6 relative overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/60 via-slate-950 to-slate-950 p-6 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col justify-between">
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Title + Interactive Unit Toggle Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Shot Odometer</span>
            </div>

            {/* Quick Interactive Toggle Chips */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950/90 border border-amber-500/30">
              <button
                type="button"
                onClick={() => setOdometerUnit('shots')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  odometerUnit === 'shots'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                🥃 Shots (Total)
              </button>
              <button
                type="button"
                onClick={() => setOdometerUnit('fifths')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  odometerUnit === 'fifths'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                🍾 Fifths
              </button>
              <button
                type="button"
                onClick={() => setOdometerUnit('oz')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  odometerUnit === 'oz'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                ⚡ Fluid Oz
              </button>
            </div>
          </div>

          <div className="my-3">
            <MechanicalRollingOdometer
              value={displayedOdometerValue}
              label={`Active Penalty Debt (${odometerUnit.toUpperCase()})`}
              sublabel="Season-long league cumulative total"
            />
          </div>

          {/* Odometer Digit Wheels */}
          <div className="my-2">

            <div className="inline-flex items-center bg-slate-950 p-2 sm:p-2.5 rounded-2xl border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              {/* Whole Digits */}
              <div className="flex space-x-1">
                {odometerData.wholeDigits.map((digit, idx) => (
                  <div
                    key={`whole-${idx}`}
                    className="w-8 h-10 sm:w-9 sm:h-12 bg-gradient-to-b from-slate-900 via-black to-slate-900 rounded-lg border border-slate-700/80 shadow-inner flex items-center justify-center font-mono font-black text-xl sm:text-2xl text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="px-1 text-xl sm:text-2xl font-mono font-black text-amber-500 animate-pulse flex items-end pb-1 sm:pb-1.5">
                .
              </div>

              {/* Fractional Digits */}
              <div className="flex space-x-1">
                {odometerData.decimalDigits.map((digit, idx) => (
                  <div
                    key={`dec-${idx}`}
                    className="w-8 h-10 sm:w-9 sm:h-12 bg-gradient-to-b from-amber-950/80 via-black to-amber-950/80 rounded-lg border border-amber-600/60 shadow-inner flex items-center justify-center font-mono font-black text-xl sm:text-2xl text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between text-xs font-mono font-bold text-amber-400">
              <span className="text-[10px] uppercase text-slate-400 tracking-wider">
                {odometerUnit === 'fifths' ? '🍾 750ml Bottles' : odometerUnit === 'oz' ? '⚡ Total Fluid Ounces' : '🥃 Total Penalty Shots'}
              </span>
              <span>{odometerData.formatted} {odometerUnit.toUpperCase()}</span>
            </div>
          </div>

          {/* 3 Degenerate Conversion Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
            {/* 1. Fifths */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 truncate">🍾 750ml Fifths</div>
              <div className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
                {fifthsDowned.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">btls</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">17 shots/bottle</div>
            </div>

            {/* 2. Volume Ounces */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 truncate">🥃 Volume (oz)</div>
              <div className="text-sm sm:text-base font-black text-rose-400 font-mono mt-0.5">
                {volumeOz.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">oz</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">Straight liquor</div>
            </div>

            {/* 3. Season Pace */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 truncate">📈 Season Pace</div>
              <div className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5">
                {seasonPace.toFixed(0)} <span className="text-[10px] text-slate-400 font-normal">shots</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">18-week proj</div>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: PUNISHMENT VAULT & SHOT OF THE WEEK */}
      {activeTab === 'vault' && (
        <div className="space-y-8">
          {/* 1. "SHOT OF THE WEEK" HERO SHOWCASE */}
          {spotlightItem && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-amber-500/20">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Hero Showcase Cinema Player (7 cols) */}
                <div className="lg:col-span-7">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-black aspect-video flex items-center justify-center group shadow-2xl shadow-black/80">
                    <video
                      src={spotlightItem.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />

                    {/* Spotlight Floating Trophy Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-xl pointer-events-none">
                      <Trophy className="w-4 h-4 text-slate-950" />
                      <span>Shot of the Week</span>
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                      Week {spotlightItem.weekNumber}
                    </div>
                  </div>
                </div>

                {/* Hero Showcase Story & Quote (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Curated League Highlight
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                        {spotlightItem.initials}
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          {spotlightItem.displayName}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {spotlightItem.email} • {spotlightItem.shots.toFixed(1)} Shot Penalty
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Caption Quote Card */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-xs sm:text-sm text-amber-200/90 italic leading-relaxed shadow-inner">
                    <p>"{spotlightItem.caption}"</p>
                    <span className="block mt-2 text-[11px] not-italic font-bold text-slate-400">
                      — Commissioner Quote: "Flawless penalty execution with zero hesitation."
                    </span>
                  </div>

                  {/* Reaction Bar with Persistent State */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {(['💀', '🍺', '🔥'] as const).map((emoji) => {
                      const count = spotlightItem.reactions?.[emoji] || 0;
                      const isActive = Boolean(userReactions[spotlightItem.id]?.[emoji]);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReaction(spotlightItem.id, emoji)}
                          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 shadow-md border ${
                            isActive
                              ? 'ring-1.5 ring-cyan-400 bg-cyan-950/80 text-cyan-300 font-bold scale-105 shadow-[0_0_12px_rgba(6,182,212,0.35)] border-cyan-400/60'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-amber-500/30 hover:border-amber-500'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className={isActive ? 'text-cyan-300' : 'text-amber-300'}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SEARCH & FILTER CONTROL BAR */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search text input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search penalties by member, team, excuse or caption..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all font-medium"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Week Selector */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Week:</span>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-rose-500"
                  >
                    <option value="ALL">All Weeks</option>
                    <option value="1">Week 1</option>
                    <option value="2">Week 2</option>
                    <option value="3">Week 3</option>
                    <option value="4">Week 4</option>
                  </select>
                </div>

                {/* Penalty Type Filter */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Type:</span>
                  <select
                    value={selectedPenaltyType}
                    onChange={(e) => setSelectedPenaltyType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-rose-500"
                  >
                    <option value="ALL">All Penalties</option>
                    <option value="monarch">Dead Place Monarch (2.5)</option>
                    <option value="regular">Regular Penalties (1-2)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Member Quick-Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 shrink-0">
                Filter:
              </span>
              {LEAGUE_MEMBER_CHIPS.map((chip) => {
                const isSelected = selectedMember === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setSelectedMember(chip.value)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                      isSelected
                        ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-md shadow-rose-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. RESPONSIVE VIDEO GRID (3-Column Desktop / 1-Column Mobile) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  Historical Punishment Archive
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {vaultItems.length} Video Proof Record{vaultItems.length !== 1 ? 's' : ''} Found
              </span>
            </div>

            {vaultLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                <span className="text-xs font-mono">Loading punishment vault entries...</span>
              </div>
            ) : vaultItems.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 space-y-2 text-slate-400">
                <Beer className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No penalty videos match your filter criteria.</p>
                <p className="text-xs text-slate-500">Try selecting "All Members" or clear the search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vaultItems.map((item) => {
                  const isConfirmed = item.status === 'CONFIRMED';

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border bg-slate-900/80 p-5 shadow-xl space-y-4 transition-all hover:border-slate-700 flex flex-col justify-between ${
                        item.isSpotlight
                          ? 'border-amber-500/60 shadow-amber-500/10'
                          : item.isMonarch
                          ? 'border-rose-500/40 shadow-rose-500/10'
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Video Card Top: Avatar & Week */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white font-black flex items-center justify-center text-xs shadow-md">
                              {item.initials}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                                <span>{item.displayName}</span>
                                {item.isSpotlight && (
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Week {item.weekNumber}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono border ${
                              item.isMonarch
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {item.shots.toFixed(1)} Shot{item.shots > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Video Player */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center shadow-lg">
                          <video
                            src={item.videoUrl}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain"
                          />

                          {item.isMonarch && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[9px] font-black uppercase tracking-wider shadow pointer-events-none">
                              Monarch
                            </div>
                          )}
                        </div>

                        {/* Caption */}
                        {item.caption && (
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 italic line-clamp-2">
                            "{item.caption}"
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Reactions & Commissioner Spotlight Button */}
                      <div className="pt-3 border-t border-slate-800/60 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          {/* Emoji Reactions with Persistent State */}
                          <div className="flex items-center space-x-1.5">
                            {(['💀', '🍺', '🔥'] as const).map((emoji) => {
                              const count = item.reactions?.[emoji] || 0;
                              const isActive = Boolean(userReactions[item.id]?.[emoji]);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleReaction(item.id, emoji)}
                                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all active:scale-95 border ${
                                    isActive
                                      ? 'ring-1.5 ring-cyan-400 bg-cyan-950/80 text-cyan-300 font-bold scale-105 shadow-[0_0_12px_rgba(6,182,212,0.35)] border-cyan-400/60'
                                      : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                                  }`}
                                  title={`React with ${emoji}`}
                                >
                                  <span>{emoji}</span>
                                  <span className={isActive ? 'text-cyan-300' : 'text-slate-400'}>{count}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Verification Badge */}
                          {isConfirmed ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>

                        {/* Commissioner Spotlight Toggle Button */}
                        {isCommissioner && (
                          <button
                            type="button"
                            onClick={() => handleFeatureSpotlight(item.id)}
                            disabled={spotlightingId === item.id || item.isSpotlight}
                            className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1.5 transition-all border ${
                              item.isSpotlight
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-default'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/50 shadow-sm'
                            } disabled:opacity-60`}
                          >
                            <Star className={`w-3.5 h-3.5 ${item.isSpotlight ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                            <span>
                              {spotlightingId === item.id
                                ? 'Featuring...'
                                : item.isSpotlight
                                ? '★ Featured as Shot of the Week'
                                : 'Feature as Shot of the Week'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW TAB 2: CUMULATIVE STANDINGS & STATS TABLE */}
      {activeTab === 'cumulative' && (
        <div className="glass-panel rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
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
                {cumulativeLoading && !cumulativeData ? (
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
      )}
      {/* Hall of Infamy Multi-Criteria Shame Table */}
      <div className="mt-8">
        <HallOfInfamyTable
          records={
            cumulativeData?.leaderboard && cumulativeData.leaderboard.length > 0
              ? cumulativeData.leaderboard.map((m) => ({
                  memberId: m.user_id,
                  name: m.email.split('@')[0],
                  shotsDrank: parseFloat(String(m.total_shots_drank || 0)),
                  deadPlaceFinishes: m.dead_place_finishes || 0,
                  maxSingleWeekDebt: (m.dead_place_finishes || 0) * 1.0 || 1.0,
                }))
              : mockInfamyRecords
          }
        />
      </div>
    </div>
  );
};

export default WallOfShame;
