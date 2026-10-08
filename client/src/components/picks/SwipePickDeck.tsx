import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { TeamLogo } from '../common/TeamLogo';
import { NFL_TEAMS } from '../../utils/teamAssets';

export interface SwipeMatchup {
  id: string;
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  startTime: string;
  spread?: string;
  overUnder?: string;
  venue?: string;
  weather?: string;
  injuryNote?: string;
  selectedTeam?: string | null;
  isLocked?: boolean;
}

interface SwipePickDeckProps {
  matchups: SwipeMatchup[];
  onSelectPick: (gameId: string, team: string) => void;
  isUserLocked: boolean;
}

export const SwipePickDeck: React.FC<SwipePickDeckProps> = ({
  matchups,
  onSelectPick,
  isUserLocked
}) => {
  const [deck, setDeck] = useState<SwipeMatchup[]>(matchups);
  const [showIntel, setShowIntel] = useState(false);

  // Sync if external matchups change
  React.useEffect(() => {
    setDeck(matchups);
  }, [matchups.length]);

  const activeCard = deck[0];
  const nextCard = deck[1];

  // Matchup status calculation
  const totalGames = matchups.length;
  const pickedCount = matchups.filter(m => m.selectedTeam).length;
  const currentIndex = activeCard ? (totalGames - deck.length + 1) : totalGames;

  const handleCardExit = (direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (!activeCard) return;

    if (direction === 'LEFT') {
      if (!isUserLocked && !activeCard.isLocked) {
        onSelectPick(activeCard.gameId, activeCard.awayTeam);
      }
      setDeck(prev => prev.slice(1));
    } else if (direction === 'RIGHT') {
      if (!isUserLocked && !activeCard.isLocked) {
        onSelectPick(activeCard.gameId, activeCard.homeTeam);
      }
      setDeck(prev => prev.slice(1));
    } else if (direction === 'UP') {
      // Skip: Move to back of line
      setDeck(prev => [...prev.slice(1), prev[0]]);
    } else if (direction === 'DOWN') {
      setShowIntel(true);
    }
  };

  if (!activeCard) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 border border-slate-800 rounded-3xl text-center space-y-4 font-mono shadow-2xl">
        <span className="text-5xl animate-bounce">🎉</span>
        <h4 className="text-base font-black text-white uppercase tracking-wider">All Matchups Picked!</h4>
        <p className="text-xs text-slate-400 max-w-xs">
          You have reviewed all {totalGames} matchups. Switch to List view to review your weekly slate.
        </p>
        <button
          onClick={() => setDeck(matchups)}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider shadow-lg active:scale-95 transition-all"
        >
          Review Deck Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center select-none font-mono">
      {/* Pick Progress Ledger HUD */}
      <div className="w-full px-2 mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-black tracking-wide">
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <span>MATCHUP {currentIndex} OF {totalGames}</span>
          </div>
          <div className="text-slate-400 text-[10px]">
            <span className="text-emerald-400 font-bold">{pickedCount} Picked</span> · <span>{totalGames - pickedCount} Left</span>
          </div>
        </div>

        {/* Micro-Segmented Ledger Bar */}
        <div className="grid grid-flow-col auto-cols-fr gap-1 w-full h-1.5 bg-slate-950/80 p-0.5 rounded-full border border-slate-800">
          {matchups.map((m, idx) => {
            const isCurrent = activeCard && activeCard.gameId === m.gameId;
            const isPicked = !!m.selectedTeam;
            const isHome = m.selectedTeam === m.homeTeam;

            return (
              <div
                key={m.gameId || idx}
                className={`h-full rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'bg-amber-400 ring-2 ring-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse'
                    : isPicked
                    ? isHome ? 'bg-rose-500' : 'bg-cyan-400'
                    : 'bg-slate-800/80'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Main Swipe Deck Container */}
      <div className="relative w-full h-[470px] flex items-center justify-center">
        {/* Background Stack Under-Card */}
        {nextCard && (
          <div className="absolute w-[92%] h-[420px] bg-slate-950/80 border border-slate-800 rounded-3xl p-5 shadow-xl scale-95 translate-y-4 opacity-50 blur-[0.5px] pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>{nextCard.startTime}</span>
              <span>NEXT UP</span>
            </div>
            <div className="flex items-center justify-around">
              <TeamLogo abbr={nextCard.awayTeam} size="md" />
              <span className="text-slate-600 font-black">VS</span>
              <TeamLogo abbr={nextCard.homeTeam} size="md" />
            </div>
            <div className="h-6" />
          </div>
        )}

        {/* Active Swipe Card */}
        <AnimatePresence mode="popLayout">
          <SwipeCardItem
            key={activeCard.gameId}
            matchup={activeCard}
            onSwipe={handleCardExit}
            isUserLocked={isUserLocked}
            onOpenIntel={() => setShowIntel(true)}
          />
        </AnimatePresence>
      </div>

      {/* Native-Feel Matchup Intel Drawer with Full Drag-Down Dismiss */}
      <AnimatePresence>
        {showIntel && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-end justify-center select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIntel(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Draggable Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                // If dragged downward past 60px or with downward velocity, dismiss
                if (info.offset.y > 60 || info.velocity.y > 300) {
                  setShowIntel(false);
                }
              }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 pb-8 space-y-4 text-white font-mono shadow-2xl z-10 max-h-[82dvh] flex flex-col touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Visible Tactile Drag Handle */}
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

              {/* Scrollable Intel Body */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs touch-pan-y">
                {/* Team Banner */}
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
  const rotate = useTransform(x, [-200, 200], [-20, 20]);

  const awayOpacity = useTransform(x, [-110, -30], [1, 0]);
  const homeOpacity = useTransform(x, [30, 110], [0, 1]);
  const skipOpacity = useTransform(y, [-90, -30], [1, 0]);

  const awayMeta = NFL_TEAMS[matchup.awayTeam];
  const homeMeta = NFL_TEAMS[matchup.homeTeam];

  return (
    <motion.div
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      initial={{ scale: 0.9, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -80) {
          onSwipe('LEFT');
        } else if (info.offset.x > 80) {
          onSwipe('RIGHT');
        } else if (info.offset.y < -70) {
          onSwipe('UP');
        } else if (info.offset.y > 60) {
          onOpenIntel();
        }
      }}
      className="absolute w-full h-[450px] bg-slate-900/95 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing backdrop-blur-2xl z-20 select-none"
    >
      {/* Pick Hologram Overlays */}
      <motion.div
        style={{ opacity: awayOpacity }}
        className="absolute top-8 left-6 px-4 py-1.5 rounded-2xl bg-cyan-950/95 border-2 border-cyan-400 text-cyan-300 font-black text-sm uppercase -rotate-12 z-30 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
      >
        PICK {matchup.awayTeam} ◀
      </motion.div>

      <motion.div
        style={{ opacity: homeOpacity }}
        className="absolute top-8 right-6 px-4 py-1.5 rounded-2xl bg-rose-950/95 border-2 border-rose-400 text-rose-300 font-black text-sm uppercase rotate-12 z-30 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
      >
        ▶ PICK {matchup.homeTeam}
      </motion.div>

      <motion.div
        style={{ opacity: skipOpacity }}
        className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-2xl bg-amber-950/90 border-2 border-amber-400 text-amber-300 font-black text-xs uppercase z-30 shadow-lg"
      >
        ▲ SKIP FOR LATER ▲
      </motion.div>

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-slate-300">{matchup.startTime}</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 font-black text-[11px]">
          {matchup.spread || 'EVEN'}
        </span>
      </div>

      {/* Team Confrontation Card */}
      <div className="flex items-center justify-around my-2 py-4 px-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-2 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-md">
            <TeamLogo abbr={matchup.awayTeam} size="lg" />
          </div>
          <span className="text-xl font-black text-white">{matchup.awayTeam}</span>
          <span className="text-[10px] text-slate-400 font-bold">{awayMeta?.name || 'Away'}</span>
          <div className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-[10px] font-black">
            SWIPE ◀
          </div>
        </div>

        <span className="text-slate-600 font-black text-sm uppercase">VS</span>

        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-2 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-md">
            <TeamLogo abbr={matchup.homeTeam} size="lg" />
          </div>
          <span className="text-xl font-black text-white">{matchup.homeTeam}</span>
          <span className="text-[10px] text-slate-400 font-bold">{homeMeta?.name || 'Home'}</span>
          <div className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-400 text-[10px] font-black">
            ▶ SWIPE
          </div>
        </div>
      </div>

      {/* Prominent Quick-Action Buttons */}
      <div className="border-t border-slate-800 pt-3 space-y-2 text-center">
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => onSwipe('UP')}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-slate-800/90 border border-slate-700 text-amber-300 hover:bg-slate-700 active:scale-95"
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
          <div className="text-[10px] text-amber-400 font-bold animate-pulse">
            🔒 Picks locked. Tap 'LOCKED' pill in top bar to edit.
          </div>
        )}
      </div>
    </motion.div>
  );
};
