import React from 'react';

export const TheDropDivider: React.FC = () => {
  return (
    <div className="relative my-3 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-rose-600/60 shadow-[0_0_12px_rgba(244,63,94,0.5)]" />
      </div>
      <div className="relative flex items-center justify-between w-full h-8 px-2 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ef4444_10px,#ef4444_20px)] opacity-20 rounded border border-rose-500/40" />
      <div className="absolute flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span className="text-[10px] font-mono font-black tracking-widest text-rose-400 uppercase">
          THE DROP // DEAD PLACE BORDER (2.50 SHOTS)
        </span>
      </div>
    </div>
  );
};
