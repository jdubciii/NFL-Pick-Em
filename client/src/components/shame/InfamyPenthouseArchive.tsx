import React, { useState } from 'react';
import type { InfamyArchiveDocket } from '../../services/wallOfShameConsolidationService';

interface InfamyPenthouseArchiveProps {
  dockets: InfamyArchiveDocket[];
}

export const InfamyPenthouseArchive: React.FC<InfamyPenthouseArchiveProps> = ({ dockets }) => {
  const [selectedDocket, setSelectedDocket] = useState<InfamyArchiveDocket | null>(null);

  return (
    <div className="w-full space-y-3 p-3 font-mono">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
          <span>🏛️</span> HALL OF INFAMY // PENTHOUSE ARCHIVE
        </span>
        <span className="text-[9px] text-slate-500">MUSEUM OF SHAME</span>
      </div>

      {/* Masonry / Grid of Historical Infamy Thumbnails */}
      <div className="grid grid-cols-2 gap-2.5">
        {dockets.map((docket) => (
          <div
            key={docket.id}
            onClick={() => setSelectedDocket(docket)}
            className={`cursor-pointer rounded-xl p-3 border-2 flex flex-col justify-between h-36 transition hover:scale-105 ${
              docket.hasGoldBorder
                ? 'bg-slate-900/90 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
                : 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.3)]'
            }`}
          >
            <div className="flex justify-between items-center text-[9px] font-bold">
              <span className="text-slate-400">W{docket.weekNumber}</span>
              {docket.hasGoldBorder ? (
                <span className="text-amber-300">🏆 GOLD</span>
              ) : (
                <span className="text-rose-400 font-black">⚖️ CONTEMPT</span>
              )}
            </div>

            <div className="text-center my-auto">
              <span className="text-2xl">📹</span>
              <p className="text-xs font-black text-white truncate mt-1">{docket.userName}</p>
              <p className="text-[10px] text-amber-300 font-bold">{docket.shotDebt.toFixed(2)} SHOTS</p>
            </div>

            <div className="text-[8px] text-slate-400 truncate uppercase text-center border-t border-slate-800 pt-1">
              {docket.crimeDescription}
            </div>
          </div>
        ))}
      </div>

      {/* Full-Screen Cinematic Modal for Inspected Historical Crime */}
      {selectedDocket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-mono">
          <div className="w-full max-w-sm rounded-2xl bg-slate-950 border-2 border-amber-400 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                MUSEUM DOSSIER #{selectedDocket.id.slice(-6)}
              </span>
              <button
                onClick={() => setSelectedDocket(null)}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="w-full h-40 rounded-xl bg-black border border-slate-800 flex items-center justify-center text-4xl">
              🍸
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-black text-white text-sm">{selectedDocket.userName}</p>
              <p className="text-[11px] text-rose-300">
                CRIME: <strong>{selectedDocket.crimeDescription}</strong>
              </p>
              <p className="text-[11px] text-slate-400">
                RECORDED: {selectedDocket.date} ({selectedDocket.liquorType})
              </p>
            </div>

            {/* Juror Conviction Roll */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] space-y-1">
              <span className="font-bold text-slate-400 uppercase">JUROR CONVICTION ROLL:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedDocket.jurors.map((j, idx) => (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      j.vote === 'UPHOLD'
                        ? 'bg-rose-950 border border-rose-500 text-rose-300'
                        : 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                    }`}
                  >
                    {j.name} ({j.vote === 'UPHOLD' ? 'G' : 'A'})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
