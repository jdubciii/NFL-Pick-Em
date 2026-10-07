import React, { useEffect, useState } from 'react';

interface SlotOdometerProps {
  value: number;
  label: string;
  durationMs?: number;
}

export const SlotOdometer: React.FC<SlotOdometerProps> = ({ value, label, durationMs = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const diff = value - startValue;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Number((startValue + diff * easeOutQuad).toFixed(1)));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, durationMs]);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-800/90 rounded-xl border border-slate-700 shadow-inner">
      <div className="text-2xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow-md">
        {displayValue.toFixed(1)}
      </div>
      <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mt-1">
        {label}
      </div>
    </div>
  );
};
