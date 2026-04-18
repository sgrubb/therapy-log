// ── ElectronAPI interface (for window.electronAPI typing in the renderer) ───
// Intentionally loose — all type safety is provided by src/lib/ipc.ts via Zod.

export interface ElectronAPI {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  onNavigateToNew(callback: () => void): void;
}
