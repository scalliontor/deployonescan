import { notFound } from "next/navigation";
import { getTour, ensureDemoTour, incrementTourMetric } from "@/lib/tours";
import { ViewerWithOverlay } from "@/components/ViewerWithOverlay";

export const dynamic = "force-dynamic";

export default function TourPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { embed?: string };
}) {
  if (params.id === "demo") ensureDemoTour();
  const tour = getTour(params.id);
  if (!tour) notFound();

  // Count the view (server-side, best-effort).
  try {
    incrementTourMetric(tour.id, "views");
  } catch {}

  const embed = searchParams.embed === "1";
  return (
    <div
      className={`relative w-full overflow-hidden bg-ink-950 ${
        embed ? "h-screen" : "h-[calc(100vh-65px)]"
      }`}
    >
      <ViewerWithOverlay tour={tour} />
    </div>
  );
}
