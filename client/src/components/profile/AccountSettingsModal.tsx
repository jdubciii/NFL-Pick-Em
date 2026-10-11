import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface PendingMember {
  user_id: string;
  email: string;
}

export const AccountSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(() => user?.role === 'ADMIN' || user?.email === 'jack.w.cone@gmail.com');
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  useEffect(() => {
    if (!isOpen || !user) return;

    async function loadCommissionerData() {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .maybeSingle();

      const adminRole = userData?.role === 'ADMIN' || user?.role === 'ADMIN' || user?.email === 'jack.w.cone@gmail.com';
      setIsAdmin(adminRole);

      if (adminRole) {
        const { data: pendingData } = await supabase
          .from('pool_memberships')
          .select('user_id, users(email)')
          .eq('pool_id', activePoolId)
          .eq('status', 'PENDING');

        if (pendingData) {
          const formatted = pendingData.map((p: any) => ({
            user_id: p.user_id,
            email: p.users?.email || p.user_id
          }));
          setPendingMembers(formatted);
        }
      }
    }
    loadCommissionerData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleAdjudicate = async (targetUserId: string, newStatus: 'ACTIVE' | 'REJECTED') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pool_memberships')
        .update({ status: newStatus })
        .eq('pool_id', activePoolId)
        .eq('user_id', targetUserId);

      if (error) throw error;
      setPendingMembers(prev => prev.filter(m => m.user_id !== targetUserId));
      setStatusMsg(`Member ${newStatus.toLowerCase()} successfully`);
    } catch (err: any) {
      setStatusMsg(err.message || 'Adjudication failed');
    } finally {
      setLoading(false);
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
          <div className="mb-4 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs text-center font-medium">
            {statusMsg}
          </div>
        )}

        {/* Commissioner Approval Queue */}
        {isAdmin && (
          <div className="mb-6 border-t border-slate-800 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">COMMISSIONER APPLICANT QUEUE</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">
                {pendingMembers.length}
              </span>
            </div>
            {pendingMembers.length === 0 ? (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                <p className="text-xs text-slate-400">0 Pending Applicants awaiting admission.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingMembers.map((m) => (
                  <div key={m.user_id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[140px]">{m.email}</span>
                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => handleAdjudicate(m.user_id, 'ACTIVE')}
                        disabled={loading}
                        className="min-h-[48px] px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAdjudicate(m.user_id, 'REJECTED')}
                        disabled={loading}
                        className="min-h-[48px] px-3 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                      >
                        Reject
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
              placeholder="New password (min 8 chars)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs uppercase transition-colors"
          >
            Update Password
          </button>
        </form>

        <button
          onClick={async () => { await signOut(); onClose(); }}
          className="w-full min-h-[48px] bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
