/**
 * Runtime splat cleanup — parses an antimatter15 .splat file in the browser,
 * filters out floaters / outliers / background bleed, and returns a Blob URL
 * the viewer can load directly.
 *
 * Format reminder — each splat is 32 bytes:
 *   bytes  0-11  position  (3 × float32)
 *   bytes 12-23  scale     (3 × float32)
 *   bytes 24-27  color     (4 × uint8: R, G, B, A)
 *   bytes 28-31  rotation  (4 × uint8 quaternion, /128 normalized)
 *
 * Why this exists: raw .splat captures from any pipeline (Mip-NeRF dataset,
 * Luma, COLMAP+gsplat, etc.) include:
 *  - background bleed (sky / outside-window splats)
 *  - opaque-but-isolated "floater" gaussians
 *  - extremely large gaussians that smear over the scene
 * Manually cleaning each file in SuperSplat is painful. Doing it once at load
 * time, with sensible defaults, makes every scene look "demo-ready".
 *
 * Cleanup pipeline applied (in order):
 *  1. opacity filter  — drop splats with alpha < `minAlpha` (default 8/255)
 *  2. scale filter    — drop splats with max-axis-scale > `maxScaleMultiplier`
 *                       times the median (catches degenerate huge gaussians)
 *  3. percentile crop — drop splats outside the [lowPct, highPct] percentile
 *                       bounding box on each axis (catches background outliers
 *                       and isolated floaters; preserves the dense cluster)
 *
 * For the demo scenes (room.splat / nike.splat / plush.splat) the defaults
 * remove ~15-30% of splats and clean up obvious noise without losing scene
 * fidelity.
 */

const BYTES_PER_SPLAT = 32;

export type CleanupOptions = {
  /** Skip cleanup entirely — return file as-is. */
  disabled?: boolean;
  /** Drop splats with alpha (uint8) below this. Default 8. */
  minAlpha?: number;
  /** Drop splats whose largest scale > this × median scale. Default 8. */
  maxScaleMultiplier?: number;
  /** Lower percentile (0..0.5) for percentile crop. Default 0.02. */
  lowPercentile?: number;
  /** Upper percentile (0.5..1.0). Default 0.98. */
  highPercentile?: number;
};

export type CleanupResult = {
  /** Object URL of the cleaned .splat — pass to viewer.addSplatScene */
  url: string;
  /** Stats for telemetry / debugging */
  stats: {
    inputCount: number;
    outputCount: number;
    droppedAlphaPct: number;
    droppedScalePct: number;
    droppedCropPct: number;
    inputBytes: number;
    outputBytes: number;
    elapsedMs: number;
  };
};

/**
 * Fetch + clean. Returns a blob URL caller is responsible for revoking.
 */
export async function fetchAndCleanSplat(
  url: string,
  opts: CleanupOptions = {}
): Promise<CleanupResult> {
  const t0 = performance.now();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Splat fetch failed: HTTP ${res.status} (${url})`);
  }
  const buf = await res.arrayBuffer();

  if (opts.disabled) {
    const blob = new Blob([buf], { type: "application/octet-stream" });
    return {
      url: URL.createObjectURL(blob),
      stats: {
        inputCount: buf.byteLength / BYTES_PER_SPLAT,
        outputCount: buf.byteLength / BYTES_PER_SPLAT,
        droppedAlphaPct: 0,
        droppedScalePct: 0,
        droppedCropPct: 0,
        inputBytes: buf.byteLength,
        outputBytes: buf.byteLength,
        elapsedMs: performance.now() - t0,
      },
    };
  }

  const minAlpha = opts.minAlpha ?? 8;
  const maxScaleMul = opts.maxScaleMultiplier ?? 8;
  const lowPct = opts.lowPercentile ?? 0.02;
  const highPct = opts.highPercentile ?? 0.98;

  const inputCount = Math.floor(buf.byteLength / BYTES_PER_SPLAT);
  const view = new DataView(buf);

  // ── Stage 1: opacity + scale filter ────────────────────────────────────────
  // Keep a survivor index list. Also collect surviving splats' positions for
  // the percentile crop in stage 3.
  const survivor = new Uint8Array(inputCount); // 0 = drop, 1 = keep
  const survivorScales = new Float32Array(inputCount); // max-axis scale per splat
  let droppedAlpha = 0;
  let droppedScale = 0;

  for (let i = 0; i < inputCount; i++) {
    const base = i * BYTES_PER_SPLAT;
    const alpha = view.getUint8(base + 27);
    if (alpha < minAlpha) {
      droppedAlpha++;
      continue;
    }
    const sx = view.getFloat32(base + 12, true);
    const sy = view.getFloat32(base + 16, true);
    const sz = view.getFloat32(base + 20, true);
    // antimatter15 .splat stores RAW scale, sometimes log-space. Use absolute
    // value to be robust; outliers in either domain will dwarf the median.
    const s = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
    survivor[i] = 1;
    survivorScales[i] = s;
  }

  // Median scale across survivors (using a sampled sort for perf)
  const sampleSize = Math.min(50_000, inputCount);
  const sampleStride = Math.max(1, Math.floor(inputCount / sampleSize));
  const sample: number[] = [];
  for (let i = 0; i < inputCount; i += sampleStride) {
    if (survivor[i]) sample.push(survivorScales[i]);
  }
  sample.sort((a, b) => a - b);
  const medianScale = sample[Math.floor(sample.length / 2)] || 1;
  const maxScaleAllowed = medianScale * maxScaleMul;

  for (let i = 0; i < inputCount; i++) {
    if (survivor[i] && survivorScales[i] > maxScaleAllowed) {
      survivor[i] = 0;
      droppedScale++;
    }
  }

  // ── Stage 2: percentile bbox crop ─────────────────────────────────────────
  // Sample positions of survivors, compute per-axis percentiles, drop anything
  // outside the box. This catches background bleed AND isolated floaters
  // without depending on a manual crop region.
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (let i = 0; i < inputCount; i += sampleStride) {
    if (!survivor[i]) continue;
    const base = i * BYTES_PER_SPLAT;
    xs.push(view.getFloat32(base, true));
    ys.push(view.getFloat32(base + 4, true));
    zs.push(view.getFloat32(base + 8, true));
  }
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  zs.sort((a, b) => a - b);

  const pct = (arr: number[], p: number) =>
    arr[Math.max(0, Math.min(arr.length - 1, Math.floor(arr.length * p)))];

  const xMin = pct(xs, lowPct);
  const xMax = pct(xs, highPct);
  const yMin = pct(ys, lowPct);
  const yMax = pct(ys, highPct);
  const zMin = pct(zs, lowPct);
  const zMax = pct(zs, highPct);

  let droppedCrop = 0;
  for (let i = 0; i < inputCount; i++) {
    if (!survivor[i]) continue;
    const base = i * BYTES_PER_SPLAT;
    const x = view.getFloat32(base, true);
    const y = view.getFloat32(base + 4, true);
    const z = view.getFloat32(base + 8, true);
    if (x < xMin || x > xMax || y < yMin || y > yMax || z < zMin || z > zMax) {
      survivor[i] = 0;
      droppedCrop++;
    }
  }

  // ── Repack survivors into a new buffer ────────────────────────────────────
  let outputCount = 0;
  for (let i = 0; i < inputCount; i++) if (survivor[i]) outputCount++;

  const outBuf = new ArrayBuffer(outputCount * BYTES_PER_SPLAT);
  const inBytes = new Uint8Array(buf);
  const outBytes = new Uint8Array(outBuf);
  let dst = 0;
  for (let i = 0; i < inputCount; i++) {
    if (!survivor[i]) continue;
    outBytes.set(
      inBytes.subarray(i * BYTES_PER_SPLAT, (i + 1) * BYTES_PER_SPLAT),
      dst * BYTES_PER_SPLAT
    );
    dst++;
  }

  const blob = new Blob([outBuf], { type: "application/octet-stream" });
  const blobUrl = URL.createObjectURL(blob);

  return {
    url: blobUrl,
    stats: {
      inputCount,
      outputCount,
      droppedAlphaPct: droppedAlpha / inputCount,
      droppedScalePct: droppedScale / inputCount,
      droppedCropPct: droppedCrop / inputCount,
      inputBytes: buf.byteLength,
      outputBytes: outBuf.byteLength,
      elapsedMs: performance.now() - t0,
    },
  };
}
