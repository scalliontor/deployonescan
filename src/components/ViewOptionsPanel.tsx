"use client";

import { useState } from "react";
import type { CleanupOptions } from "@/lib/splat-cleanup";

type Props = {
  value: CleanupOptions;
  onChange: (next: CleanupOptions) => void;
};

const PRESETS: Array<{ id: string; label: string; opts: CleanupOptions }> = [
  {
    id: "clean",
    label: "Auto clean",
    opts: { minAlpha: 8, maxScaleMultiplier: 8, lowPercentile: 0.02, highPercentile: 0.98 },
  },
  {
    id: "tight",
    label: "Tight crop",
    opts: { minAlpha: 16, maxScaleMultiplier: 5, lowPercentile: 0.05, highPercentile: 0.95 },
  },
  {
    id: "loose",
    label: "Loose",
    opts: { minAlpha: 4, maxScaleMultiplier: 15, lowPercentile: 0.005, highPercentile: 0.995 },
  },
  {
    id: "raw",
    label: "Raw (no clean)",
    opts: { disabled: true },
  },
];

export function ViewOptionsPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const activePreset =
    PRESETS.find((p) => JSON.stringify(p.opts) === JSON.stringify(value))?.id ?? "custom";

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/10 bg-ink-950/80 px-3 py-1.5 text-[11px] text-white/75 backdrop-blur hover:bg-ink-950 hover:text-white"
        title="View options"
      >
        ⚙ View {open ? "▾" : "▸"}
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-44 z-30 w-72 rounded-xl border border-white/10 bg-ink-950/95 p-4 text-[12px] text-white/85 backdrop-blur md:right-4 md:top-48">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/55">
              View options
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-white/45 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Preset chips */}
          <div className="mb-3">
            <div className="mb-1.5 text-[10px] uppercase tracking-wide text-white/45">Quality preset</div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange(p.opts)}
                  className={`rounded-md px-2 py-1.5 text-[11px] transition ${
                    activePreset === p.id
                      ? "bg-accent-500/20 text-accent-400 ring-1 ring-accent-500/40"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fine-grained sliders */}
          <div className="space-y-3 border-t border-white/10 pt-3">
            <Slider
              label="Min opacity"
              hint="Drop splats more transparent than this (catches floaters)"
              min={0}
              max={64}
              step={1}
              value={value.minAlpha ?? 8}
              onChange={(v) => onChange({ ...value, minAlpha: v, disabled: false })}
              format={(v) => `${v}/255`}
            />
            <Slider
              label="Max scale × median"
              hint="Drop splats bigger than N times the median (catches oversized smears)"
              min={2}
              max={30}
              step={0.5}
              value={value.maxScaleMultiplier ?? 8}
              onChange={(v) => onChange({ ...value, maxScaleMultiplier: v, disabled: false })}
              format={(v) => `${v}×`}
            />
            <Slider
              label="Crop range"
              hint="Keep splats within this percentile bbox (catches background)"
              min={0}
              max={20}
              step={0.5}
              value={Math.round(((value.lowPercentile ?? 0.02) * 100) * 10) / 10}
              onChange={(v) =>
                onChange({
                  ...value,
                  lowPercentile: v / 100,
                  highPercentile: 1 - v / 100,
                  disabled: false,
                })
              }
              format={(v) => `${v.toFixed(1)}–${(100 - v).toFixed(1)}%`}
            />
          </div>

          <div className="mt-3 rounded-lg bg-accent-500/5 p-2 text-[10px] text-white/55">
            💡 Changes re-process the scene (~1-2s for the room scene).
            Use <b>Raw</b> to see the unmodified capture.
          </div>
        </div>
      )}
    </>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-white/70" title={hint}>
          {label}
        </span>
        <span className="text-[11px] font-medium text-accent-400">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent-500"
      />
    </div>
  );
}
