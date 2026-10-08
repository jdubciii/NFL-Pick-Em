import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { TeamLogo } from '../common/TeamLogo';

export interface SwipeMatchup {
  id: string;
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  startTime: string;
  spread?: string;
  selectedTeam?: string | null;
  isLocked?: boolean;
}

interface SwipePickDeckProps {
  matchups: SwipeMatchup[];
  onSelectPick: (gameId: string, team: string) => void;
  isUserLocked: boolean;
  onOpenDrawer?: (gameId: string) => void;
}

export const SwipePickDeck: React.FC<SwipePickDeckProps> = ({
  matchups,
  onSelectPick,
  isUserLocked,
  onOpenDrawer
}) => {
  const [deck, setDeck] = useState<SwipeMatchup[]>([]);

  useEffect(() => {
    // Deck tracks unpicked games first, then all remaining
    setDeck(matchups);
  }, [matchups]);

  const activeCard = deck[0];

  const handleSwipe = (direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (!activeCard) return;

    if (direction === 'LEFT') {
      // Pick Away
      if (!isUserLocked && !activeCard.isLocked) {
        onSelectPick(activeCard.gameId, activeCard.awayTeam);
      }
      setDeck(prev => prev.slice(1));
    } else if (direction === 'RIGHT') {
      // Pick Home
      if (!isUserLocked && !activeCard.isLocked) {
        onSelectPick(activeCard.gameId, activeCard.homeTeam);
      }
      setDeck(prev => prev.slice(1));
    } else if (direction === 'UP') {
      // Skip: Move to back of deck
      setDeck(prev => [...prev.slice(1), prev[0]]);
    } else if (direction === 'DOWN') {
      // Reveal Intel Drawer
      if (onOpenDrawer) {
        onOpenDrawer(activeCard.gameId);
      }
    }
  };

  if (!activeCard) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3 font-mono">
        <span className="text-4xl">🎉</span>
        <h4 className="text-sm font-black text-white uppercase">All Matchups Reviewed</h4>
        <p className="text-xs text-slate-400">Switch to List view to review your weekly slate or make adjustments.</p>
        <button
          onClick={() => setDeck(matchups)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-cyan-300 hover:text-white"
        >
          Reset Deck
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto h-[430px] flex items-center justify-center select-none font-mono">
      <AnimatePresence>
        <SwipeCardItem
          key={activeCard.gameId}
          matchup={activeCard}
          onSwipe={handleSwipe}
          isUserLocked={isUserLocked}
        />
      </AnimatePresence>
    </div>
  );
};

const SwipeCardItem: React.FC<{
  matchup: SwipeMatchup;
  onSwipe: (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => void;
  isUserLocked: boolean;
}> = ({ matchup, onSwipe, isUserLocked }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-18, 18]);
  const awayOpacity = useTransform(x, [-100, -20], [1, 0]);
  const homeOpacity = useTransform(x, [20, 100], [0, 1]);
  const skipOpacity = useTransform(y, [-100, -20], [1, 0]);

  return (
    <motion.div
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onTouchStart={(e) => {
        // Prevent pull-to-refresh on downward drag gesture
        if (e.touches[0].clientY > 50) {
          e.preventDefault();
        }
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -100) {
          onSwipe('LEFT');
        } else if (info.offset.x > 100) {
          onSwipe('RIGHT');
        } else if (info.offset.y < -100) {
          onSwipe('UP');
        } else if (info.offset.y > 100) {
          onSwipe('DOWN');
        }
      }}
      className="absolute w-full h-[400px] bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing backdrop-blur-xl"
    >
      {/* Pick Indicators Overlay */}
      <motion.div
        style={{ opacity: awayOpacity }}
        className="absolute top-6 left-6 px-3 py-1 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-black text-sm uppercase -rotate-12 z-30"
      >
        PICK {matchup.awayTeam}
      </motion.div>

      <motion.div
        style={{ opacity: homeOpacity }}
        className="absolute top-6 right-6 px-3 py-1 rounded-xl bg-rose-950/90 border-2 border-rose-400 text-rose-300 font-black text-sm uppercase rotate-12 z-30"
      >
        PICK {matchup.homeTeam}
      </motion.div>

      <motion.div
        style={{ opacity: skipOpacity }}
        className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-slate-800 border border-slate-600 text-slate-300 font-black text-xs uppercase z-30"
      >
        SKIP / PASS ⬆
      </motion.div>

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
        <span>{matchup.startTime}</span>
        <span className="text-cyan-400 font-bold">{matchup.spread || 'EVEN'}</span>
      </div>

      {/* Matchup Center Stage */}
      <div className="flex items-center justify-around my-4">
        <div className="flex flex-col items-center space-y-2">
          <TeamLogo abbr={matchup.awayTeam} size="lg" />
          <span className="text-lg font-black text-white">{matchup.awayTeam}</span>
          <span className="text-[10px] text-cyan-400">SWIPE LEFT ◀</span>
        </div>

        <span className="text-slate-600 font-black text-sm">@</span>

        <div className="flex flex-col items-center space-y-2">
          <TeamLogo abbr={matchup.homeTeam} size="lg" />
          <span className="text-lg font-black text-white">{matchup.homeTeam}</span>
          <span className="text-[10px] text-rose-400">▶ SWIPE RIGHT</span>
        </div>
      </div>

      {/* Guidance Footer */}
      <div className="border-t border-slate-800 pt-3 text-center space-y-1">
        <div className="text-[11px] text-slate-400 font-medium">
          ⬆ Swipe Up to Skip · ⬇ Swipe Down for Intel
        </div>
        {isUserLocked && (
          <div className="text-[10px] text-amber-400 font-bold animate-pulse">
            🔒 Protected: Unlock in header to register swipes
          </div>
        )}
      </div>
    </motion.div>
  );
};
