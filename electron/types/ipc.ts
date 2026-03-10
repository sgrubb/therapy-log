import type {
  Therapist,
  Client,
  Session,
  Prisma,
} from "../../generated/prisma/client";
import type { ClientGetPayload } from "../../generated/prisma/models/Client";
import type { SessionGetPayload } from "../../generated/prisma/models/Session";

// ── Structured error types ─────────────────────────────────────────────────

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

// ── Query / Mutation payloads ──────────────────────────────────────────

export type IpcApi = {
  // App
  "app:version": { args: void; result: string };

  // Therapists
  "therapist:list": { args: void; result: IpcResponse<Therapist[]> };
  "therapist:get": { args: number; result: IpcResponse<Therapist> };
  "therapist:create": {
    args: Prisma.TherapistCreateInput;
    result: IpcResponse<Therapist>;
  };
  "therapist:update": {
    args: { id: number; data: Prisma.TherapistUpdateInput };
    result: IpcResponse<Therapist>;
  };

  // Clients
  "client:list": {
    args: void;
    result: IpcResponse<ClientGetPayload<{ include: { therapist: true } }>[]>;
  };
  "client:get": {
    args: number;
    result: IpcResponse<ClientGetPayload<{ include: { therapist: true } }>>;
  };
  "client:create": {
    args: Prisma.ClientUncheckedCreateInput;
    result: IpcResponse<Client>;
  };
  "client:update": {
    args: { id: number; data: Prisma.ClientUncheckedUpdateInput };
    result: IpcResponse<Client>;
  };
  "client:close": {
    args: { id: number; data: unknown };
    result: IpcResponse<ClientGetPayload<{ include: { therapist: true } }>>;
  };
  "client:reopen": {
    args: { id: number; data: unknown };
    result: IpcResponse<ClientGetPayload<{ include: { therapist: true } }>>;
  };

  // Sessions
  "session:list": {
    args: void;
    result: IpcResponse<SessionGetPayload<{ include: { client: true; therapist: true } }>[]>;
  };
  "session:get": {
    args: number;
    result: IpcResponse<SessionGetPayload<{
      include: { client: true; therapist: true };
    }>>;
  };
  "session:create": {
    args: Prisma.SessionUncheckedCreateInput;
    result: IpcResponse<Session>;
  };
  "session:update": {
    args: { id: number; data: Prisma.SessionUncheckedUpdateInput };
    result: IpcResponse<Session>;
  };

  // Settings
  "settings:get-db-path": { args: void; result: IpcResponse<string | null> };
  "settings:set-db-path": { args: string; result: IpcResponse<null> };
  "settings:open-file-dialog": { args: void; result: IpcResponse<string | null> };
};

export type IpcChannel = keyof IpcApi;
