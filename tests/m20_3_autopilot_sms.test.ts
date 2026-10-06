import { describe, it, expect, beforeEach } from 'vitest';
import {
  AutopilotService,
  SmsFallbackIngestService,
  GameSlateMatchup,
} from '../src/services/autopilotService';
import { SmsIngestPayload } from '../src/services/phase20CoreService';

describe('Milestone 20.3: Autopilot Presets & SMS Fallback Ingest Invariants', () => {
  const poolId = 'pool_league_private_10';
  const now = new Date('2026-10-08T17:00:00.000Z');

  const slate: GameSlateMatchup[] = [
    {
      gameId: 'g1',
      homeTeam: 'KC',
      awayTeam: 'LV',
      kickoff: new Date('2026-10-08T18:00:00.000Z'), // Future
      spreadHome: -7.0,
      consensusHomeRatio: 0.85,
    },
    {
      gameId: 'g2',
      homeTeam: 'DET',
      awayTeam: 'GB',
      kickoff: new Date('2026-10-08T18:00:00.000Z'), // Future
      spreadHome: 2.5,
      consensusHomeRatio: 0.40,
    },
    {
      gameId: 'g3',
      homeTeam: 'PHI',
      awayTeam: 'NYG',
      kickoff: new Date('2026-10-08T16:00:00.000Z'), // Past kickoff
      spreadHome: -6.0,
      consensusHomeRatio: 0.90,
    },
  ];

  beforeEach(() => {
    SmsFallbackIngestService.resetCache();
  });

  describe('Autopilot Presets Engine & Lock Supremacy (Decision #65)', () => {
    it('enforces Decision #65: Games past kickoff are strictly locked and skipped', () => {
      const picks = AutopilotService.generatePicks(slate, 'ALL_HOME', now);
      expect(picks.length).toBe(3);

      expect(picks[0].gameId).toBe('g1');
      expect(picks[0].selectedTeam).toBe('KC');
      expect(picks[0].isLocked).toBe(false);

      // g3 is past kickoff -> locked
      expect(picks[2].gameId).toBe('g3');
      expect(picks[2].selectedTeam).toBe('LOCKED');
      expect(picks[2].isLocked).toBe(true);
    });

    it('generates FAVORITES preset accurately', () => {
      const picks = AutopilotService.generatePicks(slate, 'FAVORITES', now);
      expect(picks[0].selectedTeam).toBe('KC'); // spread -7 -> favorite is home
      expect(picks[1].selectedTeam).toBe('GB'); // spread +2.5 -> favorite is away
    });

    it('generates UNDERDOGS preset accurately', () => {
      const picks = AutopilotService.generatePicks(slate, 'UNDERDOGS', now);
      expect(picks[0].selectedTeam).toBe('LV'); // underdog is away
      expect(picks[1].selectedTeam).toBe('DET'); // underdog is home
    });

    it('generates CONTRARIAN preset based on consensus ratio', () => {
      const picks = AutopilotService.generatePicks(slate, 'CONTRARIAN', now);
      expect(picks[0].selectedTeam).toBe('LV'); // 85% home -> picks contrarian away
      expect(picks[1].selectedTeam).toBe('DET'); // 40% home -> picks contrarian home
    });

    it('generates MIRROR_RIVAL preset from rival pick map', () => {
      const rivalPicks = new Map<string, string>([
        ['g1', 'LV'],
        ['g2', 'GB'],
      ]);
      const picks = AutopilotService.generatePicks(slate, 'MIRROR_RIVAL', now, rivalPicks);
      expect(picks[0].selectedTeam).toBe('LV');
      expect(picks[1].selectedTeam).toBe('GB');
    });
  });

  describe('SMS Fallback Ingest Service (Decisions #20, #55, #62)', () => {
    const userPhoneMap = new Map<string, string>([
      ['+15555550100', 'usr_john_doe'],
    ]);

    const validPayload: SmsIngestPayload = {
      messageSid: 'SM_TEST_001',
      fromPhoneNumber: '+15555550100',
      body: 'KC, GB, DET',
      timestamp: now,
      poolId,
      idempotencyKey: 'IDEM_001',
      webhookSignature: 'sig_valid_sha256',
    };

    it('enforces Decision #62: Rejects SMS ingest when SMS_FALLBACK_INGEST flag is OFF', () => {
      const result = SmsFallbackIngestService.ingestMessage(
        validPayload,
        userPhoneMap,
        { SMS_FALLBACK_INGEST: false }
      );
      expect(result.status).toBe('REJECTED');
      expect(result.error).toContain('CIRCUIT_BREAKER_TRIPPED');
    });

    it('accepts valid authenticated SMS payload and parses picks', () => {
      const result = SmsFallbackIngestService.ingestMessage(
        validPayload,
        userPhoneMap,
        { SMS_FALLBACK_INGEST: true }
      );
      expect(result.status).toBe('ACCEPTED');
      expect(result.userId).toBe('usr_john_doe');
      expect(result.parsedPicks).toEqual(['KC', 'GB', 'DET']);
    });

    it('enforces idempotency: Rejects duplicate messageSid replay attacks', () => {
      const first = SmsFallbackIngestService.ingestMessage(
        validPayload,
        userPhoneMap,
        { SMS_FALLBACK_INGEST: true }
      );
      expect(first.status).toBe('ACCEPTED');

      const replay = SmsFallbackIngestService.ingestMessage(
        validPayload,
        userPhoneMap,
        { SMS_FALLBACK_INGEST: true }
      );
      expect(replay.status).toBe('DUPLICATE');
      expect(replay.error).toContain('DUPLICATE_INGEST');
    });

    it('enforces Decision #20: Rejects unregistered sender phone numbers', () => {
      const unknownSenderPayload = {
        ...validPayload,
        messageSid: 'SM_UNKNOWN_002',
        idempotencyKey: 'IDEM_002',
        fromPhoneNumber: '+19999999999',
      };
      const result = SmsFallbackIngestService.ingestMessage(
        unknownSenderPayload,
        userPhoneMap,
        { SMS_FALLBACK_INGEST: true }
      );
      expect(result.status).toBe('REJECTED');
      expect(result.error).toContain('UNKNOWN_SENDER');
    });
  });
});
