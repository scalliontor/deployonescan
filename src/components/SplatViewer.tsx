"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  splatUrl: string;
  className?: string;
  onReady?: () => void;
};

type LogLine = { level: "info" | "warn" | "error"; text: string; t: number };

// All presets use Y-up (standard Three.js + antimatter15 .splat convention).
// Y-down or Z-up presets caused degenerate camera orientations on some scenes
// when combined with auto-fit lookAt — rendering went blank. Auto-fit
// repositions cameras anyway, so position deltas here are mostly cosmetic.
const CAMERA_PRESETS: Array<{
  name: string;
  cameraUp: [number, number, number];
  position: [number, number, number];
  lookAt: [number, number, number];
}> = [
  { name: "auto", cameraUp: [0, 1, 0], position: [0, 2, 8], lookAt: [0, 0, 0] },
  { name: "front", cameraUp: [0, 1, 0], position: [0, 0, 8], lookAt: [0, 0, 0] },
  { name: "side", cameraUp: [0, 1, 0], position: [8, 0, 0], lookAt: [0, 0, 0] },
  { name: "top", cameraUp: [0, 1, 0], position: [0, 8, 0.1], lookAt: [0, 0, 0] },
  { name: "wide", cameraUp: [0, 1, 0], position: [4, 4, 12], lookAt: [0, 0, 0] },
];

export function SplatViewer({ splatUrl, className, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const log = (level: LogLine["level"], text: string) => {
    setLogs((l) => [...l, { level, text, t: Date.now() }]);
    // also to console
    if (level === "error") console.error("[SplatViewer]", text);
    else if (level === "warn") console.warn("[SplatViewer]", text);
    else console.log("[SplatViewer]", text);
  };

  useEffect(() => {
    let cancelled = false;
    let viewer: any = null;
    const preset = CAMERA_PRESETS[presetIdx];
    setLogs([]);
    log("info", `boot · preset=${preset.name} · url=${splatUrl}`);

    async function boot() {
      if (!hostRef.current) return;

      // 1. Probe WebGL2
      const probe = document.createElement("canvas");
      const gl2 = probe.getContext("webgl2");
      if (!gl2) {
        const err = "WebGL2 not available in this browser. Splat viewer requires WebGL2.";
        log("error", err);
        setError(err);
        return;
      }
      log("info", `WebGL2 OK · MAX_TEXTURE_SIZE=${gl2.getParameter(gl2.MAX_TEXTURE_SIZE)}`);

      // 2. Pre-fetch the splat to detect 404 / network error early
      try {
        const res = await fetch(splatUrl, { method: "HEAD" });
        if (!res.ok) {
          const err = `Splat fetch failed: HTTP ${res.status} for ${splatUrl}`;
          log("error", err);
          setError(err);
          return;
        }
        const sz = res.headers.get("content-length");
        const ct = res.headers.get("content-type");
        log("info", `splat HEAD OK · size=${sz}B · type=${ct}`);
      } catch (e: any) {
        log("error", `splat HEAD threw: ${e?.message || e}`);
      }

      // 3. Load the splat library
      let Viewer: any;
      try {
        const mod = await import("@mkkellogg/gaussian-splats-3d");
        Viewer = mod.Viewer;
        log("info", "library imported");
      } catch (e: any) {
        const err = `library import failed: ${e?.message || e}`;
        log("error", err);
        setError(err);
        return;
      }
      if (cancelled || !hostRef.current) return;

      // 4. Construct viewer
      try {
        viewer = new Viewer({
          rootElement: hostRef.current,
          cameraUp: preset.cameraUp,
          initialCameraPosition: preset.position,
          initialCameraLookAt: preset.lookAt,
          sharedMemoryForWorkers: false,
          // GPU sort is FASTER but unreliable on some integrated GPUs
          // (AMD Vega integrated, older Intel) — splats fail to render with
          // no error. CPU sort always works. Use CPU as default; switch to
          // GPU only after a per-device capability check.
          gpuAcceleratedSort: false,
          enableSIMDInSort: false,
          dynamicScene: false,
          antialiased: false,
          ignoreDevicePixelRatio: false,
          sphericalHarmonicsDegree: 0,
        });
        viewerRef.current = viewer;
        log("info", "viewer constructed");
        // Non-black clear color — many splat scenes contain dark surfaces
        // that disappear against pure black. A muted neutral makes them
        // pop without competing with the splat colors.
        try {
          const r = (viewer as any).renderer || (viewer as any).webGLRenderer;
          if (r?.setClearColor) r.setClearColor(0x1a1f2e, 1);
        } catch {}
      } catch (e: any) {
        const err = `viewer construct failed: ${e?.message || e}`;
        log("error", err);
        setError(err);
        return;
      }

      // 5. Add splat scene. Alpha threshold MUST be 0 for antimatter15
      // .splat files (their alpha encoding differs from KSplat); higher
      // thresholds silently cull every splat → blank scene.
      try {
        await viewer.addSplatScene(splatUrl, {
          splatAlphaRemovalThreshold: 0,
          showLoadingUI: true,
          progressiveLoad: false,
        });
        log("info", "addSplatScene resolved");
        // Try to read splat count
        try {
          const mesh = viewer.splatMesh;
          const n = mesh?.getSplatCount?.() ?? mesh?.splatCount ?? null;
          if (n != null) log("info", `splat count = ${n}`);
        } catch {}
      } catch (e: any) {
        const err = `addSplatScene failed: ${e?.message || e}`;
        log("error", err);
        setError(err);
        return;
      }

      if (cancelled) return;
      try {
        viewer.start();
        log("info", "viewer.start() called — rendering loop active");
      } catch (e: any) {
        const err = `viewer.start failed: ${e?.message || e}`;
        log("error", err);
        setError(err);
        return;
      }

      // Auto-fit camera by sampling splat centers — mkkellogg lib exposes
      // splatMesh.scenes[i].splatBuffer with various accessor methods that
      // have shifted across versions. Try a few, log what works.
      try {
        const THREE = await import("three");
        // Wait a tick for splat data to be ready
        await new Promise((r) => setTimeout(r, 300));
        const mesh = viewer.splatMesh;
        const scene0 = mesh?.scenes?.[0];
        const buffer = scene0?.splatBuffer;

        // EMPIRICAL FIX: adding any object to the underlying Three.js scene
        // forces mkkellogg's render pipeline to flush state correctly.
        // Without this, splats parse + load but the splat geometry attribute
        // updates don't propagate to the first frame → invisible.
        const threeScene =
          (viewer as any).threeScene || (viewer as any).scene || mesh?.parent;
        if (threeScene?.add) {
          const trigger = new THREE.Object3D();
          trigger.visible = false;
          threeScene.add(trigger);
          log("info", "scene flush trigger added");
        }

        if (!buffer) {
          log("warn", "auto-fit: no splatBuffer found, using preset camera");
        } else {
          const count: number =
            buffer.getSplatCount?.() ??
            buffer.splatCount ??
            mesh.getSplatCount?.() ??
            0;
          log("info", `auto-fit: probing ${count} splats`);
          const bbox = new THREE.Box3();
          const tmp = new THREE.Vector3();
          const step = Math.max(1, Math.floor(count / 2000));
          let probed = 0;
          for (let i = 0; i < count; i += step) {
            if (typeof buffer.getSplatCenter === "function") {
              buffer.getSplatCenter(i, tmp);
            } else if (buffer.splatCenters) {
              const j = i * 3;
              tmp.set(
                buffer.splatCenters[j],
                buffer.splatCenters[j + 1],
                buffer.splatCenters[j + 2]
              );
            } else {
              break;
            }
            if (Number.isFinite(tmp.x)) {
              bbox.expandByPoint(tmp);
              probed++;
            }
          }
          if (probed === 0) {
            log("warn", "auto-fit: no positions readable");
          } else {
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            log(
              "info",
              `bbox: center=(${center.toArray().map((n) => n.toFixed(2)).join(",")}) size=(${size.toArray().map((n) => n.toFixed(2)).join(",")})`
            );

            const dist = maxDim * 1.8;
            const cam = viewer.camera;
            // Force standard up before lookAt — preset cameraUp may have been
            // inverted in older state, which makes lookAt produce a degenerate
            // matrix and render blank.
            cam.up.set(0, 1, 0);
            cam.position.set(
              center.x + dist * 0.7,
              center.y + dist * 0.4,
              center.z + dist * 0.7
            );
            cam.lookAt(center);
            cam.updateMatrixWorld();
            if (viewer.controls?.target) {
              viewer.controls.target.copy(center);
              viewer.controls.update?.();
            }
            log("info", `camera fit: distance=${dist.toFixed(2)}`);
          }
        }
      } catch (e: any) {
        log("warn", `auto-fit error: ${e?.message || e}`);
      }

      setLoaded(true);
      onReady?.();
    }

    boot();

    return () => {
      cancelled = true;
      try {
        viewer?.dispose?.();
      } catch {}
      viewerRef.current = null;
      if (hostRef.current) {
        while (hostRef.current.firstChild) {
          hostRef.current.removeChild(hostRef.current.firstChild);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splatUrl, presetIdx, reloadKey]);

  const cyclePreset = () => {
    setLoaded(false);
    setPresetIdx((i) => (i + 1) % CAMERA_PRESETS.length);
  };
  const resetView = () => {
    setLoaded(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className={className ?? "relative h-full w-full"}>
      <div ref={hostRef} className="absolute inset-0" />

      {!loaded && !error && (
        <div className="absolute inset-0 grid place-items-center bg-ink-950/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-white/80">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-accent-500" />
            <div className="text-sm">Loading 3D scene…</div>
            <div className="text-[11px] text-white/40">{splatUrl}</div>
          </div>
        </div>
      )}

      {/* Camera + debug controls */}
      <div className="pointer-events-auto absolute right-3 top-24 z-30 flex flex-col gap-1.5 md:right-4 md:top-28">
        <button
          onClick={cyclePreset}
          className="rounded-full border border-white/10 bg-ink-950/80 px-3 py-1.5 text-[11px] text-white/75 backdrop-blur hover:bg-ink-950 hover:text-white"
          title="Cycle camera presets"
        >
          🎥 {CAMERA_PRESETS[presetIdx].name}
        </button>
        <button
          onClick={resetView}
          className="rounded-full border border-white/10 bg-ink-950/80 px-3 py-1.5 text-[11px] text-white/75 backdrop-blur hover:bg-ink-950 hover:text-white"
        >
          ↻ Reset
        </button>
        <button
          onClick={() => setDebugOpen((v) => !v)}
          className="rounded-full border border-white/10 bg-ink-950/80 px-3 py-1.5 text-[11px] text-white/75 backdrop-blur hover:bg-ink-950 hover:text-white"
        >
          🐞 Debug {debugOpen ? "▾" : "▸"}
        </button>
      </div>

      {/* Debug log panel */}
      {debugOpen && (
        <div className="pointer-events-auto absolute right-3 top-44 z-30 max-h-[60vh] w-[26rem] overflow-auto rounded-xl border border-white/10 bg-ink-950/95 p-3 text-[11px] text-white/80 backdrop-blur md:right-4 md:top-48">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wide text-white/55">
              Viewer trace
            </span>
            <a
              href="/test-webgl"
              className="text-accent-500 hover:underline"
              target="_blank"
              rel="noopener"
            >
              Open WebGL test →
            </a>
          </div>
          {logs.length === 0 && <div className="text-white/40">(no logs yet)</div>}
          <pre className="whitespace-pre-wrap font-mono text-[10.5px] leading-snug">
            {logs
              .map(
                (l) =>
                  `[${l.level.toUpperCase().padEnd(5)}] ${l.text}`
              )
              .join("\n")}
          </pre>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-ink-950/95 p-6 text-center">
          <div className="max-w-lg space-y-3">
            <div className="text-lg font-semibold text-red-400">3D scene unavailable</div>
            <div className="text-sm text-white/70">{error}</div>
            <div className="text-xs text-white/50">
              Asset URL: <code className="text-white/70">{splatUrl}</code>
            </div>
            <a
              href="/test-webgl"
              className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white hover:bg-white/10"
            >
              Run WebGL diagnostic →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
