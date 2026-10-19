/**
 * Weekly Tiebreaker Game Designation & Freeze Service
 * Authority: P41-TIEBREAKER-CONTRACT-2026-10-17-01 (Section 5)
 * 
 * Rules:
 * 1. Default designation: The Detroit Lions game within explicit season/week slate (home or away).
 * 2. If exactly one eligible Lions game exists -> DEFAULT_LIONS.
 * 3. If Detroit has a bye or no Lions game exists -> COMMISSIONER_SELECTION_REQUIRED.
 * 4. If schedule is ambiguous or unavailable -> UNRESOLVED (reject prediction writes).
 * 5. Commissioner may override to another game from the SAME weekly slate before kickoff.
 * 6. Freeze rule: Freeze the designated event after the first successfully acknowledged prediction.
 *    - Before first prediction: designation changes require both old and proposed targets to be before kickoff.
 *    - After first prediction: designation is FROZEN. Do not move existing guesses or reassign.
 * 7. Default resolution and GET requests must remain strictly read-only (Decision #54).
 */

export interface GameSlateItem {
  id: string; // canonical internal or external ID
  externalGameId?: string; // canonical ESPN event ID as text
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: string | Date;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

export type DesignationStatus =
  | 'DEFAULT_LIONS'
  | 'COMMISSIONER_OVERRIDE'
  | 'COMMISSIONER_SELECTION_REQUIRED'
  | 'UNRESOLVED';

export interface StoredWeeklyDesignation {
  eventId: string; // canonical ESPN text event ID
  gameTitle?: string;
  kickoffTime: string;
  designatedBy: string; // 'SYSTEM_DEFAULT' or admin userId
  designatedAt: string;
  provenance: 'DEFAULT_LIONS' | 'COMMISSIONER_OVERRIDE';
  isFrozen: boolean;
  frozenAt?: string;
  firstPredictionUserId?: string;
}

export interface DesignationResolution {
  status: DesignationStatus;
  game: GameSlateItem | null;
  eventId: string | null;
  provenance: 'DEFAULT_LIONS' | 'COMMISSIONER_OVERRIDE' | null;
  isFrozen: boolean;
  frozenAt?: string;
  firstPredictionUserId?: string;
  reason?: string;
}

/**
 * Checks if a team identifier or name matches the Detroit Lions.
 */
export function isDetroitLions(teamIdOrName: string | undefined | null): boolean {
  if (!teamIdOrName) return false;
  const normalized = String(teamIdOrName).trim().toUpperCase();
  return normalized === 'DET' || normalized === 'DETROIT' || normalized === 'DETROIT LIONS' || normalized === 'LIONS';
}

/**
 * Resolves the default tiebreaker designation for an NFL weekly slate.
 */
export function resolveDefaultDesignation(games: GameSlateItem[]): DesignationResolution {
  if (!games || games.length === 0) {
    return {
      status: 'UNRESOLVED',
      game: null,
      eventId: null,
      provenance: null,
      isFrozen: false,
      reason: 'Schedule is unavailable or empty for this week',
    };
  }

  const lionsGames = games.filter(
    (g) => isDetroitLions(g.homeTeamId) || isDetroitLions(g.awayTeamId)
  );

  if (lionsGames.length === 1) {
    const lionsGame = lionsGames[0];
    const eventId = String(lionsGame.externalGameId || lionsGame.id);
    return {
      status: 'DEFAULT_LIONS',
      game: lionsGame,
      eventId,
      provenance: 'DEFAULT_LIONS',
      isFrozen: false,
    };
  }

  if (lionsGames.length === 0) {
    return {
      status: 'COMMISSIONER_SELECTION_REQUIRED',
      game: null,
      eventId: null,
      provenance: null,
      isFrozen: false,
      reason: 'Detroit Lions have a bye week or no Lions game found in the slate. Commissioner selection required.',
    };
  }

  // More than 1 Lions game in a single week slate -> ambiguous schedule
  return {
    status: 'UNRESOLVED',
    game: null,
    eventId: null,
    provenance: null,
    isFrozen: false,
    reason: 'Ambiguous schedule: multiple Detroit Lions games found in weekly slate',
  };
}

/**
 * Retrieves the effective tiebreaker designation for a pool, season, and week,
 * taking into account stored commissioner overrides and freeze status.
 */
export function getWeeklyDesignation(
  poolSettings: any,
  season: number,
  week: number,
  games: GameSlateItem[]
): DesignationResolution {
  const designations = poolSettings?.tiebreaker_designations || {};
  const seasonMap = designations[String(season)] || designations[season] || {};
  const stored: StoredWeeklyDesignation | undefined = seasonMap[String(week)] || seasonMap[week];

  // If a stored designation exists (commissioner override or frozen default)
  if (stored && stored.eventId) {
    const matchedGame = games.find(
      (g) => String(g.externalGameId || g.id) === String(stored.eventId)
    );

    if (!matchedGame) {
      return {
        status: 'UNRESOLVED',
        game: null,
        eventId: stored.eventId,
        provenance: stored.provenance,
        isFrozen: stored.isFrozen,
        frozenAt: stored.frozenAt,
        firstPredictionUserId: stored.firstPredictionUserId,
        reason: `Designated game (${stored.eventId}) is not in the current weekly slate`,
      };
    }

    return {
      status: stored.provenance === 'COMMISSIONER_OVERRIDE' ? 'COMMISSIONER_OVERRIDE' : 'DEFAULT_LIONS',
      game: matchedGame,
      eventId: stored.eventId,
      provenance: stored.provenance,
      isFrozen: stored.isFrozen ?? false,
      frozenAt: stored.frozenAt,
      firstPredictionUserId: stored.firstPredictionUserId,
    };
  }

  // Fall back to pure default resolution
  return resolveDefaultDesignation(games);
}

/**
 * Validates and applies a commissioner tiebreaker game override.
 */
export function applyCommissionerOverride(params: {
  currentSettings: any;
  season: number;
  week: number;
  targetGameId: string;
  games: GameSlateItem[];
  requestingUserId: string;
  poolAdminId: string;
  isUserActiveMember: boolean;
  now?: Date;
}): { updatedSettings: any; designation: StoredWeeklyDesignation } {
  const {
    currentSettings,
    season,
    week,
    targetGameId,
    games,
    requestingUserId,
    poolAdminId,
    isUserActiveMember,
  } = params;

  const now = params.now || new Date();

  // 1. Verify commissioner authority
  if (requestingUserId !== poolAdminId) {
    throw new Error('FORBIDDEN: Only the pool commissioner may override the designated tiebreaker game');
  }

  // 2. Verify active membership
  if (!isUserActiveMember) {
    throw new Error('FORBIDDEN: Commissioner must have an active pool membership');
  }

  // 3. Resolve existing designation
  const existing = getWeeklyDesignation(currentSettings, season, week, games);

  // 4. Freeze rule check: cannot reassign after predictions acknowledged
  if (existing.isFrozen) {
    throw new Error('DESIGNATION_FROZEN: Cannot change designated tiebreaker game after predictions have been received');
  }

  // 5. Verify authoritative deadline of existing designation (Fail-Closed)
  const storedDesignation = currentSettings?.tiebreaker_designations?.[String(season)]?.[String(week)]
    || currentSettings?.tiebreaker_designations?.[season]?.[week];

  if (storedDesignation?.eventId) {
    // A stored designation exists and is being replaced
    if (!existing.game || existing.status === 'UNRESOLVED') {
      throw new Error(`UNVERIFIED_KICKOFF: Stored designated game (${storedDesignation.eventId}) is unresolved or missing from weekly slate. Replacement denied.`);
    }
    if (!existing.game.kickoffTime) {
      throw new Error('UNVERIFIED_KICKOFF: Missing kickoff time for existing designated game. Replacement denied.');
    }
    const oldKickoff = new Date(existing.game.kickoffTime);
    if (isNaN(oldKickoff.getTime())) {
      throw new Error('UNVERIFIED_KICKOFF: Invalid kickoff time for existing designated game. Replacement denied.');
    }
    if (now >= oldKickoff) {
      throw new Error('KICKOFF_PASSED: Cannot change designation because the existing designated game has already kicked off');
    }
  } else if (existing.status === 'DEFAULT_LIONS') {
    // Default Lions designation is active and being overridden
    if (!existing.game || !existing.game.kickoffTime) {
      throw new Error('UNVERIFIED_KICKOFF: Missing kickoff time for existing default designated game. Replacement denied.');
    }
    const oldKickoff = new Date(existing.game.kickoffTime);
    if (isNaN(oldKickoff.getTime())) {
      throw new Error('UNVERIFIED_KICKOFF: Invalid kickoff time for existing default designated game. Replacement denied.');
    }
    if (now >= oldKickoff) {
      throw new Error('KICKOFF_PASSED: Cannot change designation because the existing designated game has already kicked off');
    }
  } else if (existing.status === 'UNRESOLVED') {
    // Schedule is unresolved or ambiguous; fail closed
    throw new Error(`UNRESOLVED_DESIGNATION: Cannot override when existing schedule state is unresolved (${existing.reason || 'unresolved'}).`);
  } else if (existing.status === 'COMMISSIONER_SELECTION_REQUIRED') {
    // Legitimate initial selection when Lions are on bye or no Lions game exists in slate.
    // Allowed to proceed to set initial designation.
  }

  // 6. Find target game in the weekly slate
  const targetGame = games.find(
    (g) => String(g.externalGameId || g.id) === String(targetGameId)
  );

  if (!targetGame) {
    throw new Error('INVALID_TARGET: Target game is not in the specified weekly slate');
  }

  // 7. Verify proposed new target game has valid authoritative kickoff deadline and has not passed
  if (!targetGame.kickoffTime) {
    throw new Error('UNVERIFIED_KICKOFF: Target game kickoff time is missing');
  }
  const newKickoff = new Date(targetGame.kickoffTime);
  if (isNaN(newKickoff.getTime())) {
    throw new Error('UNVERIFIED_KICKOFF: Target game kickoff time is invalid');
  }
  if (now >= newKickoff) {
    throw new Error('KICKOFF_PASSED: Target game has already kicked off');
  }

  // 8. Create new designation entry
  const eventId = String(targetGame.externalGameId || targetGame.id);
  const newDesignation: StoredWeeklyDesignation = {
    eventId,
    gameTitle: `${targetGame.awayTeamId} @ ${targetGame.homeTeamId}`,
    kickoffTime: newKickoff.toISOString(),
    designatedBy: requestingUserId,
    designatedAt: now.toISOString(),
    provenance: 'COMMISSIONER_OVERRIDE',
    isFrozen: false,
  };

  // 9. Mutate settings immutably
  const settings = JSON.parse(JSON.stringify(currentSettings || {}));
  if (!settings.tiebreaker_designations) {
    settings.tiebreaker_designations = {};
  }
  if (!settings.tiebreaker_designations[String(season)]) {
    settings.tiebreaker_designations[String(season)] = {};
  }
  settings.tiebreaker_designations[String(season)][String(week)] = newDesignation;

  return {
    updatedSettings: settings,
    designation: newDesignation,
  };
}

/**
 * Freezes the designated game upon receipt of the first acknowledged prediction.
 */
export function freezeDesignation(params: {
  currentSettings: any;
  season: number;
  week: number;
  designatedEventId: string;
  firstPredictionUserId: string;
  games: GameSlateItem[];
  now?: Date;
}): any {
  const { currentSettings, season, week, designatedEventId, firstPredictionUserId, games } = params;
  const now = params.now || new Date();

  const settings = JSON.parse(JSON.stringify(currentSettings || {}));
  if (!settings.tiebreaker_designations) {
    settings.tiebreaker_designations = {};
  }
  if (!settings.tiebreaker_designations[String(season)]) {
    settings.tiebreaker_designations[String(season)] = {};
  }

  const existing = settings.tiebreaker_designations[String(season)][String(week)];
  if (existing && existing.isFrozen) {
    return settings; // Already frozen
  }

  const matchedGame = games.find(
    (g) => String(g.externalGameId || g.id) === String(designatedEventId)
  );

  const updated: StoredWeeklyDesignation = {
    eventId: designatedEventId,
    gameTitle: matchedGame ? `${matchedGame.awayTeamId} @ ${matchedGame.homeTeamId}` : undefined,
    kickoffTime: matchedGame ? new Date(matchedGame.kickoffTime).toISOString() : now.toISOString(),
    designatedBy: existing?.designatedBy || 'SYSTEM_DEFAULT',
    designatedAt: existing?.designatedAt || now.toISOString(),
    provenance: existing?.provenance || 'DEFAULT_LIONS',
    isFrozen: true,
    frozenAt: now.toISOString(),
    firstPredictionUserId,
  };

  settings.tiebreaker_designations[String(season)][String(week)] = updated;
  return settings;
}
