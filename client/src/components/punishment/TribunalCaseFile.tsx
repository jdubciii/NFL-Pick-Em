import React, { useState, useEffect } from 'react';
import type { PenaltySubmission, DisputeInfraction } from '../../services/punishmentFsmService';
import { DisputeDrawer } from './DisputeDrawer';

interface TribunalCaseFileProps {
  submission: PenaltySubmission;
  onFileDispute: (infraction: DisputeInfraction, justification: string) => void;
  onNominate: () => void;
  onEvaluateClearance: () => void;
}

export const TribunalCaseFile: React.FC<TribunalCaseFileProps> = ({
  submission,
  onFileDispute,
  onNominate,
  onEvaluateClearance
}) => {
  const [isDisputeOpen, setIsDisputeOpen] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!submission.disputeWindowEndsAt) return;

    const calculateRemaining = () => {
      const end = new Date(submission.disputeWindowEndsAt!).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setRemainingSeconds(diff);
      if (diff === 0 && submission.status === 'UNDER_REVIEW') {
        onEvaluateClearance();
      }
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [submission.disputeWindowEndsAt, submission.status, onEvaluateClearance]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hasGoldBorder = submission.nominations.length > 5;
  const isUnderReview = submission.status === 'UNDER_REVIEW';
  const isCleared = submission.status === 'CLEARED';
  const isDisputed = submission.status === 'DISPUTED';

  // Doomsday Clock visual escalation:
  const isUrgent = remainingSeconds < 3600; // < 1 hour (amber)
  const isCritical = remainingSeconds < 300; // < 5 mins (red pulse)

  return (
    <div
      className={`w-full rounded-2xl p-4 font-mono space-y-3 border-2 transition-all duration-300 ${
        hasGoldBorder
          ? 'border-amber-400 bg-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.3)]'
          : 'border-dashed border-slate-700 bg-slate-950/90'
      }`}
    >
      {/* Header Docket Metadata */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">DOCKET #{submission.id.slice(-8)}</span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] font-black text-rose-400">{submission.userName}</span>
        </div>
        <div>
          {isCleared ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 font-black tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.4)]">
              [ CLEARED ]
            </span>
          ) : isDisputed ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/60 font-black tracking-widest">
              [ STATUS: DISPUTED ]
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black tracking-widest">
              [ STATUS: UNDER LEAGUE REVIEW ]
            </span>
          )}
        </div>
      </div>

      {/* Video Viewport Mock & Doomsday Ticker */}
      <div className="relative w-full h-44 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
        <div className="text-2xl mb-1">📹</div>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          EVIDENCE TAPE: {submission.shotDebt.toFixed(2)} SHOTS ({submission.liquorType})
        </p>

        {/* 24-Hour Countdown Floating Pill */}
        {isUnderReview && (
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-950/90 border border-slate-700 flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase">WINDOW:</span>
            <span
              className={`text-xs font-black tracking-wider ${
                isCritical
                  ? 'text-rose-500 animate-pulse'
                  : isUrgent
                  ? 'text-amber-400'
                  : 'text-cyan-300'
              }`}
            >
              {formatCountdown(remainingSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Disputes Summary */}
      {submission.disputes.length > 0 && (
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/60 text-xs space-y-1">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">
            ACTIVE INFRACTIONS FILED ({submission.disputes.length}):
          </span>
          {submission.disputes.map((d) => (
            <div key={d.id} className="text-[11px] text-rose-200">
              • <strong className="text-rose-300">{d.infraction}</strong> by {d.disputerName}: "{d.justification}"
            </div>
          ))}
        </div>
      )}

      {/* Social Actions (Nominate & Dispute) */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onNominate}
          className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-black text-amber-300 transition flex items-center justify-center gap-1.5"
        >
          <span>🏆</span>
          <span>NOMINATE ({submission.nominations.length})</span>
        </button>

        {isUnderReview && (
          <button
            onClick={() => setIsDisputeOpen(true)}
            className="flex-1 py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/60 text-xs font-black text-rose-300 transition"
          >
            [ FILE DISPUTE ]
          </button>
        )}
      </div>

      <DisputeDrawer
        isOpen={isDisputeOpen}
        onClose={() => setIsDisputeOpen(false)}
        onSubmitDispute={onFileDispute}
      />
    </div>
  );
};
