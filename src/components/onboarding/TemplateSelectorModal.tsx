import React, { useEffect, useId, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Crown,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  entryFee: string;
  maxParticipants: number;
  icon: ReactNode;
  badges: readonly string[];
  highlights: readonly string[];
  accent: "cyan" | "gold" | "emerald";
}

export const CANONICAL_TEMPLATES: readonly Template[] = [
  {
    id: "tpl_standard_pickem",
    name: "Standard NFL Pick 'Em",
    description: "The classic weekly picks experience for a competitive crowd.",
    entryFee: "$25.00",
    maxParticipants: 100,
    icon: <ShieldCheck aria-hidden="true" className="h-6 w-6" />,
    badges: ["Classic", "Fan favorite"],
    highlights: ["Balanced entry fee", "Built for weekly competition"],
    accent: "cyan",
  },
  {
    id: "tpl_high_roller_survivor",
    name: "High Roller Tier",
    description: "A premium league for a smaller, more competitive field.",
    entryFee: "$100.00",
    maxParticipants: 50,
    icon: <Crown aria-hidden="true" className="h-6 w-6" />,
    badges: ["High stakes", "Premium"],
    highlights: ["Premium entry tier", "Limited participant field"],
    accent: "gold",
  },
  {
    id: "tpl_casual_social",
    name: "Casual Social League",
    description: "An easygoing way to bring a bigger group into game day.",
    entryFee: "$5.00",
    maxParticipants: 250,
    icon: <Users aria-hidden="true" className="h-6 w-6" />,
    badges: ["Social", "Group friendly"],
    highlights: ["Accessible entry fee", "Room for a large community"],
    accent: "emerald",
  },
];

const accentStyles = {
  cyan: {
    card: "hover:border-cyan-400/60 hover:shadow-[0_0_32px_rgba(34,211,238,0.12)]",
    icon: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    button: "bg-cyan-400 text-slate-950 hover:bg-cyan-300 focus-visible:ring-cyan-300",
  },
  gold: {
    card: "border-amber-400/35 hover:border-cyan-400/60 hover:shadow-[0_0_32px_rgba(251,191,36,0.15)]",
    icon: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-200 first:border-cyan-400/30 first:bg-cyan-400/10 first:text-cyan-200",
    button: "bg-amber-300 text-slate-950 hover:bg-amber-200 focus-visible:ring-cyan-300",
  },
  emerald: {
    card: "hover:border-emerald-400/60 hover:shadow-[0_0_32px_rgba(52,211,153,0.12)]",
    icon: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    button: "bg-emerald-400 text-slate-950 hover:bg-emerald-300 focus-visible:ring-emerald-300",
  },
} as const;

export default function TemplateSelectorModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplateSelectorModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#050b1b]/85 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative my-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#0b1329] p-5 text-slate-100 shadow-[0_0_70px_rgba(34,211,238,0.12)] sm:p-8 lg:p-10"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              League setup
            </div>
            <h2 id={titleId} className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Choose your league template
            </h2>
            <p id={descriptionId} className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Pick the starting point that fits your group. Review the entry fee and participant limit before continuing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close template selector"
            className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-slate-300 transition hover:border-cyan-400/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="relative grid gap-4 md:grid-cols-3">
          {CANONICAL_TEMPLATES.map((template) => {
            const styles = accentStyles[template.accent];
            return (
              <article
                key={template.id}
                className={`flex h-full flex-col rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-xl shadow-black/10 transition duration-200 sm:p-6 ${styles.card}`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${styles.icon}`}>
                    {template.icon}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {template.badges.map((badge) => (
                      <span key={badge} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles.badge}`}>
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-white">{template.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{template.description}</p>

                <div className="mt-6 grid grid-cols-2 gap-3 border-y border-slate-700/70 py-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <DollarSign aria-hidden="true" className="h-3.5 w-3.5" />
                      Entry fee
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums text-white">{template.entryFee}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users aria-hidden="true" className="h-3.5 w-3.5" />
                      Max participants
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums text-white">{template.maxParticipants}</p>
                  </div>
                </div>

                <ul className="my-5 space-y-2.5">
                  {template.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {highlight}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id)}
                  className={`mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${styles.button}`}
                  aria-label={`Select ${template.name} template`}
                >
                  Select template
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>

        <p className="relative mt-6 text-center text-xs text-slate-500">
          Entry fees and participant limits are shown for each template.
        </p>
      </section>
    </div>
  );
}
