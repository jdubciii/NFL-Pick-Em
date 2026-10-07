import React, { useState } from 'react';
import { triggerHaptic } from '../../utils/hapticsBridge';

interface EmojiReactionTrayProps {
  initialReactions?: { skull: number; beer: number; fire: number };
  onReact?: (type: 'skull' | 'beer' | 'fire') => void;
}

export const EmojiReactionTray: React.FC<EmojiReactionTrayProps> = ({
  initialReactions = { skull: 0, beer: 0, fire: 0 },
  onReact
}) => {
  const [counts, setCounts] = useState(initialReactions);
  const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

  const handleEmojiClick = (type: 'skull' | 'beer' | 'fire') => {
    // 1. Tactile Haptic Trigger
    triggerHaptic('light');

    // 2. Trigger Bounce Animation
    setAnimatingEmoji(type);
    setTimeout(() => setAnimatingEmoji(null), 300);

    // 3. Optimistic Count Increment
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));

    if (onReact) onReact(type);
  };

  return (
    <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-full px-3 py-1.5 w-fit shadow-inner">
      <button
        type="button"
        onClick={() => handleEmojiClick('skull')}
        className="flex items-center space-x-1 hover:opacity-80 transition-transform active:scale-95"
      >
        <span className={`text-base select-none transition-transform duration-200 ${animatingEmoji === 'skull' ? 'scale-150' : 'scale-100'}`}>💀</span>
        <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">{counts.skull}</span>
      </button>

      <div className="h-3 w-px bg-slate-800" />

      <button
        type="button"
        onClick={() => handleEmojiClick('beer')}
        className="flex items-center space-x-1 hover:opacity-80 transition-transform active:scale-95"
      >
        <span className={`text-base select-none transition-transform duration-200 ${animatingEmoji === 'beer' ? 'scale-150' : 'scale-100'}`}>🍺</span>
        <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">{counts.beer}</span>
      </button>

      <div className="h-3 w-px bg-slate-800" />

      <button
        type="button"
        onClick={() => handleEmojiClick('fire')}
        className="flex items-center space-x-1 hover:opacity-80 transition-transform active:scale-95"
      >
        <span className={`text-base select-none transition-transform duration-200 ${animatingEmoji === 'fire' ? 'scale-150' : 'scale-100'}`}>🔥</span>
        <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">{counts.fire}</span>
      </button>
    </div>
  );
};
