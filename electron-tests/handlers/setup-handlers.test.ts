import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterAll, assert } from "vitest";
import { IpcErrorCode } from "@shared/types/ipc";

// Mock db-path before importing setup-handlers to prevent the top-level
// `import { app } from "electron"` inside db-path.ts from failing.
vi.mock("../../electron/db-path", () => ({
  writeConfig: vi.fn(),
  getConfiguredDbPath: vi.fn(),
  resolveDatabaseUrl: vi.fn(),
}));

import { registerSetupHandlers } from "../../electron/handlers/setup-handlers";
import { writeConfig } from "../../electron/db-path";
import { CURRENT_SCHEMA_VERSION } from "../../electron/lib/migrations";

const mockWriteConfig = vi.mocked(writeConfig);

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const tempFiles: string[] = [];

function tempPath(ext = ".db"): string {
  const p = path.join(os.tmpdir(), `setup-handler-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  tempFiles.push(p);
  return p;
}

afterAll(() => {
  for (const f of tempFiles) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
});

let nextSaveDialog: Awaited<ReturnType<Electron.Dialog["showSaveDialog"]>> = { filePath: undefined, canceled: true };
let nextOpenDialog: Awaited<ReturnType<Electron.Dialog["showOpenDialog"]>> = { filePaths: [], canceled: true };

const fakeDialog = {
  showSaveDialog: (_win: unknown) => Promise.resolve(nextSaveDialog),
  showOpenDialog: (_win: unknown) => Promise.resolve(nextOpenDialog),
} as unknown as Electron.Dialog;

const fakeWin = {} as Electron.BrowserWindow;
const onComplete = vi.fn().mockResolvedValue(undefined);

function buildHandlers() {
  const handlers: Record<string, Handler> = {};
  const fakeIpcMain = {
    handle(channel: string, handler: Handler) {
      handlers[channel] = handler;
    },
  };
  registerSetupHandlers(fakeIpcMain as never, fakeDialog, fakeWin, onComplete);
  Object.assign(handlers, {}); // ensure fresh
  // re-register
  registerSetupHandlers(fakeIpcMain as never, fakeDialog, fakeWin, onComplete);
  return handlers;
}

let handlers: Record<string, Handler>;

beforeEach(() => {
  mockWriteConfig.mockReset();
  nextSaveDialog = { filePath: undefined, canceled: true };
  nextOpenDialog = { filePaths: [], canceled: true };
  handlers = buildHandlers();
});

// ── setup:open-save-dialog ────────────────────────────────────────────────────

describe("setup:open-save-dialog", () => {
  it("returns null when the dialog is canceled", async () => {
    nextSaveDialog = { filePath: undefined, canceled: true };
    const result = await (handlers["setup:open-save-dialog"]!({}) as Promise<{ success: boolean; data: string | null }>);
    assert(result.success);
    expect(result.data).toBeNull();
  });

  it("returns the chosen file path when not canceled", async () => {
    const filePath = "/chosen/path.db";
    nextSaveDialog = { filePath, canceled: false };
    const result = await (handlers["setup:open-save-dialog"]!({}) as Promise<{ success: boolean; data: string | null }>);
    assert(result.success);
    expect(result.data).toBe(filePath);
  });
});

// ── setup:open-file-dialog ────────────────────────────────────────────────────

describe("setup:open-file-dialog", () => {
  it("returns null when the dialog is canceled", async () => {
    nextOpenDialog = { filePaths: [], canceled: true };
    const result = await (handlers["setup:open-file-dialog"]!({}) as Promise<{ success: boolean; data: string | null }>);
    assert(result.success);
    expect(result.data).toBeNull();
  });

  it("returns the chosen file path when not canceled", async () => {
    const filePath = "/existing/db.db";
    nextOpenDialog = { filePaths: [filePath], canceled: false };
    const result = await (handlers["setup:open-file-dialog"]!({}) as Promise<{ success: boolean; data: string | null }>);
    assert(result.success);
    expect(result.data).toBe(filePath);
  });
});

// ── setup:create-database ─────────────────────────────────────────────────────

describe("setup:create-database", () => {
  it("creates a new database file and returns success", async () => {
    const dbPath = tempPath();
    const result = await (handlers["setup:create-database"]!({}, dbPath) as Promise<{ success: boolean; data: null }>);
    assert(result.success);
    expect(result.data).toBeNull();
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it("returns a failure response when the path is invalid", async () => {
    const result = await (handlers["setup:create-database"]!({}, "/nonexistent/dir/db.db") as Promise<{
      success: boolean;
      error?: { message: string };
    }>);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ── setup:validate-existing-database ─────────────────────────────────────────

describe("setup:validate-existing-database", () => {
  it("returns success with valid=true for a fully-migrated database", async () => {
    const dbPath = tempPath();
    // Create a valid DB at CURRENT_SCHEMA_VERSION
    await handlers["setup:create-database"]!({}, dbPath);

    const result = await (handlers["setup:validate-existing-database"]!({}, dbPath) as Promise<{
      success: boolean;
      data?: { valid: boolean; version: number };
    }>);
    assert(result.success);
    expect(result.data!.valid).toBe(true);
    expect(result.data!.version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("returns a validation error for a non-SQLite file", async () => {
    const txtPath = tempPath(".txt");
    fs.writeFileSync(txtPath, "not a database", "utf-8");

    const result = await (handlers["setup:validate-existing-database"]!({}, txtPath) as Promise<{
      success: boolean;
      error?: { code: string; message: string };
    }>);
    expect(result.success).toBe(false);
    expect(result.error!.code).toBe(IpcErrorCode.Validation);
  });
});

// ── setup:save-config ─────────────────────────────────────────────────────────

describe("setup:save-config", () => {
  it("calls writeConfig with the correct config object", () => {
    const result = handlers["setup:save-config"]!({}, { dbPath: "/data/therapy.db", createdByApp: true }) as {
      success: boolean;
      data: null;
    };
    assert(result.success);
    expect(mockWriteConfig).toHaveBeenCalledWith({ databasePath: "/data/therapy.db", createdByApp: true });
  });

  it("returns a failure response when writeConfig throws", () => {
    mockWriteConfig.mockImplementation(() => { throw new Error("disk full"); });
    const result = handlers["setup:save-config"]!({}, { dbPath: "/x.db", createdByApp: false }) as {
      success: boolean;
      error?: { message: string };
    };
    expect(result.success).toBe(false);
    expect(result.error!.message).toBe("Failed to save configuration.");
  });
});

// ── setup:create-first-therapist ──────────────────────────────────────────────

describe("setup:create-first-therapist", () => {
  it("creates an admin therapist in the given database", async () => {
    const dbPath = tempPath();
    await handlers["setup:create-database"]!({}, dbPath);

    const result = await (handlers["setup:create-first-therapist"]!({}, {
      dbPath,
      firstName: "Alice",
      lastName: "Smith",
      startDate: new Date("2026-01-01"),
    }) as Promise<{ success: boolean; data: null }>);

    expect(result.success).toBe(true);

    // Verify the therapist was created with is_admin=true by validating the DB
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    const prisma = new PrismaClient({ adapter });
    const therapists = await prisma.therapist.findMany();
    expect(therapists).toHaveLength(1);
    expect(therapists[0]).toMatchObject({
      first_name: "Alice",
      last_name: "Smith",
      is_admin: true,
    });
    await prisma.$disconnect();
  });

  it("returns a failure response when the database path is invalid", async () => {
    const result = await (handlers["setup:create-first-therapist"]!({}, {
      dbPath: "/nonexistent/dir/db.db",
      firstName: "Alice",
      lastName: "Smith",
      startDate: new Date("2026-01-01"),
    }) as Promise<{ success: boolean; error?: { message: string } }>);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
