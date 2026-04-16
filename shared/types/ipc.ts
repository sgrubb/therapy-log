// ── IPC error + response envelope ─────────────────────────────────────────
// Shared between renderer (src/) and electron main process.

export const IpcErrorCode = {
  UniqueConstraint: "UNIQUE_CONSTRAINT",
  NotFound: "NOT_FOUND",
  ForeignKey: "FOREIGN_KEY",
  Validation: "VALIDATION",
  Conflict: "CONFLICT",
  Unknown: "UNKNOWN",
} as const;
export type IpcErrorCode = (typeof IpcErrorCode)[keyof typeof IpcErrorCode];

export interface IpcError {
  code: IpcErrorCode;
  message: string;
}

export type IpcResponse<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };
