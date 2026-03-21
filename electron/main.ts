import path from "node:path";
import fs from "node:fs";
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import dotenv from "dotenv";
import { registerAppHandlers } from "./handlers/app-handlers";
import { registerDatabaseHandlers } from "./handlers/database-handlers";
import { registerSettingsHandlers } from "./handlers/settings-handlers";
import { registerSetupHandlers } from "./handlers/setup-handlers";
import { registerMigrationHandlers } from "./handlers/migration-handlers";
import { resolveDatabaseUrl, getConfiguredDbPath } from "./db-path";
import { createSetupWindow } from "./windows/setup";
import { createMigrationWindow } from "./windows/migration";
import { checkSchemaVersion, CURRENT_SCHEMA_VERSION } from "./lib/migrations";
import log from "./lib/logger";
import { IS_DEV } from "./lib/config";

if (IS_DEV) {
  dotenv.config();
}

let prisma: PrismaClient | null = null;

function createPrismaClient(url: string): PrismaClient | null {
  try {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  } catch (err) {
    log.error("Failed to create Prisma client:", err);
    return null;
  }
}

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
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

  return win;
}

async function openMainWindow(): Promise<void> {
  const { url } = resolveDatabaseUrl();
  if (!url) throw new Error("Database URL missing — config may not have been saved.");
  prisma = createPrismaClient(url);
  if (!prisma) throw new Error("Failed to connect to the database.");
  registerDatabaseHandlers(ipcMain, prisma);
  registerSettingsHandlers(ipcMain, app, dialog);
  log.info("Database handlers registered");
  await createWindow();
  log.info("Main window created");
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", async () => {
  log.info("App shutting down");
  await prisma?.$disconnect();
});

async function bootstrap() {
  log.info(`TherapyLog ${app.getVersion()} starting (${IS_DEV ? "dev" : "prod"})`);

  await app.whenReady();

  registerAppHandlers(ipcMain, app);

  const { url: databaseUrl, createdByApp } = resolveDatabaseUrl();

  // Case 1: No config — first run
  if (!databaseUrl) {
    const setupWin = await createSetupWindow();
    log.info("Setup window created (first run)");
    registerSetupHandlers(ipcMain, dialog, setupWin, openMainWindow);
    return;
  }

  // Case 2: Config exists but file is missing
  const dbPath = getConfiguredDbPath();
  if (!dbPath || !fs.existsSync(dbPath)) {
    const error =
      "The database file could not be found. It may have been moved or deleted. " +
      "Please select a different file or create a new database.";
    const setupWin = await createSetupWindow(error);
    log.info("Setup window created (missing database file)");
    registerSetupHandlers(ipcMain, dialog, setupWin, openMainWindow);
    return;
  }

  // Case 3: File exists but schema version is unreadable
  const schemaVersion = checkSchemaVersion(dbPath);
  if (schemaVersion === null) {
    const error =
      "The database file exists but its schema version could not be read. " +
      "It may be corrupted or was not created by this app.";
    const setupWin = await createSetupWindow(error);
    log.info("Setup window created (unreadable schema version)");
    registerSetupHandlers(ipcMain, dialog, setupWin, openMainWindow);
    return;
  }

  // Case 4: Schema is outdated — offer migration
  if (schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrationWin = await createMigrationWindow();
    log.info(
      "Migration window created" +
        ` (DB version ${schemaVersion}, required ${CURRENT_SCHEMA_VERSION})`,
    );
    registerMigrationHandlers(
      ipcMain,
      migrationWin,
      { dbPath, currentVersion: schemaVersion, createdByApp },
      openMainWindow,
    );
    return;
  }

  // Case 5: Normal startup
  await openMainWindow();
}

bootstrap().catch((err) => {
  log.error("Bootstrap failed:", err);
  dialog.showErrorBox(
    "Therapy Log failed to start",
    err instanceof Error ? err.message : "An unexpected error occurred.",
  );
  app.quit();
});
