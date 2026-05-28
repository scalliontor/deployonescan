import Link from "next/link";
import { listGalleryTours } from "@/lib/tours";

export default function Home() {
  const gallery = listGalleryTours().slice(0, 4);

  return (
    <div>
      {/* HERO — cinematic, Luma-style */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-hero" />
        <div className="absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
          <div className="absolute inset-0 bg-grid-dark [background-size:32px_32px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative z-10">
              <span className="chip mb-6 animate-fade-in">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
                Now in private beta · for real estate agents
              </span>
              <h1 className="font-display text-[44px] font-bold leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
                Film your listing.
                <br />
                <span className="bg-gradient-to-r from-accent-400 via-accent-500 to-warm-400 bg-clip-text text-transparent">
                  Sell it in 3D.
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-white/70 md:text-xl">
                The first self-serve Gaussian Splatting tour for real estate.
                Walk through your property with your iPhone, get a Matterport-
                quality 3D listing in 30 minutes.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/upload" className="btn-primary text-base">
                  Create your first tour →
                </Link>
                <Link href="/demo" className="btn-ghost text-base">
                  ▶ Watch a live demo
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/55">
                <span>✓ Any iPhone (no LiDAR needed)</span>
                <span>✓ Embeds anywhere</span>
                <span>✓ From $29 / tour</span>
              </div>
            </div>

            {/* Hero card — animated phone + tour preview */}
            <div className="relative">
              <div className="card relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-ink-800/80 to-ink-900/80 backdrop-blur-xl">
                <div className="absolute inset-0 bg-grid-dark opacity-40 [background-size:24px_24px]" />

                {/* Glow */}
                <div className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-accent-500/20 blur-3xl" />
                <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-warm-500/20 blur-3xl" />

                <div className="relative grid h-full place-items-center p-6">
                  <div className="flex items-center gap-6 md:gap-10">
                    {/* Phone */}
                    <div className="relative h-72 w-40 shrink-0 rounded-[2.25rem] border-[3px] border-white/15 bg-ink-950 shadow-2xl">
                      <div className="absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full bg-white/15" />
                      <div className="absolute inset-2.5 overflow-hidden rounded-[1.5rem]">
                        <div className="h-full w-full animate-pulse-slow bg-gradient-to-br from-accent-500/30 via-warm-500/20 to-ink-900" />
                        <div className="absolute inset-0 grid place-items-center text-center text-xs text-white/80">
                          <div className="space-y-2 px-3">
                            <div className="mx-auto inline-flex items-center gap-1 rounded-full bg-ink-950/85 px-2 py-0.5 text-[10px]">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                              REC · 02:14
                            </div>
                            <div className="text-[11px] text-accent-400">↓ Walk slower</div>
                            <div className="text-[10px] text-white/55">
                              Point camera at the next room
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-1">
                              {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div
                                  key={i}
                                  className={`h-1 rounded-full ${
                                    i <= 4 ? "bg-accent-500" : "bg-white/15"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center text-accent-500">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                      <span className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                        30 min
                      </span>
                    </div>

                    {/* 3D Tour preview thumbnail */}
                    <div className="hidden h-56 w-44 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-700 to-ink-900 shadow-2xl md:block">
                      <div className="relative h-full w-full">
                        <div className="absolute inset-0 bg-gradient-to-b from-accent-500/20 via-transparent to-warm-500/15" />
                        <div className="absolute left-2 top-2 rounded-full bg-accent-500/85 px-2 py-0.5 text-[10px] font-medium text-ink-950">
                          Tour ready
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white/75">
                          <div className="font-medium text-white">1847 Sycamore Ln</div>
                          <div className="text-white/55">Mill Valley · 3bd · 2ba</div>
                        </div>
                        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15 backdrop-blur-sm">
                          <div className="grid h-full w-full place-items-center text-white">
                            ▶
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION DIVIDER — featured tour */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="card overflow-hidden bg-gradient-to-br from-ink-800/60 to-ink-900/60 p-1">
          <div className="grid items-stretch gap-6 rounded-2xl p-6 md:grid-cols-2 md:gap-10 md:p-10">
            <div className="flex flex-col justify-center">
              <div className="chip mb-3">✨ Live demo · open in your browser</div>
              <h2 className="text-3xl font-bold md:text-4xl">
                Walk through a real listing right now.
              </h2>
              <p className="mt-3 text-white/65">
                This is an actual 3D Gaussian Splat rendered in your browser.
                No download. No login. Move your mouse, scroll to zoom, click a
                hotspot. Try the floor plan and measurement tools — they all work.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/demo" className="btn-primary">
                  Open the demo →
                </Link>
                <Link href="/explore" className="btn-ghost">
                  Browse more examples
                </Link>
              </div>
            </div>
            <Link
              href="/demo"
              className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-ink-700 md:aspect-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent-500/20 via-transparent to-warm-500/20" />
              <div className="absolute inset-0 bg-grid-dark opacity-30 [background-size:18px_18px]" />
              <div className="absolute left-4 top-4 chip border-accent-500/40 bg-accent-500/15 text-accent-400">
                Live 3DGS
              </div>
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-white/25">
                  ▶
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-sm font-medium text-white">1847 Sycamore Lane</div>
                <div className="text-xs text-white/60">Mill Valley · 3bd · 2ba · 1,940 sqft</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-14 text-center">
          <span className="chip mb-4">How it works</span>
          <h2 className="text-3xl font-bold md:text-5xl">Three steps. One iPhone.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            No appointment with a photographer. No new gear. You're the camera.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Scan with guidance",
              d: "Our capture app overlays on your iPhone camera and tells you exactly where to walk, how fast, and where to point. Average listing: 15-20 minutes.",
              cta: { href: "/capture", label: "See the capture guide" },
              icon: "📱",
            },
            {
              n: "02",
              t: "We process in 30 min",
              d: "Upload from your phone. Our cloud builds a photorealistic 3D Gaussian Splat of the whole property — every corner, every angle.",
              cta: { href: "/upload", label: "Try the upload flow" },
              icon: "✨",
            },
            {
              n: "03",
              t: "Share one link",
              d: "Embed on MLS, drop in email signatures, post on social. Buyers explore on any browser. You get views, lead captures, and analytics.",
              cta: { href: "/explore", label: "See example tours" },
              icon: "🔗",
            },
          ].map((s) => (
            <div key={s.n} className="card group relative overflow-hidden p-6 transition hover:border-white/20">
              <div className="absolute -right-6 -top-6 text-[120px] font-bold leading-none text-white/[0.04]">
                {s.n}
              </div>
              <div className="relative">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-xl">
                  {s.icon}
                </div>
                <div className="text-lg font-semibold">{s.t}</div>
                <div className="mt-2 text-sm text-white/65">{s.d}</div>
                <Link
                  href={s.cta.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm text-accent-500 hover:text-accent-400"
                >
                  {s.cta.label} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EXPLORE — gallery preview */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="chip mb-3">Explore</span>
            <h2 className="text-2xl font-bold md:text-4xl">Recent tours from our agents</h2>
          </div>
          <Link href="/explore" className="hidden text-sm text-white/65 hover:text-white sm:inline">
            See all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.map((t) => (
            <Link
              key={t.id}
              href={`/tour/${t.id}`}
              className="group card relative aspect-[4/5] overflow-hidden transition hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent-500/15 via-transparent to-warm-500/15" />
              <div className="absolute inset-0 bg-grid-dark opacity-25 [background-size:18px_18px]" />
              <div className="absolute left-3 top-3 chip text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                Live tour
              </div>
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-white/20">
                  ▶
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="truncate text-sm font-medium text-white">{t.title}</div>
                <div className="truncate text-[11px] text-white/55">{t.address}</div>
                <div className="mt-2 flex gap-2 text-[10px] text-white/55">
                  <span>👁 {t.views.toLocaleString()}</span>
                  <span>🎯 {t.leads}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="card overflow-hidden">
          <div className="grid md:grid-cols-3">
            {[
              {
                label: "The old way",
                title: "Matterport",
                items: [
                  "✗ $6,000+ camera",
                  "✗ Schedule a photographer",
                  "✗ 2-3 hour on-site visit",
                  "✗ $200-500 per listing",
                  "✗ Teleport between fixed dots",
                ],
                muted: true,
              },
              {
                label: "The free way",
                title: "Zillow 3D Home",
                items: [
                  "✓ Free",
                  "✗ Panoramas only — not 3D",
                  "✗ Locked to Zillow",
                  "✗ Low quality, dated UX",
                  "✗ No branding, no leads",
                ],
                muted: true,
              },
              {
                label: "Onescan",
                title: "Self-serve 3DGS",
                items: [
                  "✓ Your iPhone is the camera",
                  "✓ 15 min capture · 30 min processing",
                  "✓ $29 per tour, or $39/mo",
                  "✓ Photoreal, smooth walkthrough",
                  "✓ Branded, embeddable, lead capture",
                ],
                muted: false,
              },
            ].map((col, i) => (
              <div
                key={col.title}
                className={`p-8 ${
                  col.muted
                    ? "border-b border-white/10 bg-ink-800/40 md:border-b-0 md:border-r"
                    : "bg-gradient-to-br from-accent-500/15 via-transparent to-warm-500/10"
                } ${i === 1 ? "md:border-r" : ""}`}
              >
                <div className={`chip mb-3 ${!col.muted ? "border-accent-500/40 bg-accent-500/15 text-accent-400" : ""}`}>
                  {col.label}
                </div>
                <div className={`text-2xl font-semibold ${col.muted ? "text-white/70" : "text-white"}`}>
                  {col.title}
                </div>
                <ul className={`mt-4 space-y-2 text-sm ${col.muted ? "text-white/55" : "text-white/85"}`}>
                  {col.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / STATS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { stat: "+87%", label: "More listing views with a 3D tour" },
            { stat: "+49%", label: "More qualified buyer leads" },
            { stat: "+31%", label: "Faster sale, higher close price" },
          ].map((s) => (
            <div key={s.stat} className="card p-6">
              <div className="bg-gradient-to-r from-accent-400 to-warm-400 bg-clip-text text-5xl font-bold text-transparent">
                {s.stat}
              </div>
              <div className="mt-3 text-sm text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center text-xs text-white/40">
          Source: Matterport listing performance studies, NAR
        </div>
      </section>

      {/* MARKET (investor angle, kept) */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="card grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <div className="chip mb-3">The opportunity</div>
            <h3 className="text-3xl font-bold leading-tight md:text-4xl">
              Matterport sold for <span className="text-accent-500">$1.6B</span>.
              <br />
              Then Zillow dropped them.
            </h3>
            <p className="mt-4 text-white/70">
              The 3D-tour-of-real-estate category is proven. The incumbent is
              now a CoStar subsidiary and just lost its biggest distribution
              channel. Every major portal — Zillow, CoStar, DJI — shipped
              Gaussian Splatting in 2025. Nobody is selling a vertical
              real-estate product for the iPhone agent yet.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip">$2.5B virtual tour market</span>
              <span className="chip">34% CAGR to 2030</span>
              <span className="chip">~90% gross margin per tour</span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: "Cost per scene", value: "$1", caption: "via Luma video-to-3D API" },
              { label: "Sells to agents at", value: "$29-49", caption: "vs. $200-500 for Matterport service call" },
              { label: "US TAM (real estate)", value: "~$1B+", caption: "~6M annual listings × $200 tour budget" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-ink-800/40 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50">{s.label}</div>
                <div className="mt-1 text-2xl font-semibold text-accent-500">{s.value}</div>
                <div className="text-xs text-white/55">{s.caption}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold md:text-5xl">
          Your next listing,
          <br />
          <span className="bg-gradient-to-r from-accent-400 to-warm-400 bg-clip-text text-transparent">
            in 3D.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/70">
          Try the demo now. No signup. Browse a real Gaussian Splat tour in your browser.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/demo" className="btn-primary text-base">
            Open the demo →
          </Link>
          <Link href="/upload" className="btn-ghost text-base">
            Start your own tour
          </Link>
        </div>
      </section>
    </div>
  );
}
