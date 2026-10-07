import React from 'react';
import { triggerHaptic } from '../../utils/haptics';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'picks', label: 'Picks', path: '/picks', icon: '🏈' },
  { id: 'matrix', label: 'Matrix', path: '/matrix', icon: '📊' },
  { id: 'radar', label: 'Radar', path: '/radar', icon: '⚡' },
  { id: 'shame', label: 'Shame', path: '/shame', icon: '💀' }
];

interface BottomTabBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentPath, onNavigate }) => {
  const handleTabClick = (path: string) => {
    triggerHaptic('selection');
    onNavigate(path);
  };

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 shadow-2xl safe-area-bottom"
    >
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 select-none ${
                isActive 
                  ? 'text-cyan-400 font-bold scale-105' 
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <span className="text-xl mb-0.5 leading-none">{item.icon}</span>
              <span className="text-[10px] tracking-wider uppercase">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
