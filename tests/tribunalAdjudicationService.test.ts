import { describe, it, expect } from 'vitest';
import {
  initializeTribunalDocket,
  castTribunalVote,
  evaluateTribunalVerdict,
  AdjudicatedPenaltySubmission
} from '../src/services/tribunalAdjudicationService';
import {
  createPendingPenalty,
  submitPenaltyEvidence,
  filePenaltyDispute
} from '../src/services/punishmentFsmService';

describe('M29.2 Tribunal Adjudication & Dispute Resolution', () => {
  function createTestDocket(): AdjudicatedPenaltySubmission {
    const base = createPendingPenalty('pool_alpha', 'u10', 'Ben (Defendant)', 5, 2.50);
    const submitted = submitPenaltyEvidence(base, 'supabase://vault/video.mp4');
    const disputed = filePenaltyDispute(
      submitted,
      'u1',
      'Jack (Accuser)',
      'SPILLED_LIQUOR',
      'At timestamp 00:14, half of the second shot glass was clearly spilled on the table.'
    );
    return initializeTribunalDocket(disputed);
  }

  it('enforces juror recusal: rejects votes from the Defendant', () => {
    const docket = createTestDocket();
    expect(() => castTribunalVote(docket, 'u10', 'Ben', 'DISMISS')).toThrow(
      'DEFENDANT_RECUSAL'
    );
  });

  it('enforces juror recusal: rejects votes from the Accuser', () => {
    const docket = createTestDocket();
    expect(() => castTribunalVote(docket, 'u1', 'Jack', 'UPHOLD')).toThrow(
      'ACCUSER_RECUSAL'
    );
  });

  it('prevents duplicate voting by the same juror', () => {
    let docket = createTestDocket();
    docket = castTribunalVote(docket, 'u2', 'Dave', 'UPHOLD');
    expect(() => castTribunalVote(docket, 'u2', 'Dave', 'DISMISS')).toThrow(
      'DUPLICATE_VOTE'
    );
  });

  it('adjudicates conviction at 5 UPHOLD votes and escalates debt to 3.00 (Contempt of Court)', () => {
    let docket = createTestDocket();

    // 5 impartial jurors vote UPHOLD
    const jurors = ['u2', 'u3', 'u4', 'u5', 'u6'];
    for (const j of jurors) {
      docket = castTribunalVote(docket, j, `Juror_${j}`, 'UPHOLD');
    }

    const { updatedDocket, isResolved, verdict, escalationEntry } = evaluateTribunalVerdict(docket);

    expect(isResolved).toBe(true);
    expect(verdict).toBe('UPHELD');
    expect(updatedDocket.status).toBe('PENDING_SUBMISSION');
    expect(updatedDocket.shotDebt).toBe(3.00);
    expect(escalationEntry).toBeDefined();
    expect(escalationEntry?.amount).toBe('+0.50');
  });

  it('acquits defendant in a 4-4 tie (innocent until proven guilty) and emits -2.50 credit', () => {
    let docket = createTestDocket();

    // 4 vote UPHOLD, 4 vote DISMISS
    const upholdJurors = ['u2', 'u3', 'u4', 'u5'];
    const dismissJurors = ['u6', 'u7', 'u8', 'u9'];

    for (const j of upholdJurors) {
      docket = castTribunalVote(docket, j, `Juror_${j}`, 'UPHOLD');
    }
    for (const j of dismissJurors) {
      docket = castTribunalVote(docket, j, `Juror_${j}`, 'DISMISS');
    }

    const { updatedDocket, isResolved, verdict, ledgerCredit } = evaluateTribunalVerdict(docket);

    expect(isResolved).toBe(true);
    expect(verdict).toBe('DISMISSED');
    expect(updatedDocket.status).toBe('CLEARED');
    expect(ledgerCredit).toBeDefined();
    expect(ledgerCredit?.amount).toBe('-2.50');
  });
});
