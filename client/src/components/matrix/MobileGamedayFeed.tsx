import React from 'react';
import { MatchupCard, LiveMatchupProjection } from './MatchupCard';

interface MobileGamedayFeedProps {
  projections: LiveMatchupProjection[];
  currentUserId?: string;
}

export const MobileGamedayFeed: React.FC<MobileGamedayFeedProps> = ({ projections, currentUserId }) => {
  return (
    <div className="space-y-3 pb-24 px-1">
      {projections.map((proj) => (
        <MatchupCard key={proj.gameId} projection={proj} currentUserId={currentUserId} />
      ))}
    </div>
  );
};
