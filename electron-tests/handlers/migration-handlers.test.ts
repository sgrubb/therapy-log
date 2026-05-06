import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi, assert } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "../../electron/lib/migrations";

// migration-handlers.ts has a top-level `import { app } from "electron"` that
// is unused in the two handlers under test. Mock the module so the import
// resolves without a real Electron runtime.
vi.mock("electron", () => ({
  app: { quit: vi.fn() },
}));

import { registerMigrationHandlers } from "../../electron/handlers/migration-handlers";

type Handler = (event: unknown, ...args: unknown[]) => unknown;

function buildHandlers(info: { dbPath: string; currentVersion: number; createdByApp: boolean }) {
  const handlers: Record<string, Handler> = {};
  const fakeIpcMain = {
    handle(channel: string, handler: Handler) {
      handlers[channel] = handler;
    },
  };
  const fakeWin = {} as Electron.BrowserWindow;
  const onComplete = vi.fn().mockResolvedValue(undefined);
  registerMigrationHandlers(fakeIpcMain as never, fakeWin, info, onComplete);
  return handlers;
}

const tempFiles: string[] = [];

function tempDbPath(): string {
  const p = path.join(os.tmpdir(), `migration-handler-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  tempFiles.push(p);
  return p;
}

// ── migration:get-info ────────────────────────────────────────────────────────

describe("migration:get-info", () => {
  it("returns the currentVersion, requiredVersion, and createdByApp from the provided info", () => {
    const info = { dbPath: "/ignored.db", currentVersion: 3, createdByApp: true };
    const handlers = buildHandlers(info);

    const result = handlers["migration:get-info"]!({}) as {
      success: boolean;
      data: { currentVersion: number; requiredVersion: number; createdByApp: boolean };
    };

    assert(result.success);
    expect(result.data.currentVersion).toBe(3);
    expect(result.data.requiredVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.data.createdByApp).toBe(true);
  });

  it("reflects createdByApp = false", () => {
    const handlers = buildHandlers({ dbPath: "/ignored.db", currentVersion: 1, createdByApp: false });
    const result = handlers["migration:get-info"]!({}) as { success: boolean; data: { createdByApp: boolean } };
    assert(result.success);
    expect(result.data.createdByApp).toBe(false);
  });
});

// ── migration:apply ───────────────────────────────────────────────────────────

describe("migration:apply", () => {
  it("applies all pending migrations and returns success", () => {
    const dbPath = tempDbPath();
    const handlers = buildHandlers({ dbPath, currentVersion: 0, createdByApp: true });

    const result = handlers["migration:apply"]!({}) as { success: boolean; data: null };
    assert(result.success);
    expect(result.data).toBeNull();
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it("returns a failure response when the database path is invalid", () => {
    const handlers = buildHandlers({
      dbPath: "/nonexistent/directory/that/cannot/be/created.db",
      currentVersion: 0,
      createdByApp: true,
    });

    const result = handlers["migration:apply"]!({}) as { success: boolean; error?: { message: string } };
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
