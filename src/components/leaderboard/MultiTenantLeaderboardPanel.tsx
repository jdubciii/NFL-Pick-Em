import React, { useEffect, useState } from "react";
import {
  Activity,
  ChevronDown,
  Clock3,
  Crown,
  Globe2,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  isAnonymized: boolean;
  points: number;
  winRate: string;
  isCurrentTenant: boolean;
  winCount?: number;
}

export interface SweatRadarMatchup {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homePickPct: number;
  awayPickPct: number;
  isSuppressed: boolean;
  suppressionReason?: string;
  kickoffAt?: string;
  cohortSize?: number;
}

export interface MultiTenantLeaderboardPanelProps {
  entries: LeaderboardEntry[];
  sweatMatchups: SweatRadarMatchup[];
  tenantId: string;
  poolId: string;
  isFeatureActive?: boolean;
}

type View = "local" | "global";

export function anonymizedHandle(userId: string): string {
  let hash = 0x811c9dc5;
  for (const character of userId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `AnonUser-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function kickoffLabel(value: string | undefined): string {
  if (!value) return "Kick time unavailable";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Kick time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function isDistributionHidden(matchup: SweatRadarMatchup, _now: number): boolean {
  return (
    matchup.isSuppressed ||
    matchup.cohortSize === undefined ||
    !Number.isFinite(matchup.cohortSize) ||
    matchup.cohortSize < 1 ||
    !Number.isFinite(matchup.homePickPct) ||
    !Number.isFinite(matchup.awayPickPct) ||
    matchup.homePickPct < 0 ||
    matchup.awayPickPct < 0 ||
    matchup.homePickPct > 100 ||
    matchup.awayPickPct > 100
  );
}

export default function MultiTenantLeaderboardPanel({
  entries,
  sweatMatchups,
  tenantId,
  poolId,
  isFeatureActive = false,
}: MultiTenantLeaderboardPanelProps) {
  const [view, setView] = useState<View>("local");
  const [radarOpen, setRadarOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isFeatureActive || !radarOpen) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, [isFeatureActive, radarOpen]);

  const visibleEntries = (view === "local" ? entries.filter((entry) => entry.isCurrentTenant) : entries)
    .slice()
    .sort((a, b) => a.rank - b.rank);

  if (!isFeatureActive) {
    return (
      <section className="rounded-2xl border border-cyan-400/20 bg-[#0b1329] p-6 text-slate-100 shadow-[0_0_36px_rgba(34,211,238,0.07)]">
        <div className="flex items-start gap-4">
          <span className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-cyan-300">
            <LockKeyhole aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
              Feature unavailable
            </span>
            <h2 className="mt-3 text-xl font-bold text-white">Leaderboard & Sweat Radar</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Live rankings and pick distribution will appear when the Phase 22 UI feature is active.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-[#0b1329] p-5 text-slate-100 shadow-[0_0_42px_rgba(34,211,238,0.08)] sm:p-7">
      <header className="flex flex-col justify-between gap-5 border-b border-slate-700/80 pb-6 sm:flex-row sm:items-start">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">
            <Trophy aria-hidden="true" className="h-3.5 w-3.5" /> Gameday standings
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Leaderboard</h2>
          <p className="mt-2 text-sm text-slate-400">Pool rankings and a live view of matchup pressure.</p>
        </div>
        <div role="group" aria-label="Leaderboard view" className="inline-flex self-start rounded-xl border border-slate-700 bg-slate-900 p-1">
          <button
            type="button"
            aria-pressed={view === "local"}
            onClick={() => setView("local")}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${view === "local" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            <Users aria-hidden="true" className="h-4 w-4" /> Local Pool
          </button>
          <button
            type="button"
            aria-pressed={view === "global"}
            onClick={() => setView("global")}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${view === "global" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            <Globe2 aria-hidden="true" className="h-4 w-4" /> Global Pool
          </button>
        </div>
      </header>

      <div className="my-6 grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Active tenant
          </p>
          <p className="mt-1 break-all font-mono text-sm text-cyan-200">{tenantId || "—"}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Pool
          </p>
          <p className="mt-1 break-all font-mono text-sm text-emerald-200">{poolId || "—"}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_4.5rem] gap-2 border-b border-slate-700 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid-cols-[3rem_minmax(0,1fr)_5rem_5rem_5rem] sm:gap-4 sm:px-5">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Wins</span>
          <span className="hidden text-right sm:block">Win rate</span>
          <span className="text-right">Points</span>
        </div>
        {visibleEntries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No rankings available for this view.</p>
        ) : visibleEntries.map((entry) => {
          const anonymous = view === "global" && !entry.isCurrentTenant;
          const handle = anonymous ? anonymizedHandle(entry.userId) : entry.username;
          return (
            <div key={entry.userId} className="grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_4.5rem] items-center gap-2 border-b border-slate-800 px-4 py-4 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_5rem_5rem_5rem] sm:gap-4 sm:px-5">
              <span className={`font-mono text-sm font-bold ${entry.rank === 1 ? "text-amber-300" : "text-slate-300"}`}>#{entry.rank}</span>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${anonymous ? "border-slate-600 bg-slate-800 text-slate-300" : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"}`} aria-hidden="true">
                  {entry.rank === 1 ? <Crown className="h-4 w-4" /> : anonymous ? "?" : (handle.charAt(0).toUpperCase() || "?")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white" title={handle}>{handle}</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${entry.isCurrentTenant ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-slate-600 bg-slate-800 text-slate-400"}`}>
                    {entry.isCurrentTenant ? "Your Tenant" : "Other Tenant"}
                  </span>
                </div>
              </div>
              <span className="text-right font-mono text-sm tabular-nums text-slate-200">{entry.winCount ?? "—"}</span>
              <span className="hidden text-right font-mono text-sm tabular-nums text-slate-300 sm:block">{entry.winRate}</span>
              <span className="text-right font-mono text-sm font-bold tabular-nums text-cyan-200">{entry.points}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-emerald-400/20 bg-slate-900">
        <button
          type="button"
          aria-expanded={radarOpen}
          aria-controls="sweat-radar-content"
          onClick={() => setRadarOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-2.5 text-emerald-300">
              <Radar aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-bold text-white">Sweat Radar</span>
              <span className="mt-1 block text-xs text-slate-400">Live pick concentration across matchups</span>
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${radarOpen ? "rotate-180" : ""}`} />
        </button>
        {radarOpen && (
          <div id="sweat-radar-content" className="grid gap-4 border-t border-slate-700 p-4 md:grid-cols-2 sm:p-5">
            {sweatMatchups.length === 0 ? (
              <p className="text-sm text-slate-400">No matchups available.</p>
            ) : (
              sweatMatchups.map((matchup) => {
                const hidden = isDistributionHidden(matchup, now);
                return (
                  <article key={matchup.gameId} className="rounded-xl border border-slate-700 bg-[#0b1329] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-bold text-white">
                        {matchup.awayTeam} <span className="text-slate-500">at</span> {matchup.homeTeam}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5" /> {kickoffLabel(matchup.kickoffAt)}
                      </span>
                    </div>
                    {hidden ? (
                      <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                        <p className="flex items-start gap-2 text-sm font-semibold text-cyan-200">
                          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> Pick Distribution Hidden (Pre-Kickoff or Cohort &lt; 3)
                        </p>
                        {matchup.suppressionReason && (
                          <p className="mt-2 text-xs text-slate-400">{matchup.suppressionReason}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5">
                        <div className="flex justify-between gap-3 text-xs font-semibold">
                          <span className="text-cyan-200">{matchup.awayTeam} {matchup.awayPickPct}%</span>
                          <span className="text-emerald-200">{matchup.homeTeam} {matchup.homePickPct}%</span>
                        </div>
                        <div
                          role="img"
                          aria-label={`${matchup.awayPickPct}% on ${matchup.awayTeam} versus ${matchup.homePickPct}% on ${matchup.homeTeam}`}
                          className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-700"
                        >
                          <span className="h-full bg-cyan-400" style={{ width: `${matchup.awayPickPct}%` }} />
                          <span className="h-full bg-emerald-400" style={{ width: `${matchup.homePickPct}%` }} />
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <Activity aria-hidden="true" className="h-3.5 w-3.5" /> Live pick distribution
                        </p>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
}
