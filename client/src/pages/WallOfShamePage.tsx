import React, { useState } from 'react';
import { ShameSegmentedHeader } from '../components/shame/ShameSegmentedHeader';
import { WeeklyLadderView } from '../components/shame/WeeklyLadderView';

export function WallOfShamePage() {
  const [activeTab, setActiveTab] = useState<'reels' | 'ladder' | 'infamy'>('ladder');
  const [dockets] = useState<any[]>([]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f1d] text-slate-100 pb-24">
      {/* Unified Top Branding Banner */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-zinc-800/80 bg-[#0a0f1d]/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-base font-black tracking-wider text-white">NFL PICK'EM</span>
          <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">WALL OF SHAME</span>
        </div>
      </div>

      {/* Persistent 3-Tab Segmented Header */}
      <div className="sticky top-0 z-30 bg-[#0a0f1d]/95 backdrop-blur-md px-4 pt-2 pb-2 border-b border-slate-800">
        <ShameSegmentedHeader activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>

      {/* Tab 1: Reels Feed (Scoped Empty State) */}
      {activeTab === 'reels' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-3xl">
            🎬
          </div>
          <div className="text-amber-400 font-bold text-sm tracking-wider uppercase mb-1">
            [ NO ACTIVE PENALTY REELS ]
          </div>
          <p className="text-slate-400 text-xs max-w-xs leading-relaxed mb-6">
            Zero penalty shot videos have been uploaded for Week 5. The tribunal queue unlocks once evidence is submitted.
          </p>
          <button 
            onClick={() => setActiveTab('ladder')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition"
          >
            VIEW SHOT DEBT LADDER →
          </button>
        </div>
      )}

      {/* Tab 2: Live Shot Debt Ladder (Always Accessible) */}
      {activeTab === 'ladder' && (
        <div className="flex-1 p-4">
          <WeeklyLadderView />
        </div>
      )}

      {/* Tab 3: Hall of Infamy (Always Accessible) */}
      {activeTab === 'infamy' && (
        <div className="flex-1 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-2xl">
            🏛️
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            [ HALL OF INFAMY ARCHIVE ]
          </h3>
          <p className="text-slate-400 text-xs max-w-xs mx-auto mb-6">
            Historical dead-place punishments and penalty records.
          </p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-left max-w-sm mx-auto">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">SEASON LEDGER SUMMARY</div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Total League Penalties:</span>
              <span className="text-amber-400 font-mono font-bold">0.00 Shots</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">Tribunal Disputes:</span>
              <span className="text-emerald-400 font-mono font-bold">0 Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WallOfShamePage;
