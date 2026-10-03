import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Users, Mail, RefreshCw } from 'lucide-react';

export interface PoolOpsStatusData {
  poolId: string;
  poolName: string;
  status: string;
  activeMembers: number;
  unreadNotifications: number;
  pendingOutbox: number;
  deadOutbox: number;
  wrapUpReady: boolean;
  metrics: {
    totalMembers: number;
    totalProposals: number;
    totalOverrides: number;
  };
}

interface PoolHealthWidgetProps {
  data: PoolOpsStatusData | null;
  loading: boolean;
  onRefresh: () => void;
}

export const PoolHealthWidget: React.FC<PoolHealthWidgetProps> = ({
  data,
  loading,
  onRefresh,
}) => {
  if (loading && !data) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center space-x-3 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-sm">Loading pool telemetry...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 text-sm">
        No telemetry data available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pool Operations & Health</h3>
            <p className="text-xs text-slate-400">Real-time status for {data.poolName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
              data.wrapUpReady
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {data.wrapUpReady ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{data.wrapUpReady ? 'Wrap-Up Ready' : 'Pending Operations'}</span>
          </span>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Members</span>
          </div>
          <div className="text-2xl font-black text-white">{data.activeMembers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total: {data.metrics.totalMembers} enrolled</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unread Notifications</span>
          </div>
          <div className="text-2xl font-black text-white">{data.unreadNotifications}</div>
          <div className="text-[11px] text-slate-500 mt-1">Inbox messages pending read</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Outbox Queue Depth</span>
          </div>
          <div className="text-2xl font-black text-white">{data.pendingOutbox}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.deadOutbox > 0 ? (
              <span className="text-rose-400 font-bold">{data.deadOutbox} Dead Letter Events</span>
            ) : (
              '0 dead letters'
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Governance Ledger</span>
          </div>
          <div className="text-2xl font-black text-white">{data.metrics.totalOverrides}</div>
          <div className="text-[11px] text-slate-500 mt-1">{data.metrics.totalProposals} proposals recorded</div>
        </div>
      </div>
    </div>
  );
};
