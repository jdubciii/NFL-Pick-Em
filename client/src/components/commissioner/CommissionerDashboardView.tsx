import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  FileCheck2,
  Sliders,
  Activity,
  AlertOctagon,
  RefreshCw,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { PoolHealthWidget, type PoolOpsStatusData } from './PoolHealthWidget';
import { ProposalReviewCard, type ProposalItem } from './ProposalReviewCard';
import { ManualOverridePanel } from './ManualOverridePanel';

export const CommissionerDashboardView: React.FC = () => {
  const { pool_id: poolIdParam } = useParams<{ pool_id: string }>();
  const poolId = poolIdParam || '';
  const { token, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'proposals' | 'overrides' | 'health'>('proposals');
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<PoolOpsStatusData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!token || !poolId) return;
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      // 1. Fetch pool health status
      const healthRes = await fetch(`/api/pools/${poolId}/ops/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (healthRes.status === 403) {
        setErrorStatus(403);
        setErrorMessage('Forbidden. You do not hold pool commissioner privileges for this pool.');
        return;
      }
      if (healthRes.status === 404) {
        setErrorStatus(404);
        setErrorMessage('Pool not found.');
        return;
      }

      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealthData(hData);
      }

      // 2. Fetch proposals
      const proposalsRes = await fetch(`/api/pools/${poolId}/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (proposalsRes.ok) {
        const pData = await proposalsRes.json();
        setProposals(pData.proposals || []);
      }

      // 3. Fetch overrides
      const overridesRes = await fetch(`/api/pools/${poolId}/overrides`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (overridesRes.ok) {
        const oData = await overridesRes.json();
        setOverrides(oData.overrides || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error fetching dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token, poolId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleVote = async (proposalId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!token) return;
    const res = await fetch(`/api/pools/${poolId}/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ decision }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.details || 'Vote failed');
    }

    await fetchDashboardData();
  };

  const handleExecute = async (proposalId: string) => {
    if (!token) return;
    const res = await fetch(`/api/pools/${poolId}/proposals/${proposalId}/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.details || 'Execution failed');
    }

    await fetchDashboardData();
  };

  if (errorStatus === 403) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="p-8 rounded-3xl bg-rose-950/20 border border-rose-800/40 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">403 Forbidden: Tier Isolation Guard</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {errorMessage || 'Under Decision #20, pool management routes require authoritative commissioner permissions.'}
          </p>
          <div className="pt-4">
            <Link
              to="/picks"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Picks</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Commissioner Governance Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {healthData?.poolName || 'Pool Dashboard'}
          </h1>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Sync State</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('proposals')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'proposals'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Stat Proposals ({proposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overrides')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overrides'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Manual Overrides ({overrides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'health'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Pool Health & Ops</span>
        </button>
      </div>

      {/* Tab 1: Proposals */}
      {activeTab === 'proposals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Stat Correction & Outcome Proposals</h2>
              <p className="text-xs text-slate-400">Review, vote, and atomically execute stat corrections.</p>
            </div>
          </div>

          {proposals.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-500 space-y-2">
              <FileCheck2 className="w-8 h-8 mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-slate-400">No proposals pending review</div>
              <p className="text-xs max-w-sm mx-auto">
                Stat correction proposals from provider updates or commissioner triggers will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {proposals.map((p) => (
                <ProposalReviewCard
                  key={p.id}
                  proposal={p}
                  onVote={handleVote}
                  onExecute={handleExecute}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Overrides */}
      {activeTab === 'overrides' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white">Override Audit History</h2>
            {overrides.length === 0 ? (
              <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
                No manual overrides recorded for this pool.
              </div>
            ) : (
              <div className="space-y-3">
                {overrides.map((ov) => (
                  <div
                    key={ov.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-400 uppercase">{ov.action}</span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(ov.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-500 font-semibold">Reason: </span>
                      {ov.newValue?.reason || 'Direct commissioner intervention'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <ManualOverridePanel
              poolId={poolId}
              onOverrideApplied={fetchDashboardData}
            />
          </div>
        </div>
      )}

      {/* Tab 3: Pool Health */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <PoolHealthWidget
            data={healthData}
            loading={loading}
            onRefresh={fetchDashboardData}
          />
        </div>
      )}
    </div>
  );
};
