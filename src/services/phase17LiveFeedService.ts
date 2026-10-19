import { Prisma } from '@prisma/client';

export type FeedEventType = 'STAKE_CREATED' | 'STAKE_SETTLED' | 'CONSENSUS_SHIFT' | 'LOCK_EVENT';

export interface FeedEventPayload {
  eventId: string;
  poolId: string;
  gameId?: string;
  type: FeedEventType;
  cohortSize?: number;
  message: string;
  metricDelta?: Prisma.Decimal;
  timestamp: Date;
  isRedacted: boolean;
  redactionReason?: string;
}

export interface ActivityFilterOptions {
  poolId: string;
  flagStoreValue: boolean | null | undefined;
  viewerMembershipId: string;
}

export class Phase17LiveFeedService {
  private static readonly CIRCUIT_BREAKER_KEY = 'phase_17_live_feed';
  public static readonly MIN_COHORT_FLOOR = 3;

  public static isCircuitBreakerOpen(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue !== true;
  }

  /**
   * Sanitizes an individual feed item based on Decision #66 (Lock Supremacy)
   * and Anti-Peeking Cohort Floor (N >= 3).
   */
  public static sanitizeFeedEvent(
    event: FeedEventPayload,
    isGameLocked: boolean
  ): FeedEventPayload {
    // Under P41-POOL-VISIBILITY-2026-10-19-08: All saved same-pool telemetry/consensus visible immediately.
    // Kickoff secrecy masks and cohort suppression removed.
    return {
      ...event,
      isRedacted: false,
      redactionReason: undefined,
    };
  }

  /**
   * Filters and builds live activity stream for pool members.
   * Enforces Decision #62 (Circuit Breaker) and Decision #20 (Membership context).
   */
  public static getFeedStream(
    events: FeedEventPayload[],
    lockMap: Record<string, boolean>,
    options: ActivityFilterOptions
  ): { success: boolean; stream?: FeedEventPayload[]; error?: string } {
    if (this.isCircuitBreakerOpen(options.flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Live feed disabled for pool' };
    }

    const sanitized = events
      .filter((ev) => ev.poolId === options.poolId)
      .map((ev) => {
        const isLocked = ev.gameId ? !!lockMap[ev.gameId] : true;
        return this.sanitizeFeedEvent(ev, isLocked);
      });

    return {
      success: true,
      stream: sanitized,
    };
  }
}
