import type { IpcResponse } from "@shared/types/ipc";
import type { PaginatedResult } from "@shared/types/common";
import type { SetupSaveConfigParams, ValidateDatabaseResult } from "@shared/types/setup";
import type { MigrationInfo } from "@shared/types/migrations";
import type { ExpectedSession, SessionWithClientAndTherapist, Session } from "@shared/types/sessions";
import type { SessionListParams, SessionListRangeParams, SessionListExpectedParams } from "@shared/types/sessions";
import type { Therapist, CreateTherapist, UpdateTherapist, DeactivateTherapist, ReactivateTherapist, TherapistListParams, TherapistListAllParams } from "@shared/types/therapists";
import type { Client, ClientWithTherapist, CreateClient, UpdateClient, CloseClient, ReopenClient, ClientListParams, ClientListAllParams } from "@shared/types/clients";
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
    result: IpcResponse<ValidateDatabaseResult>;
  };
  "setup:save-config": {
    args: SetupSaveConfigParams;
    result: IpcResponse<null>;
  };
  "setup:complete": { args: void; result: IpcResponse<null> };

  // Migration
  "migration:get-info": {
    args: void;
    result: IpcResponse<MigrationInfo>;
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
    args: TherapistListParams;
    result: IpcResponse<PaginatedResult<Therapist>>;
  };
  "therapist:list-all": {
    args: TherapistListAllParams;
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
  "therapist:deactivate": {
    args: { id: number; data: DeactivateTherapist };
    result: IpcResponse<Therapist>;
  };
  "therapist:reactivate": {
    args: { id: number; data: ReactivateTherapist };
    result: IpcResponse<Therapist>;
  };

  // Clients
  "client:list": {
    args: ClientListParams;
    result: IpcResponse<PaginatedResult<ClientWithTherapist>>;
  };
  "client:list-all": {
    args: ClientListAllParams;
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
    args: { id: number; data: CloseClient };
    result: IpcResponse<ClientWithTherapist>;
  };
  "client:reopen": {
    args: { id: number; data: ReopenClient };
    result: IpcResponse<ClientWithTherapist>;
  };

  // Sessions
  "session:list": {
    args: SessionListParams;
    result: IpcResponse<PaginatedResult<SessionWithClientAndTherapist>>;
  };
  "session:list-range": {
    args: SessionListRangeParams;
    result: IpcResponse<SessionWithClientAndTherapist[]>;
  };
  "session:list-expected": {
    args: SessionListExpectedParams;
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
