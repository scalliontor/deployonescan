import { PLANS, PlanId } from "@/lib/checkout";
import { CheckoutButton } from "@/components/CheckoutButton";

export default function PricingPage() {
  const planIds: PlanId[] = ["per_tour", "starter", "pro"];
  return (
    <div className="bg-hero min-h-[calc(100vh-65px)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <span className="chip mb-4">Built for solo agents and brokerages</span>
          <h1 className="text-4xl font-bold md:text-5xl">
            Cheaper than a Matterport visit.{" "}
            <span className="text-accent-500">Better than a panorama tour.</span>
          </h1>
          <p className="mt-3 text-white/65">
            Pay only when you publish. No hardware. No appointments.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {planIds.map((id) => {
            const plan = PLANS[id];
            const featured = id === "starter";
            return (
              <div
                key={id}
                className={`card relative p-6 ${
                  featured ? "border-accent-500/40 bg-accent-500/5" : ""
                }`}
              >
                {featured && (
                  <div className="absolute right-4 top-4 rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-ink-950">
                    Most popular
                  </div>
                )}
                <div className="text-lg font-semibold">{plan.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-white/55">{plan.cadence}</span>
                </div>
                <p className="mt-2 text-sm text-white/70">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {planFeatures(id).map((f) => (
                    <li key={f} className="flex gap-2 text-white/75">
                      <span className="text-accent-500">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <CheckoutButton plan={id} className="mt-6 w-full" featured={featured} />
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs text-white/45">
          Mocked checkout for the investor demo — no actual payment is processed.
        </div>
      </div>
    </div>
  );
}

function planFeatures(id: PlanId): string[] {
  switch (id) {
    case "per_tour":
      return [
        "1 published tour",
        "Hosted 6 months",
        "Branded share link",
        "Basic lead capture",
      ];
    case "starter":
      return [
        "5 tours per month",
        "Hosted indefinitely",
        "Branded + your brokerage logo",
        "Lead capture + analytics",
        "Embed code for MLS / website",
      ];
    case "pro":
      return [
        "Unlimited tours",
        "White-label embeds",
        "Floor plans + measurements",
        "Priority processing",
        "API access",
        "Team seats (up to 10)",
      ];
  }
}
