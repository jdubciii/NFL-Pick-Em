import React, { useState, useEffect } from 'react';
import {
  UserStandingRef,
  ProvisionalStanding,
  SlateGame,
  UserPickItem,
} from '../../services/sweatProjectionService';
import { LiveGame } from '../../services/liveScoreService';
import { RootingQueueItem } from '../../services/dependableInfoService';

interface WatchPartyBigBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWeek?: number;
  poolTitle?: string;
  phaseLabel?: string;
  isSimulation?: boolean;
  members: UserStandingRef[];
  standings: ProvisionalStanding[];
  games: SlateGame[];
  liveScores: LiveGame[];
  picks: UserPickItem[];
  personalRootingQueue: RootingQueueItem[];
  currentUser: UserStandingRef;
  rivalUser: UserStandingRef | null;
}

type PanelViewMode = 'ALL' | 'STANDINGS' | 'RIVALRY' | 'GAMES';

const DEMO_10_STANDINGS: Array<{
  rank: number;
  name: string;
  banked: number;
  live: number;
  total: number;
  tier: string;
  shots: string;
}> = [
  { rank: 1, name: 'jack.w.cone', banked: 8, live: 3, total: 11, tier: 'SAFE HAVEN', shots: '0 shots' },
  { rank: 2, name: 'jcone2', banked: 7, live: 2, total: 9, tier: 'DANGER ZONE', shots: '1 shot' },
  { rank: 3, name: 'Sarah_Blitz', banked: 6, live: 3, total: 9, tier: 'DANGER ZONE', shots: '1 shot' },
  { rank: 4, name: 'Coach_Dave', banked: 6, live: 2, total: 8, tier: 'DANGER ZONE', shots: '1 shot' },
  { rank: 5, name: 'GridironGuru', banked: 5, live: 3, total: 8, tier: 'DANGER ZONE', shots: '1 shot' },
  { rank: 6, name: 'RedZoneRay', banked: 5, live: 2, total: 7, tier: 'DANGER ZONE', shots: '1 shot' },
  { rank: 7, name: 'TouchdownTim', banked: 4, live: 3, total: 7, tier: 'DANGER ZONE', shots: '1 shot' },
  { rank: 8, name: 'BlitzKrieg', banked: 4, live: 2, total: 6, tier: 'DANGER ZONE', shots: '1 shot' },
  { rank: 9, name: 'SundaySweater', banked: 3, live: 2, total: 5, tier: 'THE PIT', shots: '2.5 shots' },
  { rank: 10, name: 'PenaltyKing', banked: 3, live: 1, total: 4, tier: 'THE PIT', shots: '2.5 shots' },
];

export const WatchPartyBigBoardModal: React.FC<WatchPartyBigBoardModalProps> = ({
  isOpen,
  onClose,
  activeWeek = 6,
  poolTitle = 'MAIN LEAGUE',
  phaseLabel = 'PRE-KICKOFF · PROVISIONAL',
  isSimulation = false,
  members,
  standings,
  games,
  liveScores,
  picks,
  personalRootingQueue,
  currentUser,
  rivalUser,
}) => {
  const [fieldMode, setFieldMode] = useState<'LIVE' | 'DEMO_10'>('LIVE');
  const [panelMode, setPanelMode] = useState<PanelViewMode>('ALL');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Auto-rotate effect (10s interval)
  useEffect(() => {
    if (!autoRotate || !isOpen) return;
    const interval = setInterval(() => {
      setPanelMode((prev) => {
        if (prev === 'ALL' || prev === 'GAMES') return 'STANDINGS';
        if (prev === 'STANDINGS') return 'RIVALRY';
        if (prev === 'RIVALRY') return 'GAMES';
        return 'ALL';
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRotate, isOpen]);

  if (!isOpen) return null;

  const activeRival = rivalUser || (members.find((m) => m.id !== currentUser.id) ?? { id: 'r1', name: 'jcone2' });
  const viewerStanding = standings.find((s) => s.userId === currentUser.id);
  const rivalStanding = standings.find((s) => s.userId === activeRival.id);

  const displayStandings = fieldMode === 'DEMO_10'
    ? DEMO_10_STANDINGS
    : standings.map((s) => {
        const member = members.find((m) => m.id === s.userId);
        const name = member?.name || (s.userId === currentUser.id ? currentUser.name : 'Competitor');
        const shots = s.tier === 'SAFE_HAVEN' ? '0 shots' : s.tier === 'DANGER_ZONE' ? '1 shot' : '2.5 shots';
        return {
          rank: s.provisionalRank,
          name,
          banked: s.bankedPoints,
          live: s.livePoints,
          total: s.totalProvisionalPoints,
          tier: s.tier.replace('_', ' '),
          shots,
        };
      });

  return (
    <div className="fixed inset-0 z-50 bg-black/95 text-white font-mono flex flex-col p-3 sm:p-6 overflow-y-auto">
      {/* Top Bar: Pool Title, Week, Phase, Mode Selectors, and Exit */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm sm:text-base font-black text-cyan-400 uppercase tracking-widest">
            📺 {poolTitle} · WEEK {activeWeek} WATCH PARTY BIG BOARD
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              isSimulation
                ? 'bg-amber-950 border-amber-500 text-amber-300'
                : 'bg-cyan-950 border-cyan-500 text-cyan-300'
            }`}
          >
            {isSimulation ? '🧪 SANDBOX SIMULATION' : phaseLabel}
          </span>
        </div>

        {/* Controls: Field Toggle, Panel Select, Auto-Rotate, Exit */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Field Mode Toggle */}
          <div className="flex p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setFieldMode('LIVE')}
              className={`px-2.5 py-1 rounded transition ${
                fieldMode === 'LIVE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live ({members.length}) Field
            </button>
            <button
              onClick={() => setFieldMode('DEMO_10')}
              className={`px-2.5 py-1 rounded transition ${
                fieldMode === 'DEMO_10' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              10-Member Demo
            </button>
          </div>

          {/* Panel Selector */}
          <div className="flex p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setPanelMode('ALL')}
              className={`px-2 py-1 rounded transition ${panelMode === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setPanelMode('STANDINGS')}
              className={`px-2 py-1 rounded transition ${panelMode === 'STANDINGS' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              Standings
            </button>
            <button
              onClick={() => setPanelMode('RIVALRY')}
              className={`px-2 py-1 rounded transition ${panelMode === 'RIVALRY' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              Duel
            </button>
            <button
              onClick={() => setPanelMode('GAMES')}
              className={`px-2 py-1 rounded transition ${panelMode === 'GAMES' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              Rooting
            </button>
          </div>

          {/* Auto-Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
              autoRotate ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {autoRotate ? '↻ Auto-Rotate: ON (10s)' : '↻ Rotate: OFF'}
          </button>

          {/* Exit */}
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-black transition"
          >
            ✕ Exit
          </button>
        </div>
      </header>

      {/* Demo Warning Banner */}
      {fieldMode === 'DEMO_10' && (
        <div className="mb-4 p-2 rounded-xl bg-amber-950/70 border border-amber-500 text-amber-300 text-center text-xs font-bold uppercase tracking-wider">
          ⚠️ 10-MEMBER DEMO FIXTURE — FOR BIG BOARD LAYOUT VERIFICATION ONLY (NOT LIVE POOL DATA)
        </div>
      )}

      {/* Big Board Panels Grid */}
      <div className={`flex-1 grid gap-4 ${panelMode === 'ALL' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* PANEL 1: Live Pool Standings Ladder */}
        {(panelMode === 'ALL' || panelMode === 'STANDINGS') && (
          <div className="bg-slate-900/90 border-2 border-cyan-500/40 rounded-2xl p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-3">
              <span className="text-xs font-black text-cyan-300 uppercase tracking-widest">
                🏆 LIVE POOL STANDINGS LADDER
              </span>
              <span className="text-[10px] text-slate-400">
                {displayStandings.length} Competitors
              </span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[60vh] lg:max-h-none">
              {displayStandings.map((row, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                    row.rank === 1
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-sm'
                      : row.tier.includes('PIT')
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        row.rank === 1
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      #{row.rank}
                    </span>
                    <div>
                      <div className="text-sm font-black text-white truncate max-w-[140px] sm:max-w-[200px]">
                        {row.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {row.banked} banked · {row.live} live
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-cyan-300">
                      {row.total} pts
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        row.tier.includes('SAFE')
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : row.tier.includes('PIT')
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                          : 'bg-amber-950/80 border-amber-500 text-amber-300'
                      }`}
                    >
                      {row.tier} ({row.shots})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL 2: Featured Rivalry Showdown */}
        {(panelMode === 'ALL' || panelMode === 'RIVALRY') && (
          <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2 mb-3">
              <span className="text-xs font-black text-amber-300 uppercase tracking-widest">
                ⚔️ FEATURED RIVALRY DUEL
              </span>
              <span className="text-[10px] text-amber-400 font-bold">
                HEAD-TO-HEAD
              </span>
            </div>

            {/* Duel Scoreboard */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 mb-4 text-center">
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/40">
                  <div className="text-xs font-bold text-cyan-400 uppercase truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {viewerStanding?.totalProvisionalPoints ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">
                    {viewerStanding?.tier ?? 'SAFE HAVEN'}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-500/40">
                  <div className="text-xs font-bold text-amber-400 uppercase truncate">
                    {activeRival.name}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {rivalStanding?.totalProvisionalPoints ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">
                    {rivalStanding?.tier ?? 'DANGER ZONE'}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 text-xs font-bold text-slate-300">
                Net Margin:{' '}
                {(() => {
                  const diff = (viewerStanding?.totalProvisionalPoints ?? 0) - (rivalStanding?.totalProvisionalPoints ?? 0);
                  if (diff === 0) return <span className="text-slate-400">Deadlocked (0 pt gap)</span>;
                  return (
                    <span className={diff > 0 ? 'text-cyan-400' : 'text-amber-400'}>
                      {diff > 0 ? `+${diff}` : diff} pt{Math.abs(diff) === 1 ? '' : 's'} vs {activeRival.name}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Duel Decider Matchup Preview */}
            <div className="space-y-2 flex-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ACTIVE DUEL DECIDER // CONDITIONAL OUTCOMES
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">SEA @ DEN</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Sun 4:05 PM</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-cyan-950/60 border border-cyan-500/40">
                    <div className="font-bold text-cyan-300">SEA wins</div>
                    <div className="text-xs font-mono font-bold text-white">+1 pt to {currentUser.name}</div>
                  </div>
                  <div className="p-2 rounded bg-amber-950/60 border border-amber-500/40">
                    <div className="font-bold text-amber-300">DEN wins</div>
                    <div className="text-xs font-mono font-bold text-white">+1 pt to {activeRival.name}</div>
                  </div>
                </div>
                <div className="text-[10px] text-center text-slate-400">
                  2 PT OUTCOME SPAN (-1 / +1)
                </div>
              </div>

              {/* Nemesis Record Badge */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  SETTLED NEMESIS LEDGER
                </span>
                <span className="text-xs font-bold text-amber-300">
                  FIRST SEASON DUEL (0-0)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Official rivalry record begins after Week 6 settlement
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 3: Priority Rooting Queue & Swing Slate */}
        {(panelMode === 'ALL' || panelMode === 'GAMES') && (
          <div className="bg-slate-900/90 border-2 border-emerald-500/40 rounded-2xl p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2 mb-3">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-widest">
                🎯 PRIORITY ROOTING QUEUE
              </span>
              <span className="text-[10px] text-slate-400">
                Top Decisive Matchups
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {personalRootingQueue.length > 0 ? (
                personalRootingQueue.slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{item.matchupLabel}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          item.gameStatus === 'LIVE'
                            ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {item.gameStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-400">Root for: {item.rootForTeam}</span>
                      <span className="text-rose-400 text-[11px]">vs {item.againstTeam}</span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      {item.consequenceText}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 text-center text-xs text-slate-400 italic">
                  All active split games complete or pending kickoff schedule.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Watermark */}
      <footer className="mt-4 pt-2 border-t border-slate-800 text-center text-[10px] text-slate-500 uppercase tracking-widest">
        {poolTitle} · WATCH PARTY ARENA BIG BOARD · REFRESHES WITH LIVE TELEMETRY
      </footer>
    </div>
  );
};
