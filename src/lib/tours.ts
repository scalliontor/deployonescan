/**
 * Tour storage — Vercel-safe.
 *
 * Vercel's serverless functions have a read-only filesystem with ephemeral
 * `/tmp`. We can't use a file-backed JSON store across requests reliably.
 *
 * Strategy:
 *  - The "demo" tour is built-in (hardcoded) and always available at /tour/demo.
 *  - New uploads create an in-memory tour. Same-instance follow-up requests
 *    will see it; cold-started instances won't. For an investor demo this is
 *    acceptable — the upload flow on a single browser session works.
 *  - We also stash recently-created tours in a server-process Map so the
 *    polling-status flow during a single upload stays consistent.
 *  - Tour IDs encode creation timestamp + a short random suffix so even
 *    "lost" tour ids are still meaningful (timestamp tells you it's fresh).
 *
 * When we move to a real DB (Postgres or Vercel KV), swap the Map below for
 * the DB client — no other code changes needed.
 */

import type { Tour, Hotspot } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __onescanTours: Map<string, Tour> | undefined;
}

// Persist across Next.js dev-mode hot reloads + same-instance serverless invocations.
const STORE: Map<string, Tour> =
  globalThis.__onescanTours ?? (globalThis.__onescanTours = new Map());

/** Fallback for any tour created via /upload (mock provider returns this). */
const DEFAULT_SPLAT_URL =
  process.env.NEXT_PUBLIC_SAMPLE_SPLAT || "/splats/room.splat";

const AGENT_COLORS = ["#3ee2a5", "#ffb650", "#7c8cf2", "#f27cc4", "#7cf2f0"];
function pickColor() {
  return AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];
}

function shortId(prefix = "t"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function defaultHotspots(): Hotspot[] {
  return [
    { id: "h1", kind: "room", label: "Living Room", x: 0.28, y: 0.62 },
    { id: "h2", kind: "room", label: "Kitchen", x: 0.62, y: 0.55 },
    { id: "h3", kind: "info", label: "Quartz countertops, installed 2024", x: 0.71, y: 0.46 },
    { id: "h4", kind: "info", label: "Original hardwood, refinished", x: 0.40, y: 0.78 },
  ];
}

function defaultRooms() {
  return [
    { id: "living", name: "Living Room", sqft: 320 },
    { id: "kitchen", name: "Kitchen", sqft: 180 },
    { id: "master", name: "Master Bedroom", sqft: 240 },
    { id: "bath", name: "Master Bath", sqft: 90 },
  ];
}

/** Always-available demo tour — Mip-NeRF 360 "room" scene (interior, furnished). */
function buildDemoTour(): Tour {
  return {
    id: "demo",
    title: "1847 Sycamore Lane",
    address: "Mill Valley, CA 94941 · 3 bed · 2 bath · 1,940 sqft · $2,495,000",
    status: "ready",
    createdAt: 1735689600000, // fixed: 2025-01-01, for stable display
    updatedAt: 1735689600000,
    splatUrl: "/splats/room.splat",
    agent: {
      name: "Jane Realtor",
      brokerage: "Cedar & Oak Real Estate",
      email: "jane@cedar-oak.com",
      phone: "(415) 555-0142",
      avatarColor: "#3ee2a5",
    },
    hotspots: defaultHotspots(),
    rooms: defaultRooms(),
    views: 1247,
    leads: 38,
  };
}

/**
 * Hardcoded "explore" gallery — each uses a different bundled splat scene.
 *
 * The bundled splat files (Mip-NeRF 360 dataset variants from antimatter15/
 * cakewalk on HF) are not literal house interiors, but they prove the viewer
 * works on different scene shapes/sizes and let agents picture how their
 * own iPhone-captured tour will render here.
 */
const GALLERY_TOURS: Tour[] = [
  {
    id: "marina-loft",
    title: "Marina Loft · 2BR Penthouse",
    address: "Embarcadero, San Francisco · 2 bed · 2 bath · 1,420 sqft · $1,895,000",
    status: "ready",
    createdAt: 1735000000000,
    updatedAt: 1735000000000,
    splatUrl: "/splats/room.splat", // same interior scene, different "listing"
    agent: {
      name: "Marcus Chen",
      brokerage: "Bay Coastal",
      email: "m@baycoastal.com",
      phone: "(415) 555-0188",
      avatarColor: "#7c8cf2",
    },
    hotspots: defaultHotspots(),
    rooms: defaultRooms(),
    views: 4520,
    leads: 92,
  },
  {
    id: "craftsman-cottage",
    title: "Craftsman Cottage · 3BR",
    address: "Berkeley Hills, CA · 3 bed · 2 bath · 1,860 sqft · $1,195,000",
    status: "ready",
    createdAt: 1734500000000,
    updatedAt: 1734500000000,
    splatUrl: "/splats/plush.splat", // object-scale scene — illustrates "feature item" close-up
    agent: {
      name: "Priya Patel",
      brokerage: "East Bay Homes",
      email: "priya@eastbayhomes.com",
      phone: "(510) 555-0144",
      avatarColor: "#ffb650",
    },
    hotspots: defaultHotspots(),
    rooms: defaultRooms(),
    views: 2890,
    leads: 47,
  },
  {
    id: "modern-condo",
    title: "Modern Condo · 1BR",
    address: "South Lake Union, Seattle · 1 bed · 1 bath · 820 sqft · $725,000",
    status: "ready",
    createdAt: 1734000000000,
    updatedAt: 1734000000000,
    splatUrl: "/splats/nike.splat", // small object — placeholder for studio listings
    agent: {
      name: "Devon Reyes",
      brokerage: "Pacific NW Realty",
      email: "devon@pnwrealty.com",
      phone: "(206) 555-0177",
      avatarColor: "#f27cc4",
    },
    hotspots: defaultHotspots(),
    rooms: defaultRooms(),
    views: 6210,
    leads: 134,
  },
];

export function createTour(input: {
  title: string;
  address?: string;
  splatUrl: string;
  providerCaptureId?: string;
  agentName?: string;
  agentBrokerage?: string;
  agentEmail?: string;
}): Tour {
  const id = shortId();
  const now = Date.now();
  const tour: Tour = {
    id,
    title: input.title,
    address: input.address,
    status: "processing",
    createdAt: now,
    updatedAt: now,
    splatUrl: input.splatUrl,
    providerCaptureId: input.providerCaptureId,
    agent: {
      name: input.agentName || "Jane Realtor",
      brokerage: input.agentBrokerage || "Cedar & Oak Real Estate",
      email: input.agentEmail || "jane@cedar-oak.com",
      phone: "(415) 555-0142",
      avatarColor: pickColor(),
    },
    hotspots: defaultHotspots(),
    rooms: defaultRooms(),
    views: 0,
    leads: 0,
  };
  STORE.set(id, tour);
  return tour;
}

export function getTour(id: string): Tour | null {
  if (id === "demo") return ensureDemoTour();
  const gallery = GALLERY_TOURS.find((t) => t.id === id);
  if (gallery) return gallery;
  return STORE.get(id) ?? null;
}

export function updateTour(id: string, patch: Partial<Tour>): Tour | null {
  const existing = STORE.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: Date.now() };
  STORE.set(id, updated);
  return updated;
}

export function incrementTourMetric(id: string, key: "views" | "leads") {
  const existing = STORE.get(id);
  if (!existing) return; // metric bumps on demo / gallery tours are not persisted
  existing[key] = (existing[key] || 0) + 1;
  existing.updatedAt = Date.now();
  STORE.set(id, existing);
}

export function listGalleryTours(): Tour[] {
  return [ensureDemoTour(), ...GALLERY_TOURS];
}

export function ensureDemoTour(): Tour {
  const cached = STORE.get("demo");
  if (cached) return cached;
  const tour = buildDemoTour();
  STORE.set("demo", tour);
  return tour;
}
