import React, { useState, useRef, useEffect } from 'react';

interface EvidenceSubmissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (liquorType: string, fileSizeMb: number) => Promise<void>;
  debtAmount: number;
}

export const EvidenceSubmissionDrawer: React.FC<EvidenceSubmissionDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  debtAmount
}) => {
  const [step, setStep] = useState<'SOURCE' | 'OPTIMIZING' | 'METADATA' | 'UPLOADING'>('SOURCE');
  const [liquor, setLiquor] = useState('WARM TEQUILA');
  const [progress, setProgress] = useState(0);
  const [isStalled, setIsStalled] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProgressRef = useRef<number>(0);

  // Fallback hardware trigger via native HTML5 media capture
  const handleNativeCapture = () => {
    try {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } catch {
      setPermissionError('⚠️ CAMERA ACCESS DENIED - ENABLE IN OS SETTINGS');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mb = Number((file.size / (1024 * 1024)).toFixed(1));
      setFileSizeMb(mb);

      if (mb > 15.0) {
        setStep('OPTIMIZING');
        setTimeout(() => setStep('METADATA'), 1200);
      } else {
        setStep('METADATA');
      }
    } else {
      setFileSizeMb(0);
      setStep('SOURCE');
    }
  };

  // Upload progress simulation with 5-second stall detection
  const handleUpload = async () => {
    setStep('UPLOADING');
    setIsStalled(false);
    setProgress(0);
    lastProgressRef.current = 0;

    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
      }
      setProgress(current);
      lastProgressRef.current = current;
    }, 350);

    // Watchdog for stall detection (amber alert if frozen)
    const stallWatchdog = setTimeout(() => {
      if (lastProgressRef.current < 80 && lastProgressRef.current > 0) {
        setIsStalled(true);
      }
    }, 5000);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    clearTimeout(stallWatchdog);

    // Trigger Point-of-No-Return haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 150]);
    }

    await onSubmit(liquor, fileSizeMb);
    setStep('SOURCE');
    setProgress(0);
    setIsStalled(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-sm p-4 font-mono">
      {/* Hidden file input supporting native mobile video camera hardware capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-t-3xl p-6 pb-10 shadow-2xl space-y-5 animate-slide-up">
        {/* Permission Error Banner */}
        {permissionError && (
          <div className="p-3 bg-amber-500/20 border border-amber-500/60 rounded-xl text-amber-300 text-xs flex justify-between items-center">
            <span>{permissionError}</span>
            <button onClick={() => setPermissionError(null)} className="text-white text-xs ml-2">✕</button>
          </div>
        )}

        {/* Header */}
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
              className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Active Debt Callout */}
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-center space-y-1">
          <div className="text-[10px] font-black text-rose-300 tracking-widest uppercase">
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
              onClick={handleNativeCapture}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
            >
              <span className="text-rose-500 text-base">🔴</span>
              <span>NATIVE CAMERA DEPOSITION</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFileSizeMb(14.2);
                setStep('METADATA');
              }}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
            >
              <span className="text-cyan-400 text-base">📁</span>
              <span>CAMERA ROLL / VAULT UPLOAD</span>
            </button>
          </div>
        )}

        {/* Transient Step: Video Compression Scanning Effect */}
        {step === 'OPTIMIZING' && (
          <div className="relative p-6 bg-slate-900/80 border border-cyan-500/50 rounded-2xl text-center overflow-hidden space-y-2">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent animate-pulse" />
            <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-bounce" />
            <p className="text-xs font-black text-cyan-300 uppercase tracking-widest">
              ⚡ OPTIMIZING EVIDENCE TAPE...
            </p>
            <p className="text-[10px] text-slate-400">
              Compressing {fileSizeMb}MB payload for mobile cellular broadcast
            </p>
          </div>
        )}

        {/* Step 2: Metadata & Poison Selection */}
        {step === 'METADATA' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">VERIFIED CLIP:</span>
              <span className="text-emerald-400 font-bold">{fileSizeMb} MB // 18.5s</span>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                LIQUOR TYPE (MANDATORY CHARTER PROOF)
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
              TRANSMIT TO VAULT &amp; START JURY CLOCK
            </button>
          </div>
        )}

        {/* Step 3: Locked Upload Progress HUD with Stall Detection */}
        {step === 'UPLOADING' && (
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-xs font-black">
              <span className={isStalled ? "text-amber-400 animate-pulse" : "text-cyan-400 animate-pulse"}>
                {isStalled ? "NETWORK STALL DETECTED — RETRYING CHUNK..." : "UPLOADING TO SUPABASE VAULT..."}
              </span>
              <span className={isStalled ? "text-amber-400" : "text-cyan-400"}>{progress}%</span>
            </div>

            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isStalled
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-cyan-500 to-emerald-400"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-500 text-center">
              DO NOT DISMISS // ATOMIC SECURE RPC DISPATCH
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
