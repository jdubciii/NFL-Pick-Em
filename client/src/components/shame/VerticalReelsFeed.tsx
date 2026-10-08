import React, { useRef, useEffect, useState } from 'react';

export interface PenaltyReel {
  id: string;
  memberId: string;
  memberName: string;
  week: number;
  seasonYear: number;
  rank: number;
  penaltyShots: number;
  drinkName: string;
  videoUrl: string;
  posterUrl?: string;
  verifiedCount: number;
  disputeCount: number;
  initialReactions?: { beer: number; skull: number; fire: number };
}

export const VerticalReelsFeed: React.FC<{ reels: PenaltyReel[] }> = ({ reels }) => {
  return (
    <div className="relative w-full h-[85dvh] overflow-y-scroll snap-y snap-mandatory bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl select-none font-mono">
      {reels.map((reel) => (
        <ReelVideoItem key={reel.id} reel={reel} />
      ))}
    </div>
  );
};

const ReelVideoItem: React.FC<{ reel: PenaltyReel }> = ({ reel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reactions, setReactions] = useState(reel.initialReactions || { beer: 12, skull: 8, fire: 5 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
            videoRef.current?.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.75 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const addReaction = (type: 'beer' | 'skull' | 'fire') => {
    setReactions((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    try {
      if ((window as any).Capacitor?.isPluginAvailable('Haptics')) {
        (window as any).Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
      }
    } catch (_) {}
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full snap-start shrink-0 flex items-center justify-center bg-black overflow-hidden"
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.posterUrl}
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Top Banner Chyron */}
      <div className="absolute top-4 left-4 right-16 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl backdrop-blur-md z-20 space-y-0.5">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-rose-400 uppercase">
            💀 {reel.rank === 10 ? 'Dead Place Monarch' : `Rank #${reel.rank}`}
          </span>
          <span className="text-[10px] text-slate-400">Week {reel.week}</span>
        </div>
        <div className="text-xs font-bold text-white">{reel.memberName}</div>
        <div className="text-[10px] text-amber-300 font-bold">
          Served: {reel.penaltyShots} Shots ({reel.drinkName})
        </div>
      </div>

      {/* Right HUD Floating Reaction Bar */}
      <div className="absolute right-3 bottom-12 flex flex-col items-center space-y-4 z-30">
        <button
          onClick={() => addReaction('beer')}
          className="flex flex-col items-center active:scale-125 transition-transform"
        >
          <span className="text-2xl p-2.5 rounded-full bg-slate-900/80 border border-slate-700 shadow-lg">🍺</span>
          <span className="text-[10px] font-bold text-white mt-1">{reactions.beer}</span>
        </button>

        <button
          onClick={() => addReaction('skull')}
          className="flex flex-col items-center active:scale-125 transition-transform"
        >
          <span className="text-2xl p-2.5 rounded-full bg-slate-900/80 border border-slate-700 shadow-lg">💀</span>
          <span className="text-[10px] font-bold text-white mt-1">{reactions.skull}</span>
        </button>

        <button
          onClick={() => addReaction('fire')}
          className="flex flex-col items-center active:scale-125 transition-transform"
        >
          <span className="text-2xl p-2.5 rounded-full bg-slate-900/80 border border-slate-700 shadow-lg">🔥</span>
          <span className="text-[10px] font-bold text-white mt-1">{reactions.fire}</span>
        </button>
      </div>
    </div>
  );
};
