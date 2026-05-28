import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, PlanId, PLANS } from "@/lib/checkout";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const plan = body?.plan as PlanId;
  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  const session = createCheckoutSession(plan, body?.email);
  return NextResponse.json(session);
}
