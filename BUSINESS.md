# Onescan — Business Model Exploration

> **Self-serve.** Real estate agent films their listing with their own iPhone → interactive 3D Gaussian Splatting walkthrough. Real estate first.
> Last updated: 2026-05-28

> **Not** a managed service. We do not dispatch photographers. The agent's phone *is* the camera. This is the whole point — Matterport-quality output without Matterport's $6K hardware or $200-500 per visit service fee.

---

## 1. Why this idea is interesting *right now*

Three events in the last 12 months made this a real opportunity, not a science project.

| Event | Date | Why it matters |
|---|---|---|
| CoStar acquired Matterport for **$1.6B** | Feb 2025 | Validates the category. 3D-tour-of-real-estate is a billion-dollar market. |
| Zillow dropped Matterport from its platform | Oct 2025 | The incumbent lost its biggest distribution channel. Open lane for a replacement. |
| Zillow launched SkyTour (Gaussian Splatting) | 2025 | Confirms 3DGS, not Matterport's stitched-panorama tech, is the future. |

Matterport grew from $46M (2019) → $170M (2024) and from 13K → 1M+ subscribers. The pie is real. The leader is now a CoStar subsidiary and just lost Zillow. **The seat is open.**

## 2. The market

- **TAM**: Global virtual tour market projected to hit **$74.4B by 2030**, 34.3% CAGR.
- **SAM (real estate)**: ~40% of enterprise virtual-tour usage = real estate. Matterport's $170M is a floor, not a ceiling.
- **Distribution**: 54% of buyers *won't consider* a property without virtual images. Listings with 3D tours get +87% views, +49% qualified leads, sell +31% faster — these are the agent's sales pitch to *us*.

## 3. Why Gaussian Splatting beats Matterport

| | Matterport | 3DGS (Onescan) |
|---|---|---|
| Camera | $6,000+ rig on tripod | Smartphone |
| Capture | Walk to fixed points, scan, repeat | One continuous 15-25 min walkthrough |
| Navigation | "Teleport" between dots | Smooth, continuous, photoreal |
| File format | Proprietary lock-in | Open (PLY, glTF+KHR_gaussian_splatting Q2 2026) |
| Viewer | Proprietary | Any browser |

The capture cost collapses by ~100×. That changes who can offer the service.

## 4. Competitors

### General-purpose 3D scanning (horizontal)
- **Luma AI** — free + enterprise. Best free output. **Video-to-3D API costs $1/scene.** General-purpose.
- **Polycam** — $8/mo. Mobile-first, photogrammetry + 3DGS.
- **KIRI Engine** — $10/mo. Mobile + cloud.
- **Postshot** — $15/mo. Desktop, strong for architecture.

**None of them are real-estate-vertical.** They sell a tool, not a workflow for an agent.

### Real estate incumbents
- **Matterport** — $45/mo+. Premium, requires their hardware. Now owned by CoStar.
- **Zillow 3D Home** — free, low quality (panoramas). Free distribution but commodity output.
- **iGUIDE** — $29/project. Floor-plan-centric.
- **Splat Labs** — early 3DGS-for-real-estate player. Sells hardware + subscription. Direct competitor.

### The gap
Per industry sources: **"zero US-based companies offer professional Gaussian Splatting as a named commercial service"** at scale. Splat Labs exists but bundles expensive hardware. There is no "Polycam-for-real-estate" — no SaaS that takes a phone video and gives an agent a Matterport-quality, branded, embed-anywhere listing tour at sub-Matterport pricing.

## 5. The actual moat (it is NOT the splatting tech)

Luma will sell you a splat for $1. The defensible business is built *on top* of that:

1. **Real-estate-tuned capture guidance** — most agent-captured scenes look bad. An on-screen "walk slower, point camera up here" guide is worth more than a faster training algorithm.
2. **Vertical viewer UX** — room labels, hotspots ("granite countertops, installed 2024"), measurement tool, floor plan toggle, lead-capture form embedded in the tour itself.
3. **MLS / Zillow / portal integration** — embed code that works everywhere agents already publish.
4. **Per-listing pricing agents already understand** — $25-50 per tour, not SaaS subscription. Photographers already charge $200-500 for a 3D tour add-on; we undercut them with software.

## 6. Monetization options (ranked)

| Model | Price | Pro | Con |
|---|---|---|---|
| **Pay-per-tour** ⭐ | $29-49 per listing | Matches agent budget; no commitment | Cash flow lumpy |
| **Agent SaaS** | $39-79/mo unlimited | Predictable MRR | Hard to land cold |
| **Brokerage white-label** | $2K-10K/mo per office | Big contracts | Long sales cycle |
| **API for portals** | $0.50-2 per processed scene | Highest scale ceiling | Compete with Luma directly |

> Explicitly NOT pursuing: photographer/managed-service marketplace. The product *is* the agent's iPhone. Sending humans defeats the cost-collapse advantage that makes this idea work.

**Recommended starting wedge**: pay-per-tour for solo agents, with a $39/mo "5 tours/mo" plan as the upgrade path. Matches how agents already buy photography.

## 7. Unit economics (back-of-envelope)

Per tour at $39 pay-per-tour:
- Luma API cost: $1
- Storage + bandwidth: ~$0.50/mo (kept hot 6 months avg)
- Stripe + ops: ~$1.50
- **Gross margin: ~$36 per tour, ~90%**

Even at $19/tour pricing, margin is ~85%. The business works.

## 8. Risks / what would kill this

1. **Luma releases a real-estate vertical product** themselves. Mitigation: move fast, lock in brokerage deals, build distribution moat.
2. **Zillow opens SkyTour to agents directly, free**. Mitigation: agents still need branded, embed-anywhere tours that are *not* locked to Zillow's portal.
3. **Capture quality from average agents is too bad to be a usable product**. Mitigation: this is exactly why guided capture is the #1 product feature, not the splatting algorithm.
4. **A "Photographer-as-a-service" marketplace beats us** by sending humans with the right setup. Mitigation: we are 10× cheaper and 10× faster than dispatching a human; let humans serve the luxury tier.

## 9. The 12-month sequence

1. **Months 1-2** — Investor-demo MVP (this build). Polished web app, one pre-baked stunning scene, mock upload flow, vertical UX visible.
2. **Months 2-4** — Real pipeline. Wrap Luma API. Real upload → real processing → real viewer. Onboard 5 friendly agents.
3. **Months 4-8** — Capture-guidance mobile app. This is when the product becomes hard to copy.
4. **Months 8-12** — MLS/portal integrations. Brokerage pilots. Raise seed.

## 10. The decision for the MVP

**Demo target: investors.** So the MVP must show *the vision* convincingly, not prove the pipeline at scale.

Right answer: **polished web app + real working 3DGS viewer with a pre-baked stunning real-estate scene + mocked upload/processing flow + visible vertical features (hotspots, floor plan, measure, embed, branded).** Buildable in this session. Real splatting backend gets plugged in after the demo lands a check.

---

## Sources

- [Virtual Tours Built a Billion-Dollar Industry. Gaussian Splatting Is Building the Next One](https://www.splatlabs.ai/blog/virtual-tours-real-estate-gaussian-splatting)
- [Matterport vs Zillow 3D Tours — A Realtor's Guide for 2026](https://www.pinnaclerealestatemarketing.com/real-estate-marketing-guides/matterport-vs-zillow-3-d-tours/)
- [Zillow SkyTour Uses Gaussian Splats — Lidar News](https://lidarnews.com/zillow-3d-tours-with-gaussian-splatting/)
- [State of Gaussian Splatting 2026 — Standards and Tools](https://www.thefuture3d.com/blog/state-of-gaussian-splatting-2026/)
- [Luma AI Video-to-3D API — $1 per capture](https://www.linkedin.com/posts/karanganesan_announcing-luma-ais-video-to-3d-api-costs-activity-7046206426259599360-6BBs)
- [Best Gaussian Splatting Software Comparison 2026](https://www.polyvia3d.com/guides/gaussian-splatting-tools-comparison)
- [Deploy 3D Gaussian Splatting on GPU Cloud — Spheron](https://www.spheron.network/blog/deploy-3d-gaussian-splatting-gpu-cloud/)
- [3D Virtual Tours: Complete Guide for Real Estate Agents — HomeJab](https://homejab.com/3d-virtual-tours-complete-guide-for-real-estate-agents/)
