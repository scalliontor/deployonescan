"use client";

import { SplatViewer } from "./SplatViewer";
import { ViewerOverlay } from "./ViewerOverlay";
import type { Tour } from "@/lib/types";

export function ViewerWithOverlay({ tour }: { tour: Tour }) {
  return (
    <div className="relative h-full w-full">
      <SplatViewer splatUrl={tour.splatUrl} className="absolute inset-0" />
      <ViewerOverlay tour={tour} />
    </div>
  );
}
