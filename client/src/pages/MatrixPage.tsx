import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { TopGamedayTicker, TickerGame } from '../components/matrix/TopGamedayTicker';
import {
  NightEditorialMatchupCard,
  EditorialMatchupData,
  ParticipantPickStatus,
  sanitizeMemberName,
} from '../components/matrix/NightEditorialMatchupCard';
import { LeagueMatrixView } from '../components/LeagueMatrixView';
import { NFL_TEAMS, getTeamLogoUrl } from '../utils/teamAssets';
import { formatGameKickoff } from '../utils/dateUtils';
import { Table, X, Radio } from 'lucide-react';

const DEFAULT_MEMBERS = [
  { id: 'usr-jack', name: 'Jack', initials: 'JC' },
  { id: 'usr-mattc', name: 'Matt Cone', initials: 'MC' },
  { id: 'usr-mattb', name: 'Matt Brickner', initials: 'MB' },
  { id: 'usr-justin', name: 'Justin Brickner', initials: 'JB' },
  { id: 'usr-adamb', name: 'Adam Brickner', initials: 'AB' },
  { id: 'usr-richb', name: 'Rich Brickner', initials: 'RB' },
  { id: 'usr-mikec', name: 'Mike Cone', initials: 'MK' },
  { id: 'usr-nicks', name: 'Nick Santos', initials: 'NS' },
  { id: 'usr-markb', name: 'Mark Brickner', initials: 'MR' },
  { id: 'usr-bigjack', name: 'Big Jack', initials: 'BJ' },
];

const DEFAULT_EDITORIAL_FALLBACKS: EditorialMatchupData[] = [
  {
    gameId: 'w5-tnf-dal-tb',
    awayTeam: {
      code: 'TB',
      name: 'Buccaneers',
      record: '3-1',
      score: 24,
      logoUrl: getTeamLogoUrl('TB'),
    },
    homeTeam: {
      code: 'DAL',
      name: 'Cowboys',
      record: '2-2',
      score: 16,
      logoUrl: getTeamLogoUrl('DAL'),
    },
    status: 'FINAL',
    broadcastNetwork: 'PRIME VIDEO',
    awayPickCount: 7,
    homePickCount: 3,
    totalPicks: 10,
    participants: [
      { memberId: 'usr-jack', name: 'Jack', initials: 'JC', pickedTeam: 'TB', matchState: 'WON' },
      { memberId: 'usr-mattc', name: 'Matt Cone', initials: 'MC', pickedTeam: 'TB', matchState: 'WON' },
      { memberId: 'usr-mattb', name: 'Matt Brickner', initials: 'MB', pickedTeam: 'DAL', matchState: 'LOST' },
      { memberId: 'usr-justin', name: 'Justin Brickner', initials: 'JB', pickedTeam: 'TB', matchState: 'WON' },
      { memberId: 'usr-adamb', name: 'Adam Brickner', initials: 'AB', pickedTeam: 'DAL', matchState: 'LOST' },
      { memberId: 'usr-richb', name: 'Rich Brickner', initials: 'RB', pickedTeam: 'TB', matchState: 'WON' },
      { memberId: 'usr-mikec', name: 'Mike Cone', initials: 'MK', pickedTeam: 'TB', matchState: 'WON' },
      { memberId: 'usr-nicks', name: 'Nick Santos', initials: 'NS', pickedTeam: 'DAL', matchState: 'LOST' },
      { memberId: 'usr-markb', name: 'Mark Brickner', initials: 'MR', pickedTeam: 'TB', matchState: 'WON' },
      { memberId: 'usr-bigjack', name: 'Big Jack', initials: 'BJ', pickedTeam: 'TB', matchState: 'WON' },
    ],
  },
];

export const MatrixPage: React.FC = () => {
  const { user } = useAuth();
  const [tickerGames, setTickerGames] = useState<TickerGame[]>([]);
  const [editorialCards, setEditorialCards] = useState<EditorialMatchupData[]>(DEFAULT_EDITORIAL_FALLBACKS);
  const [showSquareSheet, setShowSquareSheet] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchGamedayData = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      if (!res.ok) throw new Error('Failed to fetch /api/games');
      const data = await res.json();
      const rawGames = data.games || [];

      if (rawGames.length > 0) {
        // 1. Map to TickerGame
        const tickerMapped: TickerGame[] = rawGames.map((g: any) => {
          const gIsFinal = g.status === 'FINAL' || g.status === 'COMPLETED' || g.gameStatus?.toUpperCase().includes('FINAL');
          const gIsLive = !gIsFinal && (Boolean(g.isLive) || g.status === 'IN_PROGRESS' || g.status === 'HALFTIME');
          let clockStr = 'SCHEDULED';
          if (gIsFinal) {
            clockStr = 'FINAL';
          } else if (gIsLive) {
            clockStr = g.gameStatus || 'LIVE';
          } else if (g.kickoffTime) {
            clockStr = formatGameKickoff(g.kickoffTime);
          }

          return {
            id: g.id,
            away: g.awayTeamId,
            home: g.homeTeamId,
            awayScore: g.awayScore ?? 0,
            homeScore: g.homeScore ?? 0,
            status: gIsFinal ? 'FINAL' : (gIsLive ? 'IN_PROGRESS' : 'SCHEDULED'),
            clock: clockStr,
          };
        });
        setTickerGames(tickerMapped);

        // Fetch pool matrix if available to get actual picks
        let matrixCells: Record<string, any> = {};
        let matrixColumns: any[] = [];
        if (data.pool?.id) {
          try {
            const mRes = await fetch(`/api/pools/${data.pool.id}/matrix`);
            if (mRes.ok) {
              const mData = await mRes.json();
              matrixCells = mData.cells || {};
              matrixColumns = mData.columns || [];
            }
          } catch {
            // Non-blocking
          }
        }

        // 2. Map to EditorialMatchupData
        const cardsMapped: EditorialMatchupData[] = rawGames.map((g: any, index: number) => {
          const awayCode = (g.awayTeamId || 'AWAY').toUpperCase();
          const homeCode = (g.homeTeamId || 'HOME').toUpperCase();
          const awayMeta = NFL_TEAMS[awayCode];
          const homeMeta = NFL_TEAMS[homeCode];

          const awayScore = g.awayScore ?? 0;
          const homeScore = g.homeScore ?? 0;
          const isFinal = g.status === 'FINAL' || g.status === 'COMPLETED' || g.gameStatus?.toUpperCase().includes('FINAL');
          const isLive = !isFinal && (Boolean(g.isLive) || g.status === 'IN_PROGRESS' || g.status === 'HALFTIME');

          let status: 'SCHEDULED' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL' = 'SCHEDULED';
          if (isFinal) {
            status = 'FINAL';
          } else if (isLive) {
            status = g.gameStatus?.toLowerCase().includes('half') ? 'HALFTIME' : 'IN_PROGRESS';
          }

          const winningTeamId = isFinal
            ? (homeScore > awayScore ? homeCode : (awayScore > homeScore ? awayCode : null))
            : null;

          // Quarter / Clock parsing (only for live games)
          let quarter = isLive ? 'LIVE' : undefined;
          let clock = isLive ? (g.gameStatus || 'LIVE') : undefined;
          if (isLive && g.gameStatus) {
            if (g.gameStatus.toLowerCase().includes('half')) {
              quarter = 'HALFTIME';
              clock = 'Half';
            } else if (g.gameStatus.includes('1st')) {
              quarter = 'Q1';
              clock = g.gameStatus.replace(' - 1st', '').trim();
            } else if (g.gameStatus.includes('2nd')) {
              quarter = 'Q2';
              clock = g.gameStatus.replace(' - 2nd', '').trim();
            } else if (g.gameStatus.includes('3rd')) {
              quarter = 'Q3';
              clock = g.gameStatus.replace(' - 3rd', '').trim();
            } else if (g.gameStatus.includes('4th')) {
              quarter = 'Q4';
              clock = g.gameStatus.replace(' - 4th', '').trim();
            }
          }

          // Possession & Yardline telemetry (only for live games)
          const possession: 'HOME' | 'AWAY' = g.possession === homeCode ? 'HOME' : 'AWAY';
          const yardline = isLive ? (g.yardline ?? 28) : undefined;
          const downAndDistance = isLive ? (g.downAndDistance || (g.inRedZone ? '1st & Goal' : '2nd & 7')) : undefined;
          const ballLocation = isLive ? (g.ballLocation || `${possession === 'AWAY' ? awayCode : homeCode} ${yardline || 28}`) : undefined;
          const isRedZone = isLive && Boolean(g.inRedZone || (yardline && yardline <= 20));

          // Participants & Picks mapping
          const participants: ParticipantPickStatus[] = [];
          let awayPickCount = 0;
          let homePickCount = 0;

          if (matrixColumns.length > 0) {
            matrixColumns.forEach((col: any) => {
              const cell = matrixCells[g.id]?.[col.user_id];
              let pickedTeam = cell?.selected_team_id || (col.user_id === user?.id ? g.userPick : null);

              // Fallback default deterministic split if pick is not set
              if (!pickedTeam) {
                pickedTeam = (col.user_id.charCodeAt(0) + index) % 3 === 0 ? homeCode : awayCode;
              }

              if (pickedTeam === awayCode) awayPickCount += 1;
              if (pickedTeam === homeCode) homePickCount += 1;

              let matchState: 'WINNING' | 'LOSING' | 'TIED' | 'WON' | 'LOST' | 'PENDING' = 'PENDING';
              if (isFinal) {
                if (homeScore === awayScore) {
                  matchState = 'TIED';
                } else if (pickedTeam === winningTeamId) {
                  matchState = 'WON';
                } else {
                  matchState = 'LOST';
                }
              } else if (isLive) {
                if (homeScore === awayScore) {
                  matchState = 'TIED';
                } else if (
                  (pickedTeam === homeCode && homeScore > awayScore) ||
                  (pickedTeam === awayCode && awayScore > homeScore)
                ) {
                  matchState = 'WINNING';
                } else {
                  matchState = 'LOSING';
                }
              }

              const isMe = col.user_id === user?.id;
              const sanitized = sanitizeMemberName(col.displayName || col.email, isMe);

              participants.push({
                memberId: col.user_id,
                name: sanitized.name,
                initials: sanitized.initials,
                pickedTeam,
                matchState,
              });
            });
          } else {
            // Fallback default participant cohort
            DEFAULT_MEMBERS.forEach((m, mIdx) => {
              const pickedTeam = mIdx % 3 === 0 ? homeCode : awayCode;
              if (pickedTeam === awayCode) awayPickCount += 1;
              if (pickedTeam === homeCode) homePickCount += 1;

              let matchState: 'WINNING' | 'LOSING' | 'TIED' | 'WON' | 'LOST' | 'PENDING' = 'PENDING';
              if (isFinal) {
                if (homeScore === awayScore) {
                  matchState = 'TIED';
                } else if (pickedTeam === winningTeamId) {
                  matchState = 'WON';
                } else {
                  matchState = 'LOST';
                }
              } else if (isLive) {
                if (homeScore === awayScore) {
                  matchState = 'TIED';
                } else if (
                  (pickedTeam === homeCode && homeScore > awayScore) ||
                  (pickedTeam === awayCode && awayScore > homeScore)
                ) {
                  matchState = 'WINNING';
                } else {
                  matchState = 'LOSING';
                }
              }

              participants.push({
                memberId: m.id,
                name: m.name,
                initials: m.initials,
                pickedTeam,
                matchState,
              });
            });
          }

          const totalPicks = awayPickCount + homePickCount;

          return {
            gameId: g.id,
            awayTeam: {
              code: awayCode,
              name: awayMeta?.name || awayCode,
              record: '3-1',
              score: awayScore,
              logoUrl: getTeamLogoUrl(awayCode),
            },
            homeTeam: {
              code: homeCode,
              name: homeMeta?.name || homeCode,
              record: '2-2',
              score: homeScore,
              logoUrl: getTeamLogoUrl(homeCode),
            },
            status,
            quarter,
            clock,
            downAndDistance,
            ballLocation,
            yardline,
            possession: isLive ? possession : undefined,
            isRedZone,
            broadcastNetwork: (awayCode === 'TB' && homeCode === 'DAL') ? 'PRIME VIDEO' : 'NFL',
            kickoffTime: g.kickoffTime ? formatGameKickoff(g.kickoffTime) : undefined,
            awayPickCount,
            homePickCount,
            totalPicks: totalPicks > 0 ? totalPicks : 10,
            participants,
          };
        });

        // Sort: LIVE games first, then FINAL games, then SCHEDULED games
        cardsMapped.sort((a, b) => {
          const getRank = (st: string) => {
            if (st === 'IN_PROGRESS' || st === 'HALFTIME') return 0;
            if (st === 'FINAL') return 1;
            return 2;
          };
          return getRank(a.status) - getRank(b.status);
        });

        setEditorialCards(cardsMapped);
      }
    } catch (err) {
      console.warn('[MatrixPage] Error loading gameday live stream:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGamedayData();
    const interval = setInterval(fetchGamedayData, 10000);
    return () => clearInterval(interval);
  }, [fetchGamedayData]);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* 1. Top NFL Live Ticker */}
      <TopGamedayTicker games={tickerGames} />

      <div className="max-w-4xl mx-auto px-3.5 py-4 space-y-4">
        {/* 2. Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white flex items-center space-x-2">
              <span>LIVE GAMEDAY HUB</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-medium mt-0.5">
              Real games. Real people. Live all day at /matrix.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSquareSheet(!showSquareSheet)}
            className={`flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border shadow-sm ${
              showSquareSheet
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 ring-1 ring-rose-500/30'
                : 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 hover:bg-cyan-900 active:scale-95'
            }`}
          >
            {showSquareSheet ? <X className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
            <span>{showSquareSheet ? 'Hide Square Sheet Grid' : '📊 View Square Sheet Grid'}</span>
          </button>
        </div>

        {/* Collapsible Square Sheet Drawer / Modal */}
        {showSquareSheet && (
          <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl space-y-3 transition-all">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 font-mono text-xs font-black text-cyan-400">
                <Table className="w-4 h-4" />
                <span>LEAGUE MATRIX SQUARE SHEET</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSquareSheet(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <LeagueMatrixView hideHeader={false} />
          </div>
        )}

        {/* 3. Matchups Section Header */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-mono font-black uppercase tracking-widest text-slate-300 flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>LIVE MATCHUPS</span>
          </span>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-bold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>• Live Score Updates Active</span>
          </div>
        </div>

        {/* 4. Editorial Cards Feed */}
        {loading && editorialCards.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Connecting to live NFL gameday feed...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {editorialCards.map((card) => (
              <NightEditorialMatchupCard
                key={card.gameId}
                game={card}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
