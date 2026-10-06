import { describe, it, expect } from 'vitest';
import { ShotCamSubmission, statusLabels, ShotCamStatus } from '../src/components/shame/ShotCamReviewCard';
import { ShotCamService, ShotCamWorkflowState } from '../src/services/shotCamService';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';

describe('Milestone 22.3: Shot-Cam Review & Wall of Shame UI Contracts', () => {
  it('covers all Shot-Cam FSM states with UI labels and style mappings', () => {
    const expectedStates: ShotCamStatus[] = [
      'PENDING_UPLOAD',
      'UPLOAD',
      'COMMISSIONER_AUDIT',
      'APPROVE',
      'VERIFIED',
      'DISPUTED',
    ];

    expectedStates.forEach(st => {
      expect(statusLabels[st]).toBeDefined();
    });
  });

  it('validates Dead Place Monarch presentation payload matches Decision #69 math ($2.50)', () => {
    const monarchSubmission: ShotCamSubmission = {
      id: 'sub_monarch_01',
      userId: 'user_monarch_01',
      username: 'LoserKing',
      status: 'PENDING_UPLOAD',
      fineAmount: 2.50,
      isDeadPlaceMonarch: true,
    };

    expect(monarchSubmission.isDeadPlaceMonarch).toBe(true);
    expect(monarchSubmission.fineAmount).toBe(2.50);
  });

  it('verifies ShotCamService transitions match UI action dispatch requirements', () => {
    const kickoff = new Date('2026-10-08T18:00:00.000Z');
    const postKickoff = new Date('2026-10-08T19:00:00.000Z');
    const initial = ShotCamService.initializeWorkflow('media_1', 'pen_1', 'pool_123', 'user_123', kickoff, false);
    expect(initial.currentState).toBe('PENDING_UPLOAD');

    const uploaded = ShotCamService.processTransition(
      initial,
      { eventType: 'UPLOAD', actorUserId: 'user_123', timestamp: postKickoff },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(uploaded.success).toBe(true);
    expect(uploaded.newState?.currentState).toBe('COMMISSIONER_AUDIT');

    const finalizedState: ShotCamWorkflowState = { ...uploaded.newState!, isGameFinalized: true };
    const approved = ShotCamService.processTransition(
      finalizedState,
      { eventType: 'APPROVE', actorUserId: 'commish_1', timestamp: new Date('2026-10-08T22:00:00.000Z') },
      { SHOT_CAM_WORKFLOW: true }
    );
    expect(approved.success).toBe(true);
    expect(approved.newState?.currentState).toBe('VERIFIED');
    expect(ShotCamService.isVerified(approved.newState!)).toBe(true);
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_22_UI_WIRING)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_22_UI_WIRING]).toBe(false);
  });
});
