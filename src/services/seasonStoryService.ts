/**
 * Phase 40 Sprint 1 (P40-S1): Authoritative Season Story Service
 * Derives personal and league progression strictly from officially settled weekly records.
 * Never infers settlement from game status alone and never converts fetch errors into 0 records.
 */

import { formatShotUnit } from './dependableInfoService';

export type HistoryLoadStatus =
  | 'LOADING'
  | 'UNAVAILABLE_ERROR'
  | 'EMPTY_SETTLED_HISTORY'
  | 'SETTLED_HISTORY';

export interface AuthoritativeWeeklyStandingRow {
  season: number;
  week: number;
  poolId: string;
  userId: string;
  displayName: string;
  rank: number;
  isTiedRank: boolean;
  participantCount: number;
  correctPicks: number;
  totalGames: number;
  weeklyShotsIncurred: number;
  tierName: string;
  isOfficiallySettled: boolean;
  settlementRevision?: string | number | null;
}

export interface PersonalWeekStoryNode {
  week: number;
  rankLabel: string;
  participantCount: number;
  participationBadge: string;
  pickRecordLabel: string;
  weeklyChargeLabel: string;
  runningUnsettledOrOwedDebtLabel: string;
  tierName: string;
  settlementRevisionLabel: string;
}

export interface SeasonStoryViewModel {
  status: HistoryLoadStatus;
  season: number;
  poolId: string;
  settledWeeksCount: number;
  headline: string;
  statusMessage: string;
  totalCorrectPicks: number | null;
  totalGradedGames: number | null;
  accuracyPercentLabel: string;
  safeHavenFinishes: number | null;
  totalWeeklyChargesLabel: string;
  outstandingShotDebtLabel: string;
  weeklyNodes: PersonalWeekStoryNode[];
}

export function deriveSeasonStoryViewModel(params: {
  isLoading?: boolean;
  fetchError?: string | null;
  season?: number;
  poolId: string;
  viewerUserId: string;
  rawRecords?: AuthoritativeWeeklyStandingRow[] | null;
  currentOutstandingShotDebt?: number | null;
}): SeasonStoryViewModel {
  const season = params.season ?? 2026;

  if (params.isLoading) {
    return {
      status: 'LOADING',
      season,
      poolId: params.poolId,
      settledWeeksCount: 0,
      headline: 'Loading Official Season History…',
      statusMessage: 'Verifying settled weekly records for Main League.',
      totalCorrectPicks: null,
      totalGradedGames: null,
      accuracyPercentLabel: '—',
      safeHavenFinishes: null,
      totalWeeklyChargesLabel: '—',
      outstandingShotDebtLabel: '—',
      weeklyNodes: [],
    };
  }

  if (params.fetchError || params.rawRecords === null || params.rawRecords === undefined) {
    return {
      status: 'UNAVAILABLE_ERROR',
      season,
      poolId: params.poolId,
      settledWeeksCount: 0,
      headline: 'Season History Temporarily Unavailable',
      statusMessage:
        params.fetchError ||
        'Could not verify authoritative settled history. Records are withheld rather than displayed as zero.',
      totalCorrectPicks: null,
      totalGradedGames: null,
      accuracyPercentLabel: 'Unavailable',
      safeHavenFinishes: null,
      totalWeeklyChargesLabel: 'Unavailable',
      outstandingShotDebtLabel:
        params.currentOutstandingShotDebt !== null && params.currentOutstandingShotDebt !== undefined
          ? formatShotUnit(params.currentOutstandingShotDebt)
          : 'Unavailable',
      weeklyNodes: [],
    };
  }

  // Strictly filter to officially settled records for this pool and viewer
  const settledViewerRows = params.rawRecords
    .filter(
      (r) =>
        r.poolId === params.poolId &&
        r.userId === params.viewerUserId &&
        r.isOfficiallySettled === true
    )
    .sort((a, b) => a.week - b.week);

  if (settledViewerRows.length === 0) {
    return {
      status: 'EMPTY_SETTLED_HISTORY',
      season,
      poolId: params.poolId,
      settledWeeksCount: 0,
      headline: 'No Settled Weeks on Record Yet',
      statusMessage:
        'Official Season Story progression begins automatically once Week 6 (or your first active slate) is officially audited and settled.',
      totalCorrectPicks: 0,
      totalGradedGames: 0,
      accuracyPercentLabel: 'No settled slates',
      safeHavenFinishes: 0,
      totalWeeklyChargesLabel: formatShotUnit(0),
      outstandingShotDebtLabel: formatShotUnit(params.currentOutstandingShotDebt ?? 0),
      weeklyNodes: [],
    };
  }

  let totalCorrect = 0;
  let totalGames = 0;
  let safeFinishes = 0;
  let cumulativeCharges = 0;

  const weeklyNodes: PersonalWeekStoryNode[] = settledViewerRows.map((row) => {
    totalCorrect += row.correctPicks;
    totalGames += row.totalGames;
    if (row.rank === 1) safeFinishes += 1;
    cumulativeCharges = Math.round((cumulativeCharges + (row.weeklyShotsIncurred || 0)) * 100) / 100;

    const rankLabel = row.isTiedRank ? `T-#${row.rank}` : `#${row.rank}`;
    const participationBadge = `${row.participantCount}-Player Field`;
    const pickRecordLabel = `${row.correctPicks}/${row.totalGames} Correct`;
    const weeklyChargeLabel = formatShotUnit(row.weeklyShotsIncurred);
    const rev = row.settlementRevision ? `Rev ${row.settlementRevision}` : 'Rev 1 (Official)';

    return {
      week: row.week,
      rankLabel,
      participantCount: row.participantCount,
      participationBadge,
      pickRecordLabel,
      weeklyChargeLabel,
      runningUnsettledOrOwedDebtLabel: formatShotUnit(cumulativeCharges),
      tierName: row.tierName,
      settlementRevisionLabel: rev,
    };
  });

  const pct = totalGames > 0 ? `${((totalCorrect / totalGames) * 100).toFixed(1)}%` : '0.0%';

  return {
    status: 'SETTLED_HISTORY',
    season,
    poolId: params.poolId,
    settledWeeksCount: settledViewerRows.length,
    headline: `${settledViewerRows.length} Settled Week${settledViewerRows.length === 1 ? '' : 's'} on Official Record`,
    statusMessage: `Includes explicit field sizes across ${settledViewerRows.length} settled slate${settledViewerRows.length === 1 ? '' : 's'}.`,
    totalCorrectPicks: totalCorrect,
    totalGradedGames: totalGames,
    accuracyPercentLabel: `${pct} (${totalCorrect}/${totalGames})`,
    safeHavenFinishes: safeFinishes,
    totalWeeklyChargesLabel: formatShotUnit(cumulativeCharges),
    outstandingShotDebtLabel: formatShotUnit(params.currentOutstandingShotDebt ?? cumulativeCharges),
    weeklyNodes,
  };
}
