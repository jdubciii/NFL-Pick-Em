import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User as UserIcon, RefreshCw, CheckCircle2, AlertCircle, History, Clock, FileText, Check, Wine } from 'lucide-react';
import { AdminPenaltyModal } from './AdminPenaltyModal';

export interface UserItem {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

export interface AdminGameItem {
  id: string;
  externalGameId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  homeScore: number | null;
  awayScore: number | null;
  userPick: string | null;
  pickId: string | null;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  action: string;
  targetEntityId: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  actor?: {
    email: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const { token, user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [games, setGames] = useState<AdminGameItem[]>([]);
  const [poolId, setPoolId] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [overridingGameId, setOverridingGameId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);

  // 1. Fetch Users on load
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch user directory.');
      const data: UserItem[] = await res.json();
      setUsers(data);
      if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0].id);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error fetching users', type: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  }, [token, selectedUserId]);

  // 2. Fetch User's Picks for the week
  const fetchUserPicks = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoadingPicks(true);
    try {
      const res = await fetch(`/api/admin/picks?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch user pick slate.');
      const data = await res.json();
      setGames(data.games || []);
      setPoolId(data.pool?.id || '');
    } catch (err: any) {
      setToast({ message: err.message || 'Error fetching picks', type: 'error' });
    } finally {
      setLoadingPicks(false);
    }
  }, [token]);

  // 3. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, [fetchUsers, fetchAuditLogs]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserPicks(selectedUserId);
    }
  }, [selectedUserId, fetchUserPicks]);

  // 4. Handle Override Submission
  const handleAdminOverride = async (game: AdminGameItem, targetTeam: string | null) => {
    if (!selectedUserId || !poolId) {
      setToast({ message: 'Missing user or pool identifier.', type: 'error' });
      return;
    }

    setOverridingGameId(game.id);

    try {
      const res = await fetch('/api/admin/picks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          pool_id: poolId,
          game_id: game.id,
          selected_team_id: targetTeam,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Admin override failed.');
      }

      // Optimistically update local state
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, userPick: targetTeam } : g))
      );

      const targetUser = users.find((u) => u.id === selectedUserId);
      const actionText = targetTeam ? `set to ${targetTeam}` : 'cleared';

      setToast({
        message: `Admin Override Successful: Pick ${actionText} for ${targetUser?.email}. Action recorded to Audit Log (ID: ${data.auditLogId?.slice(0, 8)}...).`,
        type: 'success',
      });

      fetchAuditLogs();
      setTimeout(() => setToast(null), 6000);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to execute override.', type: 'error' });
    } finally {
      setOverridingGameId(null);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="p-6 glass-panel rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-950">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black text-amber-400 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Administrative Pick Override Console</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              User Pick Master Control
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Logged in as <strong className="text-amber-300">{currentAdmin?.email}</strong>. Every override executes atomically and writes an immutable entry to the Audit Log.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                showAuditLogs
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{showAuditLogs ? 'Hide Audit Log' : 'View Audit Log'}</span>
            </button>

            <button
              onClick={() => {
                fetchUsers();
                if (selectedUserId) fetchUserPicks(selectedUserId);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPicks ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border shadow-lg animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-sm ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Audit Log Panel */}
      {showAuditLogs && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-bold text-white">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Append-Only Audit Trail (Recent 50 Actions)</span>
            </div>
            <span className="text-xs text-slate-500">{auditLogs.length} Records</span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 italic">No admin overrides logged yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {log.action}
                      </span>
                      <span className="text-slate-300 font-semibold">
                        Actor: {log.actor?.email || log.actorId}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Target Pick: <code className="text-slate-300">{log.targetEntityId}</code> | Old:{' '}
                      <strong className="text-rose-400">{log.oldValue?.selectedTeamId || 'NULL'}</strong> ➔ New:{' '}
                      <strong className="text-emerald-400">{log.newValue?.selectedTeamId || 'NULL'}</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* User Selection Bar */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Target User to Inspect / Override
            </label>
            {loadingUsers ? (
              <span className="text-xs text-slate-500">Loading directory...</span>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 w-full sm:w-80 bg-slate-900 border border-slate-700 text-white text-sm font-semibold rounded-xl px-3.5 py-2 focus:outline-none focus:border-cyan-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {selectedUser && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPenaltyModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm shadow-amber-500/10"
            >
              <Wine className="w-4 h-4 text-amber-400" />
              <span>Adjust Penalties</span>
            </button>

            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
              <span>Target User ID:</span>
              <code className="text-cyan-400 font-mono text-[11px]">{selectedUser.id}</code>
            </div>
          </div>
        )}
      </div>

      {/* Admin Penalty Adjustment Modal */}
      {selectedUser && (
        <AdminPenaltyModal
          isOpen={penaltyModalOpen}
          onClose={() => setPenaltyModalOpen(false)}
          memberId={selectedUser.id}
          memberEmail={selectedUser.email}
          poolId={poolId}
          onPenaltyAdjusted={() => {
            fetchAuditLogs();
          }}
        />
      )}

      {/* User Matchup Slate */}
      {loadingPicks ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs text-slate-400 font-medium">Loading weekly slate for selected user...</span>
        </div>
      ) : games.length === 0 ? (
        <div className="p-12 text-center text-slate-500 glass-panel rounded-2xl">
          No games scheduled for this pool.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game) => {
            const isHomeSelected = game.userPick === game.homeTeamId;
            const isAwaySelected = game.userPick === game.awayTeamId;
            const isOverriding = overridingGameId === game.id;

            return (
              <div
                key={game.id}
                className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                {/* Matchup Header */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-slate-400 font-medium">
                    {new Date(game.kickoffTime).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                    {game.status}
                  </span>
                </div>

                {/* Matchup Scores & Names */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 mb-4 flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-xs text-slate-500 font-bold">AWAY</div>
                    <div className="text-lg font-black text-white">{game.awayTeamId}</div>
                    {game.awayScore !== null && (
                      <div className="text-xs font-bold text-slate-400">{game.awayScore}</div>
                    )}
                  </div>
                  <div className="text-xs font-black text-slate-600 px-2">VS</div>
                  <div className="text-center flex-1">
                    <div className="text-xs text-slate-500 font-bold">HOME</div>
                    <div className="text-lg font-black text-white">{game.homeTeamId}</div>
                    {game.homeScore !== null && (
                      <div className="text-xs font-bold text-slate-400">{game.homeScore}</div>
                    )}
                  </div>
                </div>

                {/* Current Pick Status */}
                <div className="mb-4 text-xs">
                  <span className="text-slate-400">Current Pick: </span>
                  {game.userPick ? (
                    <strong className="text-cyan-400 font-bold">{game.userPick}</strong>
                  ) : (
                    <span className="text-slate-500 italic">None (Omitted)</span>
                  )}
                </div>

                {/* Admin Override Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Admin Override Actions</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Pick Away */}
                    <button
                      onClick={() => handleAdminOverride(game, game.awayTeamId)}
                      disabled={isOverriding}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                        isAwaySelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      } disabled:opacity-50`}
                    >
                      {isAwaySelected && <Check className="w-3.5 h-3.5" />}
                      <span>Pick {game.awayTeamId}</span>
                    </button>

                    {/* Pick Home */}
                    <button
                      onClick={() => handleAdminOverride(game, game.homeTeamId)}
                      disabled={isOverriding}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                        isHomeSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      } disabled:opacity-50`}
                    >
                      {isHomeSelected && <Check className="w-3.5 h-3.5" />}
                      <span>Pick {game.homeTeamId}</span>
                    </button>
                  </div>

                  {/* Clear Pick */}
                  {game.userPick && (
                    <button
                      onClick={() => handleAdminOverride(game, null)}
                      disabled={isOverriding}
                      className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all disabled:opacity-50"
                    >
                      Clear / Invalidate Pick
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
