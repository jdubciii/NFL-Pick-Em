import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, Clock, AlertTriangle, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { scopedExpressFetch } from '../../lib/apiClient';

interface TransportQueueWidgetProps {
  queueData: {
    pending: number;
    processing: number;
    deadLetters: number;
    oldestPendingAgeSeconds: number;
  } | null;
  loading: boolean;
  onDrainComplete: () => void;
}

export const TransportQueueWidget: React.FC<TransportQueueWidgetProps> = ({
  queueData,
  loading,
  onDrainComplete,
}) => {
  const { isAuthenticated } = useAuth();
  const [draining, setDraining] = useState(false);
  const [batchSize, setBatchSize] = useState('50');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleDrain = async () => {
    if (!isAuthenticated) return;
    setDraining(true);
    setFeedback(null);

    try {
      const res = await scopedExpressFetch('/api/admin/ops/transports/drain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchSize: Number(batchSize) || 50 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Transport drain failed.');
      }

      const data = await res.json();
      const dispatched = data.result?.dispatchedCount ?? data.result?.processed ?? 0;
      setFeedback({
        type: 'success',
        message: `Sweep dispatched successfully! Processed ${dispatched} events.`,
      });
      onDrainComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing transport drain.' });
    } finally {
      setDraining(false);
    }
  };

  const pending = queueData?.pending || 0;
  const processing = queueData?.processing || 0;
  const dead = queueData?.deadLetters || 0;
  const age = queueData?.oldestPendingAgeSeconds || 0;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Outbox Delivery Transports</h3>
            <p className="text-xs text-slate-400">Queue telemetry & manual transport dispatch drain</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            dead > 0
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
              : pending > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}
        >
          {dead > 0 ? 'DLQ Active' : pending > 0 ? 'Queue Active' : 'Idle'}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="px-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Pending</div>
          <div className="text-xl font-bold text-white">{pending}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Processing</div>
          <div className="text-xl font-bold text-cyan-400">{processing}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Dead Letters</div>
          <div className={`text-xl font-bold ${dead > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
            {dead}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Oldest Age</div>
          <div className="text-xl font-bold text-slate-300">{age}s</div>
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
              max="200"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white text-center focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleDrain}
            disabled={draining}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-90 transition-all flex items-center space-x-2 shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {draining ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{draining ? 'Draining...' : 'Trigger Transport Drain'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
