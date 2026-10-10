import React, { useState } from 'react';
import { TradingCard } from '../components/profile/TradingCard';
import { MultiMetricLedger } from '../components/profile/MultiMetricLedger';
import { NarrativeBadgeCase } from '../components/profile/NarrativeBadgeCase';
import { HeadToHeadDrawer } from '../components/profile/HeadToHeadDrawer';
import {
  calculateUserDebtMetrics,
  deriveNarrativeBadges,
  calculateHeadToHeadStats,
  UserRapSheetProfile,
  HistoricalWeekRecord,
  HeadToHeadStats
} from '../services/reputationEngineService';

const SAMPLE_HISTORY: HistoricalWeekRecord[] = [
  { weekNumber: 1, rank: 10, totalParticipants: 10, points: 5.0, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: true, isWeeklyWinner: false },
  { weekNumber: 2, rank: 9, totalParticipants: 10, points: 6.5, isDeadPlace: false, isDangerSeat: true, marginToDeadPlace: 0.5, isAutopilot: true, isWeeklyWinner: false },
  { weekNumber: 3, rank: 10, totalParticipants: 10, points: 4.0, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: true, isWeeklyWinner: false },
  { weekNumber: 4, rank: 10, totalParticipants: 10, points: 5.5, isDeadPlace: true, isDangerSeat: false, marginToDeadPlace: 0, isAutopilot: false, isWeeklyWinner: false },
  { weekNumber: 5, rank: 7, totalParticipants: 10, points: 7.0, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 2.0, isAutopilot: false, isWeeklyWinner: false }
];

const SAMPLE_RAW_LEDGER = [
  { id: 'l1', createdAt: '2026-09-15T00:00:00Z', amount: '+2.50', reason: 'Week 1 Dead Place Penalty' },
  { id: 'l2', createdAt: '2026-09-17T00:00:00Z', amount: '-2.50', reason: 'Week 1 Video Fulfillment Cleared' },
  { id: 'l3', createdAt: '2026-09-22T00:00:00Z', amount: '+1.50', reason: 'Week 2 Danger Seat 9th Place' },
  { id: 'l4', createdAt: '2026-09-29T00:00:00Z', amount: '+2.50', reason: 'Week 3 Dead Place Penalty' },
  { id: 'l5', createdAt: '2026-09-30T00:00:00Z', amount: '+0.50', reason: 'Week 3 Contempt of Court Escalation' },
  { id: 'l6', createdAt: '2026-10-06T00:00:00Z', amount: '+2.50', reason: 'Week 4 Dead Place Penalty' }
];

export const ProfilePage: React.FC = () => {
  const [viewingRival] = useState<boolean>(true);
  const [h2hOpen, setH2hOpen] = useState<boolean>(false);
  const [noticeSent, setNoticeSent] = useState<boolean>(false);

  const metrics = calculateUserDebtMetrics(SAMPLE_RAW_LEDGER);
  const badges = deriveNarrativeBadges(SAMPLE_HISTORY);

  const profile: UserRapSheetProfile = {
    userId: 'u10',
    userName: 'Ben',
    avatarInitials: 'BE',
    seasonRank: 10,
    activeStreak: '3 Dead Places',
    primaryTitle: 'Dead Place Monarch',
    totalPicksLifetime: 75,
    accuracyPct: 41.3,
    metrics,
    badges
  };

  const h2hStats: HeadToHeadStats = calculateHeadToHeadStats(
    'u1',
    'Jack',
    'u10',
    'Ben',
    [
      { weekNumber: 1, rank: 2, totalParticipants: 10, points: 9.0, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 4, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 2, rank: 3, totalParticipants: 10, points: 8.0, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 3, isAutopilot: false, isWeeklyWinner: false },
      { weekNumber: 3, rank: 1, totalParticipants: 10, points: 10.0, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 6, isAutopilot: false, isWeeklyWinner: true },
      { weekNumber: 4, rank: 4, totalParticipants: 10, points: 7.0, isDeadPlace: false, isDangerSeat: false, marginToDeadPlace: 2, isAutopilot: false, isWeeklyWinner: false }
    ],
    SAMPLE_HISTORY
  );

  const handleSendCollectionNotice = () => {
    setNoticeSent(true);
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([150, 100, 150]);
    }
    setTimeout(() => setNoticeSent(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28 max-w-md mx-auto font-sans">
      <header className="mb-4 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <h1 className="text-lg font-black tracking-wider text-cyan-400">
            RAP SHEET // DOSSIER
          </h1>
          <p className="text-xs text-slate-400">Season Reputation Hub</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold">
          UID #{profile.userId}
        </span>
      </header>

      {noticeSent && (
        <div className="mb-3 p-2.5 rounded bg-rose-950/90 border border-rose-500 text-rose-300 font-mono text-xs text-center font-bold animate-pulse">
          🔔 COLLECTION NOTICE DISPATCHED: "The League is waiting. Pay your {profile.metrics.outstandingDebt.toFixed(2)} shots."
        </div>
      )}

      {/* 1. 3D Flipping Trading Card */}
      <TradingCard profile={profile} />

      {/* 2. Multi-Metric Penalty Ledger & Audit Trail */}
      <MultiMetricLedger metrics={profile.metrics} />

      <div className="my-5" />

      {/* 3. Narrative Badges Trophy Case */}
      <NarrativeBadgeCase badges={profile.badges} />

      {/* Sticky Bottom Action Bar for Rival View */}
      {viewingRival && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/95 border-t border-slate-800 backdrop-blur z-40">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-2 font-mono">
            <button
              onClick={() => setH2hOpen(true)}
              className="py-2.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-cyan-950"
            >
              [ ⚔️ COMPARE H2H ]
            </button>
            <button
              onClick={handleSendCollectionNotice}
              className="py-2.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-rose-950"
            >
              [ 🔔 NOTICE ({profile.metrics.outstandingDebt.toFixed(1)}s) ]
            </button>
          </div>
        </div>
      )}

      {/* Head-to-Head Comparison Drawer */}
      <HeadToHeadDrawer stats={h2hOpen ? h2hStats : null} onClose={() => setH2hOpen(false)} />
    </div>
  );
};

export default ProfilePage;
