import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wine, 
  X, 
  Plus, 
  Minus, 
  History, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  Calendar
} from 'lucide-react';

export interface PenaltyLedgerEntry {
  id: string;
  poolId: string;
  userId: string;
  weekNumber: number | null;
  delta: number;
  reason: string;
  createdById: string;
  createdAt: string;
  createdBy?: {
    id: string;
    email: string;
  };
}

export interface AdminPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberEmail?: string;
  poolId: string;
  onPenaltyAdjusted?: () => void;
}

export const AdminPenaltyModal: React.FC<AdminPenaltyModalProps> = ({
  isOpen,
  onClose,
  memberId,
  memberEmail,
  poolId,
  onPenaltyAdjusted,
}) => {
  const { token } = useAuth();
  const [delta, setDelta] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [weekNumber, setWeekNumber] = useState<string>('1');
  const [history, setHistory] = useState<PenaltyLedgerEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch past PenaltyLedger entries for this user
  const fetchMemberHistory = useCallback(async () => {
    if (!poolId || !memberId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/pools/${poolId}/penalties/member/${memberId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load penalty ledger history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [poolId, memberId, token]);

  useEffect(() => {
    if (isOpen && memberId && poolId) {
      setError(null);
      setSuccessMessage(null);
      setReason('');
      setDelta(1);
      fetchMemberHistory();
    }
  }, [isOpen, memberId, poolId, fetchMemberHistory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason for the penalty adjustment is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/pools/${poolId}/penalties/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          member_id: memberId,
          delta,
          reason: reason.trim(),
          week_number: weekNumber ? parseInt(weekNumber, 10) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust penalty.');
      }

      setSuccessMessage(
        `Successfully applied adjustment: ${delta > 0 ? `+${delta}` : delta} shots.`
      );
      setReason('');
      fetchMemberHistory();
      if (onPenaltyAdjusted) {
        onPenaltyAdjusted();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const presetReasons = [
    'Weekly Dead Place Penalty',
    'Late / Missed Pick Submission',
    'Custom Pool Forfeit Wager',
    'Admin Pardon / Correction',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Adjust Penalty Ledger
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                Target: <span className="text-amber-300 font-semibold">{memberEmail || memberId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Adjustment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stepper / Number Input for Delta */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Shot Delta (Positive or Negative Integer)
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setDelta((prev) => prev - 1)}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-lg transition-colors focus:outline-none"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
                  className="flex-1 text-center bg-slate-950 border border-slate-700 rounded-xl py-2.5 text-xl font-black font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setDelta((prev) => prev + 1)}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-lg transition-colors focus:outline-none"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Delta Chips */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {[1, 2, 3, -1].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDelta(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                      delta === val
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Week Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Week Number (Optional)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 pl-10"
                />
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Reason Text Input & Presets */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Adjustment Reason / Note
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter mandatory reason for audit trail..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
              />

              <div className="flex flex-wrap gap-1.5 mt-2">
                {presetReasons.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-750 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{submitting ? 'Applying Adjustment...' : 'Apply Penalty Adjustment'}</span>
            </button>
          </form>

          {/* Read-Only Penalty Ledger Audit History */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <History className="w-4 h-4 text-amber-400" />
                <span>Penalty Ledger History</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">{history.length} entries</span>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
              {loadingHistory ? (
                <div className="py-6 text-center text-slate-500 italic">Loading ledger history...</div>
              ) : history.length === 0 ? (
                <div className="py-6 text-center text-slate-500 italic">No penalty entries recorded.</div>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="p-3 flex items-center justify-between hover:bg-slate-900/40">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                            entry.delta > 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {entry.delta > 0 ? `+${entry.delta}` : entry.delta} shots
                        </span>
                        <span className="font-semibold text-slate-200">{entry.reason}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                        {entry.weekNumber && <span>Week {entry.weekNumber}</span>}
                        <span>•</span>
                        <span>By: {entry.createdBy?.email || 'Admin'}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
