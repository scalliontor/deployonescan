# Using Onescan on a fresh machine

Step-by-step guide to clone, run, and deploy Onescan from scratch — on any
Linux / macOS / Windows-WSL machine. All you need is git, Node.js, and a
browser with WebGL2.

---

## 1. Prerequisites

| Tool | Min version | Install |
|---|---|---|
| **git** | 2.20+ | `apt install git` / `brew install git` / [git-scm.com](https://git-scm.com/) |
| **Node.js** | 18.17+ (20 recommended) | [nodejs.org](https://nodejs.org/) or `nvm install --lts` |
| **Browser** | Chrome 90+ / Firefox 110+ / Safari 16+ | Must support WebGL2 + WebAssembly |

Check on your machine:
```bash
git --version       # ≥ 2.20
node --version      # ≥ v18.17
npm --version       # comes with Node
```

If you're on Linux and Node is too old:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Clone the repo

```bash
# pick one of the two repos — both have the same code
git clone https://github.com/scalliontor/Onescan.git
# or
git clone https://github.com/scalliontor/deployonescan.git

cd Onescan   # (or deployonescan)
```

The repo bundles ~67 MB of 3DGS sample scenes in `public/splats/`
(`room.splat`, `nike.splat`, `plush.splat`). First clone will take 20-60 s
depending on connection.

---

## 3. Run it locally

```bash
# install deps (~30 s)
npm install

# copy env defaults
cp .env.example .env

# start dev server
npm run dev
# → http://localhost:3000
```

Visit:

| Route | What it is |
|---|---|
| [http://localhost:3000/](http://localhost:3000/) | Landing + pitch |
| [http://localhost:3000/demo](http://localhost:3000/demo) | Live 3D viewer (interior "room" scene) |
| [http://localhost:3000/explore](http://localhost:3000/explore) | Gallery of example tours |
| [http://localhost:3000/capture](http://localhost:3000/capture) | iPhone capture guide for agents |
| [http://localhost:3000/upload](http://localhost:3000/upload) | Self-serve upload flow |
| [http://localhost:3000/pricing](http://localhost:3000/pricing) | Plans + mock checkout |

### Production-mode run (no dev hot reload)

```bash
npm run build      # ~30 s
npm run start      # serves on port 3000 by default
# To bind on all interfaces (LAN access):
PORT=3000 npx next start -H 0.0.0.0
```

---

## 4. Verify your browser is compatible

The 3D viewer needs WebGL2. Visit
[http://localhost:3000/test-webgl](http://localhost:3000/test-webgl) on the
machine you'll use to view tours:

- Spinning multicolor cube on the left = WebGL2 OK
- Both "WebGL1" and "WebGL2" green YES on the right = ready

Common gotcha on Linux: Chrome falls back to software rendering on some
integrated GPUs and only exposes WebGL1. Fix at `chrome://flags` →
"Override software rendering list" → **Enabled** → Relaunch.

---

## 5. Deploy to Vercel (one click)

The app is already wired for Vercel — no backend, no database, just static
assets + serverless API routes.

1. Push your fork to GitHub (if not already).
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repo.
3. Default settings are fine (`next build`, region `iad1`).
4. Click **Deploy** → ~90 s build → live URL.

No env vars are required to deploy. Optional ones you may set in the Vercel
dashboard:

| Var | Purpose |
|---|---|
| `PUBLIC_APP_URL` | Set to your live URL for correct OG tags + share links |
| `SPLAT_PROVIDER` | `mock` (default) or `luma` (when you have enterprise API access) |
| `LUMA_API_KEY` | Only if `SPLAT_PROVIDER=luma` |

A typical deploy ends up at:
`https://<project-name>-<hash>.vercel.app` — share that URL with anyone.

### Or deploy via CLI

```bash
npm i -g vercel
vercel login      # browser auth
vercel --prod     # deploy
```

---

## 6. Customise the bundled scenes

The 3 bundled splat files live in `public/splats/`. To swap one for your
own:

1. Drop your `.splat` / `.ksplat` / `.ply` into `public/splats/`.
2. Update the relevant tour's `splatUrl` in `src/lib/tours.ts`.
3. Commit + push → Vercel auto-redeploys.

Keep files under 100 MB (Vercel limit per file). Larger production scenes
should be hosted on Cloudflare R2 / AWS S3 and referenced by absolute URL.

The runtime auto-cleanup in [`src/lib/splat-cleanup.ts`](src/lib/splat-cleanup.ts)
will filter floaters + crop background on every load — so you don't need
to pre-clean files perfectly.

---

## 7. Run as a long-running production server (own VPS / GPU box)

If you want to host on your own server instead of Vercel:

```bash
# on the server, as a non-root user
git clone https://github.com/scalliontor/Onescan.git
cd Onescan
npm install
cp .env.example .env

# Edit .env, set PUBLIC_APP_URL to whatever URL clients will hit
nano .env

# Build + start as background service
npm run build
nohup npx next start -H 0.0.0.0 -p 3000 > /tmp/onescan.log 2>&1 &
disown
```

Hit `http://<server-ip>:3000/` from any machine on the same network.

For real production: put nginx in front for HTTPS, use `pm2` or systemd to
keep it alive, and add a real DNS A record. See [DEPLOY.md](DEPLOY.md).

---

## 8. Troubleshooting

### "3D viewer is black"
- Check [/test-webgl](http://localhost:3000/test-webgl) — if WebGL2 ≠ YES,
  fix browser/GPU drivers first.
- Click the **🐞 Debug** button (top-right of viewer) — it logs every step
  and surfaces parse / load errors.
- Try the **⚙ View** panel → **Raw (no clean)** preset — rules out
  over-aggressive cleanup.
- If on an AMD integrated GPU and you see "loaded N splats" but black
  screen: GPU sort is unreliable there. The code already defaults to CPU
  sort — make sure you've pulled the latest `main`.

### Port 3000 already in use
```bash
# find what's holding it
ss -ltnp | grep :3000     # Linux
lsof -i :3000             # macOS

# kill it
kill -9 <pid>

# or just use a different port
PORT=3100 npm run dev
```

### Vercel build fails on cold install
- Make sure `package-lock.json` is committed (it is in this repo).
- Vercel sometimes caches an old build — try the "Redeploy" button with
  "Use existing build cache" **unchecked**.

### Tour I uploaded vanishes after a few minutes
Expected for the Vercel demo — storage is in-memory only (see [DEPLOY.md](DEPLOY.md#what-does-not-persist-on-vercel)).
The bundled gallery tours always persist. For real user uploads, wire up
Vercel KV or Postgres in `src/lib/tours.ts`.

---

## 9. Where to read next

| File | About |
|---|---|
| [README.md](README.md) | Project overview + route map |
| [DEPLOY.md](DEPLOY.md) | Vercel deploy specifics + env vars |
| [BUSINESS.md](BUSINESS.md) | Market, monetization, competitor analysis |
| [IP-MOAT.md](IP-MOAT.md) | What we actually invent vs glue together |
| [SELF-HOST.md](SELF-HOST.md) | The eventual self-hosted 3DGS pipeline |
| [PLAN-LOCAL-WORKER.md](PLAN-LOCAL-WORKER.md) | Step-by-step plan for the worker |

---

## 10. Quick reference — common commands

```bash
# Run locally
npm run dev

# Production build
npm run build && npm run start

# Type-check (no compile)
npx tsc --noEmit

# Run on a specific port + LAN-accessible
PORT=8080 npx next start -H 0.0.0.0

# Force re-download cleaning of .next cache
rm -rf .next && npm run build

# Sync your local repo to a remote machine via rsync (excluding node_modules)
rsync -azP --exclude node_modules --exclude .next --exclude .git \
  ./ user@remote-host:~/Onescan/
```
