import React, { useState, useRef } from 'react';
import {
  buildDeterministicWeeklyRecap,
  RecapCardFormat,
  SettledParticipantSummary,
  DeterministicRecapCardModel,
} from '../../services/weeklyRecapService';
import {
  applyIdempotentReactionMutation,
  ReactionEntry,
  ReactionCode,
  summarizeReactionsForTarget,
  validateCanonicalReactionTarget,
} from '../../services/poolSocialService';

interface WeeklyRecapCardViewProps {
  currentWeek?: number;
  liveParticipants?: SettledParticipantSummary[];
  viewerUserId?: string;
  rivalUserId?: string;
}

const DEMO_PARTICIPANTS: SettledParticipantSummary[] = [
  {
    userId: 'u1',
    displayName: 'jack.w.cone',
    rank: 1,
    points: 11,
    totalGames: 14,
    shotsIncurred: 0,
    tierName: 'SAFE HAVEN',
    tiebreakResolved: true,
  },
  {
    userId: 'u2',
    displayName: 'jcone2',
    rank: 2,
    points: 9,
    totalGames: 14,
    shotsIncurred: 1,
    tierName: 'DANGER ZONE',
    tiebreakResolved: true,
  },
];

export const WeeklyRecapCardView: React.FC<WeeklyRecapCardViewProps> = ({
  currentWeek = 6,
  liveParticipants = [],
  viewerUserId = 'u1',
  rivalUserId = 'u2',
}) => {
  const [format, setFormat] = useState<RecapCardFormat>('LEAGUE_VERDICT');
  const [useDemoFixture, setUseDemoFixture] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportedPngDataUrl, setExportedPngDataUrl] = useState<string | null>(null);
  const [exportedPngInfo, setExportedPngInfo] = useState<{ filename: string; sizeEstimate: string } | null>(null);
  const [reactions, setReactions] = useState<ReactionEntry[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isOfficiallySettled = useDemoFixture ? true : false;
  const participants = useDemoFixture
    ? DEMO_PARTICIPANTS
    : liveParticipants.length > 0
    ? liveParticipants
    : [
        {
          userId: viewerUserId,
          displayName: 'jack.w.cone',
          rank: 1,
          points: 0,
          totalGames: 14,
          shotsIncurred: 0,
          tierName: 'SAFE HAVEN',
          tiebreakResolved: false,
        },
        {
          userId: rivalUserId,
          displayName: 'jcone2',
          rank: 2,
          points: 0,
          totalGames: 14,
          shotsIncurred: 0,
          tierName: 'SAFE HAVEN',
          tiebreakResolved: false,
        },
      ];

  const recap: DeterministicRecapCardModel = buildDeterministicWeeklyRecap({
    format,
    poolName: 'MAIN LEAGUE',
    season: 2026,
    week: useDemoFixture ? 5 : currentWeek,
    isOfficiallySettled,
    settlementRevision: useDemoFixture ? 1 : null,
    settledAtLabel: useDemoFixture ? 'Mon 11:42 PM' : null,
    participants,
    viewerUserId,
    viewerDisplayNameFallback: 'jack.w.cone',
    rivalUserId,
    rivalDisplayNameFallback: 'jcone2',
    decisiveDisagreementLabel: useDemoFixture ? 'Decisive MNF Battleground (BUF @ NYJ)' : null,
    isDemoFixture: useDemoFixture,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Canonical Reaction Target for Settled Recap
  const targetWeek = useDemoFixture ? 5 : currentWeek;
  const recapTarget = {
    poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
    season: 2026,
    week: targetWeek,
    targetKind: 'SETTLED_RECAP',
    entityId: `week-${targetWeek}-verdict`,
    settlementRevision: useDemoFixture ? 1 : null,
  };
  const targetValidation = validateCanonicalReactionTarget(recapTarget);
  const canonicalKey = targetValidation.canonicalKey || '';
  const reactionChips = summarizeReactionsForTarget(reactions, canonicalKey, viewerUserId);

  const handleToggleReaction = (code: ReactionCode) => {
    const result = applyIdempotentReactionMutation({
      existingEntries: reactions,
      target: recapTarget,
      authenticatedActorId: viewerUserId,
      authenticatedActorName: 'jack.w.cone',
      authorizedPoolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
      reactionCode: code,
    });
    if (result.ok) {
      setReactions(result.entries);
    }
  };

  const exportAsPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas Dimensions: 1080 x 640 (High-DPI 16:9 Arena Card)
    canvas.width = 1080;
    canvas.height = 640;

    // Background Arena Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 640);
    bgGrad.addColorStop(0, '#09090b');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 640);

    // Card Outer Accent Border
    ctx.lineWidth = 6;
    ctx.strokeStyle = format === 'LEAGUE_VERDICT' ? '#06b6d4' : '#f59e0b';
    ctx.strokeRect(16, 16, 1048, 608);

    // If Demo Fixture: Burn in top and bottom warning banners directly in pixels
    if (useDemoFixture) {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(16, 16, 1048, 30);
      ctx.fillRect(16, 594, 1048, 30);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEMO — NOT A LEAGUE RECORD', 540, 36);
      ctx.fillText('DEMO — NOT A LEAGUE RECORD', 540, 614);
      ctx.textAlign = 'left';

      // Diagonal Watermark
      ctx.save();
      ctx.translate(540, 320);
      ctx.rotate(-Math.PI / 8);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.font = '900 68px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEMO — NOT A LEAGUE RECORD', 0, 0);
      ctx.restore();
    }

    // Header Stamp Badge
    ctx.fillStyle = format === 'LEAGUE_VERDICT' ? '#083344' : '#451a03';
    ctx.beginPath();
    ctx.roundRect(48, 56, 440, 44, 10);
    ctx.fill();
    ctx.strokeStyle = format === 'LEAGUE_VERDICT' ? '#06b6d4' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = format === 'LEAGUE_VERDICT' ? '#67e8f9' : '#fde68a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`⚡ ${recap.headerStamp}`, 64, 85);

    // Pool & Week Scope Top Right
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${recap.poolTitle} · ${recap.weekLabel}`, 1032, 85);
    ctx.textAlign = 'left';

    // Primary Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(recap.primaryHeadline, 48, 150);

    // Secondary Headline
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(recap.secondaryHeadline, 48, 190);

    // Settlement Basis Pill
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(48, 215, 600, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#a5f3fc';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`🛡️ ${recap.settlementBasisLabel}`, 62, 238);

    // Divider
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 270);
    ctx.lineTo(1032, 270);
    ctx.stroke();

    // Stat Rows
    let y = 320;
    for (const stat of recap.statRows.slice(0, 4)) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(stat.label, 64, y);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value, 1016, y);
      ctx.textAlign = 'left';

      y += 45;
    }

    // Punishment Callout Box
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(48, 490, 984, 60, 12);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`⚖️ ${recap.punishmentCallout}`, 68, 526);

    // Footer Watermark
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(recap.footerWatermark, 48, 580);

    // Capture Data URL for In-App Inspector
    const dataUrl = canvas.toDataURL('image/png');
    setExportedPngDataUrl(dataUrl);

    const filename = useDemoFixture
      ? 'DEMO-not-a-league-record-week-recap.png'
      : `main-league-week-${currentWeek}-verdict.png`;

    const approxBytes = Math.round((dataUrl.length * 3) / 4);
    const sizeStr = `${Math.round(approxBytes / 1024)} KB`;
    setExportedPngInfo({ filename, sizeEstimate: sizeStr });

    // Canvas to Blob & Share / Download
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], filename, { type: 'image/png' });
        const nav = typeof window !== 'undefined' ? (window.navigator as any) : null;

        if (nav && nav.canShare && nav.canShare({ files: [file] })) {
          try {
            await nav.share({
              files: [file],
              title: recap.primaryHeadline,
              text: `${recap.poolTitle} — ${recap.primaryHeadline}`,
            });
            showToast('Recap PNG shared successfully.');
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === 'AbortError') {
              showToast('Share cancelled — PNG remains available below.');
              return;
            }
            // Other errors fall back to download
          }
        }

        // Direct download fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('PNG Recap Exported.');
      }, 'image/png');
    } catch (err) {
      console.error('Failed to export recap PNG:', err);
      showToast('Export failed.');
    }
  };

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono space-y-4 shadow-xl">
      {/* Distinct Top Container: Fixture Controls Outside Exportable Card */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            🧪 FIXTURE CONTROLS (OUTSIDE EXPORTABLE CARD)
          </span>
          <span className="text-[9px] text-slate-500 font-mono">
            {useDemoFixture ? 'DEMO MODE' : 'LIVE MODE'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFormat('LEAGUE_VERDICT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                format === 'LEAGUE_VERDICT'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              THE WEEKLY VERDICT
            </button>
            <button
              type="button"
              onClick={() => setFormat('RIVALRY_RESULT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                format === 'RIVALRY_RESULT'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RIVALRY RESULT
            </button>
          </div>

          <button
            type="button"
            onClick={() => setUseDemoFixture(!useDemoFixture)}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 ${
              useDemoFixture
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>{useDemoFixture ? '🧪 DEMO FIXTURE ACTIVE' : 'LIVE POOL (WEEK 6)'}</span>
          </button>
        </div>

        {useDemoFixture && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[10px]">
            <span className="font-bold">DEMO FIXTURE:</span> Simulates a settled Week 5 slate for PNG export testing while live Week 6 is unsettled.
          </div>
        )}
      </div>

      {/* Rendered Arena Recap Card */}
      <div
        className={`p-5 rounded-2xl border-2 shadow-2xl relative overflow-hidden transition-all ${
          format === 'LEAGUE_VERDICT'
            ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border-cyan-500/60'
            : 'bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 border-amber-500/60'
        }`}
      >
        {/* Mobile-Safe Header Stack */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border self-start ${
              format === 'LEAGUE_VERDICT'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-amber-950 border-amber-500 text-amber-300'
            }`}
          >
            ⚡ {recap.headerStamp}
          </span>
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            {recap.poolTitle} · {recap.weekLabel}
          </span>
        </div>

        {recap.demoWatermarkBanner && (
          <div className="mb-2 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[10px] font-bold uppercase tracking-wider inline-block">
            ⚠️ {recap.demoWatermarkBanner}
          </div>
        )}

        <h3 className="text-base sm:text-lg font-black text-white tracking-tight mb-1">
          {recap.primaryHeadline}
        </h3>
        <p className="text-xs text-cyan-300/90 font-medium mb-3">
          {recap.secondaryHeadline}
        </p>

        <div className="inline-block px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700/80 text-[10px] text-cyan-200 mb-4">
          🛡️ {recap.settlementBasisLabel}
        </div>

        {/* Stats Listing */}
        <div className="space-y-2 mb-4 bg-slate-950/80 rounded-xl p-3 border border-slate-800">
          {recap.statRows.map((row, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-bold">{row.label}</span>
              <span className="text-cyan-400 font-bold">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Punishment Summary Callout */}
        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-300 text-xs font-bold mb-3">
          ⚖️ {recap.punishmentCallout}
        </div>

        <div className="text-[9px] text-slate-500 uppercase tracking-widest text-center border-t border-slate-800/80 pt-2">
          {recap.footerWatermark}
        </div>
      </div>

      {/* Canonical Reaction Strip */}
      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            REACTIONS ON THIS VERDICT
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
            SESSION PREVIEW · SHARED POOL CHAT &amp; REACTIONS SCHEMA QUEUED FOR P41-S2
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {reactionChips.map((chip) => (
            <button
              key={chip.code}
              type="button"
              onClick={() => handleToggleReaction(chip.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border flex items-center gap-1.5 ${
                chip.viewerSelected
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
              {chip.count > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-white">
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Export Button & Hidden High-DPI Canvas */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-500">
          High-DPI 1080×640 Arena PNG Export
        </span>
        <button
          type="button"
          onClick={exportAsPng}
          disabled={!recap.canExportOfficialVerdict}
          className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5 ${
            recap.canExportOfficialVerdict
              ? 'bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <span>📸</span>
          <span>{recap.canExportOfficialVerdict ? 'Export Recap PNG' : 'Locked Until Settled'}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 text-center text-xs font-bold animate-fade-in">
          ✓ {toastMessage}
        </div>
      )}

      {/* In-App Generated PNG Artifact Inspector */}
      {exportedPngDataUrl && (
        <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span>🖼️ GENERATED PNG ARTIFACT INSPECTOR (1080×640 PX)</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {exportedPngInfo?.filename} ({exportedPngInfo?.sizeEstimate})
            </span>
          </div>
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-inner">
            <img src={exportedPngDataUrl} alt="Exported PNG Preview" className="w-full h-auto" />
          </div>
          <div className="text-[10px] text-slate-400 text-center font-mono">
            Artifact rendered at 1080×640px. Inspect burned-in watermark and typography directly on hardware.
          </div>
        </div>
      )}

      {/* Off-screen canvas for high-DPI rasterization */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
