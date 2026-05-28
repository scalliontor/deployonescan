"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Tour } from "@/lib/types";
import clsx from "clsx";

type Props = { tour: Tour };

export function ViewerOverlay({ tour }: Props) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith("/embed/");

  const [showFloorPlan, setShowFloorPlan] = useState(false); // start hidden — cleaner first impression
  const [showHotspots, setShowHotspots] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [showLead, setShowLead] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [chromeMinimized, setChromeMinimized] = useState(false);

  const handleViewerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMeasurePoints((pts) => (pts.length >= 2 ? [{ x, y }] : [...pts, { x, y }]));
  };

  const distanceFt =
    measurePoints.length === 2
      ? Math.round(
          Math.hypot(
            (measurePoints[0].x - measurePoints[1].x) * 25,
            (measurePoints[0].y - measurePoints[1].y) * 18
          ) * 10
        ) / 10
      : null;

  return (
    <>
      {/* Click-capture layer for measure tool */}
      <div
        className={clsx(
          "absolute inset-0 z-10",
          measureMode ? "cursor-crosshair" : "pointer-events-none"
        )}
        onClick={handleViewerClick}
      />

      {/* Brand bar (top-left) */}
      <div
        className={clsx(
          "pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-ink-950/75 px-2.5 py-2 backdrop-blur-xl transition md:left-4 md:top-4 md:gap-3 md:px-3",
          chromeMinimized && "opacity-30 hover:opacity-100"
        )}
      >
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-ink-950 md:h-9 md:w-9 md:text-sm"
          style={{ background: tour.agent.avatarColor }}
        >
          {tour.agent.name
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="text-sm font-medium text-white">{tour.agent.name}</div>
          <div className="text-[11px] text-white/55">{tour.agent.brokerage}</div>
        </div>
      </div>

      {/* Listing card (top-right) */}
      <div
        className={clsx(
          "pointer-events-auto absolute right-3 top-3 z-20 max-w-[14rem] rounded-2xl border border-white/10 bg-ink-950/75 px-3 py-2 backdrop-blur-xl transition md:right-4 md:top-4 md:max-w-sm md:px-3.5 md:py-2.5",
          chromeMinimized && "opacity-30 hover:opacity-100"
        )}
      >
        <div className="truncate text-xs font-semibold text-white md:text-sm">{tour.title}</div>
        {tour.address && (
          <div className="hidden truncate text-[11px] text-white/55 sm:block">{tour.address}</div>
        )}
        <div className="mt-1.5 flex gap-1.5 text-[10px] text-white/65 md:mt-2 md:gap-2">
          <span className="chip py-0.5 text-[10px]">👁 {tour.views.toLocaleString()}</span>
          <span className="chip py-0.5 text-[10px]">🎯 {tour.leads}</span>
        </div>
      </div>

      {/* Hotspots */}
      {showHotspots &&
        tour.hotspots.map((h) => (
          <div
            key={h.id}
            className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
          >
            <button className="group relative">
              <span
                className={clsx(
                  "block h-3 w-3 rounded-full ring-4 ring-white/30 transition group-hover:scale-125",
                  h.kind === "room" ? "bg-accent-500" : "bg-warm-500"
                )}
              />
              <span className="absolute left-5 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink-950/95 px-2.5 py-1 text-xs text-white shadow-lg ring-1 ring-white/10 group-hover:block">
                {h.label}
              </span>
            </button>
          </div>
        ))}

      {/* Measure points + label */}
      {measurePoints.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warm-500 ring-4 ring-warm-500/30"
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        />
      ))}
      {distanceFt !== null && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full bg-warm-500/95 px-3 py-1 text-sm font-medium text-ink-950 shadow-lg backdrop-blur md:top-20">
          ≈ {distanceFt} ft
        </div>
      )}

      {/* Bottom toolbar */}
      <div
        className={clsx(
          "pointer-events-auto absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-ink-950/85 p-1.5 shadow-2xl backdrop-blur-xl transition md:bottom-4",
          chromeMinimized && "opacity-40 hover:opacity-100"
        )}
      >
        <ToolbarButton
          active={showHotspots}
          onClick={() => setShowHotspots((v) => !v)}
          icon="📍"
          label="Hotspots"
        />
        <ToolbarButton
          active={showFloorPlan}
          onClick={() => setShowFloorPlan((v) => !v)}
          icon="🗺️"
          label="Floor plan"
        />
        <ToolbarButton
          active={measureMode}
          onClick={() => {
            setMeasureMode((v) => !v);
            setMeasurePoints([]);
          }}
          icon="📏"
          label="Measure"
        />
        <div className="mx-1 h-6 w-px bg-white/10" />
        <ToolbarButton onClick={() => setShowShare(true)} icon="🔗" label="Share" />
        <button
          onClick={() => setShowLead(true)}
          className="ml-1 rounded-full bg-accent-500 px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-accent-400 md:px-4 md:text-sm"
        >
          Contact agent
        </button>
      </div>

      {/* Minimize toggle */}
      <button
        onClick={() => setChromeMinimized((v) => !v)}
        className={clsx(
          "pointer-events-auto absolute bottom-3 right-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-ink-950/85 text-sm text-white/65 backdrop-blur-xl transition hover:text-white md:bottom-4 md:right-4",
          chromeMinimized && "opacity-40 hover:opacity-100"
        )}
        title={chromeMinimized ? "Show controls" : "Hide controls"}
      >
        {chromeMinimized ? "👁" : "⛶"}
      </button>

      {/* Floor plan minimap */}
      {showFloorPlan && (
        <div className="pointer-events-auto absolute bottom-20 right-3 z-20 w-64 rounded-2xl border border-white/10 bg-ink-950/90 p-3 backdrop-blur-xl md:right-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Floor plan
            </div>
            <button
              onClick={() => setShowFloorPlan(false)}
              className="text-xs text-white/45 hover:text-white"
            >
              ✕
            </button>
          </div>
          <FloorPlanSvg rooms={tour.rooms} active={activeRoom} onSelect={setActiveRoom} />
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-white/70">
            {tour.rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRoom(r.id)}
                className={clsx(
                  "rounded px-2 py-1 text-left transition",
                  activeRoom === r.id
                    ? "bg-accent-500/20 text-white"
                    : "hover:bg-white/5"
                )}
              >
                <div className="font-medium">{r.name}</div>
                {r.sqft && <div className="text-white/45">{r.sqft} sqft</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watermark in embed mode */}
      {isEmbed && (
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="pointer-events-auto absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 text-[10px] text-white/60 backdrop-blur hover:bg-ink-950/90 hover:text-white md:bottom-4 md:left-4"
        >
          <span className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-accent-500 text-[8px] text-ink-950">
            O
          </span>
          Powered by Onescan
        </a>
      )}

      {/* Share modal */}
      {showShare && (
        <Modal onClose={() => setShowShare(false)} title="Share this tour">
          <ShareContent tourId={tour.id} />
        </Modal>
      )}

      {/* Lead capture modal */}
      {showLead && (
        <Modal onClose={() => setShowLead(false)} title={`Contact ${tour.agent.name}`}>
          <LeadCaptureForm tour={tour} onDone={() => setShowLead(false)} />
        </Modal>
      )}
    </>
  );
}

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition md:px-3",
        active
          ? "bg-white/10 text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
      title={label}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function FloorPlanSvg({
  rooms,
  active,
  onSelect,
}: {
  rooms: Array<{ id: string; name: string; sqft?: number }>;
  active: string | null;
  onSelect: (id: string) => void;
}) {
  const layout: Record<string, { x: number; y: number; w: number; h: number }> = {
    living: { x: 4, y: 4, w: 60, h: 50 },
    kitchen: { x: 68, y: 4, w: 38, h: 30 },
    master: { x: 68, y: 38, w: 38, h: 36 },
    bath: { x: 38, y: 60, w: 26, h: 18 },
  };
  return (
    <svg viewBox="0 0 110 82" className="h-32 w-full">
      {rooms.map((r) => {
        const l = layout[r.id];
        if (!l) return null;
        return (
          <g key={r.id} onClick={() => onSelect(r.id)} className="cursor-pointer">
            <rect
              x={l.x}
              y={l.y}
              width={l.w}
              height={l.h}
              rx={1.5}
              fill={active === r.id ? "rgba(62,226,165,0.35)" : "rgba(255,255,255,0.06)"}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={0.4}
            />
            <text
              x={l.x + l.w / 2}
              y={l.y + l.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white/80"
              fontSize="3"
            >
              {r.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-white">{title}</div>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ShareContent({ tourId }: { tourId: string }) {
  const tourUrl =
    typeof window !== "undefined" ? `${window.location.origin}/tour/${tourId}` : `/tour/${tourId}`;
  const embedUrl =
    typeof window !== "undefined" ? `${window.location.origin}/embed/${tourId}` : `/embed/${tourId}`;
  const embed = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allowfullscreen allow="fullscreen; xr-spatial-tracking"></iframe>`;
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  const copy = async (s: string, k: "link" | "embed") => {
    await navigator.clipboard.writeText(s);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="mb-1 text-xs uppercase tracking-wide text-white/55">Shareable link</div>
        <div className="flex gap-2">
          <input
            readOnly
            value={tourUrl}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-white/90"
          />
          <button onClick={() => copy(tourUrl, "link")} className="btn-ghost shrink-0 px-3 py-2 text-xs">
            {copied === "link" ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div>
        <div className="mb-1 text-xs uppercase tracking-wide text-white/55">
          Embed on MLS / your site
        </div>
        <textarea
          readOnly
          value={embed}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 font-mono text-xs text-white/90"
        />
        <button onClick={() => copy(embed, "embed")} className="btn-ghost mt-2 px-3 py-2 text-xs">
          {copied === "embed" ? "✓ Copied" : "Copy embed code"}
        </button>
      </div>
      <div className="rounded-lg bg-accent-500/10 p-3 text-xs text-accent-400">
        Works on Zillow, Realtor.com, your brokerage site, social media, and email signatures.
      </div>
    </div>
  );
}

function LeadCaptureForm({ tour, onDone }: { tour: Tour; onDone: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return submitted ? (
    <div className="space-y-3 text-sm text-white/80">
      <div className="rounded-lg bg-accent-500/10 p-4 text-accent-400">
        ✓ Sent. {tour.agent.name} will reach out shortly.
      </div>
      <button onClick={onDone} className="btn-ghost w-full">
        Close
      </button>
    </div>
  ) : (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await fetch(`/api/tours/${tour.id}/lead`, {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(fd)),
          headers: { "Content-Type": "application/json" },
        });
        setSubmitted(true);
      }}
      className="space-y-3 text-sm"
    >
      <input name="name" required placeholder="Your name" className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2" />
      <input name="phone" placeholder="Phone (optional)" className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2" />
      <textarea name="message" rows={3} placeholder="Question about this property?" className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2" />
      <button type="submit" className="btn-primary w-full">
        Send to {tour.agent.name}
      </button>
    </form>
  );
}
