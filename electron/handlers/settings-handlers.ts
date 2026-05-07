import type { IpcMain, Dialog } from "electron";
import { getConfiguredDbPath, getInitialSelectedTherapistId, writeConfig } from "../lib/app-config";
import { handleIpc } from "../lib/error-handler";
import type { IpcApi } from "../lib/types/ipc";

export function registerSettingsHandlers(ipcMain: IpcMain, dialog: Dialog): void {
  ipcMain.handle(
    "settings:get-db-path",
    (): Promise<IpcApi["settings:get-db-path"]["result"]> =>
      handleIpc("settings:get-db-path", async () => getConfiguredDbPath()),
  );

  ipcMain.handle(
    "settings:set-db-path",
    (_event, newPath: string): Promise<IpcApi["settings:set-db-path"]["result"]> =>
      handleIpc("settings:set-db-path", async () => {
        writeConfig({ databasePath: newPath, createdByApp: false });
        return null;
      }),
  );

  ipcMain.handle(
    "settings:get-initial-therapist-id",
    (): Promise<IpcApi["settings:get-initial-therapist-id"]["result"]> =>
      handleIpc("settings:get-initial-therapist-id", async () => getInitialSelectedTherapistId()),
  );

  ipcMain.handle(
    "settings:open-file-dialog",
    (): Promise<IpcApi["settings:open-file-dialog"]["result"]> =>
      handleIpc("settings:open-file-dialog", async () => {
        const result = await dialog.showOpenDialog({
          title: "Select Database File",
          filters: [{ name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] }],
          properties: ["openFile"],
        });
        return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0] ?? null;
      }),
  );
}
