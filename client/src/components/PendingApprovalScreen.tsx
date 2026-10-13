import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, LogOut } from 'lucide-react';

export const PendingApprovalScreen: React.FC = () => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setToastMessage(null);
    try {
      let targetUserId = user?.id;
      if (!targetUserId) {
        const { data: authData } = await supabase.auth.getUser();
        targetUserId = authData.user?.id;
      }

      if (!targetUserId) {
        setToastMessage('Authentication session missing. Please sign out and sign in.');
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }

      const { data, error } = await supabase
        .from('pool_memberships')
        .select('status')
        .eq('user_id', targetUserId)
        .eq('pool_id', '9b893bef-3b5a-4ffa-951d-8ba27f9c9782')
        .single();

      if (data && data.status === 'ACTIVE') {
        window.location.reload();
      } else {
        setToastMessage('Application is still pending commissioner approval.');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err: any) {
      setToastMessage('Application is still pending commissioner approval.');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 text-center select-none font-mono">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-4xl mb-4 animate-pulse">⏳</div>
        <h1 className="text-lg font-black text-white uppercase tracking-wider mb-3">
          Application Pending Commissioner Approval
        </h1>
        <p className="text-slate-400 text-xs leading-relaxed mb-6">
          Your request to join <span className="text-amber-400 font-bold">Main League</span> with code <span className="text-white font-bold">MAIN26</span> has been registered. The commissioner (Jack) must approve your admission before you can access the league.
        </p>
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-amber-400 font-bold tracking-wide mb-6">
          STATUS: PENDING COMMISSIONER ADJUDICATION
        </div>

        {toastMessage && (
          <div
            role="status"
            className="mb-4 p-3 bg-amber-950/90 border border-amber-700/80 rounded-xl text-amber-300 text-xs font-bold animate-in fade-in"
          >
            {toastMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={checking}
            onClick={handleCheckStatus}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking...' : 'Check Status / Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
