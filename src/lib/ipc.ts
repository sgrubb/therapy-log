import { z } from "zod";
import { therapistSchema } from "@shared/schemas/therapists";
import { clientSchema, clientWithTherapistSchema } from "@shared/schemas/clients";
import { sessionSchema, sessionWithClientAndTherapistSchema, expectedSessionSchema } from "@shared/schemas/sessions";
import type { Therapist, CreateTherapist, UpdateTherapist } from "@shared/types/therapists";
import type { Client, ClientWithTherapist, CreateClient, UpdateClient, CloseClient, ReopenClient } from "@shared/types/clients";
import type { Session, SessionWithClientAndTherapist, CreateSession, UpdateSession } from "@shared/types/sessions";
import type { SortDir } from "@shared/types/enums";
import type {
  SessionListParams,
  SessionListRangeParams,
  ExpectedSession,
} from "@shared/types/sessions";
import type { PaginatedResult } from "@shared/types/common";

const ERROR_MESSAGES: Record<string, string> = {
  UNIQUE_CONSTRAINT: "A record with this value already exists.",
  NOT_FOUND: "The requested record was not found.",
  FOREIGN_KEY: "A related record could not be found.",
  VALIDATION: "The provided data is invalid.",
  CONFLICT: "This record was modified by someone else.",
  UNKNOWN: "An unexpected error occurred.",
};

export class IpcError extends Error {
  constructor(
    public readonly code: string,
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

  const r = response as { success: boolean; data?: unknown; error?: { code: string; message: string } };

  if (!r.success) {
    const code = r.error?.code ?? "UNKNOWN";
    const message = ERROR_MESSAGES[code] ?? r.error?.message ?? "An unexpected error occurred.";
    throw new IpcError(code, message);
  }

  return r.data;
}

const paginatedResultSchema = <T>(itemSchema: z.ZodType<T>) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });

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

  async setupValidateExistingDatabase(
    filePath: string,
  ): Promise<{ valid: boolean; version: number }> {
    const response = await window.electronAPI.invoke(
      "setup:validate-existing-database",
      filePath,
    );
    return z
      .object({ valid: z.boolean(), version: z.number() })
      .parse(unwrapResponse(response));
  },

  async setupSaveConfig(config: { dbPath: string; createdByApp: boolean }): Promise<void> {
    const response = await window.electronAPI.invoke("setup:save-config", config);
    unwrapResponse(response);
  },

  async setupComplete(): Promise<void> {
    const response = await window.electronAPI.invoke("setup:complete");
    unwrapResponse(response);
  },

  // ── Migration ──────────────────────────────────────────────────────────
  async migrationGetInfo(): Promise<{
    currentVersion: number;
    requiredVersion: number;
    createdByApp: boolean;
  }> {
    const response = await window.electronAPI.invoke("migration:get-info");
    return z
      .object({
        currentVersion: z.number(),
        requiredVersion: z.number(),
        createdByApp: z.boolean(),
      })
      .parse(unwrapResponse(response));
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
  async listTherapists(
    params: { page: number; pageSize: number; sortKey: string; sortDir: SortDir },
  ): Promise<PaginatedResult<Therapist>> {
    const response = await window.electronAPI.invoke("therapist:list", params);
    return paginatedResultSchema(therapistSchema).parse(unwrapResponse(response));
  },

  async listAllTherapists(): Promise<Therapist[]> {
    const response = await window.electronAPI.invoke("therapist:list-all");
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

  // ── Clients ────────────────────────────────────────────────────────────
  async listClients(params: {
    page: number;
    pageSize: number;
    status?: string;
    therapistId?: number | null;
    search?: string;
    sortKey: string;
    sortDir: SortDir;
  }): Promise<PaginatedResult<ClientWithTherapist>> {
    const response = await window.electronAPI.invoke("client:list", params);
    return paginatedResultSchema(clientWithTherapistSchema).parse(unwrapResponse(response));
  },

  async listAllClients(): Promise<ClientWithTherapist[]> {
    const response = await window.electronAPI.invoke("client:list-all");
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
    const raw = unwrapResponse(response) as { data: unknown[]; total: number; page: number; pageSize: number };
    return {
      data: z.array(sessionWithClientAndTherapistSchema).parse(raw.data),
      total: raw.total,
      page: raw.page,
      pageSize: raw.pageSize,
    };
  },

  async listSessionsRange(params: SessionListRangeParams): Promise<SessionWithClientAndTherapist[]> {
    const response = await window.electronAPI.invoke("session:list-range", params);
    return z.array(sessionWithClientAndTherapistSchema).parse(unwrapResponse(response));
  },

  async listExpectedSessions(
    params: {
      from: Date;
      to: Date;
      therapistIds?: number[];
      clientId?: number;
      sortKey: string;
      sortDir: SortDir;
    },
  ): Promise<ExpectedSession[]> {
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
};
