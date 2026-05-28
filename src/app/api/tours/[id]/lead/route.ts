import { NextRequest, NextResponse } from "next/server";
import { incrementTourMetric, getTour } from "@/lib/tours";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tour = getTour(params.id);
  if (!tour) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const lead = await req.json();
  // In a real product: write to a leads table, fire an email to the agent,
  // push to their CRM (Follow Up Boss / kvCORE / etc).
  console.log(`[lead] tour=${tour.id} agent=${tour.agent.email}`, lead);
  incrementTourMetric(tour.id, "leads");
  return NextResponse.json({ ok: true });
}
