// ── IPC error + response envelope ─────────────────────────────────────────
// Shared between renderer (src/) and electron main process.

export type IpcErrorCode =
  | "UNIQUE_CONSTRAINT"
  | "NOT_FOUND"
  | "FOREIGN_KEY"
  | "VALIDATION"
  | "CONFLICT"
  | "UNKNOWN";

export interface IpcError {
  code: IpcErrorCode;
  message: string;
}

export type IpcResponse<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };
