import React, { useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronRight, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';

export interface DLQEventItem {
  id: string;
  poolId?: string | null;
  recipientUserId: string;
  type: string;
  status: string;
  attempts: number;
  lastErrorCode?: string | null;
  createdAt: string;
  sentAt?: string | null;
  payload?: any;
}

interface DLQInspectorProps {
  dlqEvents: DLQEventItem[];
  loading?: boolean;
}

export const DLQInspector: React.FC<DLQInspectorProps> = ({ dlqEvents, loading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Dead-Letter Queue (DLQ) Inspector</h3>
            <p className="text-xs text-slate-400">Diagnostic inspection of terminal-state notification failures</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {dlqEvents.length} Failed Events
        </span>
      </div>

      {/* Content */}
      <div className="divide-y divide-slate-800/80">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading DLQ entries...</span>
          </div>
        ) : dlqEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <div className="text-sm font-semibold text-slate-400 mb-1">DLQ is clean</div>
            <p>No terminal or unrecoverable notification errors recorded.</p>
          </div>
        ) : (
          dlqEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <div key={evt.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div
                  onClick={() => toggleExpand(evt.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white uppercase">{evt.type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800/60">
                          {evt.lastErrorCode || 'FAILED_DELIVERY'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {evt.attempts} attempts
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>Recipient: <span className="font-mono text-cyan-400">{evt.recipientUserId}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span>{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-600">ID: {evt.id.substring(0, 8)}...</span>
                  </div>
                </div>

                {/* Expandable Diagnostic JSON */}
                {isExpanded && (
                  <div className="mt-3 pl-7 pr-2 space-y-2 animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold text-slate-400">Diagnostic Event Payload:</div>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48">
                      {JSON.stringify(evt.payload || evt, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
