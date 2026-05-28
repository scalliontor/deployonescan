# Deploy to Vercel

The Onescan MVP is built to deploy to Vercel out of the box — no server,
no database, no GPU. The mock splat provider drives the upload flow against
a bundled sample scene in `public/splats/sample.ksplat`.

## One-click deploy

Push this repo to GitHub, then click:

```
https://vercel.com/new/clone?repository-url=https://github.com/<your-username>/<repo-name>
```

(Replace `<your-username>/<repo-name>` after you push.)

Vercel will detect it's a Next.js app and use the settings in `vercel.json`:
- Build command: `next build`
- Output: `.next/`
- Region: `iad1` (US East)

## Manual deploy via CLI

```bash
# install once
npm i -g vercel

# from the repo root
vercel
# follow prompts: link or create a new project, default settings are fine
```

Subsequent deploys:
```bash
vercel --prod
```

## Environment variables

For the demo nothing is required — defaults are fine. If you want to customize:

| Var | Default | What it does |
|---|---|---|
| `SPLAT_PROVIDER` | `mock` | `mock` (Vercel default) or `luma` once you have enterprise access |
| `NEXT_PUBLIC_SAMPLE_SPLAT` | `/splats/sample.ksplat` | Path to the demo splat asset |
| `PUBLIC_APP_URL` | — | Set to your Vercel URL for OG tags + checkout success URLs |
| `LUMA_API_KEY` | — | Only needed when `SPLAT_PROVIDER=luma` |
| `LUMA_API_BASE` | `https://api.lumalabs.ai` | Override if Luma gives you a custom endpoint |

Set these in the Vercel project settings → Environment Variables. None
of them block the deploy if unset.

## What works on Vercel out of the box

- ✅ Landing page (`/`)
- ✅ Live viewer (`/demo`)
- ✅ Public gallery (`/explore`)
- ✅ iPhone capture guide (`/capture`)
- ✅ Upload flow (mock processing, ~30 sec) (`/upload`)
- ✅ Tour pages + embed iframe (`/tour/<id>`, `/embed/<id>`)
- ✅ Pricing + mock checkout (`/pricing`, `/checkout/success`)
- ✅ Lead capture form (logs to Vercel function logs)

## What does NOT persist on Vercel

The MVP uses in-memory storage for tours and checkout sessions.
Implications on Vercel's serverless runtime:

- **Uploaded tours work within a browser session** (same warm function
  instance). The upload → processing → viewer flow completes correctly.
- Tours may disappear after a cold start or when Vercel scales to a new
  instance. The "demo" and "explore" gallery tours are hardcoded and
  always available.
- Leads are logged to Vercel function logs (not persisted to a database).

This is intentional for the investor-demo MVP. When you start onboarding
paying customers, swap in:
- **Vercel KV** or **Postgres** for tours + leads + sessions
- **Vercel Blob** or **Cloudflare R2** for production splat hosting
- **Stripe SDK** for real checkout

See `src/lib/tours.ts` and `src/lib/checkout.ts` — they're already
structured around a single store interface, so the swap is mechanical.

## Asset size

`public/splats/sample.ksplat` is ~4 MB, committed to the repo so the demo
works without a download step. Vercel includes it in deploys. For production
splats (typically 5-50 MB each), upload to R2/S3/Vercel Blob instead — do
not commit them to the repo.

## Custom domain

After your first deploy, in the Vercel dashboard go to Project → Settings →
Domains → Add. Onescan looks great on `onescan.app` 🙂
