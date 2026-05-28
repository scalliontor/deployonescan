import { notFound } from "next/navigation";
import { getTour, incrementTourMetric } from "@/lib/tours";
import { ViewerWithOverlay } from "@/components/ViewerWithOverlay";

export const dynamic = "force-dynamic";

export default function EmbedTourPage({ params }: { params: { id: string } }) {
  const tour = getTour(params.id);
  if (!tour) notFound();

  try {
    incrementTourMetric(tour.id, "views");
  } catch {}

  return (
    <div className="relative h-screen w-full overflow-hidden bg-ink-950">
      <ViewerWithOverlay tour={tour} />
    </div>
  );
}
