import { describe, it, expect } from 'vitest';
import {
  createPendingPenalty,
  submitPenaltyEvidence,
  filePenaltyDispute,
  evaluatePenaltyClearance,
  nominatePenaltyVideo,
  PenaltySubmission
} from '../src/services/punishmentFsmService';

describe('M29.1 Punishment FSM & Double-Entry Ledger Offsets', () => {
  it('creates initial penalty submission in PENDING_SUBMISSION state', () => {
    const record = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50, 'WARM TEQUILA');
    expect(record.status).toBe('PENDING_SUBMISSION');
    expect(record.shotDebt).toBe(2.50);
    expect(record.liquorType).toBe('WARM TEQUILA');
    expect(record.disputes).toHaveLength(0);
  });

  it('transitions to UNDER_REVIEW and locks 24-hour dispute window', () => {
    const initial = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50);
    const now = new Date('2026-10-09T20:00:00Z');
    const underReview = submitPenaltyEvidence(initial, 'supabase://vault/video1.mp4', now);

    expect(underReview.status).toBe('UNDER_REVIEW');
    expect(underReview.videoUri).toBe('supabase://vault/video1.mp4');
    expect(underReview.disputeWindowEndsAt).toBe('2026-10-10T20:00:00.000Z');
  });

  it('rejects disputes with less than 50 characters of justification', () => {
    const initial = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50);
    const underReview = submitPenaltyEvidence(initial, 'supabase://vault/video1.mp4');

    expect(() =>
      filePenaltyDispute(
        underReview,
        'u1',
        'Jack',
        'INCOMPLETE_POUR',
        'Too short justification'
      )
    ).toThrow('VALIDATION_FAILED: Dispute justification must be at least 50 characters.');
  });

  it('transitions to DISPUTED when a valid 50+ char infraction is filed', () => {
    const initial = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50);
    const underReview = submitPenaltyEvidence(initial, 'supabase://vault/video1.mp4');

    const validText = 'At timestamp 00:14, half of the second shot glass was clearly spilled on the table.';
    const disputed = filePenaltyDispute(underReview, 'u1', 'Jack', 'SPILLED_LIQUOR', validText);

    expect(disputed.status).toBe('DISPUTED');
    expect(disputed.disputes).toHaveLength(1);
    expect(disputed.disputes[0].infraction).toBe('SPILLED_LIQUOR');
  });

  it('enforces 24-hour timestamp lock: rejects premature clearance', () => {
    const initial = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50);
    const startTime = new Date('2026-10-09T20:00:00Z');
    const underReview = submitPenaltyEvidence(initial, 'supabase://vault/video1.mp4', startTime);

    // Attempt clearance at 12 hours
    const twelveHoursLater = new Date('2026-10-10T08:00:00Z');
    expect(() => evaluatePenaltyClearance(underReview, twelveHoursLater)).toThrow(
      'DISPUTE_WINDOW_ACTIVE'
    );
  });

  it('clears penalty after 24h and emits double-entry offsetting ledger credit (Decision #61)', () => {
    const initial = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50);
    const startTime = new Date('2026-10-09T20:00:00Z');
    const underReview = submitPenaltyEvidence(initial, 'supabase://vault/video1.mp4', startTime);

    // 24 hours and 1 minute later
    const twentyFourHoursLater = new Date('2026-10-10T20:01:00Z');
    const { updatedSubmission, ledgerCredit } = evaluatePenaltyClearance(underReview, twentyFourHoursLater);

    expect(updatedSubmission.status).toBe('CLEARED');
    expect(ledgerCredit.amount).toBe('-2.50');
    expect(ledgerCredit.userId).toBe('u10');
    expect(ledgerCredit.poolId).toBe('pool_alpha');
  });

  it('awards gold border nomination status when video receives > 5 nominations', () => {
    let submission = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50);

    for (let i = 1; i <= 5; i++) {
      const res = nominatePenaltyVideo(submission, `user_${i}`);
      submission = res.updatedSubmission;
      expect(res.hasGoldBorder).toBe(false);
    }

    const finalRes = nominatePenaltyVideo(submission, 'user_6');
    expect(finalRes.hasGoldBorder).toBe(true);
    expect(finalRes.updatedSubmission.nominations).toHaveLength(6);
  });
});
