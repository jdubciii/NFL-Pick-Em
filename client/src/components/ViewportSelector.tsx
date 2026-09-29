import React from 'react';
import { LayoutGrid, Rows3, Grid } from 'lucide-react';

export type ViewportMode = 'cards' | 'slate' | 'matrix';

export interface ViewportSelectorProps {
  activeMode: ViewportMode;
  onChange: (mode: ViewportMode) => void;
  className?: string;
}

export const ViewportSelector: React.FC<ViewportSelectorProps> = ({
  activeMode,
  onChange,
  className = '',
}) => {
  const options: { mode: ViewportMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: 'cards', label: 'Cards', icon: LayoutGrid },
    { mode: 'slate', label: 'Slate', icon: Rows3 },
    { mode: 'matrix', label: 'Matrix', icon: Grid },
  ];

  return (
    <div
      id="picks-viewport-selector"
      className={`inline-flex items-center p-1 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-inner backdrop-blur-md ${className}`}
      role="tablist"
      aria-label="Picks Viewport Selection"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = activeMode === option.mode;

        return (
          <button
            key={option.mode}
            id={`viewport-toggle-${option.mode}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.mode)}
            className={`relative flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 focus:outline-none ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-transform duration-200 ${
                isActive ? 'text-cyan-400 scale-110' : 'text-slate-500'
              }`}
            />
            <span className="tracking-wide">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
