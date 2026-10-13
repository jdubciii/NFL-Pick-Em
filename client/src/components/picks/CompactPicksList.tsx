import React from 'react';
import { TeamLogo } from '../common/TeamLogo';

export interface CompactGameRow {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  kickoffTime: string;
  isLocked: boolean;
  spread?: string;
  gameStatus?: 'FINAL' | 'LIVE' | 'SCHEDULED';
  homeScore?: number | null;
  awayScore?: number | null;
  displayClock?: string;
  periodLabel?: string;
}

interface CompactPicksListProps {
  games: CompactGameRow[];
  selectedPicks: Record<string, string>;
  onSelectTeam: (gameId: string, team: string) => void;
  onLockedClick?: (game: CompactGameRow) => void;
  isPicksProtected?: boolean;
}

export const CompactPicksList: React.FC<CompactPicksListProps> = ({
  games,
  selectedPicks,
  onSelectTeam,
  onLockedClick,
  isPicksProtected = false,
}) => {
  return (
    <div className="space-y-2 pb-24 relative">
      {games.map((g) => {
        const selected = selectedPicks[g.gameId];
        const isFinal = g.gameStatus === 'FINAL';
        const isLive = g.gameStatus === 'LIVE';

        // Winner determination for final games
        const winningTeam =
          isFinal && g.homeScore != null && g.awayScore != null
            ? g.homeScore > g.awayScore
              ? g.homeTeam
              : g.awayScore > g.homeScore
              ? g.awayTeam
              : null
            : null;

        const awayIsWin = isFinal && selected === g.awayTeam && winningTeam === g.awayTeam;
        const awayIsLoss = isFinal && selected === g.awayTeam && winningTeam !== null && winningTeam !== g.awayTeam;

        const homeIsWin = isFinal && selected === g.homeTeam && winningTeam === g.homeTeam;
        const homeIsLoss = isFinal && selected === g.homeTeam && winningTeam !== null && winningTeam !== g.homeTeam;

        const handleAwayClick = () => {
          if (g.isLocked) {
            onLockedClick?.(g);
          } else if (isPicksProtected) {
            onLockedClick?.(g);
          } else {
            onSelectTeam(g.gameId, g.awayTeam);
          }
        };

        const handleHomeClick = () => {
          if (g.isLocked) {
            onLockedClick?.(g);
          } else if (isPicksProtected) {
            onLockedClick?.(g);
          } else {
            onSelectTeam(g.gameId, g.homeTeam);
          }
        };

        return (
          <div
            key={g.gameId}
            className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow-sm text-xs font-mono"
          >
            {/* Away Team Select Button */}
            <button
              type="button"
              disabled={g.isLocked}
              onClick={handleAwayClick}
              className={`flex-1 py-2 px-3 rounded-lg border font-black transition-all flex items-center justify-between ${
                selected === g.awayTeam
                  ? isFinal
                    ? awayIsWin
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/50'
                      : awayIsLoss
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20 ring-1 ring-rose-500/50'
                      : 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                    : 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'bg-slate-950/80 border-slate-800 text-white'
              } ${
                g.isLocked
                  ? 'cursor-not-allowed opacity-75'
                  : isPicksProtected
                  ? 'cursor-default opacity-85 hover:border-slate-800'
                  : 'hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <TeamLogo abbr={g.awayTeam} size="xs" />
                <span>{g.awayTeam}</span>
              </div>
              {selected === g.awayTeam && (
                <div>
                  {isFinal ? (
                    awayIsWin ? (
                      <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">✔ WIN (+1)</span>
                    ) : awayIsLoss ? (
                      <span className="text-[10px] text-rose-400 font-bold whitespace-nowrap">✘ LOSS</span>
                    ) : (
                      <span>✓</span>
                    )
                  ) : (
                    <span>✓</span>
                  )}
                </div>
              )}
            </button>

            {/* Center Status Column */}
            <div className="px-3 flex flex-col items-center justify-center shrink-0 min-w-[95px] select-none text-center">
              {isFinal ? (
                <>
                  <span className="text-zinc-400 font-bold text-xs">FINAL</span>
                  <span className="text-zinc-200 text-xs font-mono font-bold">
                    {g.awayScore ?? 0} - {g.homeScore ?? 0}
                  </span>
                </>
              ) : isLive ? (
                <>
                  <span className="text-amber-400 font-bold text-xs animate-pulse">
                    LIVE • {g.displayClock || 'LIVE'}
                  </span>
                  <span className="text-amber-300 text-xs font-mono font-bold">
                    {g.awayScore ?? 0} - {g.homeScore ?? 0}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-slate-500 font-bold text-[10px]">@</span>
                  <span className="text-slate-400 text-[10px] font-mono whitespace-nowrap">
                    {g.kickoffTime}
                  </span>
                  {g.isLocked ? (
                    <span className="text-[9px] text-amber-400 font-semibold mt-0.5 whitespace-nowrap">
                      🔒 Locked
                    </span>
                  ) : isPicksProtected ? (
                    <span className="text-[9px] text-amber-400/80 font-semibold mt-0.5 whitespace-nowrap">
                      🔒 Protected
                    </span>
                  ) : null}
                </>
              )}
            </div>

            {/* Home Team Select Button */}
            <button
              type="button"
              disabled={g.isLocked}
              onClick={handleHomeClick}
              className={`flex-1 py-2 px-3 rounded-lg border font-black transition-all flex items-center justify-between ${
                selected === g.homeTeam
                  ? isFinal
                    ? homeIsWin
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/50'
                      : homeIsLoss
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20 ring-1 ring-rose-500/50'
                      : 'bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400'
                    : 'bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400'
                  : 'bg-slate-950/80 border-slate-800 text-white'
              } ${
                g.isLocked
                  ? 'cursor-not-allowed opacity-75'
                  : isPicksProtected
                  ? 'cursor-default opacity-85 hover:border-slate-800'
                  : 'hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <TeamLogo abbr={g.homeTeam} size="xs" />
                <span>{g.homeTeam}</span>
              </div>
              {selected === g.homeTeam && (
                <div>
                  {isFinal ? (
                    homeIsWin ? (
                      <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">✔ WIN (+1)</span>
                    ) : homeIsLoss ? (
                      <span className="text-[10px] text-rose-400 font-bold whitespace-nowrap">✘ LOSS</span>
                    ) : (
                      <span>✓</span>
                    )
                  ) : (
                    <span>✓</span>
                  )}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
