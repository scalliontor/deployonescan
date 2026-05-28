declare module "@mkkellogg/gaussian-splats-3d" {
  export class Viewer {
    constructor(opts: Record<string, unknown>);
    addSplatScene(url: string, opts?: Record<string, unknown>): Promise<void>;
    start(): void;
    dispose?(): void;
  }
}
