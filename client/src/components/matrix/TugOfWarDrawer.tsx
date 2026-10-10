import React from 'react';
import type { CampParticipant } from './StackedAvatarCluster';

interface TugOfWarDrawerProps {
  gameMatchup: string;
  awayTeam: string;
  homeTeam: string;
  awayCamp: CampParticipant[];
  homeCamp: CampParticipant[];
  onClose: () => void;
}

export const TugOfWarDrawer: React.FC<TugOfWarDrawerProps> = ({
  gameMatchup,
  awayTeam,
  homeTeam,
  awayCamp,
  homeCamp,
  onClose
}) => {
  return (
    <div className="mt-2.5 p-3 rounded-xl bg-slate-950/95 border border-cyan-500/40 shadow-xl font-mono text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">
          ⚔️ TUG-OF-WAR // {gameMatchup}
        </span>
        <button
          onClick={onClose}
          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
        >
          CLOSE
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800 pointer-events-none" />

        {/* Away Camp */}
        <div className="space-y-1.5 pr-2">
          <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold border-b border-cyan-500/30 pb-1">
            <span>CAMP {awayTeam}</span>
            <span>({awayCamp.length})</span>
          </div>
          <div className="space-y-1">
            {awayCamp.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-1 rounded bg-slate-900/80 border border-slate-800 text-[10px]"
              >
                <span className="font-semibold text-slate-200 truncate">{user.userName}</span>
                {user.isAutopilot && <span title="Autopilot Favorites">🤖</span>}
              </div>
            ))}
            {awayCamp.length === 0 && (
              <p className="text-[10px] text-slate-500 italic py-1">Zero picks</p>
            )}
          </div>
        </div>

        {/* Home Camp */}
        <div className="space-y-1.5 pl-2">
          <div className="flex items-center justify-between text-[10px] text-emerald-300 font-bold border-b border-emerald-500/30 pb-1">
            <span>CAMP {homeTeam}</span>
            <span>({homeCamp.length})</span>
          </div>
          <div className="space-y-1">
            {homeCamp.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-1 rounded bg-slate-900/80 border border-slate-800 text-[10px]"
              >
                <span className="font-semibold text-slate-200 truncate">{user.userName}</span>
                {user.isAutopilot && <span title="Autopilot Favorites">🤖</span>}
              </div>
            ))}
            {homeCamp.length === 0 && (
              <p className="text-[10px] text-slate-500 italic py-1">Zero picks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
