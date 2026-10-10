import React, { useState, useMemo } from 'react';
import { DangerSeatStrip } from '../components/radar/DangerSeatStrip';
import { ConsequenceTiers } from '../components/radar/ConsequenceTiers';
import { WhatIfChaosControls } from '../components/radar/WhatIfChaosControls';
import {
  evaluateLiveStandings,
  LiveGameTelemetry,
  UserPick,
  ParticipantScoreInput,
  WhatIfScenario
} from '../services/radarSimulationEngine';

const DEFAULT_PARTICIPANTS: ParticipantScoreInput[] = [
  { userId: 'u1', userName: 'Jack (Monarch)', seasonBankedPoints: 42, tiebreakerMnfDiff: 4 },
  { userId: 'u2', userName: 'Dave', seasonBankedPoints: 40, tiebreakerMnfDiff: 7 },
  { userId: 'u3', userName: 'Sarah', seasonBankedPoints: 39, tiebreakerMnfDiff: 10 },
  { userId: 'u4', userName: 'Mike', seasonBankedPoints: 38, tiebreakerMnfDiff: 12 },
  { userId: 'u5', userName: 'Tom', seasonBankedPoints: 37, tiebreakerMnfDiff: 14 },
  { userId: 'u6', userName: 'Chris', seasonBankedPoints: 36, tiebreakerMnfDiff: 15 },
  { userId: 'u7', userName: 'Alex', seasonBankedPoints: 35, tiebreakerMnfDiff: 18 },
  { userId: 'u8', userName: 'Emma', seasonBankedPoints: 34, tiebreakerMnfDiff: 20 },
  { userId: 'u9', userName: 'Ryan', seasonBankedPoints: 33, tiebreakerMnfDiff: 22 },
  { userId: 'u10', userName: 'Ben (Dead Place)', seasonBankedPoints: 30, tiebreakerMnfDiff: 25 },
];

const MOCK_GAMES: LiveGameTelemetry[] = [
  {
    gameId: 'g1',
    homeTeam: 'DET',
    awayTeam: 'GB',
    homeScore: 24,
    awayScore: 21,
    spread: -2.5,
    status: 'IN_PROGRESS',
    possession: 'GB',
    yardLine: 14,
    isRedZone: true
  },
  {
    gameId: 'g2',
    homeTeam: 'KC',
    awayTeam: 'BUF',
    homeScore: 27,
    awayScore: 24,
    spread: -1.5,
    status: 'FINAL'
  },
  {
    gameId: 'g3',
    homeTeam: 'PHI',
    awayTeam: 'DAL',
    homeScore: 10,
    awayScore: 14,
    spread: -4.5,
    status: 'IN_PROGRESS',
    possession: 'PHI',
    yardLine: 35,
    isRedZone: false
  }
];

const MOCK_PICKS: UserPick[] = [
  { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u1', userName: 'Jack', gameId: 'g2', selectedTeam: 'KC' },
  { userId: 'u1', userName: 'Jack', gameId: 'g3', selectedTeam: 'PHI' },
  { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'GB' },
  { userId: 'u2', userName: 'Dave', gameId: 'g2', selectedTeam: 'KC' },
  { userId: 'u9', userName: 'Ryan', gameId: 'g1', selectedTeam: 'DET' },
  { userId: 'u9', userName: 'Ryan', gameId: 'g3', selectedTeam: 'DAL' },
  { userId: 'u10', userName: 'Ben', gameId: 'g1', selectedTeam: 'GB' },
  { userId: 'u10', userName: 'Ben', gameId: 'g2', selectedTeam: 'BUF' },
  { userId: 'u10', userName: 'Ben', gameId: 'g3', selectedTeam: 'DAL' },
];

// Rolling state buffer for Momentum Sparklines (last 5 telemetry snapshots)
const INITIAL_HISTORY: Record<string, number[]> = {
  u1: [1.0, 1.5, 2.0, 2.0, 2.0],
  u2: [2.0, 1.5, 1.0, 1.0, 1.0],
  u3: [1.0, 1.0, 1.0, 1.0, 1.0],
  u4: [0.5, 0.5, 1.0, 1.0, 1.0],
  u5: [1.0, 0.5, 0.5, 0.5, 0.5],
  u6: [0.5, 0.5, 0.5, 0.5, 0.5],
  u7: [0.0, 0.0, 0.5, 0.5, 0.5],
  u8: [0.5, 0.5, 0.0, 0.0, 0.0],
  u9: [1.0, 0.5, 0.5, 0.0, 0.0],
  u10: [0.5, 0.0, 0.0, 0.0, 0.0],
};

export const RadarPage: React.FC = () => {
  const [whatIfs, setWhatIfs] = useState<WhatIfScenario[]>([]);
  const [historyMap] = useState<Record<string, number[]>>(INITIAL_HISTORY);
  const [isSlateFinalized, setIsSlateFinalized] = useState<boolean>(false);
  const [debtAcknowledged, setDebtAcknowledged] = useState<boolean>(false);

  const handleToggleDelta = (gameId: string, team: 'HOME' | 'AWAY', delta: number) => {
    setWhatIfs((prev) => {
      const existing = prev.find((w) => w.gameId === gameId);
      if (!existing) {
        return [
          ...prev,
          {
            gameId,
            scoreDeltaHome: team === 'HOME' ? delta : 0,
            scoreDeltaAway: team === 'AWAY' ? delta : 0
          }
        ];
      }
      return prev.map((w) => {
        if (w.gameId !== gameId) return w;
        return {
          ...w,
          scoreDeltaHome: team === 'HOME' ? w.scoreDeltaHome + delta : w.scoreDeltaHome,
          scoreDeltaAway: team === 'AWAY' ? w.scoreDeltaAway + delta : w.scoreDeltaAway
        };
      });
    });
  };

  const handleReset = () => {
    setWhatIfs([]);
  };

  const isSimulating = whatIfs.length > 0;

  const standings = useMemo(() => {
    return evaluateLiveStandings(DEFAULT_PARTICIPANTS, MOCK_PICKS, MOCK_GAMES, whatIfs);
  }, [whatIfs]);

  return (
    <div
      className={`min-h-screen text-slate-100 p-4 pb-24 max-w-md mx-auto transition-colors duration-500 ${
        isSimulating ? 'bg-slate-950/95 ring-1 ring-inset ring-cyan-500/30' : 'bg-slate-950'
      }`}
    >
      {/* Sticky Simulation Warning Banner */}
      {isSimulating && (
        <div className="sticky top-0 z-50 mb-3 -mx-4 px-4 py-2 bg-cyan-950/95 border-b border-cyan-400 shadow-md shadow-cyan-950/60 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm animate-pulse">⚠️</span>
            <span className="text-[11px] font-mono font-black tracking-wider text-cyan-300">
              SIMULATION ACTIVE (INV-6)
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white uppercase tracking-wider transition"
          >
            TAP TO RESET
          </button>
        </div>
      )}

      <header className="mb-4 border-b border-slate-800 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black tracking-wider text-cyan-400 font-mono">
            RADAR // LIVE CONSEQUENCES
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {isSlateFinalized ? 'Slate Finalized (00:00 Final)' : 'Sunday 1:00 PM - 4:15 PM ET Window'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSlateFinalized((prev) => !prev)}
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
          >
            {isSlateFinalized ? 'REOPEN SLATE' : 'SIM FINAL 4:15PM'}
          </button>
          <div className="text-right">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-1 ${
                isSlateFinalized ? 'bg-slate-500' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`text-[11px] font-mono font-bold ${
                isSlateFinalized ? 'text-slate-400' : 'text-emerald-400'
              }`}
            >
              {isSlateFinalized ? 'FINAL' : 'LIVE'}
            </span>
          </div>
        </div>
      </header>

      {debtAcknowledged && (
        <div className="mb-3 p-2.5 rounded bg-rose-950/90 border border-rose-500/80 text-rose-300 font-mono text-xs text-center font-bold">
          ✓ DEBT RECORDED: 2.50 SHOT SUBMISSION DUE WITHIN 24 HOURS
        </div>
      )}

      <DangerSeatStrip standings={standings} isSimulating={isSimulating} />
      <ConsequenceTiers
        standings={standings}
        isSimulating={isSimulating}
        historyMap={historyMap}
        games={MOCK_GAMES}
        picks={MOCK_PICKS}
        participants={DEFAULT_PARTICIPANTS}
        activeUserId="u1"
        isSlateFinalized={isSlateFinalized}
        onAcknowledgeDebt={() => setDebtAcknowledged(true)}
      />
      <WhatIfChaosControls
        games={MOCK_GAMES}
        whatIfs={whatIfs}
        onToggleDelta={handleToggleDelta}
        onReset={handleReset}
      />
    </div>
  );
};

export default RadarPage;
