import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { registerIpcHandlers } from "./ipc-handlers";

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(app.getPath("userData"), "therapy-log.db")}`,
});
const prisma = new PrismaClient({ adapter });

let win: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const DIST_PATH = path.join(import.meta.dirname, "../dist");

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    await win.loadFile(path.join(DIST_PATH, "index.html"));
  }
}

async function bootstrap() {
  await app.whenReady();

  registerIpcHandlers(ipcMain, prisma);
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", async () => {
    await prisma.$disconnect();
  });
}

bootstrap();
