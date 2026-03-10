import type { IpcMain, App, Dialog } from "electron";
import { getConfiguredDbPath, writeConfig } from "../db-path";
import log from "../lib/logger";
import type { IpcResponse } from "../types/ipc";

export function registerSettingsHandlers(
  ipcMain: IpcMain,
  _app: App,
  dialog: Dialog,
): void {
  ipcMain.handle("settings:get-db-path", (): IpcResponse<string | null> => {
    try {
      return { success: true, data: getConfiguredDbPath() };
    } catch (error) {
      log.error("settings:get-db-path failed:", error);
      return { success: false, error: { code: "UNKNOWN", message: "Failed to retrieve database path." } };
    }
  });

  ipcMain.handle("settings:set-db-path", (_event, newPath: string): IpcResponse<null> => {
    try {
      writeConfig({ databasePath: newPath });
      return { success: true, data: null };
    } catch (error) {
      log.error("settings:set-db-path failed:", error);
      return { success: false, error: { code: "UNKNOWN", message: "Failed to save database path." } };
    }
  });

  ipcMain.handle("settings:open-file-dialog", async (): Promise<IpcResponse<string | null>> => {
    try {
      const result = await dialog.showOpenDialog({
        title: "Select Database File",
        filters: [{ name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] }],
        properties: ["openFile"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null };
      }
      return { success: true, data: result.filePaths[0] ?? null };
    } catch (error) {
      log.error("settings:open-file-dialog failed:", error);
      return { success: false, error: { code: "UNKNOWN", message: "Failed to open file dialog." } };
    }
  });
}
