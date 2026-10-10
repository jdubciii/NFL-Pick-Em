import React from 'react';
import type { ShameTabId } from '../../services/wallOfShameConsolidationService';

interface ShameSegmentedHeaderProps {
  activeTab: ShameTabId;
  onSelectTab: (tab: ShameTabId) => void;
}

export const ShameSegmentedHeader: React.FC<ShameSegmentedHeaderProps> = ({
  activeTab,
  onSelectTab
}) => {
  return (
    <div className="sticky top-0 z-40 w-full pt-1 pb-2 px-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 font-mono">
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-xs font-bold">
        <button
          onClick={() => onSelectTab('REELS')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'REELS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📱</span>
          <span>REELS</span>
        </button>

        <button
          onClick={() => onSelectTab('LADDER')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'LADDER'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🪜</span>
          <span>LADDER</span>
        </button>

        <button
          onClick={() => onSelectTab('INFAMY')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'INFAMY'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏛️</span>
          <span>INFAMY</span>
        </button>
      </div>
    </div>
  );
};
