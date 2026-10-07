import React from 'react';
import { CohortChip, MemberPickStatus } from './CohortChip';
import { LiveMatchupPulse } from '../animations/LiveMatchupPulse';

export interface LiveMatchupProjection {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  kickoffUtc: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL';
  liveTelemetry: {
    homeScore: number;
    awayScore: number;
    quarter: string | null;
    clock: string | null;
    possession: 'HOME' | 'AWAY' | null;
    redzone: boolean;
  } | null;
  distribution: {
    homeCohort: MemberPickStatus[];
    awayCohort: MemberPickStatus[];
    totalPoolSize: number;
  };
  isLocked: boolean; // Enforces Decision #66
}

interface MatchupCardProps {
  projection: LiveMatchupProjection;
  currentUserId?: string;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ projection, currentUserId }) => {
  const { awayTeam, homeTeam, status, liveTelemetry, distribution, isLocked } = projection;
  const totalPicks = distribution.awayCohort.length + distribution.homeCohort.length;
  const awayPct = totalPicks > 0 ? Math.round((distribution.awayCohort.length / totalPicks) * 100) : 50;
  const homePct = 100 - awayPct;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header: Teams, Status, Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-base font-black text-white">{awayTeam}</span>
          <span className="text-xs text-slate-500 font-bold">@</span>
          <span className="text-base font-black text-white">{homeTeam}</span>
        </div>
        <div>
          {status === 'IN_PROGRESS' && (
            <LiveMatchupPulse status="IN_PROGRESS" clock={liveTelemetry?.clock || liveTelemetry?.quarter || 'LIVE'} />
          )}
          {status === 'FINAL' && (
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              FINAL
            </span>
          )}
          {status === 'SCHEDULED' && (
            <span className="text-[11px] font-medium text-slate-400">
              {new Date(projection.kickoffUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Live Score Display */}
      {liveTelemetry && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 rounded-lg border border-slate-800/80">
          <span className="font-mono text-lg font-black text-cyan-400">{liveTelemetry.awayScore}</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 font-mono">
            {liveTelemetry.quarter || 'LIVE'}
          </span>
          <span className="font-mono text-lg font-black text-indigo-400">{liveTelemetry.homeScore}</span>
        </div>
      )}

      {/* Decision #66 Anti-Peeking Masking or Polarity Feed */}
      {!isLocked ? (
        <div className="flex items-center justify-center p-3 bg-slate-950/60 rounded-lg border border-dashed border-amber-500/30 text-xs text-amber-400/90 font-medium">
          🔒 {distribution.totalPoolSize || 10} Picks Masked Until Kickoff
        </div>
      ) : (
        <>
          {/* Polarity Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono font-bold">
              <span className="text-cyan-400">{awayTeam} ({awayPct}%)</span>
              <span className="text-indigo-400">{homeTeam} ({homePct}%)</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div style={{ width: `${awayPct}%` }} className="bg-cyan-500 transition-all duration-500" />
              <div style={{ width: `${homePct}%` }} className="bg-indigo-500 transition-all duration-500" />
            </div>
          </div>

          {/* Member Cohort Lists */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
            <div className="flex flex-wrap gap-1">
              {distribution.awayCohort.map((m) => (
                <CohortChip key={m.memberId} status={m} isCurrentUser={m.memberId === currentUserId} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              {distribution.homeCohort.map((m) => (
                <CohortChip key={m.memberId} status={m} isCurrentUser={m.memberId === currentUserId} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
