import React, { useState, useMemo } from 'react';
import { RivalCrosshairsDuel } from '../components/matrix/RivalCrosshairsDuel';
import { LoneWolfBadge } from '../components/matrix/LoneWolfBadge';
import { StackedAvatarCluster, CampParticipant } from '../components/matrix/StackedAvatarCluster';
import { TugOfWarDrawer } from '../components/matrix/TugOfWarDrawer';
import { LockCountdownTimer } from '../components/matrix/LockCountdownTimer';
import { LiveGametrackStream, LiveGameflowCardData } from '../components/matrix/LiveGametrackStream';
import {
  computeSlateTopology,
  computeDuelComparison,
  RawGameDefinition,
  UserSubmittedPick
} from '../services/pregameTopologyService';
import {
  deriveAutopilotProvenance,
  RawGameLine
} from '../services/autopilotTopologyService';

const SAMPLE_GAMES: RawGameDefinition[] = [
  { gameId: 'g1', homeTeam: 'DET', awayTeam: 'GB', spread: -2.5 },
  { gameId: 'g2', homeTeam: 'KC', awayTeam: 'BUF', spread: -1.5 },
  { gameId: 'g3', homeTeam: 'PHI', awayTeam: 'DAL', spread: -4.5 },
  { gameId: 'g4', homeTeam: 'MIA', awayTeam: 'NE', spread: -6.0 }
];

const SAMPLE_USERS = [
  { userId: 'u1', userName: 'Jack', isAutopilot: false },
  { userId: 'u2', userName: 'Dave', isAutopilot: true },
  { userId: 'u3', userName: 'Sarah', isAutopilot: false },
  { userId: 'u4', userName: 'Mike', isAutopilot: false },
  { userId: 'u5', userName: 'Tom', isAutopilot: false },
  { userId: 'u6', userName: 'Chris', isAutopilot: true },
  { userId: 'u7', userName: 'Alex', isAutopilot: false },
  { userId: 'u8', userName: 'Emma', isAutopilot: false },
  { userId: 'u9', userName: 'Ryan', isAutopilot: false },
  { userId: 'u10', userName: 'Ben', isAutopilot: false },
];

const SAMPLE_PICKS: UserSubmittedPick[] = [
  // g1: 9 picked DET, Ben (u10) is Lone Wolf on GB
  { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u3', userName: 'Sarah', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u4', userName: 'Mike', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u5', userName: 'Tom', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u6', userName: 'Chris', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u7', userName: 'Alex', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u8', userName: 'Emma', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u9', userName: 'Ryan', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u10', userName: 'Ben', gameId: 'g1', selectedTeam: 'GB' },

  // g2: 10/10 Consensus on KC
  ...SAMPLE_USERS.map((u) => ({
    userId: u.userId,
    userName: u.userName,
    gameId: 'g2',
    selectedTeam: 'KC'
  })),

  // g3: Battleground split (6 PHI, 4 DAL)
  { userId: 'u1', userName: 'Jack', gameId: 'g3', selectedTeam: 'PHI' },
  { userId: 'u2', userName: 'Dave', gameId: 'g3', selectedTeam: 'DAL' },
  { userId: 'u3', userName: 'Sarah', gameId: 'g3', selectedTeam: 'PHI' },
  { userId: 'u4', userName: 'Mike', gameId: 'g3', selectedTeam: 'DAL' },
  { userId: 'u5', userName: 'Tom', gameId: 'g3', selectedTeam: 'PHI' },
  { userId: 'u6', userName: 'Chris', gameId: 'g3', selectedTeam: 'DAL' },
  { userId: 'u7', userName: 'Alex', gameId: 'g3', selectedTeam: 'PHI' },
  { userId: 'u8', userName: 'Emma', gameId: 'g3', selectedTeam: 'DAL' },
  { userId: 'u9', userName: 'Ryan', gameId: 'g3', selectedTeam: 'PHI' },
  { userId: 'u10', userName: 'Ben', gameId: 'g3', selectedTeam: 'PHI' },

  // g4: 8 MIA, 2 NE
  ...SAMPLE_USERS.slice(0, 8).map((u) => ({
    userId: u.userId,
    userName: u.userName,
    gameId: 'g4',
    selectedTeam: 'MIA'
  })),
  { userId: 'u9', userName: 'Ryan', gameId: 'g4', selectedTeam: 'NE' },
  { userId: 'u10', userName: 'Ben', gameId: 'g4', selectedTeam: 'NE' },
];

const SAMPLE_LIVE_GAMES: LiveGameflowCardData[] = [
  {
    gameId: 'g1',
    awayTeam: 'GB',
    homeTeam: 'DET',
    awayScore: 21,
    homeScore: 24,
    spread: -2.5,
    quarter: 'Q4',
    timeRemaining: '02:14',
    possession: 'GB',
    downAndDistance: '2nd & 4',
    yardLine: 18,
    isFinal: false
  },
  {
    gameId: 'g2',
    awayTeam: 'BUF',
    homeTeam: 'KC',
    awayScore: 24,
    homeScore: 27,
    spread: -1.5,
    quarter: 'FINAL',
    timeRemaining: '00:00',
    possession: 'KC',
    downAndDistance: 'Final',
    yardLine: 0,
    isFinal: true
  },
  {
    gameId: 'g3',
    awayTeam: 'DAL',
    homeTeam: 'PHI',
    awayScore: 14,
    homeScore: 10,
    spread: -4.5,
    quarter: 'Q3',
    timeRemaining: '08:42',
    possession: 'PHI',
    downAndDistance: '3rd & 7',
    yardLine: 34,
    isFinal: false
  }
];

export const MatrixPage: React.FC = () => {
  const currentUserId = 'u1';
  const currentUserName = 'Jack';

  const [activeTab, setActiveTab] = useState<'LEVERAGE' | 'GAMETRACK'>('LEVERAGE');
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);
  const [expandedTugGameId, setExpandedTugGameId] = useState<string | null>(null);
  const [showTopologyToast, setShowTopologyToast] = useState<boolean>(true);

  const topology = useMemo(() => {
    return computeSlateTopology('pool_alpha', 5, SAMPLE_PICKS, SAMPLE_GAMES, 3);
  }, []);

  const autopilotUsers = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const u of SAMPLE_USERS) {
      const provenance = deriveAutopilotProvenance(u.userId, SAMPLE_PICKS, SAMPLE_GAMES as RawGameLine[]);
      map.set(u.userId, provenance.isAutopilot);
    }
    return map;
  }, []);

  const duelComparison = useMemo(() => {
    if (!selectedRivalId) return null;
    const rival = SAMPLE_USERS.find((u) => u.userId === selectedRivalId);
    if (!rival) return null;
    return computeDuelComparison(
      currentUserId,
      currentUserName,
      rival.userId,
      rival.userName,
      SAMPLE_PICKS,
      SAMPLE_GAMES
    );
  }, [selectedRivalId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-md mx-auto font-sans">
      {/* Sticky 1:00 PM Pre-Lock Countdown */}
      <LockCountdownTimer onLockExpired={() => setActiveTab('GAMETRACK')} />

      {/* Header & Persistent Tab Switcher (Leverage vs Gametrack) */}
      <header className="my-3 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <h1 className="text-lg font-black tracking-wider text-cyan-400">
            THE MATRIX // GAMEDAY
          </h1>
          <p className="text-xs text-slate-400">
            {activeTab === 'LEVERAGE' ? 'Pre-Lock Leverage Board' : 'Live Drive Progression'}
          </p>
        </div>

        {/* Segmented Controller: Preserving Gametrack */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('LEVERAGE')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'LEVERAGE'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚔️ LEVERAGE
          </button>
          <button
            onClick={() => setActiveTab('GAMETRACK')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'GAMETRACK'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏈 GAMETRACK
          </button>
        </div>
      </header>

      {/* Floating Topology Update Toast */}
      {showTopologyToast && activeTab === 'LEVERAGE' && (
        <div className="mb-3 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400 shadow-md text-center font-mono text-[10px] text-cyan-300 font-bold flex items-center justify-between animate-fade-in">
          <span>📡 Matrix Topology Synchronized (SSE)</span>
          <button
            onClick={() => setShowTopologyToast(false)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: LIVE GAMETRACK & DRIVE FLOW */}
      {activeTab === 'GAMETRACK' && (
        <LiveGametrackStream games={SAMPLE_LIVE_GAMES} />
      )}

      {/* TAB 2: PRE-LOCK LEVERAGE BOARD */}
      {activeTab === 'LEVERAGE' && (
        <>
          {duelComparison ? (
            <RivalCrosshairsDuel
              duel={duelComparison}
              onCloseDuel={() => setSelectedRivalId(null)}
            />
          ) : (
            <div className="space-y-4">
              {/* Member Selector Bar (Autopilot machine scanlines attribution) */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  SELECT RIVAL TO ENGAGE 1-ON-1 DUEL MODE
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {SAMPLE_USERS.filter((u) => u.userId !== currentUserId).map((user) => {
                    const isMachine = autopilotUsers.get(user.userId);

                    return (
                      <button
                        key={user.userId}
                        onClick={() => setSelectedRivalId(user.userId)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs transition relative overflow-hidden ${
                          isMachine
                            ? 'border-cyan-400 text-cyan-200 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.1)_50%,transparent_75%)] shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-cyan-400'
                        }`}
                      >
                        <span>{isMachine ? '🤖' : '👤'}</span>
                        <span className="font-bold">{user.userName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Matchup Distribution & Avatar Clusters */}
              <div className="space-y-2.5 font-mono">
                {SAMPLE_GAMES.map((game) => {
                  const gameDist = topology.games.find((g) => g.gameId === game.gameId);
                  const isConsensus = gameDist?.isConsensus;

                  const awayCamp: CampParticipant[] = SAMPLE_PICKS
                    .filter((p) => p.gameId === game.gameId && p.selectedTeam === game.awayTeam)
                    .map((p) => ({
                      userId: p.userId,
                      userName: p.userName,
                      team: p.selectedTeam,
                      isAutopilot: autopilotUsers.get(p.userId)
                    }));

                  const homeCamp: CampParticipant[] = SAMPLE_PICKS
                    .filter((p) => p.gameId === game.gameId && p.selectedTeam === game.homeTeam)
                    .map((p) => ({
                      userId: p.userId,
                      userName: p.userName,
                      team: p.selectedTeam,
                      isAutopilot: autopilotUsers.get(p.userId)
                    }));

                  return (
                    <div
                      key={game.gameId}
                      className={`p-3 rounded-xl border transition-all duration-700 ${
                        isConsensus
                          ? 'bg-slate-950/40 border-slate-900 opacity-30 grayscale'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {game.awayTeam} @ {game.homeTeam}
                          </span>
                          <span className="text-[10px] text-cyan-400">
                            [{game.spread > 0 ? `+${game.spread}` : game.spread}]
                          </span>
                        </div>
                        {isConsensus && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                            10/10 CONSENSUS [{gameDist?.consensusTeam}]
                          </span>
                        )}
                        {gameDist?.isLoneWolf && (
                          <LoneWolfBadge team={gameDist.loneWolfTeam || ''} />
                        )}
                      </div>

                      {/* Stacked Avatar Camp Clusters */}
                      <div
                        onClick={() =>
                          setExpandedTugGameId(expandedTugGameId === game.gameId ? null : game.gameId)
                        }
                        className="cursor-pointer py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition"
                      >
                        <StackedAvatarCluster
                          participants={awayCamp}
                          teamLabel={game.awayTeam}
                          isAway={true}
                        />
                        <span className="text-[9px] text-slate-500 font-bold uppercase">
                          VS (TUG OF WAR)
                        </span>
                        <StackedAvatarCluster
                          participants={homeCamp}
                          teamLabel={game.homeTeam}
                          isAway={false}
                        />
                      </div>

                      {/* Expandable Tug-of-War Drawer */}
                      {expandedTugGameId === game.gameId && (
                        <TugOfWarDrawer
                          gameMatchup={`${game.awayTeam} @ ${game.homeTeam}`}
                          awayTeam={game.awayTeam}
                          homeTeam={game.homeTeam}
                          awayCamp={awayCamp}
                          homeCamp={homeCamp}
                          onClose={() => setExpandedTugGameId(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MatrixPage;
