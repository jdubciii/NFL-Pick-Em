import React, { useState } from 'react';

interface EvidenceSubmissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (liquorType: string) => Promise<void>;
  debtAmount: number;
}

export const EvidenceSubmissionDrawer: React.FC<EvidenceSubmissionDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  debtAmount
}) => {
  const [step, setStep] = useState<'SOURCE' | 'METADATA' | 'UPLOADING'>('SOURCE');
  const [liquor, setLiquor] = useState('WARM TEQUILA');
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleSelectSource = () => setStep('METADATA');

  const handleUpload = async () => {
    setStep('UPLOADING');
    for (let i = 0; i <= 100; i += 20) {
      setProgress(i);
      await new Promise((r) => setTimeout(r, 150));
    }
    await onSubmit(liquor);
    setStep('SOURCE');
    setProgress(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-t-3xl p-6 shadow-2xl space-y-5 animate-slide-up">
        {/* Drawer Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <h2 className="text-sm font-black tracking-wider text-white uppercase">
              DEPOSITION EVIDENCE SUBMISSION
            </h2>
          </div>
          {step !== 'UPLOADING' && (
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Active Debt Callout */}
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-center space-y-1">
          <div className="text-[10px] font-black text-rose-400 tracking-widest uppercase">
            ACTIVE OUTSTANDING DEBT
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {debtAmount.toFixed(2)} SHOTS
          </div>
        </div>

        {/* Step 1: Capture Source Selection */}
        {step === 'SOURCE' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSelectSource}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
            >
              <span className="text-rose-500 text-base">🔴</span>
              <span>NATIVE CAMERA DEPOSITION</span>
            </button>
            <button
              type="button"
              onClick={handleSelectSource}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
            >
              <span className="text-cyan-400 text-base">📁</span>
              <span>CAMERA ROLL / VAULT UPLOAD</span>
            </button>
          </div>
        )}

        {/* Step 2: Deposition Metadata & Poison Tag */}
        {step === 'METADATA' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">SELECTED CLIP:</span>
              <span className="text-emerald-400 font-bold">14.2 MB // 18.5s (VERIFIED)</span>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                LIQUOR TYPE (MANDATORY VERIFICATION)
              </label>
              <select
                value={liquor}
                onChange={(e) => setLiquor(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-3.5 rounded-xl font-mono text-xs focus:border-cyan-400 outline-none"
              >
                <option value="WARM TEQUILA">WARM TEQUILA (DEFAULT CHARTER)</option>
                <option value="MALÖRT">JEPSON'S MALÖRT (HARDCORE)</option>
                <option value="SMIRNOFF ICE">SMIRNOFF ICE (ICED PENALTY)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              className="w-full py-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] transition active:scale-98"
            >
              SIGN &amp; TRANSMIT TO VAULT
            </button>
          </div>
        )}

        {/* Step 3: Locked Progress HUD */}
        {step === 'UPLOADING' && (
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-xs font-black text-cyan-400">
              <span className="animate-pulse">TRANSMITTING TO SUPABASE VAULT...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              DO NOT DISMISS // RLS ENCRYPTING OBJECT
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
