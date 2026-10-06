import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  ExternalLink,
  Film,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react";

export type ShotCamStatus =
  | "PENDING_UPLOAD"
  | "UPLOAD"
  | "COMMISSIONER_AUDIT"
  | "APPROVE"
  | "VERIFIED"
  | "DISPUTED";

export interface ShotCamSubmission {
  id: string;
  userId: string;
  username: string;
  status: ShotCamStatus;
  fineAmount: number;
  isDeadPlaceMonarch: boolean;
  videoUrl?: string;
  disputeDeadline?: string;
}

export interface ShotCamReviewCardProps {
  submissions: ShotCamSubmission[];
  isCommissioner: boolean;
  tenantId: string;
  poolId: string;
  onApprove: (id: string) => Promise<void>;
  onDispute: (id: string) => Promise<void>;
  isFeatureActive?: boolean;
  kickoffLockAt?: string;
}

export const statusStyles: Record<ShotCamStatus, string> = {
  PENDING_UPLOAD: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  UPLOAD: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  COMMISSIONER_AUDIT: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  APPROVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  VERIFIED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  DISPUTED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

export const statusLabels: Record<ShotCamStatus, string> = {
  PENDING_UPLOAD: "Pending upload",
  UPLOAD: "Uploaded · awaiting audit",
  COMMISSIONER_AUDIT: "Commissioner audit",
  APPROVE: "Approved",
  VERIFIED: "Verified",
  DISPUTED: "Disputed",
};

function countdown(deadline: string | undefined, now: number): string {
  if (!deadline) return "Deadline unavailable";
  const end = Date.parse(deadline);
  if (!Number.isFinite(end)) return "Deadline unavailable";
  const remaining = Math.max(0, Math.ceil((end - now) / 1000));
  if (remaining === 0) return "Time expired";
  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor((remaining % 86_400) / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const seconds = remaining % 60;
  return days > 0
    ? `${days}d ${hours}h ${minutes}m remaining`
    : `${hours}h ${minutes}m ${seconds}s remaining`;
}

function safeVideoUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function ShotCamReviewCard({
  submissions,
  isCommissioner,
  tenantId,
  poolId,
  onApprove,
  onDispute,
  isFeatureActive = false,
  kickoffLockAt,
}: ShotCamReviewCardProps) {
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!isFeatureActive) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [isFeatureActive]);

  const runAction = async (id: string, action: (submissionId: string) => Promise<void>) => {
    if (busyId || !tenantId.trim() || !poolId.trim()) return;
    setBusyId(id);
    setActionError(null);
    try {
      await action(id);
    } catch (error) {
      setActionError({
        id,
        message: error instanceof Error && error.message
          ? error.message
          : "The review action failed. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!isFeatureActive) {
    return (
      <section className="rounded-2xl border border-cyan-400/20 bg-[#0b1329] p-6 text-slate-100 shadow-[0_0_36px_rgba(34,211,238,0.07)]">
        <div className="flex items-start gap-4">
          <span className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-cyan-300">
            <LockKeyhole aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
              Feature unavailable
            </span>
            <h2 className="mt-3 text-xl font-bold text-white">Shot-Cam review</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Shot-Cam review will be available when the Phase 22 UI feature is active.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-[#0b1329] p-5 text-slate-100 shadow-[0_0_42px_rgba(34,211,238,0.08)] sm:p-7">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-700/80 pb-6 sm:flex-row sm:items-start">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">
            <Film aria-hidden="true" className="h-3.5 w-3.5" /> Wall of Shame
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Shot-Cam review</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Pending proof, commissioner review, and penalty history for this pool.</p>
        </div>
        <span className="self-start rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300">
          {submissions.length} {submissions.length === 1 ? "submission" : "submissions"}
        </span>
      </header>

      <div className="my-6 grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Tenant ID</p>
          <p className="mt-1 break-all font-mono text-sm text-cyan-200">{tenantId || "—"}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Pool ID</p>
          <p className="mt-1 break-all font-mono text-sm text-emerald-200">{poolId || "—"}</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 px-5 py-10 text-center">
          <ShieldCheck aria-hidden="true" className="mx-auto h-8 w-8 text-emerald-300" />
          <p className="mt-3 font-semibold text-white">No Shot-Cam submissions</p>
          <p className="mt-1 text-sm text-slate-400">Penalties and proof submitted for this pool will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {submissions.map((submission) => {
            const videoUrl = safeVideoUrl(submission.videoUrl);
            const inAudit = submission.status === "COMMISSIONER_AUDIT";
            const isVerified = submission.status === "VERIFIED" || submission.status === "APPROVE";
            return (
              <article key={submission.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-lg shadow-black/10">
                {submission.isDeadPlaceMonarch && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/25 bg-amber-400/10 px-5 py-3 text-amber-200">
                    <span className="inline-flex items-center gap-2 text-sm font-bold"><Crown aria-hidden="true" className="h-4 w-4" /> Dead Place Monarch</span>
                    <span className="text-sm font-bold tabular-nums">Absolute $2.50 fine · no split</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold text-white">{submission.username}</h3>
                      <p className="mt-1 break-all font-mono text-xs text-slate-500">Player ID: {submission.userId}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[submission.status]}`}>
                      {isVerified && <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}
                      {statusLabels[submission.status]}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-slate-700/70 py-4 text-sm">
                    <span className="text-slate-400">Penalty fine</span>
                    <strong className="font-mono text-lg tabular-nums text-white">${submission.fineAmount.toFixed(2)}</strong>
                  </div>

                  {submission.status === "PENDING_UPLOAD" && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-cyan-200">
                      <Timer aria-hidden="true" className="h-4 w-4 shrink-0" /> Kickoff lock: {countdown(kickoffLockAt, now)}
                    </p>
                  )}
                  {submission.status === "DISPUTED" && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-rose-200">
                      <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" /> Dispute window: {countdown(submission.disputeDeadline, now)}
                    </p>
                  )}
                  {submission.status === "UPLOAD" && (
                    <p className="mt-4 text-sm text-sky-200">Proof uploaded; awaiting commissioner audit.</p>
                  )}
                  {isVerified && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Proof verified · penalty served</p>
                  )}

                  <div className="mt-auto pt-5">
                    {videoUrl && (
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                        <Film aria-hidden="true" className="h-4 w-4" /> View proof <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {inAudit && isCommissioner && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={busyId !== null || !tenantId.trim() || !poolId.trim()} onClick={() => void runAction(submission.id, onApprove)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                          <Check aria-hidden="true" className="h-4 w-4" /> {busyId === submission.id ? "Processing…" : "Approve"}
                        </button>
                        <button type="button" disabled={busyId !== null || !tenantId.trim() || !poolId.trim()} onClick={() => void runAction(submission.id, onDispute)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
                          <X aria-hidden="true" className="h-4 w-4" /> {busyId === submission.id ? "Processing…" : "Dispute"}
                        </button>
                      </div>
                    )}
                    {actionError?.id === submission.id && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{actionError.message}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" /> Kickoff lock and dispute decisions are enforced by the server.</p>
    </section>
  );
}
