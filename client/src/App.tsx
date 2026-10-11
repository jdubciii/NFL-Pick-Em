import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
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
          setMembershipStatus('NONE');
        } else {
          setMembershipStatus(data.status as 'ACTIVE' | 'PENDING');
        }
      } catch (err) {
        setMembershipStatus('NONE');
      }
    }
    checkMembership();
  }, [user]);

  if (loading || (user && membershipStatus === 'LOADING')) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        INITIALIZING SESSION...
      </div>
    );
  }

  // Pending League Approval Shell
  if (user && membershipStatus === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 text-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-3xl mb-4">⏳</div>
          <h1 className="text-xl font-black text-white uppercase tracking-wider mb-2">Admission Pending</h1>
          <p className="text-slate-400 text-xs mb-6">
            Your application to <span className="text-amber-400 font-bold">Main League</span> has been submitted with code <span className="font-mono text-white">MAIN26</span>.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono mb-6">
            Status: PENDING COMMISSIONER APPROVAL
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl uppercase tracking-wider transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isAdmitted = resolveNavigationVisibility(session, membershipStatus);

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
