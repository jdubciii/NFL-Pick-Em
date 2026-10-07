import React, { useEffect, useState } from 'react';

interface UndoSnackbarProps {
  message: string;
  isOpen: boolean;
  onUndo: () => void;
  onExpire: () => void;
  durationMs?: number;
}

export const UndoSnackbar: React.FC<UndoSnackbarProps> = ({
  message,
  isOpen,
  onUndo,
  onExpire,
  durationMs = 7000
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    const interval = 50;
    const step = (interval / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onExpire();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, durationMs, onExpire]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 bg-slate-900 border border-cyan-500/80 rounded-xl shadow-2xl p-3.5 space-y-2 text-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-slate-200">{message}</span>
        <button
          onClick={onUndo}
          className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all"
        >
          UNDO
        </button>
      </div>
      {/* Progress countdown track */}
      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          style={{ width: `${progress}%` }}
          className="h-full bg-cyan-400 transition-all duration-75"
        />
      </div>
    </div>
  );
};
