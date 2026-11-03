import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { scopedExpressFetch } from '../lib/apiClient';
import { calculateProvisionalStandings, type SlateGame, type UserStandingRef, type UserPickItem, type TiebreakerData } from '../services/sweatProjectionService';
import type { LiveGame } from '../services/liveScoreService';
import { isKickoffLocked, evaluateSlateLockSummary } from '../services/lockEnforcementService';
import { getRadarStatusPill, getRadarSectionHeader } from '../pages/RadarPage';

const DEFAULT_POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

export const DEFAULT_SIM_MATCHES = Object.freeze([
  Object.freeze({ id: 'sim-tb', homeTeam: 'DET', awayTeam: 'MIN', homeScore: 31, awayScore: 28, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T17:00:00.000Z' }),
  Object.freeze({ id: 'sim-g2', homeTeam: 'GB', awayTeam: 'CAR', homeScore: 24, awayScore: 10, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T17:00:00.000Z' }),
  Object.freeze({ id: 'sim-g3', homeTeam: 'DAL', awayTeam: 'ARI', homeScore: 27, awayScore: 20, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T20:25:00.000Z' }),
  Object.freeze({ id: 'sim-g4', homeTeam: 'CIN', awayTeam: 'TEN', homeScore: 17, awayScore: 14, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T20:25:00.000Z' }),
]);

export const DEFAULT_SIM_MEMBERS = Object.freeze([
  Object.freeze({ id: 'm1', name: 'jack.w.cone', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'GB' }, { gameId: 'sim-g3', selectedTeam: 'DAL' }, { gameId: 'sim-g4', selectedTeam: 'CIN' }]), tb: 58 }),
  Object.freeze({ id: 'm2', name: 'chrisbrickner', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'GB' }, { gameId: 'sim-g3', selectedTeam: 'DAL' }, { gameId: 'sim-g4', selectedTeam: 'TEN' }]), tb: 52 }),
  Object.freeze({ id: 'm3', name: 'davebrickner', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'MIN' }, { gameId: 'sim-g2', selectedTeam: 'GB' }, { gameId: 'sim-g3', selectedTeam: 'DAL' }, { gameId: 'sim-g4', selectedTeam: 'CIN' }]), tb: 50 }),
  Object.freeze({ id: 'm4', name: 'daveculp', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'CAR' }, { gameId: 'sim-g3', selectedTeam: 'DAL' }, { gameId: 'sim-g4', selectedTeam: 'CIN' }]), tb: 48 }),
  Object.freeze({ id: 'm5', name: 'edbrickner', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'GB' }, { gameId: 'sim-g3', selectedTeam: 'ARI' }, { gameId: 'sim-g4', selectedTeam: 'CIN' }]), tb: 60 }),
  Object.freeze({ id: 'm6', name: 'justinbrickner', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'MIN' }, { gameId: 'sim-g2', selectedTeam: 'CAR' }, { gameId: 'sim-g3', selectedTeam: 'DAL' }, { gameId: 'sim-g4', selectedTeam: 'CIN' }]), tb: 55 }),
  Object.freeze({ id: 'm7', name: 'markbrickner', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'MIN' }, { gameId: 'sim-g2', selectedTeam: 'CAR' }, { gameId: 'sim-g3', selectedTeam: 'DAL' }, { gameId: 'sim-g4', selectedTeam: 'TEN' }]), tb: 54 }),
  Object.freeze({ id: 'm8', name: 'mattbrickner', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'MIN' }, { gameId: 'sim-g2', selectedTeam: 'CAR' }, { gameId: 'sim-g3', selectedTeam: 'ARI' }, { gameId: 'sim-g4', selectedTeam: 'CIN' }]), tb: 40 }),
  Object.freeze({ id: 'm9', name: 'ryanculp', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'MIN' }, { gameId: 'sim-g2', selectedTeam: 'CAR' }, { gameId: 'sim-g3', selectedTeam: 'ARI' }, { gameId: 'sim-g4', selectedTeam: 'TEN' }]), tb: 38 }),
  Object.freeze({ id: 'm10', name: 'sambrickner', picks: Object.freeze([{ gameId: 'sim-tb', selectedTeam: 'MIN' }, { gameId: 'sim-g2', selectedTeam: 'CAR' }, { gameId: 'sim-g3', selectedTeam: 'ARI' }, { gameId: 'sim-g4', selectedTeam: 'TEN' }]), tb: 30 }),
]);

export const DEFAULT_SIM_CLOCK = '2026-11-01T20:00:00.000Z';

export const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
];

export function cloneDefaultSimMatches(): any[] {
  return JSON.parse(JSON.stringify(DEFAULT_SIM_MATCHES));
}

export function cloneDefaultSimMembers(): any[] {
  return JSON.parse(JSON.stringify(DEFAULT_SIM_MEMBERS));
}

export function generateNextMatchId(existingMatches: { id: string }[]): string {
  const existingIds = new Set(existingMatches.map((m) => m.id));
  let counter = 2;
  while (existingIds.has(`sim-g${counter}`)) {
    counter++;
  }
  return `sim-g${counter}`;
}

export function generateNextMemberId(existingMembers: { id: string }[]): string {
  const existingIds = new Set(existingMembers.map((m) => m.id));
  let counter = 1;
  while (existingIds.has(`m${counter}`)) {
    counter++;
  }
  return `m${counter}`;
}

export function updateMatchTeamWithPickSync(
  matches: any[],
  members: any[],
  matchId: string,
  side: 'home' | 'away',
  newTeam: string
): { updatedMatches: any[]; updatedMembers: any[] } {
  let oldTeam = '';
  const updatedMatches = matches.map((m) => {
    if (m.id !== matchId) return m;
    oldTeam = side === 'home' ? m.homeTeam : m.awayTeam;
    return side === 'home' ? { ...m, homeTeam: newTeam } : { ...m, awayTeam: newTeam };
  });

  const updatedMembers = members.map((mem) => {
    const updatedPicks = (mem.picks || []).map((p: any) => {
      if (p.gameId === matchId && p.selectedTeam === oldTeam) {
        return { ...p, selectedTeam: newTeam };
      }
      return p;
    });
    return { ...mem, picks: updatedPicks };
  });

  return { updatedMatches, updatedMembers };
}

export function computeSimulationStandings(
  simMatches: any[],
  simMembers: any[],
  simulatedClock: string
): {
  standings: any[];
  slateGames: SlateGame[];
  liveScores: LiveGame[];
  allSimFinal: boolean;
  actualTotal: number | null;
} {
  const clockMs = simulatedClock ? new Date(simulatedClock).getTime() : Date.now();

  const effectiveMatches = simMatches.map((m: any, idx: number) => {
    const rawStatus = m.status != null ? String(m.status).trim().toUpperCase() : 'SCHEDULED';
    const mKickoffMs = m.kickoffTime ? new Date(m.kickoffTime).getTime() : NaN;
    const isPastKickoff = isNaN(mKickoffMs) || clockMs >= mKickoffMs;
    const effectiveStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' =
      !isPastKickoff
        ? 'SCHEDULED'
        : rawStatus === 'FINAL'
          ? 'FINAL'
          : rawStatus === 'IN_PROGRESS'
            ? 'IN_PROGRESS'
            : 'SCHEDULED';

    const homeTeamCode = String(m.homeTeam || m.homeTeamId || '').trim().toUpperCase();
    const awayTeamCode = String(m.awayTeam || m.awayTeamId || '').trim().toUpperCase();
    const homeScore = m.homeScore != null ? String(m.homeScore) : '0';
    const awayScore = m.awayScore != null ? String(m.awayScore) : '0';
    const kickoffTime = m.kickoffTime || new Date(simulatedClock || Date.now()).toISOString();

    return {
      id: String(m.id || `sim-game-${idx + 1}`).trim(),
      homeTeamCode,
      awayTeamCode,
      homeScore,
      awayScore,
      kickoffTime,
      effectiveStatus,
      rawMatch: m,
    };
  });

  const slateGames: SlateGame[] = effectiveMatches.map((em) => ({
    id: em.id,
    homeTeam: em.homeTeamCode,
    awayTeam: em.awayTeamCode,
    spread: typeof em.rawMatch.spread === 'number' ? em.rawMatch.spread : undefined,
    kickoffTime: em.kickoffTime,
    status: em.effectiveStatus,
    isFinal: em.effectiveStatus === 'FINAL',
    homeScore: em.effectiveStatus !== 'SCHEDULED' ? Number(em.homeScore) : undefined,
    awayScore: em.effectiveStatus !== 'SCHEDULED' ? Number(em.awayScore) : undefined,
  }));

  const liveScores: LiveGame[] = effectiveMatches.map((em) => ({
    id: em.id,
    name: `${em.awayTeamCode} @ ${em.homeTeamCode}`,
    shortName: `${em.awayTeamCode} @ ${em.homeTeamCode}`,
    homeTeam: { code: em.homeTeamCode, name: em.homeTeamCode, score: em.homeScore },
    awayTeam: { code: em.awayTeamCode, name: em.awayTeamCode, score: em.awayScore },
    status: em.effectiveStatus,
    clock: em.effectiveStatus === 'FINAL' ? 'FINAL' : '0:00',
    period: em.effectiveStatus === 'FINAL' ? 4 : 1,
  }));

  const userRefs: UserStandingRef[] = simMembers.map((m: any, idx: number) => ({
    id: String(m.userId || m.id || `sim-user-${idx + 1}`).trim(),
    name: String(m.userName || m.name || `Sim Member ${idx + 1}`),
    email: `${String(m.userName || m.name || `member${idx + 1}`)}@simulation.local`,
  }));

  const userPicks: UserPickItem[] = [];
  for (const m of simMembers) {
    const uid = String(m.userId || m.id).trim();
    if (Array.isArray(m.picks)) {
      for (const p of m.picks) {
        userPicks.push({
          userId: uid,
          gameId: String(p.gameId).trim(),
          selectedTeam: String(p.selectedTeam).trim().toUpperCase(),
          isSubmitted: true,
        });
      }
    }
  }

  const userPredictions: Record<string, number> = {};
  for (const m of simMembers) {
    const uid = String(m.userId || m.id).trim();
    if (m.tb != null || m.tiebreakerPrediction != null) {
      userPredictions[uid] = Number(m.tb ?? m.tiebreakerPrediction);
    }
  }

  // Supply actual tiebreaker total ONLY when designated synthetic game is effectively FINAL
  const tbMatch = effectiveMatches[0];
  const actualTotal =
    tbMatch &&
    tbMatch.effectiveStatus === 'FINAL' &&
    tbMatch.rawMatch.homeScore != null &&
    tbMatch.rawMatch.awayScore != null
      ? Number(tbMatch.rawMatch.homeScore) + Number(tbMatch.rawMatch.awayScore)
      : null;

  const tiebreakerData: TiebreakerData = {
    actualTotalScore: actualTotal ?? undefined,
    userPredictions,
  };

  const standingsResult = calculateProvisionalStandings(userRefs, slateGames, liveScores, userPicks, tiebreakerData);
  const allSimFinal = effectiveMatches.every((em) => em.effectiveStatus === 'FINAL');

  return {
    standings: standingsResult.standings || (Array.isArray(standingsResult) ? standingsResult : []),
    slateGames,
    liveScores,
    allSimFinal,
    actualTotal,
  };
}

export const OwnerAdminApp: React.FC = () => {
  const { user, session, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'rules' | 'simulation'>('overview');
  const [poolId, setPoolId] = useState<string>(DEFAULT_POOL_ID);

  // Explicit scope selection (Season and Week)
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [selectedWeek, setSelectedWeek] = useState<number>(8);

  // Auth form state for owner login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Overview state
  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Name edit form
  const [newName, setNewName] = useState('');
  const [nameReason, setNameReason] = useState('');
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameStatus, setNameStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Flags edit form
  const [flagRadar, setFlagRadar] = useState(false);
  const [flagLounge, setFlagLounge] = useState(false);
  const [flagsReason, setFlagsReason] = useState('');
  const [flagsSubmitting, setFlagsSubmitting] = useState(false);
  const [flagsStatus, setFlagsStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Games state
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  // Rules state
  const [rulesData, setRulesData] = useState<any>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [overrideTargetId, setOverrideTargetId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Future Slate form
  const [slateSeason, setSlateSeason] = useState(2026);
  const [slateWeek, setSlateWeek] = useState(9);
  const [slateEventIds, setSlateEventIds] = useState('');
  const [slateReason, setSlateReason] = useState('');
  const [slateSubmitting, setSlateSubmitting] = useState(false);
  const [slateStatus, setSlateStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Simulation state (deep-cloned on mount so default constants are never mutated)
  const [simMatches, setSimMatches] = useState<any[]>(() => cloneDefaultSimMatches());
  const [simMembers, setSimMembers] = useState<any[]>(() => cloneDefaultSimMembers());
  const [simulatedClock, setSimulatedClock] = useState<string>(DEFAULT_SIM_CLOCK);
  const [finishPrompt, setFinishPrompt] = useState<string | null>(null);

  // Fetch overview
  const fetchOverview = useCallback(async () => {
    if (!session?.access_token) return;
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await scopedExpressFetch(`/api/pools/${poolId}/owner/overview`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setOverview(data);
      setNewName(data.name || '');
      setFlagRadar(Boolean(data.presentationFlags?.f_sweat_radar));
      setFlagLounge(Boolean(data.presentationFlags?.f_league_press_box));
    } catch (err: any) {
      setOverviewError(err.message);
    } finally {
      setOverviewLoading(false);
    }
  }, [poolId, session?.access_token]);

  // Fetch games for explicit selected season and week scope
  const fetchGames = useCallback(async () => {
    if (!session?.access_token) return;
    setGamesLoading(true);
    try {
      const res = await scopedExpressFetch(`/api/pools/${poolId}/owner/games?season=${selectedSeason}&week=${selectedWeek}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGamesList(data.games || []);
      }
    } catch (err) {
      console.warn('Failed to load games:', err);
    } finally {
      setGamesLoading(false);
    }
  }, [poolId, session?.access_token, selectedSeason, selectedWeek]);

  // Fetch rules for explicit selected season and week scope
  const fetchRules = useCallback(async () => {
    if (!session?.access_token) return;
    setRulesLoading(true);
    try {
      const res = await scopedExpressFetch(`/api/pools/${poolId}/owner/rules?season=${selectedSeason}&week=${selectedWeek}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRulesData(data);
      }
    } catch (err) {
      console.warn('Failed to load rules:', err);
    } finally {
      setRulesLoading(false);
    }
  }, [poolId, session?.access_token, selectedSeason, selectedWeek]);

  useEffect(() => {
    if (session?.access_token) {
      fetchOverview();
      fetchGames();
      fetchRules();
    }
  }, [session?.access_token, fetchOverview, fetchGames, fetchRules]);

  // Handle owner login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Login failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle pool details patch
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSubmitting(true);
    setNameStatus(null);
    try {
      const res = await scopedExpressFetch(`/api/pools/${poolId}/owner/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: newName,
          reason: nameReason,
          expectedRevision: overview?.currentRevision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update name.');
      setNameStatus({ success: true, message: `Pool name successfully updated to '${data.name}'. Revision: ${data.revision.slice(0, 10)}...` });
      setNameReason('');
      fetchOverview();
    } catch (err: any) {
      setNameStatus({ success: false, message: err.message });
    } finally {
      setNameSubmitting(false);
    }
  };

  // Handle flags patch
  const handleUpdateFlags = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlagsSubmitting(true);
    setFlagsStatus(null);
    try {
      const res = await scopedExpressFetch(`/api/pools/${poolId}/owner/flags`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          flags: {
            f_sweat_radar: flagRadar,
            f_league_press_box: flagLounge,
          },
          reason: flagsReason,
          expectedRevision: overview?.currentRevision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update presentation flags.');
      setFlagsStatus({
        success: true,
        message: `Presentation flags saved: Radar=${data.flags.f_sweat_radar}, PressBox=${data.flags.f_league_press_box}. Revision: ${data.revision.slice(0, 10)}...`,
      });
      setFlagsReason('');
      fetchOverview();
      window.dispatchEvent(new CustomEvent('presentation-flags-changed', { detail: data.flags }));
    } catch (err: any) {
      setFlagsStatus({ success: false, message: err.message });
    } finally {
      setFlagsSubmitting(false);
    }
  };

  // Handle tiebreaker override
  const handleTiebreakerOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideSubmitting(true);
    setOverrideStatus(null);
    try {
      const res = await scopedExpressFetch(`/api/pools/${poolId}/owner/tiebreaker-designation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          season: selectedSeason,
          seasonType: 2,
          weekNumber: selectedWeek,
          targetGameId: overrideTargetId,
          reason: overrideReason,
          expectedRevision: overview?.currentRevision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to override tiebreaker.');
      setOverrideStatus({ success: true, message: `Tiebreaker game updated to '${data.designation?.eventId}'. Revision: ${data.revision.slice(0, 10)}...` });
      setOverrideReason('');
      setOverrideTargetId('');
      fetchRules();
      fetchOverview();
    } catch (err: any) {
      setOverrideStatus({ success: false, message: err.message });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // Handle future slate submission
  const handleUpdateSlate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlateSubmitting(true);
    setSlateStatus(null);
    try {
      const eventIdsArr = slateEventIds.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await scopedExpressFetch(`/api/pools/${poolId}/owner/slate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          season: slateSeason,
          seasonType: 2,
          weekNumber: slateWeek,
          eventIds: eventIdsArr,
          reason: slateReason,
          expectedRevision: overview?.currentRevision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pool slate.');
      setSlateStatus({
        success: true,
        message: `Custom pool slate for Season ${slateSeason} Week ${slateWeek} updated (${eventIdsArr.length} games). Revision: ${data.revision?.slice(0, 10)}...`,
      });
      setSlateReason('');
      fetchOverview();
    } catch (err: any) {
      setSlateStatus({ success: false, message: err.message });
    } finally {
      setSlateSubmitting(false);
    }
  };

  // Simulation handlers (pure in-memory, zero persistence or transport writes)
  const handleFinishWeek = () => {
    const missing = simMatches.find(
      (m) => m.homeScore === null || m.homeScore === undefined || isNaN(Number(m.homeScore)) ||
             m.awayScore === null || m.awayScore === undefined || isNaN(Number(m.awayScore))
    );
    if (missing) {
      setFinishPrompt(`⚠️ Missing score for matchup ${missing.awayTeam} @ ${missing.homeTeam}. Please provide both home and away scores before marking the week FINAL.`);
      return;
    }
    setFinishPrompt(null);
    setSimMatches(simMatches.map((m) => ({ ...m, status: 'FINAL' })));
  };

  const handleResetSimulation = () => {
    setSimMatches(cloneDefaultSimMatches());
    setSimMembers(cloneDefaultSimMembers());
    setSimulatedClock(DEFAULT_SIM_CLOCK);
    setFinishPrompt(null);
  };

  const handleAddMatch = () => {
    if (simMatches.length >= 32) return;
    const newId = generateNextMatchId(simMatches);
    const newMatch = {
      id: newId,
      homeTeam: 'KC',
      awayTeam: 'LV',
      homeScore: 0,
      awayScore: 0,
      status: 'SCHEDULED',
      spread: 0,
      kickoffTime: '2026-11-01T20:25:00.000Z',
    };
    setSimMatches((prev) => [...prev, newMatch]);
  };

  const handleRemoveMatch = (matchId: string) => {
    if (simMatches.length <= 1) return;
    setSimMatches((prev) => prev.filter((m) => m.id !== matchId));
    setSimMembers((prev) =>
      prev.map((mem) => ({
        ...mem,
        picks: (mem.picks || []).filter((p: any) => p.gameId !== matchId),
      }))
    );
  };

  const handleAddMember = () => {
    if (simMembers.length >= 10) return;
    const newId = generateNextMemberId(simMembers);
    const defaultPicks = simMatches.map((m) => ({ gameId: m.id, selectedTeam: m.homeTeam }));
    setSimMembers((prev) => [
      ...prev,
      { id: newId, name: `Member ${newId}`, picks: defaultPicks, tb: 45 },
    ]);
  };

  const handleRemoveMember = (memberId: string) => {
    if (simMembers.length <= 1) return;
    setSimMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleUpdateMatchTeam = (matchId: string, side: 'home' | 'away', newTeam: string) => {
    const { updatedMatches, updatedMembers } = updateMatchTeamWithPickSync(
      simMatches,
      simMembers,
      matchId,
      side,
      newTeam
    );
    setSimMatches(updatedMatches);
    setSimMembers(updatedMembers);
  };

  const handleUpdateMatchStatus = (matchId: string, newStatus: string) => {
    setSimMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m))
    );
  };

  const handleUpdateMatchScore = (matchId: string, side: 'home' | 'away', scoreVal: string) => {
    const val = scoreVal === '' ? null : Number(scoreVal);
    setSimMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, [side === 'home' ? 'homeScore' : 'awayScore']: val } : m
      )
    );
  };

  const handleUpdatePick = (memberId: string, gameId: string, selectedTeam: string) => {
    setSimMembers(simMembers.map((mem) => {
      if (mem.id !== memberId) return mem;
      const existing = mem.picks.find((p: any) => p.gameId === gameId);
      const newPicks = existing
        ? mem.picks.map((p: any) => p.gameId === gameId ? { ...p, selectedTeam } : p)
        : [...mem.picks, { gameId, selectedTeam }];
      return { ...mem, picks: newPicks };
    }));
  };

  const handleUpdateTb = (memberId: string, tbValue: string) => {
    const val = tbValue === '' ? null : Number(tbValue);
    setSimMembers(simMembers.map((mem) => mem.id === memberId ? { ...mem, tb: val } : mem));
  };

  const handleUpdateMemberName = (memberId: string, name: string) => {
    setSimMembers(simMembers.map((mem) => mem.id === memberId ? { ...mem, name } : mem));
  };

  // Calculate pure in-memory simulation standings using shared pure engine
  const { standings: simStandings, allSimFinal } = computeSimulationStandings(
    simMatches,
    simMembers,
    simulatedClock
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-xs text-slate-400">
        AUTHENTICATING OWNER...
      </div>
    );
  }

  // Login Gate
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-lg font-black text-rose-400 uppercase tracking-widest">NFL Pick'Em Owner Admin</h1>
            <p className="text-xs text-slate-400 mt-1">Separate static administration console. Jack-only fail-closed access.</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Owner Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jack.w.cone@gmail.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded transition duration-150 disabled:opacity-50"
            >
              {authSubmitting ? 'Verifying Credentials...' : 'Sign In as Owner'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authorization Failure Gate (e.g. non-Jack or unconfigured)
  if (overviewError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-rose-900/60 rounded-lg p-6 shadow-2xl text-center">
          <div className="inline-flex p-3 bg-rose-950/80 rounded-full border border-rose-700 mb-4 text-rose-400 font-bold">
            🔒 OWNER ACCESS DENIED
          </div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Authorization Check Failed</h2>
          <p className="text-xs text-rose-400 font-mono mb-4">{overviewError}</p>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Under Architect Rulings HAG57-OWNER-2026-11-03-01 & -02, this administration console is strictly restricted
            to Jack's authoritative user ID with active pool commissioner rights. Generic accounts, ADMIN roles, or
            unconfigured server identities fail closed.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => fetchOverview()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 rounded"
            >
              Retry Access
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-xs font-mono text-white rounded"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-rose-900/40 border border-rose-700/60 px-2 py-0.5 rounded text-[10px] font-black text-rose-400 uppercase tracking-widest">
            OWNER ADMIN
          </div>
          <h1 className="text-sm font-bold tracking-wide text-slate-200">
            {overview?.name || 'Main League Pool'}
          </h1>
          <span className="text-[11px] font-mono text-slate-500">
            ({poolId.slice(0, 8)}...)
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
            {activeTab === 'simulation' ? '⚡ SIMULATION MODE' : '🔒 LIVE READ-ONLY'}
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            {user?.email}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs font-mono text-rose-400 hover:text-rose-300 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-slate-800 bg-slate-950 px-4 flex space-x-6 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-rose-500 text-rose-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          1. Overview & Details
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'games'
              ? 'border-rose-500 text-rose-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          2. Games & Slate
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'rules'
              ? 'border-rose-500 text-rose-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          3. Rules & Flags
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'simulation'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          4. Simulation Sandbox
        </button>
      </nav>

      {/* Scope Selector Bar (Season & Week) */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Active Scope:</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-mono text-slate-400">Season</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-mono text-slate-400">Week</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Viewing: <span className="text-slate-200 font-bold">Season {selectedSeason} Week {selectedWeek}</span>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* TAB 1: OVERVIEW & DETAILS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Pool Status</span>
                <p className="text-base font-bold text-emerald-400 mt-1">{overview?.status || 'ACTIVE'}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Active Members</span>
                <p className="text-base font-bold text-slate-200 mt-1">{overview?.memberCount ?? '...'}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Commissioner Status</span>
                <p className="text-base font-bold text-cyan-400 mt-1">{overview?.isCommissioner ? 'YES (Verified)' : 'NO'}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Revision Fingerprint</span>
                <p className="text-xs font-mono text-slate-300 truncate mt-1" title={overview?.currentRevision}>
                  {overview?.currentRevision?.slice(0, 16) || '...'}
                </p>
              </div>
            </div>

            {/* Live Pool Name Form */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Live Pool Details (PATCH /api/pools/:pool_id/owner/details)
              </h2>
              <p className="text-xs text-slate-400">
                Safe live update: Updates the display name of this pool without affecting picks, memberships, or scoring rules.
                Transactional row lock and revision check enforced.
              </p>

              {nameStatus && (
                <div
                  className={`p-3 rounded text-xs font-mono ${
                    nameStatus.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {nameStatus.message}
                </div>
              )}

              <form onSubmit={handleUpdateName} className="space-y-3 max-w-xl">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Pool Name (1–80 chars)</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={80}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Audit Reason (Non-empty, max 500 chars)</label>
                  <input
                    type="text"
                    value={nameReason}
                    onChange={(e) => setNameReason(e.target.value)}
                    placeholder="e.g. Updating official league display title for Week 9"
                    maxLength={500}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={nameSubmitting || !nameReason.trim() || !newName.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded disabled:opacity-50"
                >
                  {nameSubmitting ? 'Saving Name...' : 'Save Pool Name'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: GAMES & SLATE */}
        {activeTab === 'games' && (
          <div className="space-y-6">
            <div className="bg-amber-950/40 border border-amber-800/80 p-4 rounded text-xs text-amber-200 font-mono leading-relaxed">
              ⚠️ <strong>Live Score/Status Policy Notice (HAG57-OWNER-2026-11-03-02):</strong> Direct manual score and status
              editing is disabled on production games to protect locked data and global integrity. You can test custom scores,
              in-progress leads, and full final week states inside the <strong>Simulation Sandbox</strong> tab without touching live games.
            </div>

            {/* Authoritative Games List */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Authoritative Games & Statuses (Season {selectedSeason} Week {selectedWeek})
              </h2>
              {gamesLoading ? (
                <p className="text-xs font-mono text-slate-500">Loading authoritative games for Season {selectedSeason} Week {selectedWeek}...</p>
              ) : gamesList.length === 0 ? (
                <p className="text-xs font-mono text-slate-500">No games resolved for Season {selectedSeason} Week {selectedWeek}.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gamesList.map((g) => (
                    <div key={g.id} className="bg-slate-950 border border-slate-800 p-3 rounded text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">
                          {g.awayTeamId} @ {g.homeTeamId}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          g.status === 'FINAL' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {g.status}
                        </span>
                      </div>
                      <p className="text-slate-400 font-mono">
                        Score: {g.awayScore ?? '-'} – {g.homeScore ?? '-'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        ID: {g.externalGameId || g.id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Future Slate Editor */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Future Pool Slate Editor (PUT /api/pools/:pool_id/owner/slate)
              </h2>

              {slateStatus && (
                <div
                  className={`p-3 rounded text-xs font-mono ${
                    slateStatus.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {slateStatus.message}
                </div>
              )}

              <form onSubmit={handleUpdateSlate} className="space-y-3 max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Season</label>
                    <input
                      type="number"
                      value={slateSeason}
                      onChange={(e) => setSlateSeason(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Week Number (Future &gt; 8)</label>
                    <input
                      type="number"
                      value={slateWeek}
                      onChange={(e) => setSlateWeek(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Canonical Event IDs (Comma-separated, max 32)
                  </label>
                  <textarea
                    value={slateEventIds}
                    onChange={(e) => setSlateEventIds(e.target.value)}
                    placeholder="401873032, 401873033..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Audit Reason</label>
                  <input
                    type="text"
                    value={slateReason}
                    onChange={(e) => setSlateReason(e.target.value)}
                    placeholder="e.g. Setting Week 9 custom 10-game slate"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={slateSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded transition"
                >
                  {slateSubmitting ? 'Updating Slate...' : 'Update Pool Slate'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: RULES & FLAGS */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            {/* Presentation Flags Editor */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Presentation Flags (PATCH /api/pools/:pool_id/owner/flags)
              </h2>
              <p className="text-xs text-slate-400">
                Configure member-facing visibility for Radar and Press Box / Lounge presentation.
                Defaults to disabled/unavailable when unconfigured. Changes update member navigation and direct routes.
              </p>

              {flagsStatus && (
                <div
                  className={`p-3 rounded text-xs font-mono ${
                    flagsStatus.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {flagsStatus.message}
                </div>
              )}

              <form onSubmit={handleUpdateFlags} className="space-y-4 max-w-xl">
                <div className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flagRadar}
                      onChange={(e) => setFlagRadar(e.target.checked)}
                      className="w-4 h-4 text-rose-500 bg-slate-900 border-slate-700 rounded focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200">Show Sweat Radar Presentation (f_sweat_radar)</span>
                      <p className="text-[11px] text-slate-400">Controls Radar tab in navigation and direct /radar route access.</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flagLounge}
                      onChange={(e) => setFlagLounge(e.target.checked)}
                      className="w-4 h-4 text-rose-500 bg-slate-900 border-slate-700 rounded focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200">Show League Press Box / Lounge (f_league_press_box)</span>
                      <p className="text-[11px] text-slate-400">Controls live chat lounge drawer mounting and trigger buttons.</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Audit Reason (Required)</label>
                  <input
                    type="text"
                    value={flagsReason}
                    onChange={(e) => setFlagsReason(e.target.value)}
                    placeholder="e.g. Enabling Radar and Lounge presentation for gameday"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={flagsSubmitting || !flagsReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded disabled:opacity-50"
                >
                  {flagsSubmitting ? 'Saving Flags...' : 'Save Both Flags Together'}
                </button>
              </form>
            </div>

            {/* Designated Tiebreaker Rule */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Tiebreaker Game Designation (POST /api/pools/:pool_id/owner/tiebreaker-designation)
              </h2>
              <p className="text-xs text-slate-400">
                Current designated tiebreaker: <strong className="text-slate-200">{rulesData?.tiebreakerStatus?.eventId || 'None'}</strong>
                {' · '}
                Freeze Status: <span className="font-mono text-amber-400">{rulesData?.tiebreakerStatus?.isFrozen ? 'FROZEN (Predictions received or locked)' : 'UNFROZEN'}</span>
              </p>

              {overrideStatus && (
                <div
                  className={`p-3 rounded text-xs font-mono ${
                    overrideStatus.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {overrideStatus.message}
                </div>
              )}

              <form onSubmit={handleTiebreakerOverride} className="space-y-3 max-w-xl">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Target Game ID / Event ID</label>
                  <input
                    type="text"
                    value={overrideTargetId}
                    onChange={(e) => setOverrideTargetId(e.target.value)}
                    placeholder="e.g. 401873030"
                    disabled={rulesData?.tiebreakerStatus?.isFrozen}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Audit Reason</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Overriding designated tiebreaker before kickoff"
                    disabled={rulesData?.tiebreakerStatus?.isFrozen}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={overrideSubmitting || rulesData?.tiebreakerStatus?.isFrozen || !overrideReason.trim() || !overrideTargetId.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded disabled:opacity-50"
                >
                  {rulesData?.tiebreakerStatus?.isFrozen ? 'Designation Locked' : 'Override Designated Game'}
                </button>
              </form>
            </div>

            {/* Binding Shot Tiers (Read-Only) */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-3">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Binding League Shot Tiers & Rules (Immutable)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="font-bold text-emerald-400">SAFE HAVEN (1st)</span>
                  <p className="font-mono text-slate-300 mt-1">0 Shots</p>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="font-bold text-cyan-400">MIDDLE PACK (2nd–6th)</span>
                  <p className="font-mono text-slate-300 mt-1">1 Shot</p>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="font-bold text-rose-400">THE DROP (7th–9th)</span>
                  <p className="font-mono text-slate-300 mt-1">2 Shots</p>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="font-bold text-purple-400">THE PIT (Last / 10th)</span>
                  <p className="font-mono text-slate-300 mt-1">2.5 Shots</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SIMULATION SANDBOX */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <div className="bg-amber-950/40 border border-amber-800/80 p-4 rounded text-xs text-amber-200 font-mono leading-relaxed">
              ⚡ <strong>Actual Product Simulation Engine:</strong> Test weekly standings, penalty consequences,
              equal-distance tiebreaks, and The Drop boundary using real production scoring logic.
              This sandbox is pure in-memory: zero database writes, zero live game mutation, zero network transport calls.
            </div>

            {/* Top Toolbar: Finish Week, Reset, and Simulated Clock */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleFinishWeek}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold rounded transition"
                >
                  Finish Week (Set Final)
                </button>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs rounded transition"
                >
                  Reset Local Simulation State
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                {(() => {
                  const lockSummary = evaluateSlateLockSummary(simMatches, [], 0, new Date(simulatedClock));
                  return (
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-slate-950 text-cyan-300 border border-slate-700">
                      {lockSummary.phaseLabel} ({lockSummary.lockedCount}/{simMatches.length} locked)
                    </span>
                  );
                })()}
                <div className="flex items-center space-x-2">
                  <label className="text-slate-400">Simulated Clock:</label>
                  <input
                    type="text"
                    value={simulatedClock}
                    onChange={(e) => setSimulatedClock(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs w-56"
                    placeholder="YYYY-MM-DDTHH:MM:SSZ"
                  />
                </div>
              </div>
            </div>

            {finishPrompt && (
              <div className="p-3 bg-amber-950/80 border border-amber-800 text-amber-200 text-xs font-mono rounded">
                {finishPrompt}
              </div>
            )}

            {/* Match Controls */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Simulated Matchups & Chosen Scores ({simMatches.length})
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Match #1 acts as the designated tiebreaker match (⚡ TB). Editable teams, spreads, scores, and status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMatch}
                  disabled={simMatches.length >= 32}
                  className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs rounded disabled:opacity-50"
                >
                  + Add Match
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {simMatches.map((m, idx) => {
                  const isLocked = isKickoffLocked(m.kickoffTime || '2026-11-01T17:00:00.000Z', new Date(simulatedClock));
                  return (
                    <div key={m.id} className="bg-slate-950 border border-slate-800 p-3 rounded space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-500 font-bold">
                          {m.id} {idx === 0 && <span className="text-amber-400 font-black">⚡(TB)</span>}
                        </span>
                        <div className="flex items-center space-x-1">
                          <select
                            value={m.status}
                            onChange={(e) => handleUpdateMatchStatus(m.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded text-[10px] px-1.5 py-0.5 text-slate-200 font-mono"
                          >
                            <option value="FINAL">FINAL</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="SCHEDULED">SCHEDULED</option>
                          </select>
                          {simMatches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMatch(m.id)}
                              className="text-rose-400 hover:text-rose-300 text-[10px] px-1 font-bold font-mono"
                              title="Remove Match"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Away Team</label>
                          <select
                            value={m.awayTeam}
                            onChange={(e) => handleUpdateMatchTeam(m.id, 'away', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-200 text-xs"
                          >
                            {NFL_TEAMS.map((t) => (
                              <option key={t} value={t} disabled={t === m.homeTeam}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Home Team</label>
                          <select
                            value={m.homeTeam}
                            onChange={(e) => handleUpdateMatchTeam(m.id, 'home', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-200 text-xs"
                          >
                            {NFL_TEAMS.map((t) => (
                              <option key={t} value={t} disabled={t === m.awayTeam}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-xs pt-1">
                        <div className="flex-1">
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Away Score</label>
                          <input
                            type="number"
                            value={m.awayScore ?? ''}
                            onChange={(e) => handleUpdateMatchScore(m.id, 'away', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-slate-100"
                          />
                        </div>
                        <span className="text-slate-500 pt-3">–</span>
                        <div className="flex-1">
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Home Score</label>
                          <input
                            type="number"
                            value={m.homeScore ?? ''}
                            onChange={(e) => handleUpdateMatchScore(m.id, 'home', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                        <span>Kickoff: {m.kickoffTime ? new Date(m.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '17:00'}</span>
                        <span className={isLocked ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                          {isLocked ? '🔒 Kickoff Passed' : '🟢 Pregame (Open)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Member Picks & Predictions Controls */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Synthetic Members, Picks & Predictions ({simMembers.length}/10)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Click a team button to change a member's pick. Edit tiebreaker total prediction (TB).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={simMembers.length >= 10}
                  className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs rounded disabled:opacity-50"
                >
                  + Add Member
                </button>
              </div>

              <div className="space-y-2">
                {simMembers.map((mem) => (
                  <div key={mem.id} className="bg-slate-950 border border-slate-800 p-3 rounded text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={mem.name}
                          onChange={(e) => handleUpdateMemberName(mem.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-bold text-slate-100 text-xs w-36"
                        />
                        <span className="text-[10px] font-mono text-slate-500">ID: {mem.id}</span>
                      </div>

                      <div className="flex items-center space-x-2 font-mono">
                        <label className="text-[10px] text-slate-400">TB Prediction:</label>
                        <input
                          type="number"
                          value={mem.tb ?? ''}
                          placeholder="None"
                          onChange={(e) => handleUpdateTb(mem.id, e.target.value)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-100 font-mono text-xs"
                        />
                        {simMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(mem.id)}
                            className="text-rose-400 hover:text-rose-300 text-xs font-mono ml-2"
                            title="Remove Member"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Member's Picks Across All Matches */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-900">
                      {simMatches.map((m) => {
                        const curPick = mem.picks?.find((p: any) => p.gameId === m.id);
                        return (
                          <div key={m.id} className="flex items-center bg-slate-900/80 border border-slate-800 rounded p-1 text-[11px] font-mono">
                            <span className="text-slate-500 mr-1.5 text-[10px]">{m.id}:</span>
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => handleUpdatePick(mem.id, m.id, m.awayTeam)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  curPick?.selectedTeam === m.awayTeam
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                {m.awayTeam}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdatePick(mem.id, m.id, m.homeTeam)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  curPick?.selectedTeam === m.homeTeam
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                {m.homeTeam}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standings Output */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  {getRadarSectionHeader(allSimFinal)}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                  allSimFinal
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {getRadarStatusPill(allSimFinal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Rank</th>
                      <th className="py-2 px-3">Member</th>
                      <th className="py-2 px-3 text-center">Pts</th>
                      <th className="py-2 px-3 text-center">TB Distance</th>
                      <th className="py-2 px-3">Tier</th>
                      <th className="py-2 px-3 text-right">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simStandings.map((p: any, idx: number) => {
                      const prevMember = idx > 0 ? simStandings[idx - 1] : null;
                      const isTiedWithPrev = prevMember && p.provisionalRank === prevMember.provisionalRank;
                      const showDropDivider = Boolean(
                        prevMember &&
                        !isTiedWithPrev &&
                        prevMember.projectedPenalty === 1 &&
                        p.tier === 'THE_DROP' &&
                        p.projectedPenalty === 2
                      );

                      return (
                        <React.Fragment key={p.userId}>
                          {showDropDivider && (
                            <tr className="bg-rose-950/30">
                              <td colSpan={6} className="py-1 text-center font-black text-[9px] text-rose-400 border-y border-dashed border-rose-500/40">
                                ▼ THE DROP (1 SHOT → 2 SHOTS STEP) ▼
                              </td>
                            </tr>
                          )}
                          <tr className="border-b border-slate-800/60 hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-bold text-slate-300">
                              #{p.provisionalRank}
                            </td>
                            <td className="py-2 px-3 text-slate-100 font-semibold">
                              {p.userName}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-cyan-300">
                              {p.totalProvisionalPoints}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-400">
                              {p.tiebreakerDistance != null ? Math.abs(p.tiebreakerDistance) : '-'}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                p.tier === 'SAFE_HAVEN' ? 'bg-emerald-950 text-emerald-300' :
                                p.tier === 'MIDDLE_PACK' ? 'bg-cyan-950 text-cyan-300' :
                                p.tier === 'THE_DROP' ? 'bg-rose-950 text-rose-300' : 'bg-purple-950 text-purple-300'
                              }`}>
                                {p.tier}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-black text-rose-400">
                              {p.projectedPenalty} SHOT{p.projectedPenalty !== 1 ? 'S' : ''}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerAdminApp;
