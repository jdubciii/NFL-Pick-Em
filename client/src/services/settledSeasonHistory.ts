import type { AuthoritativeWeeklyStandingRow } from './seasonStoryService';

/** Read official settlement snapshots; FINAL games alone never establish settlement. */
export async function loadSettledSeasonHistory(
  db: any,
  fetchPreview: (path: string) => Promise<any>,
  poolId: string,
  season: number,
  seasonType: number,
): Promise<AuthoritativeWeeklyStandingRow[]> {
  const { data, error } = await db.from('weekly_wrapups')
    .select('pool_id, week_number, completed_at, summary')
    .eq('pool_id', poolId).order('week_number', { ascending: true });
  if (error) throw new Error(error.message || 'Could not load settled history.');
  const rows: AuthoritativeWeeklyStandingRow[] = [];
  const weeks = new Set<number>();
  for (const record of data || []) {
    const s = record.summary;
    if (!record.completed_at || record.pool_id !== poolId || !s ||
        s.poolId !== poolId || s.season !== season || s.seasonType !== seasonType ||
        s.weekNumber !== record.week_number) continue;
    if (!Number.isInteger(s.weekNumber) || s.weekNumber < 1 || s.weekNumber > 18 ||
        !Array.isArray(s.standings) || !s.standings.length || weeks.has(s.weekNumber)) {
      throw new Error('Invalid or duplicate settled week.');
    }
    weeks.add(s.weekNumber);
    // Older snapshots omit the graded game count. Resolve it through the same
    // authoritative scored-slate preview used by settlement, never a fixed nine.
    let totalGames = s.totalGames;
    if (totalGames === undefined) {
      const result = await fetchPreview(`/api/pools/${poolId}/wrap-up/preview?season=${season}&seasonType=${seasonType}&weekNumber=${s.weekNumber}`);
      const p = result?.preview;
      if (!p || p.poolId !== poolId || p.season !== season || p.seasonType !== seasonType || p.weekNumber !== s.weekNumber) {
        throw new Error('Settled slate size could not be verified.');
      }
      totalGames = p.totalGames;
    }
    if (!Number.isInteger(totalGames) || totalGames < 1) throw new Error('Invalid settled slate size.');
    const users = new Set<string>();
    for (const member of s.standings) {
      if (typeof member.userId !== 'string' || !member.userId || users.has(member.userId) ||
          !Number.isInteger(member.score) || member.score < 0 || member.score > totalGames ||
          !Number.isInteger(member.rank) || member.rank < 1 ||
          typeof member.shots !== 'number' || !Number.isFinite(member.shots) || member.shots < 0) {
        throw new Error('Invalid official settled standings.');
      }
      users.add(member.userId);
      rows.push({poolId, season, week:s.weekNumber, userId:member.userId,
        displayName:member.userId, rank:member.rank,
        isTiedRank:s.standings.filter((m:any)=>m.rank===member.rank).length > 1,
        participantCount:s.standings.length, correctPicks:member.score, totalGames,
        weeklyShotsIncurred:member.shots, tierName:member.isSafeHaven ? 'Safe Haven' : member.isDeadPlace ? 'Dead Place' : 'Settled',
        isOfficiallySettled:true, settlementRevision:s.inputFingerprint || null});
    }
  }
  return rows;
}

export async function fetchSettlementJson(
  fetcher: (path: string, init?: RequestInit) => Promise<Response>,
  path: string,
  init?: RequestInit,
): Promise<any> {
  const response = await fetcher(path, init);
  const body = await response.json();
  if (!response.ok) {
    const message = body.error || `Settlement request failed (${response.status}).`;
    const details = typeof body.details === 'string' ? body.details.trim() : '';
    throw new Error(details ? `${message}: ${details}` : message);
  }
  return body;
}
