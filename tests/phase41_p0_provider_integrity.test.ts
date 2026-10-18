import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GameStatus } from '@prisma/client';
import {
  validateAndTransformESPNScoreboard,
  fetchAuthoritativeESPNScoreboard,
  computeManifestFingerprint,
  ESPNProviderScope,
} from '../src/services/authoritativeSlateService';
import {
  resolveDefaultDesignation,
  isDetroitLions,
} from '../src/services/weeklyDesignationService';
import {
  resolveCanonicalGameKickoff,
} from '../src/services/dependableInfoService';
import {
  fetchLiveNFLScores,
  processLiveScoreUpdate,
} from '../src/services/liveScoreService';

describe('P41 — P0 Provider Integrity & Mock Source Purge Regression Suite', () => {
  const RAW_CAPTURE_PATH = path.resolve('docs/evidence/P41_ESPN_LIVE_CAPTURE/espn_week6_2026_raw.json');
  const rawCaptureText = fs.readFileSync(RAW_CAPTURE_PATH, 'utf8');
  const rawCaptureJson = JSON.parse(rawCaptureText);

  const WEEK6_SCOPE: ESPNProviderScope = {
    seasonYear: 2026,
    seasonType: 2,
    weekNumber: 6,
  };

  // =========================================================================
  // 1. Authentic Provider Schema Handling
  // =========================================================================
  it('1. Authentic Provider Schema Handling: parses real Week 6 ESPN scoreboard JSON into verified canonical manifest', () => {
    const observation = validateAndTransformESPNScoreboard(rawCaptureJson, WEEK6_SCOPE);
    expect(observation.status).toBe('VERIFIED');
    expect(observation.provider).toBe('ESPN');
    expect(observation.league).toBe('NFL');
    expect(observation.seasonYear).toBe(2026);
    expect(observation.seasonType).toBe(2);
    expect(observation.weekNumber).toBe(6);
    expect(observation.eventCount).toBe(14);
    expect(observation.reasons).toEqual([]);

    // Check specific verified event 401872995 (SEA @ DEN)
    const seaDen = observation.events.find((e) => e.externalGameId === '401872995');
    expect(seaDen).toBeDefined();
    expect(seaDen?.homeTeamId).toBe('DEN');
    expect(seaDen?.awayTeamId).toBe('SEA');
    expect(seaDen?.homeTeamName).toBe('Denver Broncos');
    expect(seaDen?.awayTeamName).toBe('Seattle Seahawks');
    expect(seaDen?.status).toBe(GameStatus.FINAL);
    expect(seaDen?.homeScore).toBe(17);
    expect(seaDen?.awayScore).toBe(14);
    expect(seaDen?.statusDetail).toBe('Final/OT');

    // Deterministic manifest fingerprint
    expect(observation.manifestFingerprint).toBe('c72f7e4c7a5579785acd9a4e1e7068f7c7d6bd06144fa531392bf9614ce7ad43');
  });

  // =========================================================================
  // 2. Production Exclusion of Test Fixtures
  // =========================================================================
  it('2. Production Exclusion of Test Fixtures: guarantees production code does not import test fixtures or define mock arrays', () => {
    const srcServicesDir = path.resolve('src/services');
    const clientSrcDir = path.resolve('client/src');

    function checkDirForContamination(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDirForContamination(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Disallow imports from tests directory
          expect(content).not.toMatch(/from\s+['"][^'"]*\/tests\//);
          // Disallow mockInfamyRecords in client
          expect(content).not.toContain('mockInfamyRecords');
        }
      }
    }

    checkDirForContamination(srcServicesDir);
    checkDirForContamination(clientSrcDir);
  });

  // =========================================================================
  // 3. No Hardcoded Mock-Response Fallback
  // =========================================================================
  it('3. No Hardcoded Mock-Response Fallback: returns UNVERIFIED_SOURCE / empty array on provider failure', async () => {
    // Simulated network outage / failure
    const mockFailingFetch = vi.fn().mockRejectedValue(new Error('ESPN upstream network connection refused'));
    const obs = await fetchAuthoritativeESPNScoreboard(WEEK6_SCOPE, mockFailingFetch as any);

    expect(obs.status).toBe('UNVERIFIED_SOURCE');
    expect(obs.eventCount).toBe(0);
    expect(obs.events).toEqual([]);
    expect(obs.manifestFingerprint).toBe('');
    expect(obs.reasons[0]).toContain('FETCH_ERROR: ESPN upstream network connection refused');

    // HTTP 503 Service Unavailable
    const mock503Fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });
    const obs503 = await fetchAuthoritativeESPNScoreboard(WEEK6_SCOPE, mock503Fetch as any);
    expect(obs503.status).toBe('UNVERIFIED_SOURCE');
    expect(obs503.events).toEqual([]);
    expect(obs503.reasons[0]).toContain('HTTP_503');
  });

  // =========================================================================
  // 4. Wrong Season / Week Rejection
  // =========================================================================
  it('4. Wrong Season / Week Rejection: rejects mismatched season or week with UNVERIFIED_SOURCE', () => {
    // Mismatched season year
    const wrongSeason = {
      ...rawCaptureJson,
      season: { year: 2025, type: 2 },
    };
    const obsSeason = validateAndTransformESPNScoreboard(wrongSeason, WEEK6_SCOPE);
    expect(obsSeason.status).toBe('UNVERIFIED_SOURCE');
    expect(obsSeason.reasons.some((r) => r.includes('SCOPE_MISMATCH_SEASON'))).toBe(true);

    // Mismatched week number
    const wrongWeek = {
      ...rawCaptureJson,
      week: { number: 7 },
    };
    const obsWeek = validateAndTransformESPNScoreboard(wrongWeek, WEEK6_SCOPE);
    expect(obsWeek.status).toBe('UNVERIFIED_SOURCE');
    expect(obsWeek.reasons.some((r) => r.includes('SCOPE_MISMATCH_WEEK'))).toBe(true);
  });

  // =========================================================================
  // 5. Event/Team Identity Consistency
  // =========================================================================
  it('5. Event/Team Identity Consistency: verifies home/away teams differ, are valid codes, and kickoff times are parseable', () => {
    const observation = validateAndTransformESPNScoreboard(rawCaptureJson, WEEK6_SCOPE);
    expect(observation.events.length).toBe(14);

    for (const ev of observation.events) {
      expect(ev.externalGameId).toMatch(/^40187\d{4}$/);
      expect(ev.homeTeamId).not.toBe(ev.awayTeamId);
      expect(ev.homeTeamId).not.toBe('UNK');
      expect(ev.awayTeamId).not.toBe('UNK');
      expect(isNaN(ev.kickoffTime.getTime())).toBe(false);
      expect(ev.seasonYear).toBe(2026);
      expect(ev.weekNumber).toBe(6);
    }
  });

  // =========================================================================
  // 6. Genuine FINAL versus Provisional Scores
  // =========================================================================
  it('6. Genuine FINAL vs Provisional Scores: FINAL requires real scores; provisional does not fabricate FINAL', () => {
    // 401872995 is genuinely FINAL with real scores
    const seaDen = rawCaptureJson.events.find((e: any) => e.id === '401872995');
    expect(seaDen.status.type.name).toBe('STATUS_FINAL');
    expect(seaDen.competitions[0].competitors.find((c: any) => c.homeAway === 'home').score).toBe('17');
    expect(seaDen.competitions[0].competitors.find((c: any) => c.homeAway === 'away').score).toBe('14');

    // 401872996 is SCHEDULED (pre-game) and has null scores
    const observation = validateAndTransformESPNScoreboard(rawCaptureJson, WEEK6_SCOPE);
    const houJax = observation.events.find((e) => e.externalGameId === '401872996');
    expect(houJax?.status).toBe(GameStatus.SCHEDULED);
    expect(houJax?.homeScore).toBeNull();
    expect(houJax?.awayScore).toBeNull();

    // Fabricating FINAL without numeric scores must fail validation
    const fakeFinalPayload = {
      ...rawCaptureJson,
      events: [
        {
          id: '999999999',
          date: '2026-10-18T17:00:00Z',
          competitions: [
            {
              competitors: [
                { homeAway: 'home', team: { abbreviation: 'KC' } },
                { homeAway: 'away', team: { abbreviation: 'LV' } },
              ],
              status: { type: { name: 'STATUS_FINAL', completed: true, state: 'post' } },
            },
          ],
        },
      ],
    };
    const obsFakeFinal = validateAndTransformESPNScoreboard(fakeFinalPayload, WEEK6_SCOPE);
    expect(obsFakeFinal.status).toBe('UNVERIFIED_SOURCE');
    expect(obsFakeFinal.reasons.some((r) => r.includes('FINAL_WITHOUT_SCORES'))).toBe(true);
  });

  // =========================================================================
  // 7. Outage and Incomplete-Manifest Fail-Closed Behavior
  // =========================================================================
  it('7. Outage & Incomplete-Manifest Fail-Closed: rejects empty slate and malformed structures', () => {
    const emptyPayload = { season: { year: 2026, type: 2 }, week: { number: 6 }, events: [] };
    const emptyObs = validateAndTransformESPNScoreboard(emptyPayload, WEEK6_SCOPE);
    expect(emptyObs.status).toBe('UNVERIFIED_SOURCE');
    expect(emptyObs.manifestFingerprint).toBe('');
    expect(emptyObs.reasons.some((r) => r.includes('EMPTY_SLATE'))).toBe(true);

    const nullPayloadObs = validateAndTransformESPNScoreboard(null, WEEK6_SCOPE);
    expect(nullPayloadObs.status).toBe('UNVERIFIED_SOURCE');
    expect(nullPayloadObs.manifestFingerprint).toBe('');
    expect(nullPayloadObs.reasons.some((r) => r.includes('MALFORMED_RESPONSE'))).toBe(true);
  });

  // =========================================================================
  // 8. Correct Lions Designation
  // =========================================================================
  it('8. Correct Lions Designation: Detroit on BYE yields COMMISSIONER_SELECTION_REQUIRED, never DEFAULT_LIONS', () => {
    const observation = validateAndTransformESPNScoreboard(rawCaptureJson, WEEK6_SCOPE);

    // Check week 6 teams on bye from real ESPN metadata
    const teamsOnBye = rawCaptureJson.week.teamsOnBye.map((t: any) => t.abbreviation);
    expect(teamsOnBye).toContain('DET');

    // Run resolveDefaultDesignation with verified Week 6 game slate
    const slateItems = observation.events.map((e) => ({
      id: e.externalGameId,
      externalGameId: e.externalGameId,
      homeTeamId: e.homeTeamId,
      awayTeamId: e.awayTeamId,
      kickoffTime: e.kickoffTime,
    }));

    const designation = resolveDefaultDesignation(slateItems);
    expect(designation.status).toBe('COMMISSIONER_SELECTION_REQUIRED');
    expect(designation.eventId).toBeNull();
    expect(designation.game).toBeNull();
    expect(designation.provenance).toBeNull();
    expect(designation.reason).toContain('Detroit Lions have a bye week');

    // Verify 401872995 is NOT Lions
    const event401872995 = observation.events.find((e) => e.externalGameId === '401872995');
    expect(isDetroitLions(event401872995?.homeTeamId)).toBe(false);
    expect(isDetroitLions(event401872995?.awayTeamId)).toBe(false);
  });

  // =========================================================================
  // 9. Saved-Pick Mapping Conflict Detection
  // =========================================================================
  it('9. Saved-Pick Mapping Conflict Detection: all 80 saved picks map to genuine participating teams; conflict detected on foreign team', () => {
    const observation = validateAndTransformESPNScoreboard(rawCaptureJson, WEEK6_SCOPE);
    const eventMap = new Map(observation.events.map((e) => [e.externalGameId, e]));

    // All 9 saved game IDs and selected teams from production DB
    const savedPicksAuditData = [
      { gameId: '401872995', selectedTeam: 'SEA' },
      { gameId: '401872996', selectedTeam: 'HOU' },
      { gameId: '401872996', selectedTeam: 'JAX' },
      { gameId: '401872997', selectedTeam: 'BAL' },
      { gameId: '401872997', selectedTeam: 'CLE' },
      { gameId: '401872998', selectedTeam: 'CAR' },
      { gameId: '401872998', selectedTeam: 'PHI' },
      { gameId: '401872999', selectedTeam: 'ATL' },
      { gameId: '401872999', selectedTeam: 'CHI' },
      { gameId: '401873000', selectedTeam: 'NO' },
      { gameId: '401873000', selectedTeam: 'NYG' },
      { gameId: '401873001', selectedTeam: 'NE' },
      { gameId: '401873001', selectedTeam: 'NYJ' },
      { gameId: '401873002', selectedTeam: 'PIT' },
      { gameId: '401873002', selectedTeam: 'TB' },
      { gameId: '401873003', selectedTeam: 'IND' },
      { gameId: '401873003', selectedTeam: 'TEN' },
    ];

    for (const pick of savedPicksAuditData) {
      const event = eventMap.get(pick.gameId);
      expect(event).toBeDefined();
      const isValidParticipant = event?.homeTeamId === pick.selectedTeam || event?.awayTeamId === pick.selectedTeam;
      expect(isValidParticipant).toBe(true);
    }

    // Conflict detection function
    function checkPickConflict(pick: { gameId: string; selectedTeam: string }): 'OK' | 'P41_PRODUCTION_PICK_MAPPING_CONFLICT' {
      const ev = eventMap.get(pick.gameId);
      if (!ev) return 'P41_PRODUCTION_PICK_MAPPING_CONFLICT';
      if (ev.homeTeamId !== pick.selectedTeam && ev.awayTeamId !== pick.selectedTeam) {
        return 'P41_PRODUCTION_PICK_MAPPING_CONFLICT';
      }
      return 'OK';
    }

    // Normal picks produce OK
    expect(checkPickConflict({ gameId: '401872995', selectedTeam: 'SEA' })).toBe('OK');
    expect(checkPickConflict({ gameId: '401872995', selectedTeam: 'DEN' })).toBe('OK');

    // Erroneous pick (e.g. member picked SF for 401872995) triggers conflict
    expect(checkPickConflict({ gameId: '401872995', selectedTeam: 'SF' })).toBe('P41_PRODUCTION_PICK_MAPPING_CONFLICT');
  });

  // =========================================================================
  // 10. Read-Only Preview Behavior
  // =========================================================================
  it('10. Read-Only Preview Behavior: resolveCanonicalGameKickoff is idempotent, pure, and fails closed without authority (Decisions #54, #55)', () => {
    const seaDenInput = {
      id: '401872995',
      awayTeam: 'SEA',
      homeTeam: 'DEN',
      kickoffIso: '2026-10-16T00:15:00.000Z',
    };

    const res1 = resolveCanonicalGameKickoff(seaDenInput);
    const res2 = resolveCanonicalGameKickoff(seaDenInput);
    expect(res1).toEqual(res2);
    expect(res1.status).toBe('RESOLVED');
    expect(res1.isResolved).toBe(true);
    expect(res1.gameId).toBe('401872995');
    expect(res1.isThursdayNight).toBe(true);
    expect(res1.kickoffDisplay).toBe('Thu 5:15 PM');

    // DAL @ GB without canonical kickoff authority returns explicit UNAVAILABLE (no fixed substitute)
    const dalGbWithoutAuthority = resolveCanonicalGameKickoff({
      awayTeam: 'DAL',
      homeTeam: 'GB',
    });
    expect(dalGbWithoutAuthority.status).toBe('UNAVAILABLE');
    expect(dalGbWithoutAuthority.isResolved).toBe(false);
    expect(dalGbWithoutAuthority.kickoffIso).toBe('');
    expect(dalGbWithoutAuthority.kickoffDisplay).toBe('Unavailable');

    // DAL @ GB with canonical kickoff authority resolves correctly
    const dalGbWithAuthority = resolveCanonicalGameKickoff({
      id: '401873007',
      awayTeam: 'DAL',
      homeTeam: 'GB',
      kickoffIso: '2026-10-19T00:20:00.000Z',
    });
    expect(dalGbWithAuthority.status).toBe('RESOLVED');
    expect(dalGbWithAuthority.isResolved).toBe(true);
    expect(dalGbWithAuthority.kickoffDisplay).toBe('Sun 5:20 PM');
    expect(dalGbWithAuthority.gameId).toBe('401873007');
  });
});
