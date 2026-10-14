import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AccountSettingsModal } from '../components/profile/AccountSettingsModal';

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
    window.addEventListener('pending-memberships-changed', handleUpdate);

    const channel = supabase
      .channel('profile_page_pending_memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_memberships' }, () => {
        loadPendingApplicants();
      })
      .subscribe();

    return () => {
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

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-white">
      {/* Unified Top Branding Banner */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-black tracking-wider text-white truncate">NFL PICK'EM</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          title="Account Settings"
        >
          ⚙️
        </button>
      </div>

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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Season Ledger</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-sm font-black text-white">0</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Wins</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-sm font-black text-white">0</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Losses</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-sm font-black text-amber-400">0.00</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Shot Debt</div>
            </div>
          </div>
        </div>
      </div>

      <AccountSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
export default ProfilePage;
