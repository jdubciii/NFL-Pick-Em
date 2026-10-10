import React, { useState } from 'react';
import { ConfessionalShotCam } from '../components/punishment/ConfessionalShotCam';
import { TribunalCaseFile } from '../components/punishment/TribunalCaseFile';
import {
  createPendingPenalty,
  submitPenaltyEvidence,
  filePenaltyDispute,
  evaluatePenaltyClearance,
  nominatePenaltyVideo,
  PenaltySubmission,
  DisputeInfraction
} from '../services/punishmentFsmService';

export const ConfessionalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RECORD' | 'TRIBUNAL'>('RECORD');
  const [submission, setSubmission] = useState<PenaltySubmission>(
    createPendingPenalty('pool_alpha', 'u10', 'Ben (Dead Place)', 5, 2.50, 'WARM TEQUILA')
  );
  const [ledgerToast, setLedgerToast] = useState<string | null>(null);

  const handleEvidenceSecured = (uri: string) => {
    const updated = submitPenaltyEvidence(submission, uri);
    setSubmission(updated);
    setActiveTab('TRIBUNAL');
  };

  const handleFileDispute = (infraction: DisputeInfraction, justification: string) => {
    const updated = filePenaltyDispute(
      submission,
      'u1',
      'Jack (Monarch)',
      infraction,
      justification
    );
    setSubmission(updated);
  };

  const handleNominate = () => {
    const { updatedSubmission } = nominatePenaltyVideo(submission, 'u1');
    setSubmission(updatedSubmission);
  };

  const handleEvaluateClearance = () => {
    try {
      const { updatedSubmission, ledgerCredit } = evaluatePenaltyClearance(submission);
      setSubmission(updatedSubmission);
      setLedgerToast(`DOUBLE-ENTRY OFFSET RECORDED: ${ledgerCredit.amount} SHOTS`);
    } catch {
      // Window still running or disputes pending
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-md mx-auto font-sans">
      <header className="mb-4 border-b border-slate-800 pb-2 flex items-center justify-between font-mono">
        <div>
          <h1 className="text-lg font-black tracking-wider text-rose-400">
            CONFESSIONAL // TRIBUNAL
          </h1>
          <p className="text-xs text-slate-400">Phase 29: Punishment Fulfillment</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('RECORD')}
            className={`px-2 py-1 rounded text-[11px] font-bold ${
              activeTab === 'RECORD'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            SHOT-CAM
          </button>
          <button
            onClick={() => setActiveTab('TRIBUNAL')}
            className={`px-2 py-1 rounded text-[11px] font-bold ${
              activeTab === 'TRIBUNAL'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            TRIBUNAL
          </button>
        </div>
      </header>

      {ledgerToast && (
        <div className="mb-3 p-2.5 rounded bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-mono text-xs text-center font-bold">
          ✓ {ledgerToast}
        </div>
      )}

      {activeTab === 'RECORD' ? (
        <ConfessionalShotCam
          submission={submission}
          onEvidenceSecured={handleEvidenceSecured}
        />
      ) : (
        <TribunalCaseFile
          submission={submission}
          onFileDispute={handleFileDispute}
          onNominate={handleNominate}
          onEvaluateClearance={handleEvaluateClearance}
        />
      )}
    </div>
  );
};

export default ConfessionalPage;
