import { NextRequest, NextResponse } from "next/server";
import { getCaptureStatus } from "@/lib/splat-provider";
import { getTour, updateTour } from "@/lib/tours";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tour = getTour(params.id);
  if (!tour) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!tour.providerCaptureId) {
    return NextResponse.json({ status: tour.status, progress: 1, splatUrl: tour.splatUrl });
  }

  const status = await getCaptureStatus(tour.providerCaptureId);
  if (status.status !== tour.status || status.splatUrl !== tour.splatUrl) {
    updateTour(tour.id, { status: status.status, splatUrl: status.splatUrl });
  }
  return NextResponse.json(status);
}
