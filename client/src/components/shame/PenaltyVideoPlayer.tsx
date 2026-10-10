import React, { useRef, useState, useEffect } from 'react';

interface PenaltyVideoPlayerProps {
  src: string;
  isActive: boolean;
  status: 'CLEARED' | 'UNDER_REVIEW' | 'DISPUTED';
  accusation?: string;
}

export const PenaltyVideoPlayer: React.FC<PenaltyVideoPlayerProps> = ({
  src,
  isActive,
  status,
  accusation
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => console.log('Autoplay prevented by browser'));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  return (
    <div className="relative w-full aspect-[9/16] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl font-mono">
      {/* Media Viewport */}
      {src.startsWith('supabase://') ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-400 p-6 text-center space-y-2">
          <span className="text-4xl">🔒</span>
          <p className="text-xs font-black tracking-widest uppercase text-cyan-400">
            [ ENCRYPTED VAULT MEDIA ]
          </p>
          <p className="text-[10px] text-slate-500 break-all">{src}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          loop
          muted={isMuted}
        />
      )}

      {/* Persistent Frosted-Glass Audio Toggle */}
      <button
        type="button"
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-base shadow-lg transition active:scale-95"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* Anchored Tribunal Deliberation Overlay (Bottom 30%) */}
      {status === 'DISPUTED' && accusation && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-rose-500/50 z-10 space-y-1 animate-fade-in">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-300 uppercase tracking-widest">
            <span>⚖️</span>
            <span>FORMAL INFRACTION ACCUSATION:</span>
          </div>
          <p className="text-xs text-white italic font-sans font-medium line-clamp-3">
            "{accusation}"
          </p>
        </div>
      )}
    </div>
  );
};
