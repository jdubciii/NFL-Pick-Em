import React from 'react';

export interface AppHeaderProps {
  rightContent?: React.ReactNode;
  poolName?: string;
  scope?: string;
  phase?: 'PRE-KICKOFF' | 'GAMES LIVE' | 'SETTLED' | string;
  hideSubHeader?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  rightContent,
  poolName = 'MAIN LEAGUE',
  scope = 'WEEK 6',
  phase = 'PRE-KICKOFF',
  hideSubHeader = false,
}) => {
  const getPhaseBadgeStyle = (currentPhase: string) => {
    switch (currentPhase) {
      case 'GAMES LIVE':
        return {
          dot: 'bg-amber-400 animate-pulse',
          badge: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
        };
      case 'SETTLED':
        return {
          dot: 'bg-emerald-400',
          badge: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
        };
      case 'PRE-KICKOFF':
      default:
        return {
          dot: 'bg-cyan-400 animate-pulse',
          badge: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
        };
    }
  };

  const phaseStyle = getPhaseBadgeStyle(phase);

  return (
    <div className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80">
      <header className="h-14 min-h-[56px] max-h-[56px] w-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-wider text-white uppercase select-none leading-none">
            NFL PICK'EM
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 min-h-[32px]">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-pool-lounge'))}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-semibold text-cyan-300 transition-colors shadow-sm active:scale-95"
            title="Open Pool Lounge"
          >
            <span className="text-sm">💬</span>
            <span className="text-[11px] font-bold">Lounge</span>
          </button>
          {rightContent ? rightContent : <div className="w-1" />}
        </div>
      </header>

      {!hideSubHeader && (
        <div className="h-7 w-full bg-slate-900/90 border-t border-slate-800/60 px-4 flex items-center justify-between text-[10px] font-mono select-none">
          <div className="flex items-center gap-2">
            <span className="font-black text-cyan-400 tracking-wider uppercase">{poolName}</span>
            <span className="text-slate-600">·</span>
            <span className="font-bold text-slate-300 uppercase">{scope}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${phaseStyle.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${phaseStyle.dot}`} />
              <span>{phase}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppHeader;
