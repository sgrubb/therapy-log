import type { IpcResponse } from "@shared/types/ipc";
import type { PaginatedResult } from "@shared/types/common";
import type { ExpectedSession, SessionWithClientAndTherapist, Session } from "@shared/types/sessions";
import type { Therapist, CreateTherapist, UpdateTherapist } from "@shared/types/therapists";
import type { Client, ClientWithTherapist, CreateClient, UpdateClient } from "@shared/types/clients";
import type { CreateSession, UpdateSession } from "@shared/types/sessions";

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
    args: CreateTherapist;
    result: IpcResponse<Therapist>;
  };
  "therapist:update": {
    args: { id: number; data: UpdateTherapist };
    result: IpcResponse<Therapist>;
  };

  // Clients
  "client:list": {
    args: unknown;
    result: IpcResponse<PaginatedResult<ClientWithTherapist>>;
  };
  "client:list-all": {
    args: void;
    result: IpcResponse<ClientWithTherapist[]>;
  };
  "client:get": {
    args: number;
    result: IpcResponse<ClientWithTherapist>;
  };
  "client:create": {
    args: CreateClient;
    result: IpcResponse<Client>;
  };
  "client:update": {
    args: { id: number; data: UpdateClient };
    result: IpcResponse<Client>;
  };
  "client:close": {
    args: { id: number; data: unknown };
    result: IpcResponse<ClientWithTherapist>;
  };
  "client:reopen": {
    args: { id: number; data: unknown };
    result: IpcResponse<ClientWithTherapist>;
  };

  // Sessions
  "session:list": {
    args: unknown;
    result: IpcResponse<PaginatedResult<SessionWithClientAndTherapist>>;
  };
  "session:list-range": {
    args: unknown;
    result: IpcResponse<SessionWithClientAndTherapist[]>;
  };
  "session:list-expected": {
    args: unknown;
    result: IpcResponse<ExpectedSession[]>;
  };
  "session:get": {
    args: number;
    result: IpcResponse<SessionWithClientAndTherapist>;
  };
  "session:create": {
    args: CreateSession;
    result: IpcResponse<Session>;
  };
  "session:update": {
    args: { id: number; data: UpdateSession };
    result: IpcResponse<Session>;
  };
};

export type IpcChannel = keyof IpcApi;
