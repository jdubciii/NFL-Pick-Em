import React from 'react';
import { calculateMomentumTrend } from '../../services/slateFinaleService';

interface MomentumSparklineProps {
  history: number[];
  width?: number;
  height?: number;
}

export const MomentumSparkline: React.FC<MomentumSparklineProps> = ({
  history,
  width = 48,
  height = 18
}) => {
  if (!history || history.length < 2) {
    return null;
  }

  const { trend } = calculateMomentumTrend(history);
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min === 0 ? 1 : max - min;

  const points = history
    .map((val, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor =
    trend === 'UP'
      ? 'rgba(16, 185, 129, 0.45)'
      : trend === 'DOWN'
      ? 'rgba(244, 63, 94, 0.45)'
      : 'rgba(148, 163, 184, 0.3)';

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible pointer-events-none inline-block ml-1"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
