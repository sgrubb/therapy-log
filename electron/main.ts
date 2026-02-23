import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import dotenv from "dotenv";
import { registerIpcHandlers } from "./ipc-handlers";
import { resolveDatabaseUrl } from "./db-path";
import log from "./lib/logger";
import { IS_DEV } from "./lib/config";

if (IS_DEV) {
  dotenv.config();
}

let win: BrowserWindow | null = null;

function createPrismaClient(): PrismaClient | null {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    return null;
  }

  try {
    const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
    return new PrismaClient({ adapter });
  } catch (err) {
    log.error("Failed to create Prisma client:", err);
    return null;
  }
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
  log.info(`TherapyLog ${app.getVersion()} starting (${IS_DEV ? "dev" : "prod"})`);

  await app.whenReady();
  
  ipcMain.handle("app:version", (): string => app.getVersion());

  if (prisma) {
    registerIpcHandlers(ipcMain, prisma);
    log.info("IPC handlers registered");
  } else {
    log.warn("Prisma client unavailable — IPC handlers not registered");
  }

  // TODO (Phase 6): If prisma is null (no config.json in production),
  // show the first-run setup screen instead of the main app window.

  await createWindow();
  log.info("Main window created");

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
    log.info("App shutting down");
    await prisma?.$disconnect();
  });
}

bootstrap().catch((err) => {
  log.error("Bootstrap failed:", err);
  app.quit();
});
