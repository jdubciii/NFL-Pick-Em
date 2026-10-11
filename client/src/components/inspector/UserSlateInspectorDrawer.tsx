import React from 'react';

interface PeerPick {
  gameId: string;
  matchup: string;
  selectedTeam: string;
  isLocked: boolean;
  outcome?: 'WIN' | 'LOSS' | 'PENDING';
}

interface UserSlateInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  peerEmail: string;
  tiebreakerPoints?: string;
  picks: PeerPick[];
}

export const UserSlateInspectorDrawer: React.FC<UserSlateInspectorProps> = ({
  isOpen,
  onClose,
  peerEmail,
  tiebreakerPoints,
  picks
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[85vh] flex flex-col">
        {/* Grip Header */}
        <div className="flex flex-col items-center mb-3">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-3" />
          <div className="w-full flex justify-between items-center">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Slate Inspector</div>
              <div className="text-sm font-black text-white truncate max-w-[220px]">{peerEmail}</div>
            </div>
            <button onClick={onClose} className="min-h-[48px] min-w-[48px] flex items-center justify-center text-slate-400 hover:text-white font-bold">
              ✕
            </button>
          </div>
        </div>

        {/* Tiebreaker Snapshot */}
        <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Points Prediction:</span>
          <span className="text-sm font-black text-amber-400 font-mono">{tiebreakerPoints || 'Not submitted'}</span>
        </div>

        {/* Picks List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {picks.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No slate submitted for this week.</div>
          ) : (
            picks.map((p) => (
              <div key={p.gameId} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{p.matchup}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white uppercase">{p.selectedTeam}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    p.isLocked ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {p.isLocked ? '🔒 LOCKED' : 'OPEN'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
