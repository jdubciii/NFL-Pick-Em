import React from 'react';

interface StreamStatusIndicatorProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}

export const StreamStatusIndicator: React.FC<StreamStatusIndicatorProps> = ({
  isConnected,
  isReconnecting = false
}) => {
  if (isConnected) {
    return (
      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold text-emerald-300 font-mono tracking-wider">LIVE</span>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/50">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] font-bold text-amber-300 font-mono tracking-wider">RECONNECTING</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/50">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      <span className="text-[10px] font-bold text-rose-300 font-mono tracking-wider">OFFLINE</span>
    </div>
  );
};
