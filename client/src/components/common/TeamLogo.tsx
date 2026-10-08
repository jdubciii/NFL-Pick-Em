import React, { useState } from 'react';
import { getTeamLogoUrl } from '../../utils/teamAssets';

interface TeamLogoProps {
  abbr: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ abbr, size = 'md', className = '' }) => {
  const [hasError, setHasError] = useState(false);
  
  const sizeMap = {
    xs: { box: 'w-5 h-5 rounded-md', img: 'w-3.5 h-3.5', text: 'text-[8px]' },
    sm: { box: 'w-7 h-7 rounded-lg', img: 'w-5 h-5', text: 'text-[10px]' },
    md: { box: 'w-9 h-9 rounded-xl', img: 'w-6 h-6', text: 'text-xs' },
    lg: { box: 'w-12 h-12 rounded-2xl', img: 'w-8 h-8', text: 'text-sm' },
  };

  const { box, img, text } = sizeMap[size];

  return (
    <div className={`relative flex items-center justify-center shrink-0 bg-slate-950/80 border border-slate-800 shadow-inner select-none ${box} ${className}`}>
      {!hasError ? (
        <img
          src={getTeamLogoUrl(abbr)}
          alt={abbr}
          className={`${img} object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-200 group-hover:scale-105`}
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <span className={`font-mono font-black text-slate-400 ${text}`}>{abbr}</span>
      )}
    </div>
  );
};
