# Onescan — Self-Hosted 3DGS Pipeline (Research + Plan)

> "Can't depend on Luma forever." This doc lays out the proper way to run our
> own video → 3D Gaussian Splat pipeline.
> Last updated: 2026-05-28

---

## TL;DR — the recommended stack

| Stage | Tool | License | Why |
|---|---|---|---|
| Video → frames | **FFmpeg** | LGPL/GPL | Standard, fast |
| SfM (camera poses) | **COLMAP 4.0** with `--mapper GLOBAL` (GLOMAP built in) | BSD | 10× faster than legacy COLMAP, free, commercial-safe |
| Splat training | **nerfstudio + splatfacto** (gsplat backend) | Apache 2.0 | Apache-2.0 = commercial-safe; ~same quality as INRIA |
| Export to web | `.ply` → `.ksplat` (mkkellogg converter) | MIT | What our viewer already loads |
| Job orchestration | **Modal** (serverless GPU) for stage-1, **own RunPod RTX 4090** for stage-2 | — | Per-second billing, no idle cost |

**Cost per scene**: ~$0.10–$0.30 self-hosted (Modal) vs. $1 on Luma. Break-even on engineering investment lands around ~500 tours/month.

**Do NOT use**:
- 🚫 INRIA original `graphdeco-inria/gaussian-splatting` — research-only license, requires explicit deal with INRIA for commercial.
- 🚫 OpenSplat — AGPLv3 viral copyleft, would force open-sourcing the entire SaaS.
- 🚫 FastGS (the 100-second trainer) — MIT wrapper but depends on INRIA-licensed code → murky.

---

## 1. Why this matters

Luma is convenient ($1/scene, zero infra) but introduces three risks:

1. **Vendor risk** — Luma is enterprise gated; pricing, SLA, and feature set are at their discretion. They could deprecate the 3D API, raise prices 10×, or build the same vertical product (real estate) and compete with us.
2. **Margin ceiling** — at scale, $1/scene against our $29-49 retail price gives ~96% margin; self-host pushes it to ~99% AND removes the unit economics question for premium tiers (we can offer unlimited tours).
3. **Capability ceiling** — we can't ship features Luma's API doesn't expose: custom training hyperparams for indoor scenes, scene editing, watermark removal, capture-quality scoring, sub-scene chunking.

The plan is therefore: **Luma now as the API for MVP / pilot**, **self-host in parallel** as we approach product-market fit, **flip the switch** in the existing [`splat-provider.ts`](src/lib/splat-provider.ts) adapter once self-host is cheaper or better.

---

## 1.5 Input requirements — **RGB video only, no depth needed**

This is the killer property of 3DGS — and the reason "iPhone is enough" works.

Structure-from-Motion (COLMAP) recovers camera poses + sparse 3D points *from the motion between RGB frames alone*. No LiDAR, no depth sensor, no $6K Matterport rig. Same triangulation principle that humans use with two eyes — except COLMAP does it across hundreds of frames.

### What we accept as input

| Tier | Hardware | Pipeline impact | Quality |
|---|---|---|---|
| **Minimum (default)** | **Any RGB video** — iPhone 8+, every Android, even a webcam | Standard pipeline: ~3-15 min SfM, ~10 min train | Good |
| **Bonus: ARKit VIO poses** | Every iPhone X+ (no LiDAR needed) | SfM 2× faster, never fails on textureless walls | Good + reliable |
| **Bonus: LiDAR depth** | iPhone Pro 12+ only | SfM 3× faster, dense ground truth | Best |

**Default for v1: RGB-only.** ARKit VIO and LiDAR are *optional* fast-paths to add later when the iPhone capture app ships (see [IP-MOAT.md §1.4](IP-MOAT.md)). The pipeline must accept and produce excellent results on plain RGB video from *any* iPhone, or the "no special hardware needed" pitch dies.

### Why this matters strategically

- **iPhone X+ market share** (no LiDAR required): ~85% of iPhones in active US use
- **iPhone Pro 12+ market share** (LiDAR): ~25-30%
- Requiring LiDAR would cut our addressable input device base by **~60%**, plus exclude Android + webcam scenarios entirely. Not acceptable.

### What this means for the worker

The pipeline in §2 is the **RGB-only path**. We never *require* depth or ARKit data. We *opportunistically use* them as priors if the iPhone app sent them along:

- ARKit pose sidecar present → seed COLMAP with prior camera poses → `point_triangulator` instead of `mapper`. Falls back to standard SfM if poses look broken.
- LiDAR depth sidecar present → use as supervision in the initial gaussian densification → fewer iterations to converge. Falls back to standard splatfacto if missing.

Both fall-backs must produce a working tour. Test the RGB-only path *first* and *most often*.

---

## 2. The pipeline, step by step

```
[user iPhone video]
       │
       ▼
┌─────────────────────────────────────┐
│ 1. FFmpeg                           │  ~5 sec
│    Extract 200-500 keyframes        │  Sharp-frame filtering with
│    at ~2-5 fps, deblur low-quality  │  -vf "thumbnail=N,scale=..."
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 2. COLMAP 4.0 (GLOBAL / GLOMAP)     │  ~3-15 min on GPU
│    Feature extraction (ALIKED       │  300 frames → camera poses
│    + LightGlue via ONNX)            │  + sparse point cloud
│    Matching → global SfM            │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 3. nerfstudio: ns-train splatfacto  │  ~8-20 min on RTX 4090
│    (gsplat backend, Apache 2.0)     │  30k iterations standard,
│    Input: COLMAP data dir           │  fewer = faster + less quality
│    Output: trained .ply             │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 4. ply → ksplat converter           │  ~5-30 sec
│    @mkkellogg/gaussian-splats-3d    │  Web-renderable, much smaller
│    Node script                      │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 5. Upload to object storage         │  S3 / R2 / B2
│    Update tour status to "ready"    │  Notify the Onescan API
└─────────────────────────────────────┘
```

**Total wall-clock**: ~15-45 min on an RTX 4090 (the SfM step is often the slowest, not training, post-FastGS-era).

---

## 3. The big decisions

### 3.1 Training implementation — gsplat / nerfstudio wins

| Option | License | Quality (PSNR) | Speed | Notes |
|---|---|---|---|---|
| **nerfstudio + splatfacto** (gsplat) | Apache 2.0 | 27.9 | 20-25 min, 6 GB VRAM | Turnkey CLI `ns-train splatfacto`, best DX |
| **gsplat** (library directly) | Apache 2.0 | 28.1 | 8-20 min, 4 GB VRAM | Library + example scripts. More flexible, more work |
| ~~INRIA original~~ | Research-only | 28.4 | Baseline | **Legally blocked** for SaaS |
| ~~OpenSplat~~ | AGPLv3 | ~28 | Comparable | **AGPL contaminates closed-source SaaS** |
| ~~FastGS~~ | MIT-on-research | ~28 | **100 sec** | Built on INRIA code → license murk |

**Pick nerfstudio for the worker.** When we need to squeeze: drop to raw `gsplat` library + custom training loop. Watch FastGS — if/when it's clean-licensed it gives us a 10× cost reduction.

### 3.2 SfM — COLMAP 4.0 with GLOMAP global mapper

COLMAP 4.0 (Dec 2025) absorbed GLOMAP. One command:

```bash
colmap automatic_reconstructor \
    --workspace_path ./workspace \
    --image_path ./frames \
    --mapper GLOBAL          # ← GLOMAP, ~10× faster than incremental
```

It also added **ALIKED + LightGlue via ONNX** — modern learned features that match better in textureless indoor scenes (which is *exactly* what real estate is). Critical for our quality.

Alternative — **MASt3R-SfM** (image-only, no incremental matching). Promising for hard scenes but quality is inconsistent. Keep an eye on it; don't bet on it yet.

### 3.3 SfM-free splat training (the future, not yet)

There's an active research stream on splat training that skips COLMAP entirely (NoPoSplat, Splatt3R, InstantSplat). For real-estate-typical 200-500 frames they're not yet production-quality. Revisit in 6 months.

### 3.4 The `.ply` → web format question

Three web formats are in play:

- **`.splat`** (antimatter15 binary format) — universally supported, simple
- **`.ksplat`** (mkkellogg compressed) — what *our* viewer already loads, smallest size
- **`.spz`** (Niantic) — best compression, KHR_gaussian_splatting extension to glTF expected Q2 2026

**Use `.ksplat`** — matches what `[SplatViewer.tsx](src/components/SplatViewer.tsx)` is already wired up for. Plan to also emit `.spz` for the embed widget once the glTF extension ratifies.

---

## 4. Where to run the GPU — three deployment shapes

### Shape A: Serverless GPU (start here)

**Modal** is the cleanest. Per-second billing, autoscale to zero, no node management.

```python
# worker.py — fully managed, scale-to-zero
import modal

stub = modal.Stub("onescan-splat")
image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg", "colmap")
    .pip_install("nerfstudio", "torch")
)

@stub.function(gpu="H100", image=image, timeout=2400)
def process(video_url: str) -> str:
    # 1. download video
    # 2. ffmpeg → frames
    # 3. colmap automatic_reconstructor --mapper GLOBAL
    # 4. ns-train splatfacto --max-num-iterations 15000
    # 5. ply → ksplat
    # 6. upload ksplat to R2, return URL
    ...
```

- Cost: ~$0.001097/sec on H100 → ~$0.45 per 7-min job, or ~$0.20 on A100, or ~$0.06 on RTX 4090 (if Modal exposes one in your region).
- Pros: zero infra, perfect for spiky early-stage traffic.
- Cons: 30-60 sec cold start, 3× multiplier on production tier, can't keep models warm across jobs cheaply.

**Replicate** is the other choice — even simpler API, pay per second, but their pricing is ~2× Modal's for equivalent GPUs. Use only if you specifically want their cog-deploy flow.

### Shape B: Dedicated single GPU (next)

Spin up one RunPod pod with an RTX 4090 ($0.34/hr on-demand, $0.24/hr spot) running 24/7. Drain a job queue (Redis/BullMQ).

- Cost: ~$245/mo always-on, breaks even vs Modal at ~50-80 scenes/month.
- Pros: warm models, deterministic latency, predictable bill.
- Cons: pay even when idle. Manual restart if it falls over.

### Shape C: Owned hardware (at scale)

A workstation with one or two RTX 4090s (~$1,800 each) on your own internet. Amortizes in ~6 months at moderate volume. Most defensible margins.

- Cost: ~$0.02/scene (electricity only).
- Pros: best unit economics, no vendor.
- Cons: you operate it. Plan for failure / failover. Don't do this before 500+ tours/month.

### Cost cheat-sheet (per scene, ~7-min job on a single GPU)

| Setup | $/scene | Notes |
|---|---|---|
| Luma API | $1.00 | What we use today |
| Modal H100 (production tier) | $0.45 | Easiest self-host on-ramp |
| Modal A100 | $0.20 | Sweet spot for quality |
| RunPod RTX 4090 (on-demand, drained queue) | $0.06 | If utilization > ~30% |
| RunPod RTX 4090 (spot) | $0.04 | OK if you handle preemption |
| Owned RTX 4090 (electricity) | $0.02 | Hardware amortized |

Hidden costs to add on top: ~$0.10/scene for object storage egress over a year, ~$0.05/scene for ops/monitoring at small scale.

---

## 5. How this plugs into Onescan (architecture)

Add a third option to the existing [`splat-provider.ts`](src/lib/splat-provider.ts) adapter:

```ts
// .env
SPLAT_PROVIDER=local        // new
LOCAL_WORKER_URL=https://splat-worker.onescan.app
LOCAL_WORKER_TOKEN=...
```

The Next.js API just POSTs the video URL to the worker and polls the same way it polls Luma today. The viewer URL ends up identical (`.ksplat` in R2 / S3). **No frontend changes needed.**

```
[Onescan Next.js API]                 [Modal worker (or RunPod pod)]
        │                                     │
        ├─ POST /capture ───────────────────► │
        │     { video_url, callback }         │  (queue job, return id)
        │                                     │
        │◄── { provider_capture_id } ─────────┤
        │                                     │
        │                                     │  ┌─ pipeline ─┐
        │                                     │  │ ffmpeg     │
        │                                     │  │ COLMAP     │
        │                                     │  │ ns-train   │
        │                                     │  │ ply→ksplat │
        │                                     │  └────────────┘
        │                                     │
        │                                     │  upload to R2
        │                                     │
        │◄── POST /webhook (status=ready,─────┤
        │       splat_url=https://r2/…)       │
        │                                     │
        ├── updateTour(status=ready)          │
```

Two phases to ship it:

**Phase 1 (week 1-2): get the pipeline running on one machine.**
- Dockerfile with CUDA 12.4 + ffmpeg + COLMAP 4.0 + nerfstudio
- A Python `worker.py` that takes `video_url` → outputs `.ksplat` to local disk
- Manual: run it on a rented RunPod RTX 4090, validate quality on 5 sample real-estate videos

**Phase 2 (week 3-4): wrap it in an HTTP service + plug into Onescan.**
- FastAPI server inside the container with `/capture`, `/status/{id}` endpoints + a callback webhook
- Add `LocalSplatProvider` in `src/lib/splat-provider.ts`
- Add Modal deploy as the alternative runtime
- Add R2 (Cloudflare) bucket for ksplat hosting

**Phase 3 (months 2-3): optimize.**
- Tune `ns-train splatfacto` for indoor real-estate scenes (max iterations, densification thresholds)
- Try fewer iterations (15k instead of 30k) for the "fast" tier
- Watch FastGS license clarification → potential 10× speedup
- Add capture-quality scoring: refuse to process if SfM finds < N% of frames usable; tell the agent to re-shoot specific rooms

---

## 6. The realistic schedule and what to do *next*

**Today → next 90 days**: keep `SPLAT_PROVIDER=luma` (or mock for demo). Don't burn engineering on infra before we have agents paying for tours. The adapter already exists and the swap is one env var.

**At ~50 paying tours/month**: build Phase 1 of the self-host pipeline as a side investment. Validate quality on real customer scenes. Cost is still dominated by Luma at this volume; this is a quality/IP investment, not yet a cost one.

**At ~200+ paying tours/month**: ship Phase 2. Run both providers in parallel for a month. A/B on a fraction of new tours. Compare quality and complaint rates.

**At ~500+ paying tours/month**: flip default to `local`. Keep Luma as fallback for outages and capacity bursts.

**At ~2000+/month**: consider Shape C (owned hardware). At this volume the engineering investment is clearly justified.

---

## 7. Open questions to track

1. **FastGS license clarity** — if it gets a clean re-implementation on top of gsplat, our training time drops 10× → fundamentally changes the cost model. Watch the repo.
2. **MASt3R-SfM maturity** — could remove COLMAP entirely. Most fragile step in the pipeline today. Re-evaluate Q3 2026.
3. **SPZ / glTF extension ratification** (Q2 2026) — once shipped, our embed widget should emit both .ksplat (legacy) and .spz (new). Bigger files but better compression and toolchain support.
4. **iPhone capture guidance** — *the actual moat*. None of this matters if 30% of agent-captured videos are too shaky for COLMAP to converge. The capture app is more important than the self-host pipeline. See [BUSINESS.md](BUSINESS.md) §9.

---

## Sources

- [graphdeco-inria/gaussian-splatting (LICENSE — research only)](https://github.com/graphdeco-inria/gaussian-splatting/blob/main/LICENSE.md)
- [nerfstudio-project/gsplat (Apache 2.0)](https://github.com/nerfstudio-project/gsplat)
- [nerfstudio splatfacto docs](https://docs.nerf.studio/nerfology/methods/splat.html)
- [pierotofy/OpenSplat (AGPLv3 — avoid for closed SaaS)](https://github.com/pierotofy/OpenSplat)
- [FastGS — CVPR 2026 highlight (license caveat)](https://github.com/fastgs/FastGS)
- [COLMAP 4.0 + GLOMAP integration](https://www.baristalabs.io/blog/colmap-4-glomap-openimageio-breaking-change-2026)
- [Modal pricing 2026 — per-second GPU billing](https://www.morphllm.com/modal-pricing)
- [RunPod pricing — RTX 4090 $0.34/hr](https://www.runpod.io/pricing)
- [GPU pricing comparison 2026 (Lambda, RunPod, Modal)](https://www.buildmvpfast.com/api-costs/gpu)
- [Spheron — deploy 3DGS on GPU cloud (2026 guide)](https://www.spheron.network/blog/deploy-3d-gaussian-splatting-gpu-cloud/)
