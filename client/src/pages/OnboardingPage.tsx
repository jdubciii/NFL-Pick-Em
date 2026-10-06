import React, { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  FlagTriangleRight,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export interface OnboardingDraftPayload {
  tenantId: string;
  templateId: string;
  poolName: string;
  deadPlaceOverride: boolean;
}

export interface OnboardingPageProps {
  tenantId: string;
  tenantName: string;
  onSubmitDraft: (payload: OnboardingDraftPayload) => void | Promise<void>;
  isFeatureActive?: boolean;
}

type Template = {
  id: string;
  name: string;
  description: string;
  entryFee: string;
  maxParticipants: number;
  badge: string;
  accent: "cyan" | "gold" | "emerald";
};

export const ONBOARDING_TEMPLATES: readonly Template[] = [
  {
    id: "tpl_standard_pickem",
    name: "Standard NFL Pick 'Em",
    description: "The classic weekly picks experience for a competitive crowd.",
    entryFee: "$25.00",
    maxParticipants: 100,
    badge: "Classic",
    accent: "cyan",
  },
  {
    id: "tpl_high_roller_survivor",
    name: "High Roller Tier",
    description: "A premium league for a smaller, more competitive field.",
    entryFee: "$100.00",
    maxParticipants: 50,
    badge: "Premium · Gold / Cyan",
    accent: "gold",
  },
  {
    id: "tpl_casual_social",
    name: "Casual Social League",
    description: "An easygoing way to bring a bigger group into game day.",
    entryFee: "$5.00",
    maxParticipants: 250,
    badge: "Social · Group friendly",
    accent: "emerald",
  },
];

const accent = {
  cyan: {
    selected: "border-cyan-400 bg-cyan-400/10 shadow-[0_0_28px_rgba(34,211,238,0.12)]",
    icon: "bg-cyan-400/10 text-cyan-300",
    badge: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  },
  gold: {
    selected: "border-amber-300 bg-amber-300/10 shadow-[0_0_28px_rgba(251,191,36,0.12)]",
    icon: "bg-amber-300/10 text-amber-300",
    badge: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  },
  emerald: {
    selected: "border-emerald-400 bg-emerald-400/10 shadow-[0_0_28px_rgba(52,211,153,0.12)]",
    icon: "bg-emerald-400/10 text-emerald-300",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  },
} as const;

const steps = ["Choose template", "Pool settings", "Confirm & launch"] as const;

export default function OnboardingPage({
  tenantId,
  tenantName,
  onSubmitDraft,
  isFeatureActive = true,
}: OnboardingPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [poolName, setPoolName] = useState("");
  const [deadPlaceOverride, setDeadPlaceOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isFeatureActive) {
    return (
      <main className="min-h-screen bg-[#0b1329] px-4 py-16 text-center text-slate-100">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <LockKeyhole aria-hidden="true" className="mx-auto h-10 w-10 text-amber-400" />
          <h2 className="mt-4 text-xl font-bold text-white">Feature Flag Disabled</h2>
          <p className="mt-2 text-sm text-slate-400">
            Consumer Onboarding is currently gated behind the PRD_PHASE_22_UI_WIRING circuit breaker.
          </p>
        </div>
      </main>
    );
  }

  const selectedTemplate = ONBOARDING_TEMPLATES.find((template) => template.id === templateId);
  const cleanPoolName = poolName.trim();
  const validSettings = cleanPoolName.length > 0 && tenantId.trim().length > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== 3 || !selectedTemplate || !validSettings || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmitDraft({
        tenantId,
        templateId: selectedTemplate.id,
        poolName: cleanPoolName,
        deadPlaceOverride,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to launch the league. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1329] px-4 py-8 text-slate-100 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-9">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            League onboarding
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Launch your Pick 'Em league</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Choose a starting template, set your pool details, and review everything before launch.
          </p>
        </header>

        <nav aria-label="Onboarding progress" className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
          {steps.map((label, index) => {
            const number = index + 1;
            const active = step === number;
            const complete = step > number;
            return (
              <div
                key={label}
                aria-current={active ? "step" : undefined}
                className={`rounded-xl border p-3 sm:p-4 ${active ? "border-cyan-400/60 bg-cyan-400/10" : complete ? "border-emerald-400/30 bg-emerald-400/5" : "border-slate-800 bg-slate-900/70"}`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-cyan-400 text-slate-950" : complete ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                    {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : number}
                  </span>
                  <span className={`text-xs font-semibold sm:text-sm ${active ? "text-cyan-100" : complete ? "text-emerald-200" : "text-slate-400"}`}>{label}</span>
                </div>
              </div>
            );
          })}
        </nav>

        <form onSubmit={submit} className="rounded-3xl border border-cyan-400/15 bg-slate-900/80 p-5 shadow-[0_0_55px_rgba(34,211,238,0.07)] sm:p-8">
          {step === 1 && (
            <section aria-labelledby="template-heading">
              <h2 id="template-heading" className="text-2xl font-bold text-white">Choose a template</h2>
              <p className="mt-2 text-sm text-slate-400">Select one public template to start your league.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {ONBOARDING_TEMPLATES.map((template) => {
                  const chosen = templateId === template.id;
                  const style = accent[template.accent];
                  const Icon = template.accent === "gold" ? Crown : template.accent === "emerald" ? Users : ShieldCheck;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={chosen}
                      onClick={() => setTemplateId(template.id)}
                      className={`flex h-full flex-col rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${chosen ? style.selected : "border-slate-700 bg-[#0b1329]/70 hover:border-cyan-400/50"}`}
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <span className={`rounded-xl p-3 ${style.icon}`}><Icon aria-hidden="true" className="h-6 w-6" /></span>
                        {chosen && <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-300" />}
                      </div>
                      <span className={`mt-5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}>{template.badge}</span>
                      <span className="mt-4 text-lg font-bold text-white">{template.name}</span>
                      <span className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{template.description}</span>
                      <span className="mt-auto grid w-full grid-cols-2 gap-3 border-t border-slate-700/70 pt-5 text-sm">
                        <span><span className="block text-xs text-slate-400">Entry fee</span><strong className="mt-1 block text-lg text-white">{template.entryFee}</strong></span>
                        <span><span className="block text-xs text-slate-400">Max participants</span><strong className="mt-1 block text-lg text-white">{template.maxParticipants}</strong></span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="settings-heading" className="max-w-3xl">
              <h2 id="settings-heading" className="text-2xl font-bold text-white">Pool settings</h2>
              <p className="mt-2 text-sm text-slate-400">Name your pool and review its tenant scope and rule.</p>
              <div className="mt-7 space-y-6">
                <div>
                  <label htmlFor="pool-name" className="mb-2 block text-sm font-semibold text-slate-200">Pool Name</label>
                  <input
                    id="pool-name"
                    type="text"
                    value={poolName}
                    onChange={(event) => setPoolName(event.target.value)}
                    maxLength={100}
                    required
                    autoComplete="off"
                    placeholder="e.g. Sunday Night Picks"
                    className="w-full rounded-xl border border-slate-700 bg-[#0b1329] px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-[#0b1329]/80 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200"><LockKeyhole aria-hidden="true" className="h-4 w-4" /> Tenant scope preview</div>
                  <p className="mt-3 text-sm text-slate-300">This pool will be created under <strong className="text-white">{tenantName}</strong>.</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">Tenant ID: {tenantId}</p>
                </div>
                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-700 bg-[#0b1329]/80 p-5">
                  <span>
                    <span className="block text-sm font-semibold text-white">DEAD_PLACE_OVERRIDE</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-400">Enable the dead place override rule for this pool.</span>
                  </span>
                  <span className="relative mt-0.5 inline-flex shrink-0 items-center">
                    <input type="checkbox" className="peer sr-only" checked={deadPlaceOverride} onChange={(event) => setDeadPlaceOverride(event.target.checked)} />
                    <span className="h-7 w-12 rounded-full bg-slate-700 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900" />
                    <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </span>
                </label>
              </div>
            </section>
          )}

          {step === 3 && selectedTemplate && (
            <section aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="text-2xl font-bold text-white">Confirm your league</h2>
              <p className="mt-2 text-sm text-slate-400">Review your selections before launching.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-cyan-400/20 bg-[#0b1329]/80 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-200"><FlagTriangleRight aria-hidden="true" className="h-4 w-4" /> League</div>
                  <dl className="space-y-4 text-sm">
                    <div><dt className="text-slate-400">Pool name</dt><dd className="mt-1 break-words font-semibold text-white">{cleanPoolName}</dd></div>
                    <div><dt className="text-slate-400">Template</dt><dd className="mt-1 font-semibold text-white">{selectedTemplate.name}</dd></div>
                    <div className="grid grid-cols-2 gap-4"><div><dt className="text-slate-400">Entry fee</dt><dd className="mt-1 font-semibold text-white">{selectedTemplate.entryFee}</dd></div><div><dt className="text-slate-400">Max participants</dt><dd className="mt-1 font-semibold text-white">{selectedTemplate.maxParticipants}</dd></div></div>
                  </dl>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-[#0b1329]/80 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-200"><LockKeyhole aria-hidden="true" className="h-4 w-4" /> Scope & rules</div>
                  <dl className="space-y-4 text-sm">
                    <div><dt className="text-slate-400">Tenant</dt><dd className="mt-1 font-semibold text-white">{tenantName}</dd><dd className="mt-1 break-all font-mono text-xs text-slate-500">{tenantId}</dd></div>
                    <div><dt className="text-slate-400">DEAD_PLACE_OVERRIDE</dt><dd className={`mt-1 font-semibold ${deadPlaceOverride ? "text-emerald-300" : "text-slate-200"}`}>{deadPlaceOverride ? "Enabled" : "Disabled"}</dd></div>
                  </dl>
                </div>
              </div>
              {submitError && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">{submitError}</p>}
            </section>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-700/70 pt-6">
            {step > 1 ? (
              <button type="button" disabled={isSubmitting} onClick={() => { setSubmitError(null); setStep(step === 3 ? 2 : 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back</button>
            ) : <span />}
            {step < 3 ? (
              <button type="button" disabled={step === 1 ? !selectedTemplate : !validSettings} onClick={() => setStep(step === 1 ? 2 : 3)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">Continue <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
            ) : (
              <button type="submit" disabled={isSubmitting || !validSettings || !selectedTemplate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"><FlagTriangleRight aria-hidden="true" className="h-4 w-4" />{isSubmitting ? "Launching…" : "Launch League"}</button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
