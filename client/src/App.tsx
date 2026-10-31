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
import { getCurrentNFLWeek } from './services/nflCalendarService';

export function resolveNavigationVisibility(session: any, membershipStatus: string | null): boolean {
  return Boolean(session && membershipStatus === 'ACTIVE');
}

import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { PoolLoungeDrawer } from './components/social/PoolLoungeDrawer';
import { CanonicalContextCardAttachment } from './services/poolSocialService';
export { PendingApprovalScreen };

export const App: React.FC = () => {
  const { user, session, loading } = useAuth();
  const [membershipStatus, setMembershipStatus] = useState<'ACTIVE' | 'PENDING' | 'NONE' | 'LOADING'>('LOADING');
  const [isLoungeOpen, setIsLoungeOpen] = useState(false);
  const [loungeContextCard, setLoungeContextCard] = useState<CanonicalContextCardAttachment | null>(null);
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  useEffect(() => {
    const handleOpenLounge = (e: Event) => {
      const custom = e as CustomEvent<{ contextCard?: CanonicalContextCardAttachment }>;
      if (custom.detail?.contextCard) {
        setLoungeContextCard(custom.detail.contextCard);
      }
      setIsLoungeOpen(true);
    };
    window.addEventListener('open-pool-lounge', handleOpenLounge);
    return () => window.removeEventListener('open-pool-lounge', handleOpenLounge);
  }, []);

  useEffect(() => {
    async function checkMembership() {
      if (!user) {
        setMembershipStatus('NONE');
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
          // If membership not found, fail closed to PENDING without client-side DB writes
          setMembershipStatus('PENDING');
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
      {session && (
        <PoolLoungeDrawer
          isOpen={isLoungeOpen}
          onClose={() => setIsLoungeOpen(false)}
          poolId={activePoolId}
          season={2026}
          week={getCurrentNFLWeek()}
          currentUserId={user?.id || 'u1'}
          currentUserName={user?.email ? user.email.split('@')[0] : 'jack.w.cone'}
          membershipStatus={membershipStatus === 'ACTIVE' ? 'ACTIVE' : 'PENDING'}
          initialContextCard={loungeContextCard}
        />
      )}
    </div>
  );
};
export default App;
