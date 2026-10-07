import React, { useEffect, useState } from 'react';

interface MechanicalRollingOdometerProps {
  value: number;
  label?: string;
  sublabel?: string;
  durationMs?: number;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const MechanicalRollingOdometer: React.FC<MechanicalRollingOdometerProps> = ({
  value,
  label = 'Total Shots Owed',
  sublabel,
  durationMs = 1200
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const formattedStr = value.toFixed(2).padStart(6, '0');
  const characters = formattedStr.split('');

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex items-center space-x-1.5 bg-slate-900/90 px-4 py-3 rounded-xl border border-slate-700/80 shadow-inner">
        {characters.map((char, index) => {
          if (char === '.') {
            return (
              <span key={`dot-${index}`} className="text-2xl font-black text-amber-400 font-mono px-0.5">
                .
              </span>
            );
          }

          const targetDigit = parseInt(char, 10);
          const translateY = mounted ? -(targetDigit * 10) : 0;

          return (
            <div
              key={`digit-${index}`}
              className="relative h-10 w-7 overflow-hidden rounded bg-slate-800/90 border border-slate-700/70 shadow-md font-mono text-2xl font-black text-cyan-400"
            >
              <div
                className="flex flex-col transition-transform"
                style={{
                  transform: `translateY(${translateY}%)`,
                  transitionDuration: `${durationMs + index * 100}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {DIGITS.map((d) => (
                  <span key={d} className="flex h-10 items-center justify-center text-center">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs font-bold tracking-widest uppercase text-slate-300 mt-3 font-mono">
        {label}
      </div>
      {sublabel && (
        <div className="text-[11px] font-medium text-slate-500 mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  );
};
