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

// Isolated demo fixture for explicit test / demonstration use only (Decision #61)
export const DEMO_PENALTY_REELS: PenaltyReel[] = [
  {
    id: 'reel-demo-w4-1',
    memberId: 'm10',
    memberName: 'Demo Member 10',
    week: 4,
    seasonYear: 2026,
    rank: 10,
    penaltyShots: 2.5,
    drinkName: 'Warm Tequila',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cheering-with-beer-mugs-in-a-bar-42654-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
    verifiedCount: 8,
    disputeCount: 1,
    initialReactions: { beer: 19, skull: 14, fire: 9 }
  },
  {
    id: 'reel-demo-w3-1',
    memberId: 'm9',
    memberName: 'Demo Member 9',
    week: 3,
    seasonYear: 2026,
    rank: 9,
    penaltyShots: 2.0,
    drinkName: 'Malort Double',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-a-drink-into-a-glass-at-a-bar-43187-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    verifiedCount: 7,
    disputeCount: 2,
    initialReactions: { beer: 12, skull: 8, fire: 5 }
  },
  {
    id: 'reel-demo-w2-1',
    memberId: 'm8',
    memberName: 'Demo Member 8',
    week: 2,
    seasonYear: 2026,
    rank: 8,
    penaltyShots: 2.0,
    drinkName: 'Pickle Vodka',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-bartender-serving-a-glass-of-cocktail-43186-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&w=600&q=80',
    verifiedCount: 9,
    disputeCount: 0,
    initialReactions: { beer: 16, skull: 11, fire: 7 }
  }
];

export interface VerticalReelsFeedProps {
  reels?: PenaltyReel[];
  isLoading?: boolean;
  isUnavailable?: boolean;
}

export const VerticalReelsFeed: React.FC<VerticalReelsFeedProps> = ({
  reels,
  isLoading = false,
  isUnavailable = false,
}) => {
  if (isLoading) {
    return (
      <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center font-mono">
        <span className="text-cyan-400 text-sm font-bold animate-pulse">Loading penalty reels...</span>
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center font-mono">
        <span className="text-amber-400 text-sm font-bold mb-1">⚠️ Video Reels Unavailable</span>
        <span className="text-slate-500 text-xs">Video storage or feed connection currently unavailable.</span>
      </div>
    );
  }

  const activeReels = reels || [];

  if (activeReels.length === 0) {
    return (
      <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center font-mono">
        <span className="text-3xl mb-2">📹</span>
        <span className="text-slate-300 text-sm font-bold mb-1">No Penalty Reels Recorded</span>
        <span className="text-slate-500 text-xs max-w-sm">
          Completed penalty videos verified by pool members will appear here. No fabricated submissions are displayed.
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100dvh-175px)] overflow-y-scroll snap-y snap-mandatory bg-black rounded-3xl border border-slate-800 shadow-2xl select-none font-mono">
      {activeReels.map((reel) => (
        <ReelVideoItem key={reel.id} reel={reel} />
      ))}
    </div>
  );
};

const ReelVideoItem: React.FC<{ reel: PenaltyReel }> = ({ reel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [reactions, setReactions] = useState(reel.initialReactions || { beer: 0, skull: 0, fire: 0 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.65 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const addReaction = (e: React.MouseEvent, type: 'beer' | 'skull' | 'fire') => {
    e.stopPropagation();
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
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Floating Audio Toggle */}
      <button
        onClick={toggleSound}
        className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-slate-950/80 border border-slate-700 text-white shadow-lg active:scale-90 transition-transform"
        title="Toggle Sound"
      >
        <span>{isMuted ? '🔇' : '🔊'}</span>
      </button>

      {/* Top Overlay Chyron */}
      <div className="absolute top-4 left-4 right-16 p-3 bg-slate-950/85 border border-slate-800 rounded-2xl backdrop-blur-md z-20 space-y-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-rose-400 uppercase tracking-wide">
            💀 {reel.rank === 10 ? 'Dead Place Monarch' : `Rank #${reel.rank}`}
          </span>
          <span className="text-[10px] text-slate-400">Week {reel.week} Final</span>
        </div>
        <div className="text-sm font-black text-white">{reel.memberName}</div>
        <div className="text-[11px] text-amber-300 font-bold">
          Penalty: {reel.penaltyShots} Shots ({reel.drinkName})
        </div>
      </div>

      {/* Right HUD Floating Reaction Bar */}
      <div className="absolute right-3 bottom-10 flex flex-col items-center space-y-4 z-30">
        <button
          onClick={(e) => addReaction(e, 'beer')}
          className="flex flex-col items-center active:scale-125 transition-transform"
        >
          <span className="text-2xl p-2.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-xl">🍺</span>
          <span className="text-[10px] font-bold text-white mt-1">{reactions.beer}</span>
        </button>

        <button
          onClick={(e) => addReaction(e, 'skull')}
          className="flex flex-col items-center active:scale-125 transition-transform"
        >
          <span className="text-2xl p-2.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-xl">💀</span>
          <span className="text-[10px] font-bold text-white mt-1">{reactions.skull}</span>
        </button>

        <button
          onClick={(e) => addReaction(e, 'fire')}
          className="flex flex-col items-center active:scale-125 transition-transform"
        >
          <span className="text-2xl p-2.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-xl">🔥</span>
          <span className="text-[10px] font-bold text-white mt-1">{reactions.fire}</span>
        </button>
      </div>

      {/* Bottom Verification Status Badge */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-950/85 border border-slate-800 text-[10px] text-slate-300 font-bold backdrop-blur-sm">
        <span className="text-emerald-400">✔</span>
        <span>Verified by {reel.verifiedCount}/10 Members</span>
      </div>
    </div>
  );
};
