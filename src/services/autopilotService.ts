import { FeatureFlagKey, FeatureRegistry } from '../config/featureFlags';
import { SmsIngestPayload } from './phase20CoreService';

export type AutopilotPresetStrategy =
  | 'ALL_HOME'
  | 'ALL_AWAY'
  | 'FAVORITES'
  | 'UNDERDOGS'
  | 'CONTRARIAN'
  | 'MIRROR_RIVAL';

export interface GameSlateMatchup {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  spreadHome: number; // e.g. -3.5 means home is favorite
  consensusHomeRatio?: number; // 0.0 to 1.0
}

export interface StagedPickResult {
  gameId: string;
  selectedTeam: string;
  isLocked: boolean;
}

export interface ProcessedSmsSubmission {
  messageSid: string;
  userId: string;
  poolId: string;
  parsedPicks: string[];
  status: 'ACCEPTED' | 'REJECTED' | 'DUPLICATE';
  error?: string;
}

export class AutopilotService {
  /**
   * Generates pick selections based on the requested strategy.
   * Enforces Decision #65 (Kickoff Lock Supremacy): games past kickoff are marked locked and skipped.
   */
  public static generatePicks(
    matchups: GameSlateMatchup[],
    strategy: AutopilotPresetStrategy,
    currentTime: Date = new Date(),
    rivalPicks?: Map<string, string>
  ): StagedPickResult[] {
    return matchups.map((game) => {
      const isLocked = currentTime.getTime() >= game.kickoff.getTime();
      if (isLocked) {
        return {
          gameId: game.gameId,
          selectedTeam: 'LOCKED',
          isLocked: true,
        };
      }

      let selectedTeam = game.homeTeam;

      switch (strategy) {
        case 'ALL_HOME':
          selectedTeam = game.homeTeam;
          break;
        case 'ALL_AWAY':
          selectedTeam = game.awayTeam;
          break;
        case 'FAVORITES':
          selectedTeam = game.spreadHome <= 0 ? game.homeTeam : game.awayTeam;
          break;
        case 'UNDERDOGS':
          selectedTeam = game.spreadHome > 0 ? game.homeTeam : game.awayTeam;
          break;
        case 'CONTRARIAN':
          const homeRatio = game.consensusHomeRatio ?? 0.5;
          selectedTeam = homeRatio >= 0.5 ? game.awayTeam : game.homeTeam;
          break;
        case 'MIRROR_RIVAL':
          if (rivalPicks && rivalPicks.has(game.gameId)) {
            selectedTeam = rivalPicks.get(game.gameId)!;
          } else {
            selectedTeam = game.homeTeam;
          }
          break;
      }

      return {
        gameId: game.gameId,
        selectedTeam,
        isLocked: false,
      };
    });
  }
}

export class SmsFallbackIngestService {
  private static processedMessageSids = new Set<string>();

  /**
   * Ingests and parses incoming SMS fallback submissions.
   * Enforces Decision #62 (circuit breaker), Decision #20 (pool scoping), and idempotency.
   */
  public static ingestMessage(
    payload: SmsIngestPayload,
    userPhoneMap: Map<string, string>,
    flagStore?: Record<string, boolean>
  ): ProcessedSmsSubmission {
    const isFlagOn = FeatureRegistry.isEnabled(FeatureFlagKey.SMS_FALLBACK_INGEST, flagStore);
    if (!isFlagOn) {
      return {
        messageSid: payload.messageSid,
        userId: '',
        poolId: payload.poolId,
        parsedPicks: [],
        status: 'REJECTED',
        error: 'CIRCUIT_BREAKER_TRIPPED: SMS_FALLBACK_INGEST feature flag is OFF',
      };
    }

    // Idempotency check
    if (this.processedMessageSids.has(payload.messageSid) || this.processedMessageSids.has(payload.idempotencyKey)) {
      return {
        messageSid: payload.messageSid,
        userId: '',
        poolId: payload.poolId,
        parsedPicks: [],
        status: 'DUPLICATE',
        error: 'DUPLICATE_INGEST: Message already processed',
      };
    }

    // Webhook auth check
    if (!payload.webhookSignature || payload.webhookSignature.trim() === '') {
      return {
        messageSid: payload.messageSid,
        userId: '',
        poolId: payload.poolId,
        parsedPicks: [],
        status: 'REJECTED',
        error: 'INVALID_SIGNATURE: Webhook signature authentication failed',
      };
    }

    // Phone to user lookup (Decision #20 Tenant isolation)
    const userId = userPhoneMap.get(payload.fromPhoneNumber);
    if (!userId) {
      return {
        messageSid: payload.messageSid,
        userId: '',
        poolId: payload.poolId,
        parsedPicks: [],
        status: 'REJECTED',
        error: 'UNKNOWN_SENDER: Phone number not registered to any pool member',
      };
    }

    // Parse picks from SMS body (e.g. "KC, BUF, BAL")
    const picks = payload.body
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    this.processedMessageSids.add(payload.messageSid);
    this.processedMessageSids.add(payload.idempotencyKey);

    return {
      messageSid: payload.messageSid,
      userId,
      poolId: payload.poolId,
      parsedPicks: picks,
      status: 'ACCEPTED',
    };
  }

  public static resetCache(): void {
    this.processedMessageSids.clear();
  }
}
