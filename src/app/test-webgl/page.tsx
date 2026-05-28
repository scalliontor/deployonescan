"use client";

import { useEffect, useRef, useState } from "react";

export default function TestWebGLPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [diag, setDiag] = useState<Record<string, string>>({});

  useEffect(() => {
    const out: Record<string, string> = {};
    const ua = navigator.userAgent;
    out["User agent"] = ua;

    // Test WebGL availability — IMPORTANT: use a FRESH canvas per context
    // type. A canvas can only hold one context — once .getContext("webgl") is
    // called, .getContext("webgl2") on the same canvas returns null.
    const probeGL1 = document.createElement("canvas").getContext("webgl");
    const probeGL2 = document.createElement("canvas").getContext("webgl2");
    out["WebGL1 available"] = probeGL1 ? "YES" : "NO";
    out["WebGL2 available"] = probeGL2 ? "YES" : "NO";

    const gl = probeGL2 || probeGL1;
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        out["GPU vendor"] = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "(unknown)";
        out["GPU renderer"] = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "(unknown)";
      }
      out["Max texture size"] = `${gl.getParameter(gl.MAX_TEXTURE_SIZE)}px`;
      out["SharedArrayBuffer"] = typeof SharedArrayBuffer !== "undefined" ? "YES" : "NO";
      out["Worker"] = typeof Worker !== "undefined" ? "YES" : "NO";
      out["WebAssembly"] = typeof WebAssembly !== "undefined" ? "YES" : "NO";
      out["Cross-Origin Isolated"] = (window as any).crossOriginIsolated ? "YES" : "NO";
    }
    setDiag(out);

    // Try to render a Three.js cube as a basic WebGL test
    if (!probeGL2 || !containerRef.current) return;

    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const THREE = await import("three");
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x070912);
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 3;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(400, 400);
        containerRef.current!.innerHTML = "";
        containerRef.current!.appendChild(renderer.domElement);
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshNormalMaterial();
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        let raf = 0;
        const animate = () => {
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.015;
          renderer.render(scene, camera);
          raf = requestAnimationFrame(animate);
        };
        animate();
        cleanup = () => {
          cancelAnimationFrame(raf);
          renderer.dispose();
        };
      } catch (e: any) {
        setDiag((d) => ({ ...d, ["Three.js error"]: e?.message || String(e) }));
      }
    })();

    return () => cleanup?.();
  }, []);

  return (
    <div className="min-h-screen bg-ink-950 p-6 text-white">
      <h1 className="text-2xl font-bold">WebGL diagnostic</h1>
      <p className="mt-2 text-white/65">
        If you see a spinning multicolor cube below, WebGL is working in your
        browser. If not, your browser is the issue — try Chrome / Edge / Firefox
        latest, or enable hardware acceleration.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-white/55">
            Three.js cube
          </div>
          <div
            ref={containerRef}
            className="mt-2 grid h-[400px] w-[400px] place-items-center rounded-lg border border-white/10 bg-ink-900 text-white/40"
          >
            (initializing…)
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-white/55">
            Browser capabilities
          </div>
          <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-ink-900 p-4 text-xs">
            {Object.entries(diag).map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-44 shrink-0 text-white/55">{k}:</span>
                <span
                  className={
                    v === "NO"
                      ? "text-red-400"
                      : v === "YES"
                      ? "text-accent-500"
                      : "text-white break-all"
                  }
                >
                  {v}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-white/55">
            <p className="font-semibold text-white/80">What we need for the splat viewer:</p>
            <ul className="mt-2 space-y-1">
              <li>· WebGL2: <span className="text-accent-500">required</span></li>
              <li>· Worker + WebAssembly: <span className="text-accent-500">required</span></li>
              <li>· SharedArrayBuffer: nice-to-have (faster sorting)</li>
              <li>· Max texture size ≥ 4096: required for typical scenes</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 text-sm text-white/65">
        <a href="/tour/demo" className="text-accent-500 hover:underline">
          ← Back to /tour/demo
        </a>
      </div>
    </div>
  );
}
