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
  { userId: 'u10', userName: 'Ben', gameId: 'g1', selectedTeam: 'GB' },
  { userId: 'u10', userName: 'Ben', gameId: 'g2', selectedTeam: 'BUF' },
  { userId: 'u10', userName: 'Ben', gameId: 'g3', selectedTeam: 'DAL' },
];

export const RadarPage: React.FC = () => {
  const [whatIfs, setWhatIfs] = useState<WhatIfScenario[]>([]);

  const handleToggleDelta = (gameId: string, team: 'HOME' | 'AWAY', delta: number) => {
    setWhatIfs((prev) => {
      const existing = prev.find(w => w.gameId === gameId);
      if (!existing) {
        return [...prev, {
          gameId,
          scoreDeltaHome: team === 'HOME' ? delta : 0,
          scoreDeltaAway: team === 'AWAY' ? delta : 0
        }];
      }
      return prev.map(w => {
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
    <div className={`min-h-screen text-slate-100 p-4 pb-24 max-w-md mx-auto transition-colors duration-500 ${
      isSimulating ? 'bg-slate-950/95 ring-1 ring-inset ring-cyan-500/30' : 'bg-slate-950'
    }`}>
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
          <h1 className="text-lg font-black tracking-wider text-cyan-400 font-mono">RADAR // LIVE CONSEQUENCES</h1>
          <p className="text-xs text-slate-400 font-mono">Sunday 1:00 PM - 4:15 PM ET Sweat Window</p>
        </div>
        <div className="text-right">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
          <span className="text-[11px] font-mono text-emerald-400 font-bold">LIVE</span>
        </div>
      </header>

      <DangerSeatStrip standings={standings} isSimulating={isSimulating} />
      <ConsequenceTiers standings={standings} isSimulating={isSimulating} />
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
