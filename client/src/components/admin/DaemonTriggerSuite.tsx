import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Play, BellRing, Trophy, CheckCircle2, AlertTriangle, RefreshCw, Cpu } from 'lucide-react';

interface DaemonTriggerSuiteProps {
  onTriggerComplete: () => void;
}

export const DaemonTriggerSuite: React.FC<DaemonTriggerSuiteProps> = ({ onTriggerComplete }) => {
  const { token } = useAuth();
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const triggerReminderScan = async () => {
    if (!token) return;
    setRunningAction('reminders');
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/ops/scan-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Reminder scan failed.');
      }

      const data = await res.json();
      const count = data.scanResult?.remindersEnqueued ?? 0;
      setFeedback({
        type: 'success',
        message: `Reminder scanner finished! Enqueued ${count} notification events.`,
      });
      onTriggerComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error triggering reminder scan.' });
    } finally {
      setRunningAction(null);
    }
  };

  const triggerWrapUp = async () => {
    if (!token) return;
    setRunningAction('wrapup');
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/ops/wrap-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekNumber: 1 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Wrap-up sweep failed.');
      }

      const data = await res.json();
      setFeedback({
        type: 'success',
        message: 'Weekly wrap-up engine finished and standings snapshot committed.',
      });
      onTriggerComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error triggering wrap-up sweep.' });
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Daemon & Engine Operational Triggers</h3>
            <p className="text-xs text-slate-400">Manual invocation of background job daemons</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          SYSTEM TIER
        </span>
      </div>

      {/* Action Cards */}
      <div className="p-6 space-y-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reminder Scanner Trigger */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <BellRing className="w-4 h-4 text-cyan-400" />
                <span>Reminder Scanner Sweep</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Evaluates active pool members with unsubmitted picks across upcoming lookahead windows.
              </p>
            </div>

            <button
              onClick={triggerReminderScan}
              disabled={!!runningAction}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {runningAction === 'reminders' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{runningAction === 'reminders' ? 'Scanning...' : 'Trigger Reminder Scan'}</span>
            </button>
          </div>

          {/* Weekly Wrap-Up Trigger */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Weekly Wrap-Up Sweep</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Evaluates finalized weekly slates, computes winners, applies shot penalties, and seals digests.
              </p>
            </div>

            <button
              onClick={triggerWrapUp}
              disabled={!!runningAction}
              className="w-full py-2 px-3 rounded-xl text-slate-950 font-bold bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {runningAction === 'wrapup' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{runningAction === 'wrapup' ? 'Processing...' : 'Trigger Wrap-Up Sweep'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
