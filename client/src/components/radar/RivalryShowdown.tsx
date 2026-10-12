import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  calculateRivalryShowdown,
  RivalryShowdownResult,
  BattlegroundGame,
} from '../../services/rivalryShowdownService';
import { LiveGame } from '../../services/liveScoreService';
import {
  UserStandingRef,
  SlateGame,
  UserPickItem,
  ProvisionalStanding,
} from '../../services/sweatProjectionService';

interface RivalryShowdownProps {
  currentUser: UserStandingRef;
  members: UserStandingRef[];
  standings: ProvisionalStanding[];
  games: SlateGame[];
  liveScores: LiveGame[];
  picks: UserPickItem[];
  selectedRivalId: string | null;
  onSelectRival: (rivalId: string) => void;
  onBackToLeague?: () => void;
}

export const RivalryShowdown: React.FC<RivalryShowdownProps> = ({
  currentUser,
  members,
  standings,
  games,
  liveScores,
  picks,
  selectedRivalId,
  onSelectRival,
}) => {
  // Available rivals (all members except current user)
  const availableRivals = useMemo(() => {
    return members.filter((m) => m.id !== currentUser.id);
  }, [members, currentUser.id]);

  // Determine active rival (default to closest competitor in standings)
  const activeRival = useMemo(() => {
    if (selectedRivalId) {
      const found = availableRivals.find((r) => r.id === selectedRivalId);
      if (found) return found;
    }
    // Find closest competitor in standings
    const userStanding = standings.find((s) => s.userId === currentUser.id);
    if (userStanding && availableRivals.length > 0) {
      const uRank = userStanding.provisionalRank;
      // Look for rank - 1 (ahead) or rank + 1 (behind)
      const closest = standings.find(
        (s) => s.userId !== currentUser.id && Math.abs(s.provisionalRank - uRank) === 1
      );
      if (closest) {
        const match = availableRivals.find((r) => r.id === closest.userId);
        if (match) return match;
      }
    }
    return availableRivals[0] || null;
  }, [selectedRivalId, availableRivals, standings, currentUser.id]);

  // Calculate rivalry showdown telemetry
  const showdown: RivalryShowdownResult | null = useMemo(() => {
    if (!activeRival) return null;
    return calculateRivalryShowdown(
      currentUser,
      activeRival,
      games,
      liveScores,
      picks,
      picks
    );
  }, [currentUser, activeRival, games, liveScores, picks]);

  // Lead Flipped Alert Tracking
  const prevLeadSignRef = useRef<number | null>(null);
  const [showLeadFlippedAlert, setShowLeadFlippedAlert] = useState<boolean>(false);

  useEffect(() => {
    if (!showdown) return;
    const currentSign = Math.sign(showdown.pointGap);

    if (prevLeadSignRef.current !== null && prevLeadSignRef.current !== currentSign) {
      // Sign flipped!
      setShowLeadFlippedAlert(true);
      const timer = setTimeout(() => setShowLeadFlippedAlert(false), 4000);
      return () => clearTimeout(timer);
    }

    prevLeadSignRef.current = currentSign;
  }, [showdown]);

  if (members.length <= 1 || availableRivals.length === 0 || !activeRival || !showdown) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 font-mono text-xs">
        Waiting for league members to join...
      </div>
    );
  }

  const { pointGap, userPoints, rivalPoints, statusText, battlegrounds, sharedPicks, duelDecider } = showdown;

  return (
    <div className="space-y-4 font-mono">
      {/* 1. Horizontal Rival Selector Carousel */}
      <div>
        <div className="flex items-center justify-between px-1 mb-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>SELECT RIVAL TO DUEL</span>
          <span>{availableRivals.length} COMPETITORS</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {availableRivals.map((rival) => {
            const isSelected = rival.id === activeRival.id;
            const rStanding = standings.find((s) => s.userId === rival.id);

            return (
              <button
                key={rival.id}
                onClick={() => onSelectRival(rival.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-950 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {rStanding && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-slate-400">
                    #{rStanding.provisionalRank}
                  </span>
                )}
                <span className="truncate max-w-[110px]">{rival.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. "Lead Flipped" Alert Banner */}
      {showLeadFlippedAlert && (
        <div className="p-3 rounded-2xl bg-amber-950 border-2 border-amber-400 text-amber-200 text-xs font-black animate-pulse flex items-center justify-between shadow-glow-amber">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <span>LEAD FLIPPED! LIVE MOMENTUM SHIFT</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider">{statusText}</span>
        </div>
      )}

      {/* 3. Main Head-to-Head Duel Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 border-2 border-amber-500/50 shadow-xl">
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
              HEAD-TO-HEAD DUEL
            </span>
            <h2 className="text-sm font-black text-white">
              You vs. {activeRival.name}
            </h2>
          </div>

          {/* Signed Point Gap Delta */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider shadow-sm ${
              pointGap > 0
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 ring-1 ring-emerald-500/30'
                : pointGap < 0
                ? 'bg-rose-950/90 border-rose-400 text-rose-300 ring-1 ring-rose-500/30'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {pointGap > 0 ? `+${pointGap} Ahead` : pointGap < 0 ? `-${Math.abs(pointGap)} Chasing` : 'Level'}
          </div>
        </div>

        {/* Competitor Score Comparison Columns */}
        <div className="grid grid-cols-2 gap-3 text-center mb-3">
          {/* User Score Column */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-cyan-400 font-bold block mb-1">YOU</span>
            <p className="text-2xl font-black text-white">{userPoints.total}</p>
            <span className="text-[10px] text-slate-400 block mt-1">
              {userPoints.banked} banked · +{userPoints.live} live
            </span>
          </div>

          {/* Rival Score Column */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-amber-400 font-bold block mb-1 truncate">
              {activeRival.name.toUpperCase()}
            </span>
            <p className="text-2xl font-black text-white">{rivalPoints.total}</p>
            <span className="text-[10px] text-slate-400 block mt-1">
              {rivalPoints.banked} banked · +{rivalPoints.live} live
            </span>
          </div>
        </div>

        <div className="text-center pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-bold">
          Status: <span className="text-amber-300">{statusText}</span>
        </div>
      </div>

      {/* 4. Duel Decider Banner */}
      {duelDecider && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/60 shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-2">
            <span className="flex items-center gap-1.5">
              <span>🎯 DUEL DECIDER // HIGHEST LEVERAGE</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-500/60 text-amber-300 font-black">
              ±2 PTS NET SWING
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-white">{duelDecider.matchup}</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {duelDecider.quarterClock || duelDecider.currentStatus}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-cyan-300 font-bold">
                You: <strong>{duelDecider.userPick}</strong>
              </span>
              <span className="text-slate-500">vs</span>
              <span className="text-amber-300 font-bold">
                {activeRival.name.split(' ')[0]}: <strong>{duelDecider.rivalPick}</strong>
              </span>
            </div>
          </div>

          {/* Branch Arithmetic Display */}
          <p className="text-[11px] text-amber-200/95 italic px-1 font-sans">
            {duelDecider.branchOutcomes.description}
          </p>
        </div>
      )}

      {/* 5. Battleground Matchup List (Opposite Picks in Unfinished Games) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>ACTIVE BATTLEGROUNDS ({battlegrounds.length})</span>
          <span>OPPOSITE PICKS</span>
        </div>

        {battlegrounds.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
            No active battlegrounds remaining on the slate. All head-to-head matchups are either shared or finalized.
          </div>
        ) : (
          battlegrounds.map((bg) => (
            <div
              key={bg.gameId}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">{bg.matchup}</span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {bg.quarterClock || bg.currentStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">YOUR PICK</span>
                  <span className="font-black text-cyan-300">{bg.userPick}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{activeRival.name.split(' ')[0].toUpperCase()}</span>
                  <span className="font-black text-amber-300">{bg.rivalPick}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1.5 flex items-center justify-between">
                <span>Branch Impact:</span>
                <span className="text-amber-200 font-medium">
                  {bg.branchOutcomes.description}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 6. Shared Picks (Neutralized Leverage) */}
      {sharedPicks.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>SHARED PICKS ({sharedPicks.length})</span>
            <span>ZERO GAP LEVERAGE</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1 text-xs">
            {sharedPicks.map((sp) => (
              <div key={sp.gameId} className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>{sp.matchup}</span>
                <span className="text-slate-300 font-bold">
                  Both picked <strong className="text-white">{sp.selectedTeam}</strong> ({sp.status})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RivalryShowdown;
