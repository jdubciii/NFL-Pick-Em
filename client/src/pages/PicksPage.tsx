import React from 'react';
import { WeeklyPicks } from '../components/WeeklyPicks';

export const PicksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <WeeklyPicks />
    </div>
  );
};
