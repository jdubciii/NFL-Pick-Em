import React from 'react';

export interface CampParticipant {
  userId: string;
  userName: string;
  team: string;
  isAutopilot?: boolean;
}

interface StackedAvatarClusterProps {
  participants: CampParticipant[];
  teamLabel: string;
  isAway?: boolean;
}

export const StackedAvatarCluster: React.FC<StackedAvatarClusterProps> = ({
  participants,
  teamLabel,
  isAway = false
}) => {
  const visible = participants.slice(0, 3);
  const remaining = participants.length - visible.length;

  return (
    <div className={`flex items-center gap-1.5 ${isAway ? 'flex-row' : 'flex-row-reverse'}`}>
      <span className="text-[10px] font-mono font-bold text-slate-300">
        {teamLabel}
      </span>
      <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
        {visible.map((p) => (
          <div
            key={p.userId}
            title={`${p.userName}${p.isAutopilot ? ' (Autopilot 🤖)' : ''}`}
            className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shadow-sm transition ${
              p.isAutopilot
                ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {p.userName.slice(0, 2).toUpperCase()}
          </div>
        ))}
        {remaining > 0 && (
          <div className="w-6 h-6 rounded-full border-2 border-slate-700 bg-slate-900 text-[9px] font-mono font-bold text-slate-400 flex items-center justify-center shadow-sm">
            +{remaining}
          </div>
        )}
      </div>
    </div>
  );
};
