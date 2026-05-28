/**
 * SplatProvider — abstracts the 3D Gaussian Splatting backend.
 *
 * The MockProvider drives the investor-demo flow: a fake processing animation
 * that resolves to the bundled sample scene. It's the default.
 *
 * The LumaProvider is a clearly-marked stub. Luma AI's video-to-3D capture
 * API is enterprise/contact-sales (their public docs only cover Dream Machine
 * video gen). Once you obtain the real endpoint + auth from Luma, fill in the
 * three TODO sections below and switch SPLAT_PROVIDER=luma in .env.
 */

import type {
  CaptureStatus,
  CreateCaptureInput,
  CreateCaptureResult,
  ProviderName,
} from "./types";

const SAMPLE_SPLAT_URL =
  process.env.NEXT_PUBLIC_SAMPLE_SPLAT || "/splats/room.splat";

// ── MOCK PROVIDER ────────────────────────────────────────────────────────────
//
// Stateless: the start timestamp is encoded in the capture id, so status
// queries don't depend on any in-memory map (which would not survive across
// Next.js route handler invocations).

const MOCK_PROCESSING_MS = 28_000; // ~28s — long enough to feel real, short enough for a demo

function mockCreate(_input: CreateCaptureInput): CreateCaptureResult {
  const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { providerCaptureId: id, splatUrl: SAMPLE_SPLAT_URL };
}

function mockStatus(captureId: string): { status: CaptureStatus; progress: number; splatUrl: string } {
  const parts = captureId.split("_");
  const startedAt = parts.length >= 2 ? Number(parts[1]) : NaN;
  if (!Number.isFinite(startedAt)) {
    return { status: "failed", progress: 0, splatUrl: SAMPLE_SPLAT_URL };
  }
  const pct = Math.min(1, (Date.now() - startedAt) / MOCK_PROCESSING_MS);
  if (pct < 0.05) return { status: "uploading", progress: pct, splatUrl: SAMPLE_SPLAT_URL };
  if (pct < 1) return { status: "processing", progress: pct, splatUrl: SAMPLE_SPLAT_URL };
  return { status: "ready", progress: 1, splatUrl: SAMPLE_SPLAT_URL };
}

// ── LUMA PROVIDER (stub — requires enterprise access) ────────────────────────

async function lumaCreate(input: CreateCaptureInput): Promise<CreateCaptureResult> {
  const apiKey = process.env.LUMA_API_KEY;
  const base = process.env.LUMA_API_BASE || "https://api.lumalabs.ai";
  if (!apiKey) {
    throw new Error(
      "SPLAT_PROVIDER=luma but LUMA_API_KEY is not set. Falling back to mock is the default; set the key or revert .env to SPLAT_PROVIDER=mock."
    );
  }
  // TODO(luma-enterprise): replace this stub with the real endpoint once you
  // have the spec from Luma's enterprise team. Best-guess shape based on their
  // public Dream Machine API conventions:
  const res = await fetch(`${base}/dream-machine/v1/captures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { video_url: input.videoUrl },
      output: { format: "gaussian_splat" },
      title: input.title,
    }),
  });
  if (!res.ok) {
    throw new Error(`Luma create-capture failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return {
    providerCaptureId: json.id,
    splatUrl: json.assets?.splat_url || SAMPLE_SPLAT_URL,
  };
}

async function lumaStatus(captureId: string): Promise<{ status: CaptureStatus; progress: number; splatUrl: string }> {
  const apiKey = process.env.LUMA_API_KEY;
  const base = process.env.LUMA_API_BASE || "https://api.lumalabs.ai";
  const res = await fetch(`${base}/dream-machine/v1/captures/${captureId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Luma status failed: ${res.status}`);
  }
  const json = await res.json();
  // TODO(luma-enterprise): map Luma's actual status fields onto our CaptureStatus.
  const lumaState: string = json.state || "queued";
  const map: Record<string, CaptureStatus> = {
    queued: "queued",
    uploading: "uploading",
    processing: "processing",
    completed: "ready",
    failed: "failed",
  };
  return {
    status: map[lumaState] || "processing",
    progress: typeof json.progress === "number" ? json.progress : 0,
    splatUrl: json.assets?.splat_url || SAMPLE_SPLAT_URL,
  };
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

function getProvider(): ProviderName {
  const p = (process.env.SPLAT_PROVIDER || "mock").toLowerCase();
  return p === "luma" ? "luma" : "mock";
}

export async function createCapture(input: CreateCaptureInput): Promise<CreateCaptureResult> {
  return getProvider() === "luma" ? lumaCreate(input) : mockCreate(input);
}

export async function getCaptureStatus(captureId: string) {
  return getProvider() === "luma" ? lumaStatus(captureId) : mockStatus(captureId);
}

export function currentProvider(): ProviderName {
  return getProvider();
}
