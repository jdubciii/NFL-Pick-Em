import { Prisma } from '@prisma/client';
import { Phase17SocialStakesService, SocialStakeRecord } from './phase17SocialStakesService';
import { Phase17TelemetryPipelineService, PickTelemetryInput, SweatRadarMetric } from './phase17TelemetryPipelineService';
import { Phase17LiveFeedService, FeedEventPayload } from './phase17LiveFeedService';

export interface Phase17FullPoolContext {
  poolId: string;
  isMember: boolean;
  featureFlags: {
    socialStakes: boolean;
    telemetryUi: boolean;
    liveFeed: boolean;
  };
}

export class Phase17IntegrationOrchestrator {
  /**
   * Enforces Decision #20 (Membership check), Decision #62 (Circuit breakers),
   * Decision #66 (Lock supremacy), Anti-Peeking Cohort Floor (N >= 3),
   * and Decisions #3 & #22 (Prisma.Decimal precision) across all Phase 17 modules.
   */
  public static executePoolSocialTelemetrySuite(params: {
    context: Phase17FullPoolContext;
    gameId: string;
    kickoffTime: Date;
    currentTime: Date;
    picks: PickTelemetryInput[];
    stakeInput?: {
      creatorMembershipId: string;
      targetMembershipId: string;
      amount: Prisma.Decimal;
      creatorEscrow: Prisma.Decimal;
    };
  }): {
    authorized: boolean;
    telemetry?: SweatRadarMetric;
    stakeResult?: { success: boolean; stake?: SocialStakeRecord; error?: string };
    feedEvents?: FeedEventPayload[];
    error?: string;
  } {
    // Decision #20: Strict pool membership guard
    if (!params.context.isMember) {
      return { authorized: false, error: 'POOL_MEMBERSHIP_REQUIRED: Access denied' };
    }

    // Telemetry Pipeline Evaluation
    let telemetry: SweatRadarMetric | undefined;
    if (params.context.featureFlags.telemetryUi) {
      const telemRes = Phase17TelemetryPipelineService.computeGameSweatTelemetry({
        gameId: params.gameId,
        kickoffTime: params.kickoffTime,
        currentTime: params.currentTime,
        picks: params.picks,
        flagStoreValue: params.context.featureFlags.telemetryUi,
      });
      if (telemRes.success) {
        telemetry = telemRes.data;
      }
    }

    // Social Stake Creation Evaluation
    let stakeResult: { success: boolean; stake?: SocialStakeRecord; error?: string } | undefined;
    if (params.stakeInput && params.context.featureFlags.socialStakes) {
      stakeResult = Phase17SocialStakesService.createStake({
        poolId: params.context.poolId,
        gameId: params.gameId,
        creatorMembershipId: params.stakeInput.creatorMembershipId,
        targetMembershipId: params.stakeInput.targetMembershipId,
        amount: params.stakeInput.amount,
        creatorAvailableEscrow: params.stakeInput.creatorEscrow,
        flagStoreValue: params.context.featureFlags.socialStakes,
      });
    }

    // Live Feed Generation
    let feedEvents: FeedEventPayload[] | undefined;
    if (params.context.featureFlags.liveFeed) {
      const rawEvents: FeedEventPayload[] = [];
      if (stakeResult && stakeResult.success && stakeResult.stake) {
        rawEvents.push({
          eventId: 'ev_' + stakeResult.stake.id,
          poolId: params.context.poolId,
          gameId: params.gameId,
          type: 'STAKE_CREATED',
          message: 'Social stake placed: ' + stakeResult.stake.amount.toString(),
          metricDelta: stakeResult.stake.amount,
          timestamp: new Date(),
          isRedacted: false,
        });
      }

      const isLocked = Phase17TelemetryPipelineService.evaluateGameLock(params.kickoffTime, params.currentTime);
      const feedRes = Phase17LiveFeedService.getFeedStream(rawEvents, { [params.gameId]: isLocked }, {
        poolId: params.context.poolId,
        flagStoreValue: params.context.featureFlags.liveFeed,
        viewerMembershipId: params.stakeInput?.creatorMembershipId || 'viewer',
      });

      if (feedRes.success) {
        feedEvents = feedRes.stream;
      }
    }

    return {
      authorized: true,
      telemetry,
      stakeResult,
      feedEvents,
    };
  }
}
