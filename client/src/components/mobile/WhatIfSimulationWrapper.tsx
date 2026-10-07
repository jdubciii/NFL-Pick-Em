import React from 'react';
import { triggerHaptic } from '../../utils/haptics';

interface WhatIfSimulationWrapperProps {
  isSimulating: boolean;
  onReset: () => void;
  children: React.ReactNode;
}

export const WhatIfSimulationWrapper: React.FC<WhatIfSimulationWrapperProps> = ({
  isSimulating,
  onReset,
  children
}) => {
  return (
    <div className={`transition-all duration-300 rounded-xl ${
      isSimulating
        ? 'border-2 border-dashed border-amber-500/90 bg-amber-950/15 p-3.5 shadow-lg shadow-amber-950/20'
        : 'border border-slate-800 bg-slate-900/60 p-3'
    }`}>
      {isSimulating && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-dashed border-amber-500/40">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400 font-mono">
              ⚡ Sandbox Simulation Mode (Not Real Picks)
            </span>
          </div>
          <button
            onClick={() => {
              triggerHaptic('impactLight');
              onReset();
            }}
            className="text-[11px] font-bold text-amber-300 hover:text-amber-100 bg-amber-900/40 border border-amber-600/50 px-2.5 py-1 rounded-md transition-colors"
          >
            Reset Slate
          </button>
        </div>
      )}
      {children}
    </div>
  );
};
