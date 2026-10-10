import React, { useState } from 'react';
import { ShameSegmentedHeader } from '../components/shame/ShameSegmentedHeader';
import { WeeklyLadderView } from '../components/shame/WeeklyLadderView';
import { InfamyPenthouseArchive } from '../components/shame/InfamyPenthouseArchive';
import { ShotOfTheWeekCarousel } from '../components/punishment/ShotOfTheWeekCarousel';
import { TheGavelAdjudication } from '../components/punishment/TheGavelAdjudication';
import {
  ShameTabId,
  buildSettledLadderTiers,
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
  { rank: 3, userId: 'u3', userName: 'Sarah', penaltyShots: '1.00' },
  { rank: 4, userId: 'u4', userName: 'Mike', penaltyShots: '1.00' },
  { rank: 5, userId: 'u5', userName: 'Tom', penaltyShots: '1.00' },
  { rank: 6, userId: 'u6', userName: 'Chris', penaltyShots: '1.00' },
  { rank: 7, userId: 'u7', userName: 'Alex', penaltyShots: '2.00' },
  { rank: 8, userId: 'u8', userName: 'Emma', penaltyShots: '2.00' },
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
    shotDebt: 1.00,
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
    crimeDescription: 'Contempt of Court (Spilled liquor escalated to 3.00 shots)',
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
  const [selectedDisputeDocketId, setSelectedDisputeDocketId] = useState<string | null>(null);

  const initialBase1 = createPendingPenalty('pool_alpha', 'u10', 'Ben', 5, 2.50, 'WARM TEQUILA');
  const submitted1 = submitPenaltyEvidence(initialBase1, 'supabase://vault/ben_w5.mp4');
  const disputed1 = filePenaltyDispute(
    submitted1,
    'u2',
    'Dave',
    'SPILLED_LIQUOR',
    'At timestamp 00:14, half of the second shot glass was spilled on the table.'
  );

  const [dockets, setDockets] = useState<AdjudicatedPenaltySubmission[]>([
    initializeTribunalDocket(disputed1),
    {
      ...initializeTribunalDocket(createPendingPenalty('pool_alpha', 'u4', 'Mike', 4, 1.00)),
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
    setSelectedDisputeDocketId(null);
  };

  const ladderTiers = buildSettledLadderTiers(
    SAMPLE_STANDINGS,
    'PENDING_SUBMISSION',
    2.50,
    new Date(Date.now() - 3600 * 24 * 1000)
  );

  const hallOfFameSubmissions = dockets.filter((d) => d.nominations.length > 5);
  const activeDisputeDocket = dockets.find((d) => d.id === selectedDisputeDocketId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto pb-24 overflow-x-hidden">
      <ShameSegmentedHeader activeTab={activeTab} onSelectTab={setActiveTab} />

      {activeTab === 'REELS' && (
        <div className="space-y-4">
          <div className="px-3 pt-1">
            <ShotOfTheWeekCarousel
              hallOfFameSubmissions={hallOfFameSubmissions}
              onSelectSubmission={() => {}}
            />
          </div>

          <div className="px-3 space-y-4">
            {dockets.map((docket) => {
              const isDisputed = docket.status === 'DISPUTED';

              return (
                <div
                  key={docket.id}
                  className="relative rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl font-mono"
                >
                  <div className="relative w-full h-[380px] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

                    <div className="text-center space-y-2 z-10">
                      <span className="text-5xl">🥃</span>
                      <p className="text-sm font-black text-white">
                        {docket.userName} // {docket.shotDebt.toFixed(2)} SHOTS
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {docket.liquorType || 'WARM TEQUILA'} • WEEK {docket.weekNumber}
                      </p>
                    </div>

                    {isDisputed && (
                      <button
                        onClick={() => setSelectedDisputeDocketId(docket.id)}
                        className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-rose-600/90 hover:bg-rose-500 border border-rose-400 shadow-glow-rose text-white text-[10px] font-black tracking-wider uppercase animate-pulse flex items-center gap-1.5 transition"
                      >
                        <span>⚖️</span>
                        <span>UNDER LEAGUE REVIEW</span>
                      </button>
                    )}

                    {docket.status === 'CLEARED' && (
                      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase">
                        ✓ DEBT CLEARED
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{docket.userName}</p>
                      <p className="text-[10px] text-slate-400">
                        Submitted for Week {docket.weekNumber} Dead Place
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {}}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>🏆</span>
                        <span>{docket.nominations.length}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeDisputeDocket && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-3 font-mono">
              <div className="w-full max-w-md rounded-2xl bg-slate-950 border-2 border-rose-500 shadow-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                    ⚖️ THE SOCIAL TRIBUNAL // JURY DELIBERATION
                  </span>
                  <button
                    onClick={() => setSelectedDisputeDocketId(null)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    CLOSE
                  </button>
                </div>

                <TheGavelAdjudication
                  docket={activeDisputeDocket}
                  currentUserId={currentUserId}
                  onCastVote={(v) => handleCastVote(activeDisputeDocket.id, v)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'LADDER' && (
        <WeeklyLadderView ladder={ladderTiers} />
      )}

      {activeTab === 'INFAMY' && (
        <InfamyPenthouseArchive dockets={HISTORICAL_INFAMY_DOCKETS} />
      )}
    </div>
  );
};

export default WallOfShamePage;
