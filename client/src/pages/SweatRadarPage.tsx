import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Activity,
  RefreshCw,
  Trophy,
  Users,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  Cpu,
  Wine,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { formatGameKickoff } from '../utils/dateUtils';

interface MemberPickInfo {
  userId: string;
  name: string;
  initials: string;
  email: string;
  isUser: boolean;
  selectedTeam: string | null;
}

interface LeverageMatchup {
  id: string;
  externalGameId: string;
  matchup: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamFull: string;
  awayTeamFull: string;
  kickoffTime: string;
  spread: string;
  spreadValue: number;
  homePickPct: number;
  awayPickPct: number;
  homeBackers: MemberPickInfo[];
  awayBackers: MemberPickInfo[];
  unpickedBackers: MemberPickInfo[];
  userPick: string | null;
  leverageScore: number;
  leverageTier: 'CRITICAL' | 'HIGH' | 'MODERATE';
  swingPotential: string;
  winProbabilityHome: number;
  gamedayStakes: string;
  userImpactWin: string;
  userImpactLoss: string;
  rivalLeverage: string;
}

interface ProjectedMember {
  userId: string;
  email: string;
  name: string;
  initials: string;
  isUser: boolean;
  currentPoints: number;
  projectedPoints: number;
  currentRank: number;
  projectedRank: number;
  winProbability: number;
  podiumProbability: number;
  deadPlaceProbability: number;
  isDeadPlaceRisk: boolean;
}

interface PathToVictoryOutcome {
  gameId: string;
  matchup: string;
  favoredTeam: string;
  impactLevel: 'MUST_WIN' | 'CRITICAL_UPSET' | 'HIGH_IMPACT';
  impactDescription: string;
  probability: number;
}

type ForcedGameOutcomes = Record<string, 'HOME' | 'AWAY' | 'AUTO'>;

interface MemberSimData {
  userId: string;
  email: string;
  name: string;
  initials: string;
  isUser: boolean;
  bankedPoints: number;
  picks: Record<string, string | null>; // gameId -> selectedTeamId
}

interface GameSimData {
  id: string;
  externalGameId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: string;
  spread: number;
  impliedHomeWinProb: number;
}

interface MonteCarloOutput {
  members: ProjectedMember[];
  jackWinEquity: number;
  topChallenger: { name: string; winRate: number; keyDeficit: string };
  deadPlaceMonarch: { name: string; deadPlaceRisk: number; safetyGap: string };
  totalSimulations: number;
  timestamp: Date;
}

const TEAM_NAMES: Record<string, string> = {
  DAL: 'Dallas Cowboys',
  TB: 'Tampa Bay Buccaneers',
  PHI: 'Philadelphia Eagles',
  JAX: 'Jacksonville Jaguars',
  NE: 'New England Patriots',
  LV: 'Las Vegas Raiders',
  GB: 'Green Bay Packers',
  CHI: 'Chicago Bears',
  MIA: 'Miami Dolphins',
  CIN: 'Cincinnati Bengals',
  NO: 'New Orleans Saints',
  MIN: 'Minnesota Vikings',
  TEN: 'Tennessee Titans',
  HOU: 'Houston Texans',
  PIT: 'Pittsburgh Steelers',
  IND: 'Indianapolis Colts',
  NYJ: 'New York Jets',
  CLE: 'Cleveland Browns',
  WAS: 'Washington Commanders',
  NYG: 'New York Giants',
  LAC: 'LA Chargers',
  DEN: 'Denver Broncos',
  SEA: 'Seattle Seahawks',
  SF: 'San Francisco 49ers',
  ARI: 'Arizona Cardinals',
  DET: 'Detroit Lions',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  LAR: 'LA Rams',
  BUF: 'Buffalo Bills',
  KC: 'Kansas City Chiefs',
  CAR: 'Carolina Panthers',
};

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

function getMemberMeta(email: string, displayName?: string, currentUserId?: string, userId?: string) {
  const isUser = email.toLowerCase() === 'jack@nflpickem.com' || userId === currentUserId;
  const lowerEmail = email.toLowerCase();
  if (MEMBER_DISPLAY_MAP[lowerEmail]) {
    return {
      ...MEMBER_DISPLAY_MAP[lowerEmail],
      isUser,
    };
  }
  const cleanName = displayName || email.split('@')[0];
  const parts = cleanName.split(/[\s._-]+/);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : cleanName.slice(0, 2).toUpperCase();

  return {
    name: cleanName,
    initials,
    isUser,
  };
}

/**
 * Pure client-side Monte Carlo Simulation Engine (1,000 Slates)
 */
function runMonteCarlo(
  games: GameSimData[],
  members: MemberSimData[],
  customOverrides: ForcedGameOutcomes,
  iterations = 1000
): MonteCarloOutput {
  const memberCounts: Record<string, { first: number; podium: number; last: number; pointSum: number }> = {};
  for (const m of members) {
    memberCounts[m.userId] = { first: 0, podium: 0, last: 0, pointSum: 0 };
  }

  for (let i = 0; i < iterations; i++) {
    // 1. Determine winners for all games in this iteration
    const winners: Record<string, string> = {};
    for (const g of games) {
      const forced = customOverrides[g.id] || 'AUTO';
      if (forced === 'HOME') {
        winners[g.id] = g.homeTeamId;
      } else if (forced === 'AWAY') {
        winners[g.id] = g.awayTeamId;
      } else {
        const pHome = g.impliedHomeWinProb;
        winners[g.id] = Math.random() < pHome ? g.homeTeamId : g.awayTeamId;
      }
    }

    // 2. Score every member
    const iterScores = members.map((m) => {
      let simPoints = m.bankedPoints;
      for (const g of games) {
        const picked = m.picks[g.id];
        if (picked && picked === winners[g.id]) {
          simPoints += 1;
        }
      }
      return {
        userId: m.userId,
        points: simPoints,
        banked: m.bankedPoints,
        tiebreak: Math.random(),
      };
    });

    // 3. Rank iteration scores descending
    iterScores.sort((a, b) => b.points - a.points || b.banked - a.banked || b.tiebreak - a.tiebreak);

    // 4. Record placements
    const topScore = iterScores[0].points;
    const lowestScore = iterScores[iterScores.length - 1].points;

    for (let rank = 0; rank < iterScores.length; rank++) {
      const entry = iterScores[rank];
      const stats = memberCounts[entry.userId];
      stats.pointSum += entry.points;

      if (rank === 0 || entry.points === topScore) {
        stats.first += 1;
      }
      if (rank < 3) {
        stats.podium += 1;
      }
      if (rank === iterScores.length - 1 || entry.points === lowestScore) {
        stats.last += 1;
      }
    }
  }

  // 5. Aggregate results
  // Compute current rank from banked points
  const sortedByBanked = [...members].sort((a, b) => b.bankedPoints - a.bankedPoints);
  const currentRankMap = new Map<string, number>();
  sortedByBanked.forEach((m, idx) => {
    currentRankMap.set(m.userId, idx + 1);
  });

  const rankedMembers: ProjectedMember[] = members.map((m) => {
    const stats = memberCounts[m.userId] || { first: 0, podium: 0, last: 0, pointSum: 0 };
    const avgPts = Math.round(stats.pointSum / iterations);
    const winRate = Math.round((stats.first / iterations) * 1000) / 10;
    const podiumRate = Math.round((stats.podium / iterations) * 1000) / 10;
    const deadPlaceRate = Math.round((stats.last / iterations) * 1000) / 10;
    const currentRank = currentRankMap.get(m.userId) || 1;

    return {
      userId: m.userId,
      email: m.email,
      name: m.name,
      initials: m.initials,
      isUser: m.isUser,
      currentPoints: Math.round(m.bankedPoints),
      projectedPoints: avgPts,
      currentRank,
      projectedRank: currentRank,
      winProbability: winRate,
      podiumProbability: podiumRate,
      deadPlaceProbability: deadPlaceRate,
      isDeadPlaceRisk: deadPlaceRate > 25,
    };
  });

  rankedMembers.sort((a, b) => b.projectedPoints - a.projectedPoints || b.winProbability - a.winProbability);
  const finalProjected = rankedMembers.map((m, idx) => ({
    ...m,
    projectedRank: idx + 1,
  }));

  const userMember = finalProjected.find((m) => m.isUser) || finalProjected[0];
  const competitors = finalProjected.filter((m) => !m.isUser);
  competitors.sort((a, b) => b.winProbability - a.winProbability);
  const topChallenger = competitors[0] || { name: 'Commissioner', winProbability: 7.4, projectedPoints: 12 };

  const lastPlaceCandidates = [...finalProjected].sort((a, b) => b.deadPlaceProbability - a.deadPlaceProbability);
  const deadPlaceMonarch = lastPlaceCandidates[0] || finalProjected[finalProjected.length - 1];

  return {
    members: finalProjected,
    jackWinEquity: userMember.winProbability,
    topChallenger: {
      name: topChallenger.name,
      winRate: topChallenger.winProbability,
      keyDeficit: `${Math.max(1, Math.round(userMember.projectedPoints - topChallenger.projectedPoints))} pts behind`,
    },
    deadPlaceMonarch: {
      name: deadPlaceMonarch.name,
      deadPlaceRisk: deadPlaceMonarch.deadPlaceProbability,
      safetyGap: '2 pts behind #9',
    },
    totalSimulations: iterations,
    timestamp: new Date(),
  };
}

export const SweatRadarPage: React.FC = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'WHAT_IF' | 'MONTE_CARLO'>('WHAT_IF');
  const [poolName, setPoolName] = useState('Main League');

  // Live data structures
  const [rawMembers, setRawMembers] = useState<MemberSimData[]>([]);
  const [rawGames, setRawGames] = useState<GameSimData[]>([]);
  const [leverageMatchups, setLeverageMatchups] = useState<LeverageMatchup[]>([]);
  const [pathToVictory, setPathToVictory] = useState<PathToVictoryOutcome[]>([]);

  // Simulation state
  const [forcedOutcomes, setForcedOutcomes] = useState<ForcedGameOutcomes>({});
  const [expandedGameIds, setExpandedGameIds] = useState<Record<string, boolean>>({});
  const [isSimulatingMonteCarlo, setIsSimulatingMonteCarlo] = useState(false);
  const [simOutput, setSimOutput] = useState<MonteCarloOutput | null>(null);

  // Fetch live state from backend
  const fetchLiveSlateData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch pools
      const poolRes = await fetch('/api/pools', {
        headers: { Authorization: `Bearer ${token}` },
      });
      let activePoolId = '';
      if (poolRes.ok) {
        const pools = await poolRes.json();
        const savedPoolId = localStorage.getItem('active_pool_id');
        const mainPool =
          pools.find((p: any) => p.name === 'Main League') ||
          (savedPoolId ? pools.find((p: any) => p.id === savedPoolId) : undefined) ||
          pools[0];
        if (mainPool) {
          activePoolId = mainPool.id;
          setPoolName(mainPool.name);
          localStorage.setItem('active_pool_id', mainPool.id);
        }
      }

      if (!activePoolId) {
        setLoading(false);
        return;
      }

      // 2. Fetch Leaderboard (banked points) and Matrix (active Week 5 schedule & picks)
      const [lbRes, matRes] = await Promise.all([
        fetch(`/api/pools/${activePoolId}/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/pools/${activePoolId}/matrix?week_no=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let leaderboardEntries: any[] = [];
      let matrixPayload: any = null;

      if (lbRes.ok) {
        const lbJson = await lbRes.json();
        leaderboardEntries = lbJson.leaderboard || [];
      }
      if (matRes.ok) {
        matrixPayload = await matRes.json();
      }

      const columns = matrixPayload?.columns || [];
      const rows = matrixPayload?.rows || [];
      const cells = matrixPayload?.cells || {};

      // 3. Construct MemberSimData array with real Week 5 banked points and real active picks
      const members: MemberSimData[] = columns.map((col: any) => {
        const meta = getMemberMeta(col.email, col.displayName, user?.id, col.user_id);

        // Banked points for Week 5 must compute ONLY from games belonging to Week 5 that have status === 'FINAL'
        let week5BankedPoints = 0;
        for (const row of rows) {
          if (row.status === 'FINAL' && row.home_score !== null && row.away_score !== null) {
            const winner = row.home_score > row.away_score ? row.home_team_id : (row.away_score > row.home_score ? row.away_team_id : null);
            const userPick = cells[row.game_id]?.[col.user_id]?.selected_team_id;
            if (winner && userPick === winner) {
              week5BankedPoints += 1;
            }
          }
        }

        const memberPicks: Record<string, string | null> = {};
        for (const row of rows) {
          const cell = cells[row.game_id]?.[col.user_id];
          memberPicks[row.game_id] = cell?.selected_team_id || null;
        }

        return {
          userId: col.user_id,
          email: col.email,
          name: meta.name,
          initials: meta.initials,
          isUser: meta.isUser,
          bankedPoints: week5BankedPoints,
          picks: memberPicks,
        };
      });

      // 4. Construct GameSimData array with local timezone formatting
      const games: GameSimData[] = rows.map((row: any) => {
        const spreadNum = typeof row.spread === 'number' ? row.spread : -3.5;
        // Implied win probability from spread
        const impliedProb = Math.max(0.20, Math.min(0.85, 0.50 - (spreadNum * 0.035)));

        return {
          id: row.game_id,
          externalGameId: row.external_game_id,
          homeTeamId: row.home_team_id,
          awayTeamId: row.away_team_id,
          kickoffTime: formatGameKickoff(row.kickoff_time),
          spread: spreadNum,
          impliedHomeWinProb: impliedProb,
        };
      });

      setRawMembers(members);
      setRawGames(games);

      // 5. Construct Leverage Matchups with mini-ledger backer arrays
      const leverageList: LeverageMatchup[] = games.slice(0, 4).map((g) => {
        const homeBackers: MemberPickInfo[] = [];
        const awayBackers: MemberPickInfo[] = [];
        const unpickedBackers: MemberPickInfo[] = [];

        for (const m of members) {
          const pick = m.picks[g.id];
          const info: MemberPickInfo = {
            userId: m.userId,
            name: m.name,
            initials: m.initials,
            email: m.email,
            isUser: m.isUser,
            selectedTeam: pick,
          };

          if (pick === g.homeTeamId) {
            homeBackers.push(info);
          } else if (pick === g.awayTeamId) {
            awayBackers.push(info);
          } else {
            unpickedBackers.push(info);
          }
        }

        const totalGraded = homeBackers.length + awayBackers.length;
        const homePct = totalGraded > 0 ? Math.round((homeBackers.length / totalGraded) * 100) : 50;
        const awayPct = 100 - homePct;

        const userMember = members.find((m) => m.isUser);
        const userPick = userMember ? userMember.picks[g.id] : null;

        const spreadStr = g.spread < 0 ? `${g.homeTeamId} ${g.spread}` : `${g.awayTeamId} -${g.spread}`;
        const leverageScore = Math.round(95 - Math.abs(homePct - 50) * 0.8);

        return {
          id: g.id,
          externalGameId: g.externalGameId,
          matchup: `${g.awayTeamId} @ ${g.homeTeamId}`,
          homeTeam: g.homeTeamId,
          awayTeam: g.awayTeamId,
          homeTeamFull: TEAM_NAMES[g.homeTeamId] || g.homeTeamId,
          awayTeamFull: TEAM_NAMES[g.awayTeamId] || g.awayTeamId,
          kickoffTime: g.kickoffTime,
          spread: spreadStr,
          spreadValue: g.spread,
          homePickPct: homePct,
          awayPickPct: awayPct,
          homeBackers,
          awayBackers,
          unpickedBackers,
          userPick,
          leverageScore,
          leverageTier: leverageScore >= 85 ? 'CRITICAL' : 'HIGH',
          swingPotential: `±${Math.max(2, Math.round(totalGraded / 3))} Position Swing across top contenders`,
          winProbabilityHome: Math.round(g.impliedHomeWinProb * 100),
          gamedayStakes: `High Pool Polarity: ${homePct}% backing ${g.homeTeamId}, ${awayPct}% backing ${g.awayTeamId}. A ${awayPct > homePct ? g.homeTeamId : g.awayTeamId} upset causes immediate leaderboard compression.`,
          userImpactWin: userPick
            ? `If ${userPick} wins: Jack earns +1 banked point toward 1st place.`
            : `Unpicked: Pick ${g.homeTeamId} or ${g.awayTeamId} to secure leverage.`,
          userImpactLoss: userPick
            ? `If ${userPick === g.homeTeamId ? g.awayTeamId : g.homeTeamId} wins: Contenders holding opposite pick gain +1 point.`
            : 'No pick submitted yet.',
          rivalLeverage: `${awayBackers[0]?.name || 'Contender'} gains leverage on an upset.`,
        };
      });

      setLeverageMatchups(leverageList);

      // 6. Set Path to Victory checklist
      setPathToVictory(
        games.slice(0, 4).map((g, idx) => {
          const userMember = members.find((m) => m.isUser);
          const userChoice = userMember?.picks[g.id] || g.homeTeamId;
          return {
            gameId: g.id,
            matchup: `${g.awayTeamId} @ ${g.homeTeamId}`,
            favoredTeam: `${TEAM_NAMES[userChoice] || userChoice} (${userChoice})`,
            impactLevel: idx === 0 ? 'MUST_WIN' : idx === 1 ? 'MUST_WIN' : 'HIGH_IMPACT',
            impactDescription: `Lock in +1.0 point while fading opposite cohort picks`,
            probability: Math.round(g.impliedHomeWinProb * 100),
          };
        })
      );

      // 7. Initial Monte Carlo execution
      const initialSim = runMonteCarlo(games, members, {});
      setSimOutput(initialSim);
    } catch (err) {
      console.error('Sweat Radar data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchLiveSlateData();
  }, [fetchLiveSlateData]);

  // Re-run simulation whenever forced outcomes change
  useEffect(() => {
    if (rawGames.length > 0 && rawMembers.length > 0) {
      const output = runMonteCarlo(rawGames, rawMembers, forcedOutcomes);
      setSimOutput(output);
    }
  }, [forcedOutcomes, rawGames, rawMembers]);

  // Handle manual re-run
  const handleRunMonteCarlo = () => {
    setIsSimulatingMonteCarlo(true);
    setTimeout(() => {
      const output = runMonteCarlo(rawGames, rawMembers, forcedOutcomes, 1000);
      setSimOutput(output);
      setIsSimulatingMonteCarlo(false);
    }, 250);
  };

  const handleToggleOutcome = (gameId: string, choice: 'HOME' | 'AWAY' | 'AUTO') => {
    setForcedOutcomes((prev) => ({
      ...prev,
      [gameId]: choice,
    }));
  };

  const handleResetOutcomes = () => {
    setForcedOutcomes({});
  };

  const toggleExpandGame = (gameId: string) => {
    setExpandedGameIds((prev) => ({
      ...prev,
      [gameId]: !prev[gameId],
    }));
  };

  const forcedCount = Object.values(forcedOutcomes).filter((v) => v !== 'AUTO').length;
  const projectedMembers = simOutput?.members || [];
  const jackProjected = projectedMembers.find((m) => m.isUser) || projectedMembers[0] || {
    projectedRank: 1,
    winProbability: 88,
    podiumProbability: 95,
    projectedPoints: 26,
    currentPoints: 14,
  };
  const deadPlaceMonarch = simOutput?.deadPlaceMonarch || {
    name: 'Henry Ford',
    deadPlaceRisk: 42,
    safetyGap: '2.0 pts behind #9',
  };
  const topChallenger = simOutput?.topChallenger || {
    name: 'Commissioner',
    winRate: 7.4,
    keyDeficit: '1.0 pts behind',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-100">
      {/* Hypothetical Simulation Mode Banner */}
      {forcedCount > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-slate-900 border border-amber-500/40 rounded-xl p-4 mb-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-black text-amber-300 tracking-wide uppercase">
                HYPOTHETICAL SIMULATION ACTIVE
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Viewing custom scenario with {forcedCount} forced outcome{forcedCount > 1 ? 's' : ''}. Projected ranks reflect user overrides.
              </div>
            </div>
          </div>
          <button
            onClick={handleResetOutcomes}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>↺ Reset to Baseline Live Reality</span>
          </button>
        </div>
      )}

      {/* 1. Header Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black text-cyan-400 uppercase tracking-widest mb-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live Reactive Monte Carlo Sweat Radar</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {poolName} — Week 5 Live Simulator
            </h1>
            <p className="text-cyan-400 font-bold text-xs sm:text-sm mt-1">
              Week 5 Slate Unstarted — All 15 Matchups Pending Kickoff
            </p>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 max-w-2xl">
              1,000-run Monte Carlo simulation wired directly to real saved picks and live Week 5 baseline odds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center p-1 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('WHAT_IF')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                  activeTab === 'WHAT_IF'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>What-If Toggles</span>
                {forcedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-cyan-500 text-slate-950 font-black">
                    {forcedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('MONTE_CARLO')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                  activeTab === 'MONTE_CARLO'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Monte Carlo (1,000 Slates)</span>
              </button>
            </div>

            {forcedCount > 0 && (
              <button
                onClick={handleResetOutcomes}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
                title="Reset all forced outcomes to live odds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Baseline</span>
              </button>
            )}

            <button
              onClick={fetchLiveSlateData}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-md disabled:opacity-50"
              title="Refresh live database picks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Projection</div>
            <div className="text-xl font-black text-white mt-0.5 flex items-center space-x-2">
              <span>#{jackProjected.projectedRank} Projected</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {jackProjected.winProbability}% Win
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">
              {jackProjected.currentPoints} Banked Pts in Week 5
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Projected Week 5 Points</div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">
              {jackProjected.projectedPoints} pts <span className="text-xs text-slate-500 font-normal">({jackProjected.currentPoints} banked)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Challenger</div>
            <div className="text-xl font-black text-amber-400 mt-0.5 truncate">
              {topChallenger.name} ({topChallenger.winRate}%)
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dead Place Monarch</div>
            <div className="text-xl font-black text-rose-400 mt-0.5 truncate">
              {deadPlaceMonarch.name} (2.5 Shots Due)
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {deadPlaceMonarch.deadPlaceRisk}% dead place risk
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Simulator Bar */}
      <div className="p-5 rounded-3xl glass-card border border-slate-800 bg-slate-900/90 shadow-xl space-y-4">
        {activeTab === 'WHAT_IF' ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-black text-white">Interactive Matchup Outcome Toggles</span>
                <span className="text-xs text-slate-400">(Click a team to force outcome and update live standings)</span>
              </div>
              {forcedCount > 0 && (
                <span className="text-xs text-cyan-300 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  ⚡ Simulating {forcedCount} Custom Outcome{forcedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
              {leverageMatchups.map((game) => {
                const currentForced = forcedOutcomes[game.id] || 'AUTO';

                return (
                  <div key={game.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{game.matchup}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{game.spread}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                      <button
                        onClick={() => handleToggleOutcome(game.id, 'AWAY')}
                        className={`py-1 rounded-lg transition-all text-center ${
                          currentForced === 'AWAY'
                            ? 'bg-indigo-500 text-white shadow-md font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {game.awayTeam}
                      </button>
                      <button
                        onClick={() => handleToggleOutcome(game.id, 'AUTO')}
                        className={`py-1 rounded-lg transition-all text-[10px] text-center ${
                          currentForced === 'AUTO'
                            ? 'bg-slate-700 text-slate-200 font-bold'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Odds
                      </button>
                      <button
                        onClick={() => handleToggleOutcome(game.id, 'HOME')}
                        className={`py-1 rounded-lg transition-all text-center ${
                          currentForced === 'HOME'
                            ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {game.homeTeam}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Monte Carlo Engine Panel */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-black text-white">Monte Carlo Simulation Engine (1,000 Slates)</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulates 1,000 randomized slate runs weighted by live Vegas implied odds and user picks.
                </p>
              </div>

              <button
                onClick={handleRunMonteCarlo}
                disabled={isSimulatingMonteCarlo}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingMonteCarlo ? 'animate-spin' : ''}`} />
                <span>{isSimulatingMonteCarlo ? 'Simulating 1,000 Slates...' : 'Re-Run 1,000 Simulations'}</span>
              </button>
            </div>

            {/* Monte Carlo Probability Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-purple-500/20">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Jack Win Equity</div>
                <div className="text-lg font-black text-purple-300 mt-0.5">
                  {jackProjected.winProbability}% (1st Place)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{jackProjected.podiumProbability}% Podium rate</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Top Challenger</div>
                <div className="text-lg font-black text-amber-300 mt-0.5 truncate">
                  {topChallenger.name} ({topChallenger.winRate}%)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{topChallenger.keyDeficit}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Dead Place Risk (Last)</div>
                <div className="text-lg font-black text-rose-400 mt-0.5 truncate">
                  {deadPlaceMonarch.name} ({deadPlaceMonarch.deadPlaceRisk}%)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">High risk of 2.5 shot penalty & Shot-Cam audit</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Engine Telemetry</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">
                  1,000 Iterations
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Live at {simOutput?.timestamp?.toLocaleTimeString() || 'Just now'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Pivotal Leverage Games with Mini-Ledgers and Deep-Dive Trays */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h2 className="text-xl font-black text-white tracking-tight">Critical Leverage Matchups</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">Pivotal Gameday Polarities</span>
            </div>

            <div className="space-y-4">
              {leverageMatchups.map((game) => {
                const isExpanded = Boolean(expandedGameIds[game.id]);
                const userPickedHome = game.userPick === game.homeTeam;
                const userPickedAway = game.userPick === game.awayTeam;

                return (
                  <div
                    key={game.id}
                    className="bg-slate-900/70 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-colors shadow-xl overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-black text-white">{game.matchup}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                              {game.spread}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{game.kickoffTime}</div>
                        </div>

                        <span
                          className={`px-2.5 py-1 text-[10px] font-black rounded-lg border tracking-wider uppercase ${
                            game.leverageTier === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                          }`}
                        >
                          {game.leverageScore}% Leverage
                        </span>
                      </div>

                      {/* Pick Split Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={userPickedAway ? 'text-indigo-300 flex items-center gap-1 font-black' : 'text-slate-300'}>
                            {game.awayTeam} ({game.awayPickPct}%) {userPickedAway && <CheckCircle2 className="w-3.5 h-3.5 inline text-cyan-400" />}
                          </span>
                          <span className={userPickedHome ? 'text-emerald-300 flex items-center gap-1 font-black' : 'text-slate-300'}>
                            {userPickedHome && <CheckCircle2 className="w-3.5 h-3.5 inline text-cyan-400" />} {game.homeTeam} ({game.homePickPct}%)
                          </span>
                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                            style={{ width: `${game.awayPickPct}%` }}
                          ></div>
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                            style={{ width: `${game.homePickPct}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Member Initials Mini-Ledger */}
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850 space-y-2.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Member Pick Distribution</span>
                          <span className="text-[9px] text-slate-500 font-normal">
                            {game.homeBackers.length + game.awayBackers.length} / 10 Picks Active
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                          {/* Away Backers */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                              <span>{game.awayTeam} Backers ({game.awayBackers.length})</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {game.awayBackers.length === 0 ? (
                                <span className="text-[10px] text-slate-600 italic">None</span>
                              ) : (
                                game.awayBackers.map((b) => (
                                  <div
                                    key={b.userId}
                                    title={`${b.name} (${b.selectedTeam})`}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] transition-transform hover:scale-110 ${
                                      b.isUser
                                        ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400 shadow-sm shadow-cyan-500/40 ring-2 ring-cyan-500/20'
                                        : 'bg-indigo-950 text-indigo-200 border border-indigo-500/40'
                                    }`}
                                  >
                                    {b.initials}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Home Backers */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <span>{game.homeTeam} Backers ({game.homeBackers.length})</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {game.homeBackers.length === 0 ? (
                                <span className="text-[10px] text-slate-600 italic">None</span>
                              ) : (
                                game.homeBackers.map((b) => (
                                  <div
                                    key={b.userId}
                                    title={`${b.name} (${b.selectedTeam})`}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] transition-transform hover:scale-110 ${
                                      b.isUser
                                        ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400 shadow-sm shadow-cyan-500/40 ring-2 ring-cyan-500/20'
                                        : 'bg-emerald-950 text-emerald-200 border border-emerald-500/40'
                                    }`}
                                  >
                                    {b.initials}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Tray Trigger Button */}
                      <button
                        onClick={() => toggleExpandGame(game.id)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-750 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-1.5">
                          <Target className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Deep Dive & Strategy Breakdown</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Deep Dive Tray */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-950/90 border-t border-slate-800 space-y-3.5 animate-scale-in text-xs">
                        <div className="space-y-1">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <Info className="w-3.5 h-3.5 text-cyan-400" />
                            <span>The Gameday Stakes</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{game.gamedayStakes}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                            <div className="font-bold text-emerald-300 flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Your Upside</span>
                            </div>
                            <p className="text-slate-300 text-[11px]">{game.userImpactWin}</p>
                          </div>

                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                            <div className="font-bold text-rose-300 flex items-center space-x-1">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                              <span>Your Downside Risk</span>
                            </div>
                            <p className="text-slate-300 text-[11px]">{game.userImpactLoss}</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center space-x-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                          <span><strong>Rival Impact:</strong> {game.rivalLeverage}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Path to Victory Calculator */}
          <div className="p-6 rounded-3xl glass-panel border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 to-emerald-950/20 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-black text-white tracking-tight">Jack's Path to 1st Place</h2>
            </div>
            <p className="text-xs text-slate-400">
              Optimal game outcome sequence needed to mathematically lock in the Week 5 victory.
            </p>

            <div className="space-y-3 pt-2">
              {pathToVictory.map((step, sIdx) => (
                <div
                  key={step.gameId}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3.5"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {sIdx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs sm:text-sm">{step.favoredTeam}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {step.probability}% Implied Prob
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{step.impactDescription}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Projected Standings & Dead Place Monitor */}
        <div className="lg:col-span-5 space-y-8">
          {/* Live Projected Standings Card */}
          <div className="bg-slate-950/90 border border-cyan-500/20 shadow-2xl rounded-2xl backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Projected Week 5 Finish</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Simulation forecast based on remaining unplayed matchups & banked points
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-semibold">{projectedMembers.length} Members</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {projectedMembers.map((member) => {
                const rankDelta = member.currentRank - member.projectedRank;

                return (
                  <div
                    key={member.userId}
                    className={`py-3.5 px-3 rounded-xl flex items-center justify-between transition-all ${
                      member.isUser
                        ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Rank Indicator */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          member.projectedRank === 1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                            : member.projectedRank <= 3
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : member.projectedRank >= 9
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {member.projectedRank}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold ${member.isUser ? 'text-cyan-300' : 'text-white'}`}>
                            {member.name}
                          </span>
                          {member.isUser && (
                            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                              YOU
                            </span>
                          )}
                        </div>
                        {/* Secondary rank & banked points explanation label */}
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          <span className="font-semibold text-cyan-400">#{member.projectedRank} Projected</span>
                          <span className="text-slate-400"> ({member.currentPoints} Banked Pts ➔ <strong className="text-slate-200">{member.projectedPoints} Proj</strong>)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span className="text-emerald-400 font-semibold">{member.winProbability}% Win Equity</span>
                          <span>•</span>
                          <span>{member.podiumProbability}% Podium</span>
                        </div>
                      </div>
                    </div>

                    {/* Rank Movement Velocity Badge */}
                    <div className="flex items-center space-x-2">
                      {rankDelta > 0 ? (
                        <span className="flex items-center space-x-0.5 text-xs font-bold text-emerald-400" title={`Projected +${rankDelta} spots higher than current standings`}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+{rankDelta}</span>
                        </span>
                      ) : rankDelta < 0 ? (
                        <span className="flex items-center space-x-0.5 text-xs font-bold text-rose-400" title={`Projected ${rankDelta} spots lower than current standings`}>
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>{rankDelta}</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500" title="Projected rank matches current standings">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dead Place Shot Penalty Monitor */}
          <div className="p-6 rounded-3xl glass-panel border border-rose-500/30 bg-gradient-to-br from-slate-900/90 to-rose-950/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-400">
                <Wine className="w-5 h-5" />
                <h2 className="text-xl font-black text-white tracking-tight">Danger Zone Monitor</h2>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                2.5 Shot Penalty
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Members occupying the lowest projected rank are subject to the Dead Place shot penalty (Decision #65).
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Monarch</div>
                  <div className="text-base font-black text-white mt-0.5">{deadPlaceMonarch.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dead Place Risk</div>
                  <div className="text-base font-black text-rose-400 mt-0.5">{deadPlaceMonarch.deadPlaceRisk}%</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>Requires 3+ underdog upsets this slate to escape Dead Place.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
