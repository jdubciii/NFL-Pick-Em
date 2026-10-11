import React, { useState, useMemo } from 'react';
import { RivalCrosshairsDuel } from '../components/matrix/RivalCrosshairsDuel';
import { LoneWolfBadge } from '../components/matrix/LoneWolfBadge';
import { StackedAvatarCluster, CampParticipant } from '../components/matrix/StackedAvatarCluster';
import { TugOfWarDrawer } from '../components/matrix/TugOfWarDrawer';
import { LockCountdownTimer } from '../components/matrix/LockCountdownTimer';
import { LiveGametrackStream, LiveGameflowCardData } from '../components/matrix/LiveGametrackStream';
import { EmptyStateWireframe } from '../components/common/EmptyStateWireframe';
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
import { isKickoffLocked } from '../services/lockEnforcementService';
import { evaluatePickVisibility } from '../services/openSlatePolicyService';

const SAMPLE_GAMES: RawGameDefinition[] = [];

const SAMPLE_USERS = [
  { userId: 'u1', userName: 'Jack (You)', isAutopilot: false },
];

const SAMPLE_PICKS: UserSubmittedPick[] = [];

const SAMPLE_LIVE_GAMES: LiveGameflowCardData[] = [];

export const MatrixPage: React.FC = () => {
  // Decision #66: authoritative kickoff lock evaluation
  const isSlateLocked = isKickoffLocked('2026-10-11T17:00:00.000Z');
  const currentUserId = 'u1';
  const currentUserName = 'Jack';

  const [activeTab, setActiveTab] = useState<'LEVERAGE' | 'GAMETRACK'>(isSlateLocked ? 'GAMETRACK' : 'LEVERAGE');
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
      {/* Sticky Gameday Live / Lock Countdown */}
      <LockCountdownTimer isLocked={isSlateLocked} onLockExpired={() => setActiveTab('GAMETRACK')} />

      {/* Header & Persistent Tab Switcher (Leverage vs Gametrack) */}
      <header className="my-3 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <h1 className="text-lg font-black tracking-wider text-cyan-400">
            THE MATRIX // GAMEDAY LIVE
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
          <span>📡 Live updates connected</span>
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
        <LiveGametrackStream />
      )}

      {/* TAB 2: PRE-LOCK LEVERAGE BOARD */}
      {activeTab === 'LEVERAGE' && (
        SAMPLE_GAMES.length === 0 ? (
          <EmptyStateWireframe
            header="[ AWAITING LEAGUE ACTION ]"
            subtitle="[ VEGAS LINES FREEZING... ]"
            contextDetail="Tuesday morning recalibration underway. Leverage board unlocks once picks are registered."
          />
        ) : (
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
        )
      )}
    </div>
  );
};

export default MatrixPage;
