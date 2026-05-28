export type CaptureStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "ready"
  | "failed";

export type Hotspot = {
  id: string;
  label: string;
  kind: "room" | "info";
  x: number; // 0..1 in viewport space (overlay)
  y: number;
  note?: string;
};

export type Tour = {
  id: string;
  title: string;
  address?: string;
  status: CaptureStatus;
  createdAt: number;
  updatedAt: number;
  splatUrl: string; // URL the viewer loads
  providerCaptureId?: string;
  agent: {
    name: string;
    brokerage?: string;
    email?: string;
    phone?: string;
    avatarColor: string;
  };
  hotspots: Hotspot[];
  rooms: Array<{ id: string; name: string; sqft?: number }>;
  views: number;
  leads: number;
};

export type CreateCaptureInput = {
  videoUrl?: string; // when uploaded
  videoBlob?: Blob; // direct
  title: string;
};

export type CreateCaptureResult = {
  providerCaptureId: string;
  splatUrl: string; // may be a "pending" URL; resolved once status === "ready"
};

export type ProviderName = "mock" | "luma";
