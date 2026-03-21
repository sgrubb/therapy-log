import path from "node:path";
import { BrowserWindow } from "electron";

export async function createMigrationWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 700,
    height: 400,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    await win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#/migration`);
    win.webContents.openDevTools();
  } else {
    await win.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "/migration",
    });
  }

  return win;
}
