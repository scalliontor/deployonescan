"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "form" | "uploading" | "processing" | "ready" | "failed";

export function UploadFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState(0);
  const [tourId, setTourId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [agentName, setAgentName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Poll status after submit
  useEffect(() => {
    if (!tourId) return;
    if (step !== "uploading" && step !== "processing") return;
    let timer: any;
    const poll = async () => {
      try {
        const r = await fetch(`/api/tours/${tourId}/status`);
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        setProgress(j.progress ?? 0);
        if (j.status === "processing") setStep("processing");
        if (j.status === "ready") {
          setStep("ready");
          setTimeout(() => router.push(`/tour/${tourId}`), 800);
          return;
        }
        if (j.status === "failed") {
          setStep("failed");
          setError("Processing failed. Please try again.");
          return;
        }
        timer = setTimeout(poll, 800);
      } catch (e: any) {
        setStep("failed");
        setError(e?.message || "Polling failed");
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [tourId, step, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep("uploading");
    try {
      const r = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled Listing",
          address,
          agentName,
          agentBrokerage: brokerage,
          // In mock mode we don't actually send the video bytes anywhere; the
          // mock provider doesn't need them. With a real Luma integration this
          // would be a multipart upload to a signed URL.
          videoFilename: file?.name,
          videoSize: file?.size,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setTourId(j.tour.id);
    } catch (e: any) {
      setStep("failed");
      setError(e?.message || "Upload failed");
    }
  };

  if (step !== "form") {
    return (
      <div className="card p-8">
        <ProcessingPanel step={step} progress={progress} error={error} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-8">
      <div>
        <label className="mb-1 block text-sm text-white/70">Listing title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="1847 Sycamore Lane"
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/70">Address (shown on tour)</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Mill Valley, CA · 3 bed · 2 bath"
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-white/70">Your name</label>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Jane Realtor"
            className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">Brokerage</label>
          <input
            value={brokerage}
            onChange={(e) => setBrokerage(e.target.value)}
            placeholder="Cedar & Oak Real Estate"
            className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-white/70">iPhone walkthrough video</label>
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-white/15 bg-ink-800/40 p-8 text-center transition hover:border-accent-500/60 hover:bg-ink-800/70">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div>
              <div className="text-accent-500">✓ {file.name}</div>
              <div className="mt-1 text-xs text-white/50">
                {(file.size / 1024 / 1024).toFixed(1)} MB · click to change
              </div>
            </div>
          ) : (
            <div className="text-white/70">
              <div className="text-3xl">📱</div>
              <div className="mt-2">Drop your iPhone video here, or click to browse</div>
              <div className="mt-1 text-xs text-white/50">
                Aim for 15-25 min · walk slowly · pan up/down · capture every corner
              </div>
            </div>
          )}
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-white/55">
          By submitting you agree to ~$29 / tour (mocked — no charge).
        </div>
        <button type="submit" className="btn-primary">
          Process my tour →
        </button>
      </div>
    </form>
  );
}

function ProcessingPanel({
  step,
  progress,
  error,
}: {
  step: Step;
  progress: number;
  error: string | null;
}) {
  const pct = Math.max(2, Math.round(progress * 100));
  const stages = [
    { id: "uploading", label: "Uploading video" },
    { id: "processing", label: "Building Gaussian Splat" },
    { id: "ready", label: "Tour ready" },
  ];
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 h-12 w-12">
          {step === "ready" ? (
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-500 text-ink-950 text-2xl">
              ✓
            </div>
          ) : step === "failed" ? (
            <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/20 text-red-400 text-2xl">
              ✗
            </div>
          ) : (
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-accent-500" />
          )}
        </div>
        <div className="text-xl font-semibold">
          {step === "ready"
            ? "Your tour is ready — redirecting…"
            : step === "failed"
            ? "Something went wrong"
            : step === "uploading"
            ? "Uploading…"
            : "Processing…"}
        </div>
        <div className="mt-1 text-sm text-white/60">
          {step === "ready"
            ? "Opening your shareable tour page."
            : step === "failed"
            ? error
            : "Real processing takes ~30 min. This demo simulates the flow in ~30 sec."}
        </div>
      </div>

      {step !== "failed" && (
        <div>
          <div className="mb-2 flex justify-between text-xs text-white/55">
            <span>{pct}%</span>
            <span>{step === "ready" ? "Done" : "Estimated < 30 min"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full bg-accent-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {stages.map((s) => {
          const reached =
            (s.id === "uploading" && progress > 0) ||
            (s.id === "processing" && progress > 0.05) ||
            (s.id === "ready" && step === "ready");
          return (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              <div
                className={`grid h-6 w-6 place-items-center rounded-full ${
                  reached ? "bg-accent-500 text-ink-950" : "bg-ink-800 text-white/40"
                }`}
              >
                {reached ? "✓" : "·"}
              </div>
              <span className={reached ? "text-white" : "text-white/50"}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
