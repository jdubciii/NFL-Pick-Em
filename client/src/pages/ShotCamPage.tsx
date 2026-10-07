import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Beer,
  Crown,
  Timer,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UploadCloud,
  FileVideo,
  ShieldCheck,
  RefreshCw,
  Send,
  Lock,
  Play,
  Check,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export type ShotCamStatus =
  | 'DISPUTED'
  | 'PENDING_SUBMISSION'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'SERVED'
  | 'FORFEIT';

export interface ShotCamActiveRecord {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  weekNumber: number;
  penaltyShots: number;
  status: ShotCamStatus;
  disputeReason: string | null;
  disputeExpiresAt: string;
  videoUrl: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
}

export const ShotCamPage: React.FC = () => {
  const { token, user } = useAuth();
  const [poolId, setPoolId] = useState<string>('');
  const [activeRecord, setActiveRecord] = useState<ShotCamActiveRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Time ticker for 24h countdown
  const [now, setNow] = useState<number>(() => Date.now());

  // Dispute form state
  const [disputeInput, setDisputeInput] = useState<string>('');
  const [showDisputeDrawer, setShowDisputeDrawer] = useState<boolean>(false);

  // Video upload state
  const [videoUrlInput, setVideoUrlInput] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Fetch available pools first
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await fetch('/api/pools', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const pools = await res.json();
          if (pools.length > 0) {
            const main = pools.find((p: any) => p.name === 'Main League') || pools[0];
            setPoolId(main.id);
          }
        }
      } catch (err) {
        console.error('Failed to load pools:', err);
      }
    };
    if (token) {
      fetchPools();
    }
  }, [token]);

  // Live timer interval (every second)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active Shot-Cam penalty record from API
  const fetchActiveRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = poolId
        ? `/api/pools/${poolId}/shot-cam/active`
        : '/api/shot-cam/active';

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load Shot-Cam record (status ${res.status})`);
      }
      const data: ShotCamActiveRecord = await res.json();
      setActiveRecord(data);
    } catch (err: any) {
      console.error('Error fetching Shot-Cam active record:', err);
      setError(err.message || 'Failed to fetch Shot-Cam record.');
    } finally {
      setLoading(false);
    }
  }, [poolId, token]);

  useEffect(() => {
    fetchActiveRecord();
  }, [fetchActiveRecord]);

  // Handle Commissioner Review Actions
  const handleReview = async (action: 'APPROVE_DISPUTE' | 'REJECT_DISPUTE' | 'VERIFY_VIDEO', notes?: string) => {
    if (!activeRecord) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const endpoint = poolId
        ? `/api/pools/${poolId}/shot-cam/review`
        : '/api/shot-cam/review';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          penaltyId: activeRecord.id,
          action,
          notes: notes || 'Reviewed via Commissioner Control Tray',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit review action');
      }

      const result = await res.json();
      setActiveRecord(result.submission || null);
      setSuccessMessage(result.message || 'Action processed successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error executing review action.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dispute Submission
  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeInput.trim() || !activeRecord) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const endpoint = poolId
        ? `/api/pools/${poolId}/shot-cam/dispute`
        : '/api/shot-cam/dispute';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          penaltyId: activeRecord.id,
          reason: disputeInput.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit dispute');
      }

      const result = await res.json();
      setActiveRecord(result.submission || null);
      setSuccessMessage(result.message || 'Dispute submitted! 24h countdown active.');
      setShowDisputeDrawer(false);
      setDisputeInput('');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error filing dispute.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Video Upload Proof Submission
  const handleVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim() || !activeRecord) return;
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const endpoint = poolId
        ? `/api/pools/${poolId}/shot-cam/upload`
        : '/api/shot-cam/upload';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          penaltyId: activeRecord.id,
          videoUrl: videoUrlInput.trim(),
          mediaType: 'video/mp4',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit video proof');
      }

      const result = await res.json();
      setActiveRecord(result.submission || null);
      setSuccessMessage('Video proof submitted successfully! Awaiting Commissioner audit.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error submitting video proof.');
    } finally {
      setIsUploading(false);
    }
  };

  // Countdown calculations
  const calculateCountdown = () => {
    if (!activeRecord?.disputeExpiresAt) return { text: '24h Timer Inactive', isExpired: false, percent: 0 };
    const expireMs = new Date(activeRecord.disputeExpiresAt).getTime();
    const diffMs = expireMs - now;

    if (diffMs <= 0) {
      return { text: '24h Dispute Window Expired', isExpired: true, percent: 100 };
    }

    const totalWindowMs = 24 * 60 * 60 * 1000;
    const elapsedMs = Math.max(0, totalWindowMs - diffMs);
    const percent = Math.min(100, Math.round((elapsedMs / totalWindowMs) * 100));

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return {
      text: `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s remaining to dispute or serve`,
      isExpired: false,
      percent,
    };
  };

  const countdown = calculateCountdown();

  const isCommissioner =
    user?.role === 'ADMIN' ||
    user?.email?.toLowerCase() === 'jack@nflpickem.com' ||
    user?.email?.toLowerCase() === 'admin@nflpickem.com';

  const isSubject = user?.email?.toLowerCase() === 'bigjack@nflpickem.com' || user?.id === activeRecord?.userId;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Beer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Shot-Cam Dispute & Verification Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Tamper-proof Dead Place Monarch penalty execution & 24h dispute lifecycle (Decision #65).
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchActiveRecord}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Alerts / Feedback Banners */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm animate-in slide-in-from-top-2">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Active Dead Place Penalty Card */}
      {activeRecord ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Subject Banner, Countdown, Video Proof */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Active Dead Place Monarch Banner */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950 p-6 shadow-2xl shadow-black/60">
              <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                <Crown className="w-48 h-48 text-amber-400" />
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {/* Big Jack Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-xl shadow-amber-500/20 border-2 border-amber-400/40">
                      BJ
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Dead Place Monarch
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Week {activeRecord.weekNumber}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight mt-1">
                      {activeRecord.displayName}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {activeRecord.email}
                    </p>
                  </div>
                </div>

                {/* Penalty Shots Badge */}
                <div className="flex flex-col items-start sm:items-end p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-inner min-w-[150px]">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Assigned Penalty
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-3xl font-black text-amber-400">
                      {activeRecord.penaltyShots}
                    </span>
                    <span className="text-sm font-extrabold uppercase text-slate-300">
                      Shots
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-bold mt-1">
                    Week 4 Lowest Score (8 PTS)
                  </span>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-400">FSM State:</span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${
                      activeRecord.status === 'DISPUTED'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : activeRecord.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : activeRecord.status === 'SUBMITTED'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {activeRecord.status}
                  </span>
                </div>

                {activeRecord.reviewedBy && (
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Audited by: {activeRecord.reviewedBy}</span>
                  </span>
                )}
              </div>
            </div>

            {/* 2. 24-Hour Dispute Countdown Ticker Component */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className={`w-5 h-5 ${countdown.isExpired ? 'text-slate-500' : 'text-amber-400 animate-spin-slow'}`} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    24-Hour Dispute Window
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {countdown.percent}% Elapsed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500 transition-all duration-1000 ease-out"
                  style={{ width: `${countdown.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{countdown.text}</span>
                </span>
                <span className="text-slate-500 text-[11px]">
                  Expires: {new Date(activeRecord.disputeExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Dispute Reason Banner if DISPUTED */}
              {activeRecord.disputeReason && (
                <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start space-x-3 text-xs">
                  <MessageSquare className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-rose-300 uppercase tracking-wide">
                      Formal Dispute Claim Filed:
                    </span>
                    <p className="text-rose-200 mt-0.5 italic">
                      "{activeRecord.disputeReason}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Video Verification Player */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileVideo className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Shot-Cam Video Proof Verification
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {activeRecord.videoUrl ? 'Proof Attached' : 'No Video Uploaded'}
                </span>
              </div>

              {activeRecord.videoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center group shadow-2xl">
                  <video
                    src={activeRecord.videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  {/* Verified Watermark if VERIFIED */}
                  {activeRecord.status === 'VERIFIED' && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500/90 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center space-x-1 shadow-lg pointer-events-none">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verified Shot</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-10 flex flex-col items-center justify-center text-center space-y-2">
                  <UploadCloud className="w-10 h-10 text-slate-600 animate-bounce" />
                  <p className="text-sm font-bold text-slate-300">
                    No Shot-Cam proof video uploaded yet
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Big Jack must record and submit 2.5 shots consumed on video to clear this penalty.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Commissioner Tray, Actions, Upload & Dispute Drawers */}
          <div className="lg:col-span-4 space-y-6">
            {/* Commissioner Control Tray */}
            {isCommissioner ? (
              <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 p-5 shadow-2xl space-y-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Commissioner Control Tray
                    </h3>
                    <span className="text-[10px] text-indigo-300 font-semibold">
                      Authorized: Jack (You)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Review Big Jack's dispute claim and video evidence. Your verdict updates the official PenaltyLedger and AuditLog.
                </p>

                <div className="space-y-2.5 pt-2">
                  {/* Approve / Waive Button */}
                  <button
                    onClick={() => handleReview('APPROVE_DISPUTE', 'Dispute approved by Commissioner Jack')}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs tracking-wide shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Dispute / Waive Shots</span>
                  </button>

                  {/* Deny / Enforce Button */}
                  <button
                    onClick={() => handleReview('REJECT_DISPUTE', 'Dispute rejected by Commissioner Jack')}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wide shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Deny Dispute / Enforce 2.5 Shots</span>
                  </button>

                  {/* Verify Video Proof Button */}
                  {activeRecord.videoUrl && (
                    <button
                      onClick={() => handleReview('VERIFY_VIDEO', 'Video verified by Commissioner Jack')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs tracking-wide shadow-sm transition-all disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verify Video Proof</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Commissioner Review Locked
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Only Commissioner Jack (`jack@nflpickem.com`) has authority to approve or deny disputes.
                </p>
              </div>
            )}

            {/* Video Submission Portal Drawer */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-4">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Submit Proof Video
                </h3>
              </div>

              <form onSubmit={handleVideoUpload} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Proof Video URL or Storage Key
                  </label>
                  <input
                    type="text"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://... / video.mp4"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !videoUrlInput.trim()}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-extrabold text-xs tracking-wide shadow-md transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Upload Shot-Cam Proof</span>
                </button>
              </form>
            </div>

            {/* Dispute Filing Drawer */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    File Dispute Claim
                  </h3>
                </div>
                <button
                  onClick={() => setShowDisputeDrawer((prev) => !prev)}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline"
                >
                  {showDisputeDrawer ? 'Cancel' : 'Edit Excuse'}
                </button>
              </div>

              {showDisputeDrawer ? (
                <form onSubmit={handleDisputeSubmit} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Formal Excuse / Justification
                    </label>
                    <textarea
                      rows={3}
                      value={disputeInput}
                      onChange={(e) => setDisputeInput(e.target.value)}
                      placeholder="e.g. Flight delay prevented pick locking before London kickoff..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-rose-500 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || !disputeInput.trim()}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wide shadow-md transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit 24h Dispute Claim</span>
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dead Place subjects have a 24-hour window from game conclusion to submit a formal dispute to the Commissioner.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center space-y-4">
          <Beer className="w-12 h-12 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">
            No active Dead Place penalty found in this pool.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShotCamPage;
