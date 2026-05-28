import Link from "next/link";
import { completeCheckoutSession, PLANS } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sid = searchParams.session_id;
  const session = sid ? completeCheckoutSession(sid) : null;
  const plan = session ? PLANS[session.plan] : null;

  return (
    <div className="bg-hero min-h-[calc(100vh-65px)]">
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-accent-500 text-3xl text-ink-950">
          ✓
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">You're in.</h1>
        <p className="mt-3 text-white/70">
          {plan
            ? `Your "${plan.name}" plan is active.`
            : "Your account is ready."}{" "}
          Time to create your first tour.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/upload" className="btn-primary">
            Create your first tour →
          </Link>
          <Link href="/demo" className="btn-ghost">
            See the demo
          </Link>
        </div>
        <div className="mt-12 text-xs text-white/40">
          Mocked checkout · session {sid?.slice(0, 16)}…
        </div>
      </div>
    </div>
  );
}
