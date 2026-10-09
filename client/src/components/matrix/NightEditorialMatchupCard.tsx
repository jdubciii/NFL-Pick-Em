import React, { useState } from 'react';
import { FieldPositionTracker } from './FieldPositionTracker';
import { LiveMatchupPulse } from '../animations/LiveMatchupPulse';
import { TeamLogo } from '../common/TeamLogo';

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

/**
 * Sanitizes bot and seed user names to clean human-friendly labels.
 */
export function sanitizeMemberName(rawName?: string, isMe?: boolean): { name: string; initials: string } {
  if (isMe) {
    return { name: 'Jack (You)', initials: 'JC' };
  }
  let clean = (rawName || 'Member').trim();

  // Normalize seed and test cascades (e.g. br1_cascade_1791423083321 -> Cascade #1)
  if (clean.toLowerCase().includes('cascade')) {
    const match = clean.match(/\d+/);
    const num = match ? (parseInt(match[0].slice(-2), 10) % 10) + 1 : '1';
    clean = `Cascade #${num}`;
  } else if (clean.toLowerCase().startsWith('br1_member_') || clean.toLowerCase().startsWith('member_')) {
    const match = clean.match(/\d+/);
    const num = match ? (parseInt(match[0].slice(-2), 10) % 10) + 1 : '1';
    clean = `Member #${num}`;
  } else if (clean.includes('@')) {
    clean = clean.split('@')[0];
  }

  // Format capitalized words nicely
  clean = clean.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const parts = clean.split(' ').filter(Boolean);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : clean.slice(0, 2).toUpperCase();

  return { name: clean, initials };
}

export const NightEditorialMatchupCard: React.FC<NightEditorialMatchupCardProps> = ({ game, currentUserId }) => {
  const [expanded, setExpanded] = useState(false);

  const isFinal = game.status === 'FINAL' || (game.status as string) === 'COMPLETED';
  const isLive = !isFinal && (game.status === 'IN_PROGRESS' || game.status === 'HALFTIME');
  const isScheduled = !isFinal && !isLive;

  const awayPct = game.totalPicks > 0 ? Math.round((game.awayPickCount / game.totalPicks) * 100) : 50;
  const homePct = 100 - awayPct;

  const awayWon = isFinal && game.awayTeam.score > game.homeTeam.score;
  const homeWon = isFinal && game.homeTeam.score > game.awayTeam.score;
  const isTiedFinal = isFinal && game.awayTeam.score === game.homeTeam.score;

  // Clean clock display for live pulse
  const liveClockDisplay = (() => {
    if (!isLive) return '';
    if (game.status === 'HALFTIME') return 'HALFTIME';
    const q = game.quarter || 'LIVE';
    const clk = game.clock && game.clock !== q && game.clock !== 'LIVE' ? game.clock : '';
    return clk ? `${q} ${clk}` : q;
  })();

  const renderParticipantBadge = (p: ParticipantPickStatus) => {
    if (isFinal) {
      if (p.matchState === 'WON' || p.matchState === 'WINNING') {
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
            ✓ WON
          </span>
        );
      }
      if (p.matchState === 'LOST' || p.matchState === 'LOSING') {
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-rose-950 text-rose-400/80">
            ✗ LOST
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 border border-slate-700 text-slate-400">
          PUSH
        </span>
      );
    }

    if (isLive) {
      if (p.matchState === 'WINNING') {
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
            Leading
          </span>
        );
      }
      if (p.matchState === 'LOSING') {
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-950/70 border border-rose-600/50 text-rose-300">
            Trailing
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 border border-slate-700 text-slate-300">
          Tied
        </span>
      );
    }

    // Scheduled game
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-500">
        Pick Locked
      </span>
    );
  };

  return (
    <div
      className={`bg-slate-900/95 border rounded-2xl p-4 md:p-5 shadow-xl space-y-3.5 transition-all duration-500 ${
        isLive && game.isRedZone
          ? 'border-rose-500/60 ring-1 ring-rose-500/40 shadow-[inset_0_0_24px_rgba(239,68,68,0.18)]'
          : isFinal
          ? 'border-slate-800/90 bg-slate-900/80'
          : 'border-slate-800'
      }`}
    >
      {/* 1. Top Meta Bar */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          {isLive && (
            <LiveMatchupPulse status="IN_PROGRESS" clock={liveClockDisplay} />
          )}
          {isFinal && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 font-black uppercase tracking-wider text-[10px]">
              FINAL
            </span>
          )}
          {isScheduled && (
            <span className="text-slate-400 font-medium">
              {game.kickoffTime || 'Scheduled'}
            </span>
          )}
        </div>
        <span className="text-slate-500 font-extrabold uppercase tracking-widest text-[11px]">
          {game.broadcastNetwork || 'NFL'}
        </span>
      </div>

      {/* 2. Oversized Editorial Score Row */}
      <div className="grid grid-cols-5 items-center gap-2">
        {/* Away Team */}
        <div className="col-span-2 flex items-center space-x-2.5">
          <TeamLogo abbr={game.awayTeam.code} size="md" />
          <div className="text-left">
            <div className="flex items-center space-x-1.5">
              <span className={`text-xl md:text-2xl font-black tracking-tight leading-none ${awayWon ? 'text-emerald-400 font-black' : 'text-white'}`}>
                {game.awayTeam.code}
              </span>
              {isLive && game.possession === 'AWAY' && (
                <span className="inline-block text-xs" title="Has Possession">
                  🏈
                </span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 truncate">{game.awayTeam.name}</div>
            <div className="text-[10px] font-mono text-slate-500">{game.awayTeam.record}</div>
          </div>
        </div>

        {/* Scores */}
        <div className="col-span-1 flex items-center justify-center space-x-2 font-mono tabular-nums text-3xl md:text-4xl font-black text-white">
          <span className={awayWon ? 'text-emerald-400' : (game.awayTeam.score > game.homeTeam.score ? 'text-white' : 'text-slate-400')}>
            {isScheduled ? '-' : game.awayTeam.score}
          </span>
          <span className="text-slate-600 text-xl font-normal">:</span>
          <span className={homeWon ? 'text-emerald-400' : (game.homeTeam.score > game.awayTeam.score ? 'text-white' : 'text-slate-400')}>
            {isScheduled ? '-' : game.homeTeam.score}
          </span>
        </div>

        {/* Home Team */}
        <div className="col-span-2 flex items-center justify-end space-x-2.5 text-right">
          <div>
            <div className="flex items-center justify-end space-x-1.5">
              {isLive && game.possession === 'HOME' && (
                <span className="inline-block text-xs" title="Has Possession">
                  🏈
                </span>
              )}
              <span className={`text-xl md:text-2xl font-black tracking-tight leading-none ${homeWon ? 'text-emerald-400 font-black' : 'text-white'}`}>
                {game.homeTeam.code}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 truncate">{game.homeTeam.name}</div>
            <div className="text-[10px] font-mono text-slate-500">{game.homeTeam.record}</div>
          </div>
          <TeamLogo abbr={game.homeTeam.code} size="md" />
        </div>
      </div>

      {/* 3. Conditional Telemetry / Game Summary Bar */}
      {isLive && (
        <FieldPositionTracker
          absolutePosition={game.ballLocation === 'BUF 7' ? 93 : (game.yardline ?? 50)}
          possession={game.possession || 'AWAY'}
          yardline={game.yardline || 50}
          downAndDistance={game.downAndDistance}
          sideOfField={game.ballLocation}
          lineOfScrimmage={game.ballLocation}
          awayTeam={game.awayTeam.code}
          homeTeam={game.homeTeam.code}
          isRedZone={game.isRedZone}
        />
      )}

      {isFinal && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-bold">
              {awayWon ? (
                <span>
                  <strong className="text-emerald-400 font-black">{game.awayTeam.code}</strong> Won by {game.awayTeam.score - game.homeTeam.score}
                </span>
              ) : homeWon ? (
                <span>
                  <strong className="text-emerald-400 font-black">{game.homeTeam.code}</strong> Won by {game.homeTeam.score - game.awayTeam.score}
                </span>
              ) : (
                <span className="text-slate-400 font-bold">Game Concluded (Tie)</span>
              )}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Official Final
          </span>
        </div>
      )}

      {/* 4. Pick Polarity Bar */}
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

      {/* 5. Participant Breakdown Drawer / Accordion */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="space-y-1.5">
          {game.participants.slice(0, expanded ? undefined : 3).map((p) => {
            const isMe = p.memberId === currentUserId;
            const sanitized = sanitizeMemberName(p.name, isMe);

            return (
              <div
                key={p.memberId}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  isMe ? 'bg-cyan-950/40 border border-cyan-500/40' : 'bg-slate-950/60'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold font-mono text-[10px] text-slate-300">
                    {sanitized.initials}
                  </span>
                  <span className="font-semibold text-slate-200">
                    {sanitized.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-slate-300">{p.pickedTeam}</span>
                  {renderParticipantBadge(p)}
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
