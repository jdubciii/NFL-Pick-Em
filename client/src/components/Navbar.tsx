import React from 'react';
import { TargetLockLogo } from './brand/TargetLockLogo';

interface NavbarProps {
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfile }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <TargetLockLogo size={32} animate={false} />
        <div>
          <span className="font-mono text-sm font-black tracking-wider text-white">
            NFL PICK <span className="text-cyan-400">'EM</span>
          </span>
          <p className="text-[9px] font-mono tracking-widest text-slate-400 uppercase leading-none">
            GAMEDAY PLATFORM
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenProfile && (
          <button
            onClick={onOpenProfile}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition"
            title="Open Profile"
          >
            <span className="text-xs">👤</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;
