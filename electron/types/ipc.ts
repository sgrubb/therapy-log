import type {
  Therapist,
  Client,
  Prisma,
} from "../../generated/prisma/client";
import type { ClientGetPayload } from "../../generated/prisma/models/Client";
import type { SessionGetPayload } from "../../generated/prisma/models/Session";
import type { IpcResponse } from "@shared/types/ipc";
import type { PaginatedResult, ExpectedSession } from "@shared/types/sessions";

export type { IpcErrorCode, IpcError, IpcResponse } from "@shared/types/ipc";

// ── Query / Mutation payloads ──────────────────────────────────────────

export type IpcApi = {
  // App
  "app:version": { args: void; result: string };

  // Setup wizard
  "setup:open-save-dialog": { args: void; result: IpcResponse<string | null> };
  "setup:open-file-dialog": { args: void; result: IpcResponse<string | null> };
  "setup:create-database": { args: string; result: IpcResponse<null> };
  "setup:validate-existing-database": {
    args: string;
    result: IpcResponse<{ valid: boolean; version: number }>;
  };
  "setup:save-config": {
    args: { dbPath: string; createdByApp: boolean };
    result: IpcResponse<null>;
  };
  "setup:complete": { args: void; result: IpcResponse<null> };

  // Migration
  "migration:get-info": {
    args: void;
    result: IpcResponse<{ currentVersion: number; requiredVersion: number; createdByApp: boolean }>;
  };
  "migration:apply": { args: void; result: IpcResponse<null> };
  "migration:complete": { args: void; result: IpcResponse<null> };
  "migration:quit": { args: void; result: void };

  // Settings
  "settings:get-db-path": { args: void; result: IpcResponse<string | null> };
  "settings:set-db-path": { args: string; result: IpcResponse<null> };
  "settings:open-file-dialog": { args: void; result: IpcResponse<string | null> };

  // Therapists
  "therapist:list": {
    args: unknown;
    result: IpcResponse<PaginatedResult<Therapist>>;
  };
  "therapist:list-all": {
    args: void;
    result: IpcResponse<Therapist[]>;
  };
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
    args: unknown;
    result: IpcResponse<PaginatedResult<ClientGetPayload<{ include: { therapist: true } }>>>;
  };
  "client:list-all": {
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
    args: unknown;
    result: IpcResponse<PaginatedResult<SessionGetPayload<{ include: { client: true; therapist: true } }>>>;
  };
  "session:list-range": {
    args: unknown;
    result: IpcResponse<SessionGetPayload<{ include: { client: true; therapist: true } }>[]>;
  };
  "session:list-expected": {
    args: unknown;
    result: IpcResponse<ExpectedSession[]>;
  };
  "session:get": {
    args: number;
    result: IpcResponse<SessionGetPayload<{
      include: { client: true; therapist: true };
    }>>;
  };
  "session:create": {
    args: Prisma.SessionUncheckedCreateInput;
    result: IpcResponse<SessionGetPayload<Record<string, never>>>;
  };
  "session:update": {
    args: { id: number; data: Prisma.SessionUncheckedUpdateInput };
    result: IpcResponse<SessionGetPayload<Record<string, never>>>;
  };
};

export type IpcChannel = keyof IpcApi;
