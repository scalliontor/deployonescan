import { ensureDemoTour } from "@/lib/tours";
import { ViewerWithOverlay } from "@/components/ViewerWithOverlay";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  const tour = ensureDemoTour();
  return (
    <div className="relative h-[calc(100vh-65px)] w-full overflow-hidden bg-ink-950">
      <ViewerWithOverlay tour={tour} />
    </div>
  );
}
