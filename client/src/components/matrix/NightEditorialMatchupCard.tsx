import React, { useState } from 'react';
import { FieldPositionTracker } from './FieldPositionTracker';
import { LiveMatchupPulse } from '../animations/LiveMatchupPulse';

export interface ParticipantPickStatus {
  memberId: string;
  name: string;
  initials: string;
  pickedTeam: string;
  matchState: 'WINNING' | 'LOSING' | 'TIED' | 'WON' | 'LOST' | 'PENDING';
}

export interface EditorialMatchupData {
  gameId: string;
  awayTeam: { code: string; name: string; record: string; score: number; logoUrl?: string };
  homeTeam: { code: string; name: string; record: string; score: number; logoUrl?: string };
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL';
  quarter?: string; // 'Q4'
  clock?: string;   // '06:42'
  downAndDistance?: string; // '3rd & 8'
  ballLocation?: string;    // 'KC 28'
  yardline?: number;        // 28
  possession?: 'HOME' | 'AWAY';
  isRedZone?: boolean;
  broadcastNetwork?: string; // 'CBS', 'FOX', 'NBC'
  kickoffTime?: string;
  awayPickCount: number;
  homePickCount: number;
  totalPicks: number;
  participants: ParticipantPickStatus[];
}

interface NightEditorialMatchupCardProps {
  game: EditorialMatchupData;
  currentUserId?: string;
}

export const NightEditorialMatchupCard: React.FC<NightEditorialMatchupCardProps> = ({ game, currentUserId }) => {
  const [expanded, setExpanded] = useState(false);
  const awayPct = game.totalPicks > 0 ? Math.round((game.awayPickCount / game.totalPicks) * 100) : 50;
  const homePct = 100 - awayPct;

  return (
    <div className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl space-y-3.5 transition-all duration-500 ${game.isRedZone ? "ring-1 ring-rose-500/40 shadow-[inset_0_0_24px_rgba(239,68,68,0.18)]" : ""}`}>
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          {game.status === 'IN_PROGRESS' && (
            <LiveMatchupPulse status="IN_PROGRESS" clock={`${game.quarter || 'LIVE'} ${game.clock || ''}`} />
          )}
          {game.status === 'FINAL' && (
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              FINAL
            </span>
          )}
          {game.status === 'SCHEDULED' && (
            <span className="text-slate-400 font-medium">
              {game.kickoffTime || 'Scheduled'}
            </span>
          )}
        </div>
        <span className="text-slate-500 font-extrabold uppercase tracking-widest text-[11px]">
          {game.broadcastNetwork || 'NFL'}
        </span>
      </div>

      {/* Oversized Editorial Score Row */}
      <div className="grid grid-cols-5 items-center gap-2">
        {/* Away Team */}
        <div className="col-span-2 flex items-center space-x-2.5">
          <div className="text-left">
            <div className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
              {game.awayTeam.code}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 truncate">{game.awayTeam.name}</div>
            <div className="text-[10px] font-mono text-slate-500">{game.awayTeam.record}</div>
          </div>
        </div>

        {/* Scores */}
        <div className="col-span-1 flex items-center justify-center space-x-2 font-mono tabular-nums text-3xl md:text-4xl font-black text-white">
          <span className={game.awayTeam.score > game.homeTeam.score ? 'text-white' : 'text-slate-400'}>
            {game.status === 'SCHEDULED' ? '-' : game.awayTeam.score}
          </span>
          <span className="text-slate-600 text-xl font-normal">:</span>
          <span className={game.homeTeam.score > game.awayTeam.score ? 'text-white' : 'text-slate-400'}>
            {game.status === 'SCHEDULED' ? '-' : game.homeTeam.score}
          </span>
        </div>

        {/* Home Team */}
        <div className="col-span-2 flex items-center justify-end space-x-2.5 text-right">
          <div>
            <div className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
              {game.homeTeam.code}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 truncate">{game.homeTeam.name}</div>
            <div className="text-[10px] font-mono text-slate-500">{game.homeTeam.record}</div>
          </div>
        </div>
      </div>

      {/* Field Position Drive Tracker (Concept 01 + Concept 03 Hybrid) */}
      {game.status === 'IN_PROGRESS' && (
        <FieldPositionTracker
          possession={game.possession || 'AWAY'}
          yardline={game.yardline || 50}
          downAndDistance={game.downAndDistance}
          sideOfField={game.ballLocation}
          isRedZone={game.isRedZone}
        />
      )}

      {/* Pick Polarity Bar */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-[11px] font-mono font-bold">
          <span className="text-cyan-400">{game.awayPickCount} / {game.totalPicks} picked {game.awayTeam.code} ({awayPct}%)</span>
          <span className="text-rose-400">{game.homePickCount} / {game.totalPicks} picked {game.homeTeam.code} ({homePct}%)</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
          <div style={{ width: `${awayPct}%` }} className="bg-cyan-500 transition-all duration-500" />
          <div style={{ width: `${homePct}%` }} className="bg-rose-500 transition-all duration-500" />
        </div>
      </div>

      {/* Participant Breakdown Drawer / Accordion */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="space-y-1.5">
          {game.participants.slice(0, expanded ? undefined : 3).map((p) => {
            const isLeading = p.matchState === 'WINNING' || p.matchState === 'WON';
            const isMe = p.memberId === currentUserId;

            return (
              <div
                key={p.memberId}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  isMe ? 'bg-cyan-950/40 border border-cyan-500/40' : 'bg-slate-950/60'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold font-mono text-[10px] text-slate-300">
                    {p.initials}
                  </span>
                  <span className="font-semibold text-slate-200">{p.name} {isMe && '(You)'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-slate-300">{p.pickedTeam}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                      isLeading
                        ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-800/90 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {isLeading ? 'Leading' : 'Trailing'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {game.participants.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 py-1.5 mt-1 transition-colors"
          >
            {expanded ? '▲ Show Less' : `+ ${game.participants.length - 3} more participants ▼`}
          </button>
        )}
      </div>
    </div>
  );
};
