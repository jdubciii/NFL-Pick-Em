import React, { useState } from 'react';
import type { DisputeInfraction } from '../../services/punishmentFsmService';

interface DisputeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitDispute: (infraction: DisputeInfraction, justification: string) => void;
}

const PREDEFINED_INFRACTIONS: Array<{ label: string; value: DisputeInfraction }> = [
  { label: 'INCOMPLETE POUR', value: 'INCOMPLETE_POUR' },
  { label: 'SPILLED LIQUOR', value: 'SPILLED_LIQUOR' },
  { label: 'CHASER USED PREMATURELY', value: 'CHASER_USED_PREMATURELY' },
  { label: 'NOT WARM TEQUILA', value: 'NOT_WARM_TEQUILA' },
];

export const DisputeDrawer: React.FC<DisputeDrawerProps> = ({
  isOpen,
  onClose,
  onSubmitDispute
}) => {
  const [selectedInfraction, setSelectedInfraction] = useState<DisputeInfraction>('INCOMPLETE_POUR');
  const [justification, setJustification] = useState<string>('');

  if (!isOpen) return null;

  const isValid = justification.trim().length >= 50;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmitDispute(selectedInfraction, justification.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl p-4 font-mono space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
            FILE LEAGUE DISPUTE (OFFICIAL DOCKET)
          </span>
          <button
            onClick={onClose}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
          >
            CANCEL
          </button>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
            Select Infraction Category
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PREDEFINED_INFRACTIONS.map((inf) => (
              <button
                key={inf.value}
                onClick={() => setSelectedInfraction(inf.value)}
                className={`p-2 rounded-lg text-[10px] font-bold text-center border transition ${
                  selectedInfraction === inf.value
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                [ {inf.label} ]
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Legal Justification
            </label>
            <span
              className={`text-[10px] font-bold ${
                isValid ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {justification.trim().length}/50 chars min
            </span>
          </div>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            placeholder="State factual video timestamp and infraction specifics..."
            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-sans"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-2.5 rounded-xl font-mono font-black text-xs tracking-wider uppercase transition ${
            isValid
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          [ TRANSMIT OFFICIAL DISPUTE ]
        </button>
      </div>
    </div>
  );
};
