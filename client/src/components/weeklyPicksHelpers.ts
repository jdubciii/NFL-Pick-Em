import type { GameItem } from './WeeklyPicks';

export interface CloudReconciliationResult {
  cloudMap: Record<string, string>;
  conflictedGameIds: Set<string>;
  logicalConflictGameIds: Set<string>;
}

/**
 * Reconciles cloud pick records from the database against the client game slate.
 * Detects duplicate/conflicting rows per canonical game, excludes ambiguous duplicate
 * matchups entirely from confirmed state/counts (no winner selected), and preserves
 * explicit conflict state.
 */
export function reconcileCloudPicks(dbPicks: any[], games: GameItem[]): CloudReconciliationResult {
  const canonicalRowsMap = new Map<string, any[]>();
  const ambiguousGameIds = new Set<string>();
  const logicalConflictGameIds = new Set<string>();
  const cloudMap: Record<string, string> = {};

  dbPicks.forEach((p) => {
    const rawGid = p.game_id || p.gameId;
    if (!rawGid) return;
    const matched = (games || []).find(
      (g: any) => String(g.id) === String(rawGid) || String((g as any).externalGameId || (g as any).external_game_id) === String(rawGid)
    );
    const canonicalId = matched ? String(matched.id) : String(rawGid);
    if (!canonicalRowsMap.has(canonicalId)) {
      canonicalRowsMap.set(canonicalId, []);
    }
    canonicalRowsMap.get(canonicalId)!.push(p);
  });

  canonicalRowsMap.forEach((rows, canonicalId) => {
    if (rows.length > 1) {
      logicalConflictGameIds.add(canonicalId);
      ambiguousGameIds.add(canonicalId);
      const matched = (games || []).find((g: any) => String(g.id) === canonicalId);
      const ext = matched ? String((matched as any).externalGameId || (matched as any).external_game_id || '') : '';
      if (ext) ambiguousGameIds.add(ext);
      console.warn(`DUPLICATE_PICKS_DETECTED: Found ${rows.length} duplicate/conflicting stored picks for matchup ${canonicalId}.`);
    }
  });

  // Ruling -03 / -04: Do not select any winner for ambiguous duplicate matchups!
  canonicalRowsMap.forEach((rows, canonicalId) => {
    const matched = (games || []).find((g: any) => String(g.id) === canonicalId);
    const ext = matched ? String((matched as any).externalGameId || (matched as any).external_game_id || '') : '';

    if (rows.length > 1) {
      // Excluded from confirmed state/counts entirely; no winner chosen
      return;
    }

    const nonNullRows = rows.filter((r) => r.selected_team_id || r.selectedTeamId || r.selected_team || r.selectedTeam);
    if (nonNullRows.length > 0) {
      const winner = nonNullRows[0];
      const team = winner.selected_team_id || winner.selectedTeamId || winner.selected_team || winner.selectedTeam;
      if (team) {
        cloudMap[canonicalId] = String(team);
        if (ext) cloudMap[ext] = String(team);
      }
    }
  });

  return {
    cloudMap,
    conflictedGameIds: ambiguousGameIds,
    logicalConflictGameIds,
  };
}

/**
 * Filters preset candidate picks before applying any optimistic local changes.
 * Excludes locked games and games with duplicate identity conflicts.
 */
export function filterPresetEligiblePicks(
  updatedPicks: Record<string, string | null>,
  games: GameItem[],
  conflictedGameIds: Set<string>,
  isLockedFn: (g: GameItem) => boolean,
  isKickoffLockedFn: (g: GameItem) => boolean
): { eligiblePicks: Record<string, string>; candidateGames: GameItem[]; hasExcludedConflicts: boolean } {
  const eligiblePicks: Record<string, string> = {};
  const candidateGames: GameItem[] = [];
  let hasExcludedConflicts = false;

  for (const [gid, team] of Object.entries(updatedPicks)) {
    if (!team) continue;
    const g = games.find(
      (game) => String(game.id) === String(gid) || String((game as any).externalGameId || (game as any).external_game_id) === String(gid)
    );
    if (!g) continue;

    const ext = String((g as any).externalGameId || (g as any).external_game_id || '');
    const isConflicted = conflictedGameIds.has(String(g.id)) || (Boolean(ext) && conflictedGameIds.has(ext));

    if (isConflicted) {
      hasExcludedConflicts = true;
      continue; // Exclude conflicts BEFORE optimistic update!
    }

    if (isLockedFn(g) || isKickoffLockedFn(g)) {
      continue; // Exclude locked games!
    }

    eligiblePicks[g.id] = team;
    candidateGames.push(g);
  }

  return { eligiblePicks, candidateGames, hasExcludedConflicts };
}

export interface BatchValidationOutcome {
  isValid: boolean;
  confirmedSavedCanonicalIds: Set<string>;
  confirmedSavedPicks: Record<string, string | null>;
  failedCanonicalIds: Set<string>;
  errorMessages: string[];
}

/**
 * Validates batch server responses for preset, clear, and restore actions.
 * Enforces one outcome per canonical requested game, rejects unrequested identities,
 * rejects duplicate/contradictory outcomes, and verifies that applied picks match
 * successful results. Missing outcomes are treated as explicit failures.
 */
export function validateBatchOutcomes(
  requestedItems: Array<{ gameId: string; expectedTeam?: string | null }>,
  batchData: any,
  games: GameItem[]
): BatchValidationOutcome {
  const outcome: BatchValidationOutcome = {
    isValid: true,
    confirmedSavedCanonicalIds: new Set<string>(),
    confirmedSavedPicks: {},
    failedCanonicalIds: new Set<string>(),
    errorMessages: [],
  };

  if (!batchData || typeof batchData !== 'object' || !Array.isArray(batchData.results)) {
    outcome.isValid = false;
    outcome.errorMessages.push('INVALID_BATCH_RESPONSE: Server response lacks valid results array.');
    for (const req of requestedItems) {
      const match = games.find(
        (g) => String(g.id) === String(req.gameId) || String((g as any).externalGameId || (g as any).external_game_id) === String(req.gameId)
      );
      outcome.failedCanonicalIds.add(match ? String(match.id) : String(req.gameId));
    }
    return outcome;
  }

  // Canonical mapping of requested games
  const requestedCanonicalMap = new Map<string, { expectedTeam?: string | null; originalGameId: string }>();
  for (const req of requestedItems) {
    const match = games.find(
      (g) => String(g.id) === String(req.gameId) || String((g as any).externalGameId || (g as any).external_game_id) === String(req.gameId)
    );
    const canonicalId = match ? String(match.id) : String(req.gameId);
    requestedCanonicalMap.set(canonicalId, { expectedTeam: req.expectedTeam, originalGameId: req.gameId });
  }

  // Map of canonicalId -> results
  const canonicalResults = new Map<string, any[]>();
  const unrequestedIdentities = new Set<string>();

  for (const r of batchData.results) {
    if (!r || typeof r !== 'object') continue;
    const rawGid = String(r.gameId ?? r.game_id ?? '');
    const match = games.find(
      (g) => String(g.id) === rawGid || String((g as any).externalGameId || (g as any).external_game_id) === rawGid
    );
    const canonicalId = match ? String(match.id) : rawGid;

    if (!requestedCanonicalMap.has(canonicalId)) {
      unrequestedIdentities.add(rawGid);
      continue;
    }

    if (!canonicalResults.has(canonicalId)) {
      canonicalResults.set(canonicalId, []);
    }
    canonicalResults.get(canonicalId)!.push(r);
  }

  // If unrequested identities were present, record as validation warning/error
  if (unrequestedIdentities.size > 0) {
    outcome.isValid = false;
    outcome.errorMessages.push(`Server returned unrequested game identities: ${Array.from(unrequestedIdentities).join(', ')}`);
  }

  // Validate each requested canonical game
  for (const [canonicalId, req] of requestedCanonicalMap.entries()) {
    const itemResults = canonicalResults.get(canonicalId) || [];

    if (itemResults.length === 0) {
      // Missing outcome is an explicit failure
      outcome.failedCanonicalIds.add(canonicalId);
      outcome.errorMessages.push(`Missing server outcome for matchup ${canonicalId}.`);
      continue;
    }

    if (itemResults.length > 1) {
      // Contradictory/duplicate outcome for same requested game
      outcome.failedCanonicalIds.add(canonicalId);
      outcome.errorMessages.push(`Contradictory duplicate server outcomes for matchup ${canonicalId}.`);
      continue;
    }

    const singleResult = itemResults[0];
    if (singleResult.status === 'SAVED') {
      // 1. Nested pick object MUST be present
      if (!singleResult.pick || typeof singleResult.pick !== 'object') {
        outcome.failedCanonicalIds.add(canonicalId);
        outcome.errorMessages.push(`Missing nested pick object in SAVED outcome for matchup ${canonicalId}.`);
        continue;
      }

      // 2. Validate nested pick game ID matches canonical game identity
      const rawPickGid = String(singleResult.pick.gameId ?? singleResult.pick.game_id ?? '');
      if (!rawPickGid) {
        outcome.failedCanonicalIds.add(canonicalId);
        outcome.errorMessages.push(`Missing gameId in nested pick object for matchup ${canonicalId}.`);
        continue;
      }
      const pickMatch = games.find(
        (g) => String(g.id) === rawPickGid || String((g as any).externalGameId || (g as any).external_game_id) === rawPickGid
      );
      const pickCanonicalId = pickMatch ? String(pickMatch.id) : rawPickGid;
      if (pickCanonicalId !== canonicalId) {
        outcome.failedCanonicalIds.add(canonicalId);
        outcome.errorMessages.push(
          `Mismatched nested pick game identity: result gameId ${canonicalId} does not match pick gameId ${rawPickGid}.`
        );
        continue;
      }

      // 3. Explicit selection/null field in pick object (never synthesize from requested value)
      const hasSelectedProp =
        'selectedTeamId' in singleResult.pick ||
        'selected_team_id' in singleResult.pick ||
        'selectedTeam' in singleResult.pick ||
        'selected_team' in singleResult.pick;
      const pickTeamRaw =
        singleResult.pick.selectedTeamId !== undefined
          ? singleResult.pick.selectedTeamId
          : singleResult.pick.selected_team_id !== undefined
          ? singleResult.pick.selected_team_id
          : singleResult.pick.selectedTeam !== undefined
          ? singleResult.pick.selectedTeam
          : singleResult.pick.selected_team;

      if (!hasSelectedProp || (pickTeamRaw === undefined && singleResult.pick.selectedTeamId === undefined)) {
        outcome.failedCanonicalIds.add(canonicalId);
        outcome.errorMessages.push(`Missing explicit selection field in nested pick object for matchup ${canonicalId}.`);
        continue;
      }

      const appliedTeam = pickTeamRaw !== undefined ? pickTeamRaw : null;

      // 4. Verify applied pick matches expected request when an expectation was provided
      if (req.expectedTeam !== undefined) {
        const normalizedExpected = req.expectedTeam === null ? null : String(req.expectedTeam).trim();
        const normalizedApplied = appliedTeam === null ? null : String(appliedTeam).trim();
        if (normalizedApplied !== normalizedExpected) {
          outcome.failedCanonicalIds.add(canonicalId);
          outcome.errorMessages.push(
            `Applied pick mismatch for matchup ${canonicalId}: expected ${req.expectedTeam}, got ${appliedTeam}.`
          );
          continue;
        }
      }

      outcome.confirmedSavedCanonicalIds.add(canonicalId);
      outcome.confirmedSavedPicks[canonicalId] = appliedTeam;
    } else {
      outcome.failedCanonicalIds.add(canonicalId);
      outcome.errorMessages.push(singleResult.error || `Matchup ${canonicalId} failed with status ${singleResult.status}.`);
    }
  }

  if (outcome.failedCanonicalIds.size > 0) {
    outcome.isValid = false;
  }

  return outcome;
}
