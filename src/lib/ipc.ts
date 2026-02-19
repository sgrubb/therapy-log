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
  CreateSession,
  UpdateSession,
} from "@/types/ipc";

export const ipc = {
  // ── Therapists ─────────────────────────────────────────────────────────
  async listTherapists(): Promise<Therapist[]> {
    const result = await window.electronAPI.invoke("therapist:list");
    return z.array(therapistSchema).parse(result);
  },

  async getTherapist(id: number): Promise<Therapist | null> {
    const result = await window.electronAPI.invoke("therapist:get", id);
    return result === null ? null : therapistSchema.parse(result);
  },

  async createTherapist(input: CreateTherapist): Promise<Therapist> {
    const result = await window.electronAPI.invoke("therapist:create", input);
    return therapistSchema.parse(result);
  },

  async updateTherapist(id: number, data: UpdateTherapist): Promise<Therapist> {
    const result = await window.electronAPI.invoke("therapist:update", {
      id,
      data,
    });
    return therapistSchema.parse(result);
  },

  // ── Clients ────────────────────────────────────────────────────────────
  async listClients(): Promise<ClientWithTherapist[]> {
    const result = await window.electronAPI.invoke("client:list");
    return z.array(clientWithTherapistSchema).parse(result);
  },

  async getClient(id: number): Promise<ClientWithTherapist | null> {
    const result = await window.electronAPI.invoke("client:get", id);
    return result === null ? null : clientWithTherapistSchema.parse(result);
  },

  async createClient(input: CreateClient): Promise<Client> {
    const result = await window.electronAPI.invoke("client:create", input);
    return clientSchema.parse(result);
  },

  async updateClient(id: number, data: UpdateClient): Promise<Client> {
    const result = await window.electronAPI.invoke("client:update", {
      id,
      data,
    });
    return clientSchema.parse(result);
  },

  // ── Sessions ───────────────────────────────────────────────────────────
  async listSessions(): Promise<SessionWithRelations[]> {
    const result = await window.electronAPI.invoke("session:list");
    return z.array(sessionWithRelationsSchema).parse(result);
  },

  async getSession(id: number): Promise<SessionWithRelations | null> {
    const result = await window.electronAPI.invoke("session:get", id);
    return result === null ? null : sessionWithRelationsSchema.parse(result);
  },

  async createSession(input: CreateSession): Promise<Session> {
    const result = await window.electronAPI.invoke("session:create", input);
    return sessionSchema.parse(result);
  },

  async updateSession(id: number, data: UpdateSession): Promise<Session> {
    const result = await window.electronAPI.invoke("session:update", {
      id,
      data,
    });
    return sessionSchema.parse(result);
  },
};
