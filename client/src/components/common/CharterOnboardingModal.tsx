import React, { useState, useEffect } from 'react';

export const CHARTER_STORAGE_KEY = 'nflpickem_charter_accepted';

interface CharterOnboardingModalProps {
  forceOpen?: boolean;
  onAccept?: () => void;
}

export const CharterOnboardingModal: React.FC<CharterOnboardingModalProps> = ({
  forceOpen = false,
  onAccept
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const accepted = localStorage.getItem(CHARTER_STORAGE_KEY);
    if (!accepted) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleAccept = () => {
    localStorage.setItem(CHARTER_STORAGE_KEY, 'true');
    setIsOpen(false);
    if (onAccept) onAccept();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-mono">
      <div className="w-full max-w-md bg-slate-950 border-2 border-cyan-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6 animate-scale-in">
        {/* Header Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h2 className="text-xs font-black tracking-widest text-cyan-400 uppercase">
              LEAGUE CHARTER CONTRACT
            </h2>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'w-5 bg-cyan-400' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Slide 1: The Stakes */}
        {currentSlide === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-2xl text-center space-y-1">
              <span className="text-3xl">🏈</span>
              <h3 className="text-sm font-black text-cyan-300 tracking-wider uppercase">
                THE STAKES
              </h3>
              <p className="text-xs font-bold text-white tracking-tight">
                15 Games. 10 Players. No Spread is Safe.
              </p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vegas closing line picking with zero mercy. All picks lock strictly at Sunday 1:00 PM EST. Missed the deadline? Automated Tuesday Favorites Autopilot protects you with proven machine provenance.
            </p>
          </div>
        )}

        {/* Slide 2: The Drop */}
        {currentSlide === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-center space-y-1">
              <span className="text-3xl">📉</span>
              <h3 className="text-sm font-black text-rose-300 tracking-wider uppercase">
                THE DROP &amp; DISCRETE TIERS
              </h3>
              <p className="text-xs font-bold text-white tracking-tight">
                Mandatory Weekly Liquor Settlement
              </p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-900 border border-emerald-500/40 flex justify-between items-center">
                <span className="text-emerald-400 font-bold">1st Place</span>
                <span className="text-white font-black">0.00 SHOTS (SAFE HAVEN)</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-amber-500/40 flex justify-between items-center">
                <span className="text-amber-300 font-bold">2nd – 6th Place</span>
                <span className="text-white font-black">1.00 SHOT</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-rose-500/40 flex justify-between items-center">
                <span className="text-rose-400 font-bold">7th – 9th Place</span>
                <span className="text-white font-black">2.00 SHOTS</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-600/30 border border-rose-400 flex justify-between items-center">
                <span className="text-rose-200 font-black">10th Place (Dead Place)</span>
                <span className="text-white font-black">2.50 SHOTS (THE PIT)</span>
              </div>
            </div>
          </div>
        )}

        {/* Slide 3: The Tribunal */}
        {currentSlide === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-2xl text-center space-y-1">
              <span className="text-3xl">🏛️</span>
              <h3 className="text-sm font-black text-purple-300 tracking-wider uppercase">
                THE SOCIAL TRIBUNAL
              </h3>
              <p className="text-xs font-bold text-white tracking-tight">
                Proof of Deposition or Escalation
              </p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have 48 hours to upload video proof to the Supabase Vault. Spills, short pours, and excuses trigger Contempt of Court (+0.50 shots). 48h Failure to Appear adds a non-negotiable +2.00 shot penalty.
            </p>
          </div>
        )}

        {/* Footer Navigation / Contract Acceptance */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex gap-2">
            {currentSlide > 0 && (
              <button
                type="button"
                onClick={() => setCurrentSlide(currentSlide - 1)}
                className="w-1/3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition"
              >
                ← BACK
              </button>
            )}
            {currentSlide < 2 ? (
              <button
                type="button"
                onClick={() => setCurrentSlide(currentSlide + 1)}
                className={`py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider transition ${
                  currentSlide === 0 ? 'w-full' : 'w-2/3'
                }`}
              >
                NEXT ARTICLE →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAccept}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_0_25px_rgba(244,63,94,0.5)] transition active:scale-98 animate-pulse"
              >
                ⚖️ ACCEPT THE CHARTER &amp; ENTER THE PIT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharterOnboardingModal;
