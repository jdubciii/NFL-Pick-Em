import React, { useState } from 'react';
import { getTeamLogoUrl } from '../../utils/teamAssets';

interface TeamLogoProps {
  abbr: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ abbr, size = 'md', className = '' }) => {
  const [hasError, setHasError] = useState(false);
  
  // Upscaled dimensions: 'xs' enlarged from 20px to 28px for clear mobile legibility
  const sizeMap = {
    xs: { box: 'w-7 h-7 rounded-lg', img: 'w-5 h-5', text: 'text-[9px]' },
    sm: { box: 'w-8 h-8 rounded-lg', img: 'w-6 h-6', text: 'text-[10px]' },
    md: { box: 'w-11 h-11 rounded-xl', img: 'w-8 h-8', text: 'text-xs' },
    lg: { box: 'w-14 h-14 rounded-2xl', img: 'w-10 h-10', text: 'text-sm' },
  };

  const { box, img, text } = sizeMap[size];

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 bg-slate-900/90 border border-slate-700/60 shadow-md select-none ${box} ${className}`}
    >
      {!hasError ? (
        <img
          src={getTeamLogoUrl(abbr)}
          alt={abbr}
          className={`${img} object-contain transition-transform duration-200 group-hover:scale-105`}
          style={{
            /* Dual-layer drop-shadow: soft ambient white halo to separate dark logos (NYG, BAL, NYJ) 
               plus a dark depth shadow so light logos stay crisp */
            filter: 'drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.45)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.9))'
          }}
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <span className={`font-mono font-black text-slate-300 ${text}`}>{abbr}</span>
      )}
    </div>
  );
};
