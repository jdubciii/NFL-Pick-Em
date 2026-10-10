import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Shield,
  LogOut,
  Menu,
  X,
  CheckSquare,
  Skull,
  Grid,
  Zap,
  Beer,
  Sliders,
  Activity
} from 'lucide-react';

const MEMBER_DISPLAY_MAP: Record<string, string> = {
  'jack@nflpickem.com': 'Jack (You)',
  'matt.c@nflpickem.com': 'Matt Cone',
  'matt.b@nflpickem.com': 'Matt Brickner',
  'justin.b@nflpickem.com': 'Justin Brickner',
  'adam.b@nflpickem.com': 'Adam Brickner',
  'rich.b@nflpickem.com': 'Rich Brickner',
  'mike.c@nflpickem.com': 'Mike Cone',
  'nick.s@nflpickem.com': 'Nick Santos',
  'mark.b@nflpickem.com': 'Mark Brickner',
  'bigjack@nflpickem.com': 'Big Jack',
};

function getUserDisplayName(email?: string): string {
  if (!email) return 'Guest User';
  const lower = email.toLowerCase();
  return MEMBER_DISPLAY_MAP[lower] || email.split('@')[0];
}

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const isCommissioner = isAdmin || user?.email?.toLowerCase() === 'jack@nflpickem.com';
  const userDisplayName = getUserDisplayName(user?.email);
  const userRole = isCommissioner ? 'COMMISSIONER' : 'LEAGUE MEMBER';

  const navLinks = [
    { name: 'Weekly Picks', path: '/picks', icon: CheckSquare },
    { name: 'Square Sheet Matrix', path: '/matrix', icon: Grid },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Sweat Radar', path: '/radar', icon: Zap },
    { name: 'Shot-Cam Dispute Hub', path: '/shot-cam', icon: Beer },
    { name: 'Rules', path: '/rules', icon: Sliders },
    { name: 'Wall of Shame', path: '/shame', icon: Skull },
    { name: 'Profile & Rap Sheet', path: '/profile', icon: Shield },
    ...(isCommissioner ? [{ name: 'System Ops', path: '/admin/ops', icon: Activity }] : []),
    ...(isCommissioner ? [{ name: 'Admin Console', path: '/admin', icon: Shield }] : []),
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
                <Trophy className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  NFL PICK <span className="text-cyan-400 font-black">'EM</span>
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-emerald-400 -mt-1">
                  Gameday Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop User Status / Logout */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-right">
                <span className="text-xs text-slate-300 font-bold block">{userDisplayName}</span>
                <span className="text-[10px] font-bold uppercase text-emerald-400">
                  {userRole}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <div className="flex lg:hidden items-center space-x-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/40 focus:outline-none transition-all shadow-md"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-cyan-400" />
                ) : (
                  <Menu className="w-6 h-6 text-slate-200" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer / Overlay Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-6 animate-fade-in lg:hidden overflow-y-auto">
          {/* Top Header inside Drawer */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-md">
                <Trophy className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-black text-lg text-white">
                NFL PICK <span className="text-cyan-400">'EM</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links Grid */}
          <div className="py-6 space-y-2 flex-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 mb-2">
              Navigation
            </div>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-base font-bold transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Bottom User Profile Summary & Logout */}
          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-white">
                  {userDisplayName}
                </div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                  {userRole}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {user?.email}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

