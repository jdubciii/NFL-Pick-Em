import React, { useState } from 'react';
import { calculateWeeklyStandings, MemberWeeklyStat } from '../../services/WeeklyStandingsEngine';

interface WeeklyLeaderboardCardProps {
  currentWeek?: number;
  initialWeek?: number;
}

export const WeeklyLeaderboardCard: React.FC<WeeklyLeaderboardCardProps> = ({
  currentWeek = 5,
  initialWeek = 5
}) => {
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const isFinalized = selectedWeek < currentWeek;

  const sampleWeekData: Record<number, { memberId: string; name: string; correct: number; incorrect: number; pending: number; totalGames: number }[]> = {
    5: [
      { memberId: 'm1', name: 'Jake S.', correct: 11, incorrect: 2, pending: 2, totalGames: 15 },
      { memberId: 'm2', name: 'Matt B.', correct: 10, incorrect: 3, pending: 2, totalGames: 15 },
      { memberId: 'm3', name: 'Maria D.', correct: 10, incorrect: 3, pending: 2, totalGames: 15 },
      { memberId: 'm4', name: 'Alex L.', correct: 9, incorrect: 4, pending: 2, totalGames: 15 },
      { memberId: 'm5', name: 'Justin B.', correct: 8, incorrect: 5, pending: 2, totalGames: 15 },
      { memberId: 'm6', name: 'Nick S.', correct: 8, incorrect: 5, pending: 2, totalGames: 15 },
      { memberId: 'm7', name: 'Adam B.', correct: 7, incorrect: 6, pending: 2, totalGames: 15 },
      { memberId: 'm8', name: 'Mike C.', correct: 6, incorrect: 7, pending: 2, totalGames: 15 },
      { memberId: 'm9', name: 'Rich B.', correct: 5, incorrect: 8, pending: 2, totalGames: 15 },
      { memberId: 'm10', name: 'Big Jack', correct: 3, incorrect: 10, pending: 2, totalGames: 15 },
    ],
    4: [
      { memberId: 'm2', name: 'Matt B.', correct: 13, incorrect: 3, pending: 0, totalGames: 16 },
      { memberId: 'm1', name: 'Jake S.', correct: 12, incorrect: 4, pending: 0, totalGames: 16 },
      { memberId: 'm3', name: 'Maria D.', correct: 11, incorrect: 5, pending: 0, totalGames: 16 },
      { memberId: 'm4', name: 'Alex L.', correct: 10, incorrect: 6, pending: 0, totalGames: 16 },
      { memberId: 'm7', name: 'Adam B.', correct: 9, incorrect: 7, pending: 0, totalGames: 16 },
      { memberId: 'm6', name: 'Nick S.', correct: 9, incorrect: 7, pending: 0, totalGames: 16 },
      { memberId: 'm8', name: 'Mike C.', correct: 8, incorrect: 8, pending: 0, totalGames: 16 },
      { memberId: 'm5', name: 'Justin B.', correct: 7, incorrect: 9, pending: 0, totalGames: 16 },
      { memberId: 'm9', name: 'Rich B.', correct: 6, incorrect: 10, pending: 0, totalGames: 16 },
      { memberId: 'm10', name: 'Big Jack', correct: 5, incorrect: 11, pending: 0, totalGames: 16 },
    ]
  };

  const rawData = sampleWeekData[selectedWeek] || sampleWeekData[5];
  const standings = calculateWeeklyStandings(rawData, isFinalized);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl text-white font-mono space-y-4">
      {/* Header Bar with Week Switcher & Live/Finalized Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-black uppercase text-slate-100 flex items-center space-x-2">
            <span>🏆 Week {selectedWeek} Standings & Penalty Exposure</span>
          </h3>
          <span className="text-[10px] text-slate-400">Tiered penalty ladder for 10-person pool</span>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-cyan-400"
          >
            {[1, 2, 3, 4, 5].map((w) => (
              <option key={w} value={w}>Week {w} {w === currentWeek ? '(Live)' : ''}</option>
            ))}
          </select>

          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
            isFinalized ? 'bg-slate-800 text-slate-400' : 'bg-rose-950 text-rose-400 border border-rose-500/40 animate-pulse'
          }`}>
            {isFinalized ? '✔ Finalized' : '● Live Projected'}
          </span>
        </div>
      </div>

      {/* Standings Table Rows */}
      <div className="space-y-1.5 text-xs">
        {standings.map((s) => {
          let rowStyle = 'bg-slate-950/70 border-slate-800';
          let badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700';

          if (s.tier === 'SAFE') {
            rowStyle = 'bg-emerald-950/20 border-emerald-500/30';
            badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-500/60 font-black shadow-sm';
          } else if (s.tier === 'DANGER') {
            rowStyle = 'bg-amber-950/25 border-amber-500/40';
            badgeStyle = 'bg-amber-950/90 text-amber-300 border-amber-500/70 font-black shadow-sm';
          } else if (s.tier === 'DEAD_PLACE') {
            rowStyle = 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/40 animate-pulse';
            badgeStyle = 'bg-rose-950 text-rose-300 border-rose-500 font-black shadow-md';
          }

          return (
            <div
              key={s.memberId}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${rowStyle}`}
            >
              <div className="flex items-center space-x-2.5 min-w-[120px]">
                <span className={`w-6 text-center font-black ${
                  s.rank === 1 ? 'text-emerald-400' : s.tier === 'DANGER' ? 'text-amber-400' : s.tier === 'DEAD_PLACE' ? 'text-rose-400' : 'text-slate-500'
                }`}>
                  #{s.rank}
                </span>
                <span className="font-bold text-white truncate">{s.name}</span>
              </div>

              <div className="flex items-center space-x-3 tabular-nums">
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-emerald-400 font-bold">{s.correct}W</span>
                    <span className="text-slate-600">-</span>
                    <span className="text-rose-400 font-bold">{s.incorrect}L</span>

                    {/* Compact Pending Micro-Pill during live slates */}
                    {!isFinalized && s.pending > 0 && (
                      <span className="text-cyan-400 text-[10px] font-bold bg-cyan-950/70 border border-cyan-800/60 px-1 py-0.2 rounded ml-1 shrink-0">
                        {s.pending} live
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {s.winPercentage}% {isFinalized ? `(${s.correct}/${s.totalGames})` : `decided`}
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded-md border text-[10px] tracking-wide shrink-0 text-center min-w-[95px] ${badgeStyle}`}>
                  {isFinalized ? s.finalizedLabel : s.projectedLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
