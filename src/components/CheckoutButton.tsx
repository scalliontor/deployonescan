"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/checkout";
import clsx from "clsx";

export function CheckoutButton({
  plan,
  className,
  featured,
}: {
  plan: PlanId;
  className?: string;
  featured?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const j = await r.json();
    if (j.url) {
      window.location.href = j.url;
    } else {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx(
        featured ? "btn-primary" : "btn-ghost",
        "disabled:opacity-60",
        className
      )}
    >
      {loading ? "Redirecting…" : "Get started"}
    </button>
  );
}
