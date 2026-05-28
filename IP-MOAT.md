# Onescan — Technical IP & Moat Strategy

> What do *we* actually invent in a sea of open-source 3DGS tools?
> Last updated: 2026-05-28
>
> Companion doc to [BUSINESS.md](BUSINESS.md) (the *why*) and
> [SELF-HOST.md](SELF-HOST.md) (the *plumbing*). This doc is the *algorithm
> stack* — where our brain time goes.

---

## TL;DR — 3 tiers, where they map our brain time

| Tier | Area | % brain time | Why |
|---|---|---|---|
| **1** | Capture-side AI (iPhone) | **~50%** | Highest defensibility. Needs labeled data only we will have. The product-defining moment is the agent's 15-minute scan, not our worker farm. |
| **2** | Indoor-tuned cleanup + segmentation | **~30%** | Where the *visible quality gap* with Luma/Polycam lives. Tunable per vertical = generic tools can't match. |
| **3** | Engineering plumbing | **~20%** | Required to operate, but not where defensibility comes from. Pipeline, queues, multi-GPU. |

**What we explicitly do NOT invent**:
- ❌ A new 3DGS training algorithm. We use [gsplat / splatfacto](https://github.com/nerfstudio-project/gsplat) (Apache 2.0). Marginal quality gains aren't worth competing on; faster training also isn't, because SfM is the wall-clock bottleneck.
- ❌ A new SfM algorithm. COLMAP 4.0 + GLOMAP is state-of-the-art and free.
- ❌ A new web viewer renderer. `@mkkellogg/gaussian-splats-3d` is fine.

The brutal truth: anyone can clone our pipeline backend in a week with public repos. Our defensibility lives upstream (capture) and in the vertical-specific layer (cleanup, segmentation, real estate features).

---

## Tier 1 — Capture-side AI (iPhone) 📱

> The 15 minutes the agent spends walking through the house is *where the product is born*. Everything we do downstream is damage control on what the camera captured. Owning the capture experience is the moat.

### 1.1 Real-time capture quality scoring

**What it does**: While the agent is filming, the app continuously scores the current frame on (a) sharpness, (b) exposure, (c) overlap with recent frames, (d) motion blur magnitude. Frames below threshold are dropped from the upload set in real time. The agent sees a single "quality bar" — green / yellow / red — without needing to understand the components.

**Why it matters**: ~30-40% of amateur-captured real estate videos fail SfM convergence in our pipeline today (industry-wide number for indoor 3DGS attempts). The reason is almost always that 20-50% of frames are too blurry / too dark / too redundant. Filtering at capture time is 100× cheaper than discovering it 15 minutes later on the server.

**Implementation**:
- Stack: Swift / React Native + native iOS module. `AVFoundation` for frame access, Core ML for any on-device model.
- Sharpness: Variance of Laplacian on a downscaled grayscale frame. ~1 ms per frame.
- Exposure: Histogram entropy. ~1 ms.
- Overlap with previous frame: ORB feature matching, or simpler — compare ARKit `worldTransform` deltas. ~3 ms.
- Motion blur: gyroscope angular velocity at frame capture time. ~free.
- All four combine into a 0-100 score with a small handcrafted weighting (no ML needed for v1).
- **Later**: train a CoreML model on labeled (frame → "ended up usable in final splat" Y/N) examples, replace handcrafted scoring.

**Prior art / lookalikes**:
- 3D Scanner App (Laan Labs) — has a "capture quality" indicator, but for LiDAR, not video for splatting.
- Polycam's capture UI — does similar but mostly post-hoc, not real-time enough to course-correct.
- Apple's Object Capture sample — has a similar "needs more views" prompt for photogrammetry.

**Data flywheel**: Every uploaded scan + whether it converged in SfM is a labeled training pair. After ~500 scans we can train a model that beats the handcrafted scoring. After ~5000 we can train per-scene-type variants (open-plan vs cramped rooms).

**Defensibility**: 6-12 months of customer scans = a dataset no general-purpose 3D tool will have. The model only needs to be 5-10% better than competitor heuristics to noticeably improve hit-rate.

---

### 1.2 Live coverage map (AR overlay)

**What it does**: As the agent walks, an AR overlay shows surfaces that have been "well-covered" in green and surfaces that are "needs more views" in red. The agent walks until everything is green. Like a primitive minimap.

**Why it matters**: The #1 cause of bad splats after blur is *underrepresented surfaces* — agent walked past the kitchen counter at one angle only, so it's noisy in the result. Telling them "you missed this surface" *during* capture saves a re-shoot.

**Implementation**:
- Use ARKit's `ARWorldMap` + `ARMeshAnchor` to get a coarse low-poly mesh of the environment in real time. (ARKit gives you this for free on LiDAR phones; computes a rough mesh from monocular on non-LiDAR.)
- For each mesh face, track "how many distinct viewpoints have seen this face at < 30° grazing angle" using ray tests against ARKit's camera pose stream.
- Color mesh face green when count ≥ 3, yellow if 1-2, red if 0.
- Overlay the mesh with semi-transparent SceneKit rendering during capture.

**Prior art**:
- Apple's Object Capture has a similar coverage prompt for objects (not rooms).
- Polycam mobile has a basic "you captured X% of the scene" but no per-surface granularity.

**Defensibility**: Comes from the AR UX tuning ("when is the agent annoyed by the overlay vs guided by it?") and the threshold tuning for what "enough coverage" means for splatting specifically. Both require real-world A/B on agents.

---

### 1.3 Path guidance

**What it does**: When the agent is unsure where to go next, the app shows AR arrows: "walk to the door behind you, then turn left into the next room." Like Google Maps for rooms.

**Why it matters**: First-time users freeze. They scan one corner of one room, can't figure out the right path, give up. Path guidance turns a 5-min "what do I do now?" into a 5-min walkthrough.

**Implementation**:
- Use ARKit's `ARMeshAnchor` to detect doorway openings (gaps in mesh wider than ~70cm at floor-to-ceiling height).
- Maintain a graph: rooms = nodes (clusters of mesh anchors), doorways = edges.
- Greedy "visit all rooms with shortest backtrack" → next-room arrow.
- After a room is "complete" (coverage map mostly green), point arrow at the unscanned room.

**Prior art**:
- Niantic Lightship has a similar guided-capture flow for object scans.
- Spectolab's "ScanFlow" tutorial overlays for car scanning.
- Nobody we know of is doing it for room-level real estate at quality.

**Defensibility**: Moderate. The graph-based pathing is straightforward; the moat is the *UX of how the arrow is displayed and timed* — too aggressive and the agent fights it, too soft and they miss rooms. Requires user testing.

---

### 1.4 ARKit pose bootstrap for COLMAP

**What it does**: When the iPhone app finishes capture, it uploads not just the frames but also the ARKit camera pose for each frame. The server-side COLMAP uses these poses as the initial guess, skipping the expensive `incremental_mapper` / `global_mapper` from-scratch search.

**Why it matters**: This is a *backend* algorithm that depends on a *frontend* feature. COLMAP today often takes 5-10 minutes on textureless walls (white-painted hallways = real estate every day) because feature matching is sparse. With ARKit poses as a prior, COLMAP converges in 30-90 seconds and never fails to register frames.

**Implementation**:
- iOS side: log `ARCamera.transform` for each saved frame. Upload as a JSON sidecar.
- Server side: pre-populate `images.bin` with these poses (camera-to-world). Run COLMAP `point_triangulator` instead of `mapper` (the latter searches for poses; the former trusts ours and just triangulates points).
- Optional: run a final 1-iteration `bundle_adjuster` to refine.

**Prior art**:
- Apple's Object Capture API does this internally.
- Polycam's iPhone-only flow likely does this (their cloud is fast on iPhone captures but slower on uploaded video from elsewhere).
- Open-source: `colmap-arkit-poser` (small repo, MIT) — proof of concept, not production.

**Defensibility**: Speed (5-10× faster pipeline) + reliability (no SfM failures on white walls). This is *the* reason Polycam is faster than uploading a random video to Luma. Without it we can't compete on turnaround time.

---

### Tier 1 build sequencing

- **Cannot start before**: ~50 paying tours captured through the Luma+web pipeline. We need scans to label and a real iPhone app makes no sense without users to put it on.
- **Phase 1 (months 3-5)**: Real-time quality scoring (§1.1) + ARKit pose bootstrap (§1.4). These two alone unlock most of the value.
- **Phase 2 (months 5-7)**: Coverage map (§1.2).
- **Phase 3 (months 7-9)**: Path guidance (§1.3).

---

## Tier 2 — Indoor-tuned cleanup + segmentation 🏠

> Generic 3DGS tools (Polycam, Luma's general API) produce outputs tuned for *all* scenes. We tune for *one* — interior residential. Same algorithms, vertical-specific thresholds + ML models trained on indoor data only.

### 2.1 Indoor floater classifier

**What it does**: After splat training, decide for each gaussian: keep or drop? Generic floater removers (opacity threshold, scale threshold, isolation distance) either throw away too much (mistake ceiling fixtures for floaters) or leave too much (window-induced floaters in front of glass).

**Why it matters**: Floaters are *the* most visible defect to a non-technical viewer ("what's that bright stuff in the air?"). Even one bad floater per scene makes the tour look unprofessional.

**Implementation**:
- v1 (in [PLAN-LOCAL-WORKER.md §3.4](PLAN-LOCAL-WORKER.md) already): hand-tuned thresholds for opacity, scale, and isolation, calibrated on 5-10 indoor scenes.
- v2: small XGBoost / random forest on per-gaussian features (opacity, scale, color saturation, distance to nearest neighbor, depth from nearest camera, view angle frequency) → labeled examples from human-cleaned scenes.
- v3: tiny PointNet variant on local neighborhoods → end-to-end learning of "floater-ness" from labeled examples.

**Prior art**:
- SuperSplat has manual paint-to-delete + a generic "isolated point" filter. We beat them by being learned, not heuristic.
- Research: "RaDe-GS" and "Mip-Splatting" reduce floaters via training-side regularization (changes the train step). Different lever, complementary.

**Data needed**: Per-gaussian labels on ~50 scenes (5-10 minutes of human cleanup per scene). Small dataset, but the cleanup is tedious — invest in good labeling UI early.

**Defensibility**: Same data flywheel as §1.1. After 200+ scenes the model is hard to replicate without our customer base.

---

### 2.2 Room segmentation

**What it does**: Take the cleaned point cloud and partition it into named rooms ("Living Room", "Kitchen", "Master Bedroom"). Without this we either (a) make agents tag rooms by hand, or (b) ship a tour with no room labels — both lose. Auto-segmentation makes room-hotspot navigation *free*.

**Why it matters**: Room-based navigation is *the* feature buyers want — "show me the master bath, skip the laundry room." Matterport sells this as a premium feature. We give it free as part of every tour.

**Implementation**:
- Extract horizontal floor plane (already done in cleanup §3.4 step D).
- Slice point cloud at ~1.2m above floor → 2D occupancy grid where 1 = wall.
- Watershed segmentation on the 2D occupancy → room regions.
- Identify doorways as gaps in wall lines of width ~70-90 cm.
- For each room region, classify type (living / bed / bath / kitchen) by:
  - v1: heuristics — bath has reflective tiles (small specular bbox); kitchen has dense reflective horizontal surfaces (countertops); bed has the largest horizontal soft surface (bed); else "room".
  - v2: small image classifier on a rendered top-down view of each room → trained on labeled real estate listings.

**Prior art**:
- "RoomNet" (2017) → image-based room layout estimation. Older, but ideas reusable.
- Real estate floor plan extraction is its own field (CubiCasa, magicplan); they don't operate on splats today.
- ZeroNVS, PaperGen rooms — research, not production-ready.

**Defensibility**: Modest at the algorithm level (graduate-level computer vision), strong at the data level — labeled real-estate scans by room type is a unique dataset.

---

### 2.3 Floor plan auto-extraction (the flagship)

**What it does**: Generate a 2D floor plan from the splat. Walls, doors, room labels, dimensions in feet/meters. Matterport charges $90 extra per listing for this; we include it.

**Why it matters**: Floor plans are the single most-shared artifact buyers ask for. Generating one from a splat we already have is a near-free upsell that costs Matterport nothing-but-they-still-charge-for-it. This is the "you pay for tour, you get floor plan free" wedge.

**Implementation**:
- Inputs: cleaned + ground-aligned point cloud, room segmentation (§2.2).
- Wall extraction: 2D slice at ~1m, Hough transform on dense regions → wall line segments.
- Door / window detection: vertical gaps in wall lines.
- Room labels: from §2.2.
- Dimensions: pixel distances × scale factor from SfM.
- Render: SVG output, ready to embed or PDF-export.

**Prior art**:
- CubiCasa, magicplan — commercial floor plan from photos / LiDAR scans. Not from splats today.
- Research: "Floor-SP" (Stanford), "MonteFloor" — point cloud → floor plan, used on LiDAR scans of buildings. Our setting (single splat from iPhone) is harder, but tractable.

**Defensibility**: Floor plan extraction is real, hard CV work. Even if competitors copy the splat pipeline, they're 6 months behind on getting decent floor plans out. This is the feature *they* will license from *us* eventually.

---

### 2.4 Auto virtual staging

**What it does**: Detect empty rooms in the splat. AI-add furniture (sofa, dining table, bed) using 3D asset library + scene-aware placement → render into the viewer as toggleable layer.

**Why it matters**: Vacant listings sell 10-30% slower (industry stat). Virtual staging services cost $50-200 per room and take days. Doing it auto, in-tour, toggleable on/off, would be a category-defining feature.

**Implementation**:
- Detect "empty" rooms via §2.2 segmentation + check ratio of horizontal surfaces above floor (low → empty).
- Furniture library: 3D models from free/licensed libraries (Polyhaven, Quaternius, paid stock).
- Placement: room type from §2.2 → layout template (bed against longest wall, dining centered, etc.).
- Render: load furniture meshes alongside the splat in the viewer.

**Prior art**:
- Virtual Staging AI, BoxBrownie — 2D photo virtual staging only. No 3D.
- This is genuinely a wedge nobody has built well yet.

**Defensibility**: This is more product than algorithm — designer-curated furniture sets matter as much as the placement algorithm. But once we have it dialed in, agents will pick us over Matterport for *this feature alone*.

---

### Tier 2 build sequencing

- **Floater classifier (§2.1)** — start immediately as part of [PLAN-LOCAL-WORKER.md §3.4](PLAN-LOCAL-WORKER.md). v1 hand-tuned thresholds are required *anyway* to ship any self-host.
- **Room segmentation (§2.2)** — month 2 of self-host. Needed as input for §2.3.
- **Floor plan (§2.3)** — month 3-4. Real differentiator.
- **Virtual staging (§2.4)** — month 6+. Big-ticket feature, validate with a few pilot agents first.

---

## Tier 3 — Engineering plumbing ⚙️

Necessary, not differentiating. The honest list:

- Job orchestration (already planned: Redis + rq → Modal serverless later).
- Multi-GPU scheduling (when we own > 1 GPU box).
- Retry / dead-letter / human-review queue (the 20% of scenes that fail auto-cleanup).
- Object storage tiering (hot R2 for first 90 days, cold B2 archive after).
- Monitoring + cost analytics per scene.
- Auth / multi-tenancy / brokerage hierarchy (when we hit team accounts).

These are well-understood problems with off-the-shelf solutions. **Do not invent here.** Use Postgres + S3-compatible storage + Vercel/Cloudflare Workers for everything possible. Reserve engineering brain for Tiers 1-2.

---

## What "shipping order" looks like with this framework

Layered on top of [SELF-HOST.md §6](SELF-HOST.md):

| Stage | Tours/month | What to build |
|---|---|---|
| **Today → 50** | Luma + mock | Polished demo MVP (done), agent acquisition |
| **50-200** | Luma → start self-host pipeline | Tier 2 §2.1 (floater classifier v1). Collect scans + labels for Tier 1 data flywheel. |
| **200-500** | Self-host parallel + A/B | Tier 2 §2.2 (room segmentation), §2.3 (floor plan). iPhone capture app PoC — Tier 1 §1.1 + §1.4. |
| **500-1500** | Self-host default | Tier 1 §1.1-§1.4 production. Tier 2 §2.4 (virtual staging) pilot. |
| **1500+** | Owned GPU + reserved cloud | Continual model retraining from data flywheel. |

The compounding logic:
- Months 0-3: pipeline works at all (use Luma).
- Months 3-9: pipeline works *better than competitors* (Tier 2 cleanup tuned to real estate).
- Months 9-18: *capture experience* is unmatched (Tier 1, requires data we now have).
- Months 18+: competitors must replicate our customer dataset to catch up. **That's the moat.**

---

## What we'd license / partner for instead of building

To stay focused, we should be willing to license:

- **3D furniture assets** (for §2.4 virtual staging) — partner with a 3D asset marketplace before building our own.
- **Privacy redaction** (license plate / face blur) — license from one of the existing computer-vision API vendors. Not our core work.
- **Voice tours / narration** (eventual feature) — license TTS from ElevenLabs etc.
- **Buyer CRM integration** (for the lead capture pipeline) — integrate with Follow Up Boss, kvCORE, BoomTown via their APIs. Don't build a CRM.

---

## Honest caveats

1. **The biggest moat — capture-side AI — requires data we don't have yet.** Until we have 200+ real customer scans labeled, our "moat" is just a plan. The plan only matters if we execute the Luma+web pipeline first to collect that data. **No data = no moat.**

2. **Tier 2 floor plan extraction is hard.** Real floor plans from splats is published-paper-level work. We should budget for hiring a senior CV engineer or partnering with academic researchers when we get there.

3. **Patents are unlikely to be the right defensibility lever** in this space — research is moving too fast and getting patents on combinations of public methods is rarely enforceable. Defensibility comes from data and customer relationships, not patents.

4. **3DGS may be commoditized in 24 months.** If Apple ships a native iOS "Splat Capture" API in iOS 20 (plausible given their Object Capture work), our Tier 1 capture-side work loses some defensibility — but we'd still have Tiers 2 and the vertical relationships. Plan for this contingency.
