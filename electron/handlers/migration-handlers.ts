import type { IpcMain, BrowserWindow } from "electron";
import { app } from "electron";
import { applyMigrations, CURRENT_SCHEMA_VERSION } from "../lib/migrations";
import log from "../lib/logger";
import type { IpcResponse } from "../types/ipc";

interface MigrationInfo {
  dbPath: string;
  currentVersion: number;
  createdByApp: boolean;
}

export function registerMigrationHandlers(
  ipcMain: IpcMain,
  migrationWin: BrowserWindow,
  info: MigrationInfo,
  onComplete: () => Promise<void>,
): void {
  ipcMain.handle("migration:get-info", (): IpcResponse<{
    currentVersion: number;
    requiredVersion: number;
    createdByApp: boolean;
  }> => {
    return {
      success: true,
      data: {
        currentVersion: info.currentVersion,
        requiredVersion: CURRENT_SCHEMA_VERSION,
        createdByApp: info.createdByApp,
      },
    };
  });

  ipcMain.handle("migration:apply", (): IpcResponse<null> => {
    try {
      applyMigrations(info.dbPath, info.currentVersion, CURRENT_SCHEMA_VERSION);
      return { success: true, data: null };
    } catch (error) {
      log.error("migration:apply failed:", error);
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: error instanceof Error ? error.message : "Failed to apply migrations.",
        },
      };
    }
  });

  ipcMain.handle("migration:complete", async (): Promise<IpcResponse<null>> => {
    try {
      await onComplete();
      migrationWin.close();
      return { success: true, data: null };
    } catch (error) {
      log.error("migration:complete failed:", error);
      return {
        success: false,
        error: { code: "UNKNOWN", message: "Failed to open the application after migration." },
      };
    }
  });

  ipcMain.handle("migration:quit", (): void => {
    app.quit();
  });
}
