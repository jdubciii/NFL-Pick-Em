import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AccountSettingsModal } from '../components/profile/AccountSettingsModal';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string>('USER');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadRole() {
      const { data } = await supabase.from('users').select('role').eq('id', user?.id).maybeSingle();
      if (data?.role) setRole(data.role);
    }
    loadRole();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-white">
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm font-black uppercase tracking-wider text-white">Member Profile</h1>
        <button
          onClick={() => setSettingsOpen(true)}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          title="Account Settings"
        >
          ⚙️
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
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
