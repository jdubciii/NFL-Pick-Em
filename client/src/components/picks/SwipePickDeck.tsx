import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { TeamLogo } from '../common/TeamLogo';
import { NFL_TEAMS } from '../../utils/teamAssets';

export interface SwipeMatchup {
  id: string;
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  awayScore?: number;
  homeScore?: number;
  isLive?: boolean;
  gameStatus?: string;
  possession?: string;
  inRedZone?: boolean;
  startTime: string;
  spread?: string;
  overUnder?: string;
  venue?: string;
  injuryNote?: string;
  selectedTeam?: string | null;
  isLocked?: boolean;
}

interface ToastState {
  id: number;
  message: string;
  type: 'AWAY' | 'HOME' | 'SKIP' | 'CLEAR';
  team?: string;
}

interface SwipePickDeckProps {
  matchups: SwipeMatchup[];
  onSelectPick: (gameId: string, team: string) => void;
  onClearAllPicks?: () => void;
  isUserLocked: boolean;
}

export const SwipePickDeck: React.FC<SwipePickDeckProps> = ({
  matchups,
  onSelectPick,
  onClearAllPicks,
  isUserLocked
}) => {
  const [showIntel, setShowIntel] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const getInitialIndex = () => {
    const firstUnpicked = matchups.findIndex(m => !m.selectedTeam);
    return firstUnpicked !== -1 ? firstUnpicked : 0;
  };

  const [currentIndex, setCurrentIndex] = useState<number>(getInitialIndex);

  useEffect(() => {
    if (currentIndex >= matchups.length && matchups.length > 0) {
      setCurrentIndex(0);
    }
  }, [matchups.length]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (confirmClear) {
      const timer = setTimeout(() => setConfirmClear(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmClear]);

  const triggerToast = (message: string, type: 'AWAY' | 'HOME' | 'SKIP' | 'CLEAR', team?: string) => {
    setToast({ id: Date.now(), message, type, team });
  };

  const activeCard = matchups[currentIndex] || matchups[0];

  const getNextUnpickedIndex = (fromIdx: number): number => {
    const total = matchups.length;
    if (total === 0) return 0;
    for (let i = fromIdx + 1; i < total; i++) {
      if (!matchups[i].selectedTeam) return i;
    }
    for (let i = 0; i < fromIdx; i++) {
      if (!matchups[i].selectedTeam) return i;
    }
    return (fromIdx + 1) % total;
  };

  const getPrevUnpickedIndex = (fromIdx: number): number => {
    const total = matchups.length;
    if (total === 0) return 0;
    for (let i = fromIdx - 1; i >= 0; i--) {
      if (!matchups[i].selectedTeam) return i;
    }
    for (let i = total - 1; i > fromIdx; i--) {
      if (!matchups[i].selectedTeam) return i;
    }
    return (fromIdx - 1 + total) % total;
  };

  const totalGames = matchups.length;
  const pickedCount = matchups.filter(m => !!m.selectedTeam).length;

  const handleCardExit = (direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (!activeCard || isUserLocked) return;

    if (direction === 'LEFT') {
      if (!activeCard.isLocked) {
        if (activeCard.selectedTeam !== activeCard.awayTeam) {
          onSelectPick(activeCard.gameId, activeCard.awayTeam);
        }
        triggerToast(`Picked ${activeCard.awayTeam}`, 'AWAY', activeCard.awayTeam);
      }
      setCurrentIndex(prev => getNextUnpickedIndex(prev));
    } else if (direction === 'RIGHT') {
      if (!activeCard.isLocked) {
        if (activeCard.selectedTeam !== activeCard.homeTeam) {
          onSelectPick(activeCard.gameId, activeCard.homeTeam);
        }
        triggerToast(`Picked ${activeCard.homeTeam}`, 'HOME', activeCard.homeTeam);
      }
      setCurrentIndex(prev => getNextUnpickedIndex(prev));
    } else if (direction === 'UP') {
      triggerToast('Skipped Matchup', 'SKIP');
      setCurrentIndex(prev => getNextUnpickedIndex(prev));
    } else if (direction === 'DOWN') {
      setShowIntel(true);
    }
  };

  const nextUnderCard = matchups[getNextUnpickedIndex(currentIndex)];

  if (!activeCard) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-900/90 border border-slate-800 rounded-3xl text-center space-y-3 font-mono shadow-2xl">
        <span className="text-4xl animate-bounce">🎉</span>
        <h4 className="text-sm font-black text-white uppercase tracking-wider">Slate Complete</h4>
        <p className="text-xs text-slate-400">All picks have been submitted.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center select-none font-mono">
      {/* Semantic Intent-Aligned Floating Toast Pill */}
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -18, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            className={`fixed top-14 z-50 pointer-events-none flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-black tracking-wide shadow-2xl backdrop-blur-xl ${
              toast.type === 'AWAY'
                ? 'bg-cyan-950/95 border-cyan-400 text-cyan-200 shadow-cyan-950/50'
                : toast.type === 'HOME'
                ? 'bg-rose-950/95 border-rose-400 text-rose-200 shadow-rose-950/50'
                : toast.type === 'SKIP'
                ? 'bg-amber-950/95 border-amber-400 text-amber-200 shadow-amber-950/50'
                : 'bg-red-950/95 border-red-500 text-red-200 shadow-red-950/50'
            }`}
          >
            {toast.type === 'AWAY' && <span className="text-cyan-400">◀</span>}
            {toast.type === 'HOME' && <span className="text-rose-400">▶</span>}
            {toast.type === 'SKIP' && <span>▲</span>}
            {toast.type === 'CLEAR' && <span>🗑️</span>}
            {toast.team && <TeamLogo abbr={toast.team} size="xs" className="!w-4 !h-4 !rounded" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stepper Progress Ledger Header */}
      <div className="w-full px-1 mb-2 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-black tracking-wide">
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <span>MATCHUP {currentIndex + 1} OF {totalGames}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px]">
            <span className="text-emerald-400 font-bold">{pickedCount} Picked</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{totalGames - pickedCount} Left</span>

            {/* Clear All Action */}
            {onClearAllPicks && !isUserLocked && pickedCount > 0 && (
              <>
                <span className="text-slate-500">·</span>
                {!confirmClear ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="text-rose-400 hover:text-rose-300 font-bold underline px-1 py-0.5"
                  >
                    Clear All
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllPicks();
                      setConfirmClear(false);
                      triggerToast('All picks reset', 'CLEAR');
                    }}
                    className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] animate-pulse shadow-md"
                  >
                    Confirm?
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* High-Visibility Ledger Bar with Prominent Isolated Touch Chevrons */}
        <div className="flex items-center space-x-2 w-full pt-0.5">
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => getPrevUnpickedIndex(prev))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 hover:text-white active:scale-90 transition-all shrink-0 text-sm font-black shadow-sm"
            title="Previous Unpicked"
          >
            ◀
          </button>

          <div className="grid grid-flow-col auto-cols-fr gap-1 flex-1 h-3.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800 items-center">
            {matchups.map((m, idx) => {
              const isCurrent = idx === currentIndex;
              const isAwayPicked = m.selectedTeam === m.awayTeam;
              const isHomePicked = m.selectedTeam === m.homeTeam;

              let segmentBg = 'bg-slate-800 hover:bg-slate-700';
              if (isAwayPicked) segmentBg = 'bg-cyan-400';
              else if (isHomePicked) segmentBg = 'bg-rose-500';

              return (
                <button
                  key={m.gameId || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-full w-full rounded transition-all ${segmentBg} ${
                    isCurrent
                      ? 'ring-2 ring-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] scale-110 z-10'
                      : 'opacity-80 active:scale-95'
                  }`}
                  title={`Matchup ${idx + 1}`}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCurrentIndex(prev => getNextUnpickedIndex(prev))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 hover:text-white active:scale-90 transition-all shrink-0 text-sm font-black shadow-sm"
            title="Next Unpicked"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Main Swipe Deck Container */}
      <div className="relative w-full h-[450px] flex items-center justify-center">
        {nextUnderCard && nextUnderCard.gameId !== activeCard.gameId && (
          <div
            className="absolute w-[92%] h-[405px] bg-slate-950/80 border border-slate-800 rounded-3xl p-5 shadow-xl scale-95 translate-y-3 opacity-50 blur-[0.5px] pointer-events-none flex flex-col justify-between"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>{nextUnderCard.startTime}</span>
              <span>UP NEXT</span>
            </div>
            <div className="flex items-center justify-around">
              <TeamLogo abbr={nextUnderCard.awayTeam} size="md" />
              <span className="text-slate-600 font-black">VS</span>
              <TeamLogo abbr={nextUnderCard.homeTeam} size="md" />
            </div>
            <div className="h-6" />
          </div>
        )}

        <AnimatePresence initial={false}>
          <SwipeCardItem
            key={activeCard.gameId}
            matchup={activeCard}
            onSwipe={handleCardExit}
            isUserLocked={isUserLocked}
            onOpenIntel={() => setShowIntel(true)}
          />
        </AnimatePresence>
      </div>

      {/* Matchup Intel Bottom Sheet */}
      <AnimatePresence>
        {showIntel && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-end justify-center select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIntel(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60 || info.velocity.y > 300) {
                  setShowIntel(false);
                }
              }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 pb-8 space-y-4 text-white font-mono shadow-2xl z-10 max-h-[82dvh] flex flex-col touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto -mt-1 cursor-grab active:cursor-grabbing shrink-0" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📊</span>
                  <h3 className="text-sm font-black uppercase text-cyan-400 tracking-wider">
                    Matchup Intel & Insights
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIntel(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs touch-pan-y">
                <div className="flex items-center justify-around p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <TeamLogo abbr={activeCard.awayTeam} size="sm" />
                    <span className="font-black text-sm">{activeCard.awayTeam}</span>
                  </div>
                  <span className="text-slate-600 font-black">@</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm">{activeCard.homeTeam}</span>
                    <TeamLogo abbr={activeCard.homeTeam} size="sm" />
                  </div>
                </div>

                <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Consensus Spread</span>
                  <span className="font-bold text-amber-300">{activeCard.spread || 'EVEN'}</span>
                </div>

                <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Over / Under</span>
                  <span className="font-bold text-emerald-400">{activeCard.overUnder || '44.5 PTS'}</span>
                </div>

                <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Venue & Conditions</span>
                  <span className="font-bold text-slate-200">{activeCard.venue || 'Outdoor · 68°F Clear'}</span>
                </div>

                <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-900/50 space-y-1">
                  <span className="text-[10px] text-rose-400 font-black uppercase block">Key Injury Intel</span>
                  <span className="text-slate-300 text-[11px] leading-relaxed block">
                    {activeCard.injuryNote || 'Both starting QBs active. Away team starting CB ruled OUT (hamstring).'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-center uppercase tracking-wider shrink-0">
                ↓ Drag down or tap ✕ to close
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SwipeCardItem: React.FC<{
  matchup: SwipeMatchup;
  onSwipe: (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => void;
  isUserLocked: boolean;
  onOpenIntel: () => void;
}> = ({ matchup, onSwipe, isUserLocked, onOpenIntel }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-16, 16]);

  const awayOpacity = useTransform(x, [-130, -40], [1, 0]);
  const homeOpacity = useTransform(x, [40, 130], [0, 1]);
  const skipOpacity = useTransform(y, [-110, -40], [1, 0]);

  const awayMeta = NFL_TEAMS[matchup.awayTeam];
  const homeMeta = NFL_TEAMS[matchup.homeTeam];

  return (
    <motion.div
      style={{ x, y, rotate, willChange: 'transform, opacity' }}
      drag={!isUserLocked}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.65}
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } }}
      onDragEnd={(_, info) => {
        if (isUserLocked) return;
        const absX = Math.abs(info.offset.x);
        const absY = Math.abs(info.offset.y);

        if (absX > absY) {
          if (info.offset.x < -110 || (info.offset.x < -60 && info.velocity.x < -500)) {
            onSwipe('LEFT');
          } else if (info.offset.x > 110 || (info.offset.x > 60 && info.velocity.x > 500)) {
            onSwipe('RIGHT');
          }
        } else {
          if (info.offset.y < -95 || (info.offset.y < -50 && info.velocity.y < -500)) {
            onSwipe('UP');
          } else if (info.offset.y > 75) {
            onOpenIntel();
          }
        }
      }}
      className={`absolute w-full h-[435px] bg-slate-900/95 border-2 rounded-3xl p-4 shadow-2xl flex flex-col justify-between backdrop-blur-2xl z-20 select-none ${
        isUserLocked ? 'border-amber-600/50 cursor-not-allowed' : 'border-slate-700/80 cursor-grab active:cursor-grabbing'
      }`}
    >
      {!isUserLocked && (
        <>
          <motion.div
            style={{ opacity: awayOpacity }}
            className="absolute top-6 left-5 px-3.5 py-1 rounded-2xl bg-cyan-950/95 border-2 border-cyan-400 text-cyan-300 font-black text-xs uppercase -rotate-12 z-30 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          >
            PICK {matchup.awayTeam} ◀
          </motion.div>

          <motion.div
            style={{ opacity: homeOpacity }}
            className="absolute top-6 right-5 px-3.5 py-1 rounded-2xl bg-rose-950/95 border-2 border-rose-400 text-rose-300 font-black text-xs uppercase rotate-12 z-30 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
          >
            ▶ PICK {matchup.homeTeam}
          </motion.div>

          <motion.div
            style={{ opacity: skipOpacity }}
            className="absolute top-5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-2xl bg-amber-950/90 border-2 border-amber-400 text-amber-300 font-black text-[11px] uppercase z-30 shadow-lg"
          >
            ▲ SKIP FOR LATER ▲
          </motion.div>
        </>
      )}

      {/* Header Info with Live Gameday Scoreboard */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs">
        {matchup.isLive ? (
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 font-black text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>LIVE · {matchup.gameStatus || 'IN PROGRESS'}</span>
            </span>
            <span className="font-black text-amber-300 text-xs">
              {matchup.awayScore ?? 0} - {matchup.homeScore ?? 0}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-slate-300">{matchup.startTime}</span>
          </div>
        )}
        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 font-black text-[10px]">
          {matchup.spread || 'EVEN'}
        </span>
      </div>

      {/* Team Confrontation Card */}
      <div className="flex items-center justify-around my-1 py-3 px-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <div className={`p-2 rounded-2xl bg-slate-900 border shadow-md ${matchup.selectedTeam === matchup.awayTeam ? 'border-cyan-400 ring-2 ring-cyan-500/40' : 'border-slate-700/80'}`}>
            <TeamLogo abbr={matchup.awayTeam} size="lg" />
          </div>
          <span className="text-lg font-black text-white">{matchup.awayTeam}</span>
          <span className="text-[10px] text-slate-400 font-bold">{awayMeta?.name || 'Away'}</span>
          <div className={`px-2 py-0.5 rounded border text-[9px] font-black ${
            matchup.selectedTeam === matchup.awayTeam
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
              : 'bg-cyan-950/80 border-cyan-800 text-cyan-400'
          }`}>
            {matchup.selectedTeam === matchup.awayTeam ? '✔ SELECTED' : 'SWIPE ◀'}
          </div>
        </div>

        <span className="text-slate-600 font-black text-xs uppercase">VS</span>

        <div className="flex flex-col items-center space-y-1.5 text-center">
          <div className={`p-2 rounded-2xl bg-slate-900 border shadow-md ${matchup.selectedTeam === matchup.homeTeam ? 'border-rose-400 ring-2 ring-rose-500/40' : 'border-slate-700/80'}`}>
            <TeamLogo abbr={matchup.homeTeam} size="lg" />
          </div>
          <span className="text-lg font-black text-white">{matchup.homeTeam}</span>
          <span className="text-[10px] text-slate-400 font-bold">{homeMeta?.name || 'Home'}</span>
          <div className={`px-2 py-0.5 rounded border text-[9px] font-black ${
            matchup.selectedTeam === matchup.homeTeam
              ? 'bg-rose-500 text-slate-950 border-rose-400 font-black'
              : 'bg-rose-950/80 border-rose-800 text-rose-400'
          }`}>
            {matchup.selectedTeam === matchup.homeTeam ? '✔ SELECTED' : '▶ SWIPE'}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="border-t border-slate-800 pt-2.5 space-y-2 text-center">
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            disabled={isUserLocked}
            onClick={() => onSwipe('UP')}
            className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl border transition-all ${
              isUserLocked
                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700 active:scale-95'
            }`}
          >
            <span>▲</span>
            <span>SKIP (UP)</span>
          </button>
          <button
            type="button"
            onClick={onOpenIntel}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-300 hover:bg-slate-700 active:scale-95"
          >
            <span>▼</span>
            <span>INTEL (DOWN)</span>
          </button>
        </div>

        {isUserLocked && (
          <div className="p-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-[10px] text-amber-300 font-black tracking-wide uppercase shadow-inner">
            🔒 Picks Locked · Tap 'LOCKED' Pill in Header to Edit
          </div>
        )}
      </div>
    </motion.div>
  );
};
