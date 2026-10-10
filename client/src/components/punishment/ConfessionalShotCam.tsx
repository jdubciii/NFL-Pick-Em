import React, { useState, useEffect } from 'react';
import type { PenaltySubmission } from '../../services/punishmentFsmService';

interface ConfessionalShotCamProps {
  submission: PenaltySubmission;
  onEvidenceSecured: (videoUri: string) => void;
}

export const ConfessionalShotCam: React.FC<ConfessionalShotCamProps> = ({
  submission,
  onEvidenceSecured
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSecured, setIsSecured] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTimecode = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:00`;
  };

  const handleStopAndUpload = () => {
    setIsRecording(false);
    setIsUploading(true);

    let current = 0;
    const uploadTimer = setInterval(() => {
      current += 20;
      setUploadProgress(current);
      if (current >= 100) {
        clearInterval(uploadTimer);
        setIsUploading(false);
        setIsSecured(true);
        onEvidenceSecured(`supabase://vault/punishments/${submission.id}.mp4`);
      }
    }, 400);
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl bg-black border border-slate-800 overflow-hidden font-mono flex flex-col justify-between p-4 shadow-2xl">
      {/* Viewfinder Background Emulation */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-none" />

      {/* Top HUD: Timecode & Recording Status */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'
            }`}
          />
          <span className="text-xs font-black tracking-widest text-slate-200 uppercase">
            {isRecording ? 'REC' : 'STANDBY'}
          </span>
        </div>
        <div className="text-xs font-black text-rose-400 tracking-widest">
          {formatTimecode(secondsElapsed)}
        </div>
      </div>

      {/* Center Reticle & Stark Debt Glass Banner */}
      <div className="relative z-10 my-auto text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full border border-dashed border-slate-600/60 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
        </div>
        <div className="inline-block px-4 py-2 rounded-lg bg-rose-950/80 border border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
          <p className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
            LEGAL PENALTY OBLIGATION
          </p>
          <p className="text-sm font-black text-white tracking-widest">
            DEBT: {submission.shotDebt.toFixed(2)} SHOTS ({submission.liquorType})
          </p>
        </div>
      </div>

      {/* Bottom HUD: Upload Progress & Tactile Trigger Controls */}
      <div className="relative z-10 space-y-3">
        {isUploading && (
          <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-lg border border-cyan-500/40">
            <div className="flex justify-between text-[11px] font-bold text-cyan-300">
              <span>UPLOADING TO VAULT...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {isSecured ? (
          <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-center text-xs font-black text-emerald-300 tracking-wider">
            ✓ EVIDENCE SECURED // DOCKET SUBMITTED
          </div>
        ) : !isRecording ? (
          <button
            onClick={() => setIsRecording(true)}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs uppercase tracking-widest transition shadow-lg shadow-rose-950"
          >
            [ INITIATE SHOT-CAM RECORDING ]
          </button>
        ) : (
          <button
            onClick={handleStopAndUpload}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-black text-xs uppercase tracking-widest transition shadow-lg shadow-amber-950"
          >
            [ FINISH RECORDING & SECURE EVIDENCE ]
          </button>
        )}
      </div>
    </div>
  );
};
