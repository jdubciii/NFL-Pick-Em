import React from 'react';
import type {
  AdjudicatedPenaltySubmission,
  TribunalVoteType
} from '../../services/tribunalAdjudicationService';

interface TheGavelAdjudicationProps {
  docket: AdjudicatedPenaltySubmission;
  currentUserId: string;
  onCastVote: (vote: TribunalVoteType) => void;
}

export const TheGavelAdjudication: React.FC<TheGavelAdjudicationProps> = ({
  docket,
  currentUserId,
  onCastVote
}) => {
  const isDefendant = currentUserId === docket.userId;
  const primaryDispute = docket.disputes[0];
  const votes = docket.tribunalMetadata.votes;
  const isResolved = docket.tribunalMetadata.isResolved;
  const verdict = docket.tribunalMetadata.verdict;
  const hasVoted = votes.some((v) => v.voterId === currentUserId);

  const totalJurors = 8;
  const votesCastCount = votes.length;

  return (
    <div className="relative w-full h-[540px] rounded-2xl bg-black border border-slate-800 overflow-hidden font-mono flex flex-col justify-between p-4 shadow-2xl">
      {/* Background Dimming & Legal Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950/95 pointer-events-none" />

      {/* Header Docket Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wider text-rose-400">
            ⚖️ THE TRIBUNAL // DOCKET #{docket.id.slice(-6)}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50 font-bold uppercase">
          {isResolved ? `VERDICT: ${verdict}` : 'DELIBERATION ACTIVE'}
        </span>
      </div>

      {/* Center Accusation & Verdict Stamp */}
      <div className="relative z-10 my-auto text-center space-y-3">
        {/* The 50-Character Accusation Banner */}
        <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/80 shadow-lg shadow-rose-950/60 max-w-sm mx-auto">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">
            FORMAL CHARGE: {primaryDispute?.infraction || 'INFRACTION REPORTED'}
          </p>
          <p className="text-xs font-sans font-semibold text-rose-100 leading-snug">
            "{primaryDispute?.justification || 'Evidence contested by league member.'}"
          </p>
          <p className="text-[9px] text-rose-400/80 mt-1 uppercase">
            FILED BY: {primaryDispute?.disputerName || 'LEAGUE JUROR'}
          </p>
        </div>

        {/* Verdict Stamp */}
        {isResolved && (
          <div className="pt-2 animate-bounce">
            {verdict === 'UPHELD' ? (
              <div className="inline-block p-3 rounded-xl bg-rose-950 border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)]">
                <p className="text-sm font-black text-rose-200 tracking-widest">
                  CONTEMPT OF COURT // PENALTY ESCALATED
                </p>
                <p className="text-xs text-rose-400 mt-1 font-bold">
                  <span className="line-through text-slate-500 mr-2">2.50 SHOTS</span>
                  <span className="text-white font-black text-sm bg-rose-600 px-2 py-0.5 rounded">
                    3.00 SHOTS
                  </span>
                </p>
              </div>
            ) : (
              <div className="inline-block p-3 rounded-xl bg-emerald-950 border-2 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                <p className="text-sm font-black text-emerald-200 tracking-widest">
                  OBJECTION OVERRULED // CLEARED
                </p>
                <p className="text-xs text-emerald-400 mt-1 font-bold">
                  JURY ACQUITTAL — DEBT BALANCED TO 0.00
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Deliberation & Gavel Controls */}
      <div className="relative z-10 space-y-3">
        {/* Juror Avatars (Blind Voting Representation) */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2 font-bold">
            <span>
              {isResolved
                ? 'FINAL BALLOT REVEAL'
                : `${votesCastCount}/${totalJurors} JURORS DELIBERATED`}
            </span>
            <span>{isResolved ? 'RESOLVED' : 'BLIND TALLY'}</span>
          </div>

          <div className="flex justify-center gap-1.5">
            {Array.from({ length: totalJurors }, (_, idx) => {
              const voteRecord = votes[idx];
              const isCast = !!voteRecord;

              let avatarColor = 'bg-slate-800 text-slate-500 border-slate-700';
              if (isResolved && voteRecord) {
                avatarColor =
                  voteRecord.vote === 'UPHOLD'
                    ? 'bg-rose-950 border-rose-500 text-rose-300'
                    : 'bg-emerald-950 border-emerald-500 text-emerald-300';
              } else if (isCast) {
                avatarColor = 'bg-slate-700 text-slate-200 border-slate-500';
              }

              return (
                <div
                  key={idx}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-black transition-all ${avatarColor}`}
                >
                  {isResolved && voteRecord
                    ? voteRecord.vote === 'UPHOLD'
                      ? 'G'
                      : 'A'
                    : isCast
                    ? '✓'
                    : 'J'}
                </div>
              );
            })}
          </div>

          {isDefendant && !isResolved && (
            <p className="text-[10px] text-amber-400 text-center mt-2 animate-pulse font-bold">
              ⚡ DEFENDANT SWEAT ACTIVE — AWAITING JURY BALLOT
            </p>
          )}
        </div>

        {/* Action Controls */}
        {!isResolved && (
          <>
            {isDefendant ? (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 font-bold">
                [ DEFENDANT RECUSED FROM JURY BALLOT ]
              </div>
            ) : hasVoted ? (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center text-xs text-cyan-300 font-bold">
                ✓ BALLOT SUBMITTED (BLIND TALLY LOCKED)
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onCastVote('UPHOLD')}
                  className="py-3 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-rose-950"
                >
                  [ UPHOLD (GUILTY) ]
                </button>
                <button
                  onClick={() => onCastVote('DISMISS')}
                  className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950"
                >
                  [ DISMISS (ACQUIT) ]
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
