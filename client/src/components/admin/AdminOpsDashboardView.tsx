import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scopedExpressFetch } from '../../lib/apiClient';
import { TransportQueueWidget } from './TransportQueueWidget';
import { DLQInspector, DLQEventItem } from './DLQInspector';
import { RetentionControlPanel } from './RetentionControlPanel';
import { DaemonTriggerSuite } from './DaemonTriggerSuite';
import { Activity, ShieldAlert, RefreshCw, LayoutDashboard } from 'lucide-react';

interface SystemHealthData {
  status: string;
  timestamp: string;
  telemetry: {
    outbox: {
      pending: number;
      processing: number;
      failed: number;
      dead: number;
      delivered: number;
      total: number;
    };
    inbox: {
      unread: number;
      read: number;
      total: number;
    };
    dlq: {
      deadLetterCount: number;
      recentDeadLetters: Array<{
        id: string;
        event_type: string;
        channel: string;
        recipient: string;
        attempts: number;
        last_error?: string;
        created_at: string;
        updated_at: string;
      }>;
    };
    retention: {
      activeRecords: number;
      terminalRecords: number;
      breakdown: {
        delivered: number;
        dead: number;
        suppressed: number;
        sent: number;
      };
    };
  };
  locks: {
    remindersDaemon: {
      status: string;
      activeRunCount: number;
    };
  };
}

export const AdminOpsDashboardView: React.FC = () => {
  const { user, token } = useAuth();
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  const fetchHealth = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await scopedExpressFetch('/api/admin/ops/system/health');

      if (res.status === 403) {
        setError('403 Forbidden: Global ADMIN role required to view System Ops.');
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load system health telemetry (${res.status})`);
      }
      const data = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch telemetry');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchHealth();
    }
  }, [user, fetchHealth]);

  useEffect(() => {
    if (!autoRefresh || user?.role !== 'ADMIN') return;
    const interval = setInterval(() => {
      fetchHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, fetchHealth]);

  // Role check (Decision #20 Hardening)
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">403 - Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            You do not have permission to access the System Operations Hub. This panel is strictly restricted to System Administrators (Decision #20).
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Format DLQ items for DLQInspector
  const dlqItems: DLQEventItem[] = (healthData?.telemetry.dlq.recentDeadLetters || []).map((dl) => ({
    id: dl.id,
    recipientUserId: dl.recipient,
    type: dl.event_type,
    status: 'DEAD',
    attempts: dl.attempts,
    lastErrorCode: dl.last_error,
    createdAt: dl.created_at,
    sentAt: dl.updated_at,
  }));

  // Format Queue data for TransportQueueWidget
  const queueData = healthData
    ? {
        pending: healthData.telemetry.outbox.pending,
        processing: healthData.telemetry.outbox.processing,
        deadLetters: healthData.telemetry.outbox.dead,
        oldestPendingAgeSeconds: 0,
      }
    : null;

  // Format Retention data for RetentionControlPanel
  const retentionData = healthData
    ? {
        totalOutbox: healthData.telemetry.outbox.total,
        terminalOutbox: healthData.telemetry.retention.terminalRecords,
        prunableOutbox: healthData.telemetry.retention.breakdown.delivered + healthData.telemetry.retention.breakdown.dead,
        totalInbox: healthData.telemetry.inbox.total,
        prunableInbox: healthData.telemetry.inbox.read,
      }
    : null;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-white tracking-tight">System Operations Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  SYSTEM TIER (DEC #20)
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Outbox transport telemetry, dead-letter monitoring, retention pruning, and daemon suites
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
            />
            <span>Auto-refresh (10s)</span>
          </label>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-white transition flex items-center space-x-2 disabled:opacity-50 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="space-y-6">
        {/* Top Operational Telemetry & Daemon Triggers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransportQueueWidget
              queueData={queueData}
              loading={loading}
              onDrainComplete={fetchHealth}
            />
          </div>
          <div>
            <DaemonTriggerSuite onTriggerComplete={fetchHealth} />
          </div>
        </div>

        {/* Retention Control Panel */}
        <RetentionControlPanel
          retentionData={retentionData}
          loading={loading}
          onPruneComplete={fetchHealth}
        />

        {/* DLQ Inspector */}
        <DLQInspector
          dlqEvents={dlqItems}
          loading={loading}
        />
      </div>
    </div>
  );
};
