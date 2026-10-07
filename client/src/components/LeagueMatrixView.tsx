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
  FileText,
  Check,
  Printer,
} from 'lucide-react';
import { formatGameKickoff } from '../utils/dateUtils';

const MEMBER_DISPLAY_MAP: Record<string, { name: string; initials: string }> = {
  'jack@nflpickem.com': { name: 'Jack (You)', initials: 'JC' },
  'matt.c@nflpickem.com': { name: 'Matt Cone', initials: 'MC' },
  'matt.b@nflpickem.com': { name: 'Matt Brickner', initials: 'MB' },
  'justin.b@nflpickem.com': { name: 'Justin Brickner', initials: 'JB' },
  'adam.b@nflpickem.com': { name: 'Adam Brickner', initials: 'AB' },
  'rich.b@nflpickem.com': { name: 'Rich Brickner', initials: 'RB' },
  'mike.c@nflpickem.com': { name: 'Mike Cone', initials: 'MK' },
  'nick.s@nflpickem.com': { name: 'Nick Santos', initials: 'NS' },
  'mark.b@nflpickem.com': { name: 'Mark Brickner', initials: 'MR' },
  'bigjack@nflpickem.com': { name: 'Big Jack', initials: 'BJ' },
};

function getMemberDetails(email: string, displayName?: string) {
  const lower = email.toLowerCase();
  if (MEMBER_DISPLAY_MAP[lower]) {
    return MEMBER_DISPLAY_MAP[lower];
  }
  const cleanName = displayName || email.split('@')[0];
  const parts = cleanName.split(/[\s._-]+/);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : cleanName.slice(0, 2).toUpperCase();
  return { name: cleanName, initials };
}

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
    week_number: number | string;
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

export interface LeagueMatrixViewProps {
  hideHeader?: boolean;
  initialWeek?: number | string;
}

export const LeagueMatrixView: React.FC<LeagueMatrixViewProps> = ({ hideHeader = false, initialWeek = 5 }) => {
  const { token, user: currentUser } = useAuth();
  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<number | string>(initialWeek);
  const [matrixData, setMatrixData] = useState<MatrixResponsePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedDispatch, setCopiedDispatch] = useState<boolean>(false);

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
            const mainPool = data.find(p => p.name === 'Main League') || data[0];
            if (mainPool) setSelectedPoolId(mainPool.id);
          }
        }
      } catch (err) {
        console.error('Failed to load pools:', err);
      }
    };

    if (token) {
      fetchPools();
    }
  }, [token, selectedPoolId]);

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

  const formatKickoff = (isoString: string) => formatGameKickoff(isoString);

  // Generate plaintext clipboard dispatch summary block
  const handleGenerateDispatch = async () => {
    if (!matrixData) return;

    const currentPool = pools.find((p) => p.id === selectedPoolId);
    const poolName = currentPool ? currentPool.name : 'NFL Pick \'Em Pool';
    const timestamp = new Date().toLocaleString();

    const weekLabel = matrixData.metadata.week_number === 'all' ? 'ALL WEEKS' : `WEEK ${matrixData.metadata.week_number}`;
    let text = `====================================================\n`;
    text += `🏈 NFL PICK 'EM MATRIX DISPATCH — ${weekLabel}\n`;
    text += `====================================================\n`;
    text += `Pool: ${poolName}\n`;
    text += `Mode: ${matrixData.metadata.picking_mode}\n`;
    text += `Generated: ${timestamp}\n`;
    text += `----------------------------------------------------\n\n`;

    // Columns Header
    const colHeaders = matrixData.columns.map((col) => {
      const details = getMemberDetails(col.email, col.displayName);
      return details.name.padEnd(12).slice(0, 12);
    });
    text += `${'MATCHUP'.padEnd(24)} | ${colHeaders.join(' | ')}\n`;
    text += `${'-'.repeat(24)}-+-${colHeaders.map(() => '-'.repeat(12)).join('-+-')}\n`;

    // Game Rows
    for (const game of matrixData.rows) {
      let matchupStr = `${game.away_team_id} @ ${game.home_team_id}`;
      if (game.status === 'FINAL') {
        matchupStr += ` (${game.away_score}-${game.home_score} F)`;
      } else if (game.status === 'IN_PROGRESS') {
        matchupStr += ` (${game.away_score ?? 0}-${game.home_score ?? 0} Live)`;
      }
      matchupStr = matchupStr.padEnd(24).slice(0, 24);

      const cellVals = matrixData.columns.map((col) => {
        const cell = matrixData.cells[game.game_id]?.[col.user_id];
        if (cell?.is_masked) {
          return '[LOCKED]'.padEnd(12);
        }
        if (!cell?.selected_team_id) {
          return '—'.padEnd(12);
        }
        let val = cell.selected_team_id;
        if (game.status === 'FINAL') {
          val += cell.is_correct ? ' [✓]' : ' [✗]';
        }
        return val.padEnd(12).slice(0, 12);
      });

      text += `${matchupStr} | ${cellVals.join(' | ')}\n`;
    }

    // Summary Section
    text += `${'-'.repeat(24)}-+-${colHeaders.map(() => '-'.repeat(12)).join('-+-')}\n`;

    // Tiebreaker Guesses
    const tiebreakerVals = matrixData.columns.map((col) => {
      const guess = matrixData.summary[col.user_id]?.tiebreaker_guess;
      return (guess !== null && guess !== undefined ? `${guess} pts` : '—').padEnd(12).slice(0, 12);
    });
    text += `${'🎯 TIEBREAKER GUESS'.padEnd(24)} | ${tiebreakerVals.join(' | ')}\n`;

    // Weekly Wins
    const winVals = matrixData.columns.map((col) => {
      const wins = matrixData.summary[col.user_id]?.weekly_wins ?? 0;
      return `${wins} wins`.padEnd(12).slice(0, 12);
    });
    text += `${'🏆 WEEKLY WINS'.padEnd(24)} | ${winVals.join(' | ')}\n`;

    // Cumulative Shots
    const shotVals = matrixData.columns.map((col) => {
      const shots = matrixData.summary[col.user_id]?.cumulative_shots ?? 0;
      return `${Number(shots).toFixed(2)} shots`.padEnd(12).slice(0, 12);
    });
    text += `${'🍺 CUMULATIVE SHOTS'.padEnd(24)} | ${shotVals.join(' | ')}\n`;
    text += `====================================================\n`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedDispatch(true);
      setTimeout(() => setCopiedDispatch(false), 3000);
    } catch (err) {
      console.error('Failed to copy dispatch to clipboard:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Print Styles for Landscape Letter formatting */}
      <style>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 0.4in;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Print-Only Sheet Title Block */}
      {matrixData && (
        <div className="hidden print:block mb-4 border-b pb-2 border-black">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-extrabold text-black">
                NFL PICK 'EM MATRIX — {selectedWeek === 'all' ? 'ALL WEEKS' : `WEEK ${selectedWeek}`} ({matrixData.metadata.picking_mode})
              </h1>
              <p className="text-xs text-gray-700">
                Pool: {pools.find((p) => p.id === selectedPoolId)?.name || 'Main League'} | Generated: {new Date().toLocaleString()}
              </p>
            </div>
            <div className="text-right text-xs text-gray-700">
              <span>Anti-Peeking: {matrixData.metadata.hide_picks_until_kickoff ? 'Active' : 'Open Slate'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header & Controls Toolbar (Hidden in Print) */}
      {!hideHeader ? (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl shadow-black/40 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Grid className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Square Sheet Matrix
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {selectedWeek === 'all' ? 'All Weeks' : `Week ${selectedWeek}`}
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
                onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="appearance-none bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white font-bold">
                  All Weeks (Full Season)
                </option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="bg-slate-900 text-white">
                    Week {w}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Generate Dispatch Button */}
            <button
              onClick={handleGenerateDispatch}
              disabled={loading || !matrixData}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
              title="Copy plaintext summary block to clipboard"
            >
              {copiedDispatch ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied Dispatch!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Dispatch</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              disabled={loading || !matrixData}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm disabled:opacity-50"
              title="Print or Export PDF in landscape letter format"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print</span>
            </button>

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
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg print:hidden">
          <div className="flex items-center space-x-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Matrix View:
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {selectedWeek === 'all' ? 'All Weeks' : `Week ${selectedWeek}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pool Selector */}
            {pools.length > 1 && (
              <div className="relative">
                <select
                  value={selectedPoolId}
                  onChange={(e) => setSelectedPoolId(e.target.value)}
                  className="appearance-none bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
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
                onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="appearance-none bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white font-bold">
                  All Weeks (Full Season)
                </option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="bg-slate-900 text-white">
                    Week {w}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Generate Dispatch Button */}
            <button
              onClick={handleGenerateDispatch}
              disabled={loading || !matrixData}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
              title="Copy plaintext summary block to clipboard"
            >
              {copiedDispatch ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dispatch</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              disabled={loading || !matrixData}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm disabled:opacity-50"
              title="Print or Export PDF in landscape letter format"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchMatrix}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Anti-Peeking / Rules Banner (Hidden in Print) */}
      {matrixData?.metadata?.hide_picks_until_kickoff ? (
        <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium print:hidden">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Anti-Peeking Active (Strict Mode):</strong> Competitor picks remain masked with a lock icon until their respective game kicks off.
          </span>
        </div>
      ) : (
        <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium print:hidden">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Open Slate Mode:</strong> Competitor picks become exposed as soon as their weekly submission is finalized.
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm print:hidden">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !matrixData && (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center space-y-4 print:hidden">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Loading square sheet matrix...</p>
        </div>
      )}

      {/* Spreadsheet Matrix Table */}
      {matrixData && (
        <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-black/60 overflow-hidden print:border-black print:shadow-none print:bg-white print:rounded-none">
          <div className="w-full overflow-x-auto overflow-y-auto max-h-[75vh] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 print:max-h-none print:overflow-visible">
            <table className="w-full text-left border-collapse min-w-[750px] print:min-w-0 print:text-black">
              {/* Table Header: Members (Columns) */}
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-950 print:bg-gray-100 print:border-black">
                  {/* Top-Left Sticky Corner Junction Cell */}
                  <th
                    scope="col"
                    className="sticky top-0 left-0 z-40 bg-slate-950 px-4 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-400 border-r border-b border-slate-700/80 min-w-[220px] max-w-[240px] shadow-md print:static print:bg-gray-100 print:text-black print:border-black"
                  >
                    <div className="flex items-center justify-between">
                      <span>Game Matchup</span>
                      <Clock className="w-3.5 h-3.5 text-slate-500 print:hidden" />
                    </div>
                  </th>

                  {/* Member Column Headers (Sticky Top) */}
                  {matrixData.columns.map((col) => {
                    const isSelf = col.user_id === currentUser?.id || col.email.toLowerCase() === 'jack@nflpickem.com';
                    const details = getMemberDetails(col.email, col.displayName);

                    return (
                      <th
                        key={col.user_id}
                        scope="col"
                        className={`sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700/80 shadow-md px-3 py-3 text-center min-w-[120px] max-w-[150px] border-r border-slate-700/80 transition-colors print:static print:bg-gray-100 print:text-black print:border-black ${
                          isSelf ? 'bg-cyan-950/40 text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black uppercase print:hidden ${
                              isSelf
                                ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 shadow-md shadow-cyan-500/20'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {details.initials}
                          </div>
                          <span className="text-xs font-bold truncate max-w-[110px] print:max-w-none print:text-black" title={col.email}>
                            {details.name}
                          </span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 print:hidden">
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
              <tbody className="divide-y divide-slate-800/60 font-medium print:divide-black">
                {matrixData.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={matrixData.columns.length + 1}
                      className="px-6 py-12 text-center text-slate-400 text-sm italic"
                    >
                      No games scheduled or found for this week.
                    </td>
                  </tr>
                ) : (
                  matrixData.rows.map((game, rowIdx) => {
                  const isFinal = game.status === 'FINAL';
                  const isInProgress = game.status === 'IN_PROGRESS';

                  return (
                    <tr
                      key={game.game_id}
                      className={`hover:bg-slate-800/40 transition-colors print:bg-white ${
                        rowIdx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/70'
                      }`}
                    >
                      {/* Sticky Left Column: Game Info */}
                      <td className="sticky left-0 z-20 bg-slate-900/95 backdrop-blur border-r border-slate-700/80 px-4 py-3.5 min-w-[220px] max-w-[240px] shadow-sm print:static print:bg-white print:text-black print:border-black">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-white tracking-wide print:text-black">
                              {game.away_team_id} <span className="text-slate-500 font-normal text-xs print:text-gray-600">@</span> {game.home_team_id}
                            </span>
                            {isFinal ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 print:border-black print:text-black print:bg-transparent">
                                Final
                              </span>
                            ) : isInProgress ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse print:border-black print:text-black print:bg-transparent">
                                Live
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-800/60 print:bg-transparent print:text-black">
                                {formatKickoff(game.kickoff_time)}
                              </span>
                            )}
                          </div>

                          {(isFinal || isInProgress) && (
                            <div className="flex items-center justify-between text-xs text-slate-400 font-mono print:text-gray-800">
                              <span>Score:</span>
                              <span className="font-bold text-slate-200 print:text-black">
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
                          cellBackground = 'bg-slate-950/60 print:bg-gray-100 print:text-gray-600';
                        } else if (isFinal) {
                          if (isCorrect === true) {
                            cellBackground = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 print:bg-green-100 print:text-green-900';
                            textColor = 'text-emerald-300 font-black print:text-green-900';
                          } else if (isCorrect === false) {
                            cellBackground = 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 print:bg-red-100 print:text-red-900';
                            textColor = 'text-rose-300 font-semibold print:text-red-900';
                          } else {
                            cellBackground = 'bg-slate-900/40 text-slate-400 print:bg-white print:text-black';
                          }
                        } else if (isSelf) {
                          cellBackground = 'bg-cyan-950/15 print:bg-white';
                        }

                        return (
                          <td
                            key={col.user_id}
                            className={`px-3 py-3 text-center border-r border-slate-800/60 transition-all print:border-black print:text-black ${cellBackground}`}
                          >
                            {isMasked ? (
                              <div
                                className="flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 print:border-none print:bg-transparent print:text-gray-600"
                                title="Pick hidden until kickoff (Anti-Peeking)"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-400 print:hidden" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600">
                                  Lock
                                </span>
                              </div>
                            ) : pick ? (
                              <div className="flex items-center justify-center space-x-1.5">
                                <span className={`text-xs font-black tracking-wide ${textColor}`}>
                                  {pick}
                                </span>
                                {isFinal && isCorrect === true && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 print:hidden" />
                                )}
                                {isFinal && isCorrect === false && (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 print:hidden" />
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 select-none print:text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }))}
              </tbody>

              {/* Table Footer: Summary Rows (Sticky Bottom) */}
              <tfoot className="border-t-2 border-slate-700 bg-slate-950/95 font-bold print:bg-gray-100 print:border-black">
                {/* 1. Tiebreaker Guess Row */}
                <tr className="border-b border-slate-800/80 print:border-black">
                  <td className="sticky left-0 z-10 bg-slate-900/95 backdrop-blur border-r border-slate-700/80 px-4 py-3 text-xs text-indigo-300 font-extrabold flex items-center space-x-2 print:static print:bg-gray-100 print:text-black print:border-black">
                    <Target className="w-4 h-4 text-indigo-400 shrink-0 print:hidden" />
                    <span>Tiebreaker Guess</span>
                  </td>
                  {matrixData.columns.map((col) => {
                    const guess = matrixData.summary[col.user_id]?.tiebreaker_guess;
                    return (
                      <td
                        key={col.user_id}
                        className="px-3 py-3 text-center border-r border-slate-800/60 text-xs font-mono font-black text-indigo-300 print:border-black print:text-black"
                      >
                        {guess !== null && guess !== undefined ? `${guess} pts` : '—'}
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Weekly Wins Row */}
                <tr className="border-b border-slate-800/80 print:border-black">
                  <td className="sticky left-0 z-10 bg-slate-900/95 backdrop-blur border-r border-slate-700/80 px-4 py-3 text-xs text-emerald-300 font-extrabold flex items-center space-x-2 print:static print:bg-gray-100 print:text-black print:border-black">
                    <Trophy className="w-4 h-4 text-emerald-400 shrink-0 print:hidden" />
                    <span>Weekly Wins</span>
                  </td>
                  {matrixData.columns.map((col) => {
                    const wins = matrixData.summary[col.user_id]?.weekly_wins ?? 0;
                    return (
                      <td
                        key={col.user_id}
                        className="px-3 py-3 text-center border-r border-slate-800/60 text-xs font-black text-emerald-300 print:border-black print:text-black"
                      >
                        {wins}
                      </td>
                    );
                  })}
                </tr>

                {/* 3. Cumulative Shots Row */}
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-900/95 backdrop-blur border-r border-slate-700/80 px-4 py-3 text-xs text-amber-300 font-extrabold flex items-center space-x-2 print:static print:bg-gray-100 print:text-black print:border-black">
                    <Beer className="w-4 h-4 text-amber-400 shrink-0 print:hidden" />
                    <span>Cumulative Shots</span>
                  </td>
                  {matrixData.columns.map((col) => {
                    const shots = matrixData.summary[col.user_id]?.cumulative_shots ?? 0;
                    return (
                      <td
                        key={col.user_id}
                        className="px-3 py-3 text-center border-r border-slate-800/60 text-xs font-mono font-black text-amber-300 print:border-black print:text-black"
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
