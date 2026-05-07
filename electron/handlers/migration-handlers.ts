import type { IpcMain, BrowserWindow } from "electron";
import { app } from "electron";
import { applyMigrations, CURRENT_SCHEMA_VERSION } from "../lib/migrations";
import { handleIpc } from "../lib/error-handler";
import type { IpcApi } from "../lib/types/ipc";

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
  ipcMain.handle(
    "migration:get-info",
    (): Promise<IpcApi["migration:get-info"]["result"]> =>
      handleIpc("migration:get-info", async () => ({
        currentVersion: info.currentVersion,
        requiredVersion: CURRENT_SCHEMA_VERSION,
        createdByApp: info.createdByApp,
      })),
  );

  ipcMain.handle(
    "migration:apply",
    (): Promise<IpcApi["migration:apply"]["result"]> =>
      handleIpc("migration:apply", async () => {
        applyMigrations(info.dbPath, info.currentVersion, CURRENT_SCHEMA_VERSION);
        return null;
      }),
  );

  ipcMain.handle(
    "migration:complete",
    (): Promise<IpcApi["migration:complete"]["result"]> =>
      handleIpc("migration:complete", async () => {
        await onComplete();
        migrationWin.close();
        return null;
      }),
  );

  ipcMain.handle("migration:quit", (): void => {
    app.quit();
  });
}
