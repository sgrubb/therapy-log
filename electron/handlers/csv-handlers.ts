import fs from "node:fs";
import type { IpcMain, Dialog } from "electron";
import type { PrismaClient } from "../../generated/prisma/client";
import {
  parseCSV,
  generateCSV,
  validateTherapistRow,
  validateClientRow,
  validateSessionRow,
  therapistToCSVRow,
  clientToCSVRow,
  sessionToCSVRow,
} from "../lib/csv";
import type { ClientPayload, SessionPayload } from "../lib/csv";
import {
  THERAPIST_CSV_HEADERS,
  THERAPIST_REQUIRED_HEADERS,
  CLIENT_CSV_HEADERS,
  CLIENT_REQUIRED_HEADERS,
  SESSION_CSV_HEADERS,
  SESSION_REQUIRED_HEADERS,
} from "@shared/types/csv";
import { withErrorHandler } from "../lib/error-handler";
import type { IpcApi } from "../types/ipc";
import { buildTherapistWhere, buildClientWhere, buildSessionWhere } from "../lib/where-builders";
import {
  therapistExportParamsSchema,
  clientExportParamsSchema,
  sessionExportParamsSchema,
} from "@shared/schemas/csv";

// ── Header check ─────────────────────────────────────────────────────────────

function checkRequiredHeaders(
  rows: Array<Record<string, string>>,
  required: readonly string[],
): string[] {
  if (rows.length === 0) {
    return [];
  }
  const present = new Set(Object.keys(rows[0]!));
  return required.filter((h) => !present.has(h));
}

// ── Handler registration ─────────────────────────────────────────────────────

export function registerCsvHandlers(ipcMain: IpcMain, prisma: PrismaClient, dialog: Dialog) {
  // ── Therapist Export ─────────────────────────────────────────────────
  ipcMain.handle(
    "therapist:export-csv",
    (_e, rawParams: unknown): Promise<IpcApi["therapist:export-csv"]["result"]> =>
      withErrorHandler("therapist:export-csv", async () => {
        const { status } = therapistExportParamsSchema.parse(rawParams);
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: "Export Therapists",
          defaultPath: "therapists.csv",
          filters: [{ name: "CSV", extensions: ["csv"] }],
        });
        if (canceled || !filePath) {
          return null;
        }
        const therapists = await prisma.therapist.findMany({
          where: buildTherapistWhere(status),
          orderBy: { last_name: "asc" },
        });
        const csv = generateCSV(THERAPIST_CSV_HEADERS, therapists.map(therapistToCSVRow));
        fs.writeFileSync(filePath, csv, "utf-8");
        return { path: filePath };
      }),
  );

  // ── Therapist Import ─────────────────────────────────────────────────
  ipcMain.handle(
    "therapist:import-csv",
    (_e): Promise<IpcApi["therapist:import-csv"]["result"]> =>
      withErrorHandler("therapist:import-csv", async () => {
        const { filePaths, canceled } = await dialog.showOpenDialog({
          title: "Import Therapists",
          filters: [{ name: "CSV", extensions: ["csv"] }],
          properties: ["openFile"],
        });
        if (canceled || !filePaths[0]) {
          return null;
        }
        const rows = parseCSV(fs.readFileSync(filePaths[0], "utf-8"));
        if (rows.length === 0) {
          return { inserted: 0, errors: [] };
        }
        const missing = checkRequiredHeaders(rows, THERAPIST_REQUIRED_HEADERS);
        if (missing.length > 0) {
          return {
            inserted: 0,
            errors: [{ row: 0, message: `Missing required columns: ${missing.join(", ")}` }],
          };
        }
        const { errors, payloads } = rows.reduce<{
          errors: Array<{ row: number; message: string }>;
          payloads: Array<{ first_name: string; last_name: string; start_date: Date; is_admin: boolean }>;
        }>((acc, row, i) => {
          const result = validateTherapistRow(row, i + 2);
          if ("errors" in result) {
            return { ...acc, errors: [...acc.errors, ...result.errors] };
          }
          return { ...acc, payloads: [...acc.payloads, result.payload] };
        }, { errors: [], payloads: [] });
        if (errors.length > 0) {
          return { inserted: 0, errors };
        }
        await prisma.$transaction(payloads.map((p) => prisma.therapist.create({ data: p })));
        return { inserted: payloads.length, errors: [] };
      }),
  );

  // ── Client Export ─────────────────────────────────────────────────────
  ipcMain.handle(
    "client:export-csv",
    (_e, rawParams: unknown): Promise<IpcApi["client:export-csv"]["result"]> =>
      withErrorHandler("client:export-csv", async () => {
        const params = clientExportParamsSchema.parse(rawParams);
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: "Export Clients",
          defaultPath: "clients.csv",
          filters: [{ name: "CSV", extensions: ["csv"] }],
        });
        if (canceled || !filePath) {
          return null;
        }
        const clients = await prisma.client.findMany({
          where: buildClientWhere(params),
          include: { therapist: true },
          orderBy: { last_name: "asc" },
        });
        const csv = generateCSV(CLIENT_CSV_HEADERS, clients.map(clientToCSVRow));
        fs.writeFileSync(filePath, csv, "utf-8");
        return { path: filePath };
      }),
  );

  // ── Client Import ─────────────────────────────────────────────────────
  ipcMain.handle(
    "client:import-csv",
    (_e): Promise<IpcApi["client:import-csv"]["result"]> =>
      withErrorHandler("client:import-csv", async () => {
        const { filePaths, canceled } = await dialog.showOpenDialog({
          title: "Import Clients",
          filters: [{ name: "CSV", extensions: ["csv"] }],
          properties: ["openFile"],
        });
        if (canceled || !filePaths[0]) {
          return null;
        }
        const rows = parseCSV(fs.readFileSync(filePaths[0], "utf-8"));
        if (rows.length === 0) {
          return { inserted: 0, errors: [] };
        }
        const missing = checkRequiredHeaders(rows, CLIENT_REQUIRED_HEADERS);
        if (missing.length > 0) {
          return {
            inserted: 0,
            errors: [{ row: 0, message: `Missing required columns: ${missing.join(", ")}` }],
          };
        }
        const therapists = await prisma.therapist.findMany({
          select: { id: true, first_name: true, last_name: true },
        });
        const therapistMap = new Map(therapists.map((t) => [`${t.first_name} ${t.last_name}`, t.id]));
        const { errors, payloads } = rows.reduce<{
          errors: Array<{ row: number; message: string }>;
          payloads: ClientPayload[];
        }>((acc, row, i) => {
          const result = validateClientRow(row, i + 2, therapistMap);
          if ("errors" in result) {
            return { ...acc, errors: [...acc.errors, ...result.errors] };
          }
          return { ...acc, payloads: [...acc.payloads, result.payload] };
        }, { errors: [], payloads: [] });
        if (errors.length > 0) {
          return { inserted: 0, errors };
        }
        await prisma.$transaction(payloads.map((p) => prisma.client.create({ data: p })));
        return { inserted: payloads.length, errors: [] };
      }),
  );

  // ── Session Export ─────────────────────────────────────────────────────
  ipcMain.handle(
    "session:export-csv",
    (_e, rawParams: unknown): Promise<IpcApi["session:export-csv"]["result"]> =>
      withErrorHandler("session:export-csv", async () => {
        const filters = sessionExportParamsSchema.parse(rawParams);
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: "Export Sessions",
          defaultPath: "sessions.csv",
          filters: [{ name: "CSV", extensions: ["csv"] }],
        });
        if (canceled || !filePath) {
          return null;
        }
        const sessions = await prisma.session.findMany({
          where: buildSessionWhere(filters),
          include: { client: true, therapist: true },
          orderBy: { scheduled_at: "asc" },
        });
        const csv = generateCSV(SESSION_CSV_HEADERS, sessions.map(sessionToCSVRow));
        fs.writeFileSync(filePath, csv, "utf-8");
        return { path: filePath };
      }),
  );

  // ── Session Import ─────────────────────────────────────────────────────
  ipcMain.handle(
    "session:import-csv",
    (_e): Promise<IpcApi["session:import-csv"]["result"]> =>
      withErrorHandler("session:import-csv", async () => {
        const { filePaths, canceled } = await dialog.showOpenDialog({
          title: "Import Sessions",
          filters: [{ name: "CSV", extensions: ["csv"] }],
          properties: ["openFile"],
        });
        if (canceled || !filePaths[0]) {
          return null;
        }
        const rows = parseCSV(fs.readFileSync(filePaths[0], "utf-8"));
        if (rows.length === 0) {
          return { inserted: 0, errors: [] };
        }
        const missing = checkRequiredHeaders(rows, SESSION_REQUIRED_HEADERS);
        if (missing.length > 0) {
          return {
            inserted: 0,
            errors: [{ row: 0, message: `Missing required columns: ${missing.join(", ")}` }],
          };
        }
        const [therapists, clients] = await Promise.all([
          prisma.therapist.findMany({ select: { id: true, first_name: true, last_name: true } }),
          prisma.client.findMany({ select: { id: true, first_name: true, last_name: true } }),
        ]);
        const therapistMap = new Map(therapists.map((t) => [`${t.first_name} ${t.last_name}`, t.id]));
        const clientMap = new Map(clients.map((c) => [`${c.first_name} ${c.last_name}`, c.id]));
        const { errors, payloads } = rows.reduce<{
          errors: Array<{ row: number; message: string }>;
          payloads: SessionPayload[];
        }>((acc, row, i) => {
          const result = validateSessionRow(row, i + 2, clientMap, therapistMap);
          if ("errors" in result) {
            return { ...acc, errors: [...acc.errors, ...result.errors] };
          }
          return { ...acc, payloads: [...acc.payloads, result.payload] };
        }, { errors: [], payloads: [] });
        if (errors.length > 0) {
          return { inserted: 0, errors };
        }
        await prisma.$transaction(payloads.map((p) => prisma.session.create({ data: p })));
        return { inserted: payloads.length, errors: [] };
      }),
  );
}
