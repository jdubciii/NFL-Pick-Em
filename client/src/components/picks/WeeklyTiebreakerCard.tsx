import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scopedExpressFetch } from '../../lib/apiClient';
import { Lock, CheckCircle2, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { formatGameKickoff } from '../../utils/dateUtils';

interface WeeklyTiebreakerCardProps {
  week: number;
  poolId?: string;
  hasPicksWithoutTiebreaker?: boolean;
}

export const WeeklyTiebreakerCard: React.FC<WeeklyTiebreakerCardProps> = ({
  week,
  poolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
  hasPicksWithoutTiebreaker = false,
}) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('UNRESOLVED');
  const [designatedGame, setDesignatedGame] = useState<any | null>(null);
  const [kickoffTime, setKickoffTime] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [userPrediction, setUserPrediction] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchTiebreakerInfo = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await scopedExpressFetch(`/api/picks/tiebreaker?pool_id=${poolId}&week=${week}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setDesignatedGame(data.designatedGame);
        setKickoffTime(data.kickoffTime);
        setIsLocked(Boolean(data.isLocked));
        setUserPrediction(data.userPrediction);
        setInputValue(data.userPrediction !== null && data.userPrediction !== undefined ? String(data.userPrediction) : '');
        setSaveStatus(data.userPrediction !== null ? 'saved' : 'idle');
      }
    } catch (err) {
      console.error('Failed to load tiebreaker info:', err);
    } finally {
      setLoading(false);
    }
  }, [poolId, week, token]);

  useEffect(() => {
    fetchTiebreakerInfo();
  }, [fetchTiebreakerInfo]);

  const handleSave = async (valueToSave?: string | null) => {
    if (isLocked) return;

    const val = valueToSave !== undefined ? valueToSave : inputValue;

    // Validation: 0.00 to 999.99 with at most 2 decimal places
    if (val !== null && val.trim() !== '') {
      const trimmed = val.trim();
      const validFormat = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(trimmed);
      const num = Number(trimmed);

      if (!validFormat || isNaN(num) || num < 0 || num > 999.99) {
        setSaveStatus('error');
        setStatusMessage('Enter a valid total score between 0.00 and 999.99 (max 2 decimals).');
        return;
      }
    }

    try {
      setIsSaving(true);
      setSaveStatus('idle');
      setStatusMessage(null);

      const isClear = val === null || val.trim() === '';
      const payload: any = {
        pool_id: poolId,
        week,
        season: 2026,
      };

      if (isClear) {
        payload.clear = true;
      } else {
        payload.prediction = parseFloat(val.trim());
      }

      const res = await scopedExpressFetch('/api/picks/tiebreaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveStatus('error');
        setStatusMessage(data.error || 'Failed to save prediction.');
        return;
      }

      setUserPrediction(data.prediction);
      setInputValue(data.prediction !== null ? String(data.prediction) : '');
      setSaveStatus(data.prediction !== null ? 'saved' : 'idle');
      setStatusMessage(isClear ? 'Prediction cleared.' : 'Prediction saved successfully.');
    } catch (err: any) {
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

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
        <span>Loading Week {week} Tiebreaker...</span>
      </div>
    );
  }

  // Handle bye week or unresolved schedule
  if (status === 'COMMISSIONER_SELECTION_REQUIRED') {
    return (
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-400 mb-1">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Week {week} Tiebreaker — Commissioner Selection Required</span>
        </div>
        <p className="text-xs text-amber-300/80">
          The Detroit Lions have a bye week. The commissioner must designate a weekly matchup before predictions can be submitted.
        </p>
      </div>
    );
  }

  if (status === 'UNRESOLVED' || !designatedGame) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
        <span className="font-bold text-slate-300">WEEK {week} TIEBREAKER: </span>
        <span>Schedule currently unavailable. Tiebreaker predictions are temporarily closed.</span>
      </div>
    );
  }

  const matchupTitle = designatedGame.homeTeamId && designatedGame.awayTeamId
    ? `${designatedGame.awayTeamId} @ ${designatedGame.homeTeamId}`
    : 'Designated Tiebreaker Game';

  const formattedDeadline = kickoffTime
    ? formatGameKickoff(kickoffTime)
    : 'Before Kickoff';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/30 shadow-xl space-y-3">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-black text-xs tracking-wider uppercase">
            WEEK {week} TIEBREAKER
          </span>
          <span className="text-xs font-semibold text-slate-200">
            {matchupTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {isLocked ? (
            <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-800/50">
              <Lock className="w-3 h-3" /> Locked at Kickoff
            </span>
          ) : (
            <span className="text-slate-400">
              Editable until: <strong className="text-slate-200">{formattedDeadline}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Description & Rules */}
      <div className="text-xs text-slate-300 space-y-1">
        <p className="font-medium text-slate-200">
          Combined final points — both teams, including overtime.
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Closest prediction wins equal pick scores. Equal distance favors not exceeding the actual total. Missing prediction loses to any valid prediction.
        </p>
      </div>

      {/* Missing Prediction Warning */}
      {hasPicksWithoutTiebreaker && userPrediction === null && !isLocked && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>You have submitted game picks without a tiebreaker prediction. Submit below to protect your tiebreaker advantage.</span>
        </div>
      )}

      {/* Input & Action Form */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <div className="relative flex-1 max-w-xs">
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
            placeholder="e.g. 48.5"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 focus:outline-none text-slate-100 font-mono text-sm placeholder:text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {inputValue && !isLocked && (
            <button
              onClick={handleClear}
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              title="Clear prediction"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isLocked && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave()}
              disabled={isSaving || isLocked}
              type="button"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-cyan-950/40 flex items-center gap-1.5"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{userPrediction !== null ? 'Update Prediction' : 'Save Prediction'}</span>
            </button>
          </div>
        )}

        {/* Server-Acknowledged State Badge */}
        {saveStatus === 'saved' && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Saved: {userPrediction} pts</span>
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {statusMessage && (
        <p className={`text-xs ${saveStatus === 'error' ? 'text-rose-400 font-medium' : 'text-emerald-400'}`}>
          {statusMessage}
        </p>
      )}
    </div>
  );
};
