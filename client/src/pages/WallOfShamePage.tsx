import React, { useState, useEffect, useMemo } from 'react';
import { ShameSegmentedHeader } from '../components/shame/ShameSegmentedHeader';
import { WeeklyLadderView } from '../components/shame/WeeklyLadderView';
import { AppHeader } from '../components/common/AppHeader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatShotUnit } from '../services/dependableInfoService';
import {
  deriveSeasonStoryViewModel,
  AuthoritativeWeeklyStandingRow,
} from '../services/seasonStoryService';
import { WeeklyRecapCardView } from '../components/shame/WeeklyRecapCardView';

export function WallOfShamePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'reels' | 'ladder' | 'infamy'>('ladder');
  const [dockets] = useState<any[]>([]);
  const [ladderData, setLadderData] = useState<any[]>([]);
  const [inspectSettledFixture, setInspectSettledFixture] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

    async function loadMembersAndPenalties() {
      try {
        // Query all ACTIVE members for activePoolId
        const { data: members, error: membersErr } = await supabase
          .from('pool_memberships')
          .select('user_id, role, users(id, email, display_name)')
          .eq('pool_id', activePoolId)
          .eq('status', 'ACTIVE');

        if (membersErr) {
          console.error('Error fetching pool members for ladder:', membersErr);
          return;
        }

        // Query existing rows in penalty_ledger
        const { data: penalties } = await supabase
          .from('penalty_ledger')
          .select('*')
          .eq('pool_id', activePoolId);

        const penaltiesByUser = new Map<string, any[]>();
        if (penalties && penalties.length > 0) {
          for (const p of penalties) {
            const list = penaltiesByUser.get(p.user_id) || [];
            list.push(p);
            penaltiesByUser.set(p.user_id, list);
          }
        }

        if (members && members.length > 0 && isMounted) {
          const mappedLadder = members.map((m: any, idx: number) => {
            const u = m.users;
            let displayName = u?.display_name || (u?.email ? u.email.split('@')[0] : m.user_id);
            if (m.role === 'COMMISSIONER' || m.role === 'ADMIN') {
              displayName = `${displayName} (Commissioner)`;
            }

            const userPenalties = penaltiesByUser.get(m.user_id) || [];
            const totalDebt = userPenalties.reduce((sum, p) => sum + Number(p.delta || 0), 0);

            // For any active member who does not yet have penalty debt recorded in penalty_ledger:
            // Default their record to 0.00s shot debt, status: 'CLEARED (SAFE)', and tier: 'SAFE HAVEN'
            if (totalDebt <= 0) {
              return {
                rank: 1,
                userId: m.user_id,
                userName: displayName,
                name: displayName,
                shots: '0 shots',
                penaltyShots: 0,
                status: 'CLEARED (SAFE)',
                fsmDisplayStatus: 'Safe Haven',
                tier: 'SAFE HAVEN',
              };
            }

            let tier = 'DANGER_LOW';
            let status = 'Settled';
            if (totalDebt >= 2.5) {
              tier = 'PIT';
              status = 'Awaiting Video';
            } else if (totalDebt >= 2.0) {
              tier = 'DANGER_HIGH';
              status = 'High Risk';
            }

            return {
              rank: idx + 1,
              userId: m.user_id,
              userName: displayName,
              name: displayName,
              shots: formatShotUnit(totalDebt),
              penaltyShots: totalDebt,
              status,
              fsmDisplayStatus: status,
              tier,
            };
          });

          setLadderData(mappedLadder);
        }
      } catch (err) {
        console.error('Failed to load ladder data:', err);
      }
    }

    loadMembersAndPenalties();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentUserId = user?.id || 'viewer';
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  const demoRecords: AuthoritativeWeeklyStandingRow[] = useMemo(() => [
    {
      season: 2026,
      week: 5,
      poolId: activePoolId,
      userId: currentUserId,
      displayName: user?.email ? user.email.split('@')[0] : 'You',
      rank: 1,
      isTiedRank: false,
      participantCount: 2,
      correctPicks: 10,
      totalGames: 14,
      weeklyShotsIncurred: 0,
      tierName: 'SAFE HAVEN',
      isOfficiallySettled: true,
      settlementRevision: '1 (Official)',
    },
  ], [activePoolId, currentUserId, user?.email]);

  const seasonStory = useMemo(() => {
    return deriveSeasonStoryViewModel({
      isLoading: false,
      season: 2026,
      poolId: activePoolId,
      viewerUserId: currentUserId,
      rawRecords: inspectSettledFixture ? demoRecords : [],
      currentOutstandingShotDebt: 0,
    });
  }, [activePoolId, currentUserId, inspectSettledFixture, demoRecords]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Unified Top Branding Banner */}
      <AppHeader
        poolName="MAIN LEAGUE"
        scope={activeTab === 'infamy' ? 'SEASON LEDGER' : 'WEEK 6'}
        phase={activeTab === 'infamy' ? 'SETTLED' : 'PRE-KICKOFF'}
      />

      {/* Persistent 3-Tab Segmented Header */}
      <ShameSegmentedHeader activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Tab 1: Reels Feed (Scoped Empty State) */}
      {activeTab === 'reels' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-3xl">
            🎬
          </div>
          <div className="text-amber-400 font-bold text-sm tracking-wider uppercase mb-1">
            [ NO ACTIVE PENALTY REELS ]
          </div>
          <p className="text-slate-300 text-xs max-w-xs leading-relaxed mb-1">
            Zero penalty shot videos have been uploaded for Week 6 (Pre-Kickoff).
          </p>
          <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed mb-6 font-mono">
            Prior settled obligations (Week 5): 0 outstanding penalty reels.
          </p>
          <button 
            onClick={() => setActiveTab('ladder')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition"
          >
            VIEW SHOT DEBT LADDER →
          </button>
        </div>
      )}

      {/* Tab 2: Live Shot Debt Ladder (Always Accessible) */}
      {activeTab === 'ladder' && (
        <div className="flex-1 p-4">
          <WeeklyLadderView
            ladder={ladderData.length > 0 ? ladderData : undefined}
            weekNumber={6}
            isSettled={false}
          />
        </div>
      )}

      {/* Tab 3: Hall of Infamy, Season Story & Weekly Recap Cards */}
      {activeTab === 'infamy' && (
        <div className="flex-1 p-4 space-y-4">
          {/* Season Story Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div>
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  AUTHORITATIVE SEASON STORY
                </div>
                <div className="text-xs text-slate-300 font-bold">
                  {seasonStory.headline}
                </div>
              </div>
              <button
                onClick={() => setInspectSettledFixture((prev) => !prev)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition border ${
                  inspectSettledFixture
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {inspectSettledFixture ? 'RESET TO LIVE LEAGUE' : 'INSPECT SETTLED FIXTURE'}
              </button>
            </div>

            {inspectSettledFixture && (
              <div className="mb-3 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[10px]">
                <span className="font-bold">DEMO FIXTURE:</span> Simulating 1 settled week to verify personal/league story progression on hardware while live Week 6 is unsettled.
              </div>
            )}

            <div className="text-xs text-slate-400 leading-relaxed mb-3">
              {seasonStory.statusMessage}
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center mb-3">
              <div>
                <div className="text-[9px] text-slate-500 uppercase">Settled Slates</div>
                <div className="text-xs font-bold text-slate-200">{seasonStory.settledWeeksCount}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase">Pick Accuracy</div>
                <div className="text-xs font-bold text-cyan-400">{seasonStory.accuracyPercentLabel}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase">Safe Havens</div>
                <div className="text-xs font-bold text-emerald-400">{seasonStory.safeHavenFinishes ?? 0}</div>
              </div>
            </div>

            {seasonStory.weeklyNodes.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Settled Weekly Audit Trail
                </div>
                {seasonStory.weeklyNodes.map((node) => (
                  <div
                    key={node.week}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-200">
                        Week {node.week} · <span className="text-cyan-400">{node.rankLabel}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {node.participationBadge} · {node.settlementRevisionLabel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-400">
                        {node.weeklyChargeLabel}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {node.pickRecordLabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Recap Card Exporter Component */}
          <WeeklyRecapCardView
            currentWeek={6}
            liveParticipants={ladderData.map((l, idx) => ({
              userId: l.userId || `u-${idx}`,
              displayName: l.displayName || `Player ${idx + 1}`,
              rank: l.rank || idx + 1,
              points: 0,
              totalGames: 14,
              shotsIncurred: l.shotsOwed || 0,
              tierName: l.tier || 'SAFE HAVEN',
              tiebreakResolved: true,
            }))}
            viewerUserId={user?.id || 'viewer'}
          />
        </div>
      )}
    </div>
  );
}

export default WallOfShamePage;
