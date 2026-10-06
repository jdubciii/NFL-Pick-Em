import { Prisma } from '@prisma/client';
import { FeatureFlagKey, FeatureRegistry } from '../config/featureFlags';

export { FeatureFlagKey };

export type ShotCamState =
  | 'PENDING_UPLOAD'
  | 'COMMISSIONER_AUDIT'
  | 'DISPUTE_WINDOW_ACTIVE'
  | 'COMMUNITY_POLL_ACTIVE'
  | 'AUTO_APPROVED'
  | 'VERIFIED'
  | 'REJECTED';

export type ShotCamEventType =
  | 'UPLOAD'
  | 'REQUEST_AUDIT'
  | 'RAISE_DISPUTE'
  | 'TRIGGER_POLL'
  | 'RESOLVE_DISPUTE'
  | 'EXPIRE_DISPUTE'
  | 'APPROVE'
  | 'REJECT';

export interface ShotCamTransitionEvent {
  eventType: ShotCamEventType;
  actorUserId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ShotCamWorkflowState {
  mediaId: string;
  penaltyId: string;
  poolId: string;
  userId: string;
  currentState: ShotCamState;
  disputeWindowExpiresAt?: Date;
  isGameFinalized: boolean;
  gameKickoff: Date;
  history: ShotCamTransitionEvent[];
}

export interface SmsIngestPayload {
  messageSid: string;
  fromPhoneNumber: string;
  body: string;
  timestamp: Date;
  poolId: string;
  idempotencyKey: string;
  webhookSignature: string;
}

export interface WeeklyScoreEntry {
  userId: string;
  membershipId: string;
  poolId: string;
  totalPoints: Prisma.Decimal;
  picksCount: number;
  tiebreakerDelta?: Prisma.Decimal | null;
}

export interface DeadPlaceCalculationResult {
  userId: string;
  poolId: string;
  isDeadPlace: boolean;
  penaltyShotsOwed: Prisma.Decimal;
  flatFineOwed: Prisma.Decimal;
  effectivePoints: Prisma.Decimal;
}

export class Phase20CoreService {
  public static readonly DEAD_PLACE_ABSOLUTE_PENALTY = new Prisma.Decimal('2.50');
  public static readonly ZERO_DECIMAL = new Prisma.Decimal('0.00');

  private static readonly VALID_TRANSITIONS: Record<ShotCamState, Partial<Record<ShotCamEventType, ShotCamState>>> = {
    PENDING_UPLOAD: {
      UPLOAD: 'COMMISSIONER_AUDIT',
    },
    COMMISSIONER_AUDIT: {
      RAISE_DISPUTE: 'DISPUTE_WINDOW_ACTIVE',
      APPROVE: 'VERIFIED',
      REJECT: 'REJECTED',
    },
    DISPUTE_WINDOW_ACTIVE: {
      TRIGGER_POLL: 'COMMUNITY_POLL_ACTIVE',
      RESOLVE_DISPUTE: 'COMMISSIONER_AUDIT',
      EXPIRE_DISPUTE: 'COMMISSIONER_AUDIT',
    },
    COMMUNITY_POLL_ACTIVE: {
      RESOLVE_DISPUTE: 'COMMISSIONER_AUDIT',
      APPROVE: 'VERIFIED',
      REJECT: 'REJECTED',
    },
    AUTO_APPROVED: {
      RAISE_DISPUTE: 'DISPUTE_WINDOW_ACTIVE',
    },
    VERIFIED: {},
    REJECTED: {},
  };

  public static isFlagEnabled(key: FeatureFlagKey, store?: Record<string, boolean>): boolean {
    return FeatureRegistry.isEnabled(key, store);
  }

  /**
   * Enforces Decision #69 when flag is ON; preserves canonical BR-4 behavior when flag is OFF.
   * Fails closed if isWeekFinalized is not explicitly true.
   */
  public static evaluateDeadPlacePenalties(
    entries: WeeklyScoreEntry[],
    isFlagOn: boolean,
    isWeekFinalized?: boolean
  ): DeadPlaceCalculationResult[] {
    if (entries.length === 0) return [];

    const targetPoolId = entries[0].poolId;
    if (entries.some((e) => e.poolId !== targetPoolId)) {
      throw new Error('POOL_ISOLATION_VIOLATION: Cross-pool evaluation prohibited');
    }

    // Decision #55: Fail-closed on missing or false week finalization
    if (isWeekFinalized !== true) {
      throw new Error('WEEK_NOT_FINALIZED: Penalties cannot be evaluated prior to official week finalization');
    }

    if (isFlagOn) {
      // Decision #69: Derives no-show auto-loss internally
      const normalized = entries.map((entry) => ({
        ...entry,
        effectivePoints: entry.picksCount === 0 ? this.ZERO_DECIMAL : entry.totalPoints,
        isNoShow: entry.picksCount === 0,
      }));

      const sorted = [...normalized].sort((a, b) => b.effectivePoints.comparedTo(a.effectivePoints));
      const lowestScore = sorted[sorted.length - 1].effectivePoints;

      return normalized.map((entry) => {
        const isDeadPlace = entry.effectivePoints.equals(lowestScore) || entry.isNoShow;
        return {
          userId: entry.userId,
          poolId: entry.poolId,
          isDeadPlace,
          effectivePoints: entry.effectivePoints,
          penaltyShotsOwed: isDeadPlace ? this.DEAD_PLACE_ABSOLUTE_PENALTY : this.ZERO_DECIMAL,
          flatFineOwed: this.ZERO_DECIMAL,
        };
      });
    } else {
      // Canonical BR-4 Split Math: Uses raw caller points without Decision #69 override
      const sorted = [...entries].sort((a, b) => b.totalPoints.comparedTo(a.totalPoints));
      const lowestScore = sorted[sorted.length - 1].totalPoints;
      const tiedCount = entries.filter((e) => e.totalPoints.equals(lowestScore)).length;

      return entries.map((entry) => {
        const isDeadPlace = entry.totalPoints.equals(lowestScore);
        const splitPenalty = isDeadPlace
          ? this.DEAD_PLACE_ABSOLUTE_PENALTY.div(new Prisma.Decimal(tiedCount.toString()))
          : this.ZERO_DECIMAL;
        const noShowFine = entry.picksCount === 0 ? new Prisma.Decimal('2.00') : this.ZERO_DECIMAL;

        return {
          userId: entry.userId,
          poolId: entry.poolId,
          isDeadPlace,
          effectivePoints: entry.totalPoints,
          penaltyShotsOwed: splitPenalty,
          flatFineOwed: noShowFine,
        };
      });
    }
  }

  /**
   * Enforces Decision #55 & Decision #65: Finite State Machine for Shot-Cam workflow.
   */
  public static transitionShotCam(
    state: ShotCamWorkflowState,
    event: ShotCamTransitionEvent
  ): { success: boolean; state: ShotCamWorkflowState; error?: string } {
    // Decision #65: Kickoff lock supremacy (actions blocked before kickoff)
    if (event.timestamp.getTime() < state.gameKickoff.getTime()) {
      return { success: false, state, error: 'LOCK_SUPREMACY_VIOLATION: Actions blocked prior to game kickoff' };
    }

    const stateTransitions = this.VALID_TRANSITIONS[state.currentState];
    const nextState = stateTransitions ? stateTransitions[event.eventType] : undefined;

    if (!nextState) {
      return {
        success: false,
        state,
        error: `INVALID_STATE_TRANSITION: Event ${event.eventType} is not permitted from state ${state.currentState}`,
      };
    }

    // Fail-closed game finalization check on approval
    if (event.eventType === 'APPROVE' && !state.isGameFinalized) {
      return { success: false, state, error: 'UNFINALIZED_GAME: Cannot approve penalty before game is finalized' };
    }

    // Expiration check on dispute window
    if (event.eventType === 'EXPIRE_DISPUTE') {
      if (!state.disputeWindowExpiresAt || event.timestamp.getTime() < state.disputeWindowExpiresAt.getTime()) {
        return { success: false, state, error: 'DISPUTE_WINDOW_ACTIVE: Dispute window has not yet expired' };
      }
    }

    let disputeExpires = state.disputeWindowExpiresAt;
    if (event.eventType === 'RAISE_DISPUTE') {
      disputeExpires = new Date(event.timestamp.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      success: true,
      state: {
        ...state,
        currentState: nextState,
        disputeWindowExpiresAt: disputeExpires,
        history: [...state.history, event],
      },
    };
  }

  public static validateSmsIngestStructure(payload: SmsIngestPayload): { valid: boolean; error?: string } {
    if (!payload.messageSid || !payload.idempotencyKey || !payload.webhookSignature) {
      return { valid: false, error: 'INVALID_WEBHOOK_AUTH: Missing required security tokens' };
    }
    if (!payload.poolId || !payload.fromPhoneNumber) {
      return { valid: false, error: 'MISSING_TENANT_METADATA: Incomplete pool or phone number metadata' };
    }
    return { valid: true };
  }
}
