import React, { useState, useMemo } from 'react';
import { RivalCrosshairsDuel } from '../components/matrix/RivalCrosshairsDuel';
import { LoneWolfBadge } from '../components/matrix/LoneWolfBadge';
import {
  computeSlateTopology,
  computeDuelComparison,
  RawGameDefinition,
  UserSubmittedPick
} from '../services/pregameTopologyService';

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

export const MatrixPage: React.FC = () => {
  const currentUserId = 'u1';
  const currentUserName = 'Jack';
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);

  const topology = useMemo(() => {
    return computeSlateTopology('pool_alpha', 5, SAMPLE_PICKS, SAMPLE_GAMES, 3);
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
      <header className="mb-4 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <h1 className="text-lg font-black tracking-wider text-cyan-400">
            THE MATRIX // LEVERAGE BOARD
          </h1>
          <p className="text-xs text-slate-400">Pre-Lock Consensus &amp; Rival Crosshairs</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
            OPEN SLATE (N=10)
          </span>
        </div>
      </header>

      {/* 1-on-1 Duel Mode Overlay if Rival Selected */}
      {duelComparison ? (
        <RivalCrosshairsDuel
          duel={duelComparison}
          onCloseDuel={() => setSelectedRivalId(null)}
        />
      ) : (
        <div className="space-y-4">
          {/* Member Column Selector for Duel Mode */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
              TAP RIVAL AVATAR TO ENGAGE 1-ON-1 DUEL MODE
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SAMPLE_USERS.filter((u) => u.userId !== currentUserId).map((user) => (
                <button
                  key={user.userId}
                  onClick={() => setSelectedRivalId(user.userId)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 flex items-center gap-1.5 text-xs text-slate-200 transition"
                >
                  <span>{user.isAutopilot ? '🤖' : '👤'}</span>
                  <span className="font-bold">{user.userName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Consensus-Dimmed Matrix Grid */}
          <div className="space-y-2.5 font-mono">
            {SAMPLE_GAMES.map((game) => {
              const gameDist = topology.games.find((g) => g.gameId === game.gameId);
              const isConsensus = gameDist?.isConsensus;

              return (
                <div
                  key={game.gameId}
                  className={`p-3 rounded-xl border transition-all ${
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

                  {/* Pick Distribution Bar */}
                  {gameDist && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>
                          {game.awayTeam}: {gameDist.awayPicks}
                        </span>
                        <span>
                          {game.homeTeam}: {gameDist.homePicks}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                        <div
                          className="h-full bg-cyan-500"
                          style={{
                            width: `${(gameDist.awayPicks / gameDist.totalPicks) * 100}%`
                          }}
                        />
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(gameDist.homePicks / gameDist.totalPicks) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatrixPage;
