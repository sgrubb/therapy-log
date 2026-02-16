import type { IpcMain } from "electron";
import type { PrismaClient } from "../generated/prisma/client";

export function registerIpcHandlers(ipcMain: IpcMain, prisma: PrismaClient) {
  // ── Therapists ───────────────────────────────────────────────────────
  ipcMain.handle("therapist:list", () => prisma.therapist.findMany());

  ipcMain.handle("therapist:get", (_e, id: number) =>
    prisma.therapist.findUnique({ where: { id } }),
  );

  ipcMain.handle("therapist:create", (_e, data) =>
    prisma.therapist.create({ data }),
  );

  ipcMain.handle("therapist:update", (_e, { id, data }) =>
    prisma.therapist.update({ where: { id }, data }),
  );

  // ── Clients ──────────────────────────────────────────────────────────
  ipcMain.handle("client:list", () =>
    prisma.client.findMany({ include: { therapist: true } }),
  );

  ipcMain.handle("client:get", (_e, id: number) =>
    prisma.client.findUnique({ where: { id }, include: { therapist: true } }),
  );

  ipcMain.handle("client:create", (_e, data) =>
    prisma.client.create({ data }),
  );

  ipcMain.handle("client:update", (_e, { id, data }) =>
    prisma.client.update({ where: { id }, data }),
  );

  // ── Sessions ─────────────────────────────────────────────────────────
  ipcMain.handle("session:list", () =>
    prisma.session.findMany({
      include: { client: true, therapist: true },
    }),
  );

  ipcMain.handle("session:get", (_e, id: number) =>
    prisma.session.findUnique({
      where: { id },
      include: { client: true, therapist: true },
    }),
  );

  ipcMain.handle("session:create", (_e, data) =>
    prisma.session.create({ data }),
  );

  ipcMain.handle("session:update", (_e, { id, data }) =>
    prisma.session.update({ where: { id }, data }),
  );
}
