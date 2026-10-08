import React, { useState } from 'react';
import { TopGamedayTicker, TickerGame } from '../components/matrix/TopGamedayTicker';
import { NightEditorialMatchupCard, EditorialMatchupData } from '../components/matrix/NightEditorialMatchupCard';
import { LeagueMatrixView } from '../components/LeagueMatrixView';

// Sample Mock/Hydrated Slate Data
const MOCK_TICKER_GAMES: TickerGame[] = [
  { id: '1', away: 'KC', home: 'BUF', awayScore: 24, homeScore: 21, status: 'IN_PROGRESS', clock: 'Q4 06:42' },
  { id: '2', away: 'SF', home: 'SEA', awayScore: 17, homeScore: 14, status: 'IN_PROGRESS', clock: 'Q3 08:16' },
  { id: '3', away: 'DAL', home: 'PHI', awayScore: 20, homeScore: 27, status: 'FINAL', clock: 'FINAL' },
  { id: '4', away: 'DET', home: 'MIN', awayScore: 0, homeScore: 0, status: 'SCHEDULED', clock: 'Sun 1:00 PM' }
];

const MOCK_EDITORIAL_CARDS: EditorialMatchupData[] = [
  {
    gameId: 'g1',
    awayTeam: { code: 'KC', name: 'Chiefs', record: '5-1', score: 24 },
    homeTeam: { code: 'BUF', name: 'Bills', record: '4-2', score: 21 },
    status: 'IN_PROGRESS',
    quarter: 'Q4',
    clock: '06:42',
    downAndDistance: '1st & Goal',
    ballLocation: 'BUF 7',
    yardline: 7,
    possession: 'AWAY',
    isRedZone: true,
    broadcastNetwork: 'CBS',
    awayPickCount: 7,
    homePickCount: 3,
    totalPicks: 10,
    participants: [
      { memberId: 'm1', name: 'Jake S.', initials: 'JS', pickedTeam: 'KC', matchState: 'WINNING' },
      { memberId: 'm2', name: 'Maria D.', initials: 'MD', pickedTeam: 'KC', matchState: 'WINNING' },
      { memberId: 'm3', name: 'Alex L.', initials: 'AL', pickedTeam: 'BUF', matchState: 'LOSING' },
      { memberId: 'm4', name: 'Jack', initials: 'JC', pickedTeam: 'KC', matchState: 'WINNING' }
    ]
  },
  {
    gameId: 'g2',
    awayTeam: { code: 'SF', name: '49ers', record: '4-2', score: 17 },
    homeTeam: { code: 'SEA', name: 'Seahawks', record: '3-3', score: 14 },
    status: 'IN_PROGRESS',
    quarter: 'Q3',
    clock: '08:16',
    downAndDistance: '2nd & 5',
    ballLocation: 'SEA 32',
    yardline: 68,
    possession: 'HOME',
    isRedZone: false,
    broadcastNetwork: 'FOX',
    awayPickCount: 6,
    homePickCount: 4,
    totalPicks: 10,
    participants: [
      { memberId: 'm5', name: 'Kevin W.', initials: 'KW', pickedTeam: 'SF', matchState: 'WINNING' },
      { memberId: 'm6', name: 'Taylor S.', initials: 'TS', pickedTeam: 'SEA', matchState: 'LOSING' },
      { memberId: 'm7', name: 'Priya R.', initials: 'PR', pickedTeam: 'SF', matchState: 'WINNING' }
    ]
  },
  {
    gameId: 'g3',
    awayTeam: { code: 'DAL', name: 'Cowboys', record: '3-3', score: 20 },
    homeTeam: { code: 'PHI', name: 'Eagles', record: '5-1', score: 27 },
    status: 'FINAL',
    broadcastNetwork: 'NBC',
    awayPickCount: 4,
    homePickCount: 6,
    totalPicks: 10,
    participants: [
      { memberId: 'm8', name: 'Dan C.', initials: 'DC', pickedTeam: 'PHI', matchState: 'WON' },
      { memberId: 'm9', name: 'Emily M.', initials: 'EM', pickedTeam: 'DAL', matchState: 'LOST' }
    ]
  }
];

export const MatrixPage: React.FC = () => {
  const [showSquareSheet, setShowSquareSheet] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Top NFL Ticker */}
      <TopGamedayTicker games={MOCK_TICKER_GAMES} />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-serif uppercase">
              Live Gameday Hub
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Real games. Real people. Live all day at /matrix.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSquareSheet(!showSquareSheet)}
              className="px-3.5 py-1.5 rounded-lg border border-cyan-500/60 bg-cyan-950/40 text-cyan-300 font-bold text-xs hover:bg-cyan-900/50 transition-colors shadow-sm"
            >
              {showSquareSheet ? '✕ Hide Square Sheet' : '📊 View Square Sheet Grid'}
            </button>
          </div>
        </div>

        {/* Layout: Matchups on Left / Square Sheet Drawer or Grid on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={showSquareSheet ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Live Matchups
              </span>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                ● Live Score Updates Active
              </span>
            </div>
            <div className="space-y-4">
              {MOCK_EDITORIAL_CARDS.map((card) => (
                <NightEditorialMatchupCard key={card.gameId} game={card} currentUserId="m4" />
              ))}
            </div>
          </div>

          {/* Desktop/Side-by-Side Collapsible Square Sheet View */}
          {showSquareSheet && (
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl h-fit">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono uppercase">Square Sheet Matrix</h3>
                <span className="text-[10px] text-slate-400">Week 5 • 10 Members</span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <LeagueMatrixView />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatrixPage;
