import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scopedExpressFetch } from '../../lib/apiClient';
import { ShieldAlert, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ManualOverridePanelProps {
  poolId: string;
  onOverrideApplied: () => void;
}

export const ManualOverridePanel: React.FC<ManualOverridePanelProps> = ({
  poolId,
  onOverrideApplied,
}) => {
  const { token } = useAuth();
  const [overrideType, setOverrideType] = useState<'PICK' | 'PENALTY' | 'SCORE_ADJUSTMENT'>('PICK');
  const [targetUserId, setTargetUserId] = useState('');
  const [gameId, setGameId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!targetUserId.trim()) {
      setFeedback({ type: 'error', message: 'Target User ID is required.' });
      return;
    }

    if (!reason.trim()) {
      setFeedback({ type: 'error', message: 'Authoritative audit reason is mandatory.' });
      return;
    }

    if (overrideType === 'PICK' && (!gameId.trim() || !selectedTeamId.trim())) {
      setFeedback({ type: 'error', message: 'Game ID and Selected Team ID are required for Pick overrides.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payloadData: any = {
      userId: targetUserId.trim(),
    };

    if (overrideType === 'PICK') {
      payloadData.gameId = gameId.trim();
      payloadData.selectedTeamId = selectedTeamId.trim().toUpperCase();
    } else {
      payloadData.delta = delta;
      payloadData.points = delta;
    }

    try {
      const res = await scopedExpressFetch(`/api/pools/${poolId}/overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: overrideType,
          targetEntityId: targetUserId.trim(),
          data: payloadData,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.details || 'Failed to apply manual override.');
      }

      setFeedback({ type: 'success', message: 'Manual override executed and committed to ledger.' });
      setReason('');
      onOverrideApplied();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing override.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center space-x-2.5">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Authoritative Manual Override</h3>
          <p className="text-xs text-slate-400">Directly commit changes to pick outcomes or penalty ledgers</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Override Type Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Override Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['PICK', 'PENALTY', 'SCORE_ADJUSTMENT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOverrideType(t)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  overrideType === t
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Target User ID */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Target User UUID <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Dynamic Fields by Type */}
        {overrideType === 'PICK' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Game UUID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Game UUID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Selected Team Abbreviation <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                placeholder="e.g. KC, SF, PHI"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white placeholder-slate-600 uppercase focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Delta Adjustment (Decimal Units) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="0.25"
              required
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. 1.00 or -0.50"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Mandatory Rationale & Audit Trail <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Document authoritative ruling rationale, ticket reference, or stat correction basis..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-cyan-400 hover:opacity-90 shadow-md shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{submitting ? 'Committing Override...' : 'Apply Authoritative Override'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
