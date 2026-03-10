import type { IpcMain, App } from "electron";

export function registerAppHandlers(ipcMain: IpcMain, app: App): void {
  ipcMain.handle("app:version", (): string => app.getVersion());
}
