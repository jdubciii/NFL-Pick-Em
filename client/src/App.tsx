import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, autoRepairPoolMembership } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { BottomNavigation } from './components/BottomNavigation';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { RadarPage } from './pages/RadarPage';
import { MatrixPage } from './pages/MatrixPage';
import { WallOfShamePage } from './pages/WallOfShamePage';
import { ProfilePage } from './pages/ProfilePage';
import { PicksPage } from './pages/PicksPage';

export function resolveNavigationVisibility(session: any, membershipStatus: string | null): boolean {
  return Boolean(session && membershipStatus === 'ACTIVE');
}

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

export const App: React.FC = () => {
  const { user, session, loading } = useAuth();
  const [membershipStatus, setMembershipStatus] = useState<'ACTIVE' | 'PENDING' | 'NONE' | 'LOADING'>('LOADING');
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  useEffect(() => {
    async function checkMembership() {
      if (!user) {
        setMembershipStatus('NONE');
        return;
      }
      if (user.role === 'ADMIN' || user.email === 'jack.w.cone@gmail.com') {
        setMembershipStatus('ACTIVE');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('pool_memberships')
          .select('status')
          .eq('pool_id', activePoolId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error || !data) {
          // Auto-repair missing pool_memberships row on login (Step 2)
          const repairStatus = await autoRepairPoolMembership(user.id, user.email, session?.access_token);
          setMembershipStatus(repairStatus || 'PENDING');
        } else {
          setMembershipStatus(data.status as 'ACTIVE' | 'PENDING');
        }
      } catch (err) {
        setMembershipStatus('PENDING');
      }
    }
    checkMembership();
  }, [user, session]);

  if (loading || (user && membershipStatus === 'LOADING')) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        INITIALIZING SESSION...
      </div>
    );
  }

  const isAdmitted = resolveNavigationVisibility(session, membershipStatus);

  // Fail-Closed Hard Gate (Decision #55):
  // If authenticated session exists but membershipStatus !== 'ACTIVE',
  // trap completely in PendingApprovalScreen—zero access to Picks, Matrix, Radar, or Shame.
  if (session && !isAdmitted) {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/" element={<ProtectedRoute><PicksPage /></ProtectedRoute>} />
          <Route path="/radar" element={<ProtectedRoute><RadarPage /></ProtectedRoute>} />
          <Route path="/matrix" element={<ProtectedRoute><MatrixPage /></ProtectedRoute>} />
          <Route path="/shame" element={<ProtectedRoute><WallOfShamePage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {isAdmitted && <BottomNavigation />}
    </div>
  );
};
export default App;
