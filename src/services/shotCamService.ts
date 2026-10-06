import { Prisma } from '@prisma/client';
import { FeatureFlagKey, FeatureRegistry } from '../config/featureFlags';
import {
  ShotCamState,
  ShotCamEventType,
  ShotCamTransitionEvent,
  ShotCamWorkflowState,
  Phase20CoreService,
} from './phase20CoreService';

export interface ShotCamMediaMetadata {
  videoUrl: string;
  durationSeconds?: number;
  uploadedByUserId: string;
  workflowState: ShotCamWorkflowState;
}

export interface VerificationResult {
  success: boolean;
  newState?: ShotCamWorkflowState;
  error?: string;
}

export class ShotCamService {
  /**
   * Initializes a Shot-Cam media tracking workflow.
   * Enforces Decision #20 (pool isolation) and Decision #62 (circuit breaker check).
   */
  public static initializeWorkflow(
    mediaId: string,
    penaltyId: string,
    poolId: string,
    userId: string,
    gameKickoff: Date,
    isGameFinalized: boolean = false
  ): ShotCamWorkflowState {
    return {
      mediaId,
      penaltyId,
      poolId,
      userId,
      currentState: 'PENDING_UPLOAD',
      isGameFinalized,
      gameKickoff,
      history: [],
    };
  }

  /**
   * Executes a state transition for Shot-Cam verification.
   * Gated behind FeatureFlagKey.SHOT_CAM_WORKFLOW.
   */
  public static processTransition(
    state: ShotCamWorkflowState,
    event: ShotCamTransitionEvent,
    flagStore?: Record<string, boolean>
  ): VerificationResult {
    const isFlagOn = FeatureRegistry.isEnabled(FeatureFlagKey.SHOT_CAM_WORKFLOW, flagStore);
    if (!isFlagOn) {
      return { success: false, error: 'CIRCUIT_BREAKER_TRIPPED: SHOT_CAM_WORKFLOW feature flag is OFF' };
    }

    const transition = Phase20CoreService.transitionShotCam(state, event);
    if (!transition.success) {
      return { success: false, error: transition.error };
    }

    return {
      success: true,
      newState: transition.state,
    };
  }

  /**
   * Checks whether a penalty verification is fully sealed.
   */
  public static isVerified(state: ShotCamWorkflowState): boolean {
    return state.currentState === 'VERIFIED';
  }
}
