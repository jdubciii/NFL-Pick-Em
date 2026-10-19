import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scopedExpressFetch } from '../../lib/apiClient';
import { Lock, CheckCircle2, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { formatGameKickoff } from '../../utils/dateUtils';
import { normalizeTeamIdentity } from '../../services/dependableInfoService';

interface WeeklyTiebreakerCardProps {
  week: number;
  poolId?: string;
  hasPicksWithoutTiebreaker?: boolean;
}

export const WeeklyTiebreakerCard: React.FC<WeeklyTiebreakerCardProps> = ({
  week,
  poolId,
  hasPicksWithoutTiebreaker = false,
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('LOADING');
  const [tiebreakerOffered, setTiebreakerOffered] = useState<boolean>(false);
  const [designatedGame, setDesignatedGame] = useState<any | null>(null);
  const [kickoffTime, setKickoffTime] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [userPrediction, setUserPrediction] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active request tracking to discard stale context responses
  const activeReqRef = useRef<number>(0);

  const fetchTiebreakerInfo = useCallback(async () => {
    if (!token || !poolId) {
      setLoading(false);
      return;
    }

    const currentReqId = ++activeReqRef.current;
    try {
      setLoading(true);
      let res = await scopedExpressFetch(`/api/pools/${poolId}/tiebreaker?week=${week}&season=2026`);
      if (!res.ok && res.status === 404) {
        // Fallback to legacy path for backward compatibility
        res = await scopedExpressFetch(`/api/picks/tiebreaker?pool_id=${poolId}&week=${week}&season=2026`);
      }

      // Discard response if stale context request completed
      if (currentReqId !== activeReqRef.current) return;

      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setTiebreakerOffered(data.tiebreakerOffered === true);
        setDesignatedGame(data.designatedGame);
        setKickoffTime(data.kickoffTime);
        setIsLocked(Boolean(data.isLocked));
        setUserPrediction(data.userPrediction ?? null);
        setInputValue(data.userPrediction !== null && data.userPrediction !== undefined ? String(data.userPrediction) : '');
        setSaveStatus(data.userPrediction !== null ? 'saved' : 'idle');
        setStatusMessage(null);
      } else {
        setStatus('ERROR');
        setIsLocked(true);
        setTiebreakerOffered(false);
        setStatusMessage('Failed to load tiebreaker info.');
      }
    } catch (err) {
      if (currentReqId !== activeReqRef.current) return;
      console.error('Failed to load tiebreaker info:', err);
      setStatus('ERROR');
      setIsLocked(true);
      setTiebreakerOffered(false);
      setStatusMessage('Network error loading tiebreaker.');
    } finally {
      if (currentReqId === activeReqRef.current) {
        setLoading(false);
      }
    }
  }, [poolId, week, token]);

  // Context switch: clear stale pool/week status
  useEffect(() => {
    setStatus('LOADING');
    setTiebreakerOffered(false);
    setIsLocked(true);
    setDesignatedGame(null);
    setKickoffTime(null);
    setUserPrediction(null);
    setInputValue('');
    setSaveStatus('idle');
    setStatusMessage(null);
    fetchTiebreakerInfo();
  }, [fetchTiebreakerInfo]);

  // App resume & visibility listener: refresh state on return
  useEffect(() => {
    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        fetchTiebreakerInfo();
      }
    };
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [fetchTiebreakerInfo]);

  const handleSave = async (valueToSave?: string | null) => {
    if (isLocked || !tiebreakerOffered || !poolId) return;

    const val = valueToSave !== undefined ? valueToSave : inputValue;
    const isExplicitClear = valueToSave === null;

    let numVal: number | null = null;
    if (!isExplicitClear) {
      if (val === null || val === undefined || val.trim() === '') {
        setSaveStatus('error');
        setStatusMessage('Enter a valid prediction (0.00-999.99).');
        return;
      }
      const trimmed = val.trim();
      const validFormat = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(trimmed);
      const parsed = Number(trimmed);

      if (!validFormat || isNaN(parsed) || parsed < 0 || parsed > 999.99 || !isFinite(parsed)) {
        setSaveStatus('error');
        setStatusMessage('Enter 0.00-999.99 (max 2 decimals).');
        return;
      }
      numVal = Math.round(parsed * 100) / 100;
    }

    try {
      setIsSaving(true);
      setSaveStatus('idle');
      setStatusMessage(null);

      const payload: any = {
        pool_id: poolId,
        week,
        season: 2026,
      };

      if (isExplicitClear) {
        payload.clear = true;
      } else {
        payload.prediction = numVal;
      }

      let res = await scopedExpressFetch(`/api/pools/${poolId}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status === 404) {
        // Fallback to legacy path
        res = await scopedExpressFetch('/api/picks/tiebreaker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setSaveStatus('error');
        setStatusMessage(data.error || 'Failed to save prediction.');
        return;
      }

      setUserPrediction(data.prediction ?? null);
      setInputValue(data.prediction !== null && data.prediction !== undefined ? String(data.prediction) : '');
      setSaveStatus(data.prediction !== null ? 'saved' : 'idle');
      setStatusMessage(isExplicitClear ? 'Prediction cleared.' : 'Prediction saved.');
    } catch (err: any) {
      // Failed mutation preserves confirmed state, with Retry
      setSaveStatus('error');
      setStatusMessage('Network error saving prediction.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (isLocked) return;
    setInputValue('');
    handleSave(null);
  };

  // Fail-closed when pool context is absent
  if (!poolId) {
    return (
      <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-mono flex items-center justify-between">
        <span className="font-bold text-slate-300 text-[10px] tracking-wider uppercase">W{week} TIEBREAKER</span>
        <span className="text-[11px] text-slate-500">No active pool selected</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        <span className="text-[11px] font-mono">Loading Week {week} Tiebreaker...</span>
      </div>
    );
  }

  // Defect 1: Authority P41-TIEBREAKER-CONTRACT-2026-10-17-01
  // Week 6 tiebreaker = "Tiebreaker unavailable — entry was not offered."
  const isUnavailable = !tiebreakerOffered || week === 6 || status === 'UNAVAILABLE';

  if (isUnavailable) {
    return (
      <div className="px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs font-mono flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] tracking-wider uppercase shrink-0">
            W{week} TIEBREAKER
          </span>
          <span className="text-[11px] text-slate-400 truncate">
            Tiebreaker unavailable — entry was not offered.
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 shrink-0 ml-2">
          UNOFFERED
        </span>
      </div>
    );
  }

  if (status === 'COMMISSIONER_SELECTION_REQUIRED') {
    return (
      <div className="px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
            W{week} TIEBREAKER
          </span>
          <span className="text-[11px] text-amber-300/80">
            Lions on bye — commissioner designation required.
          </span>
        </div>
      </div>
    );
  }

  if (status === 'UNRESOLVED' || !designatedGame) {
    return (
      <div className="px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-400 text-xs font-mono flex items-center justify-between">
        <span className="font-bold text-slate-300 text-[10px]">W{week} TIEBREAKER</span>
        <span className="text-[11px]">Schedule unavailable · Predictions closed</span>
      </div>
    );
  }

  const rawAway = designatedGame.awayTeamId || '';
  const rawHome = designatedGame.homeTeamId || '';
  const awayCode = normalizeTeamIdentity(rawAway);
  const homeCode = normalizeTeamIdentity(rawHome);
  const matchupTitle = awayCode && homeCode ? `${awayCode} @ ${homeCode}` : 'Designated Game';

  const formattedDeadline = kickoffTime
    ? formatGameKickoff(kickoffTime)
    : 'Kickoff';

  const hasConfirmedPrediction = userPrediction !== null && userPrediction !== undefined;

  return (
    <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/30 shadow-md space-y-2">
      {/* Top Header Row */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold text-[10px] tracking-wider uppercase">
            W{week} TIEBREAKER
          </span>
          <span className="text-xs font-bold text-slate-200">
            {matchupTitle}
          </span>
        </div>
        <div className="text-[10px]">
          {isLocked ? (
            <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          ) : (
            <span className="text-slate-400">
              Lock: <strong className="text-slate-300">{formattedDeadline}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Input & Action Row */}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="relative flex-1 max-w-[140px]">
          <input
            type="number"
            step="0.01"
            min="0"
            max="999.99"
            disabled={isLocked || isSaving}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setSaveStatus('idle');
            }}
            placeholder="Total pts (e.g. 48.5)"
            className="w-full h-8 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none text-slate-100 font-mono text-xs placeholder:text-slate-600 disabled:opacity-60"
          />
        </div>

        {/* Action Controls before kickoff */}
        {!isLocked && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSave()}
              disabled={isSaving || isLocked}
              type="button"
              className="h-8 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold text-[11px] uppercase tracking-wider transition flex items-center gap-1"
            >
              {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              <span>{hasConfirmedPrediction ? 'Update' : 'Save'}</span>
            </button>

            {hasConfirmedPrediction && (
              <button
                onClick={handleClear}
                disabled={isSaving || isLocked}
                type="button"
                className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-50 text-slate-300 font-bold text-[11px] uppercase tracking-wider transition flex items-center gap-1"
                title="Clear tiebreaker prediction"
              >
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}

        {/* Confirmed Value Badge */}
        {hasConfirmedPrediction && (
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>{userPrediction} pts</span>
          </div>
        )}

        {/* Error / Retry / Status feedback */}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-rose-400 truncate">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">{statusMessage || 'Error'}</span>
            <button
              type="button"
              onClick={() => handleSave()}
              className="ml-1 underline text-rose-300 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {saveStatus === 'saved' && statusMessage && (
          <span className="text-[10px] font-mono text-emerald-400 truncate">
            {statusMessage}
          </span>
        )}
      </div>
    </div>
  );
};
