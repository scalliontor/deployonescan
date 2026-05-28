# Onescan

> Self-serve Gaussian Splatting for real estate. Agent films their listing with an iPhone → buyers explore a photoreal 3D walkthrough in any browser.

The investor-demo MVP. Deploys to Vercel with no backend; the mock splat
provider drives the full upload flow against a bundled sample scene.

## Quick start (local)

```bash
npm install
cp .env.example .env
npm run dev
# → http://localhost:3000
```

The sample 3D scene is committed (`public/splats/sample.ksplat`, ~4 MB).
If you want to swap it for a different scene, drop any `.ksplat` / `.splat`
/ `.ply` at the same path.

## Deploy to Vercel

See [DEPLOY.md](DEPLOY.md) — one-click + CLI instructions, env vars.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing — pitch, market, comparison, gallery preview |
| `/demo` | Live 3DGS viewer with the full vertical UX (hotspots, floor plan, measure, share, lead capture) |
| `/explore` | Public gallery of example tours |
| `/capture` | iPhone capture guide for agents |
| `/upload` | Self-serve upload flow + simulated processing |
| `/pricing` | $29/tour, $39/mo, $99/mo plans + mock checkout |
| `/tour/[id]` | Shareable tour with full site chrome |
| `/embed/[id]` | Same viewer, no chrome — for iframe embeds on MLS / listing sites |
| `/api/tours` | POST — create a tour |
| `/api/tours/[id]/status` | GET — poll capture status |
| `/api/tours/[id]/lead` | POST — capture a lead |
| `/api/checkout` | POST — create a mock checkout session |

## Architecture

```
src/
  app/
    (pages)/               # all rendered routes
    api/                   # route handlers
  components/
    SplatViewer.tsx        # Three.js + mkkellogg gsplat viewer (client-only)
    ViewerOverlay.tsx      # vertical UX: hotspots, floor plan, measure, share, lead
    ViewerWithOverlay.tsx
    UploadFlow.tsx
    CheckoutButton.tsx
    SiteChrome.tsx         # client-side header/footer (hides on /embed/*)
  lib/
    splat-provider.ts      # Mock + Luma adapter (see Switching providers below)
    tours.ts               # in-memory tour storage (Vercel-safe)
    checkout.ts            # mock checkout sessions
    types.ts
public/splats/sample.ksplat  # bundled sample scene
```

## Switching providers

The Mock provider is the default (Vercel-safe — no external dependency).

To use **Luma's enterprise video-to-3D API** instead:
```bash
SPLAT_PROVIDER=luma LUMA_API_KEY=<your-key> npm run dev
```
Then fill in the three `TODO(luma-enterprise)` markers in
[`src/lib/splat-provider.ts`](src/lib/splat-provider.ts) with the exact
endpoint paths Luma gives you (the 3D API isn't publicly documented).

To use a **self-hosted local worker** (planned, not yet built):
See [PLAN-LOCAL-WORKER.md](PLAN-LOCAL-WORKER.md) — full implementation plan
for COLMAP + nerfstudio + gsplat pipeline running on a GPU box (e.g.,
your RTX 5070 Ti).

## Strategy docs (read in this order)

1. [BUSINESS.md](BUSINESS.md) — *why* (market, monetization, competitors, unit economics)
2. [IP-MOAT.md](IP-MOAT.md) — *what we actually invent* (algorithms vs gluing OSS)
3. [SELF-HOST.md](SELF-HOST.md) — *plumbing* (pipeline, GPU options, costs to swap off Luma)
4. [PLAN-LOCAL-WORKER.md](PLAN-LOCAL-WORKER.md) — *implementation plan* for the self-host worker
5. [DEPLOY.md](DEPLOY.md) — *operations* (Vercel deploy)

## Roadmap

| When | What |
|---|---|
| **Now** | MVP deployed to Vercel for demos, pilot signups |
| **At ~50 paying tours** | Start the self-host worker (PLAN-LOCAL-WORKER.md) in parallel |
| **At ~200 paying tours** | iPhone capture app (IP-MOAT.md §1) — the actual moat |
| **At ~500 paying tours** | Floor plan auto-extraction + room segmentation (IP-MOAT.md §2) |

## License

Private. © 2026 Onescan.
