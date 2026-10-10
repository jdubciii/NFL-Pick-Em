import React from 'react';

interface TargetLockLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const TargetLockLogo: React.FC<TargetLockLogoProps> = ({
  size = 64,
  className = '',
  animate = true
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full overflow-visible ${animate ? 'transition-transform duration-500 ease-out animate-[spin_400ms_ease-out_1]' : ''}`}
      >
        {/* Outer Incomplete HUD Reticle (Corner Arcs) */}
        {/* Top-Left Arc */}
        <path
          d="M 22 10 A 38 38 0 0 0 10 22"
          stroke="#06b6d4"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Top-Right Arc */}
        <path
          d="M 78 10 A 38 38 0 0 1 90 22"
          stroke="#06b6d4"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Bottom-Right Arc */}
        <path
          d="M 90 78 A 38 38 0 0 1 78 90"
          stroke="#06b6d4"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Bottom-Left Arc */}
        <path
          d="M 10 78 A 38 38 0 0 0 22 90"
          stroke="#06b6d4"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Reticle Crosshair Ticks */}
        <line x1="50" y1="4" x2="50" y2="14" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="86" x2="50" y2="96" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="4" y1="50" x2="14" y2="50" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="86" y1="50" x2="96" y2="50" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />

        {/* Center Futuristic Football Silhouette */}
        <g className="animate-pulse">
          <ellipse
            cx="50"
            cy="50"
            rx="24"
            ry="14"
            transform="rotate(-45 50 50)"
            fill="#0f172a"
            stroke="#06b6d4"
            strokeWidth="3"
          />
          {/* Football Laces */}
          <line
            x1="41"
            y1="41"
            x2="59"
            y2="59"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line x1="46" y1="48" x2="48" y2="46" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="50" y1="52" x2="52" y2="50" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="54" y1="56" x2="56" y2="54" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
