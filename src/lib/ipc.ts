import { z } from "zod";
import { therapistSchema } from "@shared/schemas/therapists";
import { clientSchema, clientWithTherapistSchema } from "@shared/schemas/clients";
import { sessionSchema, sessionWithClientAndTherapistSchema, expectedSessionSchema } from "@shared/schemas/sessions";
import type { SetupSaveConfigParams, ValidateDatabaseResult } from "@shared/types/setup";
import type { MigrationInfo } from "@shared/types/migrations";
import type { Therapist, CreateTherapist, UpdateTherapist, DeactivateTherapist, ReactivateTherapist, TherapistListParams, TherapistListAllParams } from "@shared/types/therapists";
import type { Client, ClientWithTherapist, CreateClient, UpdateClient, CloseClient, ReopenClient, ClientListParams, ClientListAllParams } from "@shared/types/clients";
import type { Session, SessionWithClientAndTherapist, CreateSession, UpdateSession, SessionListParams, SessionListRangeParams, SessionListExpectedParams, ExpectedSession } from "@shared/types/sessions";
import type { PaginatedResult } from "@shared/types/common";
import { IpcErrorCode } from "@shared/types/ipc";
import type { ImportResult, TherapistExportParams, ClientExportParams, SessionExportParams } from "@shared/types/csv";
import { importResultSchema, csvExportResultSchema } from "@shared/schemas/csv";
import { paginatedResultSchema } from "@shared/schemas/common";
import { validateDatabaseResultSchema } from "@shared/schemas/setup";
import { migrationInfoSchema } from "@shared/schemas/migrations";

const ERROR_MESSAGES: Record<string, string> = {
  [IpcErrorCode.UniqueConstraint]: "A record with this value already exists.",
  [IpcErrorCode.NotFound]: "The requested record was not found.",
  [IpcErrorCode.ForeignKey]: "A related record could not be found.",
  [IpcErrorCode.Validation]: "The provided data is invalid.",
  [IpcErrorCode.Conflict]: "This record was modified by someone else.",
  [IpcErrorCode.Unknown]: "An unexpected error occurred.",
};

export class IpcError extends Error {
  constructor(
    public readonly code: IpcErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IpcError";
  }
}

function unwrapResponse(response: unknown): unknown {
  if (typeof response !== "object" || response === null) {
    throw new Error("Unexpected response from IPC handler.");
  }

  const r = response as { success: boolean; data?: unknown; error?: { code: IpcErrorCode; message: string } };

  if (!r.success) {
    const code = r.error?.code ?? IpcErrorCode.Unknown;
    const message = ERROR_MESSAGES[code] ?? r.error?.message ?? "An unexpected error occurred.";
    throw new IpcError(code, message);
  }

  return r.data;
}

export const ipc = {
  // ── App ────────────────────────────────────────────────────────────────
  async getVersion(): Promise<string> {
    const result = await window.electronAPI.invoke("app:version");
    return z.string().parse(result);
  },

  // ── Setup wizard ───────────────────────────────────────────────────────
  async setupOpenSaveDialog(): Promise<string | null> {
    const response = await window.electronAPI.invoke("setup:open-save-dialog");
    return z.string().nullable().parse(unwrapResponse(response));
  },

  async setupOpenFileDialog(): Promise<string | null> {
    const response = await window.electronAPI.invoke("setup:open-file-dialog");
    return z.string().nullable().parse(unwrapResponse(response));
  },

  async setupCreateDatabase(filePath: string): Promise<void> {
    const response = await window.electronAPI.invoke("setup:create-database", filePath);
    unwrapResponse(response);
  },

  async setupValidateExistingDatabase(filePath: string): Promise<ValidateDatabaseResult> {
    const response = await window.electronAPI.invoke(
      "setup:validate-existing-database",
      filePath,
    );
    return validateDatabaseResultSchema.parse(unwrapResponse(response));
  },

  async setupSaveConfig(config: SetupSaveConfigParams): Promise<void> {
    const response = await window.electronAPI.invoke("setup:save-config", config);
    unwrapResponse(response);
  },

  async setupComplete(): Promise<void> {
    const response = await window.electronAPI.invoke("setup:complete");
    unwrapResponse(response);
  },

  // ── Migration ──────────────────────────────────────────────────────────
  async migrationGetInfo(): Promise<MigrationInfo> {
    const response = await window.electronAPI.invoke("migration:get-info");
    return migrationInfoSchema.parse(unwrapResponse(response));
  },

  async migrationApply(): Promise<void> {
    const response = await window.electronAPI.invoke("migration:apply");
    unwrapResponse(response);
  },

  async migrationComplete(): Promise<void> {
    const response = await window.electronAPI.invoke("migration:complete");
    unwrapResponse(response);
  },

  async migrationQuit(): Promise<void> {
    await window.electronAPI.invoke("migration:quit");
  },

  // ── Settings ───────────────────────────────────────────────────────────
  async getDbPath(): Promise<string | null> {
    const response = await window.electronAPI.invoke("settings:get-db-path");
    return z.string().nullable().parse(unwrapResponse(response));
  },

  async setDbPath(newPath: string): Promise<void> {
    const response = await window.electronAPI.invoke("settings:set-db-path", newPath);
    unwrapResponse(response);
  },

  async openFileDialog(): Promise<string | null> {
    const response = await window.electronAPI.invoke("settings:open-file-dialog");
    return z.string().nullable().parse(unwrapResponse(response));
  },

  // ── Therapists ─────────────────────────────────────────────────────────
  async listTherapists(params: TherapistListParams): Promise<PaginatedResult<Therapist>> {
    const response = await window.electronAPI.invoke("therapist:list", params);
    return paginatedResultSchema(therapistSchema).parse(unwrapResponse(response));
  },

  async listAllTherapists(params: TherapistListAllParams = {}): Promise<Therapist[]> {
    const response = await window.electronAPI.invoke("therapist:list-all", params);
    return z.array(therapistSchema).parse(unwrapResponse(response));
  },

  async getTherapist(id: number): Promise<Therapist> {
    const response = await window.electronAPI.invoke("therapist:get", id);
    return therapistSchema.parse(unwrapResponse(response));
  },

  async createTherapist(input: CreateTherapist): Promise<Therapist> {
    const response = await window.electronAPI.invoke("therapist:create", input);
    return therapistSchema.parse(unwrapResponse(response));
  },

  async updateTherapist(id: number, data: UpdateTherapist): Promise<Therapist> {
    const response = await window.electronAPI.invoke("therapist:update", { id, data });
    return therapistSchema.parse(unwrapResponse(response));
  },

  async deactivateTherapist(id: number, data: DeactivateTherapist): Promise<Therapist> {
    const response = await window.electronAPI.invoke("therapist:deactivate", { id, data });
    return therapistSchema.parse(unwrapResponse(response));
  },

  async reactivateTherapist(id: number, data: ReactivateTherapist): Promise<Therapist> {
    const response = await window.electronAPI.invoke("therapist:reactivate", { id, data });
    return therapistSchema.parse(unwrapResponse(response));
  },

  // ── Clients ────────────────────────────────────────────────────────────
  async listClients(params: ClientListParams): Promise<PaginatedResult<ClientWithTherapist>> {
    const response = await window.electronAPI.invoke("client:list", params);
    return paginatedResultSchema(clientWithTherapistSchema).parse(unwrapResponse(response));
  },

  async listAllClients(params: ClientListAllParams = {}): Promise<ClientWithTherapist[]> {
    const response = await window.electronAPI.invoke("client:list-all", params);
    return z.array(clientWithTherapistSchema).parse(unwrapResponse(response));
  },

  async getClient(id: number): Promise<ClientWithTherapist> {
    const response = await window.electronAPI.invoke("client:get", id);
    return clientWithTherapistSchema.parse(unwrapResponse(response));
  },

  async createClient(input: CreateClient): Promise<Client> {
    const response = await window.electronAPI.invoke("client:create", input);
    return clientSchema.parse(unwrapResponse(response));
  },

  async updateClient(id: number, data: UpdateClient): Promise<Client> {
    const response = await window.electronAPI.invoke("client:update", { id, data });
    return clientSchema.parse(unwrapResponse(response));
  },

  async closeClient(id: number, data: CloseClient): Promise<ClientWithTherapist> {
    const response = await window.electronAPI.invoke("client:close", { id, data });
    return clientWithTherapistSchema.parse(unwrapResponse(response));
  },

  async reopenClient(id: number, data: ReopenClient): Promise<ClientWithTherapist> {
    const response = await window.electronAPI.invoke("client:reopen", { id, data });
    return clientWithTherapistSchema.parse(unwrapResponse(response));
  },

  // ── Sessions ───────────────────────────────────────────────────────────
  async listSessions(params: SessionListParams): Promise<PaginatedResult<SessionWithClientAndTherapist>> {
    const response = await window.electronAPI.invoke("session:list", params);
    return paginatedResultSchema(sessionWithClientAndTherapistSchema).parse(unwrapResponse(response));
  },

  async listSessionsRange(params: SessionListRangeParams): Promise<SessionWithClientAndTherapist[]> {
    const response = await window.electronAPI.invoke("session:list-range", params);
    return z.array(sessionWithClientAndTherapistSchema).parse(unwrapResponse(response));
  },

  async listExpectedSessions(params: SessionListExpectedParams): Promise<ExpectedSession[]> {
    const response = await window.electronAPI.invoke("session:list-expected", params);
    return z.array(expectedSessionSchema).parse(unwrapResponse(response));
  },

  async getSession(id: number): Promise<SessionWithClientAndTherapist> {
    const response = await window.electronAPI.invoke("session:get", id);
    return sessionWithClientAndTherapistSchema.parse(unwrapResponse(response));
  },

  async createSession(input: CreateSession): Promise<Session> {
    const response = await window.electronAPI.invoke("session:create", input);
    return sessionSchema.parse(unwrapResponse(response));
  },

  async updateSession(id: number, data: UpdateSession): Promise<Session> {
    const response = await window.electronAPI.invoke("session:update", { id, data });
    return sessionSchema.parse(unwrapResponse(response));
  },

  // ── CSV ────────────────────────────────────────────────────────────────
  async exportTherapistsCsv(params: TherapistExportParams): Promise<{ path: string } | null> {
    const response = await window.electronAPI.invoke("therapist:export-csv", params);
    return csvExportResultSchema.nullable().parse(unwrapResponse(response));
  },

  async importTherapistsCsv(): Promise<ImportResult | null> {
    const response = await window.electronAPI.invoke("therapist:import-csv");
    return importResultSchema.nullable().parse(unwrapResponse(response));
  },

  async exportClientsCsv(params: ClientExportParams): Promise<{ path: string } | null> {
    const response = await window.electronAPI.invoke("client:export-csv", params);
    return csvExportResultSchema.nullable().parse(unwrapResponse(response));
  },

  async importClientsCsv(): Promise<ImportResult | null> {
    const response = await window.electronAPI.invoke("client:import-csv");
    return importResultSchema.nullable().parse(unwrapResponse(response));
  },

  async exportSessionsCsv(params: SessionExportParams): Promise<{ path: string } | null> {
    const response = await window.electronAPI.invoke("session:export-csv", params);
    return csvExportResultSchema.nullable().parse(unwrapResponse(response));
  },

  async importSessionsCsv(): Promise<ImportResult | null> {
    const response = await window.electronAPI.invoke("session:import-csv");
    return importResultSchema.nullable().parse(unwrapResponse(response));
  },
};
