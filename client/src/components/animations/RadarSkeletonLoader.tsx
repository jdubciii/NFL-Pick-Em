import React from 'react';

interface RadarSkeletonLoaderProps {
  rows?: number;
}

export const RadarSkeletonLoader: React.FC<RadarSkeletonLoaderProps> = ({ rows = 4 }) => {
  return (
    <div className="w-full space-y-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="h-4 w-20 bg-slate-800 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="space-y-2 pt-1">
          <div className="flex justify-between items-center">
            <div className="h-3 w-40 bg-slate-800 rounded" />
            <div className="h-3 w-16 bg-slate-800 rounded" />
          </div>
          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-slate-700/60 rounded-full w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
};
