import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scopedExpressFetch } from '../../lib/apiClient';
import { Trash2, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Archive } from 'lucide-react';

interface RetentionControlPanelProps {
  retentionData: {
    totalOutbox: number;
    terminalOutbox: number;
    prunableOutbox: number;
    totalInbox: number;
    prunableInbox: number;
  } | null;
  loading: boolean;
  onPruneComplete: () => void;
}

export const RetentionControlPanel: React.FC<RetentionControlPanelProps> = ({
  retentionData,
  loading,
  onPruneComplete,
}) => {
  const { token } = useAuth();
  const [pruning, setPruning] = useState(false);
  const [batchSize, setBatchSize] = useState('500');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handlePrune = async () => {
    if (!token) return;
    setPruning(true);
    setFeedback(null);

    try {
      const res = await scopedExpressFetch('/api/admin/ops/retention/prune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize: Math.min(Number(batchSize) || 500, 500), // Bound strictly to 500 max
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Retention prune failed.');
      }

      const data = await res.json();
      const prunedOutbox = data.result?.prunedOutboxEvents ?? 0;
      const prunedInbox = data.result?.prunedInboxMessages ?? 0;
      setFeedback({
        type: 'success',
        message: `Bounded prune completed! Removed ${prunedOutbox} outbox records and ${prunedInbox} inbox messages.`,
      });
      onPruneComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing retention prune.' });
    } finally {
      setPruning(false);
    }
  };

  const totalOutbox = retentionData?.totalOutbox || 0;
  const terminalOutbox = retentionData?.terminalOutbox || 0;
  const prunableOutbox = retentionData?.prunableOutbox || 0;
  const totalInbox = retentionData?.totalInbox || 0;
  const prunableInbox = retentionData?.prunableInbox || 0;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Data Retention & Archival Lifecycle</h3>
            <p className="text-xs text-slate-400">Terminal record pruning (Phase 12.4 Bounded Batch Standard)</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          LIMIT 500 / BATCH
        </span>
      </div>

      {/* Metrics Row */}
      <div className="px-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Total Outbox</div>
          <div className="text-xl font-bold text-white">{totalOutbox}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Terminal State</div>
          <div className="text-xl font-bold text-slate-300">{terminalOutbox}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Prunable Outbox</div>
          <div className="text-xl font-bold text-amber-400">{prunableOutbox}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Prunable Inbox</div>
          <div className="text-xl font-bold text-amber-400">{prunableInbox}</div>
        </div>
      </div>

      {/* Action Area */}
      <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 space-y-3">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400">Batch Size:</label>
            <input
              type="number"
              min="1"
              max="500"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white text-center focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={handlePrune}
            disabled={pruning}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition-all flex items-center space-x-2 shadow-md shadow-purple-500/20 disabled:opacity-50"
          >
            {pruning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{pruning ? 'Pruning...' : 'Run Bounded Prune'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
