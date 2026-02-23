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
import { withErrorHandler } from "./lib/error-handler";

export function registerIpcHandlers(ipcMain: IpcMain, prisma: PrismaClient) {
  // ── Therapists ───────────────────────────────────────────────────────
  ipcMain.handle(
    "therapist:list",
    (): Promise<IpcApi["therapist:list"]["result"]> =>
      withErrorHandler("therapist:list", () => prisma.therapist.findMany()),
  );

  ipcMain.handle(
    "therapist:get",
    (_e, id: number): Promise<IpcApi["therapist:get"]["result"]> =>
      withErrorHandler("therapist:get", () =>
        prisma.therapist.findUniqueOrThrow({ where: { id } }),
      ),
  );

  ipcMain.handle(
    "therapist:create",
    (_e, rawData: unknown): Promise<IpcApi["therapist:create"]["result"]> =>
      withErrorHandler("therapist:create", async () => {
        const data = therapistCreateSchema.parse(rawData);
        return prisma.therapist.create({ data });
      }),
  );

  ipcMain.handle(
    "therapist:update",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["therapist:update"]["result"]> =>
      withErrorHandler("therapist:update", async () => {
        const { id, data: rawData } = rawInput;
        const data = therapistUpdateSchema.parse(rawData);
        return prisma.therapist.update({ where: { id }, data });
      }),
  );

  // ── Clients ──────────────────────────────────────────────────────────
  ipcMain.handle(
    "client:list",
    (): Promise<IpcApi["client:list"]["result"]> =>
      withErrorHandler("client:list", () =>
        prisma.client.findMany({ include: { therapist: true } }),
      ),
  );

  ipcMain.handle(
    "client:get",
    (_e, id: number): Promise<IpcApi["client:get"]["result"]> =>
      withErrorHandler("client:get", () =>
        prisma.client.findUniqueOrThrow({ where: { id }, include: { therapist: true } }),
      ),
  );

  ipcMain.handle(
    "client:create",
    (_e, rawData: unknown): Promise<IpcApi["client:create"]["result"]> =>
      withErrorHandler("client:create", async () => {
        const data = clientCreateSchema.parse(rawData);
        return prisma.client.create({ data });
      }),
  );

  ipcMain.handle(
    "client:update",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["client:update"]["result"]> =>
      withErrorHandler("client:update", async () => {
        const { id, data: rawData } = rawInput;
        const data = clientUpdateSchema.parse(rawData);
        return prisma.client.update({ where: { id }, data });
      }),
  );

  // ── Sessions ─────────────────────────────────────────────────────────
  ipcMain.handle(
    "session:list",
    (): Promise<IpcApi["session:list"]["result"]> =>
      withErrorHandler("session:list", () =>
        prisma.session.findMany({
          include: { client: true, therapist: true },
        }),
      ),
  );

  ipcMain.handle(
    "session:get",
    (_e, id: number): Promise<IpcApi["session:get"]["result"]> =>
      withErrorHandler("session:get", () =>
        prisma.session.findUniqueOrThrow({
          where: { id },
          include: { client: true, therapist: true },
        }),
      ),
  );

  ipcMain.handle(
    "session:create",
    (_e, rawData: unknown): Promise<IpcApi["session:create"]["result"]> =>
      withErrorHandler("session:create", async () => {
        const data = sessionCreateSchema.parse(rawData);
        return prisma.session.create({ data });
      }),
  );

  ipcMain.handle(
    "session:update",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["session:update"]["result"]> =>
      withErrorHandler("session:update", async () => {
        const { id, data: rawData } = rawInput;
        const data = sessionUpdateSchema.parse(rawData);
        return prisma.session.update({ where: { id }, data });
      }),
  );
}
