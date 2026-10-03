import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  User,
  HelpCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export interface ProposalItem {
  id: string;
  actorId: string;
  action: string;
  targetEntityId: string;
  oldValue: any;
  newValue: {
    poolId: string;
    type: string;
    data: any;
    reason: string;
    status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
    createdAt: string;
    votedBy?: string;
    votedAt?: string;
    voteDecision?: string;
    executedBy?: string;
    executedAt?: string;
    executionResult?: any;
  };
  timestamp: string;
}

interface ProposalReviewCardProps {
  proposal: ProposalItem;
  onVote: (proposalId: string, decision: 'APPROVE' | 'REJECT') => Promise<void>;
  onExecute: (proposalId: string) => Promise<void>;
}

export const ProposalReviewCard: React.FC<ProposalReviewCardProps> = ({
  proposal,
  onVote,
  onExecute,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const val = proposal.newValue || ({} as any);
  const status = val.status || 'PROPOSED';
  const type = val.type || 'UNKNOWN';
  const data = val.data || {};
  const reason = val.reason || 'No description provided';

  const handleVote = async (decision: 'APPROVE' | 'REJECT') => {
    setActionLoading(decision);
    setFeedback(null);
    try {
      await onVote(proposal.id, decision);
      setFeedback({ type: 'success', message: `Proposal ${decision.toLowerCase()}d successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Vote failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async () => {
    setActionLoading('execute');
    setFeedback(null);
    try {
      await onExecute(proposal.id);
      setFeedback({ type: 'success', message: 'Proposal executed and state committed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Execution failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'EXECUTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            EXECUTED
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            REJECTED
          </span>
        );
      case 'PROPOSED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            PENDING REVIEW
          </span>
        );
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md space-y-4">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {type} Override Proposal
              </span>
              {getStatusBadge()}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{new Date(val.createdAt || proposal.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[140px]">
          ID: {proposal.id.substring(0, 8)}...
        </div>
      </div>

      {/* Rationale & Target Details */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2">
        <div className="text-xs font-medium text-slate-300">
          <span className="text-slate-500 font-semibold mr-1.5">Reason:</span>
          {reason}
        </div>

        {/* Data summary */}
        <div className="text-[11px] text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/40">
          <div>
            <span className="text-slate-500 font-semibold">Target Entity / User: </span>
            <span className="font-mono text-cyan-400">
              {data.userId || proposal.targetEntityId}
            </span>
          </div>
          {data.gameId && (
            <div>
              <span className="text-slate-500 font-semibold">Game ID: </span>
              <span className="font-mono text-slate-300">{data.gameId}</span>
            </div>
          )}
          {data.selectedTeamId && (
            <div>
              <span className="text-slate-500 font-semibold">Selected Pick: </span>
              <span className="font-bold text-emerald-400">{data.selectedTeamId}</span>
            </div>
          )}
          {(data.delta !== undefined || data.points !== undefined) && (
            <div>
              <span className="text-slate-500 font-semibold">Adjustment: </span>
              <span className="font-bold text-amber-400">
                {data.delta ?? data.points} {type === 'PENALTY' ? 'Shots' : 'Pts'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Interactive Action Bar */}
      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/60">
        {status === 'PROPOSED' && (
          <>
            <button
              onClick={() => handleVote('REJECT')}
              disabled={!!actionLoading}
              className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg border border-rose-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{actionLoading === 'REJECT' ? 'Voting...' : 'Reject'}</span>
            </button>

            <button
              onClick={() => handleVote('APPROVE')}
              disabled={!!actionLoading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm shadow-cyan-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{actionLoading === 'APPROVE' ? 'Voting...' : 'Approve'}</span>
            </button>
          </>
        )}

        {status === 'APPROVED' && (
          <button
            onClick={handleExecute}
            disabled={!!actionLoading}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90 rounded-lg shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{actionLoading === 'execute' ? 'Executing...' : 'Execute Proposal'}</span>
          </button>
        )}

        {status === 'EXECUTED' && (
          <div className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>State committed to ledger</span>
          </div>
        )}
      </div>
    </div>
  );
};
