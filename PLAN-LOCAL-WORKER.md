# Plan — Full Self-Host Integration (Worker + LocalSplatProvider + Queue)

> Implementation plan only. **No code yet.** Review and approve before we start.
> Last updated: 2026-05-28
>
> Context: see [SELF-HOST.md](SELF-HOST.md) for the stack rationale and
> [BUSINESS.md](BUSINESS.md) for *why* this should NOT come before paying users.

---

## 0. What "done" looks like

A developer runs:

```bash
# on the 5070 Ti server (10.170.75.221), inside ~/Desktop/Onescan/worker:
./scripts/serve.sh         # starts the FastAPI worker + rq worker on the GPU

# on the laptop running the Next.js app:
SPLAT_PROVIDER=local LOCAL_WORKER_URL=http://10.170.75.221:8000 npm run dev
# opens http://localhost:3000/upload, drops a real iPhone walkthrough video
```

…and gets back a real `.ksplat` produced on the 5070 Ti, served at `/tour/<id>` via the existing viewer. No Luma call anywhere in the loop. Provider in `.env` is `local`.

Docker / docker-compose is a **Phase B artifact** (for cloud / multi-machine deploy). Phase A is bare-metal on the 5070 Ti box to keep the bleeding-edge Blackwell install pain minimal.

---

## 1. Hardware target & validation

**Dev box (surveyed 2026-05-28)**: 5070 Ti server `cts-daily@10.170.75.221`
- Ubuntu 24.04, kernel 6.17, NVIDIA driver 595.71 (CUDA 13.2-capable)
- Python 3.12.3 (system), no pip, no GCC/g++/make, no Docker, no CUDA toolkit, no Node — **install fest required**
- 31 GB RAM, 386 GB free disk, all ports 3000/8000/6379 free
- Sudo password = `1`. Steam is installed (personal/gaming box) — isolate everything in `~/Desktop/Onescan/` and a dedicated venv. Don't touch global Python or system PATH.

**Fallback**: 3090 Ti on a separate machine (not yet surveyed). Architecture-mature Ampere — reach for it if Blackwell install blocks > 1 evening.

### Blackwell (sm_120) specific gotchas — read before installing

The 5070 Ti is sm_120 (Blackwell consumer). Most splat tooling pins older arches.

- **PyTorch**: need **2.6+ with cu128 wheels** (older wheels don't have Blackwell kernels). Install with:
  ```
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
  ```
- **gsplat / nerfstudio**: pre-built wheels likely don't cover sm_120 yet. Plan to build from source with:
  ```
  export TORCH_CUDA_ARCH_LIST="12.0"
  pip install --no-build-isolation git+https://github.com/nerfstudio-project/gsplat.git
  ```
  This requires `nvcc` (CUDA toolkit) + matching `gcc` installed. Budget 10-20 min for the build.
- **Python version**: nerfstudio's `pyproject.toml` typically requires Python ≤ 3.11. System Python is 3.12 → use `uv` (recommended, simpler than conda) to pin a project-local 3.11:
  ```
  curl -LsSf https://astral.sh/uv/install.sh | sh
  uv python install 3.11
  uv venv --python 3.11 .venv
  source .venv/bin/activate
  ```
- **CUDA toolkit (nvcc)**: install via `apt install cuda-toolkit-12-8` after adding NVIDIA's apt repo, OR use the runtime-bundled `nvrtc` from PyTorch and avoid system nvcc entirely if possible. The former is more reliable for source-compiling extensions.

### Quality bar for "validated"

A 60-second iPhone walkthrough of one room must complete the full pipeline in **< 25 minutes** on the 5070 Ti, producing a `.ksplat` **< 60 MB** that looks photoreal in our existing viewer.

---

## 2. New top-level layout

Phase A (bare-metal on the 5070 Ti box):

```
Onescan/
├── (existing Next.js app — no structural changes)
├── worker/                         # ← NEW — lives on the 5070 Ti server
│   ├── pyproject.toml              # uv-managed, Python 3.11 pinned
│   ├── uv.lock
│   ├── onescan_worker/
│   │   ├── __init__.py
│   │   ├── pipeline.py             # the 6-stage pipeline (one function per stage)
│   │   ├── stages/
│   │   │   ├── frames.py           # ffmpeg keyframe extraction + sharpness filter
│   │   │   ├── sfm.py              # COLMAP automatic_reconstructor --mapper GLOBAL
│   │   │   ├── train.py            # ns-train splatfacto wrapper
│   │   │   ├── cleanup.py          # ← critical, see §3.4 — frustum / floater / ground / bbox
│   │   │   └── export.py           # .ply → .ksplat conversion (subprocess to a node script)
│   │   ├── storage.py              # local FS today; pluggable for R2/S3 later
│   │   ├── server.py               # FastAPI: POST /capture, GET /status/{id}
│   │   ├── jobs.py                 # Redis-backed job queue (rq)
│   │   └── settings.py             # env-driven config
│   ├── scripts/
│   │   ├── install.sh              # one-shot: apt install + uv + venv + torch cu128 + gsplat from source
│   │   ├── serve.sh                # start FastAPI + rq worker (foreground)
│   │   └── ply_to_ksplat.mjs       # tiny node wrapper around mkkellogg's converter
│   └── README.md
└── src/lib/splat-provider.ts       # add `LocalSplatProvider`, no other web changes
```

**Phase B** (cloud deploy, later): add `worker/Dockerfile` + `docker-compose.yml` once the bare-metal pipeline runs reliably. Same Python code, different runtime.

Why the worker is a sibling, not a subpackage of the Next.js app: different runtime (Python+CUDA vs Node), different deploy target (GPU box vs Vercel/Cloudflare), and we want them independently versioned and deployable.

---

## 3. The five pipeline stages, with exact tool calls

### 3.1 Frames (`stages/frames.py`)

- Input: `video.mp4` (any iPhone .mov / .mp4)
- Tool: **FFmpeg**
- Goal: ~200 sharp keyframes evenly spaced
- Command shape:
  ```
  ffmpeg -i video.mp4 \
    -vf "thumbnail=N,scale=-2:1080" \
    -vsync vfr -frames:v 250 frames/frame_%04d.jpg
  ```
  Where `N` is computed from input fps × duration to target ~250 frames.
- Then a Python pass with `cv2.Laplacian().var()` to drop the bottom-quartile blur frames.
- Output: `frames/*.jpg` (~150-200 final).
- Wall clock: ~3-10 seconds.

### 3.2 SfM (`stages/sfm.py`)

- Input: `frames/`
- Tool: **COLMAP 4.0** (installed in the container, GPU-enabled)
- Command:
  ```
  colmap automatic_reconstructor \
    --workspace_path workspace \
    --image_path frames \
    --camera_model OPENCV \
    --single_camera 1 \
    --use_gpu 1 \
    --mapper GLOBAL \
    --extractor.feature_type ALIKED \
    --matcher.matcher_type LIGHTGLUE
  ```
- Output: `workspace/sparse/0/` (cameras.bin, images.bin, points3D.bin)
- Failure modes to handle:
  - **< 50% of frames registered** → return `failed` with reason `low_coverage`, hint to re-shoot.
  - **Wall clock > 20 min** → abort, return `failed` with reason `sfm_timeout`.
- Wall clock: ~3-15 min on a 3090 Ti for 200 frames.

### 3.3 Train (`stages/train.py`)

- Input: `workspace/` (COLMAP output) + `frames/`
- Tool: **nerfstudio** (`ns-train splatfacto`)
- Command:
  ```
  ns-train splatfacto \
    --data workspace \
    --output-dir runs/<job_id> \
    --pipeline.model.cull-alpha-thresh 0.005 \
    --pipeline.model.continue-cull-post-densification False \
    --max-num-iterations 15000 \
    --steps-per-eval-image 5000 \
    --viewer.quit-on-train-completion True
  ```
  (15k iterations is the "fast" tier — drop to 30k for the "pro" tier later.)
- Output: `runs/<job_id>/splatfacto/<timestamp>/config.yml` + checkpoint.
- Export to `.ply`:
  ```
  ns-export gaussian-splat \
    --load-config runs/<job_id>/.../config.yml \
    --output-dir runs/<job_id>/export
  ```
- Wall clock: ~8-15 min on 3090 Ti at 15k iters.

### 3.4 Post-process / cleanup (`stages/cleanup.py`) ⚠️ critical

**Raw 3DGS output is never directly usable for SaaS.** This is the stage that
makes the difference between "this is amazing" and "what's that floating
garbage in the air?". It's the stage Luma/Polycam hide behind their API.

What this stage fixes (real estate is particularly affected by all of these):

| Defect | Cause | Symptom in viewer |
|---|---|---|
| **Floaters** | Windows expose sky/trees → SfM places points at infinity → training spawns bright gaussians in empty air | Glowing blobs above the roof, in front of windows |
| **Background bleed** | Splat captures everything camera saw through windows | Street / neighbor's house visible "outside" the listing |
| **Tilted ground** | SfM coordinate frame is arbitrary | Floor slopes; navigation feels drunk |
| **Loose bounding box** | A handful of registered points at the edge | File 5× larger than needed; slow load |
| **Bad initial camera** | Viewer defaults to scene origin | First impression is the corner of a wall |
| **File size** | Raw .ply has full f32 per gaussian | 200-500 MB → unacceptable on mobile |

Pipeline (run in this order):

```
A. Frustum crop        — keep only gaussians inside the union of camera
                         frustums. Removes most background bleed.
B. Opacity / scale     — drop gaussians where opacity < 0.01 OR scale >
   statistical filter    10× median scale. Catches most floaters.
C. Isolated point      — kNN distance: drop gaussians whose 5-th nearest
   removal               neighbor is > N× the median distance.
D. RANSAC ground       — fit dominant plane to bottom 10% of points,
   alignment             rotate so floor is Y=0.
E. AABB crop           — tight axis-aligned box around remaining cluster
                         with small padding (3-5%).
F. Pick initial        — median camera position from COLMAP, point at
   camera                bbox center.
G. Quantize +          — convert .ply → .ksplat with int8/int16
   compress              quantization. 300MB → 5-50MB.
```

Implementation:
- Steps A, C, D, E, F: custom Python with `plyfile` + `numpy` + `scipy`. ~300 lines.
- Step B: use `gsplat`'s built-in `cull_alpha_thresh` / `cull_scale_thresh` helpers, or do it manually on the .ply post-export.
- Step G: shell out to the same node script we use for export, with quantization flag.

Alternative for steps A-F: shell out to **SuperSplat headless** (PlayCanvas,
MIT-licensed, has a CLI mode). Pro: less code to maintain. Con: extra
dependency, less control over thresholds. Recommendation: hand-roll first
(we'll iterate the thresholds for indoor real estate), swap to SuperSplat if
maintenance becomes painful.

**Quality scoring** — at the end of cleanup, emit:

```json
{
  "frames_registered_pct": 0.94,    // from COLMAP
  "mean_reprojection_error": 0.83,  // from COLMAP
  "gaussians_after_cleanup": 412000,
  "gaussians_dropped_pct": 0.18,    // fraction we pruned
  "scene_volume_m3": 38.2           // from bbox dimensions
}
```

Mark the tour as `needs_review` when:
- `frames_registered_pct < 0.85`, OR
- `gaussians_dropped_pct > 0.50` (we threw away half the model), OR
- `gaussians_after_cleanup < 80000` (scene is too sparse to look good).

Realistic split: **~80% of agent-captured scenes pass auto, ~20% need human
review** (in-app editor with manual crop / floater paintover, or re-shoot
request).

Wall clock: ~20-60 sec on CPU.

### 3.5 Web export (`stages/export.py`)

- Input: cleaned + aligned `.ply` from stage 3.4
- Tool: small node script using `@mkkellogg/gaussian-splats-3d`'s converter
- Output: `out/<job_id>.ksplat` (typically 5-50 MB after upstream cleanup)
- Optional secondary output: `.spz` (Niantic format, even smaller — ship once
  the KHR_gaussian_splatting glTF extension ratifies)
- Wall clock: < 30 seconds.

### 3.6 Storage + callback (`storage.py` + `pipeline.py`)

- Move `out/<job_id>.ksplat` to the configured storage backend.
  - Dev: copy to a path the Next.js app serves from (`public/splats/<job_id>.ksplat`).
  - Prod: upload to Cloudflare R2 / S3, return signed URL.
- Callback: POST to `<ONESCAN_API>/api/internal/captures/<provider_capture_id>/done` with `{splat_url, stats}`.

---

## 4. HTTP service shape (`server.py`)

FastAPI inside the same container.

| Method | Path | Body / Returns |
|---|---|---|
| POST | `/capture` | `{video_url, callback_url}` → `{id, status: "queued"}` |
| GET | `/status/{id}` | `{status, progress, splat_url?, error?}` |
| GET | `/healthz` | `{ok, gpu_name, vram_total, vram_free}` |

Auth: a single shared bearer token (env `LOCAL_WORKER_TOKEN`). We're not building auth in this iteration.

Concurrency: one in-flight job per GPU. Queue the rest.

---

## 5. Queue (`jobs.py`)

Pick the simplest thing that works:

- **Redis + `rq`** — battle-tested, observable via `rq-dashboard`, ~50 lines of integration code.
- Alternative: just use a Redis list with `BRPOPLPUSH` for at-least-once. Cuter, less observable.

Default: `rq`. Single worker process pulls one job at a time. Use it for retry + dead-letter queue policy too.

---

## 6. Next.js side — the new `LocalSplatProvider`

In `src/lib/splat-provider.ts`, add a third branch alongside `mock` and `luma`:

```ts
// .env additions
SPLAT_PROVIDER=local
LOCAL_WORKER_URL=http://worker:8000     // service name in docker-compose
LOCAL_WORKER_TOKEN=changeme
LOCAL_PUBLIC_SPLAT_BASE=http://localhost:3000   // where the worker writes ksplats
```

Provider functions:
- `localCreate(input)` → POST `/capture` to the worker, return its job id as `providerCaptureId`.
- `localStatus(id)` → GET `/status/{id}` from the worker, map onto our `CaptureStatus`.

No other web-side code changes — the upload UI, polling loop, tour page, and viewer already speak through the adapter.

Add one new internal API route on the Next.js side so the worker can call us when done (alternative to polling):

| Method | Path |
|---|---|
| POST | `/api/internal/captures/[id]/done` (header `X-Worker-Token`) |

We can also just keep polling and skip the callback; up to taste.

---

## 7. Bare-metal install (Phase A — current target)

The 5070 Ti server starts clean. One install script bootstraps everything.

### 7.1 `worker/scripts/install.sh` (sketch)

```bash
#!/usr/bin/env bash
set -euo pipefail

# System packages (needs sudo password = 1)
sudo apt update
sudo apt install -y build-essential git curl unzip ffmpeg \
    python3-pip pkg-config \
    colmap                             # 3.x from apt — upgrade to 4.0 from source later

# Node (for ply→ksplat conversion). NodeSource:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# CUDA toolkit (nvcc) — needed to compile gsplat for sm_120
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update && sudo apt install -y cuda-toolkit-12-8
export PATH="/usr/local/cuda-12.8/bin:$PATH"
export LD_LIBRARY_PATH="/usr/local/cuda-12.8/lib64:$LD_LIBRARY_PATH"

# uv (Python project manager) — much simpler than conda for this
curl -LsSf https://astral.sh/uv/install.sh | sh

# Project venv with Python 3.11 (nerfstudio compat)
cd ~/Desktop/Onescan/worker
uv python install 3.11
uv venv --python 3.11 .venv
source .venv/bin/activate

# Torch with Blackwell support
uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128

# gsplat from source — Blackwell arch
export TORCH_CUDA_ARCH_LIST="12.0"
uv pip install --no-build-isolation git+https://github.com/nerfstudio-project/gsplat.git

# nerfstudio + the rest
uv pip install nerfstudio fastapi rq redis uvicorn plyfile numpy scipy opencv-python-headless

# Node dep for ksplat conversion
cd scripts && npm install @mkkellogg/gaussian-splats-3d

echo "✓ install complete. Verify with: python -c 'import torch; print(torch.cuda.get_device_name(0))'"
```

Expected wall clock: ~25-40 min, dominated by gsplat source build.

### 7.2 Verify after install

```bash
source .venv/bin/activate
python -c "import torch; assert torch.cuda.is_available(); print(torch.cuda.get_device_name(0), torch.version.cuda)"
# Expect: NVIDIA GeForce RTX 5070 Ti  12.8

ffmpeg -version | head -1     # 4.x or 6.x
colmap -h | head -1            # 3.x (4.0 upgrade is a follow-up)
node --version                 # v20.x
ns-train splatfacto --help | head -3
```

### 7.3 Phase B — Docker (later, when we deploy off-box)

Once Phase A runs cleanly we wrap the same Python code in a `Dockerfile` with CUDA 12.8 base image. That artifact deploys to RunPod or Modal with no further code change. Not needed for the dev box.

```yaml
# worker/docker-compose.yml (Phase B reference, do not implement in Phase A)
services:
  redis: { image: redis:7-alpine, ports: ["6379:6379"] }
  worker:
    build: .
    runtime: nvidia
    deploy: { resources: { reservations: { devices: [{ capabilities: [gpu] }] } } }
    environment: [REDIS_URL=redis://redis:6379/0, LOCAL_WORKER_TOKEN=changeme]
    volumes: ["./splats:/data/splats"]
    ports: ["8000:8000"]
```

---

## 8. Build order (what we'd write in what order)

Each step is independently testable so we don't ship a Big Bang at the end.

| Step | Deliverable | Validates |
|---|---|---|
| 1 | `worker/scripts/install.sh` + `python -c "import torch; print(torch.cuda.get_device_name(0))"` succeeds on the 5070 Ti via SSH. **High risk step — Blackwell gsplat build is the most likely place to fail.** | Bare-metal CUDA + PyTorch + gsplat on Blackwell |
| 2 | `stages/frames.py` CLI: `python -m onescan_worker.stages.frames video.mp4 frames/` | FFmpeg + sharpness filter |
| 3 | `stages/sfm.py` CLI: `python -m onescan_worker.stages.sfm frames/ workspace/` | COLMAP runs to completion on a real video |
| 4 | `stages/train.py` CLI: `python -m onescan_worker.stages.train workspace/ raw.ply` | splatfacto trains, exports raw .ply |
| 5 | `stages/cleanup.py` CLI: `python -m onescan_worker.stages.cleanup raw.ply cleaned.ply` + emits `quality.json` | Frustum crop + floater removal + ground align + bbox. **The most iterative step** — tuning the thresholds is where the agent-experience win lives. |
| 6 | `stages/export.py`: `node scripts/ply_to_ksplat.mjs cleaned.ply out.ksplat` | .ksplat opens in the existing viewer |
| 7 | `pipeline.py` end-to-end CLI: `python -m onescan_worker.pipeline video.mp4 out.ksplat` | The whole pipeline as one command |
| 8 | `server.py` FastAPI + `jobs.py` Redis queue. Manual test via curl. | HTTP surface works |
| 9 | `LocalSplatProvider` in `src/lib/splat-provider.ts` + docker-compose. End-to-end through the browser. | Web → worker → web round-trip |
| 10 | Quality tuning loop: sample 5-10 real iPhone walkthroughs, tweak cleanup thresholds and densification config. Build a small "needs_review" UI for the 20% of scenes that don't pass auto. | Production-readiness for one segment |

After step 6 you already have a usable, scriptable pipeline — that's the "minimum useful" milestone if we have to ship early.

---

## 9. Time + cost estimate (engineering)

| Phase | Steps | Calendar time | Risk |
|---|---|---|---|
| **A: standalone pipeline** | 1-7 | ~5-10 evenings on the 5070 Ti box | **Step 1 (Blackwell install) is the biggest unknown**: gsplat may need patches for sm_120, may take 1 evening of build-debugging alone. Have the 3090 Ti machine as a backup runtime if Blackwell blocks. Cleanup threshold tuning (step 5) is the other open-ended one. |
| **B: web integration** | 8-9 | ~2-3 evenings | Mostly straightforward. Network: web app on laptop, worker on 5070 Ti at `10.170.75.221:8000`. |
| **C: quality tuning** | 10 | open-ended, +1-3 weeks | This is where 80% of the perceived quality gap with Luma lives. The cleanup thresholds (step 5) need real customer scenes to dial in. |

No cloud cost during dev (running on your local GPU). $0-50 for a sample iPhone real-estate video dataset if we need to commission shoots.

---

## 10. What this plan deliberately does NOT include

- ❌ Authentication / multi-tenancy. Single shared bearer token.
- ❌ R2 / S3 upload. Dev writes ksplats to a shared volume; cloud upload is a follow-up.
- ❌ Stripe / billing changes. Pricing already works in mock mode.
- ❌ Modal serverless variant. Easy follow-up — same Python code, different entry point.
- ❌ iPhone capture-guidance app. **Still the #1 product investment** per [SELF-HOST.md §7](SELF-HOST.md). This plan is the *backend independence* track, not the moat track.
- ❌ In-app manual cleanup editor (SuperSplat-style controls for the 20% of scenes that fail auto-cleanup). Out of scope for v1; for those scenes we ask the agent to re-shoot. Build the editor once we have data on how often re-shoots are unacceptable.
- ❌ FastGS or other bleeding-edge trainers. Stick with `splatfacto` for predictability. Revisit when FastGS gets a clean re-implementation on top of `gsplat`.
- ❌ Switching the default for paying users. We'll keep `mock` (or `luma` once you have access) as default; `local` is opt-in via `.env` until validated.

---

## 11. Open decisions for you to make before we start

1. **Iteration count default**: 15k (fast, ~8 min, slightly grainier) vs 30k (~16 min, fuller detail). Default is easy to change later — what's your gut for the "Starter" tier?
2. **Storage backend in dev**: shared volume into `public/splats/` (zero config) vs MinIO-in-docker-compose (mimics R2). Recommend shared volume; MinIO is overkill until we deploy.
3. **Worker callback vs polling**: keep polling like Luma (simpler) or add a webhook from worker → web (lower latency, more code). Recommend polling.
4. **GPU pinning**: should the worker prefer the 3090 Ti (stable) or the 5070 Ti (faster but newer CUDA)? Recommend 3090 Ti by default, expose `CUDA_VISIBLE_DEVICES` to override.
5. **Cleanup implementation**: hand-roll the 7 cleanup steps in Python (more control, more code) vs shell out to SuperSplat headless (less code, less control over indoor-specific thresholds). Recommend **hand-roll** — the threshold-tuning work is exactly where we earn the quality differentiation against Luma, and SuperSplat's CLI defaults are tuned for general scenes, not indoor real estate.
6. **Bare-metal vs Docker for Phase A**: bare-metal directly on the 5070 Ti server (simpler, faster iteration on bleeding-edge driver) vs Docker (closer to prod deploy artifact). Recommend **bare-metal** — Phase B adds Docker for cloud deploy.
7. **Fallback to 3090 Ti machine?**: if step 1 (Blackwell install) blocks > 1 evening, switch the dev worker to the 3090 Ti machine (Ampere has mature CUDA + gsplat wheel support). Decide upfront so we don't sink days debugging Blackwell.

If you have a preference, note it here, otherwise we go with the recommended defaults when we start coding.
