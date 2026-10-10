import React, { useState } from 'react';
import type { NarrativeBadge } from '../../services/reputationEngineService';

interface NarrativeBadgeCaseProps {
  badges: NarrativeBadge[];
}

export const NarrativeBadgeCase: React.FC<NarrativeBadgeCaseProps> = ({ badges }) => {
  const [selectedBadge, setSelectedBadge] = useState<NarrativeBadge | null>(null);

  const getThemeClass = (theme: NarrativeBadge['theme'], isEarned: boolean) => {
    if (!isEarned) return 'border-slate-800 bg-slate-950/40 text-slate-600 opacity-40';
    switch (theme) {
      case 'GOLD_RED':
        return 'border-rose-500 bg-rose-950/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
      case 'CYAN_SMOKE':
        return 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.4)]';
      case 'SILVER_GLITCH':
        return 'border-slate-300 bg-slate-800/60 text-slate-100 shadow-[0_0_15px_rgba(203,213,225,0.3)]';
      case 'MUTED_GHOST':
        return 'border-slate-500 bg-slate-900/40 text-slate-300';
    }
  };

  return (
    <div className="w-full space-y-2.5 font-mono">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase">
          🏆 TROPHY CASE OF SHAME // NARRATIVE BADGES
        </span>
        <span className="text-[9px] text-slate-500">TAP FOR RECEIPT</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            className={`cursor-pointer p-2.5 rounded-xl border-2 flex items-center gap-2.5 transition active:scale-95 ${getThemeClass(
              badge.theme,
              badge.isEarned
            )}`}
          >
            <div className="text-xl flex-shrink-0">{badge.icon}</div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-black truncate">{badge.name}</p>
              <p className="text-[9px] opacity-80 truncate">{badge.isEarned ? 'EARNED' : 'LOCKED'}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedBadge && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl space-y-1.5 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="font-black text-white flex items-center gap-1.5">
              <span>{selectedBadge.icon}</span>
              <span>{selectedBadge.name}</span>
            </span>
            <button
              onClick={() => setSelectedBadge(null)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] font-sans text-slate-300">{selectedBadge.description}</p>
          <div className="pt-1 border-t border-slate-800 flex justify-between text-[10px] text-cyan-400">
            <span>CRITERIA:</span>
            <span>{selectedBadge.criteriaDescription}</span>
          </div>
        </div>
      )}
    </div>
  );
};
