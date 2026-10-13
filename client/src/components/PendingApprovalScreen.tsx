import React from 'react';
import { supabase } from '../lib/supabase';

export const PendingApprovalScreen: React.FC = () => {
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
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
