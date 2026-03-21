import { z } from "zod";
import {
  therapistSchema,
  clientSchema,
  clientWithTherapistSchema,
  sessionSchema,
  sessionWithRelationsSchema,
} from "@/schemas/ipc";
import type {
  Therapist,
  Client,
  ClientWithTherapist,
  Session,
  SessionWithRelations,
  CreateTherapist,
  UpdateTherapist,
  CreateClient,
  UpdateClient,
  CloseClient,
  ReopenClient,
  CreateSession,
  UpdateSession,
} from "@/types/ipc";

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
  async listTherapists(): Promise<Therapist[]> {
    const response = await window.electronAPI.invoke("therapist:list");
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
  async listClients(): Promise<ClientWithTherapist[]> {
    const response = await window.electronAPI.invoke("client:list");
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
  async listSessions(): Promise<SessionWithRelations[]> {
    const response = await window.electronAPI.invoke("session:list");
    return z.array(sessionWithRelationsSchema).parse(unwrapResponse(response));
  },

  async getSession(id: number): Promise<SessionWithRelations> {
    const response = await window.electronAPI.invoke("session:get", id);
    return sessionWithRelationsSchema.parse(unwrapResponse(response));
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
