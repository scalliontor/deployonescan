import { NextRequest, NextResponse } from "next/server";
import { createCapture } from "@/lib/splat-provider";
import { createTour } from "@/lib/tours";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = body?.title || "Untitled Listing";

  const capture = await createCapture({
    title,
    videoUrl: body?.videoUrl,
  });

  const tour = createTour({
    title,
    address: body?.address,
    splatUrl: capture.splatUrl,
    providerCaptureId: capture.providerCaptureId,
    agentName: body?.agentName,
    agentBrokerage: body?.agentBrokerage,
    agentEmail: body?.agentEmail,
  });

  return NextResponse.json({ tour });
}
