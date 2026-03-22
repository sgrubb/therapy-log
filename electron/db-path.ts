import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

interface AppConfig {
  databasePath: string;
  createdByApp: boolean;
}

const CONFIG_FILE = "config.json";

function getConfigPath(): string {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function readConfig(): AppConfig | null {
  const configPath = getConfigPath();
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

export function getConfiguredDbPath(): string | null {
  if (!app.isPackaged) {
    const envUrl = process.env["DATABASE_URL"];
    if (!envUrl) {
      return null;
    }
    return envUrl.replace(/^file:/, "");
  }
  const config = readConfig();
  return config?.databasePath ?? null;
}

export function writeConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Resolve the database URL for the Prisma adapter.
 *
 * - Development: reads DATABASE_URL from the .env file (loaded by dotenv
 *   before this function is called).
 * - Production:  reads the path from userData/config.json. Returns null url if
 *   no config exists yet (first-run setup needed).
 */
export function resolveDatabaseUrl(): { url: string | null; createdByApp: boolean } {
  if (!app.isPackaged) {
    const envUrl = process.env["DATABASE_URL"];
    if (!envUrl) {
      throw new Error(
        "DATABASE_URL is not set. Add it to the .env file in the project root.",
      );
    }
    return { url: envUrl, createdByApp: true };
  }

  const config = readConfig();
  if (!config) {
    return { url: null, createdByApp: false };
  }

  return { url: `file:${config.databasePath}`, createdByApp: config.createdByApp };
}
