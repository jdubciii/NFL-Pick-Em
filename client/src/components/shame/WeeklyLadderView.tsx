import React, { useState, useEffect } from 'react';
import {
  SettledLadderParticipant,
  buildSettledLadderTiers
} from '../../services/wallOfShameConsolidationService';
import { supabase } from '../../lib/supabase';
import { formatShotUnit } from '../../services/dependableInfoService';

interface WeeklyLadderViewProps {
  ladder?: any[];
  onTriggerFtaDemo?: () => void;
  weekNumber?: number;
  isSettled?: boolean;
}

export const WeeklyLadderView: React.FC<WeeklyLadderViewProps> = ({
  ladder,
  weekNumber = 6,
  isSettled = false,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600 * 24 + 1800);
  const [fetchedLadder, setFetchedLadder] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (ladder && ladder.length > 0) return;

    let isMounted = true;
    const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

    async function fetchActivePoolMembers() {
      try {
        const { data: members } = await supabase
          .from('pool_memberships')
          .select('user_id, role, users(id, email, display_name)')
          .eq('pool_id', activePoolId)
          .eq('status', 'ACTIVE');

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
          const mapped = members.map((m: any, idx: number) => {
            const u = m.users;
            let displayName = u?.display_name || (u?.email ? u.email.split('@')[0] : m.user_id);
            if (m.role === 'COMMISSIONER' || m.role === 'ADMIN') {
              displayName = `${displayName} (Commissioner)`;
            }
            const userPenalties = penaltiesByUser.get(m.user_id) || [];
            const totalDebt = userPenalties.reduce((sum, p) => sum + Number(p.delta || 0), 0);

            if (totalDebt <= 0) {
              return {
                rank: 1,
                userId: m.user_id,
                userName: displayName,
                name: displayName,
                shots: '0 shots',
                penaltyShots: 0,
                status: isSettled ? 'CLEARED (SAFE)' : 'PROJECTED SAFE',
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

          setFetchedLadder(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch active pool members in WeeklyLadderView:', err);
      }
    }

    fetchActivePoolMembers();
    return () => {
      isMounted = false;
    };
  }, [ladder]);

  const formatHoursClock = (sec: number) => {
    if (!sec || sec <= 0) return '--:--:--';
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeLadder = (ladder && ladder.length > 0) ? ladder : fetchedLadder;
  const safeMembers = activeLadder.filter((m) => m?.tier === 'SAFE' || m?.tier === 'SAFE HAVEN');
  const dangerTier1 = activeLadder.filter((m) => m?.tier === 'DANGER_LOW' || m?.tier === 'DANGER_ZONE');
  const dangerTier2 = activeLadder.filter((m) => m?.tier === 'DANGER_HIGH' || m?.tier === 'THE_DROP');
  const pitMember = activeLadder.find((m) => m?.tier === 'PIT');

  return (
    <div className="w-full space-y-4 p-3 font-mono">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
          WEEK RESULTS // LADDER BREAKDOWN
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
            isSettled
              ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
              : 'bg-cyan-950 border-cyan-500/60 text-cyan-300'
          }`}
        >
          {isSettled
            ? `WEEK ${weekNumber} · OFFICIAL SETTLED`
            : `WEEK ${weekNumber} · PROVISIONAL PREVIEW`}
        </span>
      </div>

      {/* 1. Safe Haven (0 shots) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase">
            SAFE HAVEN // 1ST PLACE (0 SHOTS)
          </span>
          <span className="text-[9px] text-emerald-500 font-bold">0 shots</span>
        </div>
        {safeMembers.map((m) => (
          <div
            key={m.userId || m.name || m.userName}
            className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-900 flex items-center justify-between text-xs text-slate-300"
          >
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-400">#{m.rank}</span>
              <span className="font-bold">{m.userName || m.name}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">
              {isSettled ? (m.status || 'CLEARED (SAFE)') : 'PROJECTED SAFE'}
            </span>
          </div>
        ))}
      </div>

      {/* Active Danger Tier 1 (if active members present) */}
      {dangerTier1.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase">
              DANGER ZONE // 2ND–6TH PLACE (1 SHOT)
            </span>
            <span className="text-[9px] text-amber-400 font-bold">1 shot</span>
          </div>
          {dangerTier1.map((m) => (
            <div
              key={m.userId}
              className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400">#{m.rank}</span>
                <span className="font-semibold text-slate-200">{m.userName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-300 font-black">1 shot</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                  {m.fsmDisplayStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Danger Tier 2 (if active members present) */}
      {dangerTier2.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-rose-400 uppercase">
              HIGH DANGER // 7TH–9TH PLACE (2 SHOTS)
            </span>
            <span className="text-[9px] text-rose-400 font-bold">2 shots</span>
          </div>
          {dangerTier2.map((m) => (
            <div
              key={m.userId}
              className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/40 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-400">#{m.rank}</span>
                <span className="font-semibold text-slate-100">{m.userName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-rose-300 font-black">2 shots</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                  {m.fsmDisplayStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Pit Member (if present) */}
      {pitMember && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-black text-rose-400 px-1 uppercase tracking-wider">
            THE PIT // 10TH PLACE DEAD PLACE
          </span>

          <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/80 shadow-glow-rose space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">💀</span>
                <div>
                  <p className="text-sm font-black text-white">{pitMember.userName || 'No Unsettled Penalties'}</p>
                  <p className="text-[9px] text-rose-300 font-bold uppercase">
                    DEAD PLACE MONARCH
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-rose-400">
                  {pitMember.penaltyShots.toFixed(2)} SHOTS
                </p>
                <p className="text-[9px] text-rose-200 uppercase font-bold">
                  {pitMember.fsmDisplayStatus}
                </p>
              </div>
            </div>

            {/* Executioner's Clock with WCAG Compliant Text Contrast */}
            <div className="p-3 rounded-xl bg-slate-950/95 border border-rose-500/70 text-center space-y-1">
              <p className="text-[10px] text-rose-200 font-bold uppercase tracking-widest">
                TIME TO SUBMIT EVIDENCE (SUBMISSION DEADLINE)
              </p>
              <p className="text-2xl font-mono font-black tracking-widest text-rose-400 tabular-nums">
                {formatHoursClock(secondsRemaining)}
              </p>
              <p className="text-[9px] text-slate-300">
                Deadline: 48h from finalization before +2.00 Failure to Appear escalation
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Lower Charter Tiers drawer for small pools (< 7 members) */}
      {activeLadder.length < 7 ? (
        <details className="group border border-slate-800/80 rounded-xl p-3 bg-slate-900/40 text-xs">
          <summary className="cursor-pointer text-[10px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider flex items-center justify-between select-none">
            <span>View Full 10-Player Charter Tier Rules (2nd–10th Place)</span>
            <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="mt-3 space-y-4 pt-2 border-t border-slate-800/60">
            {dangerTier1.length === 0 && (
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">
                    DANGER ZONE // 2ND–6TH PLACE (1 SHOT)
                  </span>
                  <span className="text-[9px] text-amber-400 font-bold">1 shot</span>
                </div>
                <p className="text-[10px] text-slate-500 italic px-1">No active members in this tier.</p>
              </div>
            )}

            <div className="my-1 border-t-2 border-dashed border-rose-500/40 relative text-center">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-[8px] font-black text-rose-400 uppercase tracking-widest">
                ▼ THE DROP (1 SHOT → 2 SHOTS STEP) ▼
              </span>
            </div>

            {dangerTier2.length === 0 && (
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">
                    HIGH DANGER // 7TH–9TH PLACE (2 SHOTS)
                  </span>
                  <span className="text-[9px] text-rose-400 font-bold">2 shots</span>
                </div>
                <p className="text-[10px] text-slate-500 italic px-1">No active members in this tier.</p>
              </div>
            )}

            {!pitMember && (
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-rose-500 uppercase">
                    THE PIT // 10TH PLACE DEAD PLACE (2.5 SHOTS)
                  </span>
                  <span className="text-[9px] text-rose-500 font-bold">2.5 shots</span>
                </div>
                <p className="text-[10px] text-slate-500 italic px-1">No active members in this tier.</p>
              </div>
            )}
          </div>
        </details>
      ) : (
        /* Full rendering when pool membership >= 7 */
        <>
          {dangerTier1.length === 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase">
                  DANGER ZONE // 2ND–6TH PLACE (1 SHOT)
                </span>
                <span className="text-[9px] text-amber-400 font-bold">1 shot</span>
              </div>
            </div>
          )}

          <div className="my-1 border-t-2 border-dashed border-rose-500/50 relative text-center">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-[9px] font-black text-rose-400 uppercase tracking-widest">
              ▼ THE DROP (1 SHOT → 2 SHOTS STEP) ▼
            </span>
          </div>

          {dangerTier2.length === 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-rose-400 uppercase">
                  HIGH DANGER // 7TH–9TH PLACE (2 SHOTS)
                </span>
                <span className="text-[9px] text-rose-400 font-bold">2 shots</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
