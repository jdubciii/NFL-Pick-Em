import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { PicksPage } from './pages/PicksPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { WallOfShamePage } from './pages/WallOfShamePage';
import { MatrixPage } from './pages/MatrixPage';
import { AdminPage } from './pages/AdminPage';
import { ShotCamPage } from './pages/ShotCamPage';
import { RulesPage } from './pages/RulesPage';
import { SweatRadarPage } from './pages/SweatRadarPage';
import { OpsDashboardPage } from './pages/OpsDashboardPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes for authenticated users */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/picks" replace />} />
                <Route path="/picks" element={<PicksPage />} />
                <Route path="/matrix" element={<MatrixPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/radar" element={<SweatRadarPage />} />
                <Route path="/shot-cam" element={<ShotCamPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/shame" element={<WallOfShamePage />} />
                <Route path="/wall-of-shame" element={<WallOfShamePage />} />
              </Route>

              {/* Protected admin-only routes */}
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/ops" element={<OpsDashboardPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/picks" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
