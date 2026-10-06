import React, { useState } from 'react';
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
  Camera,
  Sliders,
  Activity
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Weekly Picks', path: '/picks', icon: CheckSquare },
    { name: 'Square Sheet', path: '/matrix', icon: Grid },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Sweat Radar', path: '/radar', icon: Zap },
    { name: 'Shot-Cam', path: '/shot-cam', icon: Camera },
    { name: 'Rules', path: '/rules', icon: Sliders },
    { name: 'Wall of Shame', path: '/shame', icon: Skull },
    ...((isAdmin || user?.email === 'jack@nflpickem.com') ? [{ name: 'System Ops', path: '/admin/ops', icon: Activity }] : []),
    ...((isAdmin || user?.email === 'jack@nflpickem.com') ? [{ name: 'Admin', path: '/admin', icon: Shield }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
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

          {/* User Status / Logout */}
          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">{user?.email}</span>
              <span className="text-[10px] font-bold uppercase text-emerald-400">
                {(isAdmin || user?.email === 'jack@nflpickem.com') ? 'COMMISSIONER' : 'LEAGUE MEMBER'}
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
        </div>
      </div>
    </nav>
  );
};
