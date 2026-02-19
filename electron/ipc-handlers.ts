import type { IpcMain } from "electron";
import type { PrismaClient } from "../generated/prisma/client";
import {
  therapistCreateSchema,
  therapistUpdateSchema,
  clientCreateSchema,
  clientUpdateSchema,
  sessionCreateSchema,
  sessionUpdateSchema,
} from "./schemas/ipc";
import type { IpcApi } from "./types/ipc";

export function registerIpcHandlers(ipcMain: IpcMain, prisma: PrismaClient) {
  // ── Therapists ───────────────────────────────────────────────────────
  ipcMain.handle(
    "therapist:list",
    (): Promise<IpcApi["therapist:list"]["result"]> =>
      prisma.therapist.findMany(),
  );

  ipcMain.handle(
    "therapist:get",
    (_e, id: number): Promise<IpcApi["therapist:get"]["result"]> =>
      prisma.therapist.findUnique({ where: { id } }),
  );

  ipcMain.handle(
    "therapist:create",
    async (_e, rawData: unknown): Promise<IpcApi["therapist:create"]["result"]> => {
      const data = therapistCreateSchema.parse(rawData);
      return prisma.therapist.create({ data });
    },
  );

  ipcMain.handle(
    "therapist:update",
    async (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["therapist:update"]["result"]> => {
      const { id, data: rawData } = rawInput;
      const data = therapistUpdateSchema.parse(rawData);
      return prisma.therapist.update({ where: { id }, data });
    },
  );

  // ── Clients ──────────────────────────────────────────────────────────
  ipcMain.handle(
    "client:list",
    (): Promise<IpcApi["client:list"]["result"]> =>
      prisma.client.findMany({ include: { therapist: true } }),
  );

  ipcMain.handle(
    "client:get",
    (_e, id: number): Promise<IpcApi["client:get"]["result"]> =>
      prisma.client.findUnique({ where: { id }, include: { therapist: true } }),
  );

  ipcMain.handle(
    "client:create",
    async (_e, rawData: unknown): Promise<IpcApi["client:create"]["result"]> => {
      const data = clientCreateSchema.parse(rawData);
      return prisma.client.create({ data });
    },
  );

  ipcMain.handle(
    "client:update",
    async (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["client:update"]["result"]> => {
      const { id, data: rawData } = rawInput;
      const data = clientUpdateSchema.parse(rawData);
      return prisma.client.update({ where: { id }, data });
    },
  );

  // ── Sessions ─────────────────────────────────────────────────────────
  ipcMain.handle(
    "session:list",
    (): Promise<IpcApi["session:list"]["result"]> =>
      prisma.session.findMany({
        include: { client: true, therapist: true },
      }),
  );

  ipcMain.handle(
    "session:get",
    (_e, id: number): Promise<IpcApi["session:get"]["result"]> =>
      prisma.session.findUnique({
        where: { id },
        include: { client: true, therapist: true },
      }),
  );

  ipcMain.handle(
    "session:create",
    async (_e, rawData: unknown): Promise<IpcApi["session:create"]["result"]> => {
      const data = sessionCreateSchema.parse(rawData);
      return prisma.session.create({ data });
    },
  );

  ipcMain.handle(
    "session:update",
    async (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["session:update"]["result"]> => {
      const { id, data: rawData } = rawInput;
      const data = sessionUpdateSchema.parse(rawData);
      return prisma.session.update({ where: { id }, data });
    },
  );
}
