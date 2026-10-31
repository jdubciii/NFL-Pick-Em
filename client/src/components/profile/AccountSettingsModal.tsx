import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface PendingApplicant {
  userId: string;
  email: string;
  displayName: string;
}

export const AccountSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(() => user?.role === 'ADMIN');
  const [pendingMembers, setPendingMembers] = useState<PendingApplicant[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [adjudicatingId, setAdjudicatingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  const loadCommissionerData = useCallback(async () => {
    if (!user) return;
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user?.id)
      .maybeSingle();

    const adminRole = userData?.role === 'ADMIN' || user?.role === 'ADMIN';
    setIsAdmin(adminRole);

    if (adminRole) {
      const { data, error } = await supabase.rpc('get_pending_applicants', {
        p_pool_id: activePoolId
      });

      if (error) {
        console.error('[Commissioner Queue] RPC error:', error);
      }

      const applicants: PendingApplicant[] = (data || []).map((p: any) => ({
        userId: p.user_id,
        email: p.email,
        displayName: p.display_name
      }));

      setPendingMembers(applicants);
      setPendingCount(applicants.length);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    loadCommissionerData();

    const handleUpdate = () => loadCommissionerData();
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('pending-memberships-changed', handleUpdate);

    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('pending-memberships-changed', handleUpdate);
    };
  }, [isOpen, user, loadCommissionerData]);

  if (!isOpen) return null;

  const handleAdjudicate = async (targetUserId: string, action: 'APPROVE' | 'REJECT' | 'ACTIVE' | 'REJECTED') => {
    const previousMembers = [...pendingMembers];
    const previousCount = pendingCount;

    setLoading(true);
    setAdjudicatingId(targetUserId);
    setStatusMsg(null);

    try {
      const { error } = await supabase.rpc('adjudicate_applicant', {
        p_pool_id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
        p_user_id: targetUserId,
        p_status: action === 'APPROVE' ? 'ACTIVE' : (action === 'ACTIVE' ? 'ACTIVE' : 'REJECTED')
      });

      if (error) throw error;

      // If success, immediately remove applicant from state, decrement pending counter, clear previous error, and trigger event
      setPendingMembers(prev => prev.filter(m => m.userId !== targetUserId));
      setPendingCount(prev => Math.max(0, prev - 1));
      setStatusMsg(null);
      window.dispatchEvent(new Event('pending-memberships-changed'));
    } catch (err: any) {
      console.error('Adjudication failed:', err);
      // Revert state on failure and display error.message cleanly in UI error state
      setPendingMembers(previousMembers);
      setPendingCount(previousCount);
      setStatusMsg(err.message || 'Adjudication failed');
    } finally {
      setLoading(false);
      setAdjudicatingId(null);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setStatusMsg('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStatusMsg('Password updated successfully');
      setNewPassword('');
    } catch (err: any) {
      setStatusMsg(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Account Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base font-bold min-h-[48px] min-w-[48px] flex items-center justify-center">✕</button>
        </div>

        <div className="mb-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <div className="text-slate-400">Authenticated Identity:</div>
          <div className="font-mono text-white truncate mt-0.5">{user?.email}</div>
          {isAdmin && <div className="mt-2 text-[10px] text-amber-400 font-bold uppercase">Commissioner Authority: Active</div>}
        </div>

        {statusMsg && (
          <div className={`mb-4 p-2 rounded-lg text-xs text-center font-medium border ${
            statusMsg.includes('failed') || statusMsg.includes('Error') || statusMsg.includes('must be')
              ? 'bg-rose-950/60 border-rose-800/80 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {statusMsg}
          </div>
        )}

        {/* Commissioner Approval Queue */}
        {isAdmin && (
          <div className="mb-6 border-t border-slate-800 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">COMMISSIONER APPLICANT QUEUE</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">
                {pendingCount}
              </span>
            </div>
            {pendingMembers.length === 0 ? (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                <p className="text-xs text-slate-400">0 Pending Applicants awaiting admission.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingMembers.map((m) => (
                  <div
                    key={m.userId}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2.5 shadow-md"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xs font-black text-amber-300 shrink-0">
                        {m.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{m.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{m.email}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2 self-end">
                      <button
                        onClick={() => handleAdjudicate(m.userId, 'APPROVE')}
                        disabled={loading || adjudicatingId === m.userId}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-[11px] rounded-lg uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 min-h-[36px]"
                      >
                        {adjudicatingId === m.userId ? '...' : 'APPROVE'}
                      </button>
                      <button
                        onClick={() => handleAdjudicate(m.userId, 'REJECT')}
                        disabled={loading || adjudicatingId === m.userId}
                        className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 border border-rose-800 text-rose-300 font-bold text-[11px] rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 min-h-[36px]"
                      >
                        {adjudicatingId === m.userId ? '...' : 'REJECT'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security Password Update */}
        <form onSubmit={handlePasswordUpdate} className="space-y-3 mb-6 border-t border-slate-800 pt-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Change Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
          >
            Update Password
          </button>
        </form>

        <button
          onClick={signOut}
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
