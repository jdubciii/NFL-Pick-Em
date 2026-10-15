/**
 * Phase 40 Sprint 1 (P40-S1): Deterministic Weekly Recap Card Service
 * Generates "THE WEEKLY VERDICT" (League Recap) and "RIVALRY RESULT" (Rivalry Recap)
 * with co-winner handling, settlement revision tracking, and strict PII exclusion.
 */

import { formatShotUnit } from './dependableInfoService';

export type RecapCardFormat = 'LEAGUE_VERDICT' | 'RIVALRY_RESULT';

export interface SettledParticipantSummary {
  userId: string;
  displayName: string;
  rank: number;
  points: number;
  totalGames: number;
  shotsIncurred: number;
  tierName: string;
  tiebreakResolved?: boolean;
}

export interface DeterministicRecapCardModel {
  canExportOfficialVerdict: boolean;
  headerStamp: 'THE WEEKLY VERDICT' | 'RIVALRY RESULT' | 'AWAITING OFFICIAL SETTLEMENT';
  poolTitle: string;
  weekLabel: string;
  participantCountLabel: string;
  settlementBasisLabel: string;
  primaryHeadline: string;
  secondaryHeadline: string;
  statRows: Array<{ label: string; value: string }>;
  punishmentCallout: string;
  footerWatermark: string;
}

function sanitizeDisplayHandle(raw: string): string {
  const clean = (raw || 'Member').trim();
  // Strip @domain if an email address was passed as display name
  const noEmail = clean.includes('@') ? clean.split('@')[0] : clean;
  // Never allow invite code MAIN26 to appear in exported share cards
  return noEmail.replace(/\bMAIN26\b/gi, 'POOL');
}

export function buildDeterministicWeeklyRecap(params: {
  format: RecapCardFormat;
  poolName?: string;
  season?: number;
  week: number;
  isOfficiallySettled: boolean;
  settlementRevision?: string | number | null;
  settledAtLabel?: string | null;
  participants: SettledParticipantSummary[];
  viewerUserId?: string;
  rivalUserId?: string;
  decisiveDisagreementLabel?: string | null;
}): DeterministicRecapCardModel {
  const poolTitle = sanitizeDisplayHandle(params.poolName || 'MAIN LEAGUE').toUpperCase();
  const weekLabel = `SEASON ${params.season ?? 2026} · WEEK ${params.week}`;
  const count = params.participants.length;
  const participantCountLabel = `${count} Active Member${count === 1 ? '' : 's'}`;
  const revLabel = params.settlementRevision ? `Revision ${params.settlementRevision}` : 'Revision 1';
  const settledTime = params.settledAtLabel ? ` · ${params.settledAtLabel}` : '';

  if (!params.isOfficiallySettled || count === 0) {
    return {
      canExportOfficialVerdict: false,
      headerStamp: 'AWAITING OFFICIAL SETTLEMENT',
      poolTitle,
      weekLabel,
      participantCountLabel,
      settlementBasisLabel: 'Unsettled Slate — Official Recap Unlocks Post-Audit',
      primaryHeadline: `Week ${params.week} Official Verdict Pending`,
      secondaryHeadline:
        'Weekly Recap Cards are generated strictly from settled results so provisional Sunday projections never become false historical records.',
      statRows: [
        { label: 'Slate Status', value: 'Awaiting Official Settlement' },
        { label: 'Active Field', value: participantCountLabel },
      ],
      punishmentCallout: 'Official charter obligations lock upon weekly settlement.',
      footerWatermark: `${poolTitle} · ${weekLabel} · UNSETTLED PREVIEW`,
    };
  }

  const settlementBasisLabel = `Official Settlement (${revLabel}${settledTime})`;
  const sorted = [...params.participants].sort((a, b) => a.rank - b.rank);
  const topRankers = sorted.filter((p) => p.rank === 1);

  if (params.format === 'RIVALRY_RESULT') {
    const viewer =
      sorted.find((p) => p.userId === params.viewerUserId) || sorted[0];
    const rival =
      sorted.find((p) => p.userId === params.rivalUserId && p.userId !== viewer.userId) ||
      sorted.find((p) => p.userId !== viewer.userId) ||
      viewer;

    const vName = sanitizeDisplayHandle(viewer.displayName);
    const rName = sanitizeDisplayHandle(rival.displayName);
    const diff = viewer.points - rival.points;

    let primaryHeadline = `${vName} vs. ${rName} — Deadlocked (${viewer.points}–${rival.points})`;
    if (diff > 0) {
      primaryHeadline = `${vName} defeats ${rName} (${viewer.points}–${rival.points})`;
    } else if (diff < 0) {
      primaryHeadline = `${rName} defeats ${vName} (${rival.points}–${viewer.points})`;
    } else if (viewer.rank !== rival.rank) {
      const winnerName = viewer.rank < rival.rank ? vName : rName;
      primaryHeadline = `${winnerName} takes tiebreak edge (${viewer.points}–${rival.points})`;
    }

    const secondaryHeadline =
      params.decisiveDisagreementLabel ||
      `Settled across ${viewer.totalGames} graded games in a ${count}-player field`;

    return {
      canExportOfficialVerdict: true,
      headerStamp: 'RIVALRY RESULT',
      poolTitle,
      weekLabel,
      participantCountLabel,
      settlementBasisLabel,
      primaryHeadline,
      secondaryHeadline,
      statRows: [
        { label: `${vName} (#${viewer.rank})`, value: `${viewer.points}/${viewer.totalGames} pts · ${formatShotUnit(viewer.shotsIncurred)}` },
        { label: `${rName} (#${rival.rank})`, value: `${rival.points}/${rival.totalGames} pts · ${formatShotUnit(rival.shotsIncurred)}` },
        { label: 'Net Duel Margin', value: diff === 0 ? 'Tied on points' : `${diff > 0 ? '+' : ''}${diff} pt${Math.abs(diff) === 1 ? '' : 's'}` },
      ],
      punishmentCallout: `${vName}: ${viewer.tierName} (${formatShotUnit(viewer.shotsIncurred)}) | ${rName}: ${rival.tierName} (${formatShotUnit(rival.shotsIncurred)})`,
      footerWatermark: `${poolTitle} · ${weekLabel} · ${settlementBasisLabel.toUpperCase()}`,
    };
  }

  // LEAGUE_VERDICT format
  const winnerNames = topRankers.map((p) => sanitizeDisplayHandle(p.displayName));
  const isCoWinners = topRankers.length > 1;
  const tiebreakPending = isCoWinners && topRankers.some((p) => p.tiebreakResolved === false);

  const primaryHeadline = isCoWinners
    ? tiebreakPending
      ? `Co-Leaders: ${winnerNames.join(' & ')} (${topRankers[0].points} pts · Tiebreak Pending)`
      : `Shared Safe Haven: ${winnerNames.join(' & ')} (${topRankers[0].points} pts)`
    : `Safe Haven Champion: ${winnerNames[0]} (${topRankers[0].points}/${topRankers[0].totalGames} pts)`;

  const secondaryHeadline = `Official Week ${params.week} Charter Verdict · ${participantCountLabel}`;

  const statRows = sorted.slice(0, 4).map((p) => ({
    label: `#${p.rank} ${sanitizeDisplayHandle(p.displayName)}`,
    value: `${p.points}/${p.totalGames} pts · ${p.tierName} (${formatShotUnit(p.shotsIncurred)})`,
  }));

  const totalShots = sorted.reduce((acc, p) => acc + (p.shotsIncurred || 0), 0);

  return {
    canExportOfficialVerdict: true,
    headerStamp: 'THE WEEKLY VERDICT',
    poolTitle,
    weekLabel,
    participantCountLabel,
    settlementBasisLabel,
    primaryHeadline,
    secondaryHeadline,
    statRows,
    punishmentCallout: `Total Week ${params.week} Pool Penalties Assigned: ${formatShotUnit(totalShots)}`,
    footerWatermark: `${poolTitle} · ${weekLabel} · ${settlementBasisLabel.toUpperCase()}`,
  };
}
