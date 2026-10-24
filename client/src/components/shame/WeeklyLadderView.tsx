import React from 'react';
import {
  SettledLadderParticipant,
  buildSettledLadderTiers
} from '../../services/wallOfShameConsolidationService';
import { formatShotUnit } from '../../services/dependableInfoService';

export type LadderViewStatus =
  | 'LOADING'
  | 'GAMES_NOT_STARTED'
  | 'READY'
  | 'INCOMPLETE_TELEMETRY'
  | 'ERROR'
  | 'EMPTY';

export interface WeeklyLadderViewProps {
  ladder?: any[];
  status?: LadderViewStatus;
  weekNumber?: number;
  isSettled?: boolean;
  scoreStatus?: string;
  errorMessage?: string;
  onRetry?: () => void;
  observedAt?: string;
  isStale?: boolean;
  onTriggerFtaDemo?: () => void;
}

export const WeeklyLadderView: React.FC<WeeklyLadderViewProps> = ({
  ladder = [],
  status = 'READY',
  weekNumber = 6,
  isSettled = false,
  scoreStatus,
  errorMessage,
  onRetry,
  observedAt,
  isStale = false,
}) => {
  const activeLadder = ladder || [];
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
            : scoreStatus === 'ALL_GAMES_FINAL'
            ? `WEEK ${weekNumber} · PROVISIONAL PREVIEW — SETTLEMENT NOT CONFIRMED`
            : `WEEK ${weekNumber} · PROVISIONAL PREVIEW`}
        </span>
      </div>

      {isStale && (
        <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-mono flex items-center justify-between">
          <span className="font-bold">⚠️ DISPLAYING STALE SNAPSHOT</span>
          {observedAt && (
            <span className="text-amber-400/80">
              Recorded {new Date(observedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {!isSettled && status === 'READY' && activeLadder.length > 0 && (
        <div className="text-[10px] text-slate-400 px-1 font-mono">
          Provisional projection based on live Sunday Sweat standings. Official penalties assign upon Monday Night settlement.
        </div>
      )}

      {status === 'LOADING' && (
        <div className="w-full p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl font-mono text-xs text-slate-400 space-y-2">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="font-bold text-slate-300 uppercase tracking-wider">[ LOADING WEEK {weekNumber} LADDER ]</div>
          <p className="text-[11px] text-slate-500">Retrieving pool participants and authoritative game telemetry...</p>
        </div>
      )}

      {(status === 'ERROR' || status === 'INCOMPLETE_TELEMETRY') && (
        <div className="w-full p-6 text-center bg-rose-950/20 border border-rose-500/40 rounded-2xl font-mono text-xs text-rose-300 space-y-3">
          <div className="font-black text-rose-400 uppercase tracking-wider">
            {status === 'INCOMPLETE_TELEMETRY' ? '[ INCOMPLETE GAME TELEMETRY ]' : '[ LADDER DATA UNAVAILABLE ]'}
          </div>
          <p className="text-[11px] text-slate-300 max-w-sm mx-auto">
            {errorMessage || (status === 'INCOMPLETE_TELEMETRY'
              ? 'Authoritative score data for one or more scoring events is missing or unverified. Provisional standings cannot be computed.'
              : 'Unable to load member picks or standings for this scope.')}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-1.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-500/60 rounded-lg text-xs font-bold text-rose-200 transition"
            >
              RETRY
            </button>
          )}
        </div>
      )}

      {status === 'GAMES_NOT_STARTED' && (
        <div className="w-full p-6 text-center bg-slate-900/40 border border-slate-800 rounded-2xl font-mono text-xs text-slate-400 space-y-2">
          <div className="font-bold text-slate-300 uppercase tracking-wider">[ GAMES NOT STARTED ]</div>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Week {weekNumber} matchups have not yet kicked off. Provisional sweat standings will unlock once live gameplay begins.
          </p>
        </div>
      )}

      {(status === 'EMPTY' || (status === 'READY' && activeLadder.length === 0)) && (
        <div className="w-full p-6 text-center bg-slate-900/40 border border-slate-800 rounded-2xl font-mono text-xs text-slate-400 space-y-2">
          <div className="font-bold text-slate-400 uppercase tracking-wider">[ NO STANDINGS AVAILABLE ]</div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            No participant picks or standings available for Week {weekNumber}.
          </p>
        </div>
      )}

      {status === 'READY' && activeLadder.length > 0 && (
        <>
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
                  <span className="font-black text-emerald-400">{m.displayRank || `#${m.rank}`}</span>
                  <span className="font-bold">{m.userName || m.name}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {isSettled ? (m.status || 'CLEARED (SAFE)') : (m.status || 'PROJECTED SAFE')}
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
                    <span className="font-bold text-amber-400">{m.displayRank || `#${m.rank}`}</span>
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
                    <span className="font-bold text-rose-400">{m.displayRank || `#${m.rank}`}</span>
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
                      <p className="text-sm font-black text-white">
                        {pitMember.displayRank ? `${pitMember.displayRank} ` : (pitMember.rank ? `#${pitMember.rank} ` : '')}{pitMember.userName || 'No Unsettled Penalties'}
                      </p>
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
        </>
      )}
    </div>
  );
};
