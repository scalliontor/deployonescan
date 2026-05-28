import Link from "next/link";
import { listGalleryTours } from "@/lib/tours";

export default function ExplorePage() {
  const tours = listGalleryTours();

  return (
    <div className="bg-hero min-h-[calc(100vh-65px)]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 text-center">
          <span className="chip mb-4">Explore</span>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Real listings.
            <br />
            <span className="bg-gradient-to-r from-accent-400 to-warm-400 bg-clip-text text-transparent">
              Filmed on iPhones.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/65">
            A glimpse of what Onescan tours look like once they're published.
            Click any card to walk through a real 3D Gaussian Splat scene in
            your browser — no login, no app.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((t) => (
            <Link
              key={t.id}
              href={`/tour/${t.id}`}
              className="group card relative aspect-[4/5] overflow-hidden transition hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent-500/15 via-transparent to-warm-500/15" />
              <div className="absolute inset-0 bg-grid-dark opacity-25 [background-size:20px_20px]" />

              <div className="absolute left-3 top-3 chip text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                Live 3DGS tour
              </div>

              <div className="absolute right-3 top-3 chip text-[10px]">
                ↗ Open
              </div>

              {/* Play badge */}
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-white/25">
                  ▶
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent p-4 pt-12">
                <div className="flex items-center gap-2.5">
                  <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-ink-950"
                    style={{ background: t.agent.avatarColor }}
                  >
                    {t.agent.name
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{t.title}</div>
                    <div className="truncate text-[11px] text-white/55">
                      {t.agent.name} · {t.agent.brokerage}
                    </div>
                  </div>
                </div>
                <div className="mt-2 truncate text-[11px] text-white/65">{t.address}</div>
                <div className="mt-3 flex gap-3 text-[10px] text-white/55">
                  <span>👁 {t.views.toLocaleString()} views</span>
                  <span>🎯 {t.leads} leads</span>
                </div>
              </div>
            </Link>
          ))}

          {/* "Your tour next" card */}
          <Link
            href="/upload"
            className="group card relative grid aspect-[4/5] place-items-center overflow-hidden border-dashed border-white/15 transition hover:border-accent-500/50 hover:bg-accent-500/5"
          >
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent-500/15 text-2xl text-accent-500 transition group-hover:scale-110">
                +
              </div>
              <div className="text-sm font-semibold text-white">Your tour next</div>
              <div className="mt-1 text-xs text-white/55">Upload an iPhone video →</div>
            </div>
          </Link>
        </div>

        {/* Why these look this good */}
        <div className="card mx-auto mt-16 max-w-4xl p-8">
          <div className="chip mb-3">Why these look this good</div>
          <h2 className="text-2xl font-bold md:text-3xl">
            It's the capture, not the camera.
          </h2>
          <p className="mt-3 text-white/70">
            Every tour above was filmed in 15-20 minutes on a regular iPhone —
            no LiDAR Pro model, no tripod, no $6K Matterport rig. The agent
            walked slowly, panned for ceiling and floor coverage, kept the
            phone level. That's it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/capture" className="btn-primary text-sm">
              Read the capture guide →
            </Link>
            <Link href="/upload" className="btn-ghost text-sm">
              Try your own
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
