import React, { useState } from 'react';
import { ShotOfTheWeekCarousel } from '../components/punishment/ShotOfTheWeekCarousel';
import { TheGavelAdjudication } from '../components/punishment/TheGavelAdjudication';
import { TribunalCaseFile } from '../components/punishment/TribunalCaseFile';
import {
  initializeTribunalDocket,
  castTribunalVote,
  evaluateTribunalVerdict,
  AdjudicatedPenaltySubmission,
  TribunalVoteType
} from '../services/tribunalAdjudicationService';
import {
  createPendingPenalty,
  submitPenaltyEvidence,
  filePenaltyDispute
} from '../services/punishmentFsmService';

export const WallOfShamePage: React.FC = () => {
  const currentUserId = 'u1'; // Viewing as Jack (Juror)

  // Seed sample submissions
  const initialBase1 = createPendingPenalty('pool_alpha', 'u10', 'Ben (Dead Place)', 5, 2.50, 'WARM TEQUILA');
  const submitted1 = submitPenaltyEvidence(initialBase1, 'supabase://vault/video1.mp4');
  const disputed1 = filePenaltyDispute(
    submitted1,
    'u2',
    'Dave',
    'SPILLED_LIQUOR',
    'At timestamp 00:14, half of the second shot glass was clearly spilled on the table.'
  );

  const [dockets, setDockets] = useState<AdjudicatedPenaltySubmission[]>([
    initializeTribunalDocket(disputed1),
    {
      ...initializeTribunalDocket(createPendingPenalty('pool_alpha', 'u4', 'Mike', 4, 1.50)),
      status: 'CLEARED',
      nominations: ['u1', 'u2', 'u3', 'u5', 'u6', 'u7'] // Gold border eligible
    }
  ]);

  const [ledgerMessage, setLedgerMessage] = useState<string | null>(null);

  const handleCastVote = (docketId: string, vote: TribunalVoteType) => {
    setDockets((prev) =>
      prev.map((d) => {
        if (d.id !== docketId) return d;
        const voted = castTribunalVote(d, currentUserId, 'Jack', vote);
        const { updatedDocket, isResolved, verdict, escalationEntry, ledgerCredit } =
          evaluateTribunalVerdict(voted);

        if (isResolved) {
          if (verdict === 'UPHELD' && escalationEntry) {
            setLedgerMessage(`CONTEMPT UPHELD: ${escalationEntry.amount} SHOTS ADDED (TOTAL: 3.00)`);
          } else if (verdict === 'DISMISSED' && ledgerCredit) {
            setLedgerMessage(`DISPUTE DISMISSED: ${ledgerCredit.amount} SHOTS CREDIT RECORDED`);
          }
        }
        return updatedDocket;
      })
    );
  };

  const hallOfFameSubmissions = dockets.filter((d) => d.nominations.length > 5);

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto overflow-hidden">
      {/* Pinned Shot of the Week Carousel */}
      <div className="p-3 pb-0 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <ShotOfTheWeekCarousel
          hallOfFameSubmissions={hallOfFameSubmissions}
          onSelectSubmission={() => {}}
        />
      </div>

      {ledgerMessage && (
        <div className="mx-3 mt-2 p-2 bg-rose-950/90 border border-rose-500 rounded-lg text-center font-mono text-xs font-bold text-rose-200">
          ⚖️ {ledgerMessage}
        </div>
      )}

      {/* Full-Screen Vertical Snap Reels Feed */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory p-3 space-y-4">
        {dockets.map((docket) => (
          <div key={docket.id} className="snap-start min-h-[550px] flex items-center justify-center">
            {docket.status === 'DISPUTED' ? (
              <TheGavelAdjudication
                docket={docket}
                currentUserId={currentUserId}
                onCastVote={(v) => handleCastVote(docket.id, v)}
              />
            ) : (
              <TribunalCaseFile
                submission={docket}
                onFileDispute={() => {}}
                onNominate={() => {}}
                onEvaluateClearance={() => {}}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WallOfShamePage;
