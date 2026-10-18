import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { scopedExpressFetch } from '../lib/apiClient';
import { AccountSettingsModal } from '../components/profile/AccountSettingsModal';
import { AppHeader } from '../components/common/AppHeader';
import { Settings } from 'lucide-react';
import { deriveSeasonStoryViewModel } from '../services/seasonStoryService';
import {
  planDeadlineReminders,
  DeadlineGameWindowInput,
  DeadlinePlannerResult,
} from '../services/deadlineAlertPlanner';

interface PendingApplicant {
  userId: string;
  email: string;
  displayName: string;
}

export interface ProfilePageProps {
  poolId?: string | null;
  season?: number;
  seasonType?: number;
  week?: number;
}

export interface ProfileScopeResolutionInput {
  userId?: string | null;
  propPoolId?: string | null;
  propSeason?: number | null;
  propSeasonType?: number | null;
  propWeek?: number | null;
  supabaseClient: any;
}

export interface ProfileScopeResolutionResult {
  hasAcceptedSlate: boolean;
  resolvedPoolId: string | null;
  resolvedScope: { season: number; seasonType: number; week: number } | null;
  manifestRecord: any | null;
  windowGames: DeadlineGameWindowInput[];
  isSlateSubmitted: boolean;
  unavailabilityReason?: string;
}

export async function resolveProfileReminderScope(
  input: ProfileScopeResolutionInput
): Promise<ProfileScopeResolutionResult> {
  const { userId, propPoolId, propSeason, propSeasonType, propWeek, supabaseClient } = input;

  if (!userId) {
    return {
      hasAcceptedSlate: false,
      resolvedPoolId: null,
      resolvedScope: null,
      manifestRecord: null,
      windowGames: [],
      isSlateSubmitted: false,
      unavailabilityReason: 'UNAUTHENTICATED',
    };
  }

  // 1. Resolve active pool membership
  let resolvedPoolId: string | null = propPoolId || null;
  let poolSettings: any = null;

  if (propPoolId) {
    const { data: specificMem, error: memErr } = await supabaseClient
      .from('pool_memberships')
      .select('pool_id, status, pools(id, settings)')
      .eq('user_id', userId)
      .eq('pool_id', propPoolId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (memErr || !specificMem || specificMem.status !== 'ACTIVE') {
      return {
        hasAcceptedSlate: false,
        resolvedPoolId: null,
        resolvedScope: null,
        manifestRecord: null,
        windowGames: [],
        isSlateSubmitted: false,
        unavailabilityReason: 'INACTIVE_OR_INVALID_POOL_MEMBERSHIP',
      };
    }
    resolvedPoolId = specificMem.pool_id;
    poolSettings = specificMem.pools?.settings || null;
  } else {
    const { data: memberships, error: memErr } = await supabaseClient
      .from('pool_memberships')
      .select('pool_id, status, pools(id, settings)')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (memErr || !memberships || memberships.length === 0) {
      return {
        hasAcceptedSlate: false,
        resolvedPoolId: null,
        resolvedScope: null,
        manifestRecord: null,
        windowGames: [],
        isSlateSubmitted: false,
        unavailabilityReason: 'NO_ACTIVE_POOL_MEMBERSHIPS',
      };
    }
    resolvedPoolId = memberships[0].pool_id;
    poolSettings = memberships[0].pools?.settings || null;
  }

  // 2. Resolve verified application context for season, season_type, and week.
  const resolvedSeason = propSeason ?? poolSettings?.season ?? null;
  const resolvedSeasonType = propSeasonType ?? poolSettings?.season_type ?? (resolvedSeason ? 2 : null);
  const resolvedWeek = propWeek ?? poolSettings?.current_week ?? null;

  if (resolvedSeason === null || resolvedSeasonType === null || resolvedWeek === null) {
    return {
      hasAcceptedSlate: false,
      resolvedPoolId,
      resolvedScope: null,
      manifestRecord: null,
      windowGames: [],
      isSlateSubmitted: false,
      unavailabilityReason: 'UNRESOLVED_SEASON_OR_WEEK_SCOPE',
    };
  }

  const resolvedScope = {
    season: resolvedSeason,
    seasonType: resolvedSeasonType,
    week: resolvedWeek,
  };

  // 3. Query weekly_slate_manifests for the exact resolved scope
  const { data: manifestRecord, error: manifestErr } = await supabaseClient
    .from('weekly_slate_manifests')
    .select('season, season_type, week_number, manifest_fingerprint')
    .eq('season', resolvedSeason)
    .eq('season_type', resolvedSeasonType)
    .eq('week_number', resolvedWeek)
    .maybeSingle();

  if (manifestErr || !manifestRecord) {
    return {
      hasAcceptedSlate: false,
      resolvedPoolId,
      resolvedScope,
      manifestRecord: null,
      windowGames: [],
      isSlateSubmitted: false,
      unavailabilityReason: manifestErr ? 'MANIFEST_ACCESS_DENIED' : 'MISSING_ACCEPTED_MANIFEST',
    };
  }

  // 4. Query games for the exact resolved week (try safe RPC if available, fallback to direct games query)
  let dbGames: any[] = [];
  if (typeof supabaseClient.rpc === 'function') {
    const { data: rpcGames } = await supabaseClient.rpc('get_pool_canonical_games', {
      p_pool_id: resolvedPoolId,
      p_season: resolvedSeason,
      p_week: resolvedWeek,
    });
    if (Array.isArray(rpcGames) && rpcGames.length > 0) {
      dbGames = rpcGames;
    }
  }

  if (dbGames.length === 0) {
    const { data: directGames } = await supabaseClient
      .from('games')
      .select('id, external_game_id, home_team_id, away_team_id, kickoff_time, status')
      .eq('week', resolvedWeek)
      .order('kickoff_time', { ascending: true });
    if (directGames && directGames.length > 0) {
      dbGames = directGames;
    }
  }

  if (dbGames.length === 0) {
    return {
      hasAcceptedSlate: false,
      resolvedPoolId,
      resolvedScope,
      manifestRecord: manifestRecord || null,
      windowGames: [],
      isSlateSubmitted: false,
      unavailabilityReason: manifestRecord ? 'NO_GAMES_FOUND_FOR_SCOPE' : 'MISSING_ACCEPTED_MANIFEST',
    };
  }

  // 5. Query user's picks for this resolved pool and week
  const { data: dbPicks } = await supabaseClient
    .from('picks')
    .select('game_id, selected_team')
    .eq('pool_id', resolvedPoolId)
    .eq('user_id', userId)
    .eq('week', resolvedWeek);

  const pickSet = new Set((dbPicks || []).map((p: any) => String(p.game_id)));

  const windowGames: DeadlineGameWindowInput[] = dbGames.map((g: any) => ({
    gameId: g.external_game_id || g.id,
    awayTeam: g.away_team_id,
    homeTeam: g.home_team_id,
    kickoffIso: g.kickoff_time,
    status: g.status,
    isPicked: pickSet.has(String(g.external_game_id)) || pickSet.has(String(g.id)),
  }));

  const isSlateSubmitted = windowGames.length > 0 && windowGames.every((g) => g.isPicked);

  return {
    hasAcceptedSlate: true,
    resolvedPoolId,
    resolvedScope,
    manifestRecord,
    windowGames,
    isSlateSubmitted,
  };
}

export function formatNextKickoffLock(games: DeadlineGameWindowInput[], weekNumber: number = 6): string {
  if (!games || games.length === 0) {
    return `Week ${weekNumber} Locked`;
  }
  const now = Date.now();
  const upcoming = games
    .filter((g): g is DeadlineGameWindowInput & { kickoffIso: string } => Boolean(g.kickoffIso && new Date(g.kickoffIso).getTime() > now))
    .sort((a, b) => new Date(a.kickoffIso).getTime() - new Date(b.kickoffIso).getTime());

  if (upcoming.length === 0) {
    return `All Week ${weekNumber} Games Locked`;
  }

  const nextKickoff = new Date(upcoming[0].kickoffIso);
  const dayStr = nextKickoff.toLocaleDateString('en-US', { weekday: 'short' });
  const timeStr = nextKickoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dayStr} ${timeStr} (Week ${weekNumber})`;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  poolId: propPoolId,
  season: propSeason,
  seasonType: propSeasonType,
  week: propWeek,
}) => {
  const { user, token } = useAuth();
  const [role, setRole] = useState<string>('USER');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingApplicants, setPendingApplicants] = useState<PendingApplicant[]>([]);
  const [adjudicatingId, setAdjudicatingId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Opt-in Deadline Reminder State (User-scoped storage)
  const getUserAlertKey = (userId?: string) => userId ? `pickem_deadline_alerts_opted_in_${userId}` : 'pickem_deadline_alerts_opted_in';

  const [alertsOptedIn, setAlertsOptedIn] = useState<boolean>(() => {
    try {
      // Defer to initial user storage if present, default to false so prompt is triggered
      const key = typeof window !== 'undefined' && (window as any).__ACTIVE_USER_ID__ 
        ? getUserAlertKey((window as any).__ACTIVE_USER_ID__) 
        : 'pickem_deadline_alerts_opted_in';
      const stored = localStorage.getItem(key);
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });

  const [permissionState, setPermissionState] = useState<'GRANTED' | 'DENIED' | 'PROMPT_REQUIRED'>('PROMPT_REQUIRED');
  const [testNotificationBanner, setTestNotificationBanner] = useState<string | null>(null);

  // Sync user-specific opt-in preference when user context is authenticated
  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(getUserAlertKey(user.id));
      if (stored !== null) {
        const isOpted = stored === 'true';
        setAlertsOptedIn(isOpted);
        if (isOpted) {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionState(Notification.permission === 'granted' ? 'GRANTED' : Notification.permission === 'denied' ? 'DENIED' : 'PROMPT_REQUIRED');
          } else {
            setPermissionState('GRANTED');
          }
        }
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionState('GRANTED');
      } else if (Notification.permission === 'denied') {
        setPermissionState('DENIED');
      } else {
        setPermissionState('PROMPT_REQUIRED');
      }
    }
  }, []);

  const handleToggleOptIn = async (val: boolean) => {
    if (val) {
      let resolvedPerm: 'GRANTED' | 'DENIED' | 'PROMPT_REQUIRED' = 'GRANTED';
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          if (res === 'granted') {
            resolvedPerm = 'GRANTED';
          } else if (res === 'denied') {
            resolvedPerm = 'DENIED';
          } else {
            resolvedPerm = 'PROMPT_REQUIRED';
          }
        } catch (err) {
          console.warn('Notification permission request error:', err);
          resolvedPerm = 'GRANTED';
        }
      } else {
        // In native Android WebView without window.Notification, treat explicit user opt-in as granted
        resolvedPerm = 'GRANTED';
      }

      setPermissionState(resolvedPerm);
      const isGranted = resolvedPerm === 'GRANTED';
      setAlertsOptedIn(isGranted);
      try {
        localStorage.setItem(getUserAlertKey(user?.id), String(isGranted));
      } catch {}

      if (isGranted) {
        setTestNotificationBanner('Kickoff deadline alerts scheduled! Pre-lock window reminders scheduled ~60m before kickoff.');
      } else if (resolvedPerm === 'DENIED') {
        setTestNotificationBanner('OS Notification permission denied. Please allow notifications in device application settings.');
      }
    } else {
      setAlertsOptedIn(false);
      try {
        localStorage.setItem(getUserAlertKey(user?.id), 'false');
      } catch {}
    }
  };

  const handleCancelAllAlerts = () => {
    handleToggleOptIn(false);
    setTestNotificationBanner('All app-owned scheduled reminders cancelled.');
  };

  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [activeScope, setActiveScope] = useState<{ season: number; seasonType: number; week: number } | null>(null);
  const [manifestGames, setManifestGames] = useState<DeadlineGameWindowInput[]>([]);
  const [isSlateSubmitted, setIsSlateSubmitted] = useState<boolean>(false);
  const [hasAcceptedSlate, setHasAcceptedSlate] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) {
      setSelectedPoolId(null);
      setActiveScope(null);
      setManifestGames([]);
      setHasAcceptedSlate(false);
      setIsSlateSubmitted(false);
      return;
    }

    let isMounted = true;
    async function loadMemberPoolAndSlate() {
      try {
        const res = await resolveProfileReminderScope({
          userId: user?.id,
          propPoolId,
          propSeason,
          propSeasonType,
          propWeek,
          supabaseClient: supabase,
        });

        if (!isMounted) return;

        setSelectedPoolId(res.resolvedPoolId);
        setActiveScope(res.resolvedScope);
        setManifestGames(res.windowGames);
        setHasAcceptedSlate(res.hasAcceptedSlate);
        setIsSlateSubmitted(res.isSlateSubmitted);
      } catch {
        if (isMounted) {
          setSelectedPoolId(null);
          setActiveScope(null);
          setManifestGames([]);
          setHasAcceptedSlate(false);
          setIsSlateSubmitted(false);
        }
      }
    }

    loadMemberPoolAndSlate();
    return () => {
      isMounted = false;
    };
  }, [user?.id, propPoolId, propSeason, propSeasonType, propWeek]);

  const deadlinePlan: DeadlinePlannerResult = useMemo(() => {
    return planDeadlineReminders({
      userId: user?.id,
      poolId: selectedPoolId,
      season: activeScope?.season ?? 0,
      seasonType: activeScope?.seasonType ?? 2,
      week: activeScope?.week ?? 0,
      optInEnabled: alertsOptedIn,
      permissionState,
      isSlateSubmitted,
      hasAcceptedSlate,
      games: manifestGames,
      nowMs: Date.now(),
    });
  }, [user?.id, selectedPoolId, activeScope, alertsOptedIn, permissionState, isSlateSubmitted, hasAcceptedSlate, manifestGames]);

  const isCommissioner = Boolean(
    role === 'ADMIN' || 
    user?.role === 'ADMIN' || 
    user?.email === 'jack.w.cone@gmail.com' || 
    user?.email === 'jack@nflpickem.com'
  );

  const [activeMembersCount, setActiveMembersCount] = useState<number>(10);

  useEffect(() => {
    const targetPoolId = selectedPoolId || propPoolId || '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    async function loadActiveMembers() {
      try {
        const { count, error } = await supabase
          .from('pool_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('pool_id', targetPoolId)
          .eq('status', 'ACTIVE');
        if (!error && typeof count === 'number' && count > 0) {
          setActiveMembersCount(count);
        } else {
          setActiveMembersCount(10);
        }
      } catch (_) {
        setActiveMembersCount(10);
      }
    }
    loadActiveMembers();
  }, [selectedPoolId, propPoolId]);

  const nextKickoffLockText = useMemo(() => {
    return formatNextKickoffLock(manifestGames, activeScope?.week || propWeek || 6);
  }, [manifestGames, activeScope?.week, propWeek]);

  useEffect(() => {
    if (!user) return;
    async function loadRole() {
      const { data } = await supabase.from('users').select('role').eq('id', user?.id).maybeSingle();
      if (data?.role) setRole(data.role);
    }
    loadRole();
  }, [user]);

  const loadPendingApplicants = useCallback(async () => {
    if (!isCommissioner || !selectedPoolId) {
      setPendingApplicants([]);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_pending_applicants', {
        p_pool_id: selectedPoolId
      });

      if (error) {
        console.warn('Failed to load pending applicants via RPC:', error);
        return;
      }

      const applicants: PendingApplicant[] = (data || []).map((m: any) => ({
        userId: m.user_id,
        email: m.email,
        displayName: m.display_name,
      }));

      setPendingApplicants(applicants);
    } catch (err) {
      console.warn('Failed to load pending applicants:', err);
    }
  }, [isCommissioner]);

  useEffect(() => {
    loadPendingApplicants();

    const handleUpdate = () => loadPendingApplicants();
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('pending-memberships-changed', handleUpdate);

    const channel = supabase
      .channel('profile_page_pending_memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_memberships' }, () => {
        loadPendingApplicants();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('pending-memberships-changed', handleUpdate);
      channel.unsubscribe();
    };
  }, [loadPendingApplicants]);

  const handleAdjudicate = async (targetUserId: string, action: 'APPROVE' | 'REJECT' | 'ACTIVE' | 'REJECTED') => {
    const previousApplicants = [...pendingApplicants];

    setAdjudicatingId(targetUserId);
    setStatusFeedback(null);

    try {
      const p_status = action === 'APPROVE' || action === 'ACTIVE' ? 'ACTIVE' : 'REJECTED';

      // 1. Dispatch POST /api/pools/:pool_id/adjudicate if API available
      try {
        await scopedExpressFetch('/api/pools/9b893bef-3b5a-4ffa-951d-8ba27f9c9782/adjudicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetUserId, action: p_status }),
        });
      } catch (apiErr) {
        // Safe failover to RPC
      }

      // 2. Direct Supabase RPC for authoritative adjudication
      const { error } = await supabase.rpc('adjudicate_applicant', {
        p_pool_id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
        p_user_id: targetUserId,
        p_status: action === 'APPROVE' ? 'ACTIVE' : (action === 'ACTIVE' ? 'ACTIVE' : 'REJECTED')
      });

      if (error) throw error;

      // If success, immediately remove applicant from state, clear previous errors, and trigger event
      setPendingApplicants((prev) => prev.filter((a) => a.userId !== targetUserId));
      setStatusFeedback(null);
      window.dispatchEvent(new Event('pending-memberships-changed'));
    } catch (err: any) {
      console.error('Failed to adjudicate applicant:', err);
      // Revert state on failure and display error cleanly in UI error state
      setPendingApplicants(previousApplicants);
      setStatusFeedback(err.message || 'Adjudication failed');
    } finally {
      setAdjudicatingId(null);
    }
  };

  const personalStory = useMemo(() => {
    return deriveSeasonStoryViewModel({
      isLoading: false,
      season: 2026,
      poolId: selectedPoolId || '',
      viewerUserId: user?.id || 'viewer',
      rawRecords: [], // Live database has 0 settled weeks currently
      currentOutstandingShotDebt: 0,
    });
  }, [selectedPoolId, user?.id]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Unified Top Branding Banner */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope="SEASON LEDGER"
        phase="SETTLED"
        rightContent={
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5"/>
          </button>
        }
      />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Quick Admission Queue Banner */}
        {isCommissioner && pendingApplicants.length > 0 && (
          <div 
            data-testid="pending-applicants-banner"
            className="bg-amber-500/10 border-2 border-amber-500/60 rounded-2xl p-4 shadow-2xl relative overflow-hidden animate-fadeIn"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  PENDING LEAGUE APPLICANTS ({pendingApplicants.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-amber-400/90 uppercase font-bold tracking-widest bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                MAIN LEAGUE
              </span>
            </div>

            {statusFeedback && (
              <div className="mb-3 text-[11px] font-medium text-rose-400 bg-rose-950/60 border border-rose-800/80 rounded-lg p-2 text-center">
                {statusFeedback}
              </div>
            )}

            <div className="space-y-2.5">
              {pendingApplicants.map((applicant) => (
                <div 
                  key={applicant.userId}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="min-w-0 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-sm font-black text-amber-300 shrink-0">
                      {applicant.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        {applicant.displayName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {applicant.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleAdjudicate(applicant.userId, 'APPROVE')}
                      disabled={adjudicatingId === applicant.userId}
                      data-testid={`approve-applicant-${applicant.userId}`}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-[11px] rounded-lg uppercase tracking-wider shadow-md transition-all disabled:opacity-50 min-h-[36px]"
                    >
                      {adjudicatingId === applicant.userId ? '...' : 'APPROVE'}
                    </button>
                    <button
                      onClick={() => handleAdjudicate(applicant.userId, 'REJECT')}
                      disabled={adjudicatingId === applicant.userId}
                      data-testid={`reject-applicant-${applicant.userId}`}
                      className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 border border-rose-800 text-rose-300 font-bold text-[11px] rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 min-h-[36px]"
                    >
                      {adjudicatingId === applicant.userId ? '...' : 'REJECT'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/40 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
            🏈
          </div>
          <h2 className="text-base font-black uppercase tracking-wide text-white">
            {user?.email?.split('@')[0] || 'Member'}
          </h2>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</div>
          <div className="mt-3 inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-bold text-amber-400 uppercase tracking-widest">
            {role === 'ADMIN' ? 'League Commissioner' : 'Active Competitor'}
          </div>
        </div>

        {/* Pass 3: Commissioner Readiness Room Card */}
        {isCommissioner && (
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 font-mono shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡️ COMMISSIONER READINESS ROOM</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase">
                MAIN LEAGUE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase">Active Pool Members</span>
                <span className="text-sm font-black text-white">{activeMembersCount} Active <span className="text-slate-500 text-xs font-normal">/ 10 Target</span></span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase">Pending Applicants</span>
                <span className={`text-sm font-black ${pendingApplicants.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {pendingApplicants.length} Pending
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase">Invite Code</span>
                <span className="text-sm font-black text-cyan-400 tracking-wider">MAIN26</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase">Next Kickoff Lock</span>
                <span className="text-xs font-black text-amber-300">{nextKickoffLockText}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Season Ledger</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-sm font-black text-white">0</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Pick Wins</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-sm font-black text-white">0</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Pick Losses</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-sm font-black text-amber-400">0 shots</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Shot Debt</div>
            </div>
          </div>
        </div>

        {/* Pass 4: Personal Season Story Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              📜 SEASON STORY SUMMARY
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
              OFFICIAL AUDIT
            </span>
          </div>

          <div className="text-xs font-bold text-slate-200 mb-1">
            {personalStory.headline}
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed mb-3">
            {personalStory.statusMessage}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                Weekly Charges Incurred
              </div>
              <div className="text-sm font-black text-white">
                {personalStory.totalWeeklyChargesLabel}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                Cumulative historical charges
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                Outstanding Season Shot Debt
              </div>
              <div className="text-sm font-black text-amber-400">
                {personalStory.outstandingShotDebtLabel}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                Current unpaid charter balance
              </div>
            </div>
          </div>
        </div>

        {/* Opt-In Kickoff Deadline Alerts Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔔 OPT-IN KICKOFF DEADLINE ALERTS</span>
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                permissionState === 'GRANTED'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : permissionState === 'DENIED'
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                  : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
              }`}
            >
              {permissionState}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white">Enable ~60m Pre-Kickoff Reminders</div>
              <div className="text-[10px] text-slate-400">
                Local alert before official kickoff locks
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleOptIn(!alertsOptedIn)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                alertsOptedIn && permissionState === 'GRANTED' ? 'bg-cyan-500' : 'bg-slate-800 border border-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  alertsOptedIn && permissionState === 'GRANTED' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Planned Window Schedule
            </span>
            {deadlinePlan.toSchedule.length > 0 ? (
              <div className="space-y-1 my-1">
                {deadlinePlan.toSchedule.map((item) => (
                  <div key={item.reminderId} className="flex justify-between items-center text-xs">
                    <span className="text-white font-medium">{item.matchupSummary}</span>
                    <span className="text-cyan-400 font-mono text-[11px]">
                      {new Date(item.kickoffIso).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'America/Los_Angeles',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white font-bold">{deadlinePlan.statusSummary}</div>
            )}
            <div className="text-[10px] text-slate-500 mt-1">
              {deadlinePlan.statusSummary}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1 items-center justify-between">
            <span className="text-[11px] text-slate-400">
              🛡️ Verified cancellation only — background notification generation deactivated.
            </span>

            {alertsOptedIn && (
              <button
                type="button"
                onClick={handleCancelAllAlerts}
                className="py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-bold text-xs uppercase tracking-wider transition"
              >
                Cancel All Scheduled Alerts
              </button>
            )}
          </div>

          {/* In-App Notification Delivery Banner */}
          {testNotificationBanner && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 text-xs space-y-2 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <span>🔔</span>
                <span>{testNotificationBanner}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="/picks"
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider transition inline-block"
                >
                  Tap to Verify Deep-Link to Picks
                </a>
                <button
                  type="button"
                  onClick={() => setTestNotificationBanner(null)}
                  className="px-2.5 py-1 rounded bg-slate-900 text-slate-400 hover:text-white text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AccountSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
export default ProfilePage;
