import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import dotenv from "dotenv";
import { registerIpcHandlers } from "./ipc-handlers";
import { resolveDatabaseUrl } from "./db-path";

if (!app.isPackaged) {
  dotenv.config();
}

let win: BrowserWindow | null = null;

function createPrismaClient(): PrismaClient | null {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    return null;
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    await win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    win.webContents.openDevTools();
  } else {
    await win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

async function bootstrap() {
  await app.whenReady();

  if (prisma) {
    registerIpcHandlers(ipcMain, prisma);
  }

  // TODO (Phase 6): If prisma is null (no config.json in production),
  // show the first-run setup screen instead of the main app window.

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
    await prisma?.$disconnect();
  });
}

bootstrap();
