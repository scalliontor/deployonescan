import Link from "next/link";

const TIPS = [
  {
    n: "01",
    title: "Walk slow. Really slow.",
    body: "Like a museum walk — about half your normal pace. Each step gives the camera 8-10 frames per second to capture overlapping detail. Fast walking = blurry frames = bad splat.",
    visual: "walk",
  },
  {
    n: "02",
    title: "Pan slightly up and down",
    body: "Tilt the phone up to catch the ceiling, down to catch the floor, then back to level. The splat needs to see both, or it'll have holes.",
    visual: "tilt",
  },
  {
    n: "03",
    title: "Walk along walls, not through the middle",
    body: "Camera 2-3 feet from walls captures texture well. Center-of-room shots see everything at distance — less detail, more floaters.",
    visual: "perimeter",
  },
  {
    n: "04",
    title: "Cover every corner from two angles",
    body: "Walk into corners, then turn and walk back out. Every surface should be seen from at least two viewpoints, ideally three.",
    visual: "corner",
  },
  {
    n: "05",
    title: "Avoid pointing directly at mirrors and big windows",
    body: "Mirrors confuse SfM (reflection looks like a fake room). Bright window glare causes floaters. Capture them at an angle, not head-on.",
    visual: "mirror",
  },
  {
    n: "06",
    title: "Keep the phone level (no rolling)",
    body: "Hold it steady, like a tray of coffee. Tilting left/right (roll) is the worst — pan and tilt are fine.",
    visual: "level",
  },
];

const COMMON_MISTAKES = [
  {
    do: "Open every door before scanning",
    dont: "Don't scan through doorways with the door half-closed",
  },
  {
    do: "Turn on every light, open every blind",
    dont: "Don't film with one room dark and one bright",
  },
  {
    do: "Move furniture aside if it blocks a path",
    dont: "Don't scan over a sofa — go around it",
  },
  {
    do: "Tidy first (it's a listing, after all)",
    dont: "Don't include people or pets in the scan",
  },
  {
    do: "Use landscape orientation",
    dont: "Don't switch between portrait and landscape mid-scan",
  },
];

export default function CapturePage() {
  return (
    <div className="bg-hero min-h-[calc(100vh-65px)]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <div className="text-center">
          <span className="chip mb-4">For real estate agents</span>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Your iPhone capture guide.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">
            A 15-20 minute walkthrough of a 1,500-2,500 sqft home produces a
            tour buyers will explore for 5+ minutes. Here's how to film it right.
          </p>
        </div>

        {/* Phone settings card */}
        <div className="card mx-auto mt-12 max-w-3xl p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-500">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-500/20">📱</span>
            Before you start filming
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Setting label="Resolution" value="1080p or 4K" />
            <Setting label="Frame rate" value="30 fps (not 60)" />
            <Setting label="Orientation" value="Landscape" />
            <Setting label="Stabilization" value="On (default)" />
            <Setting label="HDR Video" value="Off (causes flicker)" />
            <Setting label="Format" value="HEVC (H.265) — smaller file" />
          </div>
          <div className="mt-5 rounded-lg border border-warm-500/30 bg-warm-500/10 p-3 text-xs text-warm-400">
            <b>Pro tip:</b> Settings → Camera → Record Video → 1080p HD at 30 fps,
            then turn off "HDR Video". Restart the Camera app after changing.
          </div>
        </div>

        {/* The 6 tips */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">
            Six rules. Follow them all.
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {TIPS.map((tip) => (
              <div
                key={tip.n}
                className="card group relative overflow-hidden p-6 transition hover:border-white/20"
              >
                <div className="absolute -right-4 -top-4 text-[100px] font-bold leading-none text-white/[0.04]">
                  {tip.n}
                </div>
                <div className="relative">
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-white/5">
                    <VisualIcon kind={tip.visual} />
                  </div>
                  <div className="text-lg font-semibold">{tip.title}</div>
                  <div className="mt-2 text-sm text-white/65">{tip.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Do / Don't */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">
            Do this, not that.
          </h2>
          <div className="card overflow-hidden">
            <div className="grid divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2 text-accent-500">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500/20 text-sm">✓</span>
                  <span className="text-sm font-semibold uppercase tracking-wider">Do</span>
                </div>
                <ul className="space-y-3 text-sm text-white/80">
                  {COMMON_MISTAKES.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent-500">·</span>
                      <span>{m.do}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2 text-red-400">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500/15 text-sm">✗</span>
                  <span className="text-sm font-semibold uppercase tracking-wider">Don't</span>
                </div>
                <ul className="space-y-3 text-sm text-white/65">
                  {COMMON_MISTAKES.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-400">·</span>
                      <span>{m.dont}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended path */}
        <div className="card mt-16 overflow-hidden p-8">
          <div className="chip mb-3">Suggested route for a 3-bed home</div>
          <h2 className="text-2xl font-bold md:text-3xl">
            Walk the house like this.
          </h2>
          <p className="mt-2 text-white/65">
            Start at the front door, end at the front door. Total: ~15-20 minutes.
          </p>
          <ol className="mt-6 space-y-3 text-sm">
            {[
              "Front door — exterior shot of the entrance, then step inside.",
              "Living room — perimeter loop, pan up to ceiling.",
              "Kitchen — close-ups of counters and appliances, then a wide angle.",
              "Dining area — slow walk-through.",
              "Hallway — single slow pass.",
              "Bedrooms (one at a time) — perimeter, then look at the closet interior.",
              "Bathrooms — slow pan, careful around mirrors.",
              "Outdoor / patio if applicable — exterior walls and yard.",
              "Return to the front door, stop recording.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-500/20 text-xs font-semibold text-accent-500">
                  {i + 1}
                </span>
                <span className="text-white/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Ready to scan your first listing?</h2>
          <p className="mt-2 text-white/65">
            Have your iPhone ready, lights on, doors open. We'll handle the rest.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/upload" className="btn-primary">
              Upload your scan →
            </Link>
            <Link href="/demo" className="btn-ghost">
              See an example first
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-800/40 px-3 py-2.5">
      <span className="text-sm text-white/60">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function VisualIcon({ kind }: { kind: string }) {
  // Tiny SVG mnemonics — not literal illustrations, just visual anchors per rule
  switch (kind) {
    case "walk":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-500" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="13" cy="5" r="2" />
          <path d="M11 21l1-7-2-2 1-4 4 1 2 3" />
        </svg>
      );
    case "tilt":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-500" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M12 7v3M9 17l3-3 3 3" />
        </svg>
      );
    case "perimeter":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-500" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 8h16M8 4v16" strokeDasharray="2 2" />
          <circle cx="6" cy="6" r="1" fill="currentColor" />
        </svg>
      );
    case "corner":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-500" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 20V4h16" />
          <path d="M8 16l4-4 4 4" />
        </svg>
      );
    case "mirror":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-500" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="7" y="3" width="10" height="18" rx="5" />
          <path d="M9 7l6 6M15 7l-6 6" strokeWidth="1" />
        </svg>
      );
    case "level":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-500" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="9" width="18" height="6" rx="1" />
          <circle cx="12" cy="12" r="1.5" />
          <path d="M9 12h-1M16 12h-1" />
        </svg>
      );
  }
  return null;
}
