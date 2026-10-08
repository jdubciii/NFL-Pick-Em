export interface InfamyRecord {
  memberId: string;
  name: string;
  shotsDrank: number;
  deadPlaceFinishes: number;
  maxSingleWeekDebt: number;
  winRate?: string;
  avatarUrl?: string;
}

export type InfamySortCriteria = 'MOST_SHOTS' | 'MOST_DEAD_PLACES' | 'HIGHEST_DEBT' | 'BEST_WIN_RATE';

export function formatDisputeCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00:00';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function isUnderUrgencyThreshold(remainingMs: number): boolean {
  return remainingMs <= 3600 * 1000;
}

export function sortHallOfInfamy(records: InfamyRecord[], criteria: InfamySortCriteria): InfamyRecord[] {
  const clone = [...records];
  switch (criteria) {
    case 'MOST_DEAD_PLACES':
      return clone.sort((a, b) => b.deadPlaceFinishes - a.deadPlaceFinishes);
    case 'BEST_WIN_RATE':
      return clone.sort((a, b) => {
        const rateA = parseFloat(a.winRate || '0') || 0;
        const rateB = parseFloat(b.winRate || '0') || 0;
        return rateB - rateA;
      });
    case 'HIGHEST_DEBT':
      return clone.sort((a, b) => b.maxSingleWeekDebt - a.maxSingleWeekDebt);
    case 'MOST_SHOTS':
    default:
      return clone.sort((a, b) => b.shotsDrank - a.shotsDrank);
  }
}
