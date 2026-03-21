import type { IpcMain, Dialog, BrowserWindow } from "electron";
import { initializeDatabase, validateDatabase, CURRENT_SCHEMA_VERSION } from "../lib/migrations";
import { writeConfig } from "../db-path";
import log from "../lib/logger";
import type { IpcResponse } from "../types/ipc";

export function registerSetupHandlers(
  ipcMain: IpcMain,
  dialog: Dialog,
  setupWin: BrowserWindow,
  onComplete: () => Promise<void>,
): void {
  ipcMain.handle("setup:open-save-dialog", async (): Promise<IpcResponse<string | null>> => {
    try {
      const result = await dialog.showSaveDialog(setupWin, {
        title: "Create New Database",
        defaultPath: "therapy-log.db",
        filters: [{ name: "SQLite Database", extensions: ["db"] }],
      });
      if (result.canceled || !result.filePath) {
        return { success: true, data: null };
      }
      return { success: true, data: result.filePath };
    } catch (error) {
      log.error("setup:open-save-dialog failed:", error);
      return { success: false, error: { code: "UNKNOWN", message: "Failed to open save dialog." } };
    }
  });

  ipcMain.handle("setup:open-file-dialog", async (): Promise<IpcResponse<string | null>> => {
    try {
      const result = await dialog.showOpenDialog(setupWin, {
        title: "Select Database File",
        filters: [{ name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] }],
        properties: ["openFile"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null };
      }
      return { success: true, data: result.filePaths[0] ?? null };
    } catch (error) {
      log.error("setup:open-file-dialog failed:", error);
      return { success: false, error: { code: "UNKNOWN", message: "Failed to open file dialog." } };
    }
  });

  ipcMain.handle("setup:create-database", (_e, filePath: string): IpcResponse<null> => {
    try {
      initializeDatabase(filePath);
      return { success: true, data: null };
    } catch (error) {
      log.error("setup:create-database failed:", error);
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: error instanceof Error ? error.message : "Failed to create database.",
        },
      };
    }
  });

  ipcMain.handle(
    "setup:validate-existing-database",
    (_e, filePath: string): IpcResponse<{ valid: boolean; version: number }> => {
      try {
        const result = validateDatabase(filePath);
        if (!result.valid) {
          return {
            success: false,
            error: {
              code: "VALIDATION",
              message: result.error ?? "This database is incompatible or corrupted.",
            },
          };
        }
        const version = result.version!;
        return { success: true, data: { valid: version === CURRENT_SCHEMA_VERSION, version } };
      } catch (error) {
        log.error("setup:validate-existing-database failed:", error);
        return {
          success: false,
          error: { code: "UNKNOWN", message: "Failed to validate database." },
        };
      }
    },
  );

  ipcMain.handle(
    "setup:save-config",
    (_e, config: { dbPath: string; createdByApp: boolean }): IpcResponse<null> => {
      try {
        writeConfig({ databasePath: config.dbPath, createdByApp: config.createdByApp });
        return { success: true, data: null };
      } catch (error) {
        log.error("setup:save-config failed:", error);
        return {
          success: false,
          error: { code: "UNKNOWN", message: "Failed to save configuration." },
        };
      }
    },
  );

  ipcMain.handle("setup:complete", async (): Promise<IpcResponse<null>> => {
    try {
      await onComplete();
      setupWin.close();
      return { success: true, data: null };
    } catch (error) {
      log.error("setup:complete failed:", error);
      return { success: false, error: { code: "UNKNOWN", message: "Failed to complete setup." } };
    }
  });
}
