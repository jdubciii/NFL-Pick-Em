import React, { useState } from 'react';
import LeagueRulesSettingsPanel, { LeagueRuleConfig } from '../components/admin/LeagueRulesSettingsPanel';
import TemplateSelectorModal from '../components/onboarding/TemplateSelectorModal';

export const RulesPage: React.FC = () => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [config, setConfig] = useState<LeagueRuleConfig>({
    penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
    autoLossOnZeroPicks: true,
  });
  const [notification, setNotification] = useState<string | null>(null);

  const handleSaveConfig = async (newConfig: LeagueRuleConfig) => {
    setConfig(newConfig);
    setNotification('Rules successfully updated and active for Main League.');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            ⚙️ League Rules & Slate Configuration
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure dynamic tiebreakers, dead place penalties, and pool template modes.
          </p>
        </div>
        <button
          onClick={() => setSelectorOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg hover:scale-105 transition-transform text-sm"
        >
          Select Pool Template
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          {notification}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <LeagueRulesSettingsPanel
          initialConfig={config}
          tenantId="main_league_tenant"
          poolId="main-league-pool"
          onSaveConfig={handleSaveConfig}
          isFeatureActive={true}
        />
      </div>

      <TemplateSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelectTemplate={(templateId) => {
          setNotification(`Activated template preset: ${templateId}`);
          setSelectorOpen(false);
          setTimeout(() => setNotification(null), 4000);
        }}
      />
    </div>
  );
};
