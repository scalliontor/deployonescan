import { UploadFlow } from "@/components/UploadFlow";
import { currentProvider } from "@/lib/splat-provider";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  const provider = currentProvider();
  return (
    <div className="bg-hero min-h-[calc(100vh-65px)]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold md:text-4xl">Create a new tour</h1>
          <p className="mt-2 text-white/65">
            Upload your iPhone walkthrough video. We'll build the 3D Gaussian
            Splat and give you a share link in ~30 minutes.
          </p>
          {provider === "mock" && (
            <div className="mt-4 rounded-lg border border-warm-500/30 bg-warm-500/10 p-3 text-xs text-warm-400">
              <b>Demo mode:</b> processing is simulated (~30 sec) and the result
              will always be the bundled sample scene. Set
              <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5">
                SPLAT_PROVIDER=luma
              </code>
              + <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5">LUMA_API_KEY</code>
              in <code>.env</code> once you have Luma enterprise access.
            </div>
          )}
        </div>
        <UploadFlow />
      </div>
    </div>
  );
}
