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

  const activeCard = deck[0];
  const nextCard = deck[1];

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
      // Move current card to end of deck
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
          Your picks are locked in. Switch to List view to review your full weekly slate.
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
    <div className="relative w-full max-w-sm mx-auto h-[480px] flex items-center justify-center select-none font-mono">
      {/* Background Next Card (Stack Physics) */}
      {nextCard && (
        <div className="absolute w-[92%] h-[430px] bg-slate-950/70 border border-slate-800/80 rounded-3xl p-5 shadow-xl scale-95 translate-y-4 opacity-50 blur-[0.5px] pointer-events-none flex flex-col justify-between">
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

      {/* Active Interactive Top Card */}
      <AnimatePresence mode="popLayout">
        <SwipeCardItem
          key={activeCard.gameId}
          matchup={activeCard}
          onSwipe={handleCardExit}
          isUserLocked={isUserLocked}
          onOpenIntel={() => setShowIntel(true)}
        />
      </AnimatePresence>

      {/* Matchup Intel Bottom Sheet (Anchored & Fixed Viewport) */}
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

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 pb-8 space-y-4 text-white font-mono shadow-2xl z-10 max-h-[80dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Pill Handle */}
              <div
                className="w-12 h-1.5 bg-slate-600 hover:bg-slate-500 rounded-full mx-auto -mt-1 cursor-pointer shrink-0"
                onClick={() => setShowIntel(false)}
              />

              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📊</span>
                  <h3 className="text-sm font-black uppercase text-cyan-400 tracking-wider">
                    Matchup Intel & Insights
                  </h3>
                </div>
                <button
                  onClick={() => setShowIntel(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Intel Body */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
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

              <button
                onClick={() => setShowIntel(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:scale-98 rounded-xl font-bold text-xs text-white shrink-0 transition-all"
              >
                Close Intel
              </button>
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
  const rotate = useTransform(x, [-200, 200], [-22, 22]);

  // Dynamic Opacity Feedback Overlays
  const awayOpacity = useTransform(x, [-120, -30], [1, 0]);
  const homeOpacity = useTransform(x, [30, 120], [0, 1]);
  const skipOpacity = useTransform(y, [-100, -30], [1, 0]);

  const awayMeta = NFL_TEAMS[matchup.awayTeam];
  const homeMeta = NFL_TEAMS[matchup.homeTeam];

  return (
    <motion.div
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      initial={{ scale: 0.9, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -90) {
          onSwipe('LEFT');
        } else if (info.offset.x > 90) {
          onSwipe('RIGHT');
        } else if (info.offset.y < -80) {
          onSwipe('UP');
        } else if (info.offset.y > 70) {
          onOpenIntel();
        }
      }}
      className="absolute w-full h-[450px] bg-slate-900/95 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing backdrop-blur-2xl z-20"
    >
      {/* Dynamic Pick Hologram Badges */}
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

      {/* Header Chyron */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-slate-300">{matchup.startTime}</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 font-black text-[11px]">
          {matchup.spread || 'EVEN'}
        </span>
      </div>

      {/* Matchup Showcase */}
      <div className="flex items-center justify-around my-2 py-4 px-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
        {/* Away Team Touch Card */}
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

        {/* Home Team Touch Card */}
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

      {/* Prominent High-Visibility Gesture Cues */}
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
            🔒 Picks locked. Tap 'EDIT PICKS' to register swipes.
          </div>
        )}
      </div>
    </motion.div>
  );
};
