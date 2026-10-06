import React, { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LockKeyhole,
  Save,
  Settings2,
  ShieldAlert,
  Users,
} from "lucide-react";

export interface LeagueRuleConfig {
  penaltyRuleType: "DEAD_PLACE_OVERRIDE" | "BR4_SPLIT" | "FLAT_PENALTY";
  autoLossOnZeroPicks: boolean;
}

export interface LeagueRulesSettingsPanelProps {
  initialConfig: LeagueRuleConfig;
  tenantId: string;
  poolId: string;
  onSaveConfig: (config: LeagueRuleConfig) => Promise<void>;
  isFeatureActive?: boolean;
}

export const PENALTY_RULES = [
  {
    type: "DEAD_PLACE_OVERRIDE",
    title: "Dead Place Override",
    badge: "Sole last place",
    description:
      "When one player finishes alone in last place, that player pays an absolute $2.50 fine. The fine is never split.",
    icon: ShieldAlert,
    accent: "cyan",
  },
  {
    type: "BR4_SPLIT",
    title: "BR4 Split",
    badge: "Tied last place",
    description:
      "When players tie for last place, the penalty is split among all players tied at the bottom.",
    icon: Users,
    accent: "emerald",
  },
  {
    type: "FLAT_PENALTY",
    title: "Flat Penalty",
    badge: "Fixed amount",
    description:
      "Apply the configured base penalty regardless of how many players are tied for last place.",
    icon: CircleDollarSign,
    accent: "slate",
  },
] as const;

const accentStyles = {
  cyan: {
    selected: "border-cyan-400/70 bg-cyan-400/[0.08] shadow-[0_0_28px_rgba(34,211,238,0.12)]",
    icon: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  },
  emerald: {
    selected: "border-emerald-400/70 bg-emerald-400/[0.08] shadow-[0_0_28px_rgba(52,211,153,0.12)]",
    icon: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  },
  slate: {
    selected: "border-sky-400/70 bg-sky-400/[0.08] shadow-[0_0_28px_rgba(56,189,248,0.12)]",
    icon: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  },
} as const;

export default function LeagueRulesSettingsPanel({
  initialConfig,
  tenantId,
  poolId,
  onSaveConfig,
  isFeatureActive = false,
}: LeagueRulesSettingsPanelProps) {
  const [config, setConfig] = useState<LeagueRuleConfig>(initialConfig);
  const [savedConfig, setSavedConfig] = useState<LeagueRuleConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setConfig(initialConfig);
    setSavedConfig(initialConfig);
    setSaveError(null);
    setShowSuccess(false);
  }, [initialConfig, tenantId, poolId]);

  const isDirty =
    config.penaltyRuleType !== savedConfig.penaltyRuleType ||
    config.autoLossOnZeroPicks !== savedConfig.autoLossOnZeroPicks;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || !isDirty || !tenantId.trim() || !poolId.trim()) return;

    setIsSaving(true);
    setSaveError(null);
    setShowSuccess(false);
    const submittedConfig = { ...config };

    try {
      await onSaveConfig(submittedConfig);
      setSavedConfig(submittedConfig);
      setShowSuccess(true);
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "Could not save the configuration. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isFeatureActive) {
    return (
      <section className="rounded-2xl border border-cyan-400/20 bg-[#0b1329] p-5 text-slate-100 shadow-[0_0_36px_rgba(34,211,238,0.07)] sm:p-7">
        <div className="flex items-start gap-4">
          <span className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-cyan-300">
            <LockKeyhole aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <span className="inline-flex rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
              Feature unavailable
            </span>
            <h2 className="mt-3 text-xl font-bold text-white">Custom league rules</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Rule configuration will be available when the Phase 22 UI feature is active for this console.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-[#0b1329] p-5 text-slate-100 shadow-[0_0_42px_rgba(34,211,238,0.08)] sm:p-7 lg:p-8">
      <div className="flex flex-col gap-5 border-b border-slate-700/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">
            <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
            League rules
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Custom rules configuration</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Choose one penalty rule and decide how zero submitted picks are handled.
          </p>
        </div>
        {showSuccess && !isDirty && (
          <span role="status" className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>

      <div className="my-6 grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Tenant scope
          </p>
          <p className="mt-1 break-all font-mono text-sm text-cyan-200">{tenantId || "—"}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Pool scope
          </p>
          <p className="mt-1 break-all font-mono text-sm text-emerald-200">{poolId || "—"}</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <fieldset disabled={isSaving}>
          <legend className="text-base font-bold text-white">Penalty rule</legend>
          <p className="mt-1 text-sm text-slate-400">Only one rule can be active for this pool.</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {PENALTY_RULES.map((rule) => {
              const selected = config.penaltyRuleType === rule.type;
              const styles = accentStyles[rule.accent];
              const Icon = rule.icon;

              return (
                <label
                  key={rule.type}
                  className={`relative flex cursor-pointer flex-col rounded-xl border p-5 transition duration-200 focus-within:ring-2 focus-within:ring-cyan-300 focus-within:ring-offset-2 focus-within:ring-offset-[#0b1329] ${selected ? styles.selected : "border-slate-700 bg-slate-900 hover:border-slate-500"}`}
                >
                  <input
                    type="radio"
                    name="penaltyRuleType"
                    value={rule.type}
                    checked={selected}
                    onChange={() => {
                      setConfig((current) => ({ ...current, penaltyRuleType: rule.type }));
                      setShowSuccess(false);
                    }}
                    className="sr-only"
                  />
                  <span className="flex items-start justify-between gap-3">
                    <span className={`rounded-lg border p-2.5 ${styles.icon}`}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-500 text-transparent"}`}>
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className={`mt-4 self-start rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
                    {rule.badge}
                  </span>
                  <span className="mt-3 text-base font-bold text-white">{rule.title}</span>
                  <span className="mt-2 text-sm leading-6 text-slate-400">{rule.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span className="flex gap-3">
              <span className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-2.5 text-emerald-300">
                <Clock3 aria-hidden="true" className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-white">Automatic loss on zero picks</span>
                <span className="mt-1 block text-sm leading-6 text-slate-400">
                  If a player submits zero picks before kickoff lock, assign an automatic loss.
                </span>
              </span>
            </span>
            <span className="relative mt-1 inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                role="switch"
                aria-label="Automatic loss on zero picks"
                checked={config.autoLossOnZeroPicks}
                disabled={isSaving}
                onChange={(event) => {
                  setConfig((current) => ({ ...current, autoLossOnZeroPicks: event.target.checked }));
                  setShowSuccess(false);
                }}
                className="peer sr-only"
              />
              <span className="h-7 w-12 rounded-full bg-slate-700 transition peer-checked:bg-emerald-400 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900 peer-disabled:opacity-50" />
              <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>

        {saveError && (
          <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            {saveError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-700/80 pt-6">
          <p className="text-xs leading-5 text-slate-500">
            Configuration applies to the pool shown above.
          </p>
          <button
            type="submit"
            disabled={isSaving || !isDirty || !tenantId.trim() || !poolId.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1329]"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {isSaving ? "Saving…" : "Save Configuration"}
          </button>
        </div>
      </form>
    </section>
  );
}
