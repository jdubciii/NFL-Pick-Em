import React, { useState } from 'react';
import { ShameSegmentedHeader } from '../components/shame/ShameSegmentedHeader';
import { WeeklyLadderView } from '../components/shame/WeeklyLadderView';
import { InfamyPenthouseArchive } from '../components/shame/InfamyPenthouseArchive';
import { ShotOfTheWeekCarousel } from '../components/punishment/ShotOfTheWeekCarousel';
import { TheGavelAdjudication } from '../components/punishment/TheGavelAdjudication';
import { TribunalCaseFile } from '../components/punishment/TribunalCaseFile';
import {
  ShameTabId,
  buildSettledLadderTiers,
  evaluateFailureToAppear,
  InfamyArchiveDocket
} from '../services/wallOfShameConsolidationService';
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

const SAMPLE_STANDINGS = [
  { rank: 1, userId: 'u1', userName: 'Jack', penaltyShots: '0.00' },
  { rank: 2, userId: 'u2', userName: 'Dave', penaltyShots: '1.00' },
  { rank: 3, userId: 'u3', userName: 'Sarah', penaltyShots: '1.14' },
  { rank: 4, userId: 'u4', userName: 'Mike', penaltyShots: '1.29' },
  { rank: 5, userId: 'u5', userName: 'Tom', penaltyShots: '1.43' },
  { rank: 6, userId: 'u6', userName: 'Chris', penaltyShots: '1.57' },
  { rank: 7, userId: 'u7', userName: 'Alex', penaltyShots: '1.71' },
  { rank: 8, userId: 'u8', userName: 'Emma', penaltyShots: '1.86' },
  { rank: 9, userId: 'u9', userName: 'Ryan', penaltyShots: '2.00' },
  { rank: 10, userId: 'u10', userName: 'Ben', penaltyShots: '2.50' }
];

const HISTORICAL_INFAMY_DOCKETS: InfamyArchiveDocket[] = [
  {
    id: 'inf_w4_mike',
    weekNumber: 4,
    date: '2026-10-02',
    userId: 'u4',
    userName: 'Mike',
    crimeDescription: 'Shot of the Week (Viral Chaser Reaction)',
    shotDebt: 1.50,
    liquorType: 'WARM TEQUILA',
    nominationsCount: 6,
    hasGoldBorder: true,
    isContemptOfCourt: false,
    jurors: [
      { name: 'Jack', vote: 'DISMISS' },
      { name: 'Dave', vote: 'DISMISS' }
    ]
  },
  {
    id: 'inf_w3_ben',
    weekNumber: 3,
    date: '2026-09-25',
    userId: 'u10',
    userName: 'Ben',
    crimeDescription: 'Contempt of Court (Spilled Liquor Escaped to 3.00)',
    shotDebt: 3.00,
    liquorType: 'WARM TEQUILA',
    nominationsCount: 2,
    hasGoldBorder: false,
    isContemptOfCourt: true,
    jurors: [
      { name: 'Dave', vote: 'UPHOLD' },
      { name: 'Sarah', vote: 'UPHOLD' },
      { name: 'Mike', vote: 'UPHOLD' },
      { name: 'Tom', vote: 'UPHOLD' },
      { name: 'Jack', vote: 'UPHOLD' }
    ]
  }
];

export const WallOfShamePage: React.FC = () => {
  const currentUserId = 'u1';
  const [activeTab, setActiveTab] = useState<ShameTabId>('REELS');
  const [slateFinalizedAt] = useState<Date>(new Date(Date.now() - 3600 * 24 * 1000)); // Finalized 24h ago
  const [deadPlaceFtaState, setDeadPlaceFtaState] = useState<{
    status: any;
    debt: number;
  }>({
    status: 'PENDING_SUBMISSION',
    debt: 2.50
  });

  // Seed sample submissions for REELS feed
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
      nominations: ['u1', 'u2', 'u3', 'u5', 'u6', 'u7']
    }
  ]);

  const handleCastVote = (docketId: string, vote: TribunalVoteType) => {
    setDockets((prev) =>
      prev.map((d) => {
        if (d.id !== docketId) return d;
        const voted = castTribunalVote(d, currentUserId, 'Jack', vote);
        const { updatedDocket } = evaluateTribunalVerdict(voted);
        return updatedDocket;
      })
    );
  };

  const handleSimulateFta = () => {
    const res = evaluateFailureToAppear(
      'pool_alpha',
      'u10',
      'PENDING_SUBMISSION',
      2.50,
      slateFinalizedAt,
      new Date(Date.now() + 49 * 3600 * 1000) // 49 hours later
    );
    if (res.isEscalated) {
      setDeadPlaceFtaState({
        status: res.newStatus,
        debt: res.newDebt
      });
    }
  };

  const ladderTiers = buildSettledLadderTiers(
    SAMPLE_STANDINGS,
    deadPlaceFtaState.status,
    deadPlaceFtaState.debt,
    slateFinalizedAt
  );

  const hallOfFameSubmissions = dockets.filter((d) => d.nominations.length > 5);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto pb-24 overflow-x-hidden">
      {/* 1. Sticky Frosted-Glass 3-Tab Segmented Header */}
      <ShameSegmentedHeader activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* TAB 1: 📱 REELS (VERTICAL SNAP VIDEO & JURY DISPUTE CLOCK) */}
      {activeTab === 'REELS' && (
        <div className="space-y-4">
          <div className="px-3 pt-2">
            <ShotOfTheWeekCarousel
              hallOfFameSubmissions={hallOfFameSubmissions}
              onSelectSubmission={() => {}}
            />
          </div>

          <div className="px-3 space-y-4">
            {dockets.map((docket) => (
              <div key={docket.id}>
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
      )}

      {/* TAB 2: 🪜 LADDER (WEEKLY SETTLED TIERS & THE PIT) */}
      {activeTab === 'LADDER' && (
        <WeeklyLadderView
          ladder={ladderTiers}
          onTriggerFtaDemo={handleSimulateFta}
        />
      )}

      {/* TAB 3: 🏛️ INFAMY (MUSEUM OF SHAME & PENTHOUSE ARCHIVE) */}
      {activeTab === 'INFAMY' && (
        <InfamyPenthouseArchive dockets={HISTORICAL_INFAMY_DOCKETS} />
      )}
    </div>
  );
};

export default WallOfShamePage;
