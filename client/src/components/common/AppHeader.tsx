import React from 'react';

interface AppHeaderProps {
  rightContent?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ rightContent }) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-40 min-h-[52px]">
      <div className="flex items-center gap-2">
        <span className="text-sm font-black tracking-wider text-white uppercase select-none">
          NFL PICK'EM
        </span>
      </div>
      {rightContent && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightContent}
        </div>
      )}
    </header>
  );
};
