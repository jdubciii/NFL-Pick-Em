import React from 'react';

interface AppHeaderProps {
  rightContent?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ rightContent }) => {
  return (
    <header className="h-14 min-h-[56px] max-h-[56px] w-full flex items-center justify-between px-4 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-sm font-black tracking-wider text-white uppercase select-none leading-none">
          NFL PICK'EM
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 min-h-[32px]">
        {rightContent ? rightContent : <div className="w-1" />}
      </div>
    </header>
  );
};
