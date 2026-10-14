import React from 'react';
import type { ShameTabId } from '../../services/wallOfShameConsolidationService';

export type ExtendedShameTabId = ShameTabId | 'reels' | 'ladder' | 'infamy';

interface ShameSegmentedHeaderProps {
  activeTab: ExtendedShameTabId;
  onSelectTab: (tab: any) => void;
}

export const ShameSegmentedHeader: React.FC<ShameSegmentedHeaderProps> = ({
  activeTab,
  onSelectTab
}) => {
  const currentTabLower = String(activeTab || 'ladder').toLowerCase();
  const isLowerMode = typeof activeTab === 'string' && activeTab === activeTab.toLowerCase();

  const handleSelect = (tabName: 'reels' | 'ladder' | 'infamy') => {
    if (isLowerMode) {
      onSelectTab(tabName);
    } else {
      onSelectTab(tabName.toUpperCase() as ShameTabId);
    }
  };

  return (
    <div className="sticky top-14 z-30 w-full pt-2 pb-2 px-4 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 font-mono">
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-xs font-bold">
        <button
          onClick={() => handleSelect('reels')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            currentTabLower === 'reels'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📱</span>
          <span>REELS</span>
        </button>

        <button
          onClick={() => handleSelect('ladder')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            currentTabLower === 'ladder'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🪜</span>
          <span>LADDER</span>
        </button>

        <button
          onClick={() => handleSelect('infamy')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            currentTabLower === 'infamy'
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
