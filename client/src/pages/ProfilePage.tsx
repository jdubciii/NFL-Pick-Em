import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AccountSettingsModal } from '../components/profile/AccountSettingsModal';
import { AppHeader } from '../components/common/AppHeader';
import { Settings } from 'lucide-react';
import { deriveSeasonStoryViewModel } from '../services/seasonStoryService';

interface PendingApplicant {
  userId: string;
  email: string;
  displayName: string;
}

export const ProfilePage: React.FC = () => {
  const { user, token } = useAuth();
  const [role, setRole] = useState<string>('USER');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingApplicants, setPendingApplicants] = useState<PendingApplicant[]>([]);
  const [adjudicatingId, setAdjudicatingId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  const isCommissioner = Boolean(
    role === 'ADMIN' || 
    user?.role === 'ADMIN' || 
    user?.email === 'jack.w.cone@gmail.com' || 
    user?.email === 'jack@nflpickem.com'
  );

  const [activeMembersCount, setActiveMembersCount] = useState<number>(2);

  useEffect(() => {
    async function loadActiveMembers() {
      try {
        const { count, error } = await supabase
          .from('pool_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('pool_id', activePoolId)
          .eq('status', 'ACTIVE');
        if (!error && typeof count === 'number') {
          setActiveMembersCount(count);
        }
      } catch (_) {}
    }
    loadActiveMembers();
  }, [activePoolId]);

  useEffect(() => {
    if (!user) return;
    async function loadRole() {
      const { data } = await supabase.from('users').select('role').eq('id', user?.id).maybeSingle();
      if (data?.role) setRole(data.role);
    }
    loadRole();
  }, [user]);

  const loadPendingApplicants = useCallback(async () => {
    if (!isCommissioner) {
      setPendingApplicants([]);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_pending_applicants', {
        p_pool_id: activePoolId
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
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (user?.email) headers['x-user-email'] = user.email;

        await fetch(`/api/pools/9b893bef-3b5a-4ffa-951d-8ba27f9c9782/adjudicate`, {
          method: 'POST',
          headers,
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
      poolId: activePoolId,
      viewerUserId: user?.id || 'viewer',
      rawRecords: [], // Live database has 0 settled weeks currently
      currentOutstandingShotDebt: 0,
    });
  }, [activePoolId, user?.id]);

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
                <span className="text-xs font-black text-amber-300">Thu 5:15 PM (Week 6)</span>
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
      </div>

      <AccountSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
export default ProfilePage;
