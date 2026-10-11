import React from 'react';

export interface EmptyStateWireframeProps {
  header?: string;
  subtitle?: string;
  contextDetail?: string;
}

export const EmptyStateWireframe: React.FC<EmptyStateWireframeProps> = ({
  header = '[ AWAITING LEAGUE ACTION ]',
  subtitle = '[ VEGAS LINES FREEZING... ]',
  contextDetail = 'Tuesday morning calibration underway. Pre-lock window opens once lines and cohort locks settle.'
}) => {
  return (
    <div className="w-full my-6 p-8 opacity-30 border-2 border-dashed border-cyan-500/40 rounded-2xl bg-slate-950/60 flex flex-col items-center justify-center text-center font-mono space-y-3 transition-all duration-500">
      <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 text-2xl shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-pulse">
        🔒
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-black tracking-wider text-cyan-400 uppercase">
          {header}
        </h3>
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          {subtitle}
        </p>
      </div>
      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
        {contextDetail}
      </p>
    </div>
  );
};

export default EmptyStateWireframe;
