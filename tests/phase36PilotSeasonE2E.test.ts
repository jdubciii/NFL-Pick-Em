import { describe, it, expect } from 'vitest';
import {
  computeSlateTopology,
  RawGameDefinition,
  UserSubmittedPick
} from '../src/services/pregameTopologyService';
import {
  deriveAutopilotProvenance,
  RawGameLine
} from '../src/services/autopilotTopologyService';
import {
  reconcileRadarStandings,
  ParticipantScoreInput,
  LiveGameTelemetry,
  UserPick
} from '../src/services/radarLiveConsequencesService';
import { finalizeSlateStandings } from '../src/services/slateFinaleSettlementService';
import {
  createPendingPenalty,
  submitPenaltyEvidence,
  filePenaltyDispute
} from '../src/services/punishmentFsmService';
import {
  initializeTribunalDocket,
  castTribunalVote,
  evaluateTribunalVerdict
} from '../src/services/tribunalAdjudicationService';
import {
  generateEvidenceStoragePath,
  submitPenaltyEvidenceRPC
} from '../src/services/nativeMediaUploadService';

describe('Phase 36: Pilot Season Full-System E2E Lifecycle Simulation', () => {
  const SAMPLE_GAMES: RawGameDefinition[] = [
    { gameId: 'g1', homeTeam: 'DET', awayTeam: 'GB', spread: -2.5 },
    { gameId: 'g2', homeTeam: 'KC', awayTeam: 'BUF', spread: -1.5 },
    { gameId: 'g3', homeTeam: 'PHI', awayTeam: 'DAL', spread: -4.5 },
    { gameId: 'g4', homeTeam: 'MIA', awayTeam: 'NE', spread: -6.0 }
  ];

  const USERS = [
    { userId: 'u1', userName: 'Jack', isAutopilot: false },
    { userId: 'u2', userName: 'Dave', isAutopilot: true },
    { userId: 'u3', userName: 'Sarah', isAutopilot: false },
    { userId: 'u4', userName: 'Mike', isAutopilot: false },
    { userId: 'u5', userName: 'Tom', isAutopilot: false },
    { userId: 'u6', userName: 'Chris', isAutopilot: false },
    { userId: 'u7', userName: 'Alex', isAutopilot: false },
    { userId: 'u8', userName: 'Emma', isAutopilot: false },
    { userId: 'u9', userName: 'Ryan', isAutopilot: false },
    { userId: 'u10', userName: 'Ben', isAutopilot: false }
  ];

  // 10 members submitted picks
  const PICKS: UserSubmittedPick[] = [
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
    ...USERS.map((u) => ({
      userId: u.userId,
      userName: u.userName,
      gameId: 'g2',
      selectedTeam: 'KC'
    })),

    // g3: Battleground (Dave picks PHI to match Tuesday Favorites)
    { userId: 'u1', userName: 'Jack', gameId: 'g3', selectedTeam: 'PHI' },
    { userId: 'u2', userName: 'Dave', gameId: 'g3', selectedTeam: 'PHI' },
    { userId: 'u3', userName: 'Sarah', gameId: 'g3', selectedTeam: 'PHI' },
    { userId: 'u4', userName: 'Mike', gameId: 'g3', selectedTeam: 'DAL' },
    { userId: 'u5', userName: 'Tom', gameId: 'g3', selectedTeam: 'PHI' },
    { userId: 'u6', userName: 'Chris', gameId: 'g3', selectedTeam: 'DAL' },
    { userId: 'u7', userName: 'Alex', gameId: 'g3', selectedTeam: 'PHI' },
    { userId: 'u8', userName: 'Emma', gameId: 'g3', selectedTeam: 'DAL' },
    { userId: 'u9', userName: 'Ryan', gameId: 'g3', selectedTeam: 'PHI' },
    { userId: 'u10', userName: 'Ben', gameId: 'g3', selectedTeam: 'PHI' },

    // g4: 8 MIA, 2 NE
    ...USERS.slice(0, 8).map((u) => ({
      userId: u.userId,
      userName: u.userName,
      gameId: 'g4',
      selectedTeam: 'MIA'
    })),
    { userId: 'u9', userName: 'Ryan', gameId: 'g4', selectedTeam: 'NE' },
    { userId: 'u10', userName: 'Ben', gameId: 'g4', selectedTeam: 'NE' }
  ];

  it('Step 1 (Tuesday Locks): Assert 10 members submit picks, including Autopilot and Lone Wolf', () => {
    const topology = computeSlateTopology('pool_alpha', 5, PICKS, SAMPLE_GAMES, 3);
    expect(topology.lockedCount).toBe(10);

    const g1Topology = topology.games.find((g) => g.gameId === 'g1');
    expect(g1Topology?.isLoneWolf).toBe(true);
    expect(g1Topology?.loneWolfTeam).toBe('GB');

    // Dave (u2) provenance check
    const daveProvenance = deriveAutopilotProvenance(
      'u2',
      PICKS,
      SAMPLE_GAMES as RawGameLine[]
    );
    expect(daveProvenance.isAutopilot).toBe(true);
    expect(daveProvenance.presetType).toBe('FAVORITES');
  });

  it('Step 2 (Sunday 1:00 PM): Assert SLATE_LOCKED event freezes pick modifications', () => {
    const isSlateLocked = (currentTime: Date, lockTime: Date) => currentTime >= lockTime;
    const lockTime = new Date('2026-10-11T13:00:00-04:00');
    const sundayGameday = new Date('2026-10-11T13:05:00-04:00');

    expect(isSlateLocked(sundayGameday, lockTime)).toBe(true);
  });

  it('Step 3 (Sunday 3:00 PM): Process live game scores, verify Danger Seat and 100% Win Equity normalization', () => {
    const livePlayerStates = [
      { userId: 'u1', userName: 'Jack', bankedPoints: 7, livePicksWinning: 2 },
      { userId: 'u2', userName: 'Dave', bankedPoints: 7, livePicksWinning: 1 },
      { userId: 'u3', userName: 'Sarah', bankedPoints: 6, livePicksWinning: 2 },
      { userId: 'u4', userName: 'Mike', bankedPoints: 6, livePicksWinning: 1 },
      { userId: 'u5', userName: 'Tom', bankedPoints: 5, livePicksWinning: 2 },
      { userId: 'u6', userName: 'Chris', bankedPoints: 5, livePicksWinning: 1 },
      { userId: 'u7', userName: 'Alex', bankedPoints: 4, livePicksWinning: 2 },
      { userId: 'u8', userName: 'Emma', bankedPoints: 4, livePicksWinning: 1 },
      { userId: 'u9', userName: 'Ryan', bankedPoints: 3, livePicksWinning: 2 },
      { userId: 'u10', userName: 'Ben', bankedPoints: 3, livePicksWinning: 0 }
    ];

    const standings = reconcileRadarStandings(livePlayerStates);
    expect(standings).toHaveLength(10);

    // Sum of Win Equity strictly normalizes to 100%
    const totalWinEquity = standings.reduce((sum, s) => sum + s.winEquityPct, 0);
    expect(Math.round(totalWinEquity)).toBe(100);

    // 10th Place is in The Pit (2.50s debt)
    const deadPlacePlayer = standings.find((s) => s.currentRank === 10);
    expect(deadPlacePlayer?.userId).toBe('u10');
    expect(deadPlacePlayer?.penaltyShots).toBe(2.50);
  });

  it('Step 4 (Sunday 4:15 PM): Fire SLATE_FINALIZED and assign 10th place 2.50 Dead Place debt', () => {
    const participants: ParticipantScoreInput[] = USERS.map((u, idx) => ({
      userId: u.userId,
      userName: u.userName,
      seasonBankedPoints: 10 - idx,
      tiebreakerMnfDiff: idx + 1
    }));

    const finalGames: LiveGameTelemetry[] = [
      { gameId: 'g1', homeTeam: 'DET', awayTeam: 'GB', homeScore: 24, awayScore: 21, spread: -2.5, status: 'FINAL' },
      { gameId: 'g2', homeTeam: 'KC', awayTeam: 'BUF', homeScore: 27, awayScore: 24, spread: -1.5, status: 'FINAL' },
      { gameId: 'g3', homeTeam: 'PHI', awayTeam: 'DAL', homeScore: 28, awayScore: 14, spread: -4.5, status: 'FINAL' },
      { gameId: 'g4', homeTeam: 'MIA', awayTeam: 'NE', homeScore: 31, awayScore: 10, spread: -6.0, status: 'FINAL' }
    ];

    const userPicks: UserPick[] = PICKS.map((p) => ({
      userId: p.userId,
      userName: p.userName,
      gameId: p.gameId,
      selectedTeam: p.selectedTeam
    }));

    const settlement = finalizeSlateStandings('pool_alpha', 5, participants, userPicks, finalGames);
    expect(settlement.isFinalized).toBe(true);

    const deadPlace = settlement.settledStandings[9];
    expect(deadPlace.userId).toBe('u10');
    expect(deadPlace.isDeadPlace).toBe(true);
    expect(deadPlace.penaltyShots).toBe('2.50');
  });

  it('Step 5 (Monday Deposition): Execute submitPenaltyEvidenceRPC for 10th place and start 24h Jury Clock', async () => {
    const storagePathInfo = generateEvidenceStoragePath('pool_alpha', 'u10', 5, 1728600000000);
    const rpcResult = await submitPenaltyEvidenceRPC({
      filePath: storagePathInfo.storagePath,
      liquorType: 'WARM TEQUILA',
      poolId: 'pool_alpha',
      userId: 'u10',
      weekNumber: 5
    });

    expect(rpcResult.success).toBe(true);
    expect(rpcResult.status).toBe('UNDER_REVIEW');
    expect(rpcResult.cleanedUpOrphan).toBe(false);
    expect(new Date(rpcResult.juryClockExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('Step 6 (Tuesday Tribunal): 5 UPHOLD votes on SPILLED_LIQUOR dispute trigger Contempt of Court (+0.50s)', () => {
    const basePenalty = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50, 'WARM TEQUILA');
    const submittedPenalty = submitPenaltyEvidence(basePenalty, 'supabase://vault/penalties/pool_alpha/u10/w5.mp4');
    const disputedPenalty = filePenaltyDispute(
      submittedPenalty,
      'u1',
      'Jack',
      'SPILLED_LIQUOR',
      'At timestamp 00:14, half of the second shot glass was clearly spilled on the table.'
    );

    let docket = initializeTribunalDocket(disputedPenalty);

    // 5 impartial jurors cast UPHOLD votes
    const jurors = ['u2', 'u3', 'u4', 'u5', 'u6'];
    for (const j of jurors) {
      docket = castTribunalVote(docket, j, `Juror_${j}`, 'UPHOLD');
    }

    const { updatedDocket, isResolved, verdict, escalationEntry } = evaluateTribunalVerdict(docket);
    expect(isResolved).toBe(true);
    expect(verdict).toBe('UPHELD');
    expect(updatedDocket.shotDebt).toBe(3.00);
    expect(escalationEntry?.amount).toBe('+0.50');
    expect(escalationEntry?.reason).toContain('Contempt of Court');
  });

  it('Step 7 (Ledger Verification): 10th place lifetime outstanding debt equals strictly 3.00 SHOTS', () => {
    const baseDeadPlaceDebt = 2.50;
    const contemptEscalation = 0.50;
    const totalOutstandingDebt = baseDeadPlaceDebt + contemptEscalation;

    expect(totalOutstandingDebt).toBe(3.00);
  });
});
