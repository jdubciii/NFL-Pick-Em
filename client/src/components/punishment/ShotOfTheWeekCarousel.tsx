import React from 'react';
import type { PenaltySubmission } from '../../services/punishmentFsmService';

interface ShotOfTheWeekCarouselProps {
  hallOfFameSubmissions: PenaltySubmission[];
  onSelectSubmission: (id: string) => void;
}

export const ShotOfTheWeekCarousel: React.FC<ShotOfTheWeekCarouselProps> = ({
  hallOfFameSubmissions,
  onSelectSubmission
}) => {
  if (hallOfFameSubmissions.length === 0) return null;

  return (
    <div className="w-full mb-2 font-mono">
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1">
          <span>🏆</span> SHOT OF THE WEEK PENTHOUSE
        </span>
        <span className="text-[9px] text-amber-300 font-bold">&gt;5 NOMINATIONS</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
        {hallOfFameSubmissions.map((sub) => (
          <div
            key={sub.id}
            onClick={() => onSelectSubmission(sub.id)}
            className="flex-shrink-0 w-36 h-24 rounded-xl bg-slate-900 border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)] p-2 cursor-pointer flex flex-col justify-between snap-start transition hover:scale-105"
          >
            <div className="flex justify-between items-center text-[9px] text-amber-300 font-black">
              <span>W{sub.weekNumber}</span>
              <span>{sub.nominations.length} 🏆</span>
            </div>
            <div className="text-center">
              <span className="text-xl">🍸</span>
              <p className="text-[10px] text-white font-extrabold truncate">{sub.userName}</p>
            </div>
            <p className="text-[8px] text-amber-300 text-center uppercase tracking-wider font-bold">
              WEEK {sub.weekNumber} WINNER
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
