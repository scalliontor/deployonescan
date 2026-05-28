"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed/")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 text-ink-950 shadow-lg shadow-accent-500/30">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 1 0 9-9" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </span>
          <span>Onescan</span>
        </Link>
        <div className="hidden gap-7 text-sm text-white/70 md:flex">
          <Link href="/explore" className="hover:text-white">Explore</Link>
          <Link href="/capture" className="hover:text-white">Capture guide</Link>
          <Link href="/demo" className="hover:text-white">Demo</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
        </div>
        <Link href="/upload" className="btn-primary text-sm">
          Start scanning
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed/")) return null;
  if (pathname?.startsWith("/tour/")) return null; // viewer is fullscreen
  if (pathname?.startsWith("/demo")) return null;

  return (
    <footer className="mt-24 border-t border-white/5 bg-ink-950/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
        <div>© 2026 Onescan. Built for the next million real estate listings.</div>
        <div className="flex gap-6">
          <Link href="/explore" className="hover:text-white">Explore</Link>
          <Link href="/capture" className="hover:text-white">Capture guide</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <a href="mailto:hello@onescan.app" className="hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}
