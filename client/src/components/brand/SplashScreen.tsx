import React, { useState, useEffect } from 'react';
import { TargetLockLogo } from './TargetLockLogo';
import { SPLASH_CONFIG } from '../../services/visualDesignService';

interface SplashScreenProps {
  onDismiss: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss }) => {
  const [fading, setFading] = useState<boolean>(false);

  useEffect(() => {
    // 400ms target-lock acquisition, dismissed by 600ms ceiling
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, SPLASH_CONFIG.TARGET_ANIMATION_MS);

    const finishTimer = setTimeout(() => {
      onDismiss();
    }, SPLASH_CONFIG.MAX_HOLD_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-200 select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-4">
        <TargetLockLogo size={96} animate={true} />
        <div className="text-center font-mono space-y-1">
          <h1 className="text-xl font-black tracking-widest text-white">
            NFL PICK <span className="text-cyan-400">'EM</span>
          </h1>
          <p className="text-[10px] tracking-widest text-slate-400 uppercase">
            TARGET-LOCK GAMEDAY PLATFORM
          </p>
        </div>
        <div className="w-24 h-1 rounded-full bg-slate-800 overflow-hidden mt-3">
          <div className="w-full h-full bg-cyan-400 animate-[loading_500ms_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};
