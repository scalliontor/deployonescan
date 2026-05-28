"use client";

import { useState } from "react";
import { SplatViewer } from "./SplatViewer";
import { ViewerOverlay } from "./ViewerOverlay";
import { ViewOptionsPanel } from "./ViewOptionsPanel";
import type { Tour } from "@/lib/types";
import type { CleanupOptions } from "@/lib/splat-cleanup";

const DEFAULT_CLEANUP: CleanupOptions = {
  minAlpha: 8,
  maxScaleMultiplier: 8,
  lowPercentile: 0.02,
  highPercentile: 0.98,
};

export function ViewerWithOverlay({ tour }: { tour: Tour }) {
  const [cleanup, setCleanup] = useState<CleanupOptions>(DEFAULT_CLEANUP);
  return (
    <div className="relative h-full w-full">
      <SplatViewer
        splatUrl={tour.splatUrl}
        className="absolute inset-0"
        cleanup={cleanup}
      />
      <ViewerOverlay tour={tour} />
      {/* View Options panel sits in its own absolute slot top-right */}
      <div className="pointer-events-auto absolute right-3 top-36 z-30 md:right-4 md:top-40">
        <ViewOptionsPanel value={cleanup} onChange={setCleanup} />
      </div>
    </div>
  );
}
