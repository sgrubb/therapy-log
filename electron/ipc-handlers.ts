import type { IpcMain } from "electron";
import type { PrismaClient } from "../generated/prisma/client";
import {
  therapistCreateSchema,
  therapistUpdateSchema,
  clientCreateSchema,
  clientUpdateSchema,
  clientCloseSchema,
  clientReopenSchema,
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
        const { updated_at: clientUpdatedAt, ...updateData } = therapistUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.therapist.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== clientUpdatedAt.getTime()) {
            throw new Error("CONFLICT");
          }
          return tx.therapist.update({ where: { id }, data: updateData });
        });
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
        const { updated_at: clientUpdatedAt, ...updateData } = clientUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.client.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== clientUpdatedAt.getTime()) {
            throw new Error("CONFLICT");
          }
          return tx.client.update({ where: { id }, data: updateData, include: { therapist: true } });
        });
      }),
  );

  ipcMain.handle(
    "client:close",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["client:close"]["result"]> =>
      withErrorHandler("client:close", async () => {
        const { id, data: rawData } = rawInput;
        const data = clientCloseSchema.parse(rawData);
        return prisma.client.update({
          where: { id },
          data: { ...data, is_closed: true },
          include: { therapist: true },
        });
      }),
  );

  ipcMain.handle(
    "client:reopen",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["client:reopen"]["result"]> =>
      withErrorHandler("client:reopen", async () => {
        const { id, data: rawData } = rawInput;
        const data = clientReopenSchema.parse(rawData);
        return prisma.client.update({
          where: { id },
          data: { ...data, is_closed: false, post_score: null, outcome: null },
          include: { therapist: true },
        });
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
        const { updated_at: clientUpdatedAt, ...updateData } = sessionUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.session.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== clientUpdatedAt.getTime()) {
            throw new Error("CONFLICT");
          }
          return tx.session.update({ where: { id }, data: updateData });
        });
      }),
  );
}
