import React from 'react';
import { TeamLogo } from '../common/TeamLogo';
import { areTeamIdentitiesEquivalent } from '../../services/dependableInfoService';

export interface CompactGameRow {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  kickoffTime: string;
  isLocked: boolean;
  spread?: string;
  favoriteLine?: string | null;
  awayRecord?: string | null;
  homeRecord?: string | null;
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

        const awaySelected = areTeamIdentitiesEquivalent(selected, g.awayTeam);
        const homeSelected = areTeamIdentitiesEquivalent(selected, g.homeTeam);

        const awayIsWin = isFinal && awaySelected && areTeamIdentitiesEquivalent(winningTeam, g.awayTeam);
        const awayIsLoss = isFinal && awaySelected && winningTeam !== null && !areTeamIdentitiesEquivalent(winningTeam, g.awayTeam);

        const homeIsWin = isFinal && homeSelected && areTeamIdentitiesEquivalent(winningTeam, g.homeTeam);
        const homeIsLoss = isFinal && homeSelected && winningTeam !== null && !areTeamIdentitiesEquivalent(winningTeam, g.homeTeam);

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

        const awayIsCyan = awaySelected && (!isFinal || (!awayIsWin && !awayIsLoss));
        const homeIsPurple = homeSelected && (!isFinal || (!homeIsWin && !homeIsLoss));

        return (
          <div
            key={g.gameId}
            className="flex items-center justify-between px-2 py-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow-sm text-xs font-mono min-w-0"
          >
            {/* Away Team Select Button */}
            <button
              type="button"
              disabled={g.isLocked}
              onClick={handleAwayClick}
              className={`flex-1 min-w-0 py-2 px-2 rounded-lg border font-black transition-all flex flex-col items-start justify-center ${
                awaySelected
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
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <TeamLogo abbr={g.awayTeam} size="xs" />
                  <span>{g.awayTeam}</span>
                </div>
                {awaySelected && (
                  <div className="shrink-0">
                    {isFinal ? (
                      awayIsWin ? (
                        <span className="text-xs text-emerald-400 font-bold whitespace-nowrap">✔ WIN (+1)</span>
                      ) : awayIsLoss ? (
                        <span className="text-xs text-rose-400 font-bold whitespace-nowrap">✘ LOSS</span>
                      ) : (
                        <span className={`ml-2 font-bold ${awayIsCyan ? 'text-slate-950' : 'text-slate-100'}`}>✓</span>
                      )
                    ) : (
                      <span className={`ml-2 font-bold ${awayIsCyan ? 'text-slate-950' : 'text-slate-100'}`}>✓</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 whitespace-nowrap mt-0.5">
                <span className={`text-xs uppercase tracking-wider ${awayIsCyan ? 'text-slate-950 font-black' : 'text-slate-300 font-bold'}`}>
                  AWAY
                </span>
                {g.awayRecord ? (
                  <span className={`text-xs whitespace-nowrap shrink-0 ${awayIsCyan ? 'text-slate-950 font-bold' : 'text-slate-300 opacity-70'}`}>
                    {g.awayRecord}
                  </span>
                ) : null}
              </div>
            </button>

            {/* Center Status Column */}
            <div className="px-2 flex flex-col items-center justify-center shrink-0 min-w-[88px] select-none text-center">
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
                  <span className="text-slate-200 font-bold text-xs">@</span>
                  <span className="text-slate-100 text-xs font-mono font-bold whitespace-nowrap bg-zinc-800 px-1.5 py-0.5 rounded">
                    {g.kickoffTime}
                  </span>
                  {g.favoriteLine ? (
                    <span className="text-slate-300 text-xs font-mono font-bold whitespace-nowrap">
                      {g.favoriteLine}
                    </span>
                  ) : null}
                  {g.isLocked ? (
                    <span className="text-xs text-amber-400 font-semibold mt-0.5 whitespace-nowrap">
                      🔒 Locked
                    </span>
                  ) : isPicksProtected ? (
                    <span className="text-xs text-amber-400/80 font-semibold mt-0.5 whitespace-nowrap">
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
              className={`flex-1 min-w-0 py-2 px-2 rounded-lg border font-black transition-all flex flex-col items-start justify-center ${
                homeSelected
                  ? isFinal
                    ? homeIsWin
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/50'
                      : homeIsLoss
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20 ring-1 ring-rose-500/50'
                      : 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                    : 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                  : 'bg-slate-950/80 border-slate-800 text-white'
              } ${
                g.isLocked
                  ? 'cursor-not-allowed opacity-75'
                  : isPicksProtected
                  ? 'cursor-default opacity-85 hover:border-slate-800'
                  : 'hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <TeamLogo abbr={g.homeTeam} size="xs" />
                  <span>{g.homeTeam}</span>
                </div>
                {homeSelected && (
                  <div className="shrink-0">
                    {isFinal ? (
                      homeIsWin ? (
                        <span className="text-xs text-emerald-400 font-bold whitespace-nowrap">✔ WIN (+1)</span>
                      ) : homeIsLoss ? (
                        <span className="text-xs text-rose-400 font-bold whitespace-nowrap">✘ LOSS</span>
                      ) : (
                        <span className="ml-2 font-bold text-white">✓</span>
                      )
                    ) : (
                      <span className="ml-2 font-bold text-white">✓</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 whitespace-nowrap mt-0.5">
                <span className={`text-xs uppercase tracking-wider ${homeIsPurple ? 'text-white font-bold' : 'text-slate-300 font-bold'}`}>
                  HOME
                </span>
                {g.homeRecord ? (
                  <span className={`text-xs whitespace-nowrap shrink-0 ${homeIsPurple ? 'text-purple-200 font-bold' : 'text-slate-300 opacity-70'}`}>
                    {g.homeRecord}
                  </span>
                ) : null}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};
